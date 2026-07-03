// The signature element: prerequisite logic rendered as a live proof tree.
// Connectives (ALL OF / ONE OF) in small caps, one leaf per line, each with
// a registrar's mark: ✓ met, ✗ not yet, and where a missing course sits.

import type { Plan, RuleEval } from "../engine/types";
import { TERM_LABELS, displayId } from "../engine/types";
import { useStore } from "../state/store";

function Mark({ met }: { met: boolean }) {
  return met ? (
    <svg viewBox="0 0 12 12" className="mt-0.5 size-3 shrink-0 text-met" aria-label="met">
      <path
        d="M2 6.5 L5 9.5 L10 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 12 12" className="mt-0.5 size-3 shrink-0 text-unmet" aria-label="not met">
      <path
        d="M2.5 2.5 L9.5 9.5 M9.5 2.5 L2.5 9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CourseLeaf({ courseId, met, plan }: { courseId: string; met: boolean; plan: Plan }) {
  const selectCourse = useStore((s) => s.selectCourse);
  const entry = plan.entries.find((e) => e.courseId === courseId && e.status !== "failed");

  let note: string | null = null;
  if (met) note = entry ? `Year ${entry.year} · ${TERM_LABELS[entry.term]}` : null;
  else if (entry) note = `planned later — Year ${entry.year} · ${TERM_LABELS[entry.term]}`;
  else note = "not in plan";

  return (
    <span className="flex items-baseline gap-1.5">
      <button
        onClick={() => selectCourse(courseId)}
        className={`font-mono text-xs font-semibold underline-offset-2 hover:underline ${
          met ? "text-ink" : "text-unmet"
        }`}
      >
        {displayId(courseId)}
      </button>
      {note && <span className="text-[10px] text-ink-faint">{note}</span>}
    </span>
  );
}

export function RuleTree({ ev, plan, depth = 0 }: { ev: RuleEval; plan: Plan; depth?: number }) {
  const { rule } = ev;
  const met = ev.status === "met";

  if (rule.type === "course") {
    return (
      <div className="flex gap-1.5">
        <Mark met={met} />
        <CourseLeaf courseId={rule.courseId} met={met} plan={plan} />
      </div>
    );
  }

  if (rule.type === "min_credits") {
    return (
      <div className="flex gap-1.5">
        <Mark met={met} />
        <span className="text-xs">
          <span className={met ? "text-ink" : "text-unmet"}>
            {rule.minCredits} credits{rule.from ? " from" : ""}
          </span>{" "}
          {rule.from && (
            <span className="font-mono text-[11px]">{rule.from.map(displayId).join(", ")}</span>
          )}
          <span className="ml-1.5 text-[10px] text-ink-faint">
            {ev.creditsCounted ?? 0} counted
          </span>
        </span>
      </div>
    );
  }

  const label =
    rule.type === "all_of"
      ? "all of"
      : rule.minCount && rule.minCount > 1
        ? `${rule.minCount} of`
        : "one of";

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Mark met={met} />
        <span
          className={`text-[10px] font-bold tracking-widest uppercase ${
            met ? "text-ink-soft" : "text-unmet"
          }`}
        >
          {label}
        </span>
      </div>
      <div
        className={`mt-1 ml-[5px] space-y-1 border-l pl-3 ${met ? "border-line" : "border-unmet/40"}`}
      >
        {ev.children?.map((child, i) => (
          <RuleTree key={i} ev={child} plan={plan} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}
