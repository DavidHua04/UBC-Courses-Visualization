import type { PrerequisiteRule } from "../dataModel";

const COURSE_TOKEN = /\b([A-Z]{2,5})(?:_V)?\s+(\d{3,4}[A-Z]?)\b/g;
const SINGLE_COURSE_TOKEN = /^([A-Z]{2,5})(?:_V)?\s+(\d{3,4}[A-Z]?)$/;
const LETTERED_GROUP = /\(([a-z])\)/g;
const CREDIT_PHRASE = /(?:at least\s+)?(\d+)\s+credits?\s+(?:of|from)\s+(.+)/i;

export function normalizeCourseId(subject: string, number: string): string {
  return `${subject.toUpperCase()}${number.toUpperCase()}`;
}

function extractCourseIds(s: string): string[] {
  const ids: string[] = [];
  for (const m of s.matchAll(COURSE_TOKEN)) {
    ids.push(normalizeCourseId(m[1], m[2]));
  }
  return ids;
}

function cleanRaw(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\bThis course is not eligible for Credit\/D\/Fail grading\.?\s*/gi, "");
  s = s.replace(/\bCorequisite:.*$/i, "");
  s = s.replace(/^\[([A-Z]{2,5})(\d{3,4})\]\s*/, "$1 $2 ");
  s = s.replace(/\.\s*$/, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function splitTopLevel(s: string, delimiter: " and " | " or "): string[] | null {
  const parts: string[] = [];
  let depth = 0;
  let last = 0;
  const lower = s.toLowerCase();
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0 && lower.startsWith(delimiter, i)) {
      parts.push(s.slice(last, i));
      i += delimiter.length - 1;
      last = i + 1;
    }
  }
  parts.push(s.slice(last));
  return parts.length > 1 ? parts.map((p) => p.trim()).filter(Boolean) : null;
}

function flatten(rule: PrerequisiteRule, type: "all_of" | "one_of"): PrerequisiteRule[] {
  if (rule.type === type) return rule.rules;
  return [rule];
}

function makeAllOf(rules: PrerequisiteRule[]): PrerequisiteRule | null {
  const flat = rules.flatMap((r) => flatten(r, "all_of"));
  if (flat.length === 0) return null;
  if (flat.length === 1) return flat[0];
  return { type: "all_of", rules: flat };
}

function makeOneOf(rules: PrerequisiteRule[]): PrerequisiteRule | null {
  const flat = rules.flatMap((r) => flatten(r, "one_of"));
  if (flat.length === 0) return null;
  if (flat.length === 1) return flat[0];
  return { type: "one_of", rules: flat };
}

function parseCreditPhrase(s: string): PrerequisiteRule | null {
  const m = CREDIT_PHRASE.exec(s);
  if (!m) return null;
  const minCredits = parseInt(m[1], 10);
  const from = extractCourseIds(m[2]);
  return {
    type: "min_credits",
    minCredits,
    from: from.length ? from : undefined,
  };
}

function parseCommaList(s: string, defaultType: "all_of" | "one_of"): PrerequisiteRule | null {
  const items = s.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
  const rules: PrerequisiteRule[] = [];
  for (const item of items) {
    const r = parseExpression(item);
    if (r) rules.push(r);
  }
  if (rules.length === 0) return null;
  return defaultType === "all_of" ? makeAllOf(rules) : makeOneOf(rules);
}

function parseLetteredGroups(s: string): PrerequisiteRule | null {
  const markers: { idx: number; letter: string }[] = [];
  for (const m of s.matchAll(LETTERED_GROUP)) {
    markers.push({ idx: m.index!, letter: m[1] });
  }
  if (markers.length === 0) return null;

  const head = s.slice(0, markers[0].idx).trim();
  const lowerHead = head.toLowerCase();

  const segments: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].idx + 3;
    const end = i + 1 < markers.length ? markers[i + 1].idx : s.length;
    let chunk = s.slice(start, end).trim();
    chunk = chunk.replace(/[,;]\s*$/, "").replace(/\s+(and|or)\s*$/i, "").trim();
    segments.push(chunk);
  }

  const rules = segments.map((seg) => parseExpression(seg)).filter((r): r is PrerequisiteRule => r !== null);
  if (rules.length === 0) return null;

  if (/^all of/i.test(lowerHead)) return makeAllOf(rules);
  if (/^one of/i.test(lowerHead) || /^either/i.test(lowerHead)) return makeOneOf(rules);

  const betweenJoiner = s.slice(markers[0].idx + 3, markers[1]?.idx ?? s.length);
  if (/\bor\b/i.test(betweenJoiner) && !/\band\b/i.test(betweenJoiner)) return makeOneOf(rules);

  return makeAllOf(rules);
}

function parseExpression(s: string): PrerequisiteRule | null {
  s = s.trim();
  if (!s) return null;

  if (/\([a-z]\)/.test(s)) {
    const r = parseLetteredGroups(s);
    if (r) return r;
  }

  const lower = s.toLowerCase();
  if (lower.startsWith("all of ")) {
    return parseList(s.slice(7), "all_of");
  }
  if (lower.startsWith("one of ")) {
    return parseList(s.slice(7), "one_of");
  }
  if (lower.startsWith("either ")) {
    return parseList(s.slice(7), "one_of");
  }

  const andParts = splitTopLevel(s, " and ");
  if (andParts) {
    const rules = andParts.map(parseExpression).filter((r): r is PrerequisiteRule => r !== null);
    return makeAllOf(rules);
  }

  const orParts = splitTopLevel(s, " or ");
  if (orParts) {
    const rules = orParts.map(parseExpression).filter((r): r is PrerequisiteRule => r !== null);
    return makeOneOf(rules);
  }

  const credit = parseCreditPhrase(s);
  if (credit) return credit;

  const single = SINGLE_COURSE_TOKEN.exec(s);
  if (single) {
    return { type: "course", courseId: normalizeCourseId(single[1], single[2]) };
  }

  const ids = extractCourseIds(s);
  if (ids.length === 1) {
    return { type: "course", courseId: ids[0] };
  }
  if (ids.length > 1) {
    return makeAllOf(ids.map((id) => ({ type: "course", courseId: id })));
  }

  return null;
}

function parseList(s: string, type: "all_of" | "one_of"): PrerequisiteRule | null {
  s = s.trim();
  const orParts = splitTopLevel(s, " or ");
  const andParts = splitTopLevel(s, " and ");
  if (!orParts && !andParts && /,/.test(s)) {
    return parseCommaList(s, type);
  }
  return parseExpression(s);
}

export function parsePrereq(raw: string | null | undefined): {
  rule: PrerequisiteRule | null;
  raw: string | null;
  unparsed: boolean;
} {
  if (!raw || !raw.trim()) return { rule: null, raw: null, unparsed: false };
  const cleaned = cleanRaw(raw);
  if (!cleaned) return { rule: null, raw: raw, unparsed: false };

  const rule = parseExpression(cleaned);
  if (rule === null) {
    return { rule: null, raw: raw, unparsed: true };
  }
  return { rule, raw: raw, unparsed: false };
}

export function parseCorequisiteIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return extractCourseIds(cleanRaw(raw));
}
