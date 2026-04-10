import { readFileSync, writeFileSync, existsSync } from "fs";
import type { CourseRow } from "../../models/types";
import type {
  ICourseRepository,
  CourseFilter,
  CourseListResult,
} from "../interfaces";

export class JsonCourseRepository implements ICourseRepository {
  constructor(private filePath: string) {}

  private load(): CourseRow[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, "utf-8");
    return JSON.parse(raw) as CourseRow[];
  }

  private save(courses: CourseRow[]): void {
    writeFileSync(this.filePath, JSON.stringify(courses, null, 2), "utf-8");
  }

  async findAll(filter?: CourseFilter): Promise<CourseListResult> {
    let courses = this.load();

    if (filter?.dept) {
      const dept = filter.dept.toUpperCase();
      courses = courses.filter((c) => c.dept === dept);
    }

    if (filter?.level) {
      const levelNum = parseInt(filter.level);
      if (!isNaN(levelNum)) {
        courses = courses.filter((c) =>
          c.code.startsWith(String(levelNum))
        );
      }
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false)
      );
    }

    const total = courses.length;
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 20;
    const data = courses.slice(offset, offset + limit);

    return { data, total };
  }

  async findById(id: string): Promise<CourseRow | null> {
    const courses = this.load();
    return courses.find((c) => c.id === id.toUpperCase()) ?? null;
  }

  async findByIds(ids: string[]): Promise<CourseRow[]> {
    const upper = new Set(ids.map((id) => id.toUpperCase()));
    const courses = this.load();
    return courses.filter((c) => upper.has(c.id));
  }

  async seedAll(courses: CourseRow[]): Promise<number> {
    const existing = this.load();
    const map = new Map(existing.map((c) => [c.id, c]));

    for (const course of courses) {
      map.set(course.id, course);
    }

    const merged = Array.from(map.values());
    this.save(merged);
    return courses.length;
  }
}
