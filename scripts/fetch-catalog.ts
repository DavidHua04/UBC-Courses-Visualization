// Catalog updater: scrapes the UBC Vancouver Academic Calendar into
// data/source/catalog.json (the input of scripts/build-data.ts).
//
//   subjects index  /course-descriptions/courses-subject   → subject URLs
//   subject page    /course-descriptions/subject/cpscv     → course articles
//
// Each course is one <article class="node--type-course"> whose <h3> holds
// "CPSC_V 210 (4) <strong>Title</strong>" and whose <p> holds the calendar
// description with trailing "Prerequisite: … Corequisite: … Equivalency: …"
// clauses. We split those clauses out at scrape time; all rule parsing
// stays in build-data.ts.
//
// Run: npm run data:fetch   (then: npm run data)
//
// The script is all-or-nothing: any subject that still fails after retries,
// or a suspiciously small total, aborts before anything is written.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const BASE = "https://vancouver.calendar.ubc.ca";
const SUBJECTS_URL = `${BASE}/course-descriptions/courses-subject`;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) degree-map-catalog-updater";
const CONCURRENCY = 4;
const MIN_EXPECTED_COURSES = 6000; // catalog has ~7,300; far fewer means a broken scrape

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "data", "source", "catalog.json");
const metaPath = join(root, "data", "source", "meta.json");

// ── Output shape (consumed by build-data.ts) ────────────────────────

export interface RawCourse {
  id: string; // "CPSC210"
  dept: string; // "CPSC"
  code: string; // "210", "310A"
  title: string;
  credits: string; // raw, e.g. "3", "3-6"
  description: string; // calendar prose without the requisite clauses
  prereqText: string | null;
  coreqText: string | null;
  equivText: string | null;
}

// ── Fetching ────────────────────────────────────────────────────────

async function fetchText(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw new Error(`Failed to fetch ${url}: ${String(lastError)}`);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// ── HTML → text ─────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** "CPSC_V 210" / "CPSC_O 210" → "CPSC 210" everywhere in prose.
 *  The calendar occasionally writes "CLST _V 101" with a stray space. */
function stripCampusSuffix(s: string): string {
  return s.replace(/\b([A-Z]{2,5})\s*_[VO]\b/g, "$1");
}

// ── Course extraction ───────────────────────────────────────────────

const ARTICLE_RE = /<article class="node node--type-course[^"]*">([\s\S]*?)<\/article>/g;
const H3_RE = /<h3[^>]*>([\s\S]*?)<\/h3>/;
const P_RE = /<p[^>]*>([\s\S]*?)<\/p>/g;
const HEADING_RE = /^([A-Z]{2,5})\s+(\d{3,4}[A-Z]?)\s*\(([^)]*)\)\s*(.*)$/;

const NOISE = /\s*This course is not eligible for Credit\/D\/Fail grading\.?/gi;
const PREREQ_CLAUSE = /Prerequisite:\s*([\s\S]*?)(?=\s*Corequisite:|\s*Equivalency:|$)/i;
const COREQ_CLAUSE = /Corequisite:\s*([\s\S]*?)(?=\s*Prerequisite:|\s*Equivalency:|$)/i;
const EQUIV_CLAUSE = /Equivalency:\s*([\s\S]*?)(?=\s*Prerequisite:|\s*Corequisite:|$)/i;
const FIRST_CLAUSE = /\b(?:Prerequisite|Corequisite|Equivalency):/i;

function extractClause(re: RegExp, text: string): string | null {
  const m = re.exec(text);
  if (!m) return null;
  const s = m[1].replace(NOISE, "").replace(/\s+/g, " ").trim();
  return s || null;
}

export function parseSubjectPage(html: string): RawCourse[] {
  const out: RawCourse[] = [];
  for (const article of html.matchAll(ARTICLE_RE)) {
    const body = article[1];
    const h3 = H3_RE.exec(body);
    if (!h3) continue;
    const heading = stripCampusSuffix(htmlToText(h3[1]));
    const hm = HEADING_RE.exec(heading);
    if (!hm) {
      console.warn(`  ! unrecognized course heading: "${heading}"`);
      continue;
    }
    const [, dept, code, credits, title] = hm;

    const paragraphs = [...body.matchAll(P_RE)].map((m) => htmlToText(m[1]));
    const fullText = stripCampusSuffix(paragraphs.join(" ").replace(/\s+/g, " ").trim());

    const clauseStart = fullText.search(FIRST_CLAUSE);
    const description = (clauseStart >= 0 ? fullText.slice(0, clauseStart) : fullText)
      .replace(NOISE, "")
      .replace(/\s+/g, " ")
      .trim();

    out.push({
      id: `${dept}${code}`,
      dept,
      code,
      title: title.trim(),
      credits: credits.trim(),
      description,
      prereqText: extractClause(PREREQ_CLAUSE, fullText),
      coreqText: extractClause(COREQ_CLAUSE, fullText),
      equivText: extractClause(EQUIV_CLAUSE, fullText),
    });
  }
  return out;
}

/** Follow Drupal pager links, if a subject ever grows one. */
async function fetchSubjectCourses(url: string): Promise<RawCourse[]> {
  const courses: RawCourse[] = [];
  let pageUrl: string | null = url;
  while (pageUrl) {
    const html = await fetchText(pageUrl);
    courses.push(...parseSubjectPage(html));
    const next = /<a[^>]*href="([^"]*\?page=\d+)"[^>]*rel="next"/i.exec(html);
    pageUrl = next ? new URL(decodeEntities(next[1]), pageUrl).toString() : null;
  }
  return courses;
}

