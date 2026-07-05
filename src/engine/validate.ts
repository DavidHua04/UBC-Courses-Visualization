// Whole-plan validation and single-course eligibility. Pure functions:
// the caller supplies full Course records for every course involved.

import type {
  Course,
  Eligibility,
  EntryIssue,
  Plan,
  PlanEntry,
  Term,
  TermIssue,
  ValidationReport,
} from "./types";
import { compareSlots, displayId, termKey } from "./types";
import { collectMissing, describeRule, evaluateRule, type TakenMap } from "./prereq";

export const CREDIT_LIMIT_WINTER = 18;
export const CREDIT_LIMIT_SUMMER = 9;

export type CourseMap = ReadonlyMap<string, Course>;

/** Entries sorted chronologically; failed courses don't count as taken. */
function sortedEntries(plan: Plan): PlanEntry[] {
  return [...plan.entries].sort((a, b) => compareSlots(a.year, a.term, b.year, b.term));
}

/**
 * Courses taken strictly before (year, term), as courseId → credits.
 * Anything scheduled and not failed is assumed passed — planning is
 * about the future, so "planned" counts the same as "completed".
 *
 * Generic transfer/prior-credit placeholders (Course.generic) are excluded:
 * they stand for an unspecified course at a dept+year level, so they can't
 * satisfy a prerequisite that names a specific course or credit pool.
 */
export function takenBefore(plan: Plan, year: number, term: Term, courses: CourseMap): TakenMap {
  const taken = new Map<string, number>();
  for (const e of plan.entries) {
    if (e.status === "failed") continue;
    const course = courses.get(e.courseId);
    if (course?.generic) continue;
    if (compareSlots(e.year, e.term, year, term) < 0) {
      taken.set(e.courseId, e.creditsOverride ?? course?.credits ?? 3);
    }
  }
  return taken;
}

/** Is `courseId` scheduled in the same slot or earlier (and not failed)? */
function takenByEndOf(plan: Plan, courseId: string, year: number, term: Term): boolean {
  return plan.entries.some(
    (e) =>
      e.courseId === courseId &&
      e.status !== "failed" &&
      compareSlots(e.year, e.term, year, term) <= 0,
  );
}

export function validatePlan(plan: Plan, courses: CourseMap): ValidationReport {
  const entryIssues: EntryIssue[] = [];
  const termIssues: TermIssue[] = [];
  const termCredits: Record<string, number> = {};
  let totalCredits = 0;

  const entries = sortedEntries(plan);
  const seen = new Map<string, PlanEntry>(); // courseId → first occurrence

  for (const entry of entries) {
    const course = courses.get(entry.courseId);

    if (!course) {
      entryIssues.push({
        kind: "unknown_course",
        severity: "error",
        entryId: entry.id,
        courseId: entry.courseId,
        message: `${displayId(entry.courseId)} is not in the catalog.`,
      });
      continue;
    }

    const credits = entry.creditsOverride ?? course.credits;
    const key = termKey(entry.year, entry.term);
    termCredits[key] = (termCredits[key] ?? 0) + credits;
    if (entry.status !== "failed") totalCredits += credits;

    const first = seen.get(entry.courseId);
    if (first && first.status !== "failed") {
      entryIssues.push({
        kind: "duplicate_course",
        severity: "error",
        entryId: entry.id,
        courseId: entry.courseId,
        message: `${displayId(entry.courseId)} is already planned in year ${first.year} ${first.term}.`,
      });
      continue;
    }
    seen.set(entry.courseId, entry);

    // Completed/failed entries are history — prerequisites were already
    // enforced by the registrar; re-checking would only produce noise.
    const isFuture = entry.status === "planned" || entry.status === "in_progress";
    if (!isFuture) continue;

    if (course.prereq) {
      const taken = takenBefore(plan, entry.year, entry.term, courses);
      const ev = evaluateRule(course.prereq, taken);
      if (ev.status === "unmet") {
        const missing = collectMissing(ev);
        const plannedLater: string[] = [];
        const absent: string[] = [];
        for (const id of missing) {
          const inPlan = plan.entries.some((e) => e.courseId === id && e.status !== "failed");
          (inPlan ? plannedLater : absent).push(id);
        }
        entryIssues.push({
          kind: "prereq_unmet",
          severity: "error",
          entryId: entry.id,
          courseId: entry.courseId,
          message: `${displayId(entry.courseId)} needs ${describeRule(course.prereq)}.`,
          ruleEval: ev,
          missingButPlannedLater: plannedLater,
          missingEntirely: absent,
        });
      }
    } else if (course.prereqText) {
      entryIssues.push({
        kind: "prereq_unknown",
        severity: "warning",
        entryId: entry.id,
        courseId: entry.courseId,
        message: `${displayId(entry.courseId)} has a prerequisite that needs your judgment: “${course.prereqText}”`,
      });
    }

    for (const coreqId of course.coreq) {
      if (!takenByEndOf(plan, coreqId, entry.year, entry.term)) {
        entryIssues.push({
          kind: "coreq_missing",
          severity: "error",
          entryId: entry.id,
          courseId: entry.courseId,
          message: `${displayId(entry.courseId)} requires ${displayId(coreqId)} in the same term or earlier.`,
        });
      }
    }
  }

  for (const [key, credits] of Object.entries(termCredits)) {
    const [yearStr, term] = key.split(":") as [string, Term];
    if (term === "TR") continue; // transfer credit has no per-term load limit
    const limit = term === "S" ? CREDIT_LIMIT_SUMMER : CREDIT_LIMIT_WINTER;
    if (credits > limit) {
      termIssues.push({
        kind: "term_overload",
        year: Number(yearStr),
        term,
        credits,
        limit,
        message: `Year ${yearStr} ${term} has ${credits} credits — over the usual ${limit}-credit load.`,
      });
    }
  }

  return {
    ok: !entryIssues.some((i) => i.severity === "error"),
    entryIssues,
    termIssues,
    termCredits,
    totalCredits,
  };
}

/**
 * Could `course` be taken at (year, term) given the rest of the plan?
 * Drives the live badges on search results and course cards.
 */
export function checkEligibility(
  course: Course,
  year: number,
  term: Term,
  plan: Plan,
  courses: CourseMap,
): Eligibility {
  const existing = plan.entries.find(
    (e) => e.courseId === course.id && e.status !== "failed",
  );
  if (existing) {
    return { kind: "already_planned", year: existing.year, term: existing.term };
  }

  if (!course.prereq) {
    return course.prereqText
      ? { kind: "unknown", prereqText: course.prereqText }
      : { kind: "no_prereq" };
  }

  const ev = evaluateRule(course.prereq, takenBefore(plan, year, term, courses));
  return ev.status === "met"
    ? { kind: "eligible" }
    : { kind: "ineligible", ruleEval: ev, missing: collectMissing(ev) };
}
