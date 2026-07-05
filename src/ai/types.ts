// AI advisor domain types. Plain data, no I/O — the provider interface is
// the only seam that touches the network, and MockProvider doesn't even that.

export type ProviderKind = "mock" | "openai-compat" | "anthropic";

export interface ProviderSettings {
  provider: ProviderKind;
  /** Server root for openai-compat, e.g. "http://localhost:11434". */
  baseUrl: string;
  /** Optional — Ollama/llama.cpp usually run keyless. */
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** One eligible-next course offered to the model as a recommendation option. */
export interface CandidateCourse {
  courseId: string;
  title: string;
  credits: number;
  /** "eligible" = prereqs met at the next open slot; "no_prereq" = none at all. */
  eligible: "eligible" | "no_prereq";
  unlockCount: number;
  /** Names of unmet degree requirements this course can help fill. */
  fills: string[];
  score: number;
}

/** Structured grounding for one advisor turn. MockProvider consumes this
 *  directly; remote providers see its serialized text form. */
export interface AdvisorContext {
  goal: string;
  targetYears?: number;
  interests: string[];
  programName: string | null;
  progress: { creditsCounted: number; totalRequired: number; percent: number } | null;
  planYears: number;
  termLoads: { slot: string; credits: number }[];
  unmetRequirements: { name: string; completed: number; required: number; unit: string }[];
  /** Completed + in-progress courses (history). */
  taken: { courseId: string; credits: number }[];
  /** Future (planned) courses, chronological. */
  plannedByTerm: { slot: string; courseIds: string[] }[];
  issues: string[];
  candidates: CandidateCourse[];
}

export interface AdvisorRequest {
  /** Serialized context + output-format instructions (system prompt). */
  system: string;
  /** Trimmed conversation history, oldest first, ending with the new user turn. */
  messages: ChatMessage[];
  /** Structured form of the same context — used by MockProvider and tests. */
  context: AdvisorContext;
}

export interface AdvisorReply {
  text: string;
}

export interface AdvisorProvider {
  readonly kind: ProviderKind;
  send(
    req: AdvisorRequest,
    opts?: { signal?: AbortSignal; onDelta?: (text: string) => void },
  ): Promise<AdvisorReply>;
}
