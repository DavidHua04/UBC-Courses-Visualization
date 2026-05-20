import { describe, it, expect, beforeEach } from "vitest";
import { ProgressService, matchCourses, evaluateMatcher } from "../progress.service";
import type {
  ICourseRepository,
  IPlanEntryRepository,
  IProgramRepository,
  CourseRow,
  EntryRow,
  Faculty,
  Program,
  RequirementMatcher,
} from "../../dataModel";

const c = (id: string, dept: string, code: string, credits = "3.0", faculty?: string): CourseRow => ({
  id,
  dept,
  code,
  title: id,
  credits,
  description: null,
  prerequisites: null,
  corequisites: [],
  termsOffered: [],
  faculty: faculty ?? null,
});

class CourseRepo implements ICourseRepository {
  constructor(public all: CourseRow[]) {}
  async findAll() { return { data: this.all, total: this.all.length }; }
  async findById(id: string) { return this.all.find((x) => x.id === id) ?? null; }
  async findByIds(ids: string[]) {
    const s = new Set(ids);
    return this.all.filter((x) => s.has(x.id));
  }
}

class EntryRepo implements IPlanEntryRepository {
  constructor(public all: EntryRow[]) {}
  async findByPlanId(planId: string) { return this.all.filter((e) => e.planId === planId); }
  async create(): Promise<any> { throw new Error("nyi"); }
  async update(): Promise<any> { return null; }
  async delete(): Promise<any> { return null; }
  async reorder() { /* nyi */ }
  async getMaxPosition() { return 0; }
}

class ProgRepo implements IProgramRepository {
  constructor(public faculties: Faculty[], public programs: Program[]) {}
  async findAllFaculties() { return this.faculties; }
  async findFacultyById(id: string) { return this.faculties.find((f) => f.id === id) ?? null; }
  async findAllPrograms() { return this.programs; }
  async findProgramById(id: string) { return this.programs.find((p) => p.id === id) ?? null; }
}

const e = (courseId: string, status = "planned", planId = "p1"): EntryRow => ({
  id: `e-${courseId}`,
  planId,
  courseId,
  year: 1,
  term: "W1",
  status,
  position: 0,
});

describe("matchCourses", () => {
  const courses = [
    c("CPSC110", "CPSC", "110"),
    c("CPSC310", "CPSC", "310"),
    c("CPSC420", "CPSC", "420"),
    c("MATH200", "MATH", "200"),
    c("STAT302", "STAT", "302"),
  ];

  it("filters by dept", () => {
    expect(matchCourses({ depts: ["CPSC"] }, courses)).toHaveLength(3);
  });

  it("filters by minLevel/maxLevel", () => {
    const r = matchCourses({ depts: ["CPSC"], minLevel: 300, maxLevel: 399 }, courses);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("CPSC310");
  });

  it("excludeIds blocks even when dept matches", () => {
    expect(matchCourses({ depts: ["MATH"], excludeIds: ["MATH200"] }, courses)).toHaveLength(0);
  });

  it("includeIds overrides dept filter", () => {
    const r = matchCourses({ depts: ["CPSC"], includeIds: ["STAT302"] }, courses);
    expect(r.map((x) => x.id).sort()).toEqual(["CPSC110", "CPSC310", "CPSC420", "STAT302"]);
  });
});

describe("evaluateMatcher", () => {
  const courses = [c("CPSC110", "CPSC", "110", "4.0"), c("CPSC121", "CPSC", "121", "4.0")];

  it("courses_one_of satisfied when any present", () => {
    const r = evaluateMatcher({ type: "courses_one_of", courses: ["CPSC110", "CPSC107"] }, courses, 4);
    expect(r.satisfied).toBe(true);
    expect(r.satisfyingIds).toEqual(["CPSC110"]);
    expect(r.completedCredits).toBe(4);
  });

  it("courses_all_of requires every entry", () => {
    const r1 = evaluateMatcher({ type: "courses_all_of", courses: ["CPSC110", "CPSC121"] }, courses, 8);
    expect(r1.satisfied).toBe(true);

    const r2 = evaluateMatcher({ type: "courses_all_of", courses: ["CPSC110", "CPSC213"] }, courses, 8);
    expect(r2.satisfied).toBe(false);
  });

  it("credits_from_filter sums matched credits", () => {
    const r = evaluateMatcher(
      { type: "credits_from_filter", minCredits: 6, filter: { depts: ["CPSC"] } },
      courses,
      6,
    );
    expect(r.satisfied).toBe(true);
    expect(r.completedCredits).toBe(8);
  });

  it("breadth_categories counts satisfied categories", () => {
    const m: RequirementMatcher = {
      type: "breadth_categories",
      minCategories: 2,
      categories: {
        cs: { depts: ["CPSC"] },
        math: { depts: ["MATH"] },
        chem: { depts: ["CHEM"] },
      },
    };
    const r = evaluateMatcher(m, courses, 2);
    expect(r.satisfied).toBe(false);
    expect(r.completedCredits).toBe(1);
  });
});

describe("ProgressService.compute", () => {
  let svc: ProgressService;

  beforeEach(() => {
    const courseRepo = new CourseRepo([
      c("CPSC110", "CPSC", "110", "4.0"),
      c("CPSC121", "CPSC", "121", "4.0"),
      c("CPSC210", "CPSC", "210", "4.0"),
      c("MATH100", "MATH", "100", "3.0"),
    ]);
    const entryRepo = new EntryRepo([
      e("CPSC110", "completed"),
      e("CPSC121", "in_progress"),
      e("CPSC210", "planned"),
      e("MATH100", "failed"),
    ]);
    const progRepo = new ProgRepo(
      [{ id: "science", name: "Science", requirements: [] }],
      [{
        id: "cs",
        name: "CS",
        facultyId: "science",
        totalCredits: 120,
        requirements: [
          {
            id: "cpsc-110",
            name: "CPSC 110",
            type: "required",
            credits: 4,
            matcher: { type: "courses_one_of", courses: ["CPSC110"] },
          },
          {
            id: "cpsc-credits",
            name: "9 credits CPSC 100+",
            type: "elective",
            credits: 9,
            matcher: { type: "credits_from_filter", minCredits: 9, filter: { depts: ["CPSC"] } },
          },
        ],
      }],
    );
    svc = new ProgressService(entryRepo, courseRepo, progRepo);
  });

  it("returns null when program not found", async () => {
    expect(await svc.compute("p1", "nope")).toBeNull();
  });

  it("excludes failed entries from credit totals", async () => {
    const r = await svc.compute("p1", "cs");
    // Counted: CPSC110 (4) + CPSC121 (4) + CPSC210 (4) = 12.  MATH100 failed -> excluded.
    expect(r!.completedCredits).toBe(12);
  });

  it("evaluates each requirement", async () => {
    const r = await svc.compute("p1", "cs");
    const cpsc110 = r!.requirements.find((x) => x.requirementId === "cpsc-110")!;
    expect(cpsc110.satisfied).toBe(true);
    const credits = r!.requirements.find((x) => x.requirementId === "cpsc-credits")!;
    expect(credits.satisfied).toBe(true);
    expect(credits.completedCredits).toBe(12);
  });
});
