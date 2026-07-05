import { useMemo } from "react";
import type {
  Course,
  Plan,
  Program,
  RequirementProgress,
  ValidationReport,
} from "../engine/types";
import { displayId, liteId, liteTitle, slotLabel } from "../engine/types";
import { evaluateRule } from "../engine/prereq";
import { computeProgress } from "../engine/progress";
import { checkEligibility, takenBefore, type CourseMap } from "../engine/validate";
import { useStore, type InsightTab } from "../state/store";
import { RuleTree } from "./RuleTree";
import { describeEligibility, EligibilityDot } from "./bits";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-[10px] font-bold tracking-widest text-ink-faint uppercase">
      {children}
    </h3>
  );
}

function CourseChip({ courseId, plan }: { courseId: string; plan: Plan }) {
  const selectCourse = useStore((s) => s.selectCourse);
  const inPlan = plan.entries.some((e) => e.courseId === courseId && e.status !== "failed");
  return (
    <button
      onClick={() => selectCourse(courseId)}
      className={`rounded-sm border px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-colors hover:border-navy ${
        inPlan ? "border-met/40 bg-met-wash text-met" : "border-line bg-paper text-ink-soft"
      }`}
      title={inPlan ? "In your plan" : "Not in your plan"}
    >
      {displayId(courseId)}
    </button>
  );
}

// ── Course tab ──────────────────────────────────────────────────────

