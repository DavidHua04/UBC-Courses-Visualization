import type { CourseRow, EntryRow } from "../../dataModel";

export const COUNTED_STATUSES = new Set(["planned", "in_progress", "completed"]);
export const TARGET_CREDITS_PER_YEAR = 30;
export const W_TERMS_PER_YEAR = 2;
export const MIN_COURSES_PER_W_TERM = 4;
export const MAX_COURSES_PER_W_TERM = 5;

export function termKey(e: EntryRow): string {
  return `Y${e.year}-${e.term}`;
}

export function isWinterTerm(term: string): boolean {
  return term === "W1" || term === "W2";
}

export function isSummerTerm(term: string): boolean {
  return term === "S" || term.startsWith("S");
}

export function getCredits(course: CourseRow | undefined): number {
  if (!course) return 0;
  const n = parseFloat(course.credits);
  return Number.isFinite(n) ? n : 0;
}
