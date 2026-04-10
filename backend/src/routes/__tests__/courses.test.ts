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

const fakeCourse = {
  id: "CPSC110",
  dept: "CPSC",
  code: "110",
  title: "Computation, Programs, and Programming",
  credits: "4.0",
  description: "Fundamental program and computation structures.",
  prerequisites: null,
  corequisites: [],
  termsOffered: ["W1", "W2", "S"],
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Courses routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  // ── GET /api/v1/courses ─────────────────────────────────────────────────

  describe("GET /api/v1/courses", () => {
    it("returns paginated list with default params", async () => {
      mockCourseService.list.mockResolvedValueOnce({
        data: [fakeCourse],
        total: 1,
      });

      const res = await request(app).get("/api/v1/courses");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe("CPSC110");
      expect(res.body.pagination).toMatchObject({ offset: 0, limit: 20, total: 1 });
    });

    it("respects limit and offset query params", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 30 });

      const res = await request(app).get("/api/v1/courses?limit=5&offset=10");

      expect(res.status).toBe(200);
      expect(res.body.pagination).toMatchObject({ offset: 10, limit: 5, total: 30 });
    });

    it("clamps limit to 100 max", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      const res = await request(app).get("/api/v1/courses?limit=9999");

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(100);
    });

    it("clamps offset to 0 min", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      const res = await request(app).get("/api/v1/courses?offset=-5");

      expect(res.status).toBe(200);
      expect(res.body.pagination.offset).toBe(0);
    });

    it("returns empty data when no courses match", async () => {
      mockCourseService.list.mockResolvedValueOnce({ data: [], total: 0 });

      const res = await request(app).get("/api/v1/courses");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // ── GET /api/v1/courses/:id ─────────────────────────────────────────────

  describe("GET /api/v1/courses/:id", () => {
    it("returns a course by ID", async () => {
      mockCourseService.getById.mockResolvedValueOnce(fakeCourse);

      const res = await request(app).get("/api/v1/courses/CPSC110");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("CPSC110");
      expect(res.body.dept).toBe("CPSC");
      expect(res.body.credits).toBe("4.0");
    });

    it("returns 404 when course not found", async () => {
      mockCourseService.getById.mockResolvedValueOnce(null);

      const res = await request(app).get("/api/v1/courses/FAKE999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── POST /api/v1/courses/seed ───────────────────────────────────────────

  describe("POST /api/v1/courses/seed", () => {
    it("seeds courses and returns 202", async () => {
      mockCourseService.seed.mockResolvedValueOnce(29);

      const res = await request(app).post("/api/v1/courses/seed");

      expect(res.status).toBe(202);
      expect(res.body.message).toContain("29");
      expect(mockCourseService.seed).toHaveBeenCalledTimes(1);
    });
  });

  // ── Health check ────────────────────────────────────────────────────────

  describe("GET /api/health", () => {
    it("returns status ok", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });

  // ── 404 fallback ────────────────────────────────────────────────────────

  describe("Unknown routes", () => {
    it("returns 404 with error shape for unknown paths", async () => {
      const res = await request(app).get("/api/v1/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });
});
