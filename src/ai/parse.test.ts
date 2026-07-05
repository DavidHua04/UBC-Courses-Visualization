import { describe, expect, it } from "vitest";
import { normalizeCourseId, parseAdvisorReply } from "./parse";

describe("normalizeCourseId", () => {
  it("uppercases and strips spaces/hyphens", () => {
    expect(normalizeCourseId("cpsc 310")).toBe("CPSC310");
    expect(normalizeCourseId("Math-221")).toBe("MATH221");
    expect(normalizeCourseId("CPSC310")).toBe("CPSC310");
  });
});

describe("parseAdvisorReply", () => {
  it("parses a well-formed ```json fence and strips it from prose", () => {
    const text = [
      "Take software engineering next.",
      "```json",
      '{"recommendations":[{"courseId":"CPSC310","reason":"core"}]}',
      "```",
    ].join("\n");
    const parsed = parseAdvisorReply(text);
    expect(parsed.recommendations).toEqual([{ courseId: "CPSC310", reason: "core" }]);
    expect(parsed.prose).toBe("Take software engineering next.");
    expect(parsed.prose).not.toContain("```");
  });

  it("accepts an untagged fence", () => {
    const text = 'Advice.\n```\n{"recommendations":[{"courseId":"MATH200","reason":"r"}]}\n```';
    expect(parseAdvisorReply(text).recommendations).toEqual([
      { courseId: "MATH200", reason: "r" },
    ]);
  });

  it("repairs trailing commas and line comments", () => {
    const text = [
      "```json",
      "// picks",
      '{"recommendations":[{"courseId":"CPSC213","reason":"systems"},]}',
      "```",
    ].join("\n");
    expect(parseAdvisorReply(text).recommendations).toEqual([
      { courseId: "CPSC213", reason: "systems" },
    ]);
  });

  it("accepts a whole-message bare object and bare array", () => {
    expect(
      parseAdvisorReply('{"recommendations":[{"courseId":"STAT200","reason":"stats"}]}')
        .recommendations,
    ).toEqual([{ courseId: "STAT200", reason: "stats" }]);
    expect(
      parseAdvisorReply('[{"courseId":"STAT200","reason":"stats"}]').recommendations,
    ).toEqual([{ courseId: "STAT200", reason: "stats" }]);
  });

  it("accepts key variants and spaced ids", () => {
    const text =
      '{"recommendations":[{"course_id":"cpsc 313","why":"os"},{"course":"MATH 221"},{"id":"STAT200","rationale":"r"}]}';
    expect(parseAdvisorReply(text).recommendations).toEqual([
      { courseId: "CPSC313", reason: "os" },
      { courseId: "MATH221", reason: "" },
      { courseId: "STAT200", reason: "r" },
    ]);
  });

  it("finds a balanced object embedded mid-prose", () => {
    const text =
      'I suggest these: {"recommendations":[{"courseId":"CPSC310","reason":"x"}]} — good luck!';
    const parsed = parseAdvisorReply(text);
    expect(parsed.recommendations).toEqual([{ courseId: "CPSC310", reason: "x" }]);
    expect(parsed.prose).toBe("I suggest these:  — good luck!");
  });

  it("dedupes ids preserving first occurrence and caps at 10", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      courseId: `CPSC${100 + (i % 12)}`,
      reason: `${i}`,
    }));
    const parsed = parseAdvisorReply(JSON.stringify({ recommendations: many }));
    expect(parsed.recommendations.length).toBe(10);
    expect(parsed.recommendations[0]).toEqual({ courseId: "CPSC100", reason: "0" });
  });

  it("returns raw prose and no recommendations on garbage, without throwing", () => {
    const garbage = "Sure! Here are my picks:\n1. CPSC 310\n2. MATH 221\nEnjoy {unbalanced";
    const parsed = parseAdvisorReply(garbage);
    expect(parsed.recommendations).toEqual([]);
    expect(parsed.prose).toBe(garbage.trim());
  });

  it("handles a fence whose body is unparseable by falling through gracefully", () => {
    const text = "Advice.\n```json\nnot json at all\n```";
    const parsed = parseAdvisorReply(text);
    expect(parsed.recommendations).toEqual([]);
    expect(parsed.prose).toContain("Advice.");
  });

  it("skips items without a usable id", () => {
    const text =
      '{"recommendations":[{"reason":"no id"},{"courseId":""},{"courseId":"CPSC110","reason":"ok"}]}';
    expect(parseAdvisorReply(text).recommendations).toEqual([
      { courseId: "CPSC110", reason: "ok" },
    ]);
  });
});
