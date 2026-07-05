// Placeholder "model": deterministic heuristics over the structured context.
// It emits the same wire protocol as a real model (prose + fenced JSON), so
// the whole parse → validate → render pipeline is exercised without a network.

import type { AdvisorContext, AdvisorProvider, CandidateCourse } from "../types";
import { displayId } from "../../engine/types";

const ACCEL_RE = /\b(3|three).?year|accelerat|finish early|graduate early/i;

function reasonFor(c: CandidateCourse, ctx: AdvisorContext): string {
  if (c.fills.length > 0) {
    const req = ctx.unmetRequirements.find((r) => r.name === c.fills[0]);
    const progress = req ? ` (you have ${req.completed}/${req.required} ${req.unit})` : "";
    return `Counts toward ${c.fills[0]}${progress} and you can take it now.`;
  }
  if (c.unlockCount >= 3) {
    return `Unlocks ${c.unlockCount} later courses, so taking it early keeps options open.`;
  }
  return c.eligible === "no_prereq"
    ? "No prerequisites — a flexible slot-filler you can take any term."
    : "You meet the prerequisites now.";
}

function prose(ctx: AdvisorContext): string {
  const paragraphs: string[] = [];

  if (ctx.issues.length > 0) {
    paragraphs.push(
      `Before adding more courses, fix the problems already in your plan: ${ctx.issues
        .slice(0, 3)
        .join(" ")}`,
    );
  }

  const targetYears =
    ctx.targetYears ?? (ACCEL_RE.test(ctx.goal) && ctx.planYears > 3 ? 3 : undefined);
  if (targetYears && ctx.progress) {
    const remaining = Math.max(0, ctx.progress.totalRequired - ctx.progress.creditsCounted);
    const winterTerms = Math.max(1, targetYears * 2);
    const avg = Math.ceil(remaining / winterTerms);
    paragraphs.push(
      `To finish ${ctx.progress.totalRequired} credits in ${targetYears} years you still need ` +
        `${remaining} credits — about ${avg} per winter term.` +
        (avg > 15 ? " That is a heavy load; plan on summer terms to spread it out." : ""),
    );
  }

  if (!ctx.programName) {
    paragraphs.push(
      "You haven't selected a program, so these picks are based on eligibility and what they " +
        "unlock. Choose a program in the top bar to get requirement-aware advice.",
    );
  }

  if (ctx.candidates.length === 0) {
    paragraphs.push(
      "I couldn't find eligible next courses from the departments in your plan. Add a course " +
        "or two you're interested in, or pick a program, and ask again.",
    );
  } else {
    paragraphs.push("Here are the strongest next courses for your plan:");
  }

  if (ctx.progress) {
    paragraphs.push(
      `Progress so far: ${ctx.progress.creditsCounted} of ${ctx.progress.totalRequired} credits (${ctx.progress.percent}%).`,
    );
  }

  return paragraphs.join("\n\n");
}

export function createMockProvider(delayMs = 400): AdvisorProvider {
  return {
    kind: "mock",
    send(req, opts) {
      const ctx = req.context;
      const recs = ctx.candidates.slice(0, 5).map((c) => ({
        courseId: c.courseId,
        reason: reasonFor(c, ctx),
      }));
      const fence = "```json\n" + JSON.stringify({ recommendations: recs }) + "\n```";
      const names =
        recs.length > 0
          ? `\n\n${recs.map((r) => displayId(r.courseId)).join(", ")} — details below.`
          : "";
      const text = `${prose(ctx)}${names}\n\n${fence}`;

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ text }), delayMs);
        opts?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    },
  };
}
