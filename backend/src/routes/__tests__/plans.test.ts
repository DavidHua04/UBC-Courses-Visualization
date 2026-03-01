import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── Mocks ──────────────────────────────────────────────────────────────────

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

const mockCache = vi.hoisted(() => ({
  getCachedValidation: vi.fn().mockResolvedValue(null),
  setCachedValidation: vi.fn().mockResolvedValue(undefined),
  invalidateValidation: vi.fn().mockResolvedValue(undefined),
  getDraftState: vi.fn().mockResolvedValue(null),
  setDraftState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/cache", () => mockCache);

const mockValidation = vi.hoisted(() => ({
  validatePlan: vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
    warnings: [],
    computedAt: new Date().toISOString(),
  }),
}));

vi.mock("../../services/validation", () => mockValidation);

// ── Imports ────────────────────────────────────────────────────────────────

import { createApp } from "../../app";
import { enqueueValidation } from "../../services/queue";

// ── Helpers ────────────────────────────────────────────────────────────────

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
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const fakeEntry = {
  id: ENTRY_ID,
  planId: PLAN_ID,
  courseId: "CPSC110",
  year: 1,
  term: "W1",
  status: "planned",
  position: 0,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Plans routes", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    mockDb.select.mockReturnValue(makeChain([]));
    mockDb.insert.mockReturnValue(makeChain([]));
    mockDb.update.mockReturnValue(makeChain([]));
    mockDb.delete.mockReturnValue(makeChain([]));
    mockCache.getCachedValidation.mockResolvedValue(null);
    mockCache.invalidateValidation.mockResolvedValue(undefined);
    mockValidation.validatePlan.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
      computedAt: new Date().toISOString(),
    });
  });

  // ── GET /api/v1/plans ───────────────────────────────────────────────────

  describe("GET /api/v1/plans", () => {
    it("returns list of plans", async () => {
      const planWithCount = { ...fakePlan, entryCount: 3 };
      mockDb.select.mockReturnValueOnce(makeChain([planWithCount]));

      const res = await request(app).get("/api/v1/plans");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(PLAN_ID);
    });

    it("returns empty array when no plans exist", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([]));

      const res = await request(app).get("/api/v1/plans");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── POST /api/v1/plans ──────────────────────────────────────────────────

  describe("POST /api/v1/plans", () => {
    it("creates a plan and returns 201", async () => {
      mockDb.insert.mockReturnValueOnce(makeChain([fakePlan]));

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
      mockDb.select
        .mockReturnValueOnce(makeChain([fakePlan])) // plan lookup
        .mockReturnValueOnce(makeChain([fakeEntry])); // entries

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(PLAN_ID);
      expect(res.body.entries["1"]["W1"]).toHaveLength(1);
      expect(res.body.entries["1"]["W1"][0].courseId).toBe("CPSC110");
    });

    it("returns 404 when plan not found", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([]));

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── PUT /api/v1/plans/:id ───────────────────────────────────────────────

  describe("PUT /api/v1/plans/:id", () => {
    it("updates a plan and returns 204", async () => {
      mockDb.update.mockReturnValueOnce(makeChain([{ ...fakePlan, name: "Updated" }]));

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(204);
    });

    it("returns 404 when plan not found", async () => {
      mockDb.update.mockReturnValueOnce(makeChain([]));

      const res = await request(app)
        .put(`/api/v1/plans/${PLAN_ID}`)
        .send({ name: "Updated" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── DELETE /api/v1/plans/:id ────────────────────────────────────────────

  describe("DELETE /api/v1/plans/:id", () => {
    it("deletes a plan and invalidates the validation cache", async () => {
      mockDb.delete.mockReturnValueOnce(makeChain([fakePlan]));

      const res = await request(app).delete(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(PLAN_ID);
      expect(mockCache.invalidateValidation).toHaveBeenCalledWith(PLAN_ID);
    });

    it("returns 404 when plan not found", async () => {
      mockDb.delete.mockReturnValueOnce(makeChain([]));

      const res = await request(app).delete(`/api/v1/plans/${PLAN_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── POST /api/v1/plans/:id/entries ──────────────────────────────────────

  describe("POST /api/v1/plans/:id/entries", () => {
    it("adds a course entry and enqueues validation", async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([fakePlan])) // plan exists
        .mockReturnValueOnce(makeChain([fakeCourse])) // course exists
        .mockReturnValueOnce(makeChain([{ max: -1 }])); // max position
      mockDb.insert.mockReturnValueOnce(makeChain([fakeEntry]));

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(201);
      expect(res.body.courseId).toBe("CPSC110");
      expect(enqueueValidation).toHaveBeenCalledWith(PLAN_ID);
    });

    it("returns 404 when plan does not exist", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([])); // plan not found

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "W1" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });

    it("returns 400 when courseId is missing", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([fakePlan]));

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ year: 1, term: "W1" }); // no courseId

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when term is invalid", async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([fakePlan]))
        .mockReturnValueOnce(makeChain([fakeCourse]));

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 1, term: "FALL" }); // invalid term

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });

    it("returns 400 when year is out of range", async () => {
      mockDb.select
        .mockReturnValueOnce(makeChain([fakePlan]))
        .mockReturnValueOnce(makeChain([fakeCourse]));

      const res = await request(app)
        .post(`/api/v1/plans/${PLAN_ID}/entries`)
        .send({ courseId: "CPSC110", year: 6, term: "W1" }); // year > 5

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("validation_error");
    });
  });

  // ── DELETE /api/v1/plans/:id/entries/:entryId ───────────────────────────

  describe("DELETE /api/v1/plans/:id/entries/:entryId", () => {
    it("deletes entry and invalidates validation cache", async () => {
      mockDb.delete.mockReturnValueOnce(makeChain([fakeEntry]));

      const res = await request(app).delete(
        `/api/v1/plans/${PLAN_ID}/entries/${ENTRY_ID}`
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ENTRY_ID);
      expect(mockCache.invalidateValidation).toHaveBeenCalledWith(PLAN_ID);
    });

    it("returns 404 when entry not found", async () => {
      mockDb.delete.mockReturnValueOnce(makeChain([]));

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
      mockDb.select.mockReturnValueOnce(makeChain([fakePlan]));
      const cachedResult = {
        valid: true,
        errors: [],
        warnings: [],
        computedAt: "2025-01-01T00:00:00.000Z",
      };
      mockCache.getCachedValidation.mockResolvedValueOnce(cachedResult);

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(true);
      expect(res.body.valid).toBe(true);
    });

    it("computes and caches result on cache miss", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([fakePlan]));
      mockCache.getCachedValidation.mockResolvedValueOnce(null);
      const freshResult = {
        valid: false,
        errors: [{ entryId: ENTRY_ID, courseId: "CPSC210", message: "prereqs not met" }],
        warnings: [],
        computedAt: new Date().toISOString(),
      };
      mockValidation.validatePlan.mockResolvedValueOnce(freshResult);

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(200);
      expect(res.body.cached).toBe(false);
      expect(res.body.valid).toBe(false);
      expect(mockCache.setCachedValidation).toHaveBeenCalledWith(PLAN_ID, freshResult);
    });

    it("returns 404 when plan not found", async () => {
      mockDb.select.mockReturnValueOnce(makeChain([]));

      const res = await request(app).get(`/api/v1/plans/${PLAN_ID}/validate`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("not_found");
    });
  });

  // ── PUT /api/v1/plans/:id/entries/reorder ───────────────────────────────

  describe("PUT /api/v1/plans/:id/entries/reorder", () => {
    it("returns 204 on successful reorder", async () => {
      mockDb.update
        .mockReturnValueOnce(makeChain([{ ...fakeEntry, position: 0 }]))
        .mockReturnValueOnce(makeChain([{ ...fakeEntry, id: "other-id", position: 1 }]));

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
