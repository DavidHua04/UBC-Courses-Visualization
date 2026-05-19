/**
 * transform-courses
 *
 * Reads the UBC course CSV scraped by the reference repo
 * (reference/Degree-Planner-main/data/Scraper/ubc_prereqs.csv) and emits a
 * CourseRow[] JSON file consumable by JsonCourseRepository.
 *
 * Usage:
 *   npx tsx backend/scripts/transform-courses.ts \
 *     --in  ../reference/Degree-Planner-main/data/Scraper/ubc_prereqs.csv \
 *     --out backend/data/courses-catalog.json \
 *     [--depts CPSC,MATH,STAT]   (optional dept allowlist)
 *     [--max-level 499]          (optional upper bound for course number)
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { CourseRow } from "../src/models/types";
import { parsePrereq, parseCorequisiteIds, normalizeCourseId } from "../src/utils/prereqParser";

interface Args {
  in: string;
  out: string;
  depts?: Set<string>;
  maxLevel?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === "--in") { args.in = val; i++; }
    else if (key === "--out") { args.out = val; i++; }
    else if (key === "--depts") { args.depts = new Set(val.split(",").map((s) => s.trim().toUpperCase())); i++; }
    else if (key === "--max-level") { args.maxLevel = parseInt(val, 10); i++; }
  }
  if (!args.in || !args.out) {
    throw new Error("Usage: transform-courses --in <csv> --out <json> [--depts ...] [--max-level N]");
  }
  return args as Args;
}

/**
 * Minimal CSV parser handling double-quoted fields with embedded commas
 * and escaped quotes ("").  Sufficient for the scraper output.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\r") { /* skip */ }
      else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = []; }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function makeId(subject: string, number: string): string {
  return normalizeCourseId(subject, number);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const csvPath = path.resolve(args.in);
  const outPath = path.resolve(args.out);

  console.log(`Reading ${csvPath}`);
  const text = readFileSync(csvPath, "utf-8");
  const rows = parseCSV(text);
  const header = rows.shift();
  if (!header) throw new Error("CSV has no header row");
  const idx = (name: string) => header.indexOf(name);
  const SUBJECT = idx("subject");
  const NUMBER = idx("course_number");
  const CREDITS = idx("credits");
  const TITLE = idx("title");
  const DESC = idx("description");
  const PREREQ = idx("prerequisite_raw");
  const COREQ = idx("corequisite_raw");

  let total = 0;
  let parsed = 0;
  let unparsed = 0;
  let skipped = 0;

  const courses: CourseRow[] = [];
  for (const row of rows) {
    if (row.length < header.length) continue;
    const subject = row[SUBJECT]?.trim().toUpperCase();
    const number = row[NUMBER]?.trim();
    if (!subject || !number) { skipped++; continue; }
    if (args.depts && !args.depts.has(subject)) { skipped++; continue; }

    const numericPart = parseInt(number.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(numericPart)) { skipped++; continue; }
    if (args.maxLevel != null && numericPart > args.maxLevel) { skipped++; continue; }

    total++;
    const id = makeId(subject, number);
    const credits = row[CREDITS]?.trim() || "0";
    const title = row[TITLE]?.trim() || id;
    const description = row[DESC]?.trim() || null;
    const prereqRaw = row[PREREQ]?.trim() || null;
    const coreqRaw = row[COREQ]?.trim() || null;

    const prereq = parsePrereq(prereqRaw);
    if (prereq.rule) parsed++;
    else if (prereq.unparsed) unparsed++;

    const corequisites = parseCorequisiteIds(coreqRaw);

    courses.push({
      id,
      dept: subject,
      code: number,
      title,
      credits: Number.isFinite(parseFloat(credits)) ? parseFloat(credits).toFixed(1) : "0.0",
      description,
      prerequisites: prereq.rule,
      prerequisitesRaw: prereq.unparsed ? prereq.raw : null,
      corequisites,
      corequisitesRaw: coreqRaw,
      termsOffered: [],
    });
  }

  courses.sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(outPath, JSON.stringify(courses, null, 2), "utf-8");

  console.log(`\nDone.`);
  console.log(`  Wrote     ${courses.length.toString().padStart(6)} courses to ${outPath}`);
  console.log(`  Parsed    ${parsed.toString().padStart(6)} prereqs to structured tree`);
  console.log(`  Unparsed  ${unparsed.toString().padStart(6)} prereqs kept as raw text`);
  console.log(`  Skipped   ${skipped.toString().padStart(6)} CSV rows (dept filter / bad code)`);
  console.log(`  Total in  ${total.toString().padStart(6)}`);
}

main();
