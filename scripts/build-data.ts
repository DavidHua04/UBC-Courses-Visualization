// Build-time data pipeline: data/source/*.json → public/data/*
//
//   index.json      compact CourseLite tuples for all courses (search)
//   dept/XXXX.json  full Course records per department (lazy-loaded)
//   programs.json   degree programs that have real requirement specs
//
// data/source/catalog.json is produced by `npm run data:fetch`
// (scripts/fetch-catalog.ts), which scrapes the UBC calendar and splits
// each course's prose into description / prereqText / coreqText /
// equivText. All rule parsing happens here, at build time.
//
// Run: npm run data

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Course, CourseLite, PrereqRule, Program } from "../src/engine/types";
import type { RawCourse } from "./fetch-catalog";
import { parsePrereq, parseCourseIdList } from "./lib/parsePrereq";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "data");

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

function parseCredits(raw: string, id: string): number {
  const m = raw.match(/\d+(\.\d+)?/); // "3-6" (variable credit) → its minimum, 3
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

const stats = {
  prereqParsed: 0,
  prereqUnparsed: 0,
  coreqParsed: 0,
  coreqUnparsed: 0,
};
const courses = new Map<string, Course>();

for (const rc of raw) {
  const prereq = parsePrereq(rc.prereqText);
  if (rc.prereqText) prereq.rule ? stats.prereqParsed++ : stats.prereqUnparsed++;

  const coreq = parsePrereq(rc.coreqText);
  if (rc.coreqText) coreq.rule ? stats.coreqParsed++ : stats.coreqUnparsed++;

  courses.set(rc.id, {
    id: rc.id,
    dept: rc.dept,
    number: rc.code,
    title: rc.title,
    credits: parseCredits(rc.credits, rc.id),
    description: rc.description,
    prereq: prereq.rule,
    prereqText: rc.prereqText,
    coreq: coreq.rule,
    coreqText: rc.coreqText,
    equiv: parseCourseIdList(rc.equivText), // validated + symmetrized below
    equivText: rc.equivText,
    unlocks: [], // filled below
  });
}

// Equivalency edges: keep only ids that exist in the catalog (dead calendar
// references would render as unclickable chips), never self, and make the
// relation symmetric — the calendar usually declares both sides, but not
// always.
let equivDropped = 0;
let equivSymmetrized = 0;
for (const course of courses.values()) {
  const kept = course.equiv.filter((id) => id !== course.id && courses.has(id));
  equivDropped += course.equiv.length - kept.length;
  course.equiv = kept;
}
for (const course of courses.values()) {
  for (const id of course.equiv) {
    const other = courses.get(id)!;
    if (!other.equiv.includes(course.id)) {
      other.equiv.push(course.id);
      equivSymmetrized++;
    }
  }
}
let equivEdges = 0;
for (const course of courses.values()) {
  course.equiv.sort();
  equivEdges += course.equiv.length;
}

// Generic dept+year-level placeholders, one per department per class year,
// for transfer/AP/IB credit that isn't equivalent to any specific UBC
// course. Id ends in "00T" ("transfer") so levelOf() still parses the year
// out of it, but it can never collide with a real scraped course code.
const GENERIC_YEAR_NAMES = ["1st", "2nd", "3rd", "4th"];
const depts = new Set([...courses.values()].map((c) => c.dept));
let genericAdded = 0;
for (const dept of depts) {
  for (let year = 1; year <= 4; year++) {
    const id = `${dept}${year}00T`;
    if (courses.has(id)) continue; // never expected, but don't clobber a real id
    courses.set(id, {
      id,
      dept,
      number: `${year}00T`,
      title: `${dept} ${GENERIC_YEAR_NAMES[year - 1]}-Year Credit (transfer / prior credit)`,
      credits: 3,
      description:
        `Generic placeholder for transfer, AP/IB, or other prior credit at the ${GENERIC_YEAR_NAMES[year - 1]}-year ${dept} level, ` +
        "with no specific UBC course equivalent. Counts toward credit totals and dept/level-based " +
        "degree requirements (electives, breadth), but does not satisfy any course's specific prerequisites.",
      prereq: null,
      prereqText: null,
      coreq: null,
      coreqText: null,
      equiv: [],
      equivText: null,
      unlocks: [],
      generic: true,
    });
    genericAdded++;
  }
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
  c.generic ? 1 : 0,
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
console.log(`Generic transfer-credit placeholders: ${genericAdded}`);
console.log(`Prereqs: ${stats.prereqParsed} parsed, ${stats.prereqUnparsed} prose-only`);
console.log(`Coreqs: ${stats.coreqParsed} parsed, ${stats.coreqUnparsed} prose-only`);
console.log(
  `Equivalency edges: ${equivEdges} (${equivSymmetrized} symmetrized, ${equivDropped} dropped as unknown/self)`,
);
console.log(`Unlock edges: ${edges}`);
console.log(`Programs with requirements: ${programs.map((p) => p.id).join(", ") || "none"}`);
