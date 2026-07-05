import { useMemo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { EntryIssue, EntryStatus, Plan, PlanEntry, Term, ValidationReport } from "../engine/types";
import { TERMS, TERM_LABELS, TRANSFER_YEAR, displayId, termKey } from "../engine/types";
import { CREDIT_LIMIT_SUMMER, CREDIT_LIMIT_WINTER, type CourseMap } from "../engine/validate";
import { useStore } from "../state/store";
import { STATUS_META, StatusGlyph } from "./bits";

function EntryCard({
  entry,
  issues,
  courseMap,
}: {
  entry: PlanEntry;
  issues: EntryIssue[];
  courseMap: CourseMap;
}) {
  const selectCourse = useStore((s) => s.selectCourse);
  const cycleStatus = useStore((s) => s.cycleStatus);
  const removeEntry = useStore((s) => s.removeEntry);
  const setEntryCredits = useStore((s) => s.setEntryCredits);
  const selected = useStore((s) => s.selectedCourseId) === entry.courseId;
  const isTransfer = entry.year === TRANSFER_YEAR;

  const course = courseMap.get(entry.courseId);
  const worst = issues.some((i) => i.severity === "error")
    ? "error"
    : issues.length > 0
      ? "warning"
      : null;
  const meta = STATUS_META[entry.status];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: entry.id });

  const edge =
    worst === "error"
      ? "border-unmet ring-1 ring-unmet/30"
      : worst === "warning"
        ? "border-judge ring-1 ring-judge/30"
        : "border-line";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => selectCourse(entry.courseId)}
      title={issues.map((i) => i.message).join("\n") || undefined}
      className={`group cursor-pointer rounded-md border bg-paper px-2 py-1.5 shadow-xs transition-colors hover:border-navy ${edge} ${
        selected ? "outline-2 outline-navy" : ""
      } ${isDragging ? "opacity-40" : ""} ${entry.status === "failed" ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            cycleStatus(entry.id);
          }}
          title={`${meta.label} — click to change status`}
          className={`shrink-0 ${meta.className} hover:scale-110`}
        >
          <StatusGlyph status={entry.status} />
        </button>
        <span
          className={`font-mono text-xs font-semibold ${entry.status === "failed" ? "line-through" : ""}`}
        >
          {displayId(entry.courseId)}
        </span>
        {worst && (
          <span
            className={`text-[10px] font-bold ${worst === "error" ? "text-unmet" : "text-judge"}`}
          >
            {worst === "error" ? "✗" : "?"}
          </span>
        )}
        {isTransfer ? (
          <input
            type="number"
            min={0}
            step={0.5}
            value={entry.creditsOverride ?? course?.credits ?? 3}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const n = e.target.value === "" ? null : Number(e.target.value);
              setEntryCredits(entry.id, n != null && !Number.isNaN(n) ? n : null);
            }}
            title="Credits granted for this transfer/prior credit — edit to match your transcript"
            className="ml-auto w-11 shrink-0 rounded border border-line-soft bg-paper px-1 py-0.5 text-right text-[10px] text-ink-soft"
          />
        ) : (
          <span className="ml-auto text-[10px] text-ink-faint">{course?.credits ?? "–"} cr</span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeEntry(entry.id);
          }}
          title="Remove from plan"
          className="invisible -mr-0.5 rounded px-1 text-ink-faint hover:text-unmet group-hover:visible"
        >
          ×
        </button>
      </div>
      <div className="mt-0.5 truncate text-[11px] leading-tight text-ink-soft">
        {course?.title ?? "…"}
      </div>
    </div>
  );
}

// Stages the term-header click steps through. Failed is deliberately not
// in the loop — it's per-course history, never set in bulk.
const TERM_STATUS_CYCLE: EntryStatus[] = ["planned", "in_progress", "completed"];

function TermCell({
  plan,
  year,
  term,
  report,
  courseMap,
  issuesByEntry,
}: {
  plan: Plan;
  year: number;
  term: Term;
  report: ValidationReport;
  courseMap: CourseMap;
  issuesByEntry: Map<string, EntryIssue[]>;
}) {
  const target = useStore((s) => s.target);
  const setTarget = useStore((s) => s.setTarget);
  const setTermStatus = useStore((s) => s.setTermStatus);
  const isTarget = target.year === year && target.term === term;

  const { setNodeRef, isOver } = useDroppable({ id: `cell:${year}:${term}` });

  const entries = plan.entries.filter((e) => e.year === year && e.term === term);
  const credits = report.termCredits[termKey(year, term)] ?? 0;
  const hasLimit = term !== "TR";
  const limit = term === "S" ? CREDIT_LIMIT_SUMMER : CREDIT_LIMIT_WINTER;
  const over = hasLimit && credits > limit;

  // Whole-term status shortcut: clicking the header advances every
  // non-failed course to the stage after the term's least-advanced one.
  // Transfer credit is completed by definition, so no cycling there.
  const live = entries.filter((e) => e.status !== "failed");
  const canCycle = term !== "TR" && live.length > 0;
  const stage = live.length
    ? Math.min(...live.map((e) => Math.max(0, TERM_STATUS_CYCLE.indexOf(e.status))))
    : 0;
  const nextStatus = TERM_STATUS_CYCLE[(stage + 1) % TERM_STATUS_CYCLE.length];
  const uniform =
    live.length > 0 && live.every((e) => e.status === live[0].status) ? live[0].status : null;

  const label = (
    <span className="truncate text-[11px] font-semibold tracking-wide text-ink-soft">
      {TERM_LABELS[term]}
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-28 flex-col rounded-lg border transition-colors ${
        isOver ? "border-gold-bright bg-gold-wash" : isTarget ? "border-gold bg-paper" : "border-line-soft bg-paper"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 rounded-t-lg border-b py-1 pl-2.5 pr-1 ${
          isTarget ? "border-gold bg-gold-wash" : "border-line-soft bg-panel/60"
        }`}
      >
        {canCycle ? (
          <button
            onClick={() => setTermStatus(year, term, nextStatus)}
            title={`${
              uniform ? `All ${STATUS_META[uniform].label.toLowerCase()}` : "Mixed statuses"
            } — click to set every course here to ${STATUS_META[nextStatus].label}`}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left hover:opacity-70"
          >
            {label}
            {uniform && (
              <span className={`shrink-0 ${STATUS_META[uniform].className}`}>
                <StatusGlyph status={uniform} />
              </span>
            )}
          </button>
        ) : (
          <span className="flex min-w-0 flex-1 items-center py-0.5">{label}</span>
        )}
        <span
          className={`shrink-0 whitespace-nowrap font-mono text-[11px] tabular-nums ${
            over ? "font-bold text-unmet" : "text-ink-faint"
          }`}
          title={
            !hasLimit
              ? `${credits} credits — no term load limit applies here`
              : over
                ? `Over the usual ${limit}-credit load`
                : `${credits} of ~${limit} credits`
          }
        >
          {credits} cr{over ? " !" : ""}
        </span>
        <button
          onClick={() => setTarget(year, term)}
          aria-pressed={isTarget}
          title={
            isTarget
              ? "Courses added from search go to this term"
              : "Send courses added from search to this term"
          }
          className={`shrink-0 rounded px-1.5 py-0.5 text-[13px] font-bold leading-none ${
            isTarget ? "text-gold" : "text-ink-faint/60 hover:text-navy"
          }`}
        >
          +
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-1.5">
        {entries.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            issues={issuesByEntry.get(e.id) ?? []}
            courseMap={courseMap}
          />
        ))}
      </div>
    </div>
  );
}

