import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { JsonPlanEntryRepository } from "../JsonPlanEntryRepository";

const PLAN_ID = "plan-uuid-1";

describe("JsonPlanEntryRepository", () => {
  let tmpDir: string;
  let filePath: string;
  let repo: JsonPlanEntryRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "entry-repo-"));
    filePath = join(tmpDir, "entries.json");
    repo = new JsonPlanEntryRepository(filePath);
  });

  afterEach(() => {
    try { unlinkSync(filePath); } catch {}
  });

  // ── create ────────────────────────────────────────────────────────

  it("creates an entry with generated id and defaults", async () => {
    const entry = await repo.create({
      planId: PLAN_ID,
      courseId: "cpsc110",
      year: 1,
      term: "W1",
    });

    expect(entry.id).toBeDefined();
    expect(entry.courseId).toBe("CPSC110"); // uppercased
    expect(entry.status).toBe("planned");   // default
    expect(entry.position).toBe(0);         // first entry, maxPos(-1) + 1
  });

  it("throws with code 23505 on duplicate course in same plan", async () => {
    await repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 1, term: "W1" });

    await expect(
      repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 2, term: "W2" })
    ).rejects.toThrow("Course already exists in this plan");
  });

  it("auto-increments position within the same plan", async () => {
    const e1 = await repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 1, term: "W1" });
    const e2 = await repo.create({ planId: PLAN_ID, courseId: "CPSC210", year: 1, term: "W1" });

    expect(e1.position).toBe(0);
    expect(e2.position).toBe(1);
  });

  // ── findByPlanId ──────────────────────────────────────────────────

  it("returns entries sorted by year, term, then position", async () => {
    await repo.create({ planId: PLAN_ID, courseId: "CPSC310", year: 2, term: "W1" });
    await repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 1, term: "W1" });
    await repo.create({ planId: PLAN_ID, courseId: "CPSC210", year: 1, term: "W2" });

    const entries = await repo.findByPlanId(PLAN_ID);
    expect(entries.map((e) => e.courseId)).toEqual(["CPSC110", "CPSC210", "CPSC310"]);
  });

  it("returns empty array for plan with no entries", async () => {
    expect(await repo.findByPlanId("no-plan")).toEqual([]);
  });

  it("does not return entries from other plans", async () => {
    await repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 1, term: "W1" });
    await repo.create({ planId: "other-plan", courseId: "CPSC210", year: 1, term: "W1" });

    const entries = await repo.findByPlanId(PLAN_ID);
    expect(entries).toHaveLength(1);
    expect(entries[0].courseId).toBe("CPSC110");
  });

  // ── update ────────────────────────────────────────────────────────

  it("updates entry fields", async () => {
    const entry = await repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 1, term: "W1" });

    const updated = await repo.update(entry.id, { year: 2, term: "W2", status: "completed" });
    expect(updated).not.toBeNull();
    expect(updated!.year).toBe(2);
    expect(updated!.term).toBe("W2");
    expect(updated!.status).toBe("completed");
  });

  it("returns null when entry not found", async () => {
    expect(await repo.update("nope", { year: 3 })).toBeNull();
  });

  // ── delete ────────────────────────────────────────────────────────

  it("deletes an entry and returns it", async () => {
    const entry = await repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 1, term: "W1" });
    const deleted = await repo.delete(entry.id);

    expect(deleted).not.toBeNull();
    expect(deleted!.id).toBe(entry.id);
    expect(await repo.findByPlanId(PLAN_ID)).toHaveLength(0);
  });

  it("returns null when deleting non-existent entry", async () => {
    expect(await repo.delete("nope")).toBeNull();
  });

  // ── reorder ───────────────────────────────────────────────────────

  it("updates positions for specified entries", async () => {
    const e1 = await repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 1, term: "W1" });
    const e2 = await repo.create({ planId: PLAN_ID, courseId: "CPSC210", year: 1, term: "W1" });

    await repo.reorder([
      { entryId: e1.id, position: 5 },
      { entryId: e2.id, position: 3 },
    ]);

    const entries = await repo.findByPlanId(PLAN_ID);
    const byId = new Map(entries.map((e) => [e.id, e]));
    expect(byId.get(e1.id)!.position).toBe(5);
    expect(byId.get(e2.id)!.position).toBe(3);
  });

  // ── getMaxPosition ────────────────────────────────────────────────

  it("returns -1 for empty plan", async () => {
    expect(await repo.getMaxPosition(PLAN_ID)).toBe(-1);
  });

  it("returns the highest position in the plan", async () => {
    await repo.create({ planId: PLAN_ID, courseId: "CPSC110", year: 1, term: "W1" });
    await repo.create({ planId: PLAN_ID, courseId: "CPSC210", year: 1, term: "W1" });

    expect(await repo.getMaxPosition(PLAN_ID)).toBe(1);
  });
});
