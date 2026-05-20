import type { Recommendation } from "../../../dataModel";
import type { RecommendationRule } from "../types";
import {
  COUNTED_STATUSES,
  MAX_COURSES_PER_W_TERM,
  MIN_COURSES_PER_W_TERM,
  isWinterTerm,
} from "../util";

/**
 * Flags winter terms that are too light (<4 courses) or too heavy (>5).
 * Summer terms are ignored — students load them differently by design.
 */
export const courseLoadRule: RecommendationRule = {
  id: "course-load",
  async evaluate(ctx) {
    const recs: Recommendation[] = [];
    for (const [key, list] of ctx.byTerm) {
      const term = list[0].term;
      if (!isWinterTerm(term)) continue;
      const counted = list.filter((e) => COUNTED_STATUSES.has(e.status));
      if (counted.length === 0) continue;

      if (counted.length < MIN_COURSES_PER_W_TERM) {
        recs.push({
          id: `light-load-${key}`,
          severity: "suggestion",
          title: `Light course load in ${key}`,
          message: `Only ${counted.length} course${counted.length === 1 ? "" : "s"} scheduled. Most students take ${MIN_COURSES_PER_W_TERM}-${MAX_COURSES_PER_W_TERM} per winter term to graduate in 4 years.`,
          context: { termKey: key, courseIds: counted.map((e) => e.courseId) },
        });
      } else if (counted.length > MAX_COURSES_PER_W_TERM) {
        recs.push({
          id: `heavy-load-${key}`,
          severity: "warning",
          title: `Heavy course load in ${key}`,
          message: `${counted.length} courses scheduled. ${MAX_COURSES_PER_W_TERM}+ courses per term is uncommon and may risk academic performance.`,
          context: { termKey: key, courseIds: counted.map((e) => e.courseId) },
        });
      }
    }
    return recs;
  },
};