function CourseTab({
  plan,
  courseMap,
}: {
  plan: Plan;
  courseMap: CourseMap;
}) {
  const selectedCourseId = useStore((s) => s.selectedCourseId);
  const index = useStore((s) => s.index);
  const target = useStore((s) => s.target);
  const addEntry = useStore((s) => s.addEntry);

  if (!selectedCourseId) {
    return (
      <p className="px-4 py-6 text-xs leading-relaxed text-ink-soft">
        Select any course — a search result or a card on the board — to see its prerequisite
        logic, what it unlocks, and whether it fits where you want it.
      </p>
    );
  }

  const course: Course | undefined = courseMap.get(selectedCourseId);
  if (!course) {
    const lite = index?.find((l) => liteId(l) === selectedCourseId);
    return (
      <div className="px-4 py-6 text-xs text-ink-soft">
        <span className="font-mono font-semibold">{displayId(selectedCourseId)}</span>
        {lite ? ` — ${liteTitle(lite)}` : ""} · loading details…
      </div>
    );
  }

  const entry = plan.entries.find((e) => e.courseId === course.id && e.status !== "failed");
  const slot = entry ?? { year: target.year, term: target.term };
  const elig = checkEligibility(course, target.year, target.term, plan, courseMap);
  const ruleEval = course.prereq
    ? evaluateRule(course.prereq, takenBefore(plan, slot.year, slot.term, courseMap))
    : null;

  return (
    <div className="space-y-4 p-4">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-base font-bold">{displayId(course.id)}</span>
          <span className="text-xs text-ink-faint">{course.credits} credits</span>
        </div>
        <h2 className="font-display text-base leading-snug">{course.title}</h2>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <EligibilityDot elig={elig} />
          <span className="text-ink-soft">
            {entry
              ? `In plan — ${slotLabel(entry.year, entry.term)}`
              : describeEligibility(elig)}
          </span>
        </div>
        {!entry && (
          <button
            onClick={() => addEntry(course.id, target.year, target.term)}
            className="mt-2 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-hover"
          >
            Add to {slotLabel(target.year, target.term)}
          </button>
        )}
      </div>

      <div>
        <SectionLabel>
          Prerequisites{entry ? ` — checked at ${slotLabel(slot.year, slot.term)}` : ""}
        </SectionLabel>
        {ruleEval ? (
          <RuleTree ev={ruleEval} plan={plan} />
        ) : course.prereqText ? (
          <p className="rounded-md border border-judge/40 bg-judge-wash px-2.5 py-2 text-xs leading-relaxed text-ink">
            <span className="font-semibold text-judge">Your judgment needed: </span>
            {course.prereqText}
          </p>
        ) : (
          <p className="text-xs text-ink-soft">None.</p>
        )}
      </div>

      {course.coreq.length > 0 && (
        <div>
          <SectionLabel>Corequisites — same term or earlier</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {course.coreq.map((id) => (
              <CourseChip key={id} courseId={id} plan={plan} />
            ))}
          </div>
        </div>
      )}

      {course.description && (
        <div>
          <SectionLabel>Calendar description</SectionLabel>
          <p className="text-xs leading-relaxed text-ink-soft">{course.description}</p>
        </div>
      )}

      <div>
        <SectionLabel>Unlocks {course.unlocks.length > 0 && `(${course.unlocks.length})`}</SectionLabel>
        {course.unlocks.length === 0 ? (
          <p className="text-xs text-ink-soft">No catalog course lists this as a prerequisite.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {course.unlocks.slice(0, 36).map((id) => (
              <CourseChip key={id} courseId={id} plan={plan} />
            ))}
            {course.unlocks.length > 36 && (
              <span className="px-1 text-[11px] text-ink-faint">
                +{course.unlocks.length - 36} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Plan (issues) tab ───────────────────────────────────────────────

function PlanTab({ plan, report }: { plan: Plan; report: ValidationReport }) {
  const selectCourse = useStore((s) => s.selectCourse);
  const errors = report.entryIssues.filter((i) => i.severity === "error");
  const warnings = report.entryIssues.filter((i) => i.severity === "warning");

  const statusCounts = useMemo(() => {
    const counts = { planned: 0, in_progress: 0, completed: 0, failed: 0 };
    for (const e of plan.entries) counts[e.status]++;
    return counts;
  }, [plan.entries]);

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-md border border-line bg-paper px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-2xl font-semibold">{report.totalCredits}</span>
          <span className="text-xs text-ink-soft">credits scheduled</span>
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">
          {plan.entries.length} courses · {statusCounts.completed} completed ·{" "}
          {statusCounts.in_progress} in progress · {statusCounts.planned} planned
          {statusCounts.failed > 0 && ` · ${statusCounts.failed} failed`}
        </p>
      </div>

      {errors.length === 0 && warnings.length === 0 && report.termIssues.length === 0 ? (
        <div className="rounded-md border border-met/40 bg-met-wash px-3 py-2.5 text-xs">
          <span className="font-semibold text-met">✓ No conflicts.</span>{" "}
          <span className="text-ink-soft">
            Every scheduled course has its prerequisites in earlier terms.
          </span>
        </div>
      ) : (
        <>
          {errors.length > 0 && (
            <div>
              <SectionLabel>Problems ({errors.length})</SectionLabel>
              <ul className="space-y-1.5">
                {errors.map((issue) => (
                  <li key={`${issue.entryId}-${issue.kind}`}>
                    <button
                      onClick={() => selectCourse(issue.courseId)}
                      className="w-full rounded-md border border-unmet/40 bg-unmet-wash px-2.5 py-2 text-left text-xs leading-relaxed hover:border-unmet"
                    >
                      {issue.message}
                      {issue.missingButPlannedLater && issue.missingButPlannedLater.length > 0 && (
                        <span className="mt-0.5 block text-[11px] text-ink-soft">
                          {issue.missingButPlannedLater.map(displayId).join(", ")}{" "}
                          {issue.missingButPlannedLater.length === 1 ? "is" : "are"} planned in a
                          later term — reorder to fix.
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div>
              <SectionLabel>Check yourself ({warnings.length})</SectionLabel>
              <ul className="space-y-1.5">
                {warnings.map((issue) => (
                  <li key={`${issue.entryId}-${issue.kind}`}>
                    <button
                      onClick={() => selectCourse(issue.courseId)}
                      className="w-full rounded-md border border-judge/40 bg-judge-wash px-2.5 py-2 text-left text-xs leading-relaxed hover:border-judge"
                    >
                      {issue.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.termIssues.length > 0 && (
            <div>
              <SectionLabel>Heavy terms</SectionLabel>
              <ul className="space-y-1.5">
                {report.termIssues.map((t) => (
                  <li
                    key={`${t.year}-${t.term}`}
                    className="rounded-md border border-judge/40 bg-judge-wash px-2.5 py-2 text-xs"
                  >
                    {slotLabel(t.year, t.term)}: {t.credits} credits — above the usual {t.limit}.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Degree tab ──────────────────────────────────────────────────────

function RequirementRow({
  rp,
  plan,
}: {
  rp: RequirementProgress;
  plan: Plan;
}) {
  const toggleExemption = useStore((s) => s.toggleExemption);
  const req = rp.requirement;
  const pct = rp.required > 0 ? Math.min(100, (rp.completed / rp.required) * 100) : 0;
  const unit = req.matcher.type === "breadth_categories" ? "categories" : "cr";

  return (
    <li className="border-b border-line-soft py-2.5 last:border-b-0">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 font-mono text-xs font-bold ${rp.satisfied ? "text-met" : "text-ink-faint"}`}
          aria-label={rp.satisfied ? "satisfied" : "not satisfied"}
        >
          {rp.satisfied ? "✓" : "·"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs leading-snug font-medium">{req.name}</span>
            <span className="shrink-0 font-mono text-[11px] text-ink-faint">
              {rp.completed}/{rp.required} {unit}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-well">
            <div
              className={`h-full rounded-full ${rp.satisfied ? "bg-met" : "bg-progress"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {rp.satisfyingCourseIds.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {rp.satisfyingCourseIds.slice(0, 12).map((id) => (
                <CourseChip key={id} courseId={id} plan={plan} />
              ))}
              {rp.satisfyingCourseIds.length > 12 && (
                <span className="text-[11px] text-ink-faint">
                  +{rp.satisfyingCourseIds.length - 12}
                </span>
              )}
            </div>
          )}
          {(!rp.satisfied || rp.exempted || plan.exemptions.includes(req.id)) && (
            <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-faint">
              <input
                type="checkbox"
                checked={rp.exempted || plan.exemptions.includes(req.id)}
                onChange={() => toggleExemption(req.id)}
                className="size-3 accent-navy"
              />
              Covered by transfer credit or an exception
            </label>
          )}
        </div>
      </div>
    </li>
  );
}

function DegreeTab({
  plan,
  programs,
  courseMap,
}: {
  plan: Plan;
  programs: Program[];
  courseMap: CourseMap;
}) {
  const setProgram = useStore((s) => s.setProgram);
  const program = programs.find((p) => p.id === plan.programId);

  const progress = useMemo(
    () => (program ? computeProgress(plan, program, courseMap) : null),
    [plan, program, courseMap],
  );

  if (!program || !progress) {
    return (
      <div className="px-4 py-6 text-xs leading-relaxed text-ink-soft">
        <p className="font-semibold text-ink">Track a degree</p>
        <p className="mt-2">
          Choose a program to see how your plan covers its requirements, credit by credit.
        </p>
        <div className="mt-3 space-y-1.5">
          {programs.map((p) => (
            <button
              key={p.id}
              onClick={() => setProgram(p.id)}
              className="block w-full rounded-md border border-line bg-paper px-3 py-2 text-left text-xs hover:border-navy"
            >
              <span className="font-semibold text-navy">{p.name}</span>
              <span className="mt-0.5 block text-[11px] text-ink-faint">
                {p.faculty} · {p.totalCredits} credits · {p.requirements.length} requirements
              </span>
            </button>
          ))}
        </div>
        {programs.length === 0 && <p className="mt-2">Loading programs…</p>}
      </div>
    );
  }

  const satisfied = progress.requirements.filter((r) => r.satisfied).length;

  return (
    <div className="p-4">
      <div className="rounded-md border border-line bg-paper px-3 py-2.5">
        <p className="text-[11px] font-semibold text-ink-soft">{program.name}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-semibold">{progress.creditsCounted}</span>
          <span className="text-xs text-ink-faint">
            of {progress.totalCreditsRequired} credits · {progress.percent}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-well">
          <div
            className="h-full rounded-full bg-gold-bright"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-faint">
          {satisfied} of {progress.requirements.length} requirements satisfied
        </p>
      </div>

      <ul className="mt-2">
        {progress.requirements.map((rp) => (
          <RequirementRow key={rp.requirement.id} rp={rp} plan={plan} />
        ))}
      </ul>
    </div>
  );
}

// ── Panel shell ─────────────────────────────────────────────────────

export function InsightPanel({
  plan,
  report,
  courseMap,
}: {
  plan: Plan;
  report: ValidationReport;
  courseMap: CourseMap;
}) {
  const tab = useStore((s) => s.insightTab);
  const setTab = useStore((s) => s.setInsightTab);
  const programs = useStore((s) => s.programs);

  const errorCount = report.entryIssues.filter((i) => i.severity === "error").length;

  const tabs: { id: InsightTab; label: string; badge?: number }[] = [
    { id: "course", label: "Course" },
    { id: "plan", label: "Plan", badge: errorCount },
    { id: "degree", label: "Degree" },
  ];

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex shrink-0 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 border-b-2 px-2 py-2 text-xs font-semibold transition-colors ${
              tab === t.id
                ? "border-gold-bright text-ink"
                : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className="ml-1.5 rounded-full bg-unmet px-1.5 py-px text-[10px] font-bold text-white">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "course" && <CourseTab plan={plan} courseMap={courseMap} />}
        {tab === "plan" && <PlanTab plan={plan} report={report} />}
        {tab === "degree" && <DegreeTab plan={plan} programs={programs} courseMap={courseMap} />}
      </div>
    </aside>
  );
}
