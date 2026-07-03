// Static-data client. The catalog ships as a compact index (loaded once)
// plus per-department chunks fetched on demand and cached here.

import type { Course, CourseLite, Program } from "../engine/types";
import { deptOf, liteId, liteTitle } from "../engine/types";

const base = `${import.meta.env.BASE_URL}data`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export function loadIndex(): Promise<CourseLite[]> {
  return fetchJson<{ courses: CourseLite[] }>("index.json").then((d) => d.courses);
}

export function loadPrograms(): Promise<Program[]> {
  return fetchJson<Program[]>("programs.json");
}

const inflight = new Map<string, Promise<Course[]>>();

export function loadDept(dept: string): Promise<Course[]> {
  let p = inflight.get(dept);
  if (!p) {
    p = fetchJson<Course[]>(`dept/${dept}.json`).catch((err) => {
      inflight.delete(dept); // allow retry after a transient failure
      throw err;
    });
    inflight.set(dept, p);
  }
  return p;
}

/** Departments needed to describe these course ids. */
export function deptsFor(courseIds: Iterable<string>): string[] {
  const depts = new Set<string>();
  for (const id of courseIds) depts.add(deptOf(id));
  return [...depts];
}

// ── Search ──────────────────────────────────────────────────────────

export interface SearchHit {
  lite: CourseLite;
  score: number;
}

/**
 * Rank courses for a query. "cpsc 210" and "cpsc210" hit the id; other
 * words match the title. Id-prefix beats id-substring beats title match.
 */
export function searchCourses(index: CourseLite[], query: string, limit = 40): CourseLite[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const compact = q.replace(/[\s-]+/g, "");
  const words = q.split(/\s+/).filter(Boolean);

  const hits: SearchHit[] = [];
  for (const lite of index) {
    const id = liteId(lite);
    let score = 0;
    if (id.startsWith(compact)) score = 100;
    else if (id.includes(compact)) score = 60;
    else {
      const title = liteTitle(lite).toUpperCase();
      if (words.every((w) => title.includes(w) || id.includes(w))) score = 30;
    }
    if (score > 0) hits.push({ lite, score });
  }

  hits.sort((a, b) => b.score - a.score || liteId(a.lite).localeCompare(liteId(b.lite)));
  return hits.slice(0, limit).map((h) => h.lite);
}
