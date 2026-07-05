// Degree-requirement matching and progress. Pure functions.

import type {
  Course,
  CourseSelector,
  DegreeProgress,
  Plan,
  Program,
  RequirementMatcher,
  RequirementProgress,
} from "./types";
import { levelOf } from "./types";
import type { CourseMap } from "./validate";

/** Statuses that count toward requirements — everything except failed. */
const COUNTED = new Set(["planned", "in_progress", "completed"]);

export function matchCourses(filter: CourseSelector, courses: Course[]): Course[] {
  return courses.filter((c) => {
    if (filter.excludeIds?.includes(c.id)) return false;
    if (filter.includeIds?.includes(c.id)) return true;
    if (filter.depts?.length && !filter.depts.includes(c.dept)) return false;
    const level = levelOf(c.id);
    if (filter.minLevel != null && !(level >= filter.minLevel)) return false;
    if (filter.maxLevel != null && !(level <= filter.maxLevel)) return false;
    return true;
  });
}

interface MatcherResult {
  satisfied: boolean;
  completed: number;
  required: number;
  satisfyingIds: string[];
}

export function evaluateMatcher(
  matcher: RequirementMatcher,
  taken: Course[],
  requiredCredits: number,
  categoryExemptions?: ReadonlySet<string>,
): MatcherResult {
  switch (matcher.type) {
    case "courses_one_of": {
      const ids = new Set(matcher.courses);
      const hit = taken.find((c) => ids.has(c.id));
      return {
        satisfied: !!hit,
        completed: hit ? hit.credits : 0,
        required: requiredCredits,
        satisfyingIds: hit ? [hit.id] : [],
      };
    }
    case "courses_all_of": {
      const ids = new Set(matcher.courses);
      const hits = taken.filter((c) => ids.has(c.id));
      const have = new Set(hits.map((h) => h.id));
      return {
        satisfied: matcher.courses.every((id) => have.has(id)),
        completed: hits.reduce((s, c) => s + c.credits, 0),
        required: requiredCredits,
        satisfyingIds: hits.map((h) => h.id),
      };
    }
    case "credits_from_filter": {
      const matched = matchCourses(matcher.filter, taken);
      const credits = matched.reduce((s, c) => s + c.credits, 0);
      return {
        satisfied: credits >= matcher.minCredits,
        completed: credits,
        required: matcher.minCredits,
        satisfyingIds: matched.map((m) => m.id),
      };
    }
    case "credits_total": {
      const credits = taken.reduce((s, c) => s + c.credits, 0);
      return {
        satisfied: credits >= matcher.minCredits,
        completed: credits,
        required: matcher.minCredits,
        satisfyingIds: [],
      };
    }
    case "breadth_categories": {
      const satisfyingIds: string[] = [];
      let count = 0;
      for (const [key, filter] of Object.entries(matcher.categories)) {
        const matched = matchCourses(filter, taken);
        if (matched.length > 0) {
          count++;
          satisfyingIds.push(matched[0].id);
        } else if (categoryExemptions?.has(key)) {
          count++;
        }
      }
      return {
        satisfied: count >= matcher.minCategories,
        completed: count,
        required: matcher.minCategories,
        satisfyingIds,
      };
    }
  }
}

/**
 * Progress toward a program. Exemptions (transfer credit etc.) are plan-level
 * strings: a requirement id marks the whole requirement satisfied; a
 * `${requirementId}:${categoryKey}` marks one breadth category.
 */
export function computeProgress(plan: Plan, program: Program, courses: CourseMap): DegreeProgress {
  // Generic transfer placeholders (Course.generic) still count toward
  // degree progress — unlike prereq-checking (see validate.ts:takenBefore),
  // they're allowed to fill breadth/elective/credit-total pools. A manual
  // creditsOverride (typical for transfer credit) wins over the catalog value.
  const creditsById = new Map<string, number>();
  for (const e of plan.entries) {
    if (!COUNTED.has(e.status)) continue;
    if (e.creditsOverride != null) creditsById.set(e.courseId, e.creditsOverride);
  }
  const takenIds = new Set(
    plan.entries.filter((e) => COUNTED.has(e.status)).map((e) => e.courseId),
  );
  const taken = [...takenIds]
    .map((id) => courses.get(id))
    .filter((c): c is Course => !!c)
    .map((c) => (creditsById.has(c.id) ? { ...c, credits: creditsById.get(c.id)! } : c));

  const exemptions = new Set(plan.exemptions);
  let creditsCounted = taken.reduce((s, c) => s + c.credits, 0);

  const requirements: RequirementProgress[] = program.requirements.map((req) => {
    const categoryExemptions = new Set(
      [...exemptions]
        .filter((x) => x.startsWith(`${req.id}:`))
        .map((x) => x.slice(req.id.length + 1)),
    );
    const r = evaluateMatcher(req.matcher, taken, req.credits, categoryExemptions);

    // Whole-requirement exemption only tops up what courses didn't cover.
    const exempted = !r.satisfied && exemptions.has(req.id);
    if (exempted) creditsCounted += Math.max(0, req.credits - r.completed);

    return {
      requirement: req,
      satisfied: r.satisfied || exempted,
      completed: exempted ? r.required : r.completed,
      required: r.required,
      satisfyingCourseIds: r.satisfyingIds,
      exempted,
    };
  });

  const percent =
    program.totalCredits > 0
      ? Math.min(100, Math.round((creditsCounted / program.totalCredits) * 100))
      : 0;

  return {
    programId: program.id,
    totalCreditsRequired: program.totalCredits,
    creditsCounted,
    percent,
    requirements,
  };
}
