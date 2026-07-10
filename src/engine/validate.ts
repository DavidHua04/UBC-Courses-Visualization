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
 * Taken map over the entries selected by `included`. Anything scheduled and
 * not failed is assumed passed — planning is about the future, so "planned"
 * counts the same as "completed".
 *
 * Generic transfer/prior-credit placeholders (Course.generic) are excluded:
 * they stand for an unspecified course at a dept+year level, so they can't
 * satisfy a prerequisite that names a specific course or credit pool.
 *
 * Declared equivalents of each taken course are aliased in at 0 credits:
 * they satisfy `course` leaves in rule trees (AFST 256 satisfies a rule
 * naming HIST 256) but never add to min_credits pools — the student earns
 * those credits only once.
 */
function buildTaken(
  plan: Plan,
  courses: CourseMap,
  included: (e: PlanEntry) => boolean,
): TakenMap {
  const taken = new Map<string, number>();
  const aliases = new Set<string>();
  for (const e of plan.entries) {
    if (e.status === "failed") continue;
    const course = courses.get(e.courseId);
    if (course?.generic) continue;
    if (!included(e)) continue;
    taken.set(e.courseId, e.creditsOverride ?? course?.credits ?? 3);
    for (const id of course?.equiv ?? []) aliases.add(id);
  }
  for (const id of aliases) {
    if (!taken.has(id)) taken.set(id, 0);
  }
  return taken;
}

/** Courses taken strictly before (year, term), as courseId → credits. */
export function takenBefore(plan: Plan, year: number, term: Term, courses: CourseMap): TakenMap {
  return buildTaken(plan, courses, (e) => compareSlots(e.year, e.term, year, term) < 0);
}

/** Courses taken in the same term or earlier — the corequisite horizon. */
export function takenThrough(plan: Plan, year: number, term: Term, courses: CourseMap): TakenMap {
  return buildTaken(plan, courses, (e) => compareSlots(e.year, e.term, year, term) <= 0);
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

    // Equivalent pairs both earn credit only once — worth a warning even
    // for history, since the registrar allows taking both.
    for (const eqId of course.equiv) {
      const eqEntry = seen.get(eqId);
      if (eqEntry && eqEntry.status !== "failed") {
        entryIssues.push({
          kind: "equivalent_course",
          severity: "warning",
          entryId: entry.id,
          courseId: entry.courseId,
          message: `${displayId(entry.courseId)} and ${displayId(eqId)} are equivalent — credit will be granted for only one of them.`,
        });
      }
    }

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

    if (course.coreq) {
      const ev = evaluateRule(course.coreq, takenThrough(plan, entry.year, entry.term, courses));
      if (ev.status === "unmet") {
        entryIssues.push({
          kind: "coreq_missing",
          severity: "error",
          entryId: entry.id,
          courseId: entry.courseId,
          message: `${displayId(entry.courseId)} requires ${describeRule(course.coreq)} in the same term or earlier.`,
          ruleEval: ev,
        });
      }
    } else if (course.coreqText) {
      entryIssues.push({
        kind: "coreq_unknown",
        severity: "warning",
        entryId: entry.id,
        courseId: entry.courseId,
        message: `${displayId(entry.courseId)} has a corequisite that needs your judgment: “${course.coreqText}”`,
      });
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
