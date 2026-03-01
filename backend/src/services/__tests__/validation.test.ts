import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../../db", () => ({ db: mockDb }));

// ── Imports ────────────────────────────────────────────────────────────────

import { validatePlan } from "../validation";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChain<T>(result: T) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    offset: () => chain,
    then: (res: any, rej?: any) => Promise.resolve(result).then(res, rej),
    catch: (fn: any) => Promise.resolve(result).catch(fn),
    finally: (fn: any) => Promise.resolve(result).finally(fn),
  };
  return chain;
}

const PLAN_ID = "plan-uuid-123";

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-uuid-1",
    planId: PLAN_ID,
    courseId: "CPSC110",
    year: 1,
    term: "W1",
    status: "planned",
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: "CPSC110",
    dept: "CPSC",
    code: "110",
    title: "Computation, Programs, and Programming",
    credits: "3.0",
    description: null,
    prerequisites: null,
    corequisites: [],
    termsOffered: ["W1", "W2"],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Sets up the three db.select() calls validatePlan makes when entries exist. */
function setupDbWithEntries(entries: ReturnType<typeof makeEntry>[], courses: ReturnType<typeof makeCourse>[]) {
  mockDb.select
    .mockReturnValueOnce(makeChain(entries))   // 1. load plan entries
    .mockReturnValueOnce(makeChain(courses))   // 2. courseRows (not actually used)
    .mockReturnValueOnce(makeChain(courses));  // 3. allCourses → courseMap
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("validatePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnValue(makeChain([]));
  });

  it("returns valid with no errors for an empty plan", async () => {
    mockDb.select.mockReturnValueOnce(makeChain([])); // no entries

    const result = await validatePlan(PLAN_ID);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.computedAt).toBeDefined();
  });

  it("returns valid when a planned course has no prerequisites", async () => {
    const entry = makeEntry({ courseId: "CPSC110", status: "planned" });
    const course = makeCourse({ id: "CPSC110", prerequisites: null });
    setupDbWithEntries([entry], [course]);

    const result = await validatePlan(PLAN_ID);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports an error when a prerequisite course has not been completed", async () => {
    // CPSC210 requires CPSC110, but CPSC110 is not in the plan
    const entry = makeEntry({
      id: "entry-210",
      courseId: "CPSC210",
      year: 1,
      term: "W1",
      status: "planned",
    });
    const course = makeCourse({
      id: "CPSC210",
      prerequisites: { type: "course", courseId: "CPSC110" },
    });
    setupDbWithEntries([entry], [course]);

    const result = await validatePlan(PLAN_ID);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].courseId).toBe("CPSC210");
    expect(result.errors[0].message).toContain("CPSC110");
  });

  it("does not report an error when a prerequisite is completed in a prior term", async () => {
    // Year 1 W1: CPSC110 completed → Year 1 W2: CPSC210 planned
    const entries = [
      makeEntry({ id: "e1", courseId: "CPSC110", year: 1, term: "W1", status: "completed", position: 0 }),
      makeEntry({ id: "e2", courseId: "CPSC210", year: 1, term: "W2", status: "planned", position: 0 }),
    ];
    const courses = [
      makeCourse({ id: "CPSC110", prerequisites: null }),
      makeCourse({ id: "CPSC210", prerequisites: { type: "course", courseId: "CPSC110" } }),
    ];
    setupDbWithEntries(entries, courses);

    const result = await validatePlan(PLAN_ID);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("reports errors for all_of prerequisites when only some are satisfied", async () => {
    // CPSC221 requires CPSC210 AND CPSC121; only CPSC210 is completed
    const entries = [
      makeEntry({ id: "e1", courseId: "CPSC210", year: 1, term: "W1", status: "completed", position: 0 }),
      makeEntry({ id: "e2", courseId: "CPSC221", year: 1, term: "W2", status: "planned", position: 0 }),
    ];
    const courses = [
      makeCourse({ id: "CPSC210", prerequisites: null }),
      makeCourse({
        id: "CPSC221",
        prerequisites: {
          type: "all_of",
          rules: [
            { type: "course", courseId: "CPSC210" },
            { type: "course", courseId: "CPSC121" },
          ],
        },
      }),
    ];
    setupDbWithEntries(entries, courses);

    const result = await validatePlan(PLAN_ID);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].courseId).toBe("CPSC221");
  });

  it("returns valid when one_of prerequisite is satisfied", async () => {
    // CPSC121 requires CPSC110 or CPSC107; CPSC110 is completed
    const entries = [
      makeEntry({ id: "e1", courseId: "CPSC110", year: 1, term: "W1", status: "completed", position: 0 }),
      makeEntry({ id: "e2", courseId: "CPSC121", year: 1, term: "W2", status: "planned", position: 0 }),
    ];
    const courses = [
      makeCourse({ id: "CPSC110", prerequisites: null }),
      makeCourse({
        id: "CPSC121",
        prerequisites: {
          type: "one_of",
          rules: [
            { type: "course", courseId: "CPSC110" },
            { type: "course", courseId: "CPSC107" },
          ],
        },
      }),
    ];
    setupDbWithEntries(entries, courses);

    const result = await validatePlan(PLAN_ID);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("emits warnings when a term exceeds the regular credit limit (18)", async () => {
    // 7 courses × 3 credits = 21 credits in one term → warning
    const termEntries = Array.from({ length: 7 }, (_, i) =>
      makeEntry({ id: `e${i}`, courseId: `MATH10${i}`, year: 1, term: "W1", position: i, status: "planned" })
    );
    const termCourses = Array.from({ length: 7 }, (_, i) =>
      makeCourse({ id: `MATH10${i}`, credits: "3.0", prerequisites: null })
    );
    setupDbWithEntries(termEntries, termCourses);

    const result = await validatePlan(PLAN_ID);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain("21");
  });

  it("emits warnings when a summer term exceeds the 9-credit limit", async () => {
    // 4 courses × 3 credits = 12 credits in summer → warning
    const termEntries = Array.from({ length: 4 }, (_, i) =>
      makeEntry({ id: `e${i}`, courseId: `CPSC11${i}`, year: 1, term: "S", position: i, status: "planned" })
    );
    const termCourses = Array.from({ length: 4 }, (_, i) =>
      makeCourse({ id: `CPSC11${i}`, credits: "3.0", prerequisites: null })
    );
    setupDbWithEntries(termEntries, termCourses);

    const result = await validatePlan(PLAN_ID);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain("12");
  });

  it("does not warn when term credits are exactly at the limit", async () => {
    // 6 courses × 3 credits = 18 credits (exactly at limit for W1/W2)
    const termEntries = Array.from({ length: 6 }, (_, i) =>
      makeEntry({ id: `e${i}`, courseId: `CPSC11${i}`, year: 1, term: "W1", position: i, status: "planned" })
    );
    const termCourses = Array.from({ length: 6 }, (_, i) =>
      makeCourse({ id: `CPSC11${i}`, credits: "3.0", prerequisites: null })
    );
    setupDbWithEntries(termEntries, termCourses);

    const result = await validatePlan(PLAN_ID);

    expect(result.warnings).toHaveLength(0);
  });
});
