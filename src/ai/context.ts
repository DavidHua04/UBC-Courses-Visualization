// The grounding layer: turns plan + engine results into a compact, factual
// context the model reasons over. Pure — imports only from the engine.
// All the hard constraint logic (prereqs, credits, progress) is already done
// by the engine; the model only converses and prioritizes over these facts.

import type {
  Course,
  CourseLite,
  DegreeProgress,
  Plan,
  Program,
  RequirementMatcher,
  Term,
} from "../engine/types";
import {
  compareSlots,
  deptOf,
  displayId,
  levelOf,
  TERM_LABELS,
  TRANSFER_YEAR,
} from "../engine/types";
import { matchCourses } from "../engine/progress";
import { checkEligibility, type CourseMap } from "../engine/validate";
import type { ValidationReport } from "../engine/types";
import type { AdvisorContext, CandidateCourse, ChatMessage } from "./types";
import type { AdvisorMessage } from "../engine/types";

// ── Slots ───────────────────────────────────────────────────────────

const NEXT_TERM: Record<Term, { year: 0 | 1; term: Term }> = {
  TR: { year: 1, term: "W1" }, // transfer row → real first term
  W1: { year: 0, term: "W2" },
  W2: { year: 0, term: "S" },
  S: { year: 1, term: "W1" },
};

/** The term right after the student's history (completed/in-progress) —
 *  where a newly recommended course would realistically land. */
export function nextOpenSlot(plan: Plan): { year: number; term: Term } {
  let last: { year: number; term: Term } | null = null;
  for (const e of plan.entries) {
    if (e.status !== "completed" && e.status !== "in_progress") continue;
    if (e.year === TRANSFER_YEAR) continue;
    if (!last || compareSlots(e.year, e.term, last.year, last.term) > 0) {
      last = { year: e.year, term: e.term };
    }
  }
  if (!last) return { year: 1, term: "W1" };
  const step = NEXT_TERM[last.term];
  return { year: last.year + step.year, term: step.term };
}

const slotName = (year: number, term: Term): string =>
  year === TRANSFER_YEAR ? TERM_LABELS.TR : `Y${year} ${term}`;

// ── Candidate depts (which chunks to hydrate before building) ───────

function matcherDepts(matcher: RequirementMatcher, out: Set<string>): void {
  switch (matcher.type) {
    case "courses_one_of":
    case "courses_all_of":
      for (const id of matcher.courses) out.add(deptOf(id));
      break;
    case "credits_from_filter":
      for (const d of matcher.filter.depts ?? []) out.add(d);
      for (const id of matcher.filter.includeIds ?? []) out.add(deptOf(id));
      break;
    case "breadth_categories":
      for (const sel of Object.values(matcher.categories)) {
        for (const d of sel.depts ?? []) out.add(d);
        for (const id of sel.includeIds ?? []) out.add(deptOf(id));
      }
      break;
    case "credits_total":
      break; // any course counts — no dept signal
  }
}

/** Depts worth having full records for: everything in the plan/shortlist plus
 *  everything the program's unmet requirements draw from. */
export function candidateDepts(
  plan: Plan,
  program: Program | null,
  progress: DegreeProgress | null,
): string[] {
  const depts = new Set<string>();
  for (const e of plan.entries) depts.add(deptOf(e.courseId));
  for (const id of plan.shortlist ?? []) depts.add(deptOf(id));
  const reqs = progress
    ? progress.requirements.filter((r) => !r.satisfied).map((r) => r.requirement)
    : (program?.requirements ?? []);
  for (const req of reqs) matcherDepts(req.matcher, depts);
  return [...depts].sort();
}

// ── Context building ────────────────────────────────────────────────

const GOAL_STOPWORDS = new Set([
  "year", "years", "want", "with", "into", "then", "that", "this", "from",
  "course", "courses", "degree", "finish", "graduate", "graduating", "take",
  "taking", "early", "after", "before", "about", "would", "like", "plan",
  "planning", "pursue", "pursuing", "have", "will", "study", "studying",
]);

