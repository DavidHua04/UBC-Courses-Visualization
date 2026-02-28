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
  corequisites: string[];
  termsOffered: string[];
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
