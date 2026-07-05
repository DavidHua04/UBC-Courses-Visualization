// Pure store helpers: persistence migration, share-link stripping, and the
// advisor message cap. The zustand store itself needs a browser; these don't.

import { describe, expect, it } from "vitest";
import type { AdvisorMessage, Plan } from "../engine/types";
import { emptyAdvisorState } from "../engine/types";
import { entry, plan as makePlan } from "../engine/testUtils";
import { capMessages, migratePersisted, planFromHash, planSharePayload } from "./store";
import { compressToEncodedURIComponent } from "lz-string";

const msg = (id: string, content = "hello"): AdvisorMessage => ({
  id,
  role: "user",
  content,
  createdAt: "2026-01-01T00:00:00Z",
});

describe("migratePersisted", () => {
  it("backfills shortlist (v1) and advisor (v2) on old plans", () => {
    const legacy = makePlan([entry("CPSC110", 1, "W1")]) as Partial<Plan>;
    delete legacy.shortlist;
    delete legacy.advisor;
    const out = migratePersisted({ plans: { p1: legacy as Plan }, activePlanId: "p1" });
    expect(out.plans.p1.shortlist).toEqual([]);
    expect(out.plans.p1.advisor).toEqual(emptyAdvisorState());
  });

  it("leaves already-shaped plans alone", () => {
    const p = makePlan([entry("CPSC110", 1, "W1")], {
      advisor: { profile: { goal: "ML" }, messages: [msg("m1")] },
    });
    const out = migratePersisted({ plans: { p1: p }, activePlanId: "p1" });
    expect(out.plans.p1.advisor.profile.goal).toBe("ML");
    expect(out.plans.p1.advisor.messages.length).toBe(1);
  });
});

describe("share payload round trip", () => {
  it("strips the advisor conversation but keeps everything else", () => {
    const p = makePlan([entry("CPSC110", 1, "W1", "completed")], {
      shortlist: ["CPSC210"],
      exemptions: ["core"],
      advisor: {
        profile: { goal: "secret personal goal", targetYears: 3 },
        messages: [msg("m1", "private chat")],
      },
    });

    const payload = planSharePayload(p);
    expect(payload).not.toContain("secret personal goal");
    expect(payload).not.toContain("private chat");
    expect(payload).not.toContain("advisor");

    const restored = planFromHash(`#plan=${compressToEncodedURIComponent(payload)}`)!;
    expect(restored).not.toBeNull();
    expect(restored.entries.map((e) => e.courseId)).toEqual(["CPSC110"]);
    expect(restored.shortlist).toEqual(["CPSC210"]);
    expect(restored.exemptions).toEqual(["core"]);
    expect(restored.advisor).toEqual(emptyAdvisorState());
  });

  it("backfills advisor on share links from older app versions", () => {
    const legacy = makePlan([entry("CPSC110", 1, "W1")]) as Partial<Plan>;
    delete legacy.advisor;
    const hash = `#plan=${compressToEncodedURIComponent(JSON.stringify(legacy))}`;
    expect(planFromHash(hash)!.advisor).toEqual(emptyAdvisorState());
  });
});

describe("capMessages", () => {
  it("keeps only the newest messages", () => {
    const many = Array.from({ length: 50 }, (_, i) => msg(`m${i}`));
    const capped = capMessages(many, 40);
    expect(capped.length).toBe(40);
    expect(capped[0].id).toBe("m10");
    expect(capped[39].id).toBe("m49");
  });

  it("truncates oversized message bodies", () => {
    const capped = capMessages([msg("m1", "x".repeat(10_000))]);
    expect(capped[0].content.length).toBe(8_000);
  });

  it("leaves small histories untouched (same objects)", () => {
    const messages = [msg("m1"), msg("m2")];
    expect(capMessages(messages)).toEqual(messages);
  });
});
