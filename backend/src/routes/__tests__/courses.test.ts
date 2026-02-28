import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Mocks (hoisted so they apply before any module is loaded) ──────────────

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../../db", () => ({ db: mockDb }));

vi.mock("../../redis", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  planQueue: { add: vi.fn() },
  seedQueue: { add: vi.fn() },
}));

vi.mock("../../services/queue", () => ({
  enqueueValidation: vi.fn().mockResolvedValue(undefined),
  enqueueSeed: vi.fn().mockResolvedValue({ jobId: "seed-job-1" }),
  startWorkers: vi.fn(),
}));

vi.mock("../../services/cache", () => ({
  getCachedValidation: vi.fn().mockResolvedValue(null),
  setCachedValidation: vi.fn().mockResolvedValue(undefined),
  invalidateValidation: vi.fn().mockResolvedValue(undefined),
  getDraftState: vi.fn().mockResolvedValue(null),
  setDraftState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/validation", () => ({
  validatePlan: vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
    warnings: [],
    computedAt: new Date().toISOString(),
  }),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { createApp } from "../../app";
import { enqueueSeed } from "../../services/queue";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Creates a chainable, awaitable mock for Drizzle query builder calls. */
function makeChain<T>(result: T) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    offset: () => chain,
    orderBy: () => chain,
    groupBy: () => chain,
    leftJoin: () => chain,
    values: () => chain,
    set: () => chain,
    returning: () => Promise.resolve(result),
    then: (res: any, rej?: any) => Promise.resolve(result).then(res, rej),
    catch: (fn: any) => Promise.resolve(result).catch(fn),
    finally: (fn: any) => Promise.resolve(result).finally(fn),
  };
  return chain;
}

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
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Courses routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    mockDb.select.mockReturnValue(makeChain([]));
    mockDb.insert.mockReturnValue(makeChain([]));
    mockDb.update.mockReturnValue(makeChain([]));
    mockDb.delete.mockReturnValue(makeChain([]));
  });

  // ── GET /api/v1/courses ─────────────────────────────────────────────────

  describe("GET /api/v1/courses", () => {
    it("returns paginated list with default params", async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([fakeCourse]))
        .mockReturnValueOnce(makeChain([{ count: 1 }]));

      const res = await request(app).get("/api/v1/courses");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe("CPSC110");
      expect(res.body.pagination).toMatchObject({ offset: 0, limit: 20, total: 1 });
    });

    it("respects limit and offset query params", async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([]))
        .mockReturnValueOnce(makeChain([{ count: 30 }]));

      const res = await request(app).get("/api/v1/courses?limit=5&offset=10");

      expect(res.status).toBe(200);
      expect(res.body.pagination).toMatchObject({ offset: 10, limit: 5, total: 30 });
    });

    it("clamps limit to 100 max", async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([]))
        .mockReturnValueOnce(makeChain([{ count: 0 }]));

      const res = await request(app).get("/api/v1/courses?limit=9999");

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(100);
    });

    it("clamps offset to 0 min", async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([]))
        .mockReturnValueOnce(makeChain([{ count: 0 }]));

      const res = await request(app).get("/api/v1/courses?offset=-5");

      expect(res.status).toBe(200);
      expect(res.body.pagination.offset).toBe(0);
    });

    it("returns empty data when no courses match", async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([]))
        .mockReturnValueOnce(makeChain([{ count: 0 }]));

      const res = await request(app).get("/api/v1/courses");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  // ── GET /api/v1/courses/:id ─────────────────────────────────────────────

  describe("GET /api/v1/courses/:id", () => {
    it("returns a course by ID", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([fakeCourse]));

      const res = await request(app).get("/api/v1/courses/CPSC110");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("CPSC110");
      expect(res.body.dept).toBe("CPSC");
      expect(res.body.credits).toBe("4.0");
    });

    it("returns 404 when course not found", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([]));

      const res = await request(app).get("/api/v1/courses/FAKE999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── POST /api/v1/courses/seed ───────────────────────────────────────────

  describe("POST /api/v1/courses/seed", () => {
    it("enqueues a seed job and returns 202 with jobId", async () => {
      const res = await request(app).post("/api/v1/courses/seed");

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBe("seed-job-1");
      expect(enqueueSeed).toHaveBeenCalledTimes(1);
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
