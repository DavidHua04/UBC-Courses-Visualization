import type {
  CourseSelector,
  CourseRow,
  DegreeProgress,
  DegreeRequirement,
  EntryRow,
  Program,
  RequirementMatcher,
  RequirementProgress,
  ICourseRepository,
  IPlanEntryRepository,
  IProgramRepository,
} from "../dataModel";

const COUNTED_STATUSES = new Set(["planned", "in_progress", "completed"]);

function parseLevel(code: string): number {
  const m = code.match(/(\d{3,4})/);
  return m ? parseInt(m[1], 10) : NaN;
}

function courseCredits(c: CourseRow): number {
  const n = parseFloat(c.credits);
  return Number.isFinite(n) ? n : 0;
}

export function matchCourses(filter: CourseSelector, courses: CourseRow[]): CourseRow[] {
  return courses.filter((c) => {
    if (filter.excludeIds?.includes(c.id)) return false;
    if (filter.includeIds?.includes(c.id)) return true;
    if (filter.depts?.length && !filter.depts.includes(c.dept)) return false;

    const level = parseLevel(c.code);
    if (filter.minLevel != null) {
      if (Number.isNaN(level) || level < filter.minLevel) return false;
    }
    if (filter.maxLevel != null) {
      if (Number.isNaN(level) || level > filter.maxLevel) return false;
    }
    if (filter.facultyId && c.faculty !== filter.facultyId) return false;
    return true;
  });
}

interface MatcherResult {
  satisfied: boolean;
  completedCredits: number;
  requiredCredits: number;
  satisfyingIds: string[];
}

export interface EvaluateOptions {
  /** Stable id of the owning requirement — used to namespace transfer-credit keys. */
  requirementId?: string;
  /**
   * Set of strings that can mark a requirement (or a breadth subcategory) as
   * satisfied externally.  Keys are `${requirementId}` for whole-requirement
   * overrides and `${requirementId}-${categoryKey}` for breadth subcategories.
   */
  transferCredits?: Set<string>;
}

export function evaluateMatcher(
  matcher: RequirementMatcher,
  completed: CourseRow[],
  requiredCredits: number,
  options: EvaluateOptions = {},
): MatcherResult {
  switch (matcher.type) {
    case "courses_one_of": {
      const ids = new Set(matcher.courses);
      const hits = completed.filter((c) => ids.has(c.id));
      const first = hits[0];
      return {
        satisfied: hits.length > 0,
        completedCredits: first ? courseCredits(first) : 0,
        requiredCredits,
        satisfyingIds: first ? [first.id] : [],
      };
    }
    case "courses_all_of": {
      const ids = new Set(matcher.courses);
      const hits = completed.filter((c) => ids.has(c.id));
      const haveIds = new Set(hits.map((h) => h.id));
      const satisfied = matcher.courses.every((id) => haveIds.has(id));
      return {
        satisfied,
        completedCredits: hits.reduce((s, c) => s + courseCredits(c), 0),
        requiredCredits,
        satisfyingIds: hits.map((h) => h.id),
      };
    }
    case "credits_from_filter": {
      const matched = matchCourses(matcher.filter, completed);
      const credits = matched.reduce((s, c) => s + courseCredits(c), 0);
      return {
        satisfied: credits >= matcher.minCredits,
        completedCredits: credits,
        requiredCredits: matcher.minCredits,
        satisfyingIds: matched.map((m) => m.id),
      };
    }
    case "credits_total": {
      const credits = completed.reduce((s, c) => s + courseCredits(c), 0);
      return {
        satisfied: credits >= matcher.minCredits,
        completedCredits: credits,
        requiredCredits: matcher.minCredits,
        satisfyingIds: [],
      };
    }
    case "breadth_categories": {
      const satisfyingIds: string[] = [];
      let satisfiedCount = 0;
      for (const [key, filter] of Object.entries(matcher.categories)) {
        const matched = matchCourses(filter, completed);
        const transferKey = options.requirementId ? `${options.requirementId}-${key}` : null;
        const hasTransfer = transferKey ? options.transferCredits?.has(transferKey) ?? false : false;
        if (matched.length > 0) {
          satisfiedCount++;
          satisfyingIds.push(matched[0].id);
        } else if (hasTransfer) {
          satisfiedCount++;
        }
      }
      return {
        satisfied: satisfiedCount >= matcher.minCategories,
        completedCredits: satisfiedCount,
        requiredCredits: matcher.minCategories,
        satisfyingIds,
      };
    }
  }
}

export class ProgressService {
  constructor(
    private entries: IPlanEntryRepository,
    private courses: ICourseRepository,
    private programs: IProgramRepository,
  ) {}

  /**
   * Compute degree progress for a plan against a program.
   * Counts entries with status in {planned, in_progress, completed}; "failed" is excluded.
   *
   * @param transferCredits Optional set of identifiers marking requirements as
   *   externally satisfied.  Keys are `${requirementId}` for whole-requirement
   *   transfer credit, or `${requirementId}-${categoryKey}` for individual
   *   breadth subcategories.
   */
  async compute(
    planId: string,
    programId: string,
    transferCredits?: Set<string>,
  ): Promise<DegreeProgress | null> {
    const program = await this.programs.findProgramById(programId);
    if (!program) return null;
    const faculty = await this.programs.findFacultyById(program.facultyId);

    const entries = await this.entries.findByPlanId(planId);
    const countedEntries = entries.filter((e) => COUNTED_STATUSES.has(e.status));
    const courseIds = Array.from(new Set(countedEntries.map((e) => e.courseId)));
    const courses = await this.courses.findByIds(courseIds);

    let totalCredits = courses.reduce((s, c) => s + courseCredits(c), 0);

    const combinedReqs: DegreeRequirement[] = [
      ...(faculty?.requirements ?? []),
      ...program.requirements,
    ];

    const requirements: RequirementProgress[] = combinedReqs.map((req) => {
      const r = evaluateMatcher(req.matcher, courses, req.credits, {
        requirementId: req.id,
        transferCredits,
      });

      // Whole-requirement transfer credit overlay: only applies when courses
      // alone did NOT satisfy the requirement (avoids double-counting).
      let satisfied = r.satisfied;
      let completedCredits = r.completedCredits;
      if (!satisfied && transferCredits?.has(req.id)) {
        satisfied = true;
        completedCredits = r.requiredCredits;
        // Reflect the transferred credits in the running degree total
        totalCredits += req.credits;
      }

      return {
        requirementId: req.id,
        requirementName: req.name,
        requirementType: req.type,
        completedCredits,
        requiredCredits: r.requiredCredits,
        satisfied,
        satisfyingCourseIds: r.satisfyingIds,
      };
    });

    const percent = program.totalCredits > 0
      ? Math.min(100, Math.round((totalCredits / program.totalCredits) * 100))
      : 0;

    return {
      programId: program.id,
      totalCredits: program.totalCredits,
      completedCredits: totalCredits,
      percent,
      requirements,
    };
  }
}
