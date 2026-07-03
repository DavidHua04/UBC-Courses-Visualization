import { describe, expect, it } from "vitest";
import { collectMissing, describeRule, evaluateRule } from "./prereq";
import { all_of, one_of, req } from "./testUtils";
import type { PrereqRule } from "./types";

const taken = (...pairs: [string, number][]) => new Map(pairs);

describe("evaluateRule", () => {
  it("meets a course leaf when taken", () => {
    expect(evaluateRule(req("CPSC110"), taken(["CPSC110", 4])).status).toBe("met");
    expect(evaluateRule(req("CPSC110"), taken()).status).toBe("unmet");
  });

  it("all_of requires every child", () => {
    const rule = all_of(req("CPSC210"), req("CPSC221"));
    expect(evaluateRule(rule, taken(["CPSC210", 4], ["CPSC221", 4])).status).toBe("met");
    const ev = evaluateRule(rule, taken(["CPSC210", 4]));
    expect(ev.status).toBe("unmet");
    expect(ev.children!.map((c) => c.status)).toEqual(["met", "unmet"]);
  });

  it("one_of needs a single met child by default", () => {
    const rule = one_of(req("CPSC107"), req("CPSC110"));
    expect(evaluateRule(rule, taken(["CPSC110", 4])).status).toBe("met");
    expect(evaluateRule(rule, taken()).status).toBe("unmet");
  });

  it("one_of honours minCount", () => {
    const rule: PrereqRule = {
      type: "one_of",
      minCount: 2,
      rules: [req("MATH100"), req("MATH101"), req("MATH200")],
    };
    expect(evaluateRule(rule, taken(["MATH100", 3])).status).toBe("unmet");
    expect(evaluateRule(rule, taken(["MATH100", 3], ["MATH200", 3])).status).toBe("met");
  });

  it("min_credits with a pool counts only pool courses", () => {
    const rule: PrereqRule = { type: "min_credits", minCredits: 6, from: ["CPSC110", "CPSC121"] };
    const ev = evaluateRule(rule, taken(["CPSC110", 4], ["MATH100", 3]));
    expect(ev.status).toBe("unmet");
    expect(ev.creditsCounted).toBe(4);
    expect(evaluateRule(rule, taken(["CPSC110", 4], ["CPSC121", 4])).status).toBe("met");
  });

  it("min_credits without a pool counts everything", () => {
    const rule: PrereqRule = { type: "min_credits", minCredits: 45 };
    expect(evaluateRule(rule, taken(["A1", 30], ["B2", 15])).status).toBe("met");
    expect(evaluateRule(rule, taken(["A1", 30])).status).toBe("unmet");
  });

  it("evaluates nested trees (real CPSC 310 shape)", () => {
    // one of (CPSC 210, CPEN 221) — after taking CPSC 110 → 210
    const rule = one_of(req("CPSC210"), req("CPEN221"));
    expect(evaluateRule(rule, taken(["CPSC210", 4])).status).toBe("met");
  });
});

describe("collectMissing", () => {
  it("returns nothing for met trees", () => {
    expect(collectMissing(evaluateRule(req("CPSC110"), taken(["CPSC110", 4])))).toEqual([]);
  });

  it("suggests every unmet alternative of a one_of", () => {
    const ev = evaluateRule(one_of(req("CPSC107"), req("CPSC110")), taken());
    expect(collectMissing(ev).sort()).toEqual(["CPSC107", "CPSC110"]);
  });

  it("skips met branches of an all_of", () => {
    const ev = evaluateRule(all_of(req("CPSC210"), req("CPSC221")), taken(["CPSC210", 4]));
    expect(collectMissing(ev)).toEqual(["CPSC221"]);
  });
});

describe("describeRule", () => {
  it("renders nested logic readably", () => {
    const rule = all_of(one_of(req("CPSC107"), req("CPSC110")), req("MATH100"));
    expect(describeRule(rule)).toBe("one of CPSC 107, CPSC 110 and MATH 100");
  });

  it("renders credit pools", () => {
    expect(describeRule({ type: "min_credits", minCredits: 9, from: ["CPSC310"] })).toBe(
      "9 credits from CPSC 310",
    );
  });
});
