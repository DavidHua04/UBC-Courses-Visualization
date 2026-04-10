import { Router } from "express";
import { planService, validationService, courseService } from "../container";
import type { ApiError } from "../models/types";

const router = Router();

// GET /api/v1/plans
router.get("/", async (_req, res) => {
  try {
    const plans = await planService.list();
    res.json(plans);
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

    const plan = await planService.create(name.trim(), description);
    res.status(201).json(plan);
  } catch (err) {
    console.error("POST /plans error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// GET /api/v1/plans/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await planService.getWithEntries(req.params.id);

    if (!result) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" } satisfies ApiError);
    }

    res.json(result);
  } catch (err) {
    console.error("GET /plans/:id error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// PUT /api/v1/plans/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, description } = req.body as { name?: string; description?: string };
    const updated = await planService.update(req.params.id, { name, description });

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
    const deleted = await planService.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" } satisfies ApiError);
    }

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
    const { courseId, year, term, status } = req.body as {
      courseId?: string;
      year?: number;
      term?: string;
      status?: string;
    };

    // Validate plan exists
    const plan = await planService.getById(id);
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
    const course = await courseService.getById(courseId);
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

    const entry = await planService.addEntry(id, {
      courseId,
      year,
      term,
      status: entryStatus,
    });

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
    const { positions } = req.body as { positions?: Array<{ entryId: string; position: number }> };

    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({
        error: "validation_error",
        message: "positions array is required",
      } satisfies ApiError);
    }

    await planService.reorderEntries(positions);
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

    const updated = await planService.updateEntry(id, entryId, {
      year,
      term,
      status,
      position,
    });

    if (!updated) {
      return res.status(404).json({ error: "not_found", message: "Entry not found" } satisfies ApiError);
    }

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
    const deleted = await planService.deleteEntry(id, entryId);

    if (!deleted) {
      return res.status(404).json({ error: "not_found", message: "Entry not found" } satisfies ApiError);
    }

    res.json(deleted);
  } catch (err) {
    console.error("DELETE /plans/:id/entries/:entryId error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// GET /api/v1/plans/:id/validate
router.get("/:id/validate", async (req, res) => {
  try {
    const plan = await planService.getById(req.params.id);
    if (!plan) {
      return res.status(404).json({ error: "not_found", message: "Plan not found" } satisfies ApiError);
    }

    const result = await validationService.validate(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("GET /plans/:id/validate error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

export default router;
