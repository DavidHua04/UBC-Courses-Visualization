import { Router } from "express";
import { eq, sql, asc } from "drizzle-orm";
import { db } from "../db";
import { plans, planEntries, courses } from "../db/schema";
import { enqueueValidation } from "../services/queue";
import { invalidateValidation, getCachedValidation, setCachedValidation } from "../services/cache";
import { validatePlan } from "../services/validation";
import type { ApiError, PlanWithEntries, EntryRow } from "../models/types";

const router = Router();

// GET /api/v1/plans
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: plans.id,
        name: plans.name,
        description: plans.description,
        createdAt: plans.createdAt,
        updatedAt: plans.updatedAt,
        entryCount: sql<number>`count(${planEntries.id})`,
      })
      .from(plans)
      .leftJoin(planEntries, eq(planEntries.planId, plans.id))
      .groupBy(plans.id);

    res.json(rows);
  } catch (err) {
    console.error("GET /plans error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// POST /api/v1/plans
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        error: "validation_error",
        message: "name is required",
        fields: { name: "required" },
      } satisfies ApiError);
    }

    const [plan] = await db
      .insert(plans)
      .values({ name: name.trim(), description: description ?? null })
      .returning();

    res.status(201).json(plan);
  } catch (err) {
    console.error("POST /plans error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// GET /api/v1/plans/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));

    if (!plan) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" } satisfies ApiError);
    }

    const entries = await db
      .select()
      .from(planEntries)
      .where(eq(planEntries.planId, id))
      .orderBy(asc(planEntries.year), asc(planEntries.term), asc(planEntries.position));

    // Group entries by [year][term]
    const grouped: Record<string, Record<string, EntryRow[]>> = {};
    for (const entry of entries) {
      const yearKey = String(entry.year);
      const termKey = entry.term;
      if (!grouped[yearKey]) grouped[yearKey] = {};
      if (!grouped[yearKey][termKey]) grouped[yearKey][termKey] = [];
      grouped[yearKey][termKey].push({
        id: entry.id,
        planId: entry.planId,
        courseId: entry.courseId,
        year: entry.year,
        term: entry.term,
        status: entry.status,
        position: entry.position,
      });
    }

    const result: PlanWithEntries = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      entries: grouped,
    };

    res.json(result);
  } catch (err) {
    console.error("GET /plans/:id error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// PUT /api/v1/plans/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body as { name?: string; description?: string };

    const updates: Partial<{ name: string; description: string | null; updatedAt: Date }> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const [updated] = await db
      .update(plans)
      .set(updates)
      .where(eq(plans.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" } satisfies ApiError);
    }

    res.status(204).send();
  } catch (err) {
    console.error("PUT /plans/:id error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// DELETE /api/v1/plans/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(plans).where(eq(plans.id, id)).returning();

    if (!deleted) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" } satisfies ApiError);
    }

    await invalidateValidation(id);
    res.json(deleted);
  } catch (err) {
    console.error("DELETE /plans/:id error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// POST /api/v1/plans/:id/entries
router.post("/:id/entries", async (req, res) => {
  try {
    const { id } = req.params;
    const { courseId, year, term, status, position } = req.body as {
      courseId?: string;
      year?: number;
      term?: string;
      status?: string;
      position?: number;
    };

    // Validate plan exists
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    if (!plan) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" } satisfies ApiError);
    }

    // Validate required fields
    if (!courseId || year === undefined || !term) {
      return res.status(400).json({
        error: "validation_error",
        message: "courseId, year, and term are required",
      } satisfies ApiError);
    }

    // Validate course exists
    const [course] = await db.select().from(courses).where(eq(courses.id, courseId.toUpperCase()));
    if (!course) {
      return res.status(400).json({
        error: "validation_error",
        message: `Course ${courseId} not found`,
      } satisfies ApiError);
    }

    // Validate term value
    if (!["W1", "W2", "S"].includes(term)) {
      return res.status(400).json({
        error: "validation_error",
        message: "term must be one of W1, W2, S",
      } satisfies ApiError);
    }

    // Validate year range
    if (year < 1 || year > 5) {
      return res.status(400).json({
        error: "validation_error",
        message: "year must be between 1 and 5",
      } satisfies ApiError);
    }

    const validStatuses = ["planned", "completed", "failed", "in_progress"];
    const entryStatus = status && validStatuses.includes(status) ? status : "planned";

    // Compute position if not given
    let entryPosition = position ?? 0;
    if (position === undefined) {
      const [maxPos] = await db
        .select({ max: sql<number>`coalesce(max(${planEntries.position}), -1)` })
        .from(planEntries)
        .where(eq(planEntries.planId, id));
      entryPosition = (maxPos?.max ?? -1) + 1;
    }

    const [entry] = await db
      .insert(planEntries)
      .values({
        planId: id,
        courseId: courseId.toUpperCase(),
        year,
        term,
        status: entryStatus,
        position: entryPosition,
      })
      .returning();

    await enqueueValidation(id);
    res.status(201).json(entry);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "23505") {
      return res.status(409).json({
        error: "conflict",
        message: "Course already exists in this plan",
      } satisfies ApiError);
    }
    console.error("POST /plans/:id/entries error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// PUT /api/v1/plans/:id/entries/reorder
router.put("/:id/entries/reorder", async (req, res) => {
  try {
    const { id } = req.params;
    const { positions } = req.body as { positions?: Array<{ entryId: string; position: number }> };

    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({
        error: "validation_error",
        message: "positions array is required",
      } satisfies ApiError);
    }

    // Batch update positions
    await Promise.all(
      positions.map(({ entryId, position }) =>
        db
          .update(planEntries)
          .set({ position, updatedAt: new Date() })
          .where(eq(planEntries.id, entryId))
      )
    );

    res.status(204).send();
  } catch (err) {
    console.error("PUT /plans/:id/entries/reorder error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// PUT /api/v1/plans/:id/entries/:entryId
router.put("/:id/entries/:entryId", async (req, res) => {
  try {
    const { id, entryId } = req.params;
    const { year, term, status, position } = req.body as {
      year?: number;
      term?: string;
      status?: string;
      position?: number;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (year !== undefined) updates.year = year;
    if (term !== undefined) updates.term = term;
    if (status !== undefined) updates.status = status;
    if (position !== undefined) updates.position = position;

    const [updated] = await db
      .update(planEntries)
      .set(updates)
      .where(eq(planEntries.id, entryId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "not_found", message: "Entry not found" } satisfies ApiError);
    }

    await enqueueValidation(id);
    res.status(204).send();
  } catch (err) {
    console.error("PUT /plans/:id/entries/:entryId error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// DELETE /api/v1/plans/:id/entries/:entryId
router.delete("/:id/entries/:entryId", async (req, res) => {
  try {
    const { id, entryId } = req.params;
    const [deleted] = await db
      .delete(planEntries)
      .where(eq(planEntries.id, entryId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "not_found", message: "Entry not found" } satisfies ApiError);
    }

    await invalidateValidation(id);
    res.json(deleted);
  } catch (err) {
    console.error("DELETE /plans/:id/entries/:entryId error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// GET /api/v1/plans/:id/validate
router.get("/:id/validate", async (req, res) => {
  try {
    const { id } = req.params;

    // Check plan exists
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    if (!plan) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" } satisfies ApiError);
    }

    // Try cache first
    const cached = await getCachedValidation(id);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Cache miss: compute synchronously and cache
    const result = await validatePlan(id);
    await setCachedValidation(id, result);

    res.json({ ...result, cached: false });
  } catch (err) {
    console.error("GET /plans/:id/validate error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

export default router;
