// Prerequisite logic tree stored in courses.prerequisites JSONB
export type PrerequisiteRule =
  | { type: "course"; courseId: string; minGrade?: number }
  | { type: "all_of"; rules: PrerequisiteRule[] }
  | { type: "one_of"; rules: PrerequisiteRule[]; minCount?: number }
  | { type: "min_credits"; minCredits: number; from?: string[] };

// HTTP request/response shapes for API
export interface CourseRow {
  id: string;
  dept: string;
  code: string;
  title: string;
  credits: string;
  description: string | null;
  prerequisites: PrerequisiteRule | null;
  prerequisitesRaw?: string | null;
  corequisites: string[];
  corequisitesRaw?: string | null;
  termsOffered: string[];
  faculty?: string | null;
}

export interface PlanRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntryRow {
  id: string;
  planId: string;
  courseId: string;
  year: number;
  term: string;
  status: string;
  position: number;
}

// Grouped plan view returned by GET /plans/:id
export interface PlanWithEntries extends PlanRow {
  entries: Record<string, Record<string, EntryRow[]>>; // [year][term] → entries
}

// Validation result cached in Redis
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  computedAt: string;
}

export interface ValidationError {
  entryId: string;
  courseId: string;
  message: string;
}

export interface ValidationWarning {
  entryId: string;
  courseId: string;
  message: string;
}

// API error standard shape
export interface ApiError {
  error: string;
  message?: string;
  fields?: Record<string, string>;
}

// ── Program / Degree-requirement domain ────────────────────────────
//
// A Program models a UBC degree (e.g. "Major (0376): Computer Science")
// and owns an ordered list of DegreeRequirements.  Each requirement
// declares a structured RequirementMatcher describing exactly which
// courses satisfy it.  This is intentionally NOT a free-text parse:
// matchers are data, so progress checks are deterministic and testable.

export interface CourseFilter {
  depts?: string[];
  minLevel?: number;
  maxLevel?: number;
  facultyId?: string;
  includeIds?: string[];
  excludeIds?: string[];
}

export type RequirementMatcher =
  | { type: "courses_one_of"; courses: string[] }
  | { type: "courses_all_of"; courses: string[] }
  | { type: "credits_from_filter"; minCredits: number; filter: CourseFilter }
  | { type: "credits_total"; minCredits: number }
  | {
      type: "breadth_categories";
      minCategories: number;
      categories: Record<string, CourseFilter>;
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

export interface Faculty {
  id: string;
  name: string;
  requirements?: DegreeRequirement[];
}

export interface Program {
  id: string;
  name: string;
  facultyId: string;
  totalCredits: number;
  description?: string;
  requirements: DegreeRequirement[];
}

// Returned by GET /api/v1/plans/:id/progress?programId=X
export interface RequirementProgress {
  requirementId: string;
  requirementName: string;
  requirementType: RequirementType;
  completedCredits: number;
  requiredCredits: number;
  satisfied: boolean;
  satisfyingCourseIds: string[];
}

export interface DegreeProgress {
  programId: string;
  totalCredits: number;
  completedCredits: number;
  percent: number;
  requirements: RequirementProgress[];
}

export type RecommendationSeverity = "info" | "suggestion" | "warning";

export interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  message: string;
  context?: {
    termKey?: string;
    courseIds?: string[];
    requirementIds?: string[];
  };
}
