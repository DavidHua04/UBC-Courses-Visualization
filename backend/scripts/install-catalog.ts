/**
 * install-catalog
 *
 * Merges the transformed UBC catalog (data/courses-catalog.json) with the
 * hand-tuned SEED_COURSES from src/data/seed.ts and writes the result to
 * data/courses.json (the file JsonCourseRepository reads from).
 *
 * Seed entries win on ID conflicts — they have human-verified prereq trees
 * we'd lose by clobbering with parser output.
 *
 * Usage:
 *   npx tsx backend/scripts/install-catalog.ts \
 *     [--catalog data/courses-catalog.json] \
 *     [--out     data/courses.json]
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { CourseRow } from "../src/models/types";
import { SEED_COURSES } from "../src/data/seed";

function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

const catalogPath = path.resolve(arg("--catalog", "data/courses-catalog.json"));
const outPath = path.resolve(arg("--out", "data/courses.json"));

console.log(`Reading catalog ${catalogPath}`);
const catalog = JSON.parse(readFileSync(catalogPath, "utf-8")) as CourseRow[];

const merged = new Map<string, CourseRow>();
for (const c of catalog) merged.set(c.id, c);

let overridden = 0;
for (const c of SEED_COURSES) {
  if (merged.has(c.id)) overridden++;
  merged.set(c.id, c);
}

const out = Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");

console.log(`Wrote ${out.length} courses to ${outPath}`);
console.log(`  catalog: ${catalog.length}`);
console.log(`  seed:    ${SEED_COURSES.length} (${overridden} overrode parsed entries)`);
