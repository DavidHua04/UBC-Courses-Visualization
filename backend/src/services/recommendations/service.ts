import type {
  CourseRow,
  DegreeProgress,
  EntryRow,
  ICourseRepository,
  IPlanEntryRepository,
  Recommendation,
} from "../../dataModel";
import type { ProgressService } from "../progress.service";
import type { RecommendationContext, RecommendationRule } from "./types";
import { COUNTED_STATUSES, termKey } from "./util";
import { defaultRules } from "./rules";

/**
 * Orchestrates a set of {@link RecommendationRule} plugins against a plan.
 *
 * Rules are passed as a constructor argument — callers can use the
 * built-in {@link defaultRules}, extend them, or supply a totally bespoke
 * list (e.g. plug in an LLM/RAG-backed rule).  The orchestrator builds a
 * lazy, memoized context once per `generate()` call and lets rules run
 * concurrently.
 */
export class RecommendationsService {
  private rules: RecommendationRule[];

  constructor(
    private entries: IPlanEntryRepository,
    private courses: ICourseRepository,
    private progressSvc: ProgressService,
    rules?: RecommendationRule[],
  ) {
    this.rules = rules ?? defaultRules;
  }

  async generate(planId: string, programId?: string): Promise<Recommendation[]> {
    const ctx = await this.buildContext(planId, programId);
    const results = await Promise.all(this.rules.map((r) => r.evaluate(ctx)));
    const recs = results.flat();

    if (recs.length === 0) {
      return [
        {
          id: "plan-looking-good",
          severity: "info",
          title: "Plan looks balanced",
          message: "No issues detected. Keep adding courses to fill out remaining requirements.",
        },
      ];
    }
    return recs;
  }

  private async buildContext(planId: string, programId?: string): Promise<RecommendationContext> {
    const allEntries = await this.entries.findByPlanId(planId);
    const countedEntries = allEntries.filter((e) => COUNTED_STATUSES.has(e.status));
    const courseIds = Array.from(new Set(countedEntries.map((e) => e.courseId)));
    const courseList = await this.courses.findByIds(courseIds);
    const courseMap = new Map<string, CourseRow>(courseList.map((c) => [c.id, c]));

    const byTerm = new Map<string, EntryRow[]>();
    for (const e of allEntries) {
      const k = termKey(e);
      const list = byTerm.get(k) ?? [];
      list.push(e);
      byTerm.set(k, list);
    }

    // Memoize progress() so multiple rules don't trigger duplicate work.
    let progressCache: Promise<DegreeProgress | null> | null = null;
    const progress = (): Promise<DegreeProgress | null> => {
      if (progressCache) return progressCache;
      progressCache = programId
        ? this.progressSvc.compute(planId, programId)
        : Promise.resolve(null);
      return progressCache;
    };

    return { planId, programId, allEntries, countedEntries, courseMap, byTerm, progress };
  }
}
