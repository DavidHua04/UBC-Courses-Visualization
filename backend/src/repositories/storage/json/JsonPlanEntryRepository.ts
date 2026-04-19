import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import type { EntryRow } from "../../../models/types";
import type { IPlanEntryRepository, NewEntry, EntryUpdates } from "../../interfaces";

/**
 * JsonPlanEntryRepository
 * =======================
 * Implements `IPlanEntryRepository` using a single JSON file (entries.json).
 *
 * A "plan entry" represents one course placed on a student's degree plan
 * at a specific year, term, and position.  Think of it as one card on the
 * kanban board.
 *
 * Key business rules enforced here:
 *   - A course can only appear ONCE per plan (duplicate check in `create`).
 *   - Entries are sorted by year → term (W1 < W2 < S) → position.
 *   - Position auto-increments if not provided on create.
 *
 * The entries.json file holds entries for ALL plans in one flat array.
 * Each entry has a `planId` field so we can filter by plan.
 *
 * @param filePath – absolute path to entries.json
 */
export class JsonPlanEntryRepository implements IPlanEntryRepository {
  constructor(private filePath: string) {}

  // ── Private helpers ──────────────────────────────────────────────

  /** Load every entry (across all plans) from disk. */
  private load(): EntryRow[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, "utf-8");
    return JSON.parse(raw) as EntryRow[];
  }

  /** Write the full entries array back to disk. */
  private save(entries: EntryRow[]): void {
    writeFileSync(this.filePath, JSON.stringify(entries, null, 2), "utf-8");
  }

  // ── Interface methods (IPlanEntryRepository) ─────────────────────

  /**
   * Get all entries belonging to one plan, sorted in chronological order:
   *   1. Year ascending (year 1 before year 2)
   *   2. Term ordering: W1 (Winter Term 1) → W2 (Winter Term 2) → S (Summer)
   *   3. Position ascending (within the same year+term column)
   *
   * This sort order matches the visual left-to-right, top-to-bottom layout
   * on the plan board, and is also the order the validation service uses
   * to check prerequisites ("have you taken the prereqs *before* this term?").
   */
  async findByPlanId(planId: string): Promise<EntryRow[]> {
    const entries = this.load();
    return entries
      .filter((e) => e.planId === planId)
      .sort((a, b) => {
        // Primary sort: year ascending
        if (a.year !== b.year) return a.year - b.year;
        // Secondary sort: term in academic order (W1 → W2 → S)
        const termOrder: Record<string, number> = { W1: 0, W2: 1, S: 2 };
        if (a.term !== b.term)
          return (termOrder[a.term] ?? 0) - (termOrder[b.term] ?? 0);
        // Tertiary sort: position within the same column
        return a.position - b.position;
      });
  }

  /**
   * Add a new course entry to a plan.
   *
   * Steps:
   *   1. Duplicate check — if the same courseId already exists in this plan,
   *      throw an error with code "23505" (mimics PostgreSQL's unique-violation
   *      error code so the route handler can return the same 409 response
   *      regardless of which storage backend is active).
   *   2. Auto-position — if no `position` was provided, place the entry at
   *      the end (maxPosition + 1).  This means new cards appear at the
   *      bottom of their term column.
   *   3. Generate a UUID for the new entry, normalise courseId to uppercase.
   *   4. Append to the array and save.
   *
   * @returns the newly created EntryRow with its generated `id`
   */
  async create(entry: NewEntry): Promise<EntryRow> {
    const entries = this.load();

    // Uniqueness constraint: same course can't be added to the same plan twice
    const duplicate = entries.find(
      (e) =>
        e.planId === entry.planId &&
        e.courseId === entry.courseId.toUpperCase()
    );
    if (duplicate) {
      // Error code "23505" matches PostgreSQL's unique_violation so the
      // route handler doesn't need to know which storage backend is in use
      const err = new Error("Course already exists in this plan") as Error & { code: string };
      err.code = "23505";
      throw err;
    }

    // If position wasn't explicitly set, put it after the last entry in the plan
    const position =
      entry.position ??
      (await this.getMaxPosition(entry.planId)) + 1;

    const row: EntryRow = {
      id: randomUUID(),                      // unique ID for this entry
      planId: entry.planId,                   // which plan it belongs to
      courseId: entry.courseId.toUpperCase(),  // normalised course ID (e.g. "CPSC-110")
      year: entry.year,                       // 1-5
      term: entry.term,                       // "W1", "W2", or "S"
      status: entry.status ?? "planned",      // default status is "planned"
      position,                               // order within the term column
    };

    entries.push(row);
    this.save(entries);
    return row;
  }

  /**
   * Partially update an existing entry (e.g. move it to a different
   * year/term, change its status, or update its position).
   *
   * Only the fields present in `updates` are changed — undefined fields
   * are left as-is.  Returns `null` if no entry with this ID exists.
   */
  async update(entryId: string, updates: EntryUpdates): Promise<EntryRow | null> {
    const entries = this.load();
    const index = entries.findIndex((e) => e.id === entryId);
    if (index === -1) return null;

    // Apply only the provided fields
    if (updates.year !== undefined) entries[index].year = updates.year;
    if (updates.term !== undefined) entries[index].term = updates.term;
    if (updates.status !== undefined) entries[index].status = updates.status;
    if (updates.position !== undefined) entries[index].position = updates.position;

    this.save(entries);
    return entries[index];
  }

  /**
   * Remove an entry from the plan.
   * Returns the deleted entry (so the route can return it in the response),
   * or `null` if it didn't exist.
   *
   * `splice(index, 1)` removes the element in-place and returns it as a
   * one-element array — we destructure `[deleted]` to get the single item.
   */
  async delete(entryId: string): Promise<EntryRow | null> {
    const entries = this.load();
    const index = entries.findIndex((e) => e.id === entryId);
    if (index === -1) return null;

    const [deleted] = entries.splice(index, 1);
    this.save(entries);
    return deleted;
  }

  /**
   * Bulk-update positions for multiple entries at once.
   *
   * Called after a drag-and-drop reorder on the frontend.  The client
   * sends an array like:
   *   [{ entryId: "abc", position: 0 }, { entryId: "def", position: 1 }]
   *
   * We build a Map for O(1) lookups, then walk the full entries array
   * and update any entry whose ID appears in the map.
   */
  async reorder(
    positions: Array<{ entryId: string; position: number }>
  ): Promise<void> {
    const entries = this.load();
    // Build a lookup: entryId → new position
    const posMap = new Map(positions.map((p) => [p.entryId, p.position]));

    for (const entry of entries) {
      const newPos = posMap.get(entry.id);
      if (newPos !== undefined) entry.position = newPos;
    }

    this.save(entries);
  }

  /**
   * Find the highest `position` value among entries in a given plan.
   *
   * Used by `create()` to auto-assign the next position when the caller
   * doesn't specify one.  Returns -1 if the plan has no entries, so the
   * first entry gets position 0 (since -1 + 1 = 0).
   */
  async getMaxPosition(planId: string): Promise<number> {
    const entries = this.load();
    const planEntries = entries.filter((e) => e.planId === planId);
    if (planEntries.length === 0) return -1;
    return Math.max(...planEntries.map((e) => e.position));
  }
}
