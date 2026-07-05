// Lenient parsing of advisor replies. Small models drift from the requested
// format, so this never throws: worst case is prose with no recommendations.

import type { AdvisorRecommendation } from "../engine/types";

export interface ParsedReply {
  prose: string;
  recommendations: AdvisorRecommendation[];
}

/** "cpsc 310" / "CPSC-310" → "CPSC310". */
export function normalizeCourseId(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]+/g, "");
}

const FENCED_JSON = /```(?:json)?\s*([\s\S]*?)```/i;

/** One repair pass for the classic small-model JSON mistakes. */
function repairJson(text: string): string {
  return text
    .replace(/^\s*\/\/.*$/gm, "") // line comments
    .replace(/,\s*([}\]])/g, "$1"); // trailing commas
}

function tryParse(text: string): unknown {
  for (const candidate of [text, repairJson(text)]) {
    try {
      return JSON.parse(candidate);
    } catch {
      // fall through
    }
  }
  return null;
}

/** First balanced {...} in `text` that contains `"recommendations"`. */
function balancedObject(text: string): string | null {
  const key = text.indexOf('"recommendations"');
  if (key < 0) return null;
  const start = text.lastIndexOf("{", key);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function toRecommendations(value: unknown): AdvisorRecommendation[] {
  const items = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { recommendations?: unknown }).recommendations)
      ? ((value as { recommendations: unknown[] }).recommendations)
      : [];

  const out: AdvisorRecommendation[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const rawId = rec.courseId ?? rec.course_id ?? rec.course ?? rec.id;
    if (typeof rawId !== "string" || !rawId.trim()) continue;
    const courseId = normalizeCourseId(rawId);
    if (seen.has(courseId)) continue;
    seen.add(courseId);
    const rawReason = rec.reason ?? rec.why ?? rec.rationale;
    out.push({ courseId, reason: typeof rawReason === "string" ? rawReason : "" });
    if (out.length >= 10) break;
  }
  return out;
}

export function parseAdvisorReply(text: string): ParsedReply {
  // 1. Fenced block (```json or bare ```).
  const fence = text.match(FENCED_JSON);
  if (fence) {
    const parsed = tryParse(fence[1].trim());
    const recommendations = toRecommendations(parsed);
    if (recommendations.length > 0 || parsed !== null) {
      return { prose: text.replace(fence[0], "").trim(), recommendations };
    }
  }

  // 2. Whole message is JSON (object or array).
  const trimmed = text.trim();
  if (/^[[{]/.test(trimmed)) {
    const parsed = tryParse(trimmed);
    if (parsed !== null) {
      return { prose: "", recommendations: toRecommendations(parsed) };
    }
  }

  // 3. Bare object with "recommendations" embedded mid-prose.
  const embedded = balancedObject(text);
  if (embedded) {
    const parsed = tryParse(embedded);
    if (parsed !== null) {
      return {
        prose: text.replace(embedded, "").trim(),
        recommendations: toRecommendations(parsed),
      };
    }
  }

  // 4. Nothing machine-readable — show the raw reply as-is.
  return { prose: text.trim(), recommendations: [] };
}
