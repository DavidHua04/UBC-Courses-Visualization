// App state. Plans persist to localStorage; catalog data is a session cache.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type {
  AdvisorMessage,
  AdvisorProfile,
  AdvisorState,
  Course,
  CourseLite,
  EntryStatus,
  Plan,
  PlanEntry,
  Program,
  Term,
} from "../engine/types";
import { emptyAdvisorState, liteId, TRANSFER_YEAR } from "../engine/types";
import { validatePlan } from "../engine/validate";
import { computeProgress } from "../engine/progress";
import { loadDept } from "../catalog/loader";
import {
  buildAdvisorContext,
  candidateDepts,
  historyForRequest,
  serializeContext,
} from "../ai/context";
import { parseAdvisorReply } from "../ai/parse";
import { createProvider } from "../ai/provider";
import { useAiSettings } from "./aiSettings";

export type InsightTab = "course" | "plan" | "degree" | "advisor";

// Long conversations would bloat localStorage (shared ~5MB quota across all
// plans); the advisor only feeds the last few messages to the model anyway.
export const ADVISOR_MESSAGE_CAP = 40;
const ADVISOR_CONTENT_CAP = 8_000; // chars per stored message

/** Keep the newest `cap` messages; truncate oversized message bodies. */
export function capMessages(messages: AdvisorMessage[], cap = ADVISOR_MESSAGE_CAP): AdvisorMessage[] {
  return messages.slice(-cap).map((m) =>
    m.content.length > ADVISOR_CONTENT_CAP
      ? { ...m, content: m.content.slice(0, ADVISOR_CONTENT_CAP) }
      : m,
  );
}

const cloneAdvisor = (advisor: AdvisorState | undefined): AdvisorState =>
  advisor
    ? { profile: { ...advisor.profile }, messages: [...advisor.messages] }
    : emptyAdvisorState();

const STATUS_CYCLE: EntryStatus[] = ["planned", "in_progress", "completed", "failed"];

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

function newPlan(name: string): Plan {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name,
    programId: null,
    years: 4,
    entries: [],
    shortlist: [],
    exemptions: [],
    advisor: emptyAdvisorState(),
    createdAt: now,
    updatedAt: now,
  };
}

interface PlannerState {
  // persisted
  plans: Record<string, Plan>;
  activePlanId: string | null;

  // session
  index: CourseLite[] | null;
  courses: Record<string, Course>;
  programs: Program[];
  target: { year: number; term: Term };
  selectedCourseId: string | null;
  insightTab: InsightTab;
  query: string;
  advisorStatus: "idle" | "sending";
  advisorError: string | null;

  // catalog
  setIndex(index: CourseLite[]): void;
  setPrograms(programs: Program[]): void;
  addCourses(courses: Course[]): void;

  // ui
  setQuery(query: string): void;
  setTarget(year: number, term: Term): void;
  selectCourse(courseId: string | null, tab?: InsightTab): void;
  setInsightTab(tab: InsightTab): void;

  // plans
  createPlan(name?: string): void;
  deletePlan(planId: string): void;
  duplicatePlan(planId: string): void;
  renamePlan(planId: string, name: string): void;
  setActivePlan(planId: string): void;
  setProgram(programId: string | null): void;
  importPlan(plan: Plan): void;

  // entries
  addEntry(courseId: string, year: number, term: Term): void;
  moveEntry(entryId: string, year: number, term: Term): void;
  removeEntry(entryId: string): void;
  cycleStatus(entryId: string): void;
  setTermStatus(year: number, term: Term, status: EntryStatus): void;
  setEntryCredits(entryId: string, credits: number | null): void;
  addToShortlist(courseId: string): void;
  removeFromShortlist(courseId: string): void;
  setYears(years: number): void;
  toggleExemption(key: string): void;

  // advisor
  setAdvisorProfile(profile: AdvisorProfile): void;
  appendAdvisorMessage(msg: AdvisorMessage): void;
  clearAdvisorConversation(): void;
  setAdvisorStatus(status: "idle" | "sending", error?: string | null): void;
  /** Send a chat turn. Omit `text` to retry with the existing history. */
  sendAdvisorMessage(text?: string): Promise<void>;
}

