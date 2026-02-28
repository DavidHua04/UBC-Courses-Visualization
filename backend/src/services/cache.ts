import { redis } from "../redis";
import type { ValidationResult } from "../models/types";

const VALIDATION_KEY = (planId: string) => `validation:${planId}`;
const DRAFT_KEY = (planId: string) => `draft:${planId}`;

export async function getCachedValidation(planId: string): Promise<ValidationResult | null> {
  const raw = await redis.get(VALIDATION_KEY(planId));
  if (!raw) return null;
  return JSON.parse(raw) as ValidationResult;
}

export async function setCachedValidation(
  planId: string,
  result: ValidationResult,
  ttlSeconds = 300
): Promise<void> {
  await redis.set(VALIDATION_KEY(planId), JSON.stringify(result), "EX", ttlSeconds);
}

export async function invalidateValidation(planId: string): Promise<void> {
  await redis.del(VALIDATION_KEY(planId));
}

export async function getDraftState(planId: string): Promise<unknown | null> {
  const raw = await redis.get(DRAFT_KEY(planId));
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function setDraftState(planId: string, state: unknown): Promise<void> {
  // TTL 30 minutes
  await redis.set(DRAFT_KEY(planId), JSON.stringify(state), "EX", 1800);
}
