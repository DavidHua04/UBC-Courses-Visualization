import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { JsonCourseRepository } from "../JsonCourseRepository";
import type { CourseRow } from "../../../../models/types";

function makeCourse(overrides: Partial<CourseRow> = {}): CourseRow {
  return {
    id: "CPSC110",
    dept: "CPSC",
    code: "110",
    title: "Computation, Programs, and Programming",
    credits: "3.0",
    description: null,
    prerequisites: null,
    corequisites: [],
    termsOffered: ["W1", "W2"],
    ...overrides,
  };
}

describe("JsonCourseRepository", () => {
  let tmpDir: string;
  let filePath: string;
  let repo: JsonCourseRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "course-repo-"));
    filePath = join(tmpDir, "courses.json");
    repo = new JsonCourseRepository(filePath);
  });

  afterEach(() => {
    try { unlinkSync(filePath); } catch {}
  });

  // ── findAll ───────────────────────────────────────────────────────

  it("returns empty result when file does not exist", async () => {
    const result = await repo.findAll();
    expect(result).toEqual({ data: [], total: 0 });
  });

  it("returns all courses with pagination defaults", async () => {
    const courses = [makeCourse(), makeCourse({ id: "CPSC210", code: "210", title: "Software Construction" })];
    writeFileSync(filePath, JSON.stringify(courses));

    const result = await repo.findAll();
    expect(result.total).toBe(2);
    expect(result.data).toHaveLength(2);
  });

  it("filters by dept (case-insensitive input)", async () => {
    const courses = [
      makeCourse({ id: "CPSC110", dept: "CPSC" }),
      makeCourse({ id: "MATH100", dept: "MATH", code: "100", title: "Calculus" }),
    ];
    writeFileSync(filePath, JSON.stringify(courses));

    const result = await repo.findAll({ dept: "math" });
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe("MATH100");
  });

  it("filters by level", async () => {
    const courses = [
      makeCourse({ id: "CPSC110", code: "110" }),
      makeCourse({ id: "CPSC210", code: "210", title: "Software Construction" }),
    ];
    writeFileSync(filePath, JSON.stringify(courses));

    const result = await repo.findAll({ level: "2" });
    expect(result.total).toBe(1);
    expect(result.data[0].id).toBe("CPSC210");
  });

  it("filters by search term across title, id, and description", async () => {
    const courses = [
      makeCourse({ id: "CPSC110", title: "Computation", description: null }),
      makeCourse({ id: "CPSC210", code: "210", title: "Software Construction", description: "OOP and design" }),
    ];
    writeFileSync(filePath, JSON.stringify(courses));

    expect((await repo.findAll({ search: "software" })).total).toBe(1);
    expect((await repo.findAll({ search: "cpsc210" })).total).toBe(1);
    expect((await repo.findAll({ search: "OOP" })).total).toBe(1);
  });

  it("paginates with offset and limit", async () => {
    const courses = Array.from({ length: 5 }, (_, i) =>
      makeCourse({ id: `CPSC${100 + i}`, code: `${100 + i}` })
    );
    writeFileSync(filePath, JSON.stringify(courses));

    const result = await repo.findAll({ offset: 2, limit: 2 });
    expect(result.total).toBe(5);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe("CPSC102");
  });

  // ── findById ──────────────────────────────────────────────────────

  it("finds a course by id (case-insensitive)", async () => {
    writeFileSync(filePath, JSON.stringify([makeCourse()]));

    const course = await repo.findById("cpsc110");
    expect(course).not.toBeNull();
    expect(course!.id).toBe("CPSC110");
  });

  it("returns null when course not found", async () => {
    writeFileSync(filePath, JSON.stringify([makeCourse()]));
    expect(await repo.findById("CPSC999")).toBeNull();
  });

  // ── findByIds ─────────────────────────────────────────────────────

  it("returns courses matching any of the given ids", async () => {
    const courses = [
      makeCourse({ id: "CPSC110" }),
      makeCourse({ id: "CPSC210", code: "210", title: "SC" }),
      makeCourse({ id: "MATH100", dept: "MATH", code: "100", title: "Calc" }),
    ];
    writeFileSync(filePath, JSON.stringify(courses));

    const result = await repo.findByIds(["cpsc110", "math100"]);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.id).sort()).toEqual(["CPSC110", "MATH100"]);
  });

  // ── seedAll ───────────────────────────────────────────────────────

  it("creates the file and seeds courses when file does not exist", async () => {
    const count = await repo.seedAll([makeCourse()]);
    expect(count).toBe(1);

    const result = await repo.findAll();
    expect(result.total).toBe(1);
  });

  it("merges with existing courses, updating duplicates", async () => {
    writeFileSync(filePath, JSON.stringify([makeCourse({ id: "CPSC110", title: "Old Title" })]));

    await repo.seedAll([
      makeCourse({ id: "CPSC110", title: "New Title" }),
      makeCourse({ id: "CPSC210", code: "210", title: "SC" }),
    ]);

    const result = await repo.findAll();
    expect(result.total).toBe(2);

    const updated = await repo.findById("CPSC110");
    expect(updated!.title).toBe("New Title");
  });
});
