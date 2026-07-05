import { describe, expect, it } from "vitest";
import { checkEligibility, validatePlan } from "./validate";
import { course, courseMap, entry, one_of, plan, req } from "./testUtils";

const cpsc110 = course("CPSC110", { credits: 4 });
const cpsc210 = course("CPSC210", {
  credits: 4,
  prereq: one_of(req("CPSC107"), req("CPSC110")),
});
const cpsc310 = course("CPSC310", { credits: 4, prereq: req("CPSC210") });
const standing = course("APBI314", { prereqText: "At least third-year standing." });
const withCoreq = course("PHYS159", { coreq: ["PHYS157"] });
const phys157 = course("PHYS157");
const cpscGeneric1 = course("CPSC100T", { credits: 3, generic: true });

const catalog = courseMap(cpsc110, cpsc210, cpsc310, standing, withCoreq, phys157, cpscGeneric1);

describe("validatePlan", () => {
  it("accepts a correctly ordered plan", () => {
    const p = plan([
      entry("CPSC110", 1, "W1"),
      entry("CPSC210", 1, "W2"),
      entry("CPSC310", 2, "W1"),
    ]);
    const report = validatePlan(p, catalog);
    expect(report.ok).toBe(true);
    expect(report.entryIssues).toEqual([]);
    expect(report.totalCredits).toBe(12);
  });

  it("flags a prereq planned in a later term as an ordering problem", () => {
    const p = plan([entry("CPSC210", 1, "W1"), entry("CPSC110", 1, "W2")]);
    const report = validatePlan(p, catalog);
    expect(report.ok).toBe(false);
    const issue = report.entryIssues.find((i) => i.kind === "prereq_unmet")!;
    expect(issue.courseId).toBe("CPSC210");
    expect(issue.missingButPlannedLater).toEqual(["CPSC110"]);
    expect(issue.missingEntirely).toEqual(["CPSC107"]);
  });

  it("same-term prerequisites do not count", () => {
    const p = plan([entry("CPSC110", 1, "W1"), entry("CPSC210", 1, "W1")]);
    expect(validatePlan(p, catalog).ok).toBe(false);
  });

  it("failed courses do not satisfy prerequisites", () => {
    const p = plan([entry("CPSC110", 1, "W1", "failed"), entry("CPSC210", 1, "W2")]);
    expect(validatePlan(p, catalog).ok).toBe(false);
  });

  it("completed entries are history and not re-validated", () => {
    const p = plan([entry("CPSC310", 1, "W1", "completed")]);
    expect(validatePlan(p, catalog).ok).toBe(true);
  });

  it("prose-only prerequisites produce a warning, not an error", () => {
    const p = plan([entry("APBI314", 3, "W1")]);
    const report = validatePlan(p, catalog);
    expect(report.ok).toBe(true);
    expect(report.entryIssues[0].kind).toBe("prereq_unknown");
    expect(report.entryIssues[0].severity).toBe("warning");
  });

  it("corequisites may share the term; missing ones are errors", () => {
    const together = plan([entry("PHYS159", 1, "W1"), entry("PHYS157", 1, "W1")]);
    expect(validatePlan(together, catalog).ok).toBe(true);

    const alone = plan([entry("PHYS159", 1, "W1")]);
    const report = validatePlan(alone, catalog);
    expect(report.entryIssues[0].kind).toBe("coreq_missing");
  });

  it("flags duplicates but lets a retake after failure pass", () => {
    const dup = plan([entry("CPSC110", 1, "W1"), entry("CPSC110", 2, "W1")]);
    expect(validatePlan(dup, catalog).entryIssues[0].kind).toBe("duplicate_course");

    const retake = plan([entry("CPSC110", 1, "W1", "failed"), entry("CPSC110", 2, "W1")]);
    expect(validatePlan(retake, catalog).ok).toBe(true);
  });

  it("warns on term overload (18 winter / 9 summer)", () => {
    const heavy = plan([
      entry("CPSC110", 1, "W1"),
      entry("CPSC210", 1, "W1"),
      entry("CPSC310", 1, "W1"),
      entry("PHYS157", 1, "W1"),
      entry("PHYS159", 1, "W1"),
      entry("APBI314", 1, "W1"),
    ]); // 4+4+4+3+3+3 = 21 > 18
    const report = validatePlan(heavy, catalog);
    expect(report.termIssues).toHaveLength(1);
    expect(report.termIssues[0].credits).toBe(21);

    const summer = plan([
      entry("CPSC110", 1, "S"),
      entry("CPSC210", 1, "S"),
      entry("PHYS157", 1, "S"),
    ]); // 11 > 9
    expect(validatePlan(summer, catalog).termIssues[0].limit).toBe(9);
  });

  it("reports unknown courses", () => {
    const p = plan([entry("FAKE999", 1, "W1")]);
    const report = validatePlan(p, catalog);
    expect(report.ok).toBe(false);
    expect(report.entryIssues[0].kind).toBe("unknown_course");
  });

  it("the transfer-credit row (year 0) counts as taken before Year 1", () => {
    const p = plan([entry("CPSC110", 0, "TR"), entry("CPSC210", 1, "W1")]);
    expect(validatePlan(p, catalog).ok).toBe(true);
  });

  it("a generic transfer placeholder never satisfies a specific prerequisite", () => {
    const p = plan([entry("CPSC100T", 0, "TR"), entry("CPSC210", 1, "W1")]);
    const report = validatePlan(p, catalog);
    expect(report.ok).toBe(false);
    expect(report.entryIssues[0].kind).toBe("prereq_unmet");
  });

  it("creditsOverride replaces the catalog credit value in totals", () => {
    const p = plan([entry("CPSC100T", 0, "TR", "planned", 6)]);
    const report = validatePlan(p, catalog);
    expect(report.totalCredits).toBe(6);
    expect(report.termCredits["0:TR"]).toBe(6);
  });

  it("does not apply a term-overload limit to the transfer row", () => {
    const p = plan([entry("CPSC100T", 0, "TR", "planned", 30)]);
    expect(validatePlan(p, catalog).termIssues).toEqual([]);
  });
});

describe("checkEligibility", () => {
  const base = plan([entry("CPSC110", 1, "W1")]);

  it("eligible when prereqs are met by earlier terms", () => {
    expect(checkEligibility(cpsc210, 1, "W2", base, catalog).kind).toBe("eligible");
  });

  it("ineligible in the same term as its prereq", () => {
    const r = checkEligibility(cpsc210, 1, "W1", base, catalog);
    expect(r.kind).toBe("ineligible");
    if (r.kind === "ineligible") expect(r.missing).toContain("CPSC110");
  });

  it("no_prereq for open courses, unknown for prose", () => {
    expect(checkEligibility(phys157, 1, "W1", base, catalog).kind).toBe("no_prereq");
    expect(checkEligibility(standing, 1, "W1", base, catalog).kind).toBe("unknown");
  });

  it("already_planned points at the existing slot", () => {
    const r = checkEligibility(cpsc110, 2, "W1", base, catalog);
    expect(r).toEqual({ kind: "already_planned", year: 1, term: "W1" });
  });
});