/** Meaningful lowercase tokens from the goal/interests, for title matching. */
export function goalTokens(goal: string, interests: string[]): string[] {
  const raw = `${goal} ${interests.join(" ")}`.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  return [...new Set(raw.filter((t) => !GOAL_STOPWORDS.has(t)))];
}

interface UnmetReq {
  name: string;
  completed: number;
  required: number;
  unit: string;
  matcher: RequirementMatcher;
}

function fillsRequirement(course: Course, matcher: RequirementMatcher): boolean {
  switch (matcher.type) {
    case "courses_one_of":
    case "courses_all_of":
      return matcher.courses.includes(course.id);
    case "credits_from_filter":
      return matchCourses(matcher.filter, [course]).length > 0;
    case "breadth_categories":
      return Object.values(matcher.categories).some(
        (sel) => matchCourses(sel, [course]).length > 0,
      );
    case "credits_total":
      return false; // every course counts — listing it everywhere is noise
  }
}

export function buildAdvisorContext(input: {
  plan: Plan;
  program: Program | null;
  courseMap: CourseMap;
  index: CourseLite[] | null;
  report: ValidationReport;
  progress: DegreeProgress | null;
}): AdvisorContext {
  const { plan, program, courseMap, report, progress } = input;
  const slot = nextOpenSlot(plan);

  const unmet: UnmetReq[] = (progress?.requirements ?? [])
    .filter((r) => !r.satisfied)
    .map((r) => ({
      name: r.requirement.name,
      completed: r.completed,
      required: r.required,
      unit: r.requirement.matcher.type === "breadth_categories" ? "categories" : "cr",
      matcher: r.requirement.matcher,
    }));

  // History vs future. Failed courses are neither.
  const taken: { courseId: string; credits: number }[] = [];
  const plannedBySlot = new Map<string, { year: number; term: Term; courseIds: string[] }>();
  for (const e of plan.entries) {
    const credits = e.creditsOverride ?? courseMap.get(e.courseId)?.credits ?? 3;
    if (e.status === "completed" || e.status === "in_progress") {
      taken.push({ courseId: e.courseId, credits });
    } else if (e.status === "planned") {
      const key = `${e.year}:${e.term}`;
      const bucket = plannedBySlot.get(key) ?? { year: e.year, term: e.term, courseIds: [] };
      bucket.courseIds.push(e.courseId);
      plannedBySlot.set(key, bucket);
    }
  }
  taken.sort((a, b) => a.courseId.localeCompare(b.courseId));
  const plannedByTerm = [...plannedBySlot.values()]
    .sort((a, b) => compareSlots(a.year, a.term, b.year, b.term))
    .map((b) => ({ slot: slotName(b.year, b.term), courseIds: b.courseIds.sort() }));

  const termLoads = Object.entries(report.termCredits)
    .map(([key, credits]) => {
      const [yearStr, term] = key.split(":") as [string, Term];
      return { year: Number(yearStr), term, credits };
    })
    .sort((a, b) => compareSlots(a.year, a.term, b.year, b.term))
    .map((t) => ({ slot: slotName(t.year, t.term), credits: t.credits }));

  const issues = [
    ...report.entryIssues.filter((i) => i.severity === "error").map((i) => i.message),
    ...report.termIssues.map((i) => i.message),
    ...report.entryIssues.filter((i) => i.severity === "warning").map((i) => i.message),
  ];

  // Candidate pool: eligible-next courses from relevant depts.
  const depts = new Set(candidateDepts(plan, program, progress));
  const tokens = goalTokens(plan.advisor.profile.goal, plan.advisor.profile.interests ?? []);

  // Don't offer courses far above the student's level in each dept.
  const highestLevel = new Map<string, number>();
  for (const e of plan.entries) {
    if (e.status === "failed") continue;
    const level = levelOf(e.courseId);
    if (Number.isNaN(level)) continue;
    const dept = deptOf(e.courseId);
    highestLevel.set(dept, Math.max(highestLevel.get(dept) ?? 0, level));
  }

  const candidates: CandidateCourse[] = [];
  for (const course of courseMap.values()) {
    if (!depts.has(course.dept) || course.generic) continue;
    const level = levelOf(course.id);
    const cap = Math.max(highestLevel.get(course.dept) ?? 0, 100) + 100;
    if (!Number.isNaN(level) && level > cap) continue;
    const elig = checkEligibility(course, slot.year, slot.term, plan, courseMap);
    if (elig.kind !== "eligible" && elig.kind !== "no_prereq") continue;

    const fills = unmet.filter((r) => fillsRequirement(course, r.matcher)).map((r) => r.name);
    const titleHit = tokens.some((t) => course.title.toLowerCase().includes(t));
    const score =
      (fills.length > 0 ? 3 : 0) + Math.min(course.unlocks.length, 20) / 4 + (titleHit ? 2 : 0);
    candidates.push({
      courseId: course.id,
      title: course.title,
      credits: course.credits,
      eligible: elig.kind,
      unlockCount: course.unlocks.length,
      fills,
      score,
    });
  }
  candidates.sort((a, b) => b.score - a.score || a.courseId.localeCompare(b.courseId));

  return {
    goal: plan.advisor.profile.goal,
    targetYears: plan.advisor.profile.targetYears,
    interests: plan.advisor.profile.interests ?? [],
    programName: program?.name ?? null,
    progress: progress
      ? {
          creditsCounted: progress.creditsCounted,
          totalRequired: progress.totalCreditsRequired,
          percent: progress.percent,
        }
      : null,
    planYears: plan.years,
    termLoads,
    unmetRequirements: unmet.map(({ matcher: _m, ...rest }) => rest),
    taken,
    plannedByTerm,
    issues,
    candidates: candidates.slice(0, 30),
  };
}

