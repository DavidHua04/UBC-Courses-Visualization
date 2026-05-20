import type { Recommendation } from "../../../dataModel";
import type { RecommendationRule } from "../types";
import { COUNTED_STATUSES } from "../util";

/**
 * Surfaces terms in the plan that have no counted entries (e.g. only failed
 * courses, or no entries at all) when the plan has multiple terms overall.
 */
export const emptyTermsRule: RecommendationRule = {
  id: "empty-terms",
  async evaluate(ctx) {
    const emptyTerms = Array.from(ctx.byTerm.entries())
      .filter(([, list]) => list.every((e) => !COUNTED_STATUSES.has(e.status)))
      .map(([k]) => k);

    if (emptyTerms.length === 0 || ctx.byTerm.size <= 1) return [];

    const rec: Recommendation = {
      id: "empty-terms",
      severity: "suggestion",
      title: "Empty terms in plan",
      message: `${emptyTerms.length} term${emptyTerms.length === 1 ? "" : "s"} (${emptyTerms.join(", ")}) have no courses. Consider planning courses there or removing the term.`,
      context: { termKey: emptyTerms[0] },
    };
    return [rec];
  },
};
