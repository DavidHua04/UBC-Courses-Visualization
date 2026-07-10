import { describe, expect, it } from "vitest";
import { parseCourseIdList, parsePrereq } from "./parsePrereq";

describe("parsePrereq", () => {
  it("parses a single course", () => {
    expect(parsePrereq("CPSC 210").rule).toEqual({ type: "course", courseId: "CPSC210" });
  });

  it("parses 'One of A, B' (real CPSC 210 prose)", () => {
    expect(parsePrereq("One of CPSC 107, CPSC 110.").rule).toEqual({
      type: "one_of",
      rules: [
        { type: "course", courseId: "CPSC107" },
        { type: "course", courseId: "CPSC110" },
      ],
    });
  });

  it("parses 'A and B'", () => {
    expect(parsePrereq("CPSC 210 and CPSC 121").rule).toEqual({
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC210" },
        { type: "course", courseId: "CPSC121" },
      ],
    });
  });

  it("parses 'Either (a) X or (b) Y' lettered groups", () => {
    const { rule } = parsePrereq("Either (a) CPSC 210 or (b) CPEN 221.");
    expect(rule).toEqual({
      type: "one_of",
      rules: [
        { type: "course", courseId: "CPSC210" },
        { type: "course", courseId: "CPEN221" },
      ],
    });
  });

  it("parses nested 'all of' with one_of members", () => {
    const { rule } = parsePrereq("All of CPSC 213, CPSC 221 and one of MATH 200, MATH 226.");
    expect(rule?.type).toBe("all_of");
  });

  it("parses credit phrases with pools", () => {
    expect(parsePrereq("At least 3 credits of CPSC 300 or CPSC 310").rule).toMatchObject({
      type: "min_credits",
      minCredits: 3,
    });
  });

  it("normalizes _V campus suffixes", () => {
    expect(parsePrereq("CPSC_V 110").rule).toEqual({ type: "course", courseId: "CPSC110" });
  });

  it("strips grade qualifiers", () => {
    const { rule } = parsePrereq("A score of 64% or higher in MATH 101.");
    expect(rule).toEqual({ type: "course", courseId: "MATH101" });
  });

  it("refuses to half-parse prose with standing clauses joined by 'and'", () => {
    const r = parsePrereq("CPSC 210 and third-year standing.");
    expect(r.rule).toBeNull();
    expect(r.unparsed).toBe(true);
  });

  it("leaves pure standing prose unparsed", () => {
    const r = parsePrereq("At least third-year standing in any faculty.");
    expect(r.rule).toBeNull();
    expect(r.unparsed).toBe(true);
  });

  it("returns no rule and no flag for empty input", () => {
    expect(parsePrereq(null)).toEqual({ rule: null, unparsed: false });
    expect(parsePrereq("  ")).toEqual({ rule: null, unparsed: false });
  });
});

describe("parseCourseIdList", () => {
  it("extracts and dedupes ids", () => {
    expect(parseCourseIdList("PHYS 157 or PHYS 157 and MATH 100")).toEqual([
      "PHYS157",
      "MATH100",
    ]);
  });

  it("handles campus-suffixed and short subject codes", () => {
    expect(parseCourseIdList("AI_V 322.")).toEqual(["AI322"]);
  });

  it("tolerates missing spaces in bare id lists", () => {
    expect(parseCourseIdList("BIOL364")).toEqual(["BIOL364"]);
  });
});
