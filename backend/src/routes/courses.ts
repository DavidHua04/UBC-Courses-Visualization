import { Router } from "express";
import { courseService } from "../container";
import type { ApiError } from "../dataModel";

const router = Router();

// GET /api/v1/courses
router.get("/", async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const dept = req.query.dept as string | undefined;
    const level = req.query.level as string | undefined;
    const search = req.query.q as string | undefined;

    const result = await courseService.list({ dept, level, search, offset, limit });

    res.json({
      data: result.data,
      pagination: { offset, limit, total: result.total },
    });
  } catch (err) {
    console.error("GET /courses error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// GET /api/v1/courses/:id
router.get("/:id", async (req, res) => {
  try {
    const course = await courseService.getById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "not_found", message: "Course not found" } satisfies ApiError);
    }

    res.json(course);
  } catch (err) {
    console.error("GET /courses/:id error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

export default router;
