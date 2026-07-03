# Degree Map — Project Plan

A reimagining of the UBC Degree Planner. This document records the product
vision, the scope and architecture decisions (and why), the core UX design,
and the implementation stages.

## 1. What this project is

**Degree Map is a local-first, single-page degree planner for UBC students,
built around one core loop:**

> search a real course → drop it into a term → instantly see whether you're
> eligible to take it, what it unlocks, and how it moves you toward graduation.

Everything else in the product exists to serve that loop.

### The one thing done extremely well

The hardest, most valuable problem in course planning is **making prerequisite
structure legible**. UBC's calendar buries requirements in prose
("One of CPSC 107, CPSC 110…"). Students plan by trial and error at
registration time. Degree Map makes the dependency structure a first-class,
always-visible part of planning:

- Every course card answers "**can I take this here?**" live, as you plan.
- Failing prerequisites are explained as the *specific missing pieces*, not a
  generic error ("needs CPSC 210 — planned in a later term" rather than
  "prerequisites not satisfied").
- Every course shows **what it unlocks** — the reverse edges of the prereq
  graph, precomputed across all 7,269 catalog courses.
- Degree requirements (e.g. the CS major's 15 requirement groups) fill in live
  as courses are placed.

## 2. Scope decisions

| Decision | Call | Why |
|---|---|---|
| University | **UBC only**, school-agnostic data format | Real, complete data beats a generic empty shell. The 7,269-course scraped catalog with parsed prerequisite trees is this repo's crown-jewel asset. The engine reads plain JSON, so another school is "write a data pipeline", not "rewrite the app". |
| Programs | **CS major fully specified**; format supports any program | Only one program in the source data has real requirements. Better one program that's actually correct than 614 empty stubs. Planning without a selected program still works fully (validation, credits, unlocks). |
| Accounts / sharing | **No accounts.** localStorage + file export/import + share-by-URL | A degree plan is a personal document, not collaborative state. URL sharing (plan compressed into the fragment) covers "send it to your advisor/friend" with zero infrastructure. |
| Scenarios | **Multiple named plans**, cheap to duplicate | "What if I take a co-op year / switch to honours?" is the real use case for scenario testing. Duplicating a plan is one click; no diff engine needed. |

## 3. Architecture: kill the backend

The original ran TypeScript/Express + Redis + BullMQ + Postgres/JSON-file
repositories behind a React frontend. Every one of those server components
existed to do things a browser does better for this product:

| Server piece | What it did | What replaces it |
|---|---|---|
| Express CRUD API | store plans (a few KB of JSON) | localStorage via the state store |
| Validation endpoint + Redis cache | run a pure function over ≤50 courses | the same pure function, in-process, ~microseconds, memoized by the UI framework |
| BullMQ async validation jobs | queue a computation that takes microseconds | nothing — it never needed to be async |
| Postgres/Drizzle (planned) | store a static public catalog | static JSON chunks on a CDN |

The new architecture is a **single Vite + React + TypeScript app with a pure
functional core**:

```
scripts/build-data.ts     data/source/*.json  →  public/data/*
                          (runs at build time; parses prereq prose into rule
                           trees, computes the reverse "unlocks" graph, emits
                           dept-chunked course files + a compact search index)

src/engine/               THE CORE. Pure functions, zero I/O, zero React.
                          validation, prereq evaluation with explanations,
                          requirement matching, degree progress.
                          This is where the tests are.

src/catalog/              Data access: loads the search index up front,
                          lazy-loads dept chunks on demand, caches in memory.

src/state/                Zustand store: plans, entries, UI state.
                          Persists to localStorage; import/export/share-URL.

src/ui/                   React components. Thin; render state, dispatch
                          actions, display engine results.
```

**Why this is better, concretely:**

- **Deployable as a static site** (GitHub Pages/Netlify/Cloudflare) — a real
  URL students can use, free, forever, instead of a localhost-only demo.
- **Instant feedback.** Validation runs synchronously on every change; no
  fetch/cache/invalidate cycle. The original cached validation results in
  Redis and had to bust that cache on every entry change — a distributed
  systems solution to a problem that fits in a function call.
- **More testable, not less.** The old tests mocked a DI container to fake
  repositories to test services. The engine here is pure functions over plain
  data: `validatePlan(plan, courseMap)` — call it, assert on the result.
- **The layering survives.** Routes/services/repos becomes ui/state+catalog/
  engine. Same separation of concerns, one less machine.

**Data strategy.** The full catalog is ~4.5 MB — too big to ship upfront, tiny
enough to pre-chunk. The build emits:
- `index.json` — one compact record per course (id, title, credits, flags)
  for instant search; ~300 KB, ~70 KB gzipped, loaded once.
- `dept/CPSC.json` etc. — full records (description, prereq tree, unlocks)
  fetched lazily when a department's courses are first needed.
- `programs.json` — degree requirement specs.

## 4. Core UX

One screen, three zones — no page navigation, no modals for core flows:

```
┌────────────┬──────────────────────────────────┬──────────────┐
│  CATALOG   │            PLAN BOARD            │   INSIGHT    │
│            │                                  │              │
│ search box │  Year 1   [W1] [W2] [S]          │ • selected   │
│ results    │  Year 2   [W1] [W2] [S]          │   course:    │
│ with live  │  ...                             │   prereq     │
│ eligibility│                                  │   tree,      │
│ badges     │  each term column: course cards, │   unlocks,   │
│            │  credit total, warnings inline   │   why not    │
│ my plans   │                                  │   eligible   │
│            │  drag to move · click ✕ remove   │ • degree     │
│            │                                  │   progress   │
└────────────┴──────────────────────────────────┴──────────────┘
```

Key interactions:
- **Search-first adding.** Type in the catalog panel; every result shows an
  eligibility badge computed against the *currently selected term*. Click a
  result → it lands in the selected term. Drag also works.
- **Selection drives insight.** Click any course (in results or on the board)
  and the insight panel shows its prereq tree (rendered as nested logic with
  live ✓/✗/◌ status per leaf), what it unlocks, and its requirement matches.
- **Errors are explanations.** A card with unmet prereqs gets a red edge; the
  insight panel says exactly which branch of the rule failed and whether the
  missing course is elsewhere in the plan (wrong order) or absent entirely.
- **Progress is ambient.** The insight panel's progress section updates on
  every change: per-requirement fill bars plus overall credits.
- **Statuses.** Courses are `planned` by default; past terms can be marked
  completed (or failed) so continuing students can model reality.

## 5. Implementation stages

1. **Plan + restructure** — this document; new single-app layout; source data
   preserved under `data/source/`; legacy `backend/`/`frontend/` removed
   (the original lives in the owner's separate copy).
2. **Data pipeline** — `scripts/build-data.ts` with an improved prereq-prose
   parser (ported from the old backend), chunked output, unlocks graph.
3. **Domain engine + tests** — validation, prereq evaluation with
   explanations, requirement matching, progress. Vitest.
4. **App shell** — Vite/React/Tailwind scaffold, Zustand store with
   persistence, catalog loader, three-zone layout.
5. **Planner features** — search w/ eligibility, board w/ drag-and-drop,
   insight panel (prereq tree, unlocks, progress), program picker, plan
   management, export/import/share.
6. **Verify + polish + docs** — exercise the real flow in a browser, rewrite
   CLAUDE.md/README.

## 6. Out of scope (deliberately)

- **Live section/timetable data** (seat counts, schedules): different problem
  (registration, not planning), needs a live API, changes hourly.
- **Accounts and sync**: not needed for a personal document; export/share
  covers it.
- **Scraping more program requirements**: the format is proven with the CS
  major; adding programs is data entry, not engineering, and can happen
  incrementally later.
- **Grade tracking / GPA**: adjacent product.
