import { describe, expect, it } from "vitest";
import { computeProgress, evaluateMatcher, matchCourses } from "./progress";
import { course, courseMap, entry, plan } from "./testUtils";
import type { Program } from "./types";

const cpsc110 = course("CPSC110", { credits: 4 });
const cpsc310 = course("CPSC310", { credits: 4 });
const cpsc320 = course("CPSC320", { credits: 3 });
const cpsc410 = course("CPSC410", { credits: 3 });
const math100 = course("MATH100", { credits: 3 });
const engl110 = course("ENGL110", { credits: 3 });

const catalog = courseMap(cpsc110, cpsc310, cpsc320, cpsc410, math100, engl110);

describe("matchCourses", () => {
  const all = [cpsc110, cpsc310, cpsc410, math100];

  it("filters by dept and level", () => {
    expect(matchCourses({ depts: ["CPSC"], minLevel: 300 }, all).map((c) => c.id)).toEqual([
      "CPSC310",
      "CPSC410",
    ]);
  });

  it("includeIds bypasses other filters; excludeIds always wins", () => {
    expect(
      matchCourses({ depts: ["CPSC"], minLevel: 300, includeIds: ["MATH100"] }, all).map((c) => c.id),
    ).toContain("MATH100");
    expect(
      matchCourses({ depts: ["CPSC"], excludeIds: ["CPSC310"] }, all).map((c) => c.id),
    ).not.toContain("CPSC310");
  });
});

describe("evaluateMatcher", () => {
  it("courses_one_of takes the first hit's credits", () => {
    const r = evaluateMatcher({ type: "courses_one_of", courses: ["CPSC110"] }, [cpsc110], 4);
    expect(r).toMatchObject({ satisfied: true, completed: 4, satisfyingIds: ["CPSC110"] });
  });

  it("credits_from_filter accumulates matching credits", () => {
    const r = evaluateMatcher(
      { type: "credits_from_filter", minCredits: 9, filter: { depts: ["CPSC"], minLevel: 300 } },
      [cpsc310, cpsc320, cpsc410],
      9,
    );
    expect(r.satisfied).toBe(true);
    expect(r.completed).toBe(10);
  });

  it("breadth_categories counts categories, honouring exemptions", () => {
    const matcher = {
      type: "breadth_categories" as const,
      minCategories: 2,
      categories: { math: { depts: ["MATH"] }, english: { depts: ["ENGL"] } },
    };
    expect(evaluateMatcher(matcher, [math100], 2).satisfied).toBe(false);
    expect(evaluateMatcher(matcher, [math100], 2, new Set(["english"])).satisfied).toBe(true);
  });
});

describe("computeProgress", () => {
  const program: Program = {
    id: "test-major",
    name: "Test Major",
    faculty: "Science",
    totalCredits: 120,
    requirements: [
      {
        id: "core-110",
        name: "CPSC 110",
        type: "required",
        credits: 4,
        matcher: { type: "courses_one_of", courses: ["CPSC110"] },
      },
      {
        id: "upper-cpsc",
        name: "9 credits 300+ CPSC",
        type: "elective",
        credits: 9,
        matcher: {
          type: "credits_from_filter",
          minCredits: 9,
          filter: { depts: ["CPSC"], minLevel: 300 },
        },
      },
    ],
  };

  it("counts planned and completed courses, not failed ones", () => {
    const p = plan([
      entry("CPSC110", 1, "W1", "completed"),
      entry("CPSC310", 3, "W1"),
      entry("MATH100", 1, "W1", "failed"),
    ]);
    const prog = computeProgress(p, program, catalog);
    expect(prog.creditsCounted).toBe(8);
    expect(prog.requirements[0].satisfied).toBe(true);
    expect(prog.requirements[1]).toMatchObject({ satisfied: false, completed: 4, required: 9 });
    expect(prog.percent).toBe(Math.round((8 / 120) * 100));
  });

  it("whole-requirement exemptions top up missing credits only", () => {
    const p = plan([entry("CPSC310", 3, "W1")], { exemptions: ["upper-cpsc"] });
    const prog = computeProgress(p, program, catalog);
    const upper = prog.requirements[1];
    expect(upper.satisfied).toBe(true);
    expect(upper.exempted).toBe(true);
    // 4 credits from CPSC310 + (9−4) exempted
    expect(prog.creditsCounted).toBe(9);
  });

  it("category exemptions use requirement:category keys", () => {
    const breadthProgram: Program = {
      ...program,
      requirements: [
        {
          id: "breadth",
          name: "Breadth",
          type: "breadth",
          credits: 6,
          matcher: {
            type: "breadth_categories",
            minCategories: 2,
            categories: { math: { depts: ["MATH"] }, english: { depts: ["ENGL"] } },
          },
        },
      ],
    };
    const p = plan([entry("MATH100", 1, "W1")], { exemptions: ["breadth:english"] });
    expect(computeProgress(p, breadthProgram, catalog).requirements[0].satisfied).toBe(true);
  });
});