// ── Serialization + token budget ────────────────────────────────────

export const FORMAT_INSTRUCTIONS = [
  "You are a UBC degree-planning advisor. All facts above (eligibility, credits,",
  "requirement progress) were computed by the planner — trust them; do not",
  "re-derive prerequisites yourself.",
  "Reply with brief plain-text advice (no markdown headings, no bullets-only",
  "replies). Then end with exactly one fenced code block of this shape:",
  '```json',
  '{"recommendations":[{"courseId":"CPSC310","reason":"one short sentence"}]}',
  "```",
  "Recommend 3-5 courses. Only use courseIds that appear in CANDIDATES.",
].join("\n");

interface RenderOpts {
  candidateCap: number;
  takenCompact: boolean;
  issuesCap: number;
  plannedCompact: boolean;
  goalCap: number;
}

function render(ctx: AdvisorContext, o: RenderOpts): string {
  const lines: string[] = [];

  const goal = ctx.goal.trim()
    ? ctx.goal.slice(0, o.goalCap)
    : "(none stated — give generally sensible next-term advice)";
  lines.push(`STUDENT GOAL: ${goal}`);
  if (ctx.targetYears) lines.push(`Target: finish in ${ctx.targetYears} years.`);
  if (ctx.interests.length) lines.push(`Interests: ${ctx.interests.join(", ")}`);

  lines.push("");
  const prog = ctx.programName
    ? `Program: ${ctx.programName}${
        ctx.progress
          ? ` — ${ctx.progress.creditsCounted}/${ctx.progress.totalRequired} cr (${ctx.progress.percent}%)`
          : ""
      }`
    : "Program: none selected.";
  lines.push(`STATUS: ${prog} Plan spans ${ctx.planYears} years.`);
  if (ctx.termLoads.length) {
    lines.push(`Term loads: ${ctx.termLoads.map((t) => `${t.slot}: ${t.credits}cr`).join("; ")}`);
  }

  if (ctx.unmetRequirements.length) {
    lines.push("", "UNMET REQUIREMENTS:");
    for (const r of ctx.unmetRequirements) {
      lines.push(`- ${r.name}: ${r.completed}/${r.required} ${r.unit}`);
    }
  }

  if (ctx.taken.length) {
    lines.push("");
    if (o.takenCompact) {
      const byDept = new Map<string, string[]>();
      for (const t of ctx.taken) {
        const dept = deptOf(t.courseId);
        byDept.set(dept, [...(byDept.get(dept) ?? []), t.courseId]);
      }
      const parts = [...byDept.entries()].map(
        ([dept, ids]) => `${ids.length} ${dept} incl. ${ids.slice(0, 3).map(displayId).join(", ")}`,
      );
      lines.push(`TAKEN (completed or in progress): ${parts.join("; ")}`);
    } else {
      lines.push(
        `TAKEN (completed or in progress): ${ctx.taken
          .map((t) => `${t.courseId}(${t.credits})`)
          .join(", ")}`,
      );
    }
  }

  if (ctx.plannedByTerm.length) {
    lines.push("", "PLANNED:");
    if (o.plannedCompact) {
      for (const p of ctx.plannedByTerm) lines.push(`- ${p.slot}: ${p.courseIds.length} courses`);
    } else {
      for (const p of ctx.plannedByTerm) lines.push(`- ${p.slot}: ${p.courseIds.join(", ")}`);
    }
  }

  if (ctx.issues.length) {
    lines.push("", "PLAN ISSUES:");
    for (const msg of ctx.issues.slice(0, o.issuesCap)) lines.push(`- ${msg}`);
  }

  lines.push("", "CANDIDATES (only recommend courseIds from this list):");
  if (ctx.candidates.length === 0) {
    lines.push("- (none found — say so and suggest broadening the plan or picking a program)");
  }
  for (const c of ctx.candidates.slice(0, o.candidateCap)) {
    const bits = [
      c.eligible === "no_prereq" ? "no prereqs" : "eligible",
      c.unlockCount > 0 ? `unlocks ${c.unlockCount}` : null,
      c.fills.length > 0 ? `fills: ${c.fills.join(", ")}` : null,
    ].filter(Boolean);
    lines.push(`- ${c.courseId}(${c.credits}) ${c.title} — ${bits.join("; ")}`);
  }

  lines.push("", "INSTRUCTIONS:", FORMAT_INSTRUCTIONS);
  return lines.join("\n");
}

