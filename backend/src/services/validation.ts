import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { planEntries, courses } from "../db/schema";
import type { PrerequisiteRule, ValidationResult, ValidationError, ValidationWarning } from "../models/types";

// Credit limits per term
const CREDIT_LIMIT_REGULAR = 18;
const CREDIT_LIMIT_SUMMER = 9;

function checkRule(rule: PrerequisiteRule, completed: Set<string>): boolean {
  switch (rule.type) {
    case "course":
      return completed.has(rule.courseId);

    case "all_of":
      return rule.rules.every((r) => checkRule(r, completed));

    case "one_of": {
      const minCount = rule.minCount ?? 1;
      let count = 0;
      for (const r of rule.rules) {
        if (checkRule(r, completed)) count++;
        if (count >= minCount) return true;
      }
      return false;
    }

    case "min_credits": {
      // We don't have credit info in completed set here; validate separately
      // For now, accept if no `from` filter or fallback to true (handled in validatePlan)
      return false;
    }
  }
}

export async function validatePlan(planId: string): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Load all entries ordered by (year, term, position)
  const entries = await db
    .select()
    .from(planEntries)
    .where(eq(planEntries.planId, planId))
    .orderBy(asc(planEntries.year), asc(planEntries.term), asc(planEntries.position));

  if (entries.length === 0) {
    return {
      valid: true,
      errors: [],
      warnings: [],
      computedAt: new Date().toISOString(),
    };
  }

  // Load all course data for entries in this plan
  const courseIds = [...new Set(entries.map((e) => e.courseId))];
  const courseRows = await db
    .select()
    .from(courses)
    .where(
      courseIds.length === 1
        ? eq(courses.id, courseIds[0])
        : // Use inArray for multiple
          eq(courses.id, courseIds[0]) // handled below via Map
    );

  // Fetch all courses at once
  const allCourses = await db.select().from(courses);
  const courseMap = new Map(allCourses.map((c) => [c.id, c]));

  // 2. Build timeline: group entries by (year, term)
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

  // Sort term keys chronologically (year ASC, then W1 < W2 < S within year)
  const termPriority: Record<string, number> = { W1: 0, W2: 1, S: 2 };
  termOrder.sort((a, b) => {
    const [yearA, termA] = a.split(":");
    const [yearB, termB] = b.split(":");
    if (yearA !== yearB) return Number(yearA) - Number(yearB);
    return (termPriority[termA] ?? 0) - (termPriority[termB] ?? 0);
  });

  // 3. Process each term
  const completed = new Set<string>(); // courseIds completed before this term
  const completedWithCredits = new Map<string, number>(); // courseId → credits

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
        // Check prerequisites
        const prereq = course.prerequisites as PrerequisiteRule | null;
        if (prereq) {
          const satisfied = checkPrereqWithCredits(prereq, completed, completedWithCredits);
          if (!satisfied) {
            errors.push({
              entryId: entry.id,
              courseId: entry.courseId,
              message: `Prerequisites not satisfied for ${entry.courseId}: ${describeRule(prereq)}`,
            });
          }
        }
      }

      // If completed, add to completed set for future terms
      if (entry.status === "completed") {
        completed.add(entry.courseId);
        completedWithCredits.set(entry.courseId, credits);
      }
    }

    // 4. Check credit load warnings
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

function checkPrereqWithCredits(
  rule: PrerequisiteRule,
  completed: Set<string>,
  completedWithCredits: Map<string, number>
): boolean {
  switch (rule.type) {
    case "course":
      return completed.has(rule.courseId);

    case "all_of":
      return rule.rules.every((r) => checkPrereqWithCredits(r, completed, completedWithCredits));

    case "one_of": {
      const minCount = rule.minCount ?? 1;
      let count = 0;
      for (const r of rule.rules) {
        if (checkPrereqWithCredits(r, completed, completedWithCredits)) count++;
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

function describeRule(rule: PrerequisiteRule): string {
  switch (rule.type) {
    case "course":
      return rule.courseId;
    case "all_of":
      return `all of [${rule.rules.map(describeRule).join(", ")}]`;
    case "one_of":
      return `one of [${rule.rules.map(describeRule).join(", ")}]`;
    case "min_credits":
      return `${rule.minCredits} credits${rule.from ? ` from [${rule.from.join(", ")}]` : ""}`;
  }
}
