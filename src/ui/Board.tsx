import { useMemo } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { EntryIssue, Plan, PlanEntry, Term, ValidationReport } from "../engine/types";
import { TERMS, TERM_LABELS, displayId, termKey } from "../engine/types";
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
  const selected = useStore((s) => s.selectedCourseId) === entry.courseId;

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
        <span className="ml-auto text-[10px] text-ink-faint">{course?.credits ?? "–"} cr</span>
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
  const isTarget = target.year === year && target.term === term;

  const { setNodeRef, isOver } = useDroppable({ id: `cell:${year}:${term}` });

  const entries = plan.entries.filter((e) => e.year === year && e.term === term);
  const credits = report.termCredits[termKey(year, term)] ?? 0;
  const limit = term === "S" ? CREDIT_LIMIT_SUMMER : CREDIT_LIMIT_WINTER;
  const over = credits > limit;

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-28 flex-col rounded-lg border transition-colors ${
        isOver ? "border-gold-bright bg-gold-wash" : isTarget ? "border-gold bg-paper" : "border-line-soft bg-paper"
      }`}
    >
      <button
        onClick={() => setTarget(year, term)}
        title="Make this the term new courses are added to"
        className={`flex items-center justify-between rounded-t-lg border-b px-2.5 py-1.5 text-left ${
          isTarget ? "border-gold bg-gold-wash" : "border-line-soft bg-panel/60 hover:bg-gold-wash/60"
        }`}
      >
        <span className="text-[11px] font-semibold tracking-wide text-ink-soft">
          {TERM_LABELS[term]}
          {isTarget && <span className="ml-1.5 text-gold">← adding here</span>}
        </span>
        <span
          className={`font-mono text-[11px] ${over ? "font-bold text-unmet" : "text-ink-faint"}`}
          title={over ? `Over the usual ${limit}-credit load` : `${credits} of ~${limit} credits`}
        >
          {credits} cr{over ? " !" : ""}
        </span>
      </button>
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
