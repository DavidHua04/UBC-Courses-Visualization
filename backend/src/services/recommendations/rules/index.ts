import type { RecommendationRule } from "../types";
import { courseLoadRule } from "./courseLoad";
import { emptyTermsRule } from "./emptyTerms";
import { paceRule } from "./pace";
import { addSummerSemesterRule } from "./addSummerSemester";
import { unmetRequirementsRule } from "./unmetRequirements";

/**
 * The default rule set fired by `RecommendationsService` when no custom
 * `rules` array is passed to the constructor.  Order is loosely thematic:
 * load → schedule shape → pace → unmet requirements.  Adding a new rule
 * is as simple as appending to this array (or constructing the service
 * with an extended set, e.g. `[...defaultRules, myLLMRule]`).
 */
export const defaultRules: RecommendationRule[] = [
  courseLoadRule,
  emptyTermsRule,
  paceRule,
  addSummerSemesterRule,
  unmetRequirementsRule,
];

export {
  courseLoadRule,
  emptyTermsRule,
  paceRule,
  addSummerSemesterRule,
  unmetRequirementsRule,
};
