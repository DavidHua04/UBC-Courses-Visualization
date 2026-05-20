import { describe, it, expect, beforeEach } from "vitest";
import { ProgramService } from "../program.service";
import type { IProgramRepository, Faculty, Program } from "../../dataModel";

class InMemoryProgramRepo implements IProgramRepository {
  constructor(public faculties: Faculty[], public programs: Program[]) {}
  async findAllFaculties() { return this.faculties; }
  async findFacultyById(id: string) { return this.faculties.find((f) => f.id === id) ?? null; }
  async findAllPrograms(facultyId?: string) {
    return facultyId ? this.programs.filter((p) => p.facultyId === facultyId) : this.programs;
  }
  async findProgramById(id: string) { return this.programs.find((p) => p.id === id) ?? null; }
}

describe("ProgramService", () => {
  let repo: InMemoryProgramRepo;
  let svc: ProgramService;

  beforeEach(() => {
    repo = new InMemoryProgramRepo(
      [
        {
          id: "science",
          name: "Faculty of Science",
          requirements: [
            {
              id: "sci-comm",
              name: "Communication",
              type: "communication",
              credits: 3,
              matcher: { type: "courses_one_of", courses: ["SCIE113"] },
            },
          ],
        },
      ],
      [
        {
          id: "cs",
          name: "CS Major",
          facultyId: "science",
          totalCredits: 120,
          requirements: [
            {
              id: "cpsc110",
              name: "CPSC 110",
              type: "required",
              credits: 4,
              matcher: { type: "courses_one_of", courses: ["CPSC110"] },
            },
          ],
        },
      ],
    );
    svc = new ProgramService(repo);
  });

  it("lists faculties", async () => {
    const fs = await svc.listFaculties();
    expect(fs).toHaveLength(1);
    expect(fs[0].id).toBe("science");
  });

  it("filters programs by facultyId", async () => {
    expect(await svc.listPrograms("science")).toHaveLength(1);
    expect(await svc.listPrograms("arts")).toHaveLength(0);
  });

  it("returns null for missing program", async () => {
    expect(await svc.getProgram("nope")).toBeNull();
  });

  it("getProgramWithFacultyRequirements prepends faculty reqs", async () => {
    const combined = await svc.getProgramWithFacultyRequirements("cs");
    expect(combined?.requirements).toHaveLength(2);
    expect(combined?.requirements[0].id).toBe("sci-comm");
    expect(combined?.requirements[1].id).toBe("cpsc110");
  });

  it("getProgramWithFacultyRequirements returns null for missing program", async () => {
    expect(await svc.getProgramWithFacultyRequirements("nope")).toBeNull();
  });
});
