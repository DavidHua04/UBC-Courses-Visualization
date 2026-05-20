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
 * Ported from the reference's AIRecommendations.tsx: when the plan is
 * off-pace for a 4-year finish, has >12 credits remaining, and uses no
 * summer terms yet, suggest adding one.  Stays quiet otherwise.
 */
export const addSummerSemesterRule: RecommendationRule = {
  id: "add-summer-semester",
  async evaluate(ctx) {
    if (!ctx.programId) return [];

    const progress = await ctx.progress();
    if (!progress) return [];
    const remaining = progress.totalCredits - progress.completedCredits;
    if (remaining <= 12) return [];

    const hasSummer = Array.from(ctx.byTerm.values()).some(
      (list) => list.length > 0 && isSummerTerm(list[0].term),
    );
    if (hasSummer) return [];

    const winterTerms = Array.from(ctx.byTerm.values()).filter(
      (list) => list.length > 0 && isWinterTerm(list[0].term),
    );
    if (winterTerms.length === 0) return [];

    const totalCredits = ctx.countedEntries
      .filter((e) => isWinterTerm(e.term) || isSummerTerm(e.term))
      .reduce((s, e) => s + getCredits(ctx.courseMap.get(e.courseId)), 0);
    const yearsScheduled = Math.ceil(winterTerms.length / W_TERMS_PER_YEAR);
    const creditsPerYear = yearsScheduled > 0 ? totalCredits / yearsScheduled : 0;

    if (creditsPerYear >= TARGET_CREDITS_PER_YEAR) return [];

    const rec: Recommendation = {
      id: "add-summer-semester",
      severity: "suggestion",
      title: "Consider adding a summer term",
      message: `${remaining} credits remain and you're averaging ${Math.round(creditsPerYear)} cr/year. Adding a summer term can help close the gap.`,
    };
    return [rec];
  },
};
