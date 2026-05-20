import type { Recommendation } from "../../../dataModel";
import type { RecommendationRule } from "../types";
import {
  TARGET_CREDITS_PER_YEAR,
  W_TERMS_PER_YEAR,
  getCredits,
  isSummerTerm,
  isWinterTerm,
} from "../util";

/**
 * Compares scheduled credits against the 4-year (30 cr/year) target.
 *
 * Fires one of:
 *   - pace-behind    — under target with <=4 years scheduled
 *   - pace-extended  — more than 4 years of winter terms with credits left
 *   - pace-complete  — all degree credits scheduled
 *
 * Quiet (returns []) when no programId is supplied — we have nothing to
 * compare against.
 */
export const paceRule: RecommendationRule = {
  id: "pace",
  async evaluate(ctx) {
    if (!ctx.programId) return [];

    const winterTerms = Array.from(ctx.byTerm.values()).filter(
      (list) => list.length > 0 && isWinterTerm(list[0].term),
    );
    if (winterTerms.length === 0) return [];

    const totalCredits = ctx.countedEntries
      .filter((e) => isWinterTerm(e.term) || isSummerTerm(e.term))
      .reduce((s, e) => s + getCredits(ctx.courseMap.get(e.courseId)), 0);

    const yearsScheduled = Math.ceil(winterTerms.length / W_TERMS_PER_YEAR);
    const creditsPerYear = yearsScheduled > 0 ? totalCredits / yearsScheduled : 0;

    const progress = await ctx.progress();
    const remaining = progress ? progress.totalCredits - progress.completedCredits : null;

    const recs: Recommendation[] = [];
    if (yearsScheduled <= 4 && creditsPerYear < TARGET_CREDITS_PER_YEAR && remaining != null && remaining > 0) {
      recs.push({
        id: "pace-behind",
        severity: "warning",
        title: "Off-pace for 4-year graduation",
        message: `You're averaging ${Math.round(creditsPerYear)} credits/year over ${yearsScheduled} year${yearsScheduled === 1 ? "" : "s"} — the 4-year target is ${TARGET_CREDITS_PER_YEAR}. ${remaining} credits remain.`,
      });
    } else if (yearsScheduled > 4 && remaining != null && remaining > 0) {
      recs.push({
        id: "pace-extended",
        severity: "warning",
        title: "Extended graduation timeline",
        message: `${winterTerms.length} winter terms scheduled (${yearsScheduled} years). Add summer terms or load more per term to graduate in 4.`,
      });
    } else if (remaining === 0) {
      recs.push({
        id: "pace-complete",
        severity: "info",
        title: "Plan covers full degree",
        message: `All ${progress?.totalCredits ?? ""} credits accounted for across ${yearsScheduled} year${yearsScheduled === 1 ? "" : "s"}.`,
      });
    }
    return recs;
  },
};
