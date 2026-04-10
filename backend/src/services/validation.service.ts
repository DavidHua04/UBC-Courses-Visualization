import type {
  PrerequisiteRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from "../models/types";
import type {
  ICourseRepository,
  IPlanEntryRepository,
  IValidationCache,
} from "../repositories/interfaces";

const CREDIT_LIMIT_REGULAR = 18;
const CREDIT_LIMIT_SUMMER = 9;

export class ValidationService {
  constructor(
    private entries: IPlanEntryRepository,
    private courses: ICourseRepository,
    private cache: IValidationCache,
  ) {}

  async validate(planId: string, skipCache = false): Promise<ValidationResult & { cached: boolean }> {
    if (!skipCache) {
      const cached = await this.cache.get(planId);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    const result = await this.computeValidation(planId);
    await this.cache.set(planId, result);
    return { ...result, cached: false };
  }

  private async computeValidation(planId: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const entries = await this.entries.findByPlanId(planId);

    if (entries.length === 0) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        computedAt: new Date().toISOString(),
      };
    }

    // Load only the courses referenced by this plan
    const courseIds = [...new Set(entries.map((e) => e.courseId))];
    const courseRows = await this.courses.findByIds(courseIds);
    const courseMap = new Map(courseRows.map((c) => [c.id, c]));

    // Build timeline: group entries by (year, term)
    type TermKey = string;
    const termOrder: TermKey[] = [];
    const termEntries = new Map<TermKey, typeof entries>();

    for (const entry of entries) {
      const key = `${entry.year}:${entry.term}`;
      if (!termEntries.has(key)) {
        termEntries.set(key, []);
        termOrder.push(key);
      }
      termEntries.get(key)!.push(entry);
    }

    // Sort term keys chronologically
    const termPriority: Record<string, number> = { W1: 0, W2: 1, S: 2 };
    termOrder.sort((a, b) => {
      const [yearA, termA] = a.split(":");
      const [yearB, termB] = b.split(":");
      if (yearA !== yearB) return Number(yearA) - Number(yearB);
      return (termPriority[termA] ?? 0) - (termPriority[termB] ?? 0);
    });

    // Process each term
    const completed = new Set<string>();
    const completedWithCredits = new Map<string, number>();

    for (const termKey of termOrder) {
      const termEntriesArr = termEntries.get(termKey)!;
      const [, term] = termKey.split(":");

      let termCredits = 0;

      for (const entry of termEntriesArr) {
        const course = courseMap.get(entry.courseId);
        if (!course) continue;

        const credits = parseFloat(course.credits ?? "3");
        termCredits += credits;

        if (entry.status === "planned" || entry.status === "in_progress") {
          const prereq = course.prerequisites as PrerequisiteRule | null;
          if (prereq) {
            const satisfied = this.checkPrereqWithCredits(
              prereq,
              completed,
              completedWithCredits,
            );
            if (!satisfied) {
              errors.push({
                entryId: entry.id,
                courseId: entry.courseId,
                message: `Prerequisites not satisfied for ${entry.courseId}: ${this.describeRule(prereq)}`,
              });
            }
          }
        }

        if (entry.status === "completed") {
          completed.add(entry.courseId);
          completedWithCredits.set(entry.courseId, credits);
        }
      }

      const creditLimit = term === "S" ? CREDIT_LIMIT_SUMMER : CREDIT_LIMIT_REGULAR;
      if (termCredits > creditLimit) {
        for (const entry of termEntriesArr) {
          warnings.push({
            entryId: entry.id,
            courseId: entry.courseId,
            message: `Term ${termKey} has ${termCredits} credits, exceeding the ${creditLimit}-credit limit`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      computedAt: new Date().toISOString(),
    };
  }

  private checkPrereqWithCredits(
    rule: PrerequisiteRule,
    completed: Set<string>,
    completedWithCredits: Map<string, number>,
  ): boolean {
    switch (rule.type) {
      case "course":
        return completed.has(rule.courseId);

      case "all_of":
        return rule.rules.every((r) =>
          this.checkPrereqWithCredits(r, completed, completedWithCredits),
        );

      case "one_of": {
        const minCount = rule.minCount ?? 1;
        let count = 0;
        for (const r of rule.rules) {
          if (this.checkPrereqWithCredits(r, completed, completedWithCredits))
            count++;
          if (count >= minCount) return true;
        }
        return false;
      }

      case "min_credits": {
        const pool = rule.from;
        let total = 0;
        if (pool) {
          for (const courseId of pool) {
            if (completed.has(courseId)) {
              total += completedWithCredits.get(courseId) ?? 3;
            }
          }
        } else {
          for (const credits of completedWithCredits.values()) {
            total += credits;
          }
        }
        return total >= rule.minCredits;
      }
    }
  }

  private describeRule(rule: PrerequisiteRule): string {
    switch (rule.type) {
      case "course":
        return rule.courseId;
      case "all_of":
        return `all of [${rule.rules.map((r) => this.describeRule(r)).join(", ")}]`;
      case "one_of":
        return `one of [${rule.rules.map((r) => this.describeRule(r)).join(", ")}]`;
      case "min_credits":
        return `${rule.minCredits} credits${rule.from ? ` from [${rule.from.join(", ")}]` : ""}`;
    }
  }
}
