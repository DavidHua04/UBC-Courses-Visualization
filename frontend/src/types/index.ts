export interface CourseRow {
  id: string;
  dept: string;
  code: string;
  title: string;
  credits: string;
  description: string | null;
  prerequisites: unknown;
  corequisites: string[];
  termsOffered: string[];
}

export interface PlanSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  entryCount: number;
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

export interface PlanWithEntries {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  entries: Record<string, Record<string, EntryRow[]>>; // [year][term] → entries
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

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  computedAt: string;
  cached: boolean;
}

export const TERMS = ['W1', 'W2', 'S'] as const;
export type Term = typeof TERMS[number];

export const TERM_LABELS: Record<string, string> = {
  W1: 'Winter 1',
  W2: 'Winter 2',
  S: 'Summer',
};

export const STATUS_OPTIONS = ['planned', 'in_progress', 'completed', 'failed'] as const;
export type EntryStatus = typeof STATUS_OPTIONS[number];

export const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  failed: 'Failed',
};

export interface AcademicGoal {
  id: string;
  name: string;
  satisfied: boolean;
}

// ── Program / progress / recommendations (backend domain) ────────

export interface CourseFilter {
  depts?: string[];
  minLevel?: number;
  maxLevel?: number;
  facultyId?: string;
  includeIds?: string[];
  excludeIds?: string[];
}

export type RequirementMatcher =
  | { type: 'courses_one_of'; courses: string[] }
  | { type: 'courses_all_of'; courses: string[] }
  | { type: 'credits_from_filter'; minCredits: number; filter: CourseFilter }
  | { type: 'credits_total'; minCredits: number }
  | { type: 'breadth_categories'; minCategories: number; categories: Record<string, CourseFilter> };

export type RequirementType =
  | 'required'
  | 'elective'
  | 'breadth'
  | 'communication'
  | 'lab'
  | 'foundational';

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

export type RecommendationSeverity = 'info' | 'suggestion' | 'warning';

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
