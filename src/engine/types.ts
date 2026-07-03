// Core domain types. Everything here is plain data — serializable, no classes.

// ── Prerequisite rule tree ──────────────────────────────────────────
// Parsed from calendar prose at build time. `min_credits.from` is a course
// pool ("9 credits of CPSC…"); when absent, any credits count.

export type PrereqRule =
  | { type: "course"; courseId: string }
  | { type: "all_of"; rules: PrereqRule[] }
  | { type: "one_of"; rules: PrereqRule[]; minCount?: number }
  | { type: "min_credits"; minCredits: number; from?: string[] };

// ── Catalog ─────────────────────────────────────────────────────────

/** Full course record, shipped in per-department chunks. */
export interface Course {
  id: string; // "CPSC210"
  dept: string; // "CPSC"
  number: string; // "210", "310A"
  title: string;
  credits: number;
  description: string;
  /** Parsed prerequisite tree, when the prose was parseable. */
  prereq: PrereqRule | null;
  /** Original prerequisite prose, kept for display and as fallback when unparsed. */
  prereqText: string | null;
  /** Corequisite course ids (must be taken before or concurrently). */
  coreq: string[];
  coreqText: string | null;
  /** Courses whose prerequisites reference this course (reverse edges). */
  unlocks: string[];
}

/**
 * Compact search-index record, loaded upfront for all courses.
 * Tuple keeps the index small: [id, title, credits, hasPrereq, unlockCount].
 */
export type CourseLite = [string, string, number, 0 | 1, number];

export const liteId = (c: CourseLite) => c[0];
export const liteTitle = (c: CourseLite) => c[1];
export const liteCredits = (c: CourseLite) => c[2];
export const liteHasPrereq = (c: CourseLite) => c[3] === 1;
export const liteUnlockCount = (c: CourseLite) => c[4];

/** "CPSC210" → "CPSC" (letters prefix). */
export function deptOf(courseId: string): string {
  const m = courseId.match(/^[A-Z]+/);
  return m ? m[0] : courseId;
}

/** "CPSC210" → 210; NaN if no digits. */
export function levelOf(courseId: string): number {
  const m = courseId.match(/(\d{3,4})/);
  return m ? parseInt(m[1], 10) : NaN;
}

/** "CPSC210" → "CPSC 210" for display. */
export function displayId(courseId: string): string {
  const m = courseId.match(/^([A-Z]+)(\d.*)$/);
  return m ? `${m[1]} ${m[2]}` : courseId;
}

// ── Plans ───────────────────────────────────────────────────────────

export type Term = "W1" | "W2" | "S";
export const TERMS: Term[] = ["W1", "W2", "S"];
export const TERM_LABELS: Record<Term, string> = {
  W1: "Winter 1",
  W2: "Winter 2",
  S: "Summer",
};

export type EntryStatus = "planned" | "in_progress" | "completed" | "failed";

export interface PlanEntry {
  id: string;
  courseId: string;
  year: number; // 1-based plan year
  term: Term;
  status: EntryStatus;
}

export interface Plan {
  id: string;
  name: string;
  programId: string | null;
  years: number; // how many year rows the board shows
  entries: PlanEntry[];
  /** Requirement ids (or `${reqId}:${categoryKey}`) satisfied externally, e.g. transfer credit. */
  exemptions: string[];
  createdAt: string;
  updatedAt: string;
}

export type TermKey = `${number}:${Term}`;
export const termKey = (year: number, term: Term): TermKey => `${year}:${term}`;

const TERM_ORDER: Record<Term, number> = { W1: 0, W2: 1, S: 2 };

/** Chronological comparison of (year, term) slots. */
export function compareSlots(aYear: number, aTerm: Term, bYear: number, bTerm: Term): number {
  return aYear !== bYear ? aYear - bYear : TERM_ORDER[aTerm] - TERM_ORDER[bTerm];
}

// ── Programs / degree requirements ──────────────────────────────────

export interface CourseSelector {
  depts?: string[];
  minLevel?: number;
  maxLevel?: number;
  includeIds?: string[];
  excludeIds?: string[];
}

export type RequirementMatcher =
  | { type: "courses_one_of"; courses: string[] }
  | { type: "courses_all_of"; courses: string[] }
  | { type: "credits_from_filter"; minCredits: number; filter: CourseSelector }
  | { type: "credits_total"; minCredits: number }
  | {
      type: "breadth_categories";
      minCategories: number;
      categories: Record<string, CourseSelector>;
    };

export type RequirementType =
  | "required"
  | "elective"
  | "breadth"
  | "communication"
  | "lab"
  | "foundational";

export interface DegreeRequirement {
  id: string;
  name: string;
  type: RequirementType;
  credits: number;
  matcher: RequirementMatcher;
  description?: string;
}

export interface Program {
  id: string;
  name: string;
  faculty: string;
  totalCredits: number;
  description?: string;
  requirements: DegreeRequirement[];
}

// ── Engine results ──────────────────────────────────────────────────

export type RuleStatus = "met" | "unmet";

/** A prereq rule annotated with its evaluation, mirroring the rule tree shape. */
export interface RuleEval {
  rule: PrereqRule;
  status: RuleStatus;
  children?: RuleEval[];
  /** For min_credits leaves: credits counted toward the threshold. */
  creditsCounted?: number;
}

export type IssueKind =
  | "prereq_unmet"
  | "prereq_unknown" // prose exists but was not machine-readable; needs human judgment
  | "coreq_missing"
  | "duplicate_course"
  | "term_overload";

export interface EntryIssue {
  kind: Exclude<IssueKind, "term_overload">;
  entryId: string;
  courseId: string;
  message: string;
  /** Full annotated rule tree, for the insight panel. */
  ruleEval?: RuleEval;
  /** Missing course ids that appear later in the plan (ordering problem). */
  missingButPlannedLater?: string[];
  /** Missing course ids absent from the plan entirely. */
  missingEntirely?: string[];
}

export interface TermIssue {
  kind: "term_overload";
  year: number;
  term: Term;
  credits: number;
  limit: number;
  message: string;
}

export interface ValidationReport {
  ok: boolean;
  entryIssues: EntryIssue[];
  termIssues: TermIssue[];
  /** Credits scheduled per term slot. */
  termCredits: Record<string, number>;
  totalCredits: number;
}

export type Eligibility =
  | { kind: "eligible" }
  | { kind: "no_prereq" }
  | { kind: "ineligible"; ruleEval: RuleEval; missing: string[] }
  | { kind: "unknown"; prereqText: string }
  | { kind: "already_planned"; year: number; term: Term };

export interface RequirementProgress {
  requirement: DegreeRequirement;
  satisfied: boolean;
  /** Progress toward the matcher's own unit (credits or categories). */
  completed: number;
  required: number;
  satisfyingCourseIds: string[];
  exempted: boolean;
}

export interface DegreeProgress {
  programId: string;
  totalCreditsRequired: number;
  creditsCounted: number;
  percent: number;
  requirements: RequirementProgress[];
}