// ── Diff report against the previous catalog ────────────────────────

interface OldCourse {
  id: string;
  title?: string;
  credits?: string;
  description?: string | null;
  prerequisitesRaw?: string | null;
  prereqText?: string | null;
  coreqText?: string | null;
  equivText?: string | null;
}

/** Old records embed the clauses in `description`; normalize for comparison. */
function oldProse(c: OldCourse): { prereq: string | null; coreq: string | null; equiv: string | null } {
  if ("prereqText" in c || "coreqText" in c || "equivText" in c) {
    return { prereq: c.prereqText ?? null, coreq: c.coreqText ?? null, equiv: c.equivText ?? null };
  }
  const text = c.description ?? "";
  return {
    prereq: extractClause(PREREQ_CLAUSE, text) ?? c.prerequisitesRaw?.trim() ?? null,
    coreq: extractClause(COREQ_CLAUSE, text),
    equiv: extractClause(EQUIV_CLAUSE, text),
  };
}

function printDiff(oldCourses: OldCourse[], newCourses: RawCourse[]): void {
  const oldById = new Map(oldCourses.map((c) => [c.id, c]));
  const newById = new Map(newCourses.map((c) => [c.id, c]));

  const added = newCourses.filter((c) => !oldById.has(c.id)).map((c) => c.id);
  const removed = oldCourses.filter((c) => !newById.has(c.id)).map((c) => c.id);

  const changed = { title: 0, credits: 0, prereq: 0, coreq: 0, equiv: 0 };
  for (const nc of newCourses) {
    const oc = oldById.get(nc.id);
    if (!oc) continue;
    if (oc.title !== undefined && oc.title !== nc.title) changed.title++;
    if (oc.credits !== undefined && parseFloat(oc.credits) !== parseFloat(nc.credits || "NaN"))
      changed.credits++;
    const prose = oldProse(oc);
    if ((prose.prereq ?? "") !== (nc.prereqText ?? "")) changed.prereq++;
    if ((prose.coreq ?? "") !== (nc.coreqText ?? "")) changed.coreq++;
    if ((prose.equiv ?? "") !== (nc.equivText ?? "")) changed.equiv++;
  }

  const list = (ids: string[]) =>
    ids.slice(0, 15).join(", ") + (ids.length > 15 ? `, … (+${ids.length - 15})` : "");
  console.log("\nDiff vs previous catalog:");
  console.log(`  added   ${added.length}${added.length ? `: ${list(added)}` : ""}`);
  console.log(`  removed ${removed.length}${removed.length ? `: ${list(removed)}` : ""}`);
  console.log(
    `  changed — title: ${changed.title}, credits: ${changed.credits}, ` +
      `prereq text: ${changed.prereq}, coreq text: ${changed.coreq}, equiv text: ${changed.equiv}`,
  );
}

// ── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`Fetching subject index: ${SUBJECTS_URL}`);
  const indexHtml = await fetchText(SUBJECTS_URL);
  const subjectUrls = [
    ...new Set(
      [...indexHtml.matchAll(/href="((?:https?:\/\/[^"]*)?\/course-descriptions\/subject\/[a-z0-9]+)"/g)].map(
        (m) => new URL(m[1], BASE).toString(),
      ),
    ),
  ].sort();
  if (subjectUrls.length < 100) {
    throw new Error(`Only ${subjectUrls.length} subject links found — page layout changed?`);
  }
  console.log(`Subjects: ${subjectUrls.length}`);

  let done = 0;
  const perSubject = await mapWithConcurrency(subjectUrls, CONCURRENCY, async (url) => {
    const courses = await fetchSubjectCourses(url);
    done++;
    if (done % 25 === 0) console.log(`  … ${done}/${subjectUrls.length} subjects`);
    if (courses.length === 0) console.warn(`  ! no courses parsed from ${url}`);
    return courses;
  });

  // Dedup by id (a course should only appear under its own subject).
  const byId = new Map<string, RawCourse>();
  for (const c of perSubject.flat()) {
    if (!byId.has(c.id)) byId.set(c.id, c);
  }
  const courses = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

  if (courses.length < MIN_EXPECTED_COURSES) {
    throw new Error(
      `Parsed only ${courses.length} courses (< ${MIN_EXPECTED_COURSES}) — aborting without writing.`,
    );
  }

  const withPrereq = courses.filter((c) => c.prereqText).length;
  const withCoreq = courses.filter((c) => c.coreqText).length;
  const withEquiv = courses.filter((c) => c.equivText).length;
  console.log(
    `Parsed ${courses.length} courses — prereq prose: ${withPrereq}, ` +
      `coreq prose: ${withCoreq}, equivalency: ${withEquiv}`,
  );

  if (existsSync(catalogPath)) {
    try {
      printDiff(JSON.parse(readFileSync(catalogPath, "utf8")), courses);
    } catch (err) {
      console.warn(`  ! could not diff against previous catalog: ${String(err)}`);
    }
  }

  writeFileSync(catalogPath, JSON.stringify(courses, null, 1) + "\n");
  writeFileSync(
    metaPath,
    JSON.stringify(
      { scrapedAt: new Date().toISOString(), source: SUBJECTS_URL, subjects: subjectUrls.length, courses: courses.length },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${catalogPath}`);
  console.log("Next: npm run data   (regenerates public/data/)");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
