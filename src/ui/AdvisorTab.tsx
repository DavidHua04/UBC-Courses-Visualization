// AI advisor tab: per-plan goal + chat, with recommendation cards grounded
// in live engine results. All reasoning happens in src/ai/ and the store;
// this file only renders state and dispatches actions.

import { useEffect, useRef, useState } from "react";
import type { AdvisorMessage, AdvisorRecommendation, Plan } from "../engine/types";
import { displayId, liteId, liteTitle } from "../engine/types";
import { checkEligibility, type CourseMap } from "../engine/validate";
import { parseAdvisorReply } from "../ai/parse";
import type { ProviderKind } from "../ai/types";
import { useStore } from "../state/store";
import { useAiSettings } from "../state/aiSettings";
import { EligibilityDot } from "./bits";

const STARTERS = [
  "What should I take next term?",
  "Can I graduate in 3 years?",
  "What am I still missing for my degree?",
];

// ── Profile / settings ──────────────────────────────────────────────

function SettingsBlock() {
  const settings = useAiSettings();
  const remote = settings.provider !== "mock";
  return (
    <div className="mt-2 space-y-1.5 rounded-md border border-line bg-well p-2">
      <label className="flex items-center justify-between gap-2 text-[11px] text-ink-soft">
        Model
        <select
          value={settings.provider}
          onChange={(e) => settings.update({ provider: e.target.value as ProviderKind })}
          className="rounded-sm border border-line bg-paper px-1.5 py-1 text-[11px]"
        >
          <option value="mock">Built-in heuristics (no AI)</option>
          <option value="openai-compat">Self-hosted server (OpenAI-compatible)</option>
          <option value="anthropic">Anthropic (your API key)</option>
        </select>
      </label>
      {settings.provider === "openai-compat" && (
        <input
          value={settings.baseUrl}
          onChange={(e) => settings.update({ baseUrl: e.target.value })}
          placeholder="Server URL, e.g. http://localhost:11434"
          className="w-full rounded-sm border border-line bg-paper px-1.5 py-1 text-[11px]"
        />
      )}
      {remote && (
        <input
          value={settings.model}
          onChange={(e) => settings.update({ model: e.target.value })}
          placeholder={
            settings.provider === "anthropic"
              ? "Model (default claude-opus-4-8)"
              : "Model name, e.g. qwen2.5:7b"
          }
          className="w-full rounded-sm border border-line bg-paper px-1.5 py-1 text-[11px]"
        />
      )}
      {remote && (
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => settings.update({ apiKey: e.target.value })}
          placeholder={settings.provider === "anthropic" ? "API key" : "API key (optional)"}
          className="w-full rounded-sm border border-line bg-paper px-1.5 py-1 text-[11px]"
        />
      )}
      <p className="text-[10px] leading-snug text-ink-faint">
        Stored only in this browser — never included in exports or share links.
      </p>
    </div>
  );
}

function ProfileCard({ plan }: { plan: Plan }) {
  const setAdvisorProfile = useStore((s) => s.setAdvisorProfile);
  const profile = plan.advisor.profile;
  const [editing, setEditing] = useState(!profile.goal);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="shrink-0 border-b border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-bold tracking-widest text-ink-faint uppercase">
          Your goal
        </h3>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-sm px-1.5 py-0.5 text-[11px] text-ink-faint hover:text-ink"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => setShowSettings((v) => !v)}
            title="Advisor model settings"
            aria-label="Advisor model settings"
            className="rounded-sm px-1.5 py-0.5 text-[11px] text-ink-faint hover:text-ink"
          >
            ⚙
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-1.5 space-y-1.5">
          <textarea
            rows={2}
            defaultValue={profile.goal}
            placeholder="e.g. Graduate in 3 years; aiming for an ML PhD"
            autoFocus={!!profile.goal}
            onBlur={(e) => {
              setAdvisorProfile({ ...profile, goal: e.target.value.trim() });
              if (e.target.value.trim()) setEditing(false);
            }}
            className="w-full resize-none rounded-md border border-line bg-paper px-2 py-1.5 text-xs leading-relaxed"
          />
          <label className="flex items-center gap-2 text-[11px] text-ink-soft">
            Target years to finish
            <input
              type="number"
              min={1}
              max={8}
              defaultValue={profile.targetYears ?? ""}
              onBlur={(e) => {
                const n = Number(e.target.value);
                setAdvisorProfile({
                  ...profile,
                  targetYears: Number.isFinite(n) && n >= 1 && n <= 8 ? n : undefined,
                });
              }}
              className="w-14 rounded-sm border border-line bg-paper px-1.5 py-0.5 text-[11px]"
            />
          </label>
        </div>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          {profile.goal}
          {profile.targetYears ? ` · ${profile.targetYears} years` : ""}
        </p>
      )}
      {showSettings && <SettingsBlock />}
    </div>
  );
}

