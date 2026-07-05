import { describe, expect, it } from "vitest";
import type { Plan, Program } from "../engine/types";
import { course, courseMap, entry, plan as makePlan, req } from "../engine/testUtils";
import { validatePlan } from "../engine/validate";
import { computeProgress } from "../engine/progress";
import {
  buildAdvisorContext,
  candidateDepts,
  goalTokens,
  historyForRequest,
  nextOpenSlot,
  serializeContext,
} from "./context";

const catalog = courseMap(
  course("CPSC110", { credits: 4, unlocks: ["CPSC210", "CPSC121"] }),
  course("CPSC210", {
    credits: 4,
    prereq: req("CPSC110"),
    unlocks: ["CPSC310", "CPSC313", "CPSC320"],
  }),
  course("CPSC310", { credits: 4, prereq: req("CPSC210") }),
  course("CPSC121", { credits: 4 }),
  course("CPSC500", { credits: 3 }),
  course("CPSC100T", { credits: 3, generic: true }),
  course("MATH100", { credits: 3 }),
  course("MATH101", { credits: 3, prereq: req("MATH100") }),
  course("STAT200", { credits: 3, title: "Statistics for Machine Learning" }),
  course("ENGL110", { credits: 3, title: "Approaches to Literature" }),
);

const program: Program = {
  id: "cs-major",
  name: "BSc Computer Science Major",
  faculty: "Science",
  totalCredits: 120,
  requirements: [
    {
      id: "core",
      name: "CS core",
      type: "required",
      credits: 12,
      matcher: { type: "courses_all_of", courses: ["CPSC110", "CPSC210", "CPSC310"] },
    },
    {
      id: "comm",
      name: "Communication",
      type: "communication",
      credits: 3,
      matcher: { type: "credits_from_filter", minCredits: 3, filter: { depts: ["ENGL"] } },
    },
    {
      id: "stat",
      name: "Statistics",
      type: "required",
      credits: 3,
      matcher: { type: "courses_one_of", courses: ["STAT200"] },
    },
  ],
};

function build(p: Plan, withProgram = true) {
  const report = validatePlan(p, catalog);
  const progress = withProgram ? computeProgress(p, program, catalog) : null;
  return buildAdvisorContext({
    plan: p,
    program: withProgram ? program : null,
    courseMap: catalog,
    index: null,
    report,
    progress,
  });
}

describe("nextOpenSlot", () => {
  it("defaults to Y1 W1 with no history", () => {
    expect(nextOpenSlot(makePlan([entry("CPSC110", 2, "W1")]))).toEqual({ year: 1, term: "W1" });
  });

  it("advances past the last completed/in-progress term", () => {
    expect(
      nextOpenSlot(makePlan([entry("CPSC110", 1, "W1", "completed")])),
    ).toEqual({ year: 1, term: "W2" });
    expect(
      nextOpenSlot(makePlan([entry("CPSC110", 2, "S", "in_progress")])),
    ).toEqual({ year: 3, term: "W1" });
  });

  it("ignores the transfer row", () => {
    expect(
      nextOpenSlot(makePlan([entry("CPSC110", 0, "TR", "completed")])),
    ).toEqual({ year: 1, term: "W1" });
  });
});

describe("goalTokens", () => {
  it("keeps meaningful tokens and drops stopwords/short words", () => {
    const tokens = goalTokens("I want to pursue a PhD in machine learning", ["stats"]);
    expect(tokens).toContain("machine");
    expect(tokens).toContain("learning");
    expect(tokens).not.toContain("want");
    expect(tokens).not.toContain("phd"); // 3 letters
  });
});

describe("candidateDepts", () => {
  it("unions plan depts, shortlist depts, and unmet-matcher depts", () => {
    const p = makePlan([entry("MATH100", 1, "W1", "completed")], { shortlist: ["CPSC110"] });
    const progress = computeProgress(p, program, catalog);
    const depts = candidateDepts(p, program, progress);
    expect(depts).toContain("MATH"); // from plan
    expect(depts).toContain("CPSC"); // shortlist + core matcher
    expect(depts).toContain("ENGL"); // unmet communication filter
    expect(depts).toContain("STAT"); // unmet courses_one_of
  });

  it("skips matchers for satisfied requirements", () => {
    const p = makePlan([entry("ENGL110", 1, "W1", "completed")]);
    const progress = computeProgress(p, program, catalog);
    const depts = candidateDepts(p, program, progress);
    // Communication satisfied → ENGL only present because it's in the plan.
    // CPSC/STAT still come from the other unmet matchers.
    expect(depts).toContain("CPSC");
    expect(depts).toContain("STAT");
  });
});

