// Build-time parser: UBC calendar prerequisite prose → PrereqRule tree.
// Ported from the original backend's prereqParser with light cleanups.
// Prose it can't confidently parse is left as raw text (the app shows it
// verbatim and marks eligibility "unknown" instead of guessing).

import type { PrereqRule } from "../../src/engine/types";

const COURSE_TOKEN = /\b([A-Z]{2,5})(?:\s*_[VO])?\s+(\d{3,4}[A-Z]?)\b/g;
const SINGLE_COURSE_TOKEN = /^([A-Z]{2,5})(?:\s*_[VO])?\s+(\d{3,4}[A-Z]?)$/;
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
  // Grade qualifiers add no structure: "a score of 64% or higher in MATH 12" → "MATH 12"
  s = s.replace(/\ba (?:score|grade) of \d+%? or (?:higher|better) in\b/gi, "");
  s = s.replace(/\beither\s+/gi, "either ");
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

function flatten(rule: PrereqRule, type: "all_of" | "one_of"): PrereqRule[] {
  if (rule.type === type && !(rule.type === "one_of" && rule.minCount)) return rule.rules;
  return [rule];
}

function makeGroup(rules: PrereqRule[], type: "all_of" | "one_of"): PrereqRule | null {
  const flat = rules.flatMap((r) => flatten(r, type));
  if (flat.length === 0) return null;
  if (flat.length === 1) return flat[0];
  return { type, rules: flat };
}

function parseCreditPhrase(s: string): PrereqRule | null {
  const m = CREDIT_PHRASE.exec(s);
  if (!m) return null;
  const minCredits = parseInt(m[1], 10);
  const from = extractCourseIds(m[2]);
  return { type: "min_credits", minCredits, from: from.length ? from : undefined };
}

function parseCommaList(s: string, defaultType: "all_of" | "one_of"): PrereqRule | null {
  const items = s.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
  const rules: PrereqRule[] = [];
  for (const item of items) {
    const r = parseExpression(item);
    if (r) rules.push(r);
  }
  if (rules.length === 0) return null;
  return makeGroup(rules, defaultType);
}

// "(a) CPSC 210 and STAT 200; (b) one of MATH 200, MATH 226." style
function parseLetteredGroups(s: string): PrereqRule | null {
  const markers: { idx: number; letter: string }[] = [];
  for (const m of s.matchAll(LETTERED_GROUP)) {
    markers.push({ idx: m.index, letter: m[1] });
  }
  if (markers.length === 0) return null;

  const head = s.slice(0, markers[0].idx).trim().toLowerCase();

  const segments: string[] = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].idx + 3;
    const end = i + 1 < markers.length ? markers[i + 1].idx : s.length;
    let chunk = s.slice(start, end).trim();
    chunk = chunk.replace(/[,;]\s*$/, "").replace(/\s+(and|or)\s*$/i, "").trim();
    segments.push(chunk);
  }

  const rules = segments
    .map((seg) => parseExpression(seg))
    .filter((r): r is PrereqRule => r !== null);
  if (rules.length === 0) return null;

  if (/^all of/.test(head)) return makeGroup(rules, "all_of");
  if (/^one of/.test(head) || /^either/.test(head)) return makeGroup(rules, "one_of");

  const betweenJoiner = s.slice(markers[0].idx + 3, markers[1]?.idx ?? s.length);
  if (/\bor\b/i.test(betweenJoiner) && !/\band\b/i.test(betweenJoiner)) {
    return makeGroup(rules, "one_of");
  }
  return makeGroup(rules, "all_of");
}

function parseExpression(s: string): PrereqRule | null {
  s = s.trim();
  if (!s) return null;

  if (/\([a-z]\)/.test(s)) {
    const r = parseLetteredGroups(s);
    if (r) return r;
  }

  const lower = s.toLowerCase();
  if (lower.startsWith("all of ")) return parseList(s.slice(7), "all_of");
  if (lower.startsWith("one of ")) return parseList(s.slice(7), "one_of");
  if (lower.startsWith("either ")) return parseList(s.slice(7), "one_of");

  const andParts = splitTopLevel(s, " and ");
  if (andParts) {
    const rules = andParts.map(parseExpression).filter((r): r is PrereqRule => r !== null);
    // Refuse partial parses of and-lists: "CPSC 210 and third-year standing"
    // must stay unparsed rather than silently dropping the standing clause.
    if (rules.length !== andParts.length) return null;
    return makeGroup(rules, "all_of");
  }

  // "3 credits of A or B" is one credit pool, not an or-choice — when the
  // whole expression is a credit phrase, it wins over the or-split.
  if (/^(?:at least\s+)?\d+\s+credits?\s+(?:of|from)\s/i.test(s)) {
    const credit = parseCreditPhrase(s);
    if (credit) return credit;
  }

  const orParts = splitTopLevel(s, " or ");
  if (orParts) {
    const rules = orParts.map(parseExpression).filter((r): r is PrereqRule => r !== null);
    if (rules.length === 0) return null;
    return makeGroup(rules, "one_of");
  }

  const credit = parseCreditPhrase(s);
  if (credit) return credit;

  const single = SINGLE_COURSE_TOKEN.exec(s);
  if (single) {
    return { type: "course", courseId: normalizeCourseId(single[1], single[2]) };
  }

  const ids = extractCourseIds(s);
  if (ids.length === 1) return { type: "course", courseId: ids[0] };
  if (ids.length > 1) {
    return makeGroup(ids.map((id): PrereqRule => ({ type: "course", courseId: id })), "all_of");
  }

  return null;
}

function parseList(s: string, type: "all_of" | "one_of"): PrereqRule | null {
  s = s.trim();
  const orParts = splitTopLevel(s, " or ");
  const andParts = splitTopLevel(s, " and ");
  if (!orParts && !andParts && /,/.test(s)) {
    return parseCommaList(s, type);
  }
  return parseExpression(s);
}

export interface ParsedPrereq {
  rule: PrereqRule | null;
  /** true when prose existed but could not be converted to a rule tree */
  unparsed: boolean;
}

export function parsePrereq(raw: string | null | undefined): ParsedPrereq {
  if (!raw || !raw.trim()) return { rule: null, unparsed: false };
  const cleaned = cleanRaw(raw);
  if (!cleaned) return { rule: null, unparsed: false };
  const rule = parseExpression(cleaned);
  return { rule, unparsed: rule === null };
}

// Like COURSE_TOKEN but tolerates a missing space ("BIOL364"), which the
// calendar's Equivalency clauses sometimes do. Too loose for full prereq
// prose (any CAPS+digits run would match), fine for bare id lists.
const LOOSE_COURSE_TOKEN = /\b([A-Z]{2,5})(?:\s*_[VO])?\s*(\d{3,4}[A-Z]?)\b/g;

/** Unique course ids mentioned anywhere in a prose fragment (e.g. an
 *  "Equivalency: HIST 256" clause), in order of appearance. */
export function parseCourseIdList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const ids: string[] = [];
  for (const m of raw.matchAll(LOOSE_COURSE_TOKEN)) {
    ids.push(normalizeCourseId(m[1], m[2]));
  }
  return [...new Set(ids)];
}