// In-flight advisor request — module-level so a new send (or a clear) can
// abort the previous one regardless of which component triggered it.
let advisorAbort: AbortController | null = null;

function mutatePlan(state: PlannerState, fn: (plan: Plan) => void): Partial<PlannerState> {
  const id = state.activePlanId;
  if (!id || !state.plans[id]) return {};
  const plan: Plan = {
    ...state.plans[id],
    entries: [...state.plans[id].entries],
    shortlist: [...(state.plans[id].shortlist ?? [])],
    exemptions: [...state.plans[id].exemptions],
    advisor: cloneAdvisor(state.plans[id].advisor),
  };
  fn(plan);
  plan.updatedAt = new Date().toISOString();
  return { plans: { ...state.plans, [id]: plan } };
}

export const useStore = create<PlannerState>()(
  persist(
    (set, get) => {
      const first = newPlan("My degree plan");
      return {
        plans: { [first.id]: first },
        activePlanId: first.id,

        index: null,
        courses: {},
        programs: [],
        target: { year: 1, term: "W1" },
        selectedCourseId: null,
        insightTab: "course",
        query: "",
        advisorStatus: "idle",
        advisorError: null,

        setIndex: (index) => set({ index }),
        setPrograms: (programs) => set({ programs }),
        addCourses: (courses) =>
          set((s) => {
            const merged = { ...s.courses };
            for (const c of courses) merged[c.id] = c;
            return { courses: merged };
          }),

        setQuery: (query) => set({ query }),
        setTarget: (year, term) => set({ target: { year, term } }),
        selectCourse: (courseId, tab = "course") =>
          set(courseId ? { selectedCourseId: courseId, insightTab: tab } : { selectedCourseId: null }),
        setInsightTab: (insightTab) => set({ insightTab }),

        createPlan: (name) =>
          set((s) => {
            const plan = newPlan(name ?? `Plan ${Object.keys(s.plans).length + 1}`);
            return { plans: { ...s.plans, [plan.id]: plan }, activePlanId: plan.id };
          }),
        deletePlan: (planId) =>
          set((s) => {
            const plans = { ...s.plans };
            delete plans[planId];
            let activePlanId = s.activePlanId;
            if (activePlanId === planId) activePlanId = Object.keys(plans)[0] ?? null;
            if (!activePlanId) {
              const fresh = newPlan("My degree plan");
              plans[fresh.id] = fresh;
              activePlanId = fresh.id;
            }
            return { plans, activePlanId };
          }),
        duplicatePlan: (planId) =>
          set((s) => {
            const src = s.plans[planId];
            if (!src) return {};
            const copy: Plan = {
              ...src,
              id: uid(),
              name: `${src.name} (copy)`,
              entries: src.entries.map((e) => ({ ...e, id: uid() })),
              shortlist: [...(src.shortlist ?? [])],
              exemptions: [...src.exemptions],
              // Conversation travels with the copy — a what-if fork keeps its
              // advisor context. (`...src` alone would share the reference.)
              advisor: cloneAdvisor(src.advisor),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            return { plans: { ...s.plans, [copy.id]: copy }, activePlanId: copy.id };
          }),
        renamePlan: (planId, name) =>
          set((s) => {
            const plan = s.plans[planId];
            if (!plan || !name.trim()) return {};
            return { plans: { ...s.plans, [planId]: { ...plan, name: name.trim() } } };
          }),
        setActivePlan: (activePlanId) => set({ activePlanId, target: { year: 1, term: "W1" } }),
        setProgram: (programId) => set((s) => mutatePlan(s, (p) => (p.programId = programId))),
        importPlan: (plan) =>
          set((s) => {
            const imported: Plan = {
              ...plan,
              id: uid(),
              entries: plan.entries.map((e) => ({ ...e, id: uid() })),
              advisor: cloneAdvisor(plan.advisor),
            };
            return { plans: { ...s.plans, [imported.id]: imported }, activePlanId: imported.id };
          }),

        addEntry: (courseId, year, term) =>
          set((s) =>
            mutatePlan(s, (p) => {
              // Transfer/prior credit is already-earned by definition — default
              // it straight to Completed instead of Planned.
              const status = year === TRANSFER_YEAR ? "completed" : "planned";
              const entry: PlanEntry = { id: uid(), courseId, year, term, status };
              p.entries.push(entry);
              // Committing a shortlisted course to a term graduates it out of the tray.
              p.shortlist = p.shortlist.filter((id) => id !== courseId);
              if (year > p.years) p.years = year;
            }),
          ),
        moveEntry: (entryId, year, term) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.map((e) => {
                if (e.id !== entryId) return e;
                // Dragging a still-planned course into the transfer row means
                // it's prior credit — treat it as already-earned, same as a
                // fresh add there. Don't touch in_progress/completed/failed.
                const status =
                  year === TRANSFER_YEAR && e.status === "planned" ? "completed" : e.status;
                return { ...e, year, term, status };
              });
            }),
          ),
        removeEntry: (entryId) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.filter((e) => e.id !== entryId);
            }),
          ),
        cycleStatus: (entryId) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.map((e) => {
                if (e.id !== entryId) return e;
                const next =
                  STATUS_CYCLE[(STATUS_CYCLE.indexOf(e.status) + 1) % STATUS_CYCLE.length];
                return { ...e, status: next };
              });
            }),
          ),
        // Bulk shortcut for a whole term. Failed entries are history — a
        // term-level sweep never resurrects them.
        setTermStatus: (year, term, status) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.map((e) =>
                e.year === year && e.term === term && e.status !== "failed"
                  ? { ...e, status }
                  : e,
              );
            }),
          ),
        addToShortlist: (courseId) =>
          set((s) =>
            mutatePlan(s, (p) => {
              if (!p.shortlist.includes(courseId)) p.shortlist.push(courseId);
            }),
          ),
        removeFromShortlist: (courseId) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.shortlist = p.shortlist.filter((id) => id !== courseId);
            }),
          ),
        setEntryCredits: (entryId, credits) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.map((e) =>
                e.id === entryId ? { ...e, creditsOverride: credits ?? undefined } : e,
              );
            }),
          ),
        setYears: (years) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.years = Math.max(1, Math.min(8, years));
              p.entries = p.entries.filter((e) => e.year <= p.years);
            }),
          ),
        toggleExemption: (key) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.exemptions = p.exemptions.includes(key)
                ? p.exemptions.filter((x) => x !== key)
                : [...p.exemptions, key];
            }),
          ),

        setAdvisorProfile: (profile) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.advisor = { ...p.advisor, profile };
            }),
          ),
        appendAdvisorMessage: (msg) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.advisor = {
                ...p.advisor,
                messages: capMessages([...p.advisor.messages, msg]),
              };
            }),
          ),
        clearAdvisorConversation: () => {
          advisorAbort?.abort();
          set((s) => ({
            advisorStatus: "idle",
            advisorError: null,
            ...mutatePlan(s, (p) => {
              p.advisor = { ...p.advisor, messages: [] };
            }),
          }));
        },
        setAdvisorStatus: (advisorStatus, error = null) =>
          set({ advisorStatus, advisorError: error }),
        sendAdvisorMessage: async (text) => {
          const trimmed = text?.trim();
          if (trimmed) {
            get().appendAdvisorMessage({
              id: uid(),
              role: "user",
              content: trimmed,
              createdAt: new Date().toISOString(),
            });
          }
          set({ advisorStatus: "sending", advisorError: null });
          advisorAbort?.abort();
          const controller = new AbortController();
          advisorAbort = controller;

          try {
            const s = get();
            const plan = activePlan(s);
            const program = s.programs.find((p) => p.id === plan.programId) ?? null;

            // Hydrate full records for every dept the context might draw
            // from; missing chunks (network hiccups) just narrow the pool.
            const preMap: Map<string, Course> = new Map(Object.entries(s.courses));
            const prePlanProgress = program ? computeProgress(plan, program, preMap) : null;
            const depts = candidateDepts(plan, program, prePlanProgress);
            const chunks = await Promise.allSettled(depts.map((d) => loadDept(d)));
            const loaded = chunks.flatMap((c) => (c.status === "fulfilled" ? c.value : []));
            if (loaded.length > 0) get().addCourses(loaded);
            if (controller.signal.aborted) return;

            const now = get();
            const freshPlan = activePlan(now);
            const courseMap: Map<string, Course> = new Map(Object.entries(now.courses));
            const report = validatePlan(freshPlan, courseMap);
            const progress = program ? computeProgress(freshPlan, program, courseMap) : null;
            const context = buildAdvisorContext({
              plan: freshPlan,
              program,
              courseMap,
              index: now.index,
              report,
              progress,
            });

            const provider = createProvider(useAiSettings.getState());
            const reply = await provider.send(
              {
                system: serializeContext(context),
                messages: historyForRequest(freshPlan.advisor.messages),
                context,
              },
              { signal: controller.signal },
            );
            if (controller.signal.aborted) return;

            const parsed = parseAdvisorReply(reply.text);
            // Drop hallucinated course ids — only real catalog courses render.
            const known = new Set((now.index ?? []).map(liteId));
            const recommendations = parsed.recommendations.filter(
              (r) => known.size === 0 || known.has(r.courseId),
            );
            get().appendAdvisorMessage({
              id: uid(),
              role: "assistant",
              content: reply.text,
              createdAt: new Date().toISOString(),
              recommendations,
            });
            set({ advisorStatus: "idle", advisorError: null });
          } catch (err) {
            if (controller.signal.aborted) return;
            set({
              advisorStatus: "idle",
              advisorError: err instanceof Error ? err.message : String(err),
            });
          }
        },
      };
    },
    {
      name: "degree-map",
      version: 3,
      migrate: (persisted) => migratePersisted(persisted),
      partialize: (s) => ({ plans: s.plans, activePlanId: s.activePlanId }),
    },
  ),
);

