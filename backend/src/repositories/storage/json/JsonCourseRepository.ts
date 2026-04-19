import { readFileSync, writeFileSync, existsSync } from "fs";
import type { CourseRow } from "../../../models/types";
import type {
  ICourseRepository,
  CourseFilter,
  CourseListResult,
} from "../../interfaces";

/**
 * JsonCourseRepository
 * ====================
 * Implements `ICourseRepository` using a single JSON file (courses.json)
 * as the data store.  Every read loads the whole file into memory, and
 * every write serialises the entire array back to disk.
 *
 * This is perfectly fine for the ~29 seed courses we have today, and it
 * means the backend works without PostgreSQL or any external database.
 *
 * When we're ready for a real DB, we'll create a `DrizzleCourseRepository`
 * that implements the same `ICourseRepository` interface, swap it in
 * `container.ts`, and nothing else in the app needs to change (Liskov
 * Substitution + Dependency Inversion from SOLID).
 *
 * @param filePath – absolute path to the JSON file (e.g. "backend/data/courses.json")
 */
export class JsonCourseRepository implements ICourseRepository {
  constructor(private filePath: string) {}

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Read the JSON file from disk and parse it into an array of CourseRow.
   * If the file doesn't exist yet (first run), return an empty array.
   */
  private load(): CourseRow[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, "utf-8");
    return JSON.parse(raw) as CourseRow[];
  }

  /**
   * Serialise the full course array back to disk (pretty-printed with
   * 2-space indent so it's human-readable in version control).
   */
  private save(courses: CourseRow[]): void {
    writeFileSync(this.filePath, JSON.stringify(courses, null, 2), "utf-8");
  }

  // ── Interface methods (ICourseRepository) ────────────────────────

  /**
   * Return a paginated, optionally filtered list of courses.
   *
   * Filter pipeline (each step narrows the results):
   *   1. `dept`   — exact match on department code (e.g. "CPSC")
   *   2. `level`  — course code starts with this digit (e.g. "3" → 300-level)
   *   3. `search` — case-insensitive substring match on title, id, or description
   *
   * After filtering, pagination is applied:
   *   - `offset` (default 0) — how many courses to skip
   *   - `limit`  (default 20) — max courses to return
   *
   * Returns `{ data, total }` where `total` is the count *after* filtering
   * but *before* pagination, so the frontend can show "page 2 of 5".
   */
  async findAll(filter?: CourseFilter): Promise<CourseListResult> {
    let courses = this.load();

    // Step 1: filter by department (e.g. "CPSC", "MATH")
    if (filter?.dept) {
      const dept = filter.dept.toUpperCase();
      courses = courses.filter((c) => c.dept === dept);
    }

    // Step 2: filter by course level (first digit of code, e.g. "3" matches "310")
    if (filter?.level) {
      const levelNum = parseInt(filter.level);
      if (!isNaN(levelNum)) {
        courses = courses.filter((c) =>
          c.code.startsWith(String(levelNum))
        );
      }
    }

    // Step 3: free-text search across title, id, and description
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.description?.toLowerCase().includes(q) ?? false)
      );
    }

    // Paginate: total is the count after filtering, data is the current page
    const total = courses.length;
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 20;
    const data = courses.slice(offset, offset + limit);

    return { data, total };
  }

  /**
   * Find a single course by its ID (e.g. "CPSC-110").
   * Case-insensitive — the lookup normalises to uppercase.
   * Returns `null` if no course matches.
   */
  async findById(id: string): Promise<CourseRow | null> {
    const courses = this.load();
    return courses.find((c) => c.id === id.toUpperCase()) ?? null;
  }

  /**
   * Find multiple courses by their IDs in one call.
   *
   * Used by the validation service which needs to look up all courses
   * referenced in a plan's entries at once (more efficient than N
   * individual findById calls).
   *
   * Uses a Set for O(1) lookups instead of Array.includes.
   */
  async findByIds(ids: string[]): Promise<CourseRow[]> {
    const upper = new Set(ids.map((id) => id.toUpperCase()));
    const courses = this.load();
    return courses.filter((c) => upper.has(c.id));
  }

  /**
   * Upsert (insert-or-replace) a batch of courses.
   *
   * How it works:
   *   1. Load existing courses into a Map keyed by course ID.
   *   2. For each incoming course, `map.set()` either adds a new entry
   *      or overwrites an existing one with the same ID.
   *   3. Save the merged result back to disk.
   *
   * This is called by the "POST /api/v1/courses/seed" route to populate
   * the course catalog from the seed data (29 CPSC/MATH/STAT courses).
   *
   * @returns the number of courses that were passed in (not necessarily new)
   */
  async seedAll(courses: CourseRow[]): Promise<number> {
    const existing = this.load();
    // Build a Map from existing data so we can merge by ID
    const map = new Map(existing.map((c) => [c.id, c]));

    for (const course of courses) {
      map.set(course.id, course); // overwrites if ID already present
    }

    const merged = Array.from(map.values());
    this.save(merged);
    return courses.length;
  }
}
