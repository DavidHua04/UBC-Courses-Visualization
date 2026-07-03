// Build-time data pipeline: data/source/*.json → public/data/*
//
//   index.json      compact CourseLite tuples for all courses (search)
//   dept/XXXX.json  full Course records per department (lazy-loaded)
//   programs.json   degree programs that have real requirement specs
//
// Run: npm run data

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Course, CourseLite, PrereqRule, Program } from "../src/engine/types";
import { parsePrereq, parseCorequisiteIds } from "./lib/parsePrereq";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "data");

// ── Source shapes (as scraped by the original project) ─────────────

interface RawCourse {
  id: string;
  dept: string;
  code: string;
  title: string;
  credits: string;
  description: string | null;
  prerequisites: PrereqRule | null;
  prerequisitesRaw?: string | null;
  corequisites: string[];
  corequisitesRaw?: string | null;
}

interface RawProgramsFile {
  faculties: { id: string; name: string; requirements?: unknown[] }[];
  programs: {
    id: string;
    name: string;
    facultyId: string;
    totalCredits: number;
    description?: string;
    requirements: unknown[];
  }[];
}

// ── Prose extraction ────────────────────────────────────────────────

const PREREQ_PROSE = /Prerequisite:\s*([^]*?)(?=\s*Corequisite:|\s*Equivalency:|$)/i;
const COREQ_PROSE = /Corequisite:\s*([^]*?)(?=\s*Prerequisite:|\s*Equivalency:|$)/i;
const NOISE = /\s*This course is not eligible for Credit\/D\/Fail grading\.?/gi;

function extractProse(re: RegExp, text: string | null | undefined): string | null {
  if (!text) return null;
  const m = re.exec(text);
  if (!m) return null;
  const s = m[1].replace(NOISE, "").replace(/\s+/g, " ").trim();
  return s || null;
}

function parseCredits(raw: string, id: string): number {
  const m = raw.match(/\d+(\.\d+)?/);
  if (!m) {
    console.warn(`  ! unparseable credits "${raw}" for ${id}, defaulting to 3`);
    return 3;
  }
  return parseFloat(m[0]);
}

/** Course ids appearing as hard requirement leaves (not min_credits pools). */
function requirementLeaves(rule: PrereqRule, out: Set<string>): void {
  switch (rule.type) {
    case "course":
      out.add(rule.courseId);
      break;
    case "all_of":
    case "one_of":
      for (const r of rule.rules) requirementLeaves(r, out);
      break;
    case "min_credits":
      break; // pool membership is "counts toward", not "required for"
  }
}

// ── Main ────────────────────────────────────────────────────────────

console.log("Reading source data…");
const raw: RawCourse[] = JSON.parse(
  readFileSync(join(root, "data", "source", "catalog.json"), "utf8"),
);
const rawPrograms: RawProgramsFile = JSON.parse(
  readFileSync(join(root, "data", "source", "programs.json"), "utf8"),
);

const stats = { existing: 0, reparsed: 0, unparsed: 0, none: 0, coreqAdded: 0 };
const courses = new Map<string, Course>();

for (const rc of raw) {
  const description = (rc.description ?? "").replace(NOISE, "").trim();
  const prose =
    extractProse(PREREQ_PROSE, rc.description) ?? rc.prerequisitesRaw?.replace(NOISE, "").trim() ?? null;

  let prereq = rc.prerequisites ?? null;
  if (prereq) {
    stats.existing++;
  } else if (prose) {
    const parsed = parsePrereq(prose);
    if (parsed.rule) {
      prereq = parsed.rule;
      stats.reparsed++;
    } else {
      stats.unparsed++;
    }
  } else {
    stats.none++;
  }

  const coreq = new Set(rc.corequisites ?? []);
  const coreqText = extractProse(COREQ_PROSE, rc.description) ?? rc.corequisitesRaw ?? null;
  for (const id of parseCorequisiteIds(coreqText)) {
    if (!coreq.has(id)) stats.coreqAdded++;
    coreq.add(id);
  }

  courses.set(rc.id, {
    id: rc.id,
    dept: rc.dept,
    number: rc.code,
    title: rc.title,
    credits: parseCredits(rc.credits, rc.id),
    description,
    prereq,
    prereqText: prose,
    coreq: [...coreq].sort(),
    coreqText,
    unlocks: [], // filled below
  });
}

// Reverse prereq edges ("unlocks"), restricted to courses that exist.
let edges = 0;
for (const course of courses.values()) {
  if (!course.prereq) continue;
  const leaves = new Set<string>();
  requirementLeaves(course.prereq, leaves);
  for (const leaf of leaves) {
    const target = courses.get(leaf);
    if (target) {
      target.unlocks.push(course.id);
      edges++;
    }
  }
}
for (const course of courses.values()) course.unlocks.sort();

// Programs: keep only those with real requirement specs; fold the owning
// faculty's requirements in so the app sees one flat list per program.
const facultyById = new Map(rawPrograms.faculties.map((f) => [f.id, f]));
const programs: Program[] = rawPrograms.programs
  .filter((p) => p.requirements.length > 0)
  .map((p) => {
    const faculty = facultyById.get(p.facultyId);
    return {
      id: p.id,
      name: p.name,
      faculty: faculty?.name ?? p.facultyId,
      totalCredits: p.totalCredits,
      description: p.description,
      requirements: [
        ...((faculty?.requirements ?? []) as Program["requirements"]),
        ...(p.requirements as Program["requirements"]),
      ],
    };
  });

// ── Emit ────────────────────────────────────────────────────────────

rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "dept"), { recursive: true });

const sorted = [...courses.values()].sort((a, b) => a.id.localeCompare(b.id));

const index: CourseLite[] = sorted.map((c) => [
  c.id,
  c.title,
  c.credits,
  c.prereq || c.prereqText ? 1 : 0,
  c.unlocks.length,
]);
writeFileSync(join(outDir, "index.json"), JSON.stringify({ courses: index }));

const byDept = new Map<string, Course[]>();
for (const c of sorted) {
  if (!byDept.has(c.dept)) byDept.set(c.dept, []);
  byDept.get(c.dept)!.push(c);
}
for (const [dept, list] of byDept) {
  writeFileSync(join(outDir, "dept", `${dept}.json`), JSON.stringify(list));
}

writeFileSync(join(outDir, "programs.json"), JSON.stringify(programs));

console.log(`Courses: ${courses.size} across ${byDept.size} departments`);
console.log(
  `Prereqs: ${stats.existing} pre-parsed, +${stats.reparsed} newly parsed, ` +
    `${stats.unparsed} prose-only, ${stats.none} without prerequisites`,
);
console.log(`Coreq ids added from prose: ${stats.coreqAdded}`);
console.log(`Unlock edges: ${edges}`);
console.log(`Programs with requirements: ${programs.map((p) => p.id).join(", ") || "none"}`);