export function Board({
  plan,
  report,
  courseMap,
}: {
  plan: Plan;
  report: ValidationReport;
  courseMap: CourseMap;
}) {
  const setYears = useStore((s) => s.setYears);

  const issuesByEntry = useMemo(() => {
    const m = new Map<string, EntryIssue[]>();
    for (const issue of report.entryIssues) {
      if (!m.has(issue.entryId)) m.set(issue.entryId, []);
      m.get(issue.entryId)!.push(issue);
    }
    return m;
  }, [report]);

  const years = Array.from({ length: plan.years }, (_, i) => i + 1);
  const lastYearEmpty = !plan.entries.some((e) => e.year === plan.years);

  return (
    <main className="min-w-0 flex-1 overflow-auto bg-well/40 p-4">
      <div className="min-w-[560px] space-y-4">
        <section>
          <h2 className="mb-1.5 font-display text-sm font-semibold text-ink-soft">
            Transfer / Prior Credit
          </h2>
          <p className="mb-1.5 text-[11px] text-ink-faint">
            Credit from another institution, AP/IB, or challenge exams — not tied to a UBC term.
            Search for a specific equivalent course, or a department's generic{" "}
            <span className="font-mono">1st–4th Year Credit</span> placeholder if none applies.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <TermCell
              plan={plan}
              year={TRANSFER_YEAR}
              term="TR"
              report={report}
              courseMap={courseMap}
              issuesByEntry={issuesByEntry}
            />
          </div>
        </section>

        {years.map((year) => (
          <section key={year}>
            <h2 className="mb-1.5 font-display text-sm font-semibold text-ink-soft">
              Year {year}
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {TERMS.map((term) => (
                <TermCell
                  key={term}
                  plan={plan}
                  year={year}
                  term={term}
                  report={report}
                  courseMap={courseMap}
                  issuesByEntry={issuesByEntry}
                />
              ))}
            </div>
          </section>
        ))}

        <div className="flex gap-2 pb-4">
          <button
            onClick={() => setYears(plan.years + 1)}
            className="rounded-md border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-navy hover:border-navy"
          >
            + Add year {plan.years + 1}
          </button>
          {plan.years > 1 && lastYearEmpty && (
            <button
              onClick={() => setYears(plan.years - 1)}
              className="rounded-md border border-line bg-paper px-3 py-1.5 text-xs text-ink-soft hover:border-navy"
            >
              Remove empty year {plan.years}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
