import { describe, expect, it } from "vitest";
import type { AdvisorContext, AdvisorRequest } from "../types";
import { createMockProvider } from "./mock";
import { parseAdvisorReply } from "../parse";

function ctx(overrides: Partial<AdvisorContext> = {}): AdvisorContext {
  return {
    goal: "",
    interests: [],
    programName: "BSc Computer Science Major",
    progress: { creditsCounted: 30, totalRequired: 120, percent: 25 },
    planYears: 4,
    termLoads: [],
    unmetRequirements: [{ name: "CS core", completed: 12, required: 30, unit: "cr" }],
    taken: [{ courseId: "CPSC110", credits: 4 }],
    plannedByTerm: [],
    issues: [],
    candidates: [
      {
        courseId: "CPSC210",
        title: "Software Construction",
        credits: 4,
        eligible: "eligible",
        unlockCount: 12,
        fills: ["CS core"],
        score: 6,
      },
      {
        courseId: "ENGL110",
        title: "Approaches to Literature",
        credits: 3,
        eligible: "no_prereq",
        unlockCount: 0,
        fills: [],
        score: 0,
      },
    ],
    ...overrides,
  };
}

function request(context: AdvisorContext): AdvisorRequest {
  return { system: "", messages: [{ role: "user", content: "What next?" }], context };
}

const provider = createMockProvider(0);

describe("MockProvider", () => {
  it("is deterministic", async () => {
    const a = await provider.send(request(ctx()));
    const b = await provider.send(request(ctx()));
    expect(a.text).toBe(b.text);
  });

  it("round-trips through parseAdvisorReply with recs from the candidate pool", async () => {
    const context = ctx();
    const reply = await provider.send(request(context));
    const parsed = parseAdvisorReply(reply.text);
    expect(parsed.recommendations.length).toBeGreaterThan(0);
    const pool = new Set(context.candidates.map((c) => c.courseId));
    for (const rec of parsed.recommendations) {
      expect(pool.has(rec.courseId)).toBe(true);
      expect(rec.reason.length).toBeGreaterThan(0);
    }
    expect(parsed.prose.length).toBeGreaterThan(0);
  });

  it("leads with validation problems when the plan has issues", async () => {
    const reply = await provider.send(
      request(ctx({ issues: ["CPSC 310 needs CPSC 210."] })),
    );
    expect(reply.text.startsWith("Before adding more courses")).toBe(true);
    expect(reply.text).toContain("CPSC 310 needs CPSC 210.");
  });

  it("does the acceleration math when targetYears is set", async () => {
    const reply = await provider.send(request(ctx({ targetYears: 3 })));
    // 90 credits remaining over 6 winter terms = 15/term
    expect(reply.text).toContain("3 years");
    expect(reply.text).toContain("90 credits");
    expect(reply.text).toContain("15 per winter term");
  });

  it("detects acceleration intent from the goal text and flags heavy loads", async () => {
    const reply = await provider.send(
      request(
        ctx({
          goal: "I want to graduate in 3 years",
          progress: { creditsCounted: 15, totalRequired: 120, percent: 13 },
        }),
      ),
    );
    // 105 remaining / 6 terms = 17.5 → 18, above the 15 comfort line.
    expect(reply.text).toContain("18 per winter term");
    expect(reply.text).toContain("summer");
  });

  it("nudges toward picking a program when none is selected", async () => {
    const reply = await provider.send(request(ctx({ programName: null, progress: null })));
    expect(reply.text).toContain("haven't selected a program");
  });

  it("says so when there are no candidates, with an empty recommendations block", async () => {
    const reply = await provider.send(request(ctx({ candidates: [] })));
    expect(parseAdvisorReply(reply.text).recommendations).toEqual([]);
    expect(reply.text).toContain("couldn't find eligible next courses");
  });

  it("rejects with AbortError when the signal fires", async () => {
    const slow = createMockProvider(5_000);
    const controller = new AbortController();
    const pending = slow.send(request(ctx()), { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