describe("buildAdvisorContext — candidate pool", () => {
  const p = makePlan([
    entry("CPSC110", 1, "W1", "completed"),
    entry("MATH100", 1, "W1", "completed"),
    entry("MATH101", 1, "W2"), // planned
  ]);

  it("excludes planned, generic, ineligible, and above-level courses", () => {
    const ctx = build(p);
    const ids = ctx.candidates.map((c) => c.courseId);
    expect(ids).not.toContain("CPSC110"); // already planned (completed)
    expect(ids).not.toContain("MATH101"); // already planned (future)
    expect(ids).not.toContain("CPSC100T"); // generic placeholder
    expect(ids).not.toContain("CPSC310"); // prereq CPSC210 not taken
    expect(ids).not.toContain("CPSC500"); // far above highest CPSC level (110)
    expect(ids).toContain("CPSC210"); // eligible: CPSC110 completed
    expect(ids).toContain("ENGL110"); // no prereqs, fills Communication
  });

  it("ranks requirement-filling courses first and records what they fill", () => {
    const ctx = build(p);
    const cpsc210 = ctx.candidates.find((c) => c.courseId === "CPSC210")!;
    expect(cpsc210.fills).toContain("CS core");
    expect(cpsc210.unlockCount).toBe(3);
    const filler = ctx.candidates.findIndex((c) => c.fills.length > 0);
    const nonFiller = ctx.candidates.findIndex((c) => c.fills.length === 0);
    if (nonFiller >= 0) expect(filler).toBeLessThan(nonFiller);
  });

  it("boosts courses whose title matches the goal", () => {
    const withGoal: Plan = {
      ...p,
      advisor: { profile: { goal: "pursue machine learning research" }, messages: [] },
    };
    const ctx = build(withGoal);
    const stat = ctx.candidates.find((c) => c.courseId === "STAT200")!;
    const engl = ctx.candidates.find((c) => c.courseId === "ENGL110")!;
    expect(stat.score).toBeGreaterThan(engl.score);
  });

  it("is deterministic", () => {
    expect(build(p)).toEqual(build(p));
    expect(serializeContext(build(p))).toBe(serializeContext(build(p)));
  });

  it("splits history from future and reports term loads", () => {
    const ctx = build(p);
    expect(ctx.taken.map((t) => t.courseId).sort()).toEqual(["CPSC110", "MATH100"]);
    expect(ctx.plannedByTerm).toEqual([{ slot: "Y1 W2", courseIds: ["MATH101"] }]);
    expect(ctx.termLoads.find((t) => t.slot === "Y1 W1")?.credits).toBe(7);
  });
});

describe("serializeContext", () => {
  const p = makePlan([entry("CPSC110", 1, "W1", "completed")], {
    advisor: { profile: { goal: "x".repeat(600) }, messages: [] },
  });

  it("contains the main sections and the format instructions", () => {
    const text = serializeContext(build(p));
    expect(text).toContain("STUDENT GOAL:");
    expect(text).toContain("STATUS:");
    expect(text).toContain("CANDIDATES");
    expect(text).toContain('"recommendations"');
  });

  it("stays under a tiny budget and keeps the head sections", () => {
    const text = serializeContext(build(p), { maxChars: 600 });
    expect(text.length).toBeLessThanOrEqual(600);
    expect(text).toContain("STUDENT GOAL:");
  });

  it("trims candidates before compacting other sections", () => {
    const full = serializeContext(build(p));
    const trimmed = serializeContext(build(p), { maxChars: Math.floor(full.length * 0.9) });
    const countCandidates = (s: string) =>
      s.split("\n").filter((l) => l.startsWith("- CPSC") || l.startsWith("- ENGL") || l.startsWith("- STAT") || l.startsWith("- MATH")).length;
    expect(trimmed.length).toBeLessThanOrEqual(Math.floor(full.length * 0.9));
    expect(countCandidates(trimmed)).toBeLessThanOrEqual(countCandidates(full));
  });
});

describe("historyForRequest", () => {
  it("keeps the last 6, strips assistant fences, truncates long content", () => {
    const messages = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i}`,
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content:
        i === 7
          ? 'Advice text.\n```json\n{"recommendations":[]}\n```'
          : i === 6
            ? "y".repeat(2000)
            : `msg ${i}`,
      createdAt: "2026-01-01T00:00:00Z",
    }));
    const history = historyForRequest(messages);
    expect(history.length).toBe(6);
    expect(history[0].content).toBe("msg 2");
    expect(history[4].content.length).toBe(1000);
    expect(history[5].content).toBe("Advice text.");
  });
});
