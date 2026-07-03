# Degree Map — UBC course planner

Plan a UBC degree term by term, with the full real catalog and live
prerequisite checking. Search 7,269 courses, drop them onto a year-by-term
board, and see immediately whether you're eligible, what each course unlocks,
and how far you are from graduating.

Everything runs in your browser: plans live in localStorage, export to JSON,
and travel whole inside a share link. There is no server and no account.

## What it does

- **Search with live eligibility** — every result carries a dot showing
  whether you could take that course in the currently selected term:
  prerequisites met, not met, needs your judgment (prose rules like
  "third-year standing"), or already in your plan.
- **Prerequisites as proof trees** — course rules render as nested
  ALL OF / ONE OF logic with a ✓/✗ per leaf, so you see *which branch*
  fails, and whether the missing course is planned in a later term
  (ordering problem) or absent entirely.
- **Unlocks** — the reverse prerequisite graph, precomputed across the whole
  catalog: pick CPSC 110 and see the courses it opens up.
- **Whole-plan validation** — prerequisite order, corequisites, duplicates,
  retakes after failure, and term credit loads, recomputed on every change.
- **Degree progress** — track a program's requirements (CS major fully
  specified) with per-requirement meters, satisfying courses, and
  transfer-credit exemptions.
- **What-if scenarios** — duplicate a plan in one click and rearrange it;
  switch between plans freely.

## Run it

```bash
npm install
npm run data     # data/source → public/data (also runs as part of build)
npm run dev      # http://localhost:5173
```

Other commands:

```bash
npm run test     # engine + parser unit tests (vitest)
npm run build    # data + typecheck + production bundle
npm run preview  # serve the production build
npm run e2e      # browser smoke test against the preview server
```

Deploy by putting `dist/` on any static host.

## How it's built

```
data/source/      scraped UBC catalog + program specs (checked in)
scripts/          build-data.ts → public/data/ (index, dept chunks,
                  unlocks graph, programs); prose→rule-tree parser
src/engine/       pure domain logic: prereq evaluation, plan validation,
                  requirement matching, degree progress — all unit tested
src/catalog/      static-data client: upfront search index, lazy dept chunks
src/state/        Zustand store, localStorage persistence, share links
src/ui/           React components (three-zone workspace)
```

The design rationale — why there's no backend, what was kept from the
original full-stack version, and the UX decisions — is in [PLAN.md](PLAN.md).