/** ~24k chars ≈ 6k tokens — sized for small self-hosted models. Trims in a
 *  fixed order so output is deterministic for a given context + budget. */
export function serializeContext(ctx: AdvisorContext, budget?: { maxChars: number }): string {
  const maxChars = budget?.maxChars ?? 24_000;
  const steps: Partial<RenderOpts>[] = [
    {},
    { candidateCap: 15 },
    { candidateCap: 8 },
    { candidateCap: 8, takenCompact: true },
    { candidateCap: 8, takenCompact: true, issuesCap: 3 },
    { candidateCap: 8, takenCompact: true, issuesCap: 3, plannedCompact: true },
    { candidateCap: 8, takenCompact: true, issuesCap: 3, plannedCompact: true, goalCap: 200 },
  ];
  const base: RenderOpts = {
    candidateCap: 30,
    takenCompact: false,
    issuesCap: 5,
    plannedCompact: false,
    goalCap: 500,
  };
  let out = render(ctx, base);
  for (const step of steps) {
    if (out.length <= maxChars) return out;
    out = render(ctx, { ...base, ...step });
  }
  return out.slice(0, maxChars);
}

// ── History ─────────────────────────────────────────────────────────

const FENCE_RE = /```[\s\S]*?```/g;

/** Last few turns, JSON fences stripped (they'd teach the model to echo stale
 *  recommendations), each truncated. Oldest first. */
export function historyForRequest(messages: AdvisorMessage[], limit = 6): ChatMessage[] {
  return messages.slice(-limit).map((m) => ({
    role: m.role,
    content:
      (m.role === "assistant" ? m.content.replace(FENCE_RE, "").trim() : m.content).slice(0, 1_000),
  }));
}
