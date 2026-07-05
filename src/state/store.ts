// App state. Plans persist to localStorage; catalog data is a session cache.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type {
  Course,
  CourseLite,
  EntryStatus,
  Plan,
  PlanEntry,
  Program,
  Term,
} from "../engine/types";
import { TRANSFER_YEAR } from "../engine/types";

export type InsightTab = "course" | "plan" | "degree";

const STATUS_CYCLE: EntryStatus[] = ["planned", "in_progress", "completed", "failed"];

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

function newPlan(name: string): Plan {
  const now = new Date().toISOString();
  return {
    id: uid(),
    name,
    programId: null,
    years: 4,
    entries: [],
    exemptions: [],
    createdAt: now,
    updatedAt: now,
  };
}

interface PlannerState {
  // persisted
  plans: Record<string, Plan>;
  activePlanId: string | null;

  // session
  index: CourseLite[] | null;
  courses: Record<string, Course>;
  programs: Program[];
  target: { year: number; term: Term };
  selectedCourseId: string | null;
  insightTab: InsightTab;
  query: string;

  // catalog
  setIndex(index: CourseLite[]): void;
  setPrograms(programs: Program[]): void;
  addCourses(courses: Course[]): void;

  // ui
  setQuery(query: string): void;
  setTarget(year: number, term: Term): void;
  selectCourse(courseId: string | null, tab?: InsightTab): void;
  setInsightTab(tab: InsightTab): void;

  // plans
  createPlan(name?: string): void;
  deletePlan(planId: string): void;
  duplicatePlan(planId: string): void;
  renamePlan(planId: string, name: string): void;
  setActivePlan(planId: string): void;
  setProgram(programId: string | null): void;
  importPlan(plan: Plan): void;

  // entries
  addEntry(courseId: string, year: number, term: Term): void;
  moveEntry(entryId: string, year: number, term: Term): void;
  removeEntry(entryId: string): void;
  cycleStatus(entryId: string): void;
  setTermStatus(year: number, term: Term, status: EntryStatus): void;
  setEntryCredits(entryId: string, credits: number | null): void;
  setYears(years: number): void;
  toggleExemption(key: string): void;
}

function mutatePlan(state: PlannerState, fn: (plan: Plan) => void): Partial<PlannerState> {
  const id = state.activePlanId;
  if (!id || !state.plans[id]) return {};
  const plan: Plan = {
    ...state.plans[id],
    entries: [...state.plans[id].entries],
    exemptions: [...state.plans[id].exemptions],
  };
  fn(plan);
  plan.updatedAt = new Date().toISOString();
  return { plans: { ...state.plans, [id]: plan } };
}

