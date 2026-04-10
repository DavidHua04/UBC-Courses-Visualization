import type { ValidationResult } from "../../models/types";
import type { IValidationCache } from "../interfaces";

interface CacheEntry {
  result: ValidationResult;
  expiresAt: number;
}

export class InMemoryValidationCache implements IValidationCache {
  private cache = new Map<string, CacheEntry>();

  async get(planId: string): Promise<ValidationResult | null> {
    const entry = this.cache.get(planId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(planId);
      return null;
    }
    return entry.result;
  }

  async set(
    planId: string,
    result: ValidationResult,
    ttlSeconds = 300
  ): Promise<void> {
    this.cache.set(planId, {
      result,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async invalidate(planId: string): Promise<void> {
    this.cache.delete(planId);
  }
}
