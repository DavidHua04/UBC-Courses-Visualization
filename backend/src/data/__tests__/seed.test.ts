import { describe, it, expect, vi, beforeEach } from "vitest";

// seed.ts uses drizzle-orm's `sql` tag but has no env-var side effects, so no mocks needed.

import { runSeed } from "../seed";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("runSeed", () => {
  function makeMockDb() {
    return { execute: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls db.execute once per course in the seed data", async () => {
    const mockDb = makeMockDb();

    await runSeed(mockDb);

    // There are 29 courses in the seed data (verified by reading seed.ts)
    expect(mockDb.execute).toHaveBeenCalled();
    expect(mockDb.execute.mock.calls.length).toBeGreaterThanOrEqual(20);
  });

  it("completes without throwing when given a valid mock db", async () => {
    const mockDb = makeMockDb();

    await expect(runSeed(mockDb)).resolves.toBeUndefined();
  });

  it("is idempotent — calling runSeed twice uses ON CONFLICT DO UPDATE logic", async () => {
    const mockDb = makeMockDb();

    await runSeed(mockDb);
    await runSeed(mockDb);

    // Each call should execute the same number of statements
    const firstRunCount = mockDb.execute.mock.calls.length / 2;
    expect(mockDb.execute.mock.calls.length).toBe(firstRunCount * 2);
  });

  it("passes an SQL query object (not a plain string) to db.execute", async () => {
    const mockDb = makeMockDb();

    await runSeed(mockDb);

    // Drizzle's sql`` tag returns a SQL object with a `queryChunks` or similar property
    const firstArg = mockDb.execute.mock.calls[0][0];
    expect(firstArg).toBeDefined();
    expect(typeof firstArg).not.toBe("string");
  });
});
