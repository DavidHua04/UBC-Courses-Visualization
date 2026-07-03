// Prerequisite rule evaluation. Pure functions over plain data.

import type { PrereqRule, RuleEval } from "./types";
import { displayId } from "./types";

/** Courses already taken, mapped to their credit value. */
export type TakenMap = ReadonlyMap<string, number>;

/**
 * Evaluate a rule tree against taken courses, returning the same tree
 * annotated with met/unmet at every node so the UI can render exactly
 * which branch failed.
 */
export function evaluateRule(rule: PrereqRule, taken: TakenMap): RuleEval {
  switch (rule.type) {
    case "course":
      return { rule, status: taken.has(rule.courseId) ? "met" : "unmet" };

    case "all_of": {
      const children = rule.rules.map((r) => evaluateRule(r, taken));
      return {
        rule,
        status: children.every((c) => c.status === "met") ? "met" : "unmet",
        children,
      };
    }

    case "one_of": {
      const children = rule.rules.map((r) => evaluateRule(r, taken));
      const need = rule.minCount ?? 1;
      const have = children.filter((c) => c.status === "met").length;
      return { rule, status: have >= need ? "met" : "unmet", children };
    }

    case "min_credits": {
      let credits = 0;
      if (rule.from) {
        for (const id of rule.from) credits += taken.get(id) ?? 0;
      } else {
        for (const c of taken.values()) credits += c;
      }
      return {
        rule,
        status: credits >= rule.minCredits ? "met" : "unmet",
        creditsCounted: credits,
      };
    }
  }
}

/**
 * Course ids that could still help satisfy the unmet parts of an evaluated
 * rule. Met branches contribute nothing; within an unmet one_of, every unmet
 * alternative is a valid suggestion.
 */
export function collectMissing(ev: RuleEval): string[] {
  const out = new Set<string>();
  walk(ev, out);
  return [...out];
}

function walk(ev: RuleEval, out: Set<string>): void {
  if (ev.status === "met") return;
  switch (ev.rule.type) {
    case "course":
      out.add(ev.rule.courseId);
      break;
    case "all_of":
    case "one_of":
      for (const child of ev.children ?? []) walk(child, out);
      break;
    case "min_credits":
      for (const id of ev.rule.from ?? []) {
        if (!out.has(id)) out.add(id);
      }
      break;
  }
}

/** Human-readable one-line description of a rule tree. */
export function describeRule(rule: PrereqRule): string {
  switch (rule.type) {
    case "course":
      return displayId(rule.courseId);
    case "all_of":
      return rule.rules.map(describeRule).join(" and ");
    case "one_of": {
      const parts = rule.rules.map(describeRule);
      const n = rule.minCount ?? 1;
      return n > 1 ? `${n} of: ${parts.join(", ")}` : `one of ${parts.join(", ")}`;
    }
    case "min_credits":
      return rule.from
        ? `${rule.minCredits} credits from ${rule.from.map(displayId).join(", ")}`
        : `${rule.minCredits} credits`;
  }
}
