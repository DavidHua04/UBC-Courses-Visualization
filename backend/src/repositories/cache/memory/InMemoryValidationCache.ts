import type { ValidationResult } from "../../../models/types";
import type { IValidationCache } from "../../interfaces";

/**
 * One cached validation result together with its expiration timestamp.
 *
 * `expiresAt` is stored as a Unix-epoch millisecond value (Date.now() + TTL)
 * so we can cheaply compare it against the current time on every read.
 */
interface CacheEntry {
  result: ValidationResult;
  expiresAt: number; // milliseconds since epoch
}

/**
 * InMemoryValidationCache
 * =======================
 * A lightweight, in-process cache that stores plan validation results
 * in a JavaScript `Map`.  It implements the `IValidationCache` interface
 * so it can be swapped with a Redis-backed cache later without touching
 * any service code.
 *
 * Why we need a cache:
 *   Validating a plan walks every entry and checks prerequisite trees —
 *   that can be expensive.  Caching the result avoids re-computing it
 *   on every page load.  The cache is invalidated whenever an entry in
 *   the plan is added, moved, or deleted.
 *
 * Why "in-memory"?
 *   For the JSON-file storage backend we don't require Redis, so this
 *   keeps the dependency footprint small.  The trade-off: the cache is
 *   lost on every server restart, but that's fine for local development.
 *
 * How TTL (Time-To-Live) works:
 *   Each entry stores an `expiresAt` timestamp.  On `get()`, if the
 *   current time exceeds `expiresAt`, the entry is deleted and `null`
 *   is returned — the caller must recompute and `set()` the new result.
 *   Default TTL is 300 seconds (5 minutes).
 *
 * All methods are `async` to match the interface (the Redis implementation
 * would genuinely be async), even though Map operations are synchronous.
 */
export class InMemoryValidationCache implements IValidationCache {
  /** planId → { result, expiresAt } */
  private cache = new Map<string, CacheEntry>();

  /**
   * Retrieve the cached validation result for a plan.
   *
   * Returns `null` in two cases:
   *   1. No entry exists for this planId.
   *   2. The entry exists but has expired (and is auto-deleted).
   */
  async get(planId: string): Promise<ValidationResult | null> {
    const entry = this.cache.get(planId);
    if (!entry) return null;

    // Lazy expiration: check TTL on read, delete if stale
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(planId);
      return null;
    }
    return entry.result;
  }

  /**
   * Store a validation result with an optional TTL.
   *
   * @param planId      – the plan this result belongs to
   * @param result      – the full ValidationResult object
   * @param ttlSeconds  – how long to keep it (default 300 = 5 minutes)
   */
  async set(
    planId: string,
    result: ValidationResult,
    ttlSeconds = 300
  ): Promise<void> {
    this.cache.set(planId, {
      result,
      expiresAt: Date.now() + ttlSeconds * 1000, // convert seconds → ms
    });
  }

  /**
   * Immediately remove the cached result for a plan.
   *
   * Called whenever an entry in the plan changes (add / update / delete /
   * reorder) so that the next validation request recomputes fresh results.
   */
  async invalidate(planId: string): Promise<void> {
    this.cache.delete(planId);
  }
}
