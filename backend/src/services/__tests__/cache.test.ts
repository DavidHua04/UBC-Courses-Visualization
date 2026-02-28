import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRedis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock("../../redis", () => ({
  redis: mockRedis,
  planQueue: { add: vi.fn() },
  seedQueue: { add: vi.fn() },
}));

// ── Imports ────────────────────────────────────────────────────────────────

import {
  getCachedValidation,
  setCachedValidation,
  invalidateValidation,
  getDraftState,
  setDraftState,
} from "../cache";
import type { ValidationResult } from "../../models/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

const PLAN_ID = "plan-abc-123";

const fakeResult: ValidationResult = {
  valid: true,
  errors: [],
  warnings: [],
  computedAt: "2025-01-01T00:00:00.000Z",
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Cache service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── getCachedValidation ─────────────────────────────────────────────────

  describe("getCachedValidation", () => {
    it("returns null when there is no cached entry", async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await getCachedValidation(PLAN_ID);

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(`validation:${PLAN_ID}`);
    });

    it("returns parsed ValidationResult when cache is populated", async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(fakeResult));

      const result = await getCachedValidation(PLAN_ID);

      expect(result).toEqual(fakeResult);
    });
  });

  // ── setCachedValidation ─────────────────────────────────────────────────

  describe("setCachedValidation", () => {
    it("stores the result as JSON with the default 300 s TTL", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");

      await setCachedValidation(PLAN_ID, fakeResult);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `validation:${PLAN_ID}`,
        JSON.stringify(fakeResult),
        "EX",
        300
      );
    });

    it("respects a custom TTL", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");

      await setCachedValidation(PLAN_ID, fakeResult, 60);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `validation:${PLAN_ID}`,
        JSON.stringify(fakeResult),
        "EX",
        60
      );
    });
  });

  // ── invalidateValidation ────────────────────────────────────────────────

  describe("invalidateValidation", () => {
    it("deletes the validation key from Redis", async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      await invalidateValidation(PLAN_ID);

      expect(mockRedis.del).toHaveBeenCalledWith(`validation:${PLAN_ID}`);
    });
  });

  // ── getDraftState ───────────────────────────────────────────────────────

  describe("getDraftState", () => {
    it("returns null when no draft state exists", async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await getDraftState(PLAN_ID);

      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith(`draft:${PLAN_ID}`);
    });

    it("returns parsed draft state when it exists", async () => {
      const draft = { selectedTerm: "W1", pendingCourses: ["CPSC110"] };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(draft));

      const result = await getDraftState(PLAN_ID);

      expect(result).toEqual(draft);
    });
  });

  // ── setDraftState ───────────────────────────────────────────────────────

  describe("setDraftState", () => {
    it("stores draft state with a 30-minute (1800 s) TTL", async () => {
      mockRedis.set.mockResolvedValueOnce("OK");
      const draft = { selectedTerm: "W2" };

      await setDraftState(PLAN_ID, draft);

      expect(mockRedis.set).toHaveBeenCalledWith(
        `draft:${PLAN_ID}`,
        JSON.stringify(draft),
        "EX",
        1800
      );
    });
  });
});
