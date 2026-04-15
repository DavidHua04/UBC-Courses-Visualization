import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, unlinkSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { JsonPlanRepository } from "../JsonPlanRepository";

describe("JsonPlanRepository", () => {
  let tmpDir: string;
  let plansPath: string;
  let entriesPath: string;
  let repo: JsonPlanRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "plan-repo-"));
    plansPath = join(tmpDir, "plans.json");
    entriesPath = join(tmpDir, "entries.json");
    repo = new JsonPlanRepository(plansPath, entriesPath);
  });

  afterEach(() => {
    try { unlinkSync(plansPath); } catch {}
    try { unlinkSync(entriesPath); } catch {}
  });

  // ── create ────────────────────────────────────────────────────────

  it("creates a plan with a generated id and timestamps", async () => {
    const plan = await repo.create("Year 1 Plan", "My first plan");

    expect(plan.id).toBeDefined();
    expect(plan.name).toBe("Year 1 Plan");
    expect(plan.description).toBe("My first plan");
    expect(plan.createdAt).toBeInstanceOf(Date);
    expect(plan.updatedAt).toBeInstanceOf(Date);
  });

  it("defaults description to null when omitted", async () => {
    const plan = await repo.create("No Desc");
    expect(plan.description).toBeNull();
  });

  // ── findAll ───────────────────────────────────────────────────────

  it("returns empty array when file does not exist", async () => {
    const plans = await repo.findAll();
    expect(plans).toEqual([]);
  });

  it("returns plans with entry counts", async () => {
    const p1 = await repo.create("Plan A");
    const p2 = await repo.create("Plan B");

    // Write some entries for p1
    writeFileSync(
      entriesPath,
      JSON.stringify([
        { planId: p1.id, courseId: "CPSC110" },
        { planId: p1.id, courseId: "CPSC210" },
        { planId: p2.id, courseId: "MATH100" },
      ])
    );

    const plans = await repo.findAll();
    expect(plans).toHaveLength(2);

    const a = plans.find((p) => p.id === p1.id)!;
    const b = plans.find((p) => p.id === p2.id)!;
    expect(a.entryCount).toBe(2);
    expect(b.entryCount).toBe(1);
  });

  // ── findById ──────────────────────────────────────────────────────

  it("finds a plan by id", async () => {
    const created = await repo.create("Find Me");
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Find Me");
  });

  it("returns null for non-existent id", async () => {
    expect(await repo.findById("no-such-id")).toBeNull();
  });

  // ── update ────────────────────────────────────────────────────────

  it("updates name and description", async () => {
    const plan = await repo.create("Old Name", "Old Desc");

    const updated = await repo.update(plan.id, {
      name: "New Name",
      description: "New Desc",
    });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe("New Name");
    expect(updated!.description).toBe("New Desc");
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(plan.updatedAt.getTime());
  });

  it("returns null when updating non-existent plan", async () => {
    expect(await repo.update("nope", { name: "x" })).toBeNull();
  });

  // ── delete ────────────────────────────────────────────────────────

  it("deletes a plan and returns it", async () => {
    const plan = await repo.create("Delete Me");
    const deleted = await repo.delete(plan.id);

    expect(deleted).not.toBeNull();
    expect(deleted!.id).toBe(plan.id);
    expect(await repo.findById(plan.id)).toBeNull();
  });

  it("returns null when deleting non-existent plan", async () => {
    expect(await repo.delete("nope")).toBeNull();
  });
});
