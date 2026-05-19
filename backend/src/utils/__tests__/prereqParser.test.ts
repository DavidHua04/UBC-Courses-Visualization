import { describe, it, expect } from "vitest";
import { parsePrereq, parseCorequisiteIds } from "../prereqParser";

describe("parsePrereq", () => {
  it("returns null for empty input", () => {
    expect(parsePrereq("").rule).toBeNull();
    expect(parsePrereq(null).rule).toBeNull();
    expect(parsePrereq(undefined).rule).toBeNull();
  });

  it("parses a single course", () => {
    expect(parsePrereq("CPSC 103.").rule).toEqual({ type: "course", courseId: "CPSC103" });
  });

  it("parses a single course with _V campus suffix", () => {
    expect(parsePrereq("CPSC_V 221.").rule).toEqual({ type: "course", courseId: "CPSC221" });
  });

  it("parses a bracketed single course like [CPSC298]", () => {
    expect(parsePrereq("[CPSC298] This course is not eligible for Credit/D/Fail grading.").rule).toEqual({
      type: "course",
      courseId: "CPSC298",
    });
  });

  it("parses 'One of A, B, C' as one_of", () => {
    expect(parsePrereq("One of CPSC 107, CPSC 110.").rule).toEqual({
      type: "one_of",
      rules: [
        { type: "course", courseId: "CPSC107" },
        { type: "course", courseId: "CPSC110" },
      ],
    });
  });

  it("parses 'All of A, B' as all_of", () => {
    expect(parsePrereq("All of CPSC 213, CPSC 221.").rule).toEqual({
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC213" },
        { type: "course", courseId: "CPSC221" },
      ],
    });
  });

  it("parses 'X or Y' as one_of", () => {
    expect(parsePrereq("CPSC_V 221 or DSCI_V 221.").rule).toEqual({
      type: "one_of",
      rules: [
        { type: "course", courseId: "CPSC221" },
        { type: "course", courseId: "DSCI221" },
      ],
    });
  });

  it("parses 'A and either B or C' as all_of with nested one_of", () => {
    expect(parsePrereq("CPSC_V 213 and either CPSC_V 221 or DSCI_V 221.").rule).toEqual({
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC213" },
        {
          type: "one_of",
          rules: [
            { type: "course", courseId: "CPSC221" },
            { type: "course", courseId: "DSCI221" },
          ],
        },
      ],
    });
  });

  it("parses 'A and one of B, C, D'", () => {
    const r = parsePrereq("CPSC 221 and one of MATH 200, MATH 217, MATH 226.").rule;
    expect(r).toEqual({
      type: "all_of",
      rules: [
        { type: "course", courseId: "CPSC221" },
        {
          type: "one_of",
          rules: [
            { type: "course", courseId: "MATH200" },
            { type: "course", courseId: "MATH217" },
            { type: "course", courseId: "MATH226" },
          ],
        },
      ],
    });
  });

  it("parses lettered groups 'All of (a) X (b) Y (c) Z'", () => {
    const r = parsePrereq(
      "All of (a) one of CPSC_V 221, DSCI_V 221 (b) one of MATH_V 152, MATH_V 221, MATH_V 223 (c) one of MATH_V 200, MATH_V 217."
    ).rule;
    expect(r).toEqual({
      type: "all_of",
      rules: [
        { type: "one_of", rules: [
          { type: "course", courseId: "CPSC221" },
          { type: "course", courseId: "DSCI221" },
        ]},
        { type: "one_of", rules: [
          { type: "course", courseId: "MATH152" },
          { type: "course", courseId: "MATH221" },
          { type: "course", courseId: "MATH223" },
        ]},
        { type: "one_of", rules: [
          { type: "course", courseId: "MATH200" },
          { type: "course", courseId: "MATH217" },
        ]},
      ],
    });
  });

  it("parses 'Either (a) ... or (b) ...' as one_of (flattened)", () => {
    // one_of(one_of(A, B), C) is logically equivalent to one_of(A, B, C) — parser flattens.
    const r = parsePrereq("Either (a) one of CPSC_V 203, CPSC_V 210 or (b) MATH_V 210.").rule;
    expect(r).toEqual({
      type: "one_of",
      rules: [
        { type: "course", courseId: "CPSC203" },
        { type: "course", courseId: "CPSC210" },
        { type: "course", courseId: "MATH210" },
      ],
    });
  });

  it("parses credit requirement 'at least N credits from X, Y'", () => {
    const r = parsePrereq("At least 3 credits from COMM_V 291, BIOL_V 300.").rule;
    expect(r).toEqual({
      type: "min_credits",
      minCredits: 3,
      from: ["COMM291", "BIOL300"],
    });
  });

  it("flags fully non-course prereqs as unparsed", () => {
    const r = parsePrereq("Principles of Mathematics 12 or Pre-calculus 12.");
    expect(r.rule).toBeNull();
    expect(r.unparsed).toBe(true);
  });

  it("strips the 'Corequisite:' fragment when present", () => {
    const r = parsePrereq("Principles of Mathematics 12 or Pre-calculus 12. Corequisite: One of CPSC 107, CPSC 110.");
    expect(r.unparsed).toBe(true);
  });

  it("preserves raw text for unparsed prereqs", () => {
    const raw = "Standing as a graduate student.";
    expect(parsePrereq(raw).raw).toBe(raw);
  });
});

describe("parseCorequisiteIds", () => {
  it("returns empty array for no input", () => {
    expect(parseCorequisiteIds(null)).toEqual([]);
    expect(parseCorequisiteIds("")).toEqual([]);
  });

  it("extracts all course ids from a corequisite string", () => {
    expect(parseCorequisiteIds("One of CPSC 107, CPSC 110.")).toEqual(["CPSC107", "CPSC110"]);
  });
});
