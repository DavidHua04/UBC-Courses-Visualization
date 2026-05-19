import type {
  CourseRow,
  EntryRow,
  Recommendation,
} from "../models/types";
import type {
  ICourseRepository,
  IPlanEntryRepository,
} from "../repositories/interfaces";
import type { ProgressService } from "./progress.service";

const COUNTED_STATUSES = new Set(["planned", "in_progress", "completed"]);
const TARGET_CREDITS_PER_YEAR = 30;
const W_TERMS_PER_YEAR = 2;
const MIN_COURSES_PER_W_TERM = 4;
const MAX_COURSES_PER_W_TERM = 5;

function termKey(e: EntryRow): string {
  return `Y${e.year}-${e.term}`;
}

function isWinterTerm(term: string): boolean {
  return term === "W1" || term === "W2";
}

function isSummerTerm(term: string): boolean {
  return term === "S" || term.startsWith("S");
}

function getCredits(course: CourseRow | undefined): number {
  if (!course) return 0;
  const n = parseFloat(course.credits);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Pure heuristics — not AI.  Each rule reads from plan entries and (optionally)
 * a program's progress to produce a small set of cards the UI can render.
 */
export class RecommendationsService {
  constructor(
    private entries: IPlanEntryRepository,
    private courses: ICourseRepository,
    private progress: ProgressService,
  ) {}

  async generate(planId: string, programId?: string): Promise<Recommendation[]> {
    const allEntries = await this.entries.findByPlanId(planId);
    const entries = allEntries.filter((e) => COUNTED_STATUSES.has(e.status));
    const courseIds = Array.from(new Set(entries.map((e) => e.courseId)));
    const courseList = await this.courses.findByIds(courseIds);
    const courseMap = new Map(courseList.map((c) => [c.id, c]));

    const recs: Recommendation[] = [];

    // Group by term key
    const byTerm = new Map<string, EntryRow[]>();
    for (const e of allEntries) {
      const k = termKey(e);
      const list = byTerm.get(k) ?? [];
      list.push(e);
      byTerm.set(k, list);
    }

    // 1. Light course load — Winter terms with 1-3 courses
    for (const [key, list] of byTerm) {
      const term = list[0].term;
      if (!isWinterTerm(term)) continue;
      const counted = list.filter((e) => COUNTED_STATUSES.has(e.status));
      if (counted.length === 0) continue;
      if (counted.length < MIN_COURSES_PER_W_TERM) {
        recs.push({
          id: `light-load-${key}`,
          severity: "suggestion",
          title: `Light course load in ${key}`,
          message: `Only ${counted.length} course${counted.length === 1 ? "" : "s"} scheduled. Most students take ${MIN_COURSES_PER_W_TERM}-${MAX_COURSES_PER_W_TERM} per winter term to graduate in 4 years.`,
          context: { termKey: key, courseIds: counted.map((e) => e.courseId) },
        });
      } else if (counted.length > MAX_COURSES_PER_W_TERM) {
        recs.push({
          id: `heavy-load-${key}`,
          severity: "warning",
          title: `Heavy course load in ${key}`,
          message: `${counted.length} courses scheduled. ${MAX_COURSES_PER_W_TERM}+ courses per term is uncommon and may risk academic performance.`,
          context: { termKey: key, courseIds: counted.map((e) => e.courseId) },
        });
      }
    }

    // 2. Empty terms
    const emptyTerms = Array.from(byTerm.entries())
      .filter(([_, list]) => list.every((e) => !COUNTED_STATUSES.has(e.status)))
      .map(([k]) => k);
    if (emptyTerms.length > 0 && byTerm.size > 1) {
      recs.push({
        id: "empty-terms",
        severity: "suggestion",
        title: "Empty terms in plan",
        message: `${emptyTerms.length} term${emptyTerms.length === 1 ? "" : "s"} (${emptyTerms.join(", ")}) have no courses. Consider planning courses there or removing the term.`,
        context: { termKey: emptyTerms[0] },
      });
    }

    // 3. Graduation pace (4-year target)
    const winterTerms = Array.from(byTerm.values()).filter(
      (list) => list.length > 0 && isWinterTerm(list[0].term),
    );
    if (winterTerms.length > 0 && programId) {
      const totalCredits = entries
        .filter((e) => isWinterTerm(e.term) || isSummerTerm(e.term))
        .reduce((s, e) => s + getCredits(courseMap.get(e.courseId)), 0);

      const yearsScheduled = Math.ceil(winterTerms.length / W_TERMS_PER_YEAR);
      const creditsPerYear = yearsScheduled > 0 ? totalCredits / yearsScheduled : 0;

      const progress = await this.progress.compute(planId, programId);
      const remaining = progress ? progress.totalCredits - progress.completedCredits : null;

      if (yearsScheduled <= 4 && creditsPerYear < TARGET_CREDITS_PER_YEAR && remaining != null && remaining > 0) {
        recs.push({
          id: "pace-behind",
          severity: "warning",
          title: "Off-pace for 4-year graduation",
          message: `You're averaging ${Math.round(creditsPerYear)} credits/year over ${yearsScheduled} year${yearsScheduled === 1 ? "" : "s"} — the 4-year target is ${TARGET_CREDITS_PER_YEAR}. ${remaining} credits remain.`,
        });
      } else if (yearsScheduled > 4 && remaining != null && remaining > 0) {
        recs.push({
          id: "pace-extended",
          severity: "warning",
          title: "Extended graduation timeline",
          message: `${winterTerms.length} winter terms scheduled (${yearsScheduled} years). Add summer terms or load more per term to graduate in 4.`,
        });
      } else if (remaining === 0) {
        recs.push({
          id: "pace-complete",
          severity: "info",
          title: "Plan covers full degree",
          message: `All ${progress?.totalCredits ?? ""} credits accounted for across ${yearsScheduled} year${yearsScheduled === 1 ? "" : "s"}.`,
        });
      }
    }

    // 4. Unmet requirement summary (top 3 unsatisfied)
    if (programId) {
      const progress = await this.progress.compute(planId, programId);
      if (progress) {
        const unsatisfied = progress.requirements.filter((r) => !r.satisfied);
        const topThree = unsatisfied.slice(0, 3);
        if (topThree.length > 0) {
          recs.push({
            id: "unmet-requirements",
            severity: "info",
            title: `${unsatisfied.length} requirement${unsatisfied.length === 1 ? "" : "s"} still unmet`,
            message: topThree.map((r) => `• ${r.requirementName}`).join("\n"),
            context: { requirementIds: topThree.map((r) => r.requirementId) },
          });
        }
      }
    }

    if (recs.length === 0) {
      recs.push({
        id: "plan-looking-good",
        severity: "info",
        title: "Plan looks balanced",
        message: "No issues detected. Keep adding courses to fill out remaining requirements.",
      });
    }

    return recs;
  }
}
