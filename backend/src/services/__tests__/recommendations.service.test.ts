import { describe, it, expect } from "vitest";
import { RecommendationsService } from "../recommendations.service";
import { ProgressService } from "../progress.service";
import type {
  ICourseRepository,
  IPlanEntryRepository,
  IProgramRepository,
} from "../../repositories/interfaces";
import type { CourseRow, EntryRow, Faculty, Program } from "../../models/types";

const c = (id: string, dept: string, code: string, credits = "3.0"): CourseRow => ({
  id, dept, code, title: id, credits, description: null, prerequisites: null,
  corequisites: [], termsOffered: [],
});

class CourseRepo implements ICourseRepository {
  constructor(public all: CourseRow[]) {}
  async findAll() { return { data: this.all, total: this.all.length }; }
  async findById(id: string) { return this.all.find((x) => x.id === id) ?? null; }
  async findByIds(ids: string[]) { const s = new Set(ids); return this.all.filter((x) => s.has(x.id)); }
  async seedAll() { return this.all.length; }
}

class EntryRepo implements IPlanEntryRepository {
  constructor(public all: EntryRow[]) {}
  async findByPlanId(planId: string) { return this.all.filter((e) => e.planId === planId); }
  async create(): Promise<any> { throw new Error("nyi"); }
  async update(): Promise<any> { return null; }
  async delete(): Promise<any> { return null; }
  async reorder() {}
  async getMaxPosition() { return 0; }
}

class ProgRepo implements IProgramRepository {
  constructor(public faculties: Faculty[], public programs: Program[]) {}
  async findAllFaculties() { return this.faculties; }
  async findFacultyById(id: string) { return this.faculties.find((f) => f.id === id) ?? null; }
  async findAllPrograms() { return this.programs; }
  async findProgramById(id: string) { return this.programs.find((p) => p.id === id) ?? null; }
}

const e = (courseId: string, year: number, term: string, status = "planned"): EntryRow => ({
  id: `e-${courseId}-${year}-${term}`, planId: "p1", courseId, year, term, status, position: 0,
});

function fixture(entries: EntryRow[], programs: Program[] = []) {
  const courses = new CourseRepo([
    c("CPSC110", "CPSC", "110", "4.0"),
    c("CPSC121", "CPSC", "121", "4.0"),
    c("CPSC210", "CPSC", "210", "4.0"),
    c("MATH100", "MATH", "100", "3.0"),
    c("MATH101", "MATH", "101", "3.0"),
  ]);
  const entryRepo = new EntryRepo(entries);
  const progRepo = new ProgRepo([{ id: "sci", name: "Science", requirements: [] }], programs);
  const progress = new ProgressService(entryRepo, courses, progRepo);
  return new RecommendationsService(entryRepo, courses, progress);
}

describe("RecommendationsService", () => {
  it("flags light course load in a Winter term", async () => {
    const svc = fixture([e("CPSC110", 1, "W1"), e("CPSC121", 1, "W1")]);
    const recs = await svc.generate("p1");
    expect(recs.find((r) => r.id === "light-load-Y1-W1")).toBeDefined();
  });

  it("does not flag light load when term has 4+ courses", async () => {
    const svc = fixture([
      e("CPSC110", 1, "W1"), e("CPSC121", 1, "W1"),
      e("CPSC210", 1, "W1"), e("MATH100", 1, "W1"),
    ]);
    const recs = await svc.generate("p1");
    expect(recs.find((r) => r.id?.startsWith("light-load"))).toBeUndefined();
  });

  it("warns on extended timeline when more than 4 winter years scheduled and credits remain", async () => {
    const winters: EntryRow[] = [];
    for (let y = 1; y <= 5; y++) {
      winters.push(e("CPSC110", y, "W1", "planned"));
      winters.push(e("CPSC121", y, "W2", "planned"));
    }
    const program: Program = {
      id: "cs", name: "CS", facultyId: "sci", totalCredits: 120, requirements: [],
    };
    const svc = fixture(winters, [program]);
    const recs = await svc.generate("p1", "cs");
    expect(recs.find((r) => r.id === "pace-extended")).toBeDefined();
  });

  it("returns a happy-path card when plan is empty (no other issues)", async () => {
    const svc = fixture([]);
    const recs = await svc.generate("p1");
    expect(recs).toHaveLength(1);
    expect(recs[0].id).toBe("plan-looking-good");
  });

  it("flags empty terms when the plan has multiple terms", async () => {
    const svc = fixture([
      e("CPSC110", 1, "W1"), e("CPSC121", 1, "W1"),
      e("CPSC210", 1, "W1"), e("MATH100", 1, "W1"),
      // Y1-W2 has only a failed entry, counts as empty
      e("MATH101", 1, "W2", "failed"),
    ]);
    const recs = await svc.generate("p1");
    expect(recs.find((r) => r.id === "empty-terms")).toBeDefined();
  });
});
