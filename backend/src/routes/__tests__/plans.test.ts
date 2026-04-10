import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Mock container services ──────────────────────────────────────────────────

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

// ── Imports ──────────────────────────────────────────────────────────────────

import { createApp } from "../../app";

// ── Test data ────────────────────────────────────────────────────────────────

const PLAN_ID = "550e8400-e29b-41d4-a716-446655440000";
const ENTRY_ID = "660e8400-e29b-41d4-a716-446655440001";

const fakePlan = {
  id: PLAN_ID,
  name: "My CS Plan",
  description: "4-year plan",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const fakeCourse = {
  id: "CPSC110",
  dept: "CPSC",
  code: "110",
  title: "Computation, Programs, and Programming",
  credits: "4.0",
  description: null,
  prerequisites: null,
  corequisites: [],
  termsOffered: ["W1", "W2"],
};

const fakeEntry = {
  id: ENTRY_ID,
  planId: PLAN_ID,
  courseId: "CPSC110",
  year: 1,
  term: "W1",
  status: "planned",
  position: 0,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Plans routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();

    // Default stubs
    mockPlanService.list.mockResolvedValue([]);
    mockPlanService.getById.mockResolvedValue(null);
    mockPlanService.getWithEntries.mockResolvedValue(null);
    mockValidationService.validate.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      computedAt: new Date().toISOString(),
      cached: false,
    });
  });

  // ── GET /api/v1/plans ───────────────────────────────────────────────────

  describe("GET /api/v1/plans", () => {
    it("returns list of plans", async () => {
      mockPlanService.list.mockResolvedValueOnce([{ ...fakePlan, entryCount: 3 }]);

      const res = await request(app).get("/api/v1/plans");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(PLAN_ID);
    });

    it("returns empty array when no plans exist", async () => {
      mockPlanService.list.mockResolvedValueOnce([]);

      const res = await request(app).get("/api/v1/plans");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── POST /api/v1/plans ──────────────────────────────────────────────────

  describe("POST /api/v1/plans", () => {
    it("creates a plan and returns 201", async () => {
      mockPlanService.create.mockResolvedValueOnce(fakePlan);

      const res = await request(app)
        .post("/api/v1/plans")
        .send({ name: "My CS Plan", description: "4-year plan" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(PLAN_ID);
      expect(res.body.name).toBe("My CS Plan");
    });

    it("returns 400 when name is missing", async () => {
      const res = await request(app).post("/api/v1/plans").send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
      expect(res.body.fields?.name).toBe("required");
    });

    it("returns 400 when name is an empty string", async () => {
      const res = await request(app).post("/api/v1/plans").send({ name: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });
  });

  // ── GET /api/v1/plans/:id ───────────────────────────────────────────────

  describe("GET /api/v1/plans/:id", () => {
    it("returns plan with grouped entries", async () => {
      mockPlanService.getWithEntries.mockResolvedValueOnce({
        ...fakePlan,
        entries: { "1": { W1: [fakeEntry] } },
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(PLAN_ID);
      expect(res.body.entries["1"]["W1"]).toHaveLength(1);
      expect(res.body.entries["1"]["W1"][0].courseId).toBe("CPSC110");
    });

    it("returns 404 when plan not found", async () => {
      mockPlanService.getWithEntries.mockResolvedValueOnce(null);

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── PUT /api/v1/plans/:id ───────────────────────────────────────────────

  describe("PUT /api/v1/plans/:id", () => {
    it("updates a plan and returns 204", async () => {
      mockPlanService.update.mockResolvedValueOnce({ ...fakePlan, name: "Updated" });

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(204);
    });

    it("returns 404 when plan not found", async () => {
      mockPlanService.update.mockResolvedValueOnce(null);

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── DELETE /api/v1/plans/:id ────────────────────────────────────────────

  describe("DELETE /api/v1/plans/:id", () => {
    it("deletes a plan", async () => {
      mockPlanService.delete.mockResolvedValueOnce(fakePlan);

      const res = await request(app).delete(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(PLAN_ID);
    });

    it("returns 404 when plan not found", async () => {
      mockPlanService.delete.mockResolvedValueOnce(null);

      const res = await request(app).delete(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── POST /api/v1/plans/:id/entries ──────────────────────────────────────

  describe("POST /api/v1/plans/:id/entries", () => {
    it("adds a course entry", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse);
      mockPlanService.addEntry.mockResolvedValueOnce(fakeEntry);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(201);
      expect(res.body.courseId).toBe("CPSC110");
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
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ year: 1, term: "W1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when term is invalid", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "FALL" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when year is out of range", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 6, term: "W1" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 409 when course already in plan", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse);
      const err = new Error("duplicate") as Error & { code: string };
      err.code = "23505";
      mockPlanService.addEntry.mockRejectedValueOnce(err);

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("conflict");
    });
  });

  // ── DELETE /api/v1/plans/:id/entries/:entryId ───────────────────────────

  describe("DELETE /api/v1/plans/:id/entries/:entryId", () => {
    it("deletes entry", async () => {
      mockPlanService.deleteEntry.mockResolvedValueOnce(fakeEntry);

      const res = await request(app).delete(
        `/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ENTRY_ID);
    });

    it("returns 404 when entry not found", async () => {
      mockPlanService.deleteEntry.mockResolvedValueOnce(null);

      const res = await request(app).delete(
        `/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── GET /api/v1/plans/:id/validate ──────────────────────────────────────

  describe("GET /api/v1/plans/:id/validate", () => {
    it("returns cached result when cache is warm", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockValidationService.validate.mockResolvedValueOnce({
        valid: true,
        errors: [],
        warnings: [],
        computedAt: "2025-01-01T00:00:00.000Z",
        cached: true,
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
      expect(res.body.valid).toBe(true);
    });

    it("computes and caches result on cache miss", async () => {
      mockPlanService.getById.mockResolvedValueOnce(fakePlan);
      mockValidationService.validate.mockResolvedValueOnce({
        valid: false,
        errors: [{ entryId: ENTRY_ID, courseId: "CPSC210", message: "prereqs not met" }],
        warnings: [],
        computedAt: new Date().toISOString(),
        cached: false,
      });

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(false);
      expect(res.body.valid).toBe(false);
    });

    it("returns 404 when plan not found", async () => {
      mockPlanService.getById.mockResolvedValueOnce(null);

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── PUT /api/v1/plans/:id/entries/reorder ───────────────────────────────

  describe("PUT /api/v1/plans/:id/entries/reorder", () => {
    it("returns 204 on successful reorder", async () => {
      mockPlanService.reorderEntries.mockResolvedValueOnce(undefined);

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/reorder`)
        .send({
          positions: [
            { entryId: ENTRY_ID, position: 0 },
            { entryId: "other-id", position: 1 },
          ],
        });

      expect(res.status).toBe(204);
    });

    it("returns 400 when positions array is missing", async () => {
      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}/entries/reorder`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });
  });
});
