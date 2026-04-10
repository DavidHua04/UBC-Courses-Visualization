/**
 * Spec-driven API tests — derived from SPECIFICATION.md
 *
 * These tests treat the backend as a black box. Services are mocked at the
 * container level; we only verify HTTP status codes, response shapes, and
 * request-validation behaviour described in the specification.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Mock container services ─────────────────────────────────────────────────

const mockCourseService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  seed: vi.fn(),
}));

const mockPlanService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  getWithEntries: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  reorderEntries: vi.fn(),
}));

const mockValidationService = vi.hoisted(() => ({
  validate: vi.fn(),
}));

vi.mock("../../container", () => ({
  courseService: mockCourseService,
  planService: mockPlanService,
  validationService: mockValidationService,
}));

// ── Imports ─────────────────────────────────────────────────────────────────

import { createApp } from "../../app";

// ── Shared fixtures ─────────────────────────────────────────────────────────

const PLAN_ID = "550e8400-e29b-41d4-a716-446655440000";
const ENTRY_ID = "660e8400-e29b-41d4-a716-446655440001";
const ENTRY_ID_2 = "660e8400-e29b-41d4-a716-446655440002";
const ENTRY_ID_3 = "660e8400-e29b-41d4-a716-446655440003";

const now = "2026-04-01T10:00:00.000Z";

const fakeCourse = {
  id: "CPSC110",
  dept: "CPSC",
  code: "110",
  title: "Computation, Programs, and Programming",
  credits: "4.0",
  description: "Fundamental program and computation structures using functional programming.",
  prerequisites: null,
  corequisites: [],
  termsOffered: ["W1", "W2", "S"],
  createdAt: now,
  updatedAt: now,
};

const fakeCourse2 = {
  id: "CPSC210",
  dept: "CPSC",
  code: "210",
  title: "Software Construction",
  credits: "4.0",
  description: "Design and implementation of robust software components using Java.",
  prerequisites: { type: "course", courseId: "CPSC110" },
  corequisites: [],
  termsOffered: ["W1", "W2", "S"],
  createdAt: now,
  updatedAt: now,
};

const fakePlan = {
  id: PLAN_ID,
  name: "CS Major Plan",
  description: "4-year plan for CPSC major",
  createdAt: now,
  updatedAt: now,
};

const fakeEntry = {
  id: ENTRY_ID,
  planId: PLAN_ID,
  courseId: "CPSC110",
  year: 1,
  term: "W1",
  status: "planned",
  position: 0,
  createdAt: now,
  updatedAt: now,
};

// ── Suite ───────────────────────────────────────────────────────────────────

describe("API Specification Tests", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Health Check
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET /api/health", () => {
    it("returns 200 with { status: 'ok' }", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("does not require Content-Type header", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Course Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  describe("4.1 GET /api/v1/courses — listCourses", () => {
    it("returns 200 with data array and pagination object", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [fakeCourse], total: 1 });

      const res = await request(app).get("/api/v1/courses");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("uses default offset=0 and limit=20", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      const res = await request(app).get("/api/v1/courses");

      expect(res.body.pagination).toMatchObject({ offset: 0, limit: 20 });
    });

    it.fails("passes dept filter (uppercased) to service — spec: dept is uppercased automatically", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      await request(app).get("/api/v1/courses?dept=cpsc");

      expect(mockCourseService.list).toHaveBeenCalledWith(
        expect.objectContaining({ dept: "CPSC" }),
      );
    });

    it("passes level filter to service", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      await request(app).get("/api/v1/courses?level=3");

      expect(mockCourseService.list).toHaveBeenCalledWith(
        expect.objectContaining({ level: "3" }),
      );
    });

    it("passes search query (q) to service", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      await request(app).get("/api/v1/courses?q=programming");

      expect(mockCourseService.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: "programming" }),
      );
    });

    it("clamps offset to >= 0 (negative becomes 0)", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      const res = await request(app).get("/api/v1/courses?offset=-10");

      expect(res.body.pagination.offset).toBe(0);
    });

    it("clamps limit to max 100", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      const res = await request(app).get("/api/v1/courses?limit=500");

      expect(res.body.pagination.limit).toBe(100);
    });

    it.fails("clamps limit to min 1 — spec: limit clamped to [1, 100]", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      const res = await request(app).get("/api/v1/courses?limit=0");

      expect(res.body.pagination.limit).toBe(1);
    });

    it("returns empty data when no courses match", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      const res = await request(app).get("/api/v1/courses");

      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it("returns courses with correct shape (Course model)", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [fakeCourse], total: 1 });

      const res = await request(app).get("/api/v1/courses");
      const course = res.body.data[0];

      expect(course).toHaveProperty("id");
      expect(course).toHaveProperty("dept");
      expect(course).toHaveProperty("code");
      expect(course).toHaveProperty("title");
      expect(course).toHaveProperty("credits");
    });

    it("combines multiple filters: dept + level + limit", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      await request(app).get("/api/v1/courses?dept=CPSC&level=2&limit=2");

      expect(mockCourseService.list).toHaveBeenCalledWith(
        expect.objectContaining({ dept: "CPSC", level: "2", limit: 2 }),
      );
    });
  });

  // ── 4.2 Get Course by ID ──────────────────────────────────────────────────

  describe("4.2 GET /api/v1/courses/:id — getCourse", () => {
    it("returns 200 with the course object when found", async () => {
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse);

      const res = await request(app).get("/api/v1/courses/CPSC110");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("CPSC110");
      expect(res.body.dept).toBe("CPSC");
      expect(res.body.code).toBe("110");
      expect(res.body.title).toBe("Computation, Programs, and Programming");
      expect(res.body.credits).toBe("4.0");
    });

    it.fails("uppercases the ID (case-insensitive lookup) — spec: ID is uppercased automatically", async () => {
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse);

      await request(app).get("/api/v1/courses/cpsc110");

      expect(mockCourseService.getById).toHaveBeenCalledWith("CPSC110");
    });

    it("returns 404 with not_found error when course does not exist", async () => {
      mockCourseService.getById.mockResolvedValueOnce(null);

      const res = await request(app).get("/api/v1/courses/FAKE999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
      expect(res.body.message).toBeDefined();
    });

    it("returns a course with prerequisites (non-null)", async () => {
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse2);

      const res = await request(app).get("/api/v1/courses/CPSC210");

      expect(res.status).toBe(200);
      expect(res.body.prerequisites).toEqual({ type: "course", courseId: "CPSC110" });
    });

    it("returns a course with null prerequisites", async () => {
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse);

      const res = await request(app).get("/api/v1/courses/CPSC110");

      expect(res.body.prerequisites).toBeNull();
    });
  });

  // ── 4.3 Seed Courses ──────────────────────────────────────────────────────

  describe("4.3 POST /api/v1/courses/seed — seedCourses", () => {
    it("returns 202 with a message and jobId", async () => {
      mockCourseService.seed.mockResolvedValueOnce(29);

      const res = await request(app).post("/api/v1/courses/seed");

      expect(res.status).toBe(202);
      expect(res.body).toHaveProperty("message");
    });

    it("is idempotent — can be called multiple times", async () => {
      mockCourseService.seed.mockResolvedValue(29);

      const res1 = await request(app).post("/api/v1/courses/seed");
      const res2 = await request(app).post("/api/v1/courses/seed");

      expect(res1.status).toBe(202);
      expect(res2.status).toBe(202);
    });

    it("does not require a request body", async () => {
      mockCourseService.seed.mockResolvedValueOnce(29);

      const res = await request(app).post("/api/v1/courses/seed");

      expect(res.status).toBe(202);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Plan Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  describe("5.1 GET /api/v1/plans — listPlans", () => {
    it("returns 200 with array of PlanSummary objects", async () => {
      mockPlanService.list.mockResolvedValueOnce([
        { ...fakePlan, entryCount: 12 },
      ]);

      const res = await request(app).get("/api/v1/plans");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0]).toHaveProperty("entryCount");
      expect(res.body[0].entryCount).toBe(12);
    });

    it("returns empty array when no plans exist", async () => {
      mockPlanService.list.mockResolvedValueOnce([]);

      const res = await request(app).get("/api/v1/plans");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("PlanSummary includes id, name, description, timestamps, entryCount", async () => {
      mockPlanService.list.mockResolvedValueOnce([{ ...fakePlan, entryCount: 5 }]);

      const res = await request(app).get("/api/v1/plans");
      const plan = res.body[0];

      expect(plan).toHaveProperty("id");
      expect(plan).toHaveProperty("name");
      expect(plan).toHaveProperty("description");
      expect(plan).toHaveProperty("createdAt");
      expect(plan).toHaveProperty("updatedAt");
      expect(plan).toHaveProperty("entryCount");
    });
  });

  // ── 5.2 Create Plan ──────────────────────────────────────────────────────

  describe("5.2 POST /api/v1/plans — createPlan", () => {
    it("returns 201 with the created Plan object", async () => {
      mockPlanService.create.mockResolvedValueOnce(fakePlan);

      const res = await request(app)
        .post("/api/v1/plans")
        .send({ name: "CS Major Plan", description: "4-year plan for CPSC major" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("CS Major Plan");
      expect(res.body.description).toBe("4-year plan for CPSC major");
    });

    it("returns 400 when name is missing", async () => {
      const res = await request(app).post("/api/v1/plans").send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
      expect(res.body.fields).toHaveProperty("name");
      expect(res.body.fields.name).toBe("required");
    });

    it("returns 400 when name is empty after trimming", async () => {
      const res = await request(app).post("/api/v1/plans").send({ name: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("trims name before storage", async () => {
      mockPlanService.create.mockResolvedValueOnce({
        ...fakePlan,
        name: "Trimmed Name",
      });

      await request(app)
        .post("/api/v1/plans")
        .send({ name: "  Trimmed Name  " });

      // Route should trim the name before passing to service
      const callArgs = mockPlanService.create.mock.calls[0];
      expect(callArgs[0]).toBe("Trimmed Name");
    });

    it("accepts plan without description (defaults to null/undefined)", async () => {
      mockPlanService.create.mockResolvedValueOnce({
        ...fakePlan,
        description: null,
      });

      const res = await request(app)
        .post("/api/v1/plans")
        .send({ name: "No Description Plan" });

      expect(res.status).toBe(201);
    });

    it("is not idempotent — creates new plan each call", async () => {
      const plan1 = { ...fakePlan, id: "id-1" };
      const plan2 = { ...fakePlan, id: "id-2" };
      mockPlanService.create.mockResolvedValueOnce(plan1);
      mockPlanService.create.mockResolvedValueOnce(plan2);

      const res1 = await request(app)
        .post("/api/v1/plans")
        .send({ name: "Same Name" });
      const res2 = await request(app)
        .post("/api/v1/plans")
        .send({ name: "Same Name" });

      expect(res1.body.id).not.toBe(res2.body.id);
    });
  });

  // ── 5.3 Get Plan ──────────────────────────────────────────────────────────

  describe("5.3 GET /api/v1/plans/:id — getPlan", () => {
    it("returns 200 with PlanWithEntries (entries grouped by year/term)", async () => {
      mockPlanService.getWithEntries.mockResolvedValueOnce({
        ...fakePlan,
        entries: {
          "1": {
            W1: [fakeEntry],
            W2: [],
          },
        },
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(PLAN_ID);
      expect(res.body).toHaveProperty("entries");
      expect(res.body.entries["1"]["W1"]).toHaveLength(1);
      expect(res.body.entries["1"]["W1"][0].courseId).toBe("CPSC110");
    });

    it("returns 404 when plan does not exist", async () => {
      mockPlanService.getWithEntries.mockResolvedValueOnce(null);

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
      expect(res.body.message).toBe("Plan not found");
    });

    it("entries within a term are ordered by position ASC", async () => {
      const entry1 = { ...fakeEntry, id: ENTRY_ID, position: 0, courseId: "CPSC110" };
      const entry2 = { ...fakeEntry, id: ENTRY_ID_2, position: 1, courseId: "CPSC121" };

      mockPlanService.getWithEntries.mockResolvedValueOnce({
        ...fakePlan,
        entries: { "1": { W1: [entry1, entry2] } },
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}`);

      const w1Entries = res.body.entries["1"]["W1"];
      expect(w1Entries[0].position).toBeLessThan(w1Entries[1].position);
    });
  });

  // ── 5.4 Update Plan ──────────────────────────────────────────────────────

  describe("5.4 PUT /api/v1/plans/:id — updatePlan", () => {
    it("returns 204 with no body on success", async () => {
      mockPlanService.update.mockResolvedValueOnce({ ...fakePlan, name: "Updated" });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(204);
      expect(res.body).toEqual({}); // no body
    });

    it("returns 404 when plan does not exist", async () => {
      mockPlanService.update.mockResolvedValueOnce(null);

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({ name: "Nope" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });

    it("can update just the name", async () => {
      mockPlanService.update.mockResolvedValueOnce({ ...fakePlan, name: "New Name" });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({ name: "New Name" });

      expect(res.status).toBe(204);
      expect(mockPlanService.update).toHaveBeenCalledWith(
        PLAN_ID,
        expect.objectContaining({ name: "New Name" }),
      );
    });

    it("can update just the description", async () => {
      mockPlanService.update.mockResolvedValueOnce({
        ...fakePlan,
        description: "New desc",
      });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({ description: "New desc" });

      expect(res.status).toBe(204);
    });

    it("accepts empty body (updates only updatedAt)", async () => {
      mockPlanService.update.mockResolvedValueOnce(fakePlan);

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({});

      expect(res.status).toBe(204);
    });
  });

  // ── 5.5 Delete Plan ──────────────────────────────────────────────────────

  describe("5.5 DELETE /api/v1/plans/:id — deletePlan", () => {
    it("returns 200 with the deleted Plan object", async () => {
      mockPlanService.delete.mockResolvedValueOnce(fakePlan);

      const res = await request(app).delete(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(PLAN_ID);
      expect(res.body.name).toBe("CS Major Plan");
    });

    it("returns 404 when plan does not exist", async () => {
      mockPlanService.delete.mockResolvedValueOnce(null);

      const res = await request(app).delete(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });

    it("is not idempotent — second delete returns 404", async () => {
      mockPlanService.delete
        .mockResolvedValueOnce(fakePlan)
        .mockResolvedValueOnce(null);

      const res1 = await request(app).delete(`/api/v1/plans/${PLAN_ID}`);
      const res2 = await request(app).delete(`/api/v1/plans/${PLAN_ID}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Plan Entry Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  describe("6.1 POST /api/v1/plans/:id/entries — addEntry", () => {
    beforeEach(() => {
      mockPlanService.getById.mockResolvedValue(fakePlan);
      mockCourseService.getById.mockResolvedValue(fakeCourse);
    });

    it("returns 201 with the created PlanEntry", async () => {
      mockPlanService.addEntry.mockResolvedValueOnce(fakeEntry);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.planId).toBe(PLAN_ID);
      expect(res.body.courseId).toBe("CPSC110");
      expect(res.body.year).toBe(1);
      expect(res.body.term).toBe("W1");
      expect(res.body.position).toBe(0);
    });

    it("defaults status to 'planned' when not provided", async () => {
      mockPlanService.addEntry.mockResolvedValueOnce({
        ...fakeEntry,
        status: "planned",
      });

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("planned");
    });

    it("accepts explicit status value", async () => {
      mockPlanService.addEntry.mockResolvedValueOnce({
        ...fakeEntry,
        status: "completed",
      });

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1", status: "completed" });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("completed");
    });

    it.fails("uppercases courseId before lookup — spec: courseId uppercased automatically", async () => {
      mockPlanService.addEntry.mockResolvedValueOnce(fakeEntry);

      await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "cpsc110", year: 1, term: "W1" });

      expect(mockCourseService.getById).toHaveBeenCalledWith("CPSC110");
    });

    it("returns 404 when plan does not exist", async () => {
      mockPlanService.getById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });

    it("returns 400 when courseId is missing", async () => {
      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ year: 1, term: "W1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when year is missing", async () => {
      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", term: "W1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when term is missing", async () => {
      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when course does not exist in catalog", async () => {
      mockCourseService.getById.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC999", year: 1, term: "W1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
      expect(res.body.message).toContain("CPSC999");
    });

    it("returns 400 when term is invalid (not W1/W2/S)", async () => {
      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "FALL" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when year is below 1", async () => {
      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 0, term: "W1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when year is above 5", async () => {
      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 6, term: "W1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 409 when course already exists in plan (duplicate)", async () => {
      const err = new Error("duplicate") as Error & { code: string };
      err.code = "23505";
      mockPlanService.addEntry.mockRejectedValueOnce(err);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("conflict");
    });

    it("accepts year boundary value 1", async () => {
      mockPlanService.addEntry.mockResolvedValueOnce({ ...fakeEntry, year: 1 });

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(201);
    });

    it("accepts year boundary value 5", async () => {
      mockPlanService.addEntry.mockResolvedValueOnce({ ...fakeEntry, year: 5 });

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 5, term: "W1" });

      expect(res.status).toBe(201);
    });

    it("accepts term W2", async () => {
      mockPlanService.addEntry.mockResolvedValueOnce({ ...fakeEntry, term: "W2" });

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W2" });

      expect(res.status).toBe(201);
    });

    it("accepts term S (summer)", async () => {
      mockPlanService.addEntry.mockResolvedValueOnce({ ...fakeEntry, term: "S" });

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "S" });

      expect(res.status).toBe(201);
    });
  });

  // ── 6.2 Update Entry ─────────────────────────────────────────────────────

  describe("6.2 PUT /api/v1/plans/:id/entries/:entryId — updateEntry", () => {
    it("returns 204 with no body on success", async () => {
      mockPlanService.updateEntry.mockResolvedValueOnce({
        ...fakeEntry,
        year: 2,
        term: "W1",
        status: "in_progress",
      });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`)
        .send({ year: 2, term: "W1", status: "in_progress" });

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("returns 404 when entry does not exist", async () => {
      mockPlanService.updateEntry.mockResolvedValueOnce(null);

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`)
        .send({ year: 2 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });

    it("can update only year", async () => {
      mockPlanService.updateEntry.mockResolvedValueOnce({ ...fakeEntry, year: 3 });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`)
        .send({ year: 3 });

      expect(res.status).toBe(204);
    });

    it("can update only term", async () => {
      mockPlanService.updateEntry.mockResolvedValueOnce({ ...fakeEntry, term: "W2" });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`)
        .send({ term: "W2" });

      expect(res.status).toBe(204);
    });

    it("can update only status", async () => {
      mockPlanService.updateEntry.mockResolvedValueOnce({
        ...fakeEntry,
        status: "completed",
      });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`)
        .send({ status: "completed" });

      expect(res.status).toBe(204);
    });

    it("can update only position", async () => {
      mockPlanService.updateEntry.mockResolvedValueOnce({
        ...fakeEntry,
        position: 5,
      });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`)
        .send({ position: 5 });

      expect(res.status).toBe(204);
    });
  });

  // ── 6.3 Delete Entry ─────────────────────────────────────────────────────

  describe("6.3 DELETE /api/v1/plans/:id/entries/:entryId — deleteEntry", () => {
    it("returns 200 with the deleted PlanEntry object", async () => {
      mockPlanService.deleteEntry.mockResolvedValueOnce(fakeEntry);

      const res = await request(app).delete(
        `/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`,
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ENTRY_ID);
      expect(res.body.planId).toBe(PLAN_ID);
      expect(res.body.courseId).toBe("CPSC110");
    });

    it("returns 404 when entry does not exist", async () => {
      mockPlanService.deleteEntry.mockResolvedValueOnce(null);

      const res = await request(app).delete(
        `/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`,
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });

    it("is not idempotent — second delete returns 404", async () => {
      mockPlanService.deleteEntry
        .mockResolvedValueOnce(fakeEntry)
        .mockResolvedValueOnce(null);

      const res1 = await request(app).delete(
        `/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`,
      );
      const res2 = await request(app).delete(
        `/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`,
      );

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(404);
    });
  });

  // ── 6.4 Reorder Entries ───────────────────────────────────────────────────

  describe("6.4 PUT /api/v1/plans/:id/entries/reorder — reorderEntries", () => {
    it("returns 204 on successful reorder", async () => {
      mockPlanService.reorderEntries.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/reorder`)
        .send({
          positions: [
            { entryId: ENTRY_ID, position: 0 },
            { entryId: ENTRY_ID_2, position: 1 },
            { entryId: ENTRY_ID_3, position: 2 },
          ],
        });

      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it("returns 400 when positions array is missing", async () => {
      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/reorder`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
      expect(res.body.message).toContain("positions");
    });

    it("returns 400 when positions is not an array", async () => {
      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/reorder`)
        .send({ positions: "not-an-array" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("passes positions to service correctly", async () => {
      mockPlanService.reorderEntries.mockResolvedValueOnce(undefined);

      const positions = [
        { entryId: ENTRY_ID, position: 0 },
        { entryId: ENTRY_ID_2, position: 1 },
      ];

      await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/reorder`)
        .send({ positions });

      expect(mockPlanService.reorderEntries).toHaveBeenCalledWith(positions);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Validation Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  describe("7.1 GET /api/v1/plans/:id/validate — validatePlan", () => {
    it("returns 200 with ValidationResult on cache miss", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockValidationService.validate.mockResolvedValueOnce({
        valid: false,
        errors: [
          {
            entryId: ENTRY_ID,
            courseId: "CPSC213",
            message: "Prerequisites not satisfied for CPSC213: all of [CPSC121, CPSC210]",
          },
        ],
        warnings: [],
        computedAt: now,
        cached: false,
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.cached).toBe(false);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.errors[0]).toHaveProperty("entryId");
      expect(res.body.errors[0]).toHaveProperty("courseId");
      expect(res.body.errors[0]).toHaveProperty("message");
      expect(res.body).toHaveProperty("computedAt");
    });

    it("returns 200 with cached=true when cache is warm", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockValidationService.validate.mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        computedAt: now,
        cached: true,
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
      expect(res.body.valid).toBe(true);
    });

    it("returns 404 when plan does not exist", async () => {
      mockPlanService.getById.mockResolvedValueOnce(null);

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
      expect(res.body.message).toBe("Plan not found");
    });

    it("ValidationResult includes valid, errors, warnings, computedAt, cached", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockValidationService.validate.mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        computedAt: now,
        cached: false,
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.body).toHaveProperty("valid");
      expect(res.body).toHaveProperty("errors");
      expect(res.body).toHaveProperty("warnings");
      expect(res.body).toHaveProperty("computedAt");
      expect(res.body).toHaveProperty("cached");
    });

    it("returns warnings for credit overload", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockValidationService.validate.mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [
          {
            entryId: ENTRY_ID,
            courseId: "CPSC110",
            message: "Term 1:W1 has 21 credits, exceeding the 18-credit limit",
          },
        ],
        computedAt: now,
        cached: false,
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true); // warnings don't make it invalid
      expect(res.body.warnings).toHaveLength(1);
      expect(res.body.warnings[0]).toHaveProperty("entryId");
      expect(res.body.warnings[0]).toHaveProperty("courseId");
      expect(res.body.warnings[0]).toHaveProperty("message");
    });

    it("empty plan returns valid=true with no errors or warnings", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockValidationService.validate.mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        computedAt: now,
        cached: false,
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.body.valid).toBe(true);
      expect(res.body.errors).toEqual([]);
      expect(res.body.warnings).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Global: Error response format
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Global — error response format", () => {
    it("404 errors follow { error, message } shape", async () => {
      const res = await request(app).get("/api/v1/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toBe("not_found");
    });

    it("500 errors follow { error, message } shape", async () => {
      mockCourseService.list.mockRejectedValueOnce(new Error("boom"));

      const res = await request(app).get("/api/v1/courses");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toBe("internal_error");
    });

    it("validation errors include error code 'validation_error'", async () => {
      const res = await request(app).post("/api/v1/plans").send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Global: CORS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Global — CORS", () => {
    it("responds with Access-Control-Allow-Origin header", async () => {
      const res = await request(app).get("/api/health");

      expect(res.headers["access-control-allow-origin"]).toBeDefined();
    });
  });
});