export const useStore = create<PlannerState>()(
  persist(
    (set) => {
      const first = newPlan("My degree plan");
      return {
        plans: { [first.id]: first },
        activePlanId: first.id,

        index: null,
        courses: {},
        programs: [],
        target: { year: 1, term: "W1" },
        selectedCourseId: null,
        insightTab: "course",
        query: "",

        setIndex: (index) => set({ index }),
        setPrograms: (programs) => set({ programs }),
        addCourses: (courses) =>
          set((s) => {
            const merged = { ...s.courses };
            for (const c of courses) merged[c.id] = c;
            return { courses: merged };
          }),

        setQuery: (query) => set({ query }),
        setTarget: (year, term) => set({ target: { year, term } }),
        selectCourse: (courseId, tab = "course") =>
          set(courseId ? { selectedCourseId: courseId, insightTab: tab } : { selectedCourseId: null }),
        setInsightTab: (insightTab) => set({ insightTab }),

        createPlan: (name) =>
          set((s) => {
            const plan = newPlan(name ?? `Plan ${Object.keys(s.plans).length + 1}`);
            return { plans: { ...s.plans, [plan.id]: plan }, activePlanId: plan.id };
          }),
        deletePlan: (planId) =>
          set((s) => {
            const plans = { ...s.plans };
            delete plans[planId];
            let activePlanId = s.activePlanId;
            if (activePlanId === planId) activePlanId = Object.keys(plans)[0] ?? null;
            if (!activePlanId) {
              const fresh = newPlan("My degree plan");
              plans[fresh.id] = fresh;
              activePlanId = fresh.id;
            }
            return { plans, activePlanId };
          }),
        duplicatePlan: (planId) =>
          set((s) => {
            const src = s.plans[planId];
            if (!src) return {};
            const copy: Plan = {
              ...src,
              id: uid(),
              name: `${src.name} (copy)`,
              entries: src.entries.map((e) => ({ ...e, id: uid() })),
              exemptions: [...src.exemptions],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            return { plans: { ...s.plans, [copy.id]: copy }, activePlanId: copy.id };
          }),
        renamePlan: (planId, name) =>
          set((s) => {
            const plan = s.plans[planId];
            if (!plan || !name.trim()) return {};
            return { plans: { ...s.plans, [planId]: { ...plan, name: name.trim() } } };
          }),
        setActivePlan: (activePlanId) => set({ activePlanId, target: { year: 1, term: "W1" } }),
        setProgram: (programId) => set((s) => mutatePlan(s, (p) => (p.programId = programId))),
        importPlan: (plan) =>
          set((s) => {
            const imported: Plan = {
              ...plan,
              id: uid(),
              entries: plan.entries.map((e) => ({ ...e, id: uid() })),
            };
            return { plans: { ...s.plans, [imported.id]: imported }, activePlanId: imported.id };
          }),

        addEntry: (courseId, year, term) =>
          set((s) =>
            mutatePlan(s, (p) => {
              // Transfer/prior credit is already-earned by definition — default
              // it straight to Completed instead of Planned.
              const status = year === TRANSFER_YEAR ? "completed" : "planned";
              const entry: PlanEntry = { id: uid(), courseId, year, term, status };
              p.entries.push(entry);
              if (year > p.years) p.years = year;
            }),
          ),
        moveEntry: (entryId, year, term) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.map((e) => {
                if (e.id !== entryId) return e;
                // Dragging a still-planned course into the transfer row means
                // it's prior credit — treat it as already-earned, same as a
                // fresh add there. Don't touch in_progress/completed/failed.
                const status =
                  year === TRANSFER_YEAR && e.status === "planned" ? "completed" : e.status;
                return { ...e, year, term, status };
              });
            }),
          ),
        removeEntry: (entryId) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.filter((e) => e.id !== entryId);
            }),
          ),
        cycleStatus: (entryId) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.map((e) => {
                if (e.id !== entryId) return e;
                const next =
                  STATUS_CYCLE[(STATUS_CYCLE.indexOf(e.status) + 1) % STATUS_CYCLE.length];
                return { ...e, status: next };
              });
            }),
          ),
        // Bulk shortcut for a whole term. Failed entries are history — a
        // term-level sweep never resurrects them.
        setTermStatus: (year, term, status) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.map((e) =>
                e.year === year && e.term === term && e.status !== "failed"
                  ? { ...e, status }
                  : e,
              );
            }),
          ),
        setEntryCredits: (entryId, credits) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.entries = p.entries.map((e) =>
                e.id === entryId ? { ...e, creditsOverride: credits ?? undefined } : e,
              );
            }),
          ),
        setYears: (years) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.years = Math.max(1, Math.min(8, years));
              p.entries = p.entries.filter((e) => e.year <= p.years);
            }),
          ),
        toggleExemption: (key) =>
          set((s) =>
            mutatePlan(s, (p) => {
              p.exemptions = p.exemptions.includes(key)
                ? p.exemptions.filter((x) => x !== key)
                : [...p.exemptions, key];
            }),
          ),
      };
    },
    {
      name: "degree-map",
      version: 1,
      partialize: (s) => ({ plans: s.plans, activePlanId: s.activePlanId }),
    },
  ),
);

export const activePlan = (s: { plans: Record<string, Plan>; activePlanId: string | null }) =>
  (s.activePlanId && s.plans[s.activePlanId]) || Object.values(s.plans)[0];

// ── Share links ─────────────────────────────────────────────────────
// The whole plan travels in the URL fragment — nothing leaves the browser
// until the user sends the link themselves.

export function planToShareUrl(plan: Plan): string {
  const payload = compressToEncodedURIComponent(JSON.stringify(plan));
  return `${location.origin}${location.pathname}#plan=${payload}`;
}

export function planFromHash(hash: string): Plan | null {
  const m = hash.match(/#plan=(.+)/);
  if (!m) return null;
  try {
    const json = decompressFromEncodedURIComponent(m[1]);
    if (!json) return null;
    const plan = JSON.parse(json) as Plan;
    if (!plan || !Array.isArray(plan.entries)) return null;
    plan.exemptions ??= [];
    plan.years ??= 4;
    return plan;
  } catch {
    return null;
  }
}
