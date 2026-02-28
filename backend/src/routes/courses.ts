import { Router } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import { courses } from "../db/schema";
import { enqueueSeed } from "../services/queue";
import type { ApiError } from "../models/types";

const router = Router();

// GET /api/v1/courses
// Query params: offset, limit, dept, level, q (search)
router.get("/", async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const dept = req.query.dept as string | undefined;
    const level = req.query.level as string | undefined;
    const q = req.query.q as string | undefined;

    const conditions = [];

    if (dept) {
      conditions.push(eq(courses.dept, dept.toUpperCase()));
    }

    if (level) {
      const levelNum = parseInt(level);
      if (!isNaN(levelNum)) {
        // Level filter: match courses where code starts with that digit (e.g., level=3 → 3xx)
        conditions.push(ilike(courses.code, `${levelNum}%`));
      }
    }

    if (q) {
      conditions.push(
        or(
          ilike(courses.title, `%${q}%`),
          ilike(courses.id, `%${q}%`),
          ilike(courses.description, `%${q}%`)
        )
      );
    }

    const whereClause =
      conditions.length > 0
        ? conditions.length === 1
          ? conditions[0]
          : conditions.reduce((acc, cond) => sql`${acc} AND ${cond}`)
        : undefined;

    const [rows, countResult] = await Promise.all([
      whereClause
        ? db.select().from(courses).where(whereClause).limit(limit).offset(offset)
        : db.select().from(courses).limit(limit).offset(offset),
      whereClause
        ? db.select({ count: sql<number>`count(*)` }).from(courses).where(whereClause)
        : db.select({ count: sql<number>`count(*)` }).from(courses),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    res.json({
      data: rows.map(mapCourseRow),
      pagination: { offset, limit, total },
    });
  } catch (err) {
    console.error("GET /courses error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// GET /api/v1/courses/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [course] = await db.select().from(courses).where(eq(courses.id, id.toUpperCase()));

    if (!course) {
      return res.status(404).json({ error: "not_found", message: "Course not found" } satisfies ApiError);
    }

    res.json(mapCourseRow(course));
  } catch (err) {
    console.error("GET /courses/:id error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

// POST /api/v1/courses/seed
router.post("/seed", async (_req, res) => {
  try {
    const { jobId } = await enqueueSeed();
    res.status(202).json({ message: "Seed job enqueued", jobId });
  } catch (err) {
    console.error("POST /courses/seed error:", err);
    res.status(500).json({ error: "internal_error" } satisfies ApiError);
  }
});

function mapCourseRow(course: typeof courses.$inferSelect) {
  return {
    id: course.id,
    dept: course.dept,
    code: course.code,
    title: course.title,
    credits: course.credits,
    description: course.description,
    prerequisites: course.prerequisites,
    corequisites: course.corequisites,
    termsOffered: course.termsOffered,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

export default router;
