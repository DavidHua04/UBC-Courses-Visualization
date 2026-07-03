// Shared builders for engine tests.

import type { Course, Plan, PlanEntry, PrereqRule, Term, EntryStatus } from "./types";
import { deptOf } from "./types";

export function course(id: string, overrides: Partial<Course> = {}): Course {
  return {
    id,
    dept: deptOf(id),
    number: id.replace(/^[A-Z]+/, ""),
    title: `Title of ${id}`,
    credits: 3,
    description: "",
    prereq: null,
    prereqText: null,
    coreq: [],
    coreqText: null,
    unlocks: [],
    ...overrides,
  };
}

export function courseMap(...courses: Course[]): Map<string, Course> {
  return new Map(courses.map((c) => [c.id, c]));
}

let nextEntry = 0;

export function entry(
  courseId: string,
  year: number,
  term: Term,
  status: EntryStatus = "planned",
): PlanEntry {
  return { id: `e${++nextEntry}`, courseId, year, term, status };
}

export function plan(entries: PlanEntry[], overrides: Partial<Plan> = {}): Plan {
  return {
    id: "p1",
    name: "Test Plan",
    programId: null,
    years: 4,
    entries,
    exemptions: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export const one_of = (...rules: PrereqRule[]): PrereqRule => ({ type: "one_of", rules });
export const all_of = (...rules: PrereqRule[]): PrereqRule => ({ type: "all_of", rules });
export const req = (courseId: string): PrereqRule => ({ type: "course", courseId });