// ── Messages ────────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  plan,
  courseMap,
}: {
  rec: AdvisorRecommendation;
  plan: Plan;
  courseMap: CourseMap;
}) {
  const index = useStore((s) => s.index);
  const target = useStore((s) => s.target);
  const selectCourse = useStore((s) => s.selectCourse);
  const addToShortlist = useStore((s) => s.addToShortlist);

  const course = courseMap.get(rec.courseId);
  const lite = index?.find((l) => liteId(l) === rec.courseId);
  const title = course?.title ?? (lite ? liteTitle(lite) : "");
  const inPlan = plan.entries.some((e) => e.courseId === rec.courseId && e.status !== "failed");
  const inShortlist = plan.shortlist.includes(rec.courseId);
  const elig = course
    ? checkEligibility(course, target.year, target.term, plan, courseMap)
    : null;

  return (
    <div className="rounded-md border border-line bg-paper px-2.5 py-2">
      <div className="flex items-center gap-2">
        {elig && <EligibilityDot elig={elig} />}
        <button
          onClick={() => selectCourse(rec.courseId)}
          className="font-mono text-[11px] font-bold hover:text-navy"
          title="Open in the Course tab"
        >
          {displayId(rec.courseId)}
        </button>
        <span className="min-w-0 flex-1 truncate text-[11px] text-ink-soft">{title}</span>
      </div>
      {rec.reason && (
        <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{rec.reason}</p>
      )}
      <div className="mt-1.5 flex gap-1.5">
        <button
          onClick={() => addToShortlist(rec.courseId)}
          disabled={inPlan || inShortlist}
          className="rounded-sm border border-line bg-well px-2 py-0.5 text-[11px] font-semibold text-ink-soft transition-colors not-disabled:hover:border-navy not-disabled:hover:text-navy disabled:opacity-50"
        >
          {inPlan ? "In plan" : inShortlist ? "Shortlisted" : "Shortlist"}
        </button>
        <button
          onClick={() => selectCourse(rec.courseId)}
          className="rounded-sm border border-line bg-well px-2 py-0.5 text-[11px] font-semibold text-ink-soft transition-colors hover:border-navy hover:text-navy"
        >
          View
        </button>
      </div>
    </div>
  );
}

function MessageRow({
  msg,
  plan,
  courseMap,
}: {
  msg: AdvisorMessage;
  plan: Plan;
  courseMap: CourseMap;
}) {
  if (msg.role === "user") {
    return (
      <div className="ml-6 rounded-md bg-well px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap">
        {msg.content}
      </div>
    );
  }
  // The stored content keeps its JSON fence (so recs survive re-parses);
  // render only the prose here — the cards carry the structured part.
  const prose = parseAdvisorReply(msg.content).prose;
  return (
    <div className="space-y-2">
      {prose
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className="text-xs leading-relaxed whitespace-pre-wrap text-ink">
            {p.trim()}
          </p>
        ))}
      {(msg.recommendations ?? []).length > 0 && (
        <div className="space-y-1.5">
          {msg.recommendations!.map((rec) => (
            <RecommendationCard key={rec.courseId} rec={rec} plan={plan} courseMap={courseMap} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab shell ───────────────────────────────────────────────────────

export function AdvisorTab({ plan, courseMap }: { plan: Plan; courseMap: CourseMap }) {
  const status = useStore((s) => s.advisorStatus);
  const error = useStore((s) => s.advisorError);
  const sendAdvisorMessage = useStore((s) => s.sendAdvisorMessage);
  const clearAdvisorConversation = useStore((s) => s.clearAdvisorConversation);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const messages = plan.advisor.messages;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, status]);

  const send = (text: string) => {
    if (!text.trim() || status === "sending") return;
    setDraft("");
    void sendAdvisorMessage(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ProfileCard plan={plan} />

      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="text-xs leading-relaxed text-ink-soft">
            <p>
              Ask about your plan — recommendations are grounded in the real catalog: only
              courses you're actually eligible for, checked against your degree requirements.
            </p>
            <div className="mt-3 space-y-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="block w-full rounded-md border border-line bg-paper px-2.5 py-1.5 text-left text-xs text-ink-soft hover:border-navy hover:text-navy"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageRow key={m.id} msg={m} plan={plan} courseMap={courseMap} />
        ))}
        {status === "sending" && (
          <p className="animate-pulse text-xs text-ink-faint">Thinking…</p>
        )}
        {error && (
          <div className="rounded-md border border-unmet/40 bg-unmet-wash px-2.5 py-2 text-xs leading-relaxed">
            <p>{error}</p>
            <button
              onClick={() => void sendAdvisorMessage()}
              className="mt-1 font-semibold text-navy hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line p-2">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          placeholder="Ask the advisor… (Enter to send)"
          className="w-full resize-none rounded-md border border-line bg-paper px-2 py-1.5 text-xs leading-relaxed"
        />
        <div className="mt-1 flex items-center justify-between">
          {messages.length > 0 ? (
            <button
              onClick={() => {
                if (confirm("Clear this plan's advisor conversation?")) {
                  clearAdvisorConversation();
                }
              }}
              className="text-[11px] text-ink-faint hover:text-ink"
            >
              Clear conversation
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={() => send(draft)}
            disabled={status === "sending" || !draft.trim()}
            className="rounded-md bg-navy px-3 py-1 text-xs font-semibold text-white hover:bg-navy-hover disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
