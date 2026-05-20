import type { Recommendation } from "../../../dataModel";
import type { RecommendationRule } from "../types";

/** Highlights up to three unsatisfied degree requirements. */
export const unmetRequirementsRule: RecommendationRule = {
  id: "unmet-requirements",
  async evaluate(ctx) {
    if (!ctx.programId) return [];
    const progress = await ctx.progress();
    if (!progress) return [];

    const unsatisfied = progress.requirements.filter((r) => !r.satisfied);
    const topThree = unsatisfied.slice(0, 3);
    if (topThree.length === 0) return [];

    const rec: Recommendation = {
      id: "unmet-requirements",
      severity: "info",
      title: `${unsatisfied.length} requirement${unsatisfied.length === 1 ? "" : "s"} still unmet`,
      message: topThree.map((r) => `• ${r.requirementName}`).join("\n"),
      context: { requirementIds: topThree.map((r) => r.requirementId) },
    };
    return [rec];
  },
};