/** Pure so migrations are testable. v1 plans predate the shortlist tray;
 *  v2 plans predate the AI advisor. */
export function migratePersisted(persisted: unknown) {
  const s = persisted as { plans: Record<string, Plan>; activePlanId: string | null };
  for (const plan of Object.values(s.plans ?? {})) {
    plan.shortlist ??= [];
    plan.advisor ??= emptyAdvisorState();
  }
  return s;
}

export const activePlan = (s: { plans: Record<string, Plan>; activePlanId: string | null }) =>
  (s.activePlanId && s.plans[s.activePlanId]) || Object.values(s.plans)[0];

// ── Share links ─────────────────────────────────────────────────────
// The whole plan travels in the URL fragment — nothing leaves the browser
// until the user sends the link themselves.

/** Share payload without the advisor conversation — it can push a chat-heavy
 *  plan past URL length limits, and goals/chats are personal. `undefined`
 *  keys are dropped by JSON.stringify. */
export function planSharePayload(plan: Plan): string {
  return JSON.stringify({ ...plan, advisor: undefined });
}

export function planToShareUrl(plan: Plan): string {
  const payload = compressToEncodedURIComponent(planSharePayload(plan));
  return `${location.origin}${location.pathname}#plan=${payload}`;
}

export function planFromHash(hash: string): Plan | null {
  const m = hash.match(/#plan=(.+)/);
  if (!m) return null;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    if (!json) return null;
    const plan = JSON.parse(json) as Plan;
    if (!plan || !Array.isArray(plan.entries)) return null;
    plan.shortlist ??= [];
    plan.exemptions ??= [];
    plan.years ??= 4;
    plan.advisor ??= emptyAdvisorState();
    return plan;
  } catch {
    return null;
  }
}
