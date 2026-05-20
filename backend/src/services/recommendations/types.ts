import type { CourseRow, EntryRow, Recommendation, DegreeProgress } from "../../dataModel";

/**
 * Read-only bundle passed to every recommendation rule.  Built once per
 * `generate()` call and shared so rules don't repeat work.
 *
 * For future extensibility (e.g. an LLM/RAG-backed rule that needs program
 * details, transcript history, or external knowledge): take what you need
 * as constructor deps on the rule itself.  The context is intentionally
 * narrow so it stays cheap to build and easy to reason about.
 */
export interface RecommendationContext {
  readonly planId: string;
  readonly programId?: string;
  /** Every entry on the plan, including statuses that don't count (e.g. failed). */
  readonly allEntries: EntryRow[];
  /** Entries whose status is planned, in_progress, or completed. */
  readonly countedEntries: EntryRow[];
  /** courseId → CourseRow, populated only for courses referenced by this plan. */
  readonly courseMap: Map<string, CourseRow>;
  /** termKey (e.g. "Y1-W1") → entries for that term. */
  readonly byTerm: Map<string, EntryRow[]>;
  /** Memoized degree progress lookup.  Returns null when no programId is supplied. */
  progress(): Promise<DegreeProgress | null>;
}

/**
 * Plugin contract: implement this to add new advice to the planner.
 *
 * Rules MUST be side-effect free w.r.t. the database — they only read from
 * the context.  A future RAG rule would be a class that takes a vector store
 * + LLM client in its constructor and queries them inside `evaluate()`.
 */
export interface RecommendationRule {
  /** Stable identifier; surfaces as the prefix of every Recommendation.id this rule emits. */
  readonly id: string;
  evaluate(ctx: RecommendationContext): Promise<Recommendation[]>;
}
