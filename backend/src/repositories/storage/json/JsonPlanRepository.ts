import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomUUID } from "crypto";
import type { PlanRow } from "../../../models/types";
import type { IPlanRepository } from "../../interfaces";

/**
 * StoredPlan extends PlanRow with an optional `entryCount`.
 *
 * In the JSON file we only store the core plan fields, but the
 * `findAll()` method needs to return each plan together with how many
 * course entries it contains (shown in the sidebar as "12 courses").
 * This type lets us carry that extra field internally.
 */
interface StoredPlan extends PlanRow {
  entryCount?: number;
}

/**
 * JsonPlanRepository
 * ==================
 * Implements `IPlanRepository` using a JSON file (plans.json) as the
 * primary store for degree plans.
 *
 * A "plan" is a named collection of course entries — think of it like
 * a saved kanban board.  Students can have multiple plans (e.g.
 * "CS Major Plan", "Double Major Draft").
 *
 * Why this constructor takes TWO file paths:
 *   `filePath`        → plans.json (the plans themselves)
 *   `entriesFilePath` → entries.json (needed by `findAll()` to count
 *                        how many courses are in each plan)
 *
 *   `findAll()` is the only method that reads entries.json — all other
 *   methods only touch plans.json.  This cross-file read is a pragmatic
 *   choice: the alternative would be maintaining a denormalised count
 *   field, which is error-prone with JSON files.
 */
export class JsonPlanRepository implements IPlanRepository {
  constructor(
    private filePath: string,        // path to plans.json
    private entriesFilePath: string,  // path to entries.json (read-only, for counts)
  ) {}

  // ── Private helpers ──────────────────────────────────────────────

  /** Load all plans from disk. */
  private load(): StoredPlan[] {
    if (!existsSync(this.filePath)) return [];
    const raw = readFileSync(this.filePath, "utf-8");
    return JSON.parse(raw) as StoredPlan[];
  }

  /** Write the full plans array back to disk. */
  private save(plans: StoredPlan[]): void {
    writeFileSync(this.filePath, JSON.stringify(plans, null, 2), "utf-8");
  }

  /**
   * Load entries.json but only keep the `planId` field (we don't need
   * the rest — we're just counting).  This keeps memory usage low.
   */
  private loadEntries(): Array<{ planId: string }> {
    if (!existsSync(this.entriesFilePath)) return [];
    const raw = readFileSync(this.entriesFilePath, "utf-8");
    return JSON.parse(raw) as Array<{ planId: string }>;
  }

  // ── Interface methods (IPlanRepository) ──────────────────────────

  /**
   * List all plans, each enriched with an `entryCount`.
   *
   * How the entry count works:
   *   1. Load entries.json and count how many entries belong to each planId
   *      using a Map (O(n) single pass).
   *   2. Map each plan to include `entryCount` (defaults to 0).
   *
   * The frontend sidebar calls this to show: "My CS Plan (12 courses)".
   */
  async findAll(): Promise<(PlanRow & { entryCount: number })[]> {
    const plans = this.load();
    const entries = this.loadEntries();

    // Count entries per plan: { planId → count }
    const countMap = new Map<string, number>();
    for (const entry of entries) {
      countMap.set(entry.planId, (countMap.get(entry.planId) ?? 0) + 1);
    }

    // Return plan data with the computed count attached
    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      entryCount: countMap.get(p.id) ?? 0,
    }));
  }

  /**
   * Find a single plan by its UUID.
   * Returns `null` if not found (the route handler turns this into a 404).
   */
  async findById(id: string): Promise<PlanRow | null> {
    const plans = this.load();
    return plans.find((p) => p.id === id) ?? null;
  }

  /**
   * Create a new degree plan.
   *
   * Generates a UUID and timestamps (`createdAt`, `updatedAt`),
   * appends the plan to the array, and saves.
   *
   * @param name        – display name (e.g. "CS Major Plan")
   * @param description – optional longer description
   * @returns the newly created PlanRow with its generated `id`
   */
  async create(name: string, description?: string): Promise<PlanRow> {
    const plans = this.load();
    const now = new Date();
    const plan: PlanRow = {
      id: randomUUID(),
      name,
      description: description ?? null, // normalise undefined → null
      createdAt: now,
      updatedAt: now,
    };
    plans.push(plan);
    this.save(plans);
    return plan;
  }

  /**
   * Partially update a plan's name and/or description.
   *
   * `Partial<Pick<PlanRow, "name" | "description">>` means:
   *   - You can pass `{ name: "New Name" }` alone, or
   *   - `{ description: "New desc" }` alone, or both.
   *   - Fields you don't include stay unchanged.
   *
   * `updatedAt` is always refreshed so the frontend can show
   * "last modified: 2 hours ago".
   *
   * Returns `null` if the plan doesn't exist.
   */
  async update(
    id: string,
    updates: Partial<Pick<PlanRow, "name" | "description">>
  ): Promise<PlanRow | null> {
    const plans = this.load();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return null;

    if (updates.name !== undefined) plans[index].name = updates.name;
    if (updates.description !== undefined)
      plans[index].description = updates.description;
    plans[index].updatedAt = new Date(); // always bump the timestamp

    this.save(plans);
    return plans[index];
  }

  /**
   * Delete a plan by ID.
   *
   * NOTE: This only removes the plan record from plans.json.  The
   * associated entries in entries.json are NOT deleted here — that's
   * handled by the service layer (PlanService) which calls
   * `planEntryRepository.delete()` for each entry.  Keeping this
   * responsibility in the service layer follows Single Responsibility.
   *
   * Returns the deleted plan (so the route can confirm what was removed),
   * or `null` if it didn't exist.
   */
  async delete(id: string): Promise<PlanRow | null> {
    const plans = this.load();
    const index = plans.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const [deleted] = plans.splice(index, 1);
    this.save(plans);
    return deleted;
  }
}
