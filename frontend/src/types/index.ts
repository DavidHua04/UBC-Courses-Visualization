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
