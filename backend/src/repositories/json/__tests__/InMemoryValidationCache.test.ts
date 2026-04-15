import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryValidationCache } from "../InMemoryValidationCache";
import type { ValidationResult } from "../../../models/types";

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    computedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("InMemoryValidationCache", () => {
  let cache: InMemoryValidationCache;

  beforeEach(() => {
    cache = new InMemoryValidationCache();
    vi.restoreAllMocks();
  });

  it("returns null for a cache miss", async () => {
    expect(await cache.get("plan-1")).toBeNull();
  });

  it("stores and retrieves a result", async () => {
    const result = makeResult();
    await cache.set("plan-1", result);

    const cached = await cache.get("plan-1");
    expect(cached).toEqual(result);
  });

  it("returns null after TTL expires", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    await cache.set("plan-1", makeResult(), 60); // 60s TTL

    // Advance past TTL
    vi.spyOn(Date, "now").mockReturnValue(now + 61_000);

    expect(await cache.get("plan-1")).toBeNull();
  });

  it("returns result before TTL expires", async () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    await cache.set("plan-1", makeResult(), 60);

    // Still within TTL
    vi.spyOn(Date, "now").mockReturnValue(now + 59_000);

    expect(await cache.get("plan-1")).not.toBeNull();
  });

  it("invalidates a cached entry", async () => {
    await cache.set("plan-1", makeResult());
    await cache.invalidate("plan-1");

    expect(await cache.get("plan-1")).toBeNull();
  });

  it("invalidating a non-existent key does not throw", async () => {
    await expect(cache.invalidate("nope")).resolves.toBeUndefined();
  });

  it("overwrites previous value on re-set", async () => {
    await cache.set("plan-1", makeResult({ valid: true }));
    await cache.set("plan-1", makeResult({ valid: false }));

    const cached = await cache.get("plan-1");
    expect(cached!.valid).toBe(false);
  });
});
