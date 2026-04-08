# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UBC Degree Planner — a full-stack app for building/validating multi-year degree plans. Students drag-and-drop courses between term columns, get real-time prerequisite validation, and manage multiple plans.

## Commands

### Backend (`backend/`)
```bash
npm run dev              # tsx watch (auto-restart on save)
npm run build            # tsc → dist/
npm run test             # vitest run (all tests)
npm run test:watch       # vitest watch mode
npm run test:coverage    # vitest + v8 coverage
npx vitest run src/path/to/file.test.ts   # single test file
npm run db:generate      # drizzle-kit generate migration
npm run db:migrate       # drizzle-kit apply migrations
npm run db:studio        # drizzle-kit studio (DB browser)
```

### Frontend (`frontend/`)
```bash
npm run dev     # Vite dev server at :5173, proxies /api → localhost:3000
npm run build   # tsc + vite build
npm run lint    # eslint
```

### Environment
Copy `backend/.env.example` → `backend/.env`. Required vars: `DATABASE_URL`, `REDIS_URL`, `PORT`.

## Architecture

### Backend

**Layered architecture with dependency injection via a composition root:**

1. **Routes** (`src/routes/`) — Express routers. Thin HTTP layer: parse request, call service, send response.
2. **Services** (`src/services/*.service.ts`) — Business logic. `CourseService`, `PlanService`, `ValidationService`. Depend on repository interfaces, not implementations.
3. **Repositories** (`src/repositories/`) — Data access. `interfaces.ts` defines contracts (`ICourseRepository`, `IPlanRepository`, `IPlanEntryRepository`, `IValidationCache`). Current implementation is JSON-file-based (`repositories/json/`). Drizzle/Postgres schema exists in `src/db/schema.ts` for future swap.
4. **Container** (`src/container.ts`) — Composition root. Wires repository implementations → services. Routes import services from here. To swap storage, change only this file.

**Other backend pieces:**
- `src/models/types.ts` — Shared TypeScript types (`PrerequisiteRule` recursive tree, `CourseRow`, `PlanRow`, `EntryRow`, `ValidationResult`, `ApiError`)
- `src/data/seed.ts` — 29 CPSC/MATH/STAT seed courses with prerequisite trees
- `src/services/validation.ts` — Original `validatePlan()` function (prerequisite checker logic)
- `src/services/queue.ts` — BullMQ workers for async plan-validation and course-seed jobs
- `src/redis/` — ioredis client + BullMQ queue definitions
- `src/db/` — Drizzle ORM schema and database connection (PostgreSQL)

**App wiring:** `src/index.ts` loads dotenv, calls `createApp()` from `src/app.ts`, optionally starts BullMQ workers if `REDIS_URL` is set.

### Frontend

React 19 SPA with three-panel layout:
- **Sidebar** (`Sidebar.tsx`) — plan list + completed courses
- **PlanBoard** (`PlanBoard.tsx`) — kanban grid of year/term columns with drag-and-drop (`@dnd-kit`)
- **SummaryPanel** (`SummaryPanel.tsx`) — course counts + validation results

`src/services/api.ts` is a fetch-based API client for all backend endpoints. Vite proxies `/api` to the backend.

### Data Flow

Prerequisites are stored as recursive JSONB trees (`PrerequisiteRule` type: `course | all_of | one_of | min_credits`). The validation service walks entries in term order and checks each course's prerequisites against previously completed/in-progress courses.

JSON file storage lives in `backend/data/` (`courses.json`, `plans.json`, `entries.json`). The Drizzle schema (`courses`, `plans`, `plan_entries` tables) is ready but not yet wired as the active repository.

## Testing

- **Framework:** Vitest + supertest
- **Test location:** `src/**/__tests__/*.test.ts`
- **Mock pattern:** Tests mock `../../container` (not the DB/Redis directly) using `vi.hoisted()` + `vi.mock()`. Service mocks are injected at the container level, so route tests are pure HTTP-in/HTTP-out with no real storage.
- `src/db/index.ts` and `src/redis/index.ts` throw on missing env vars — always mock the container in tests, never import db/redis directly.

## SOLID Principles in This Codebase

This project follows SOLID principles — all new code should maintain these patterns:

- **Single Responsibility:** Routes only handle HTTP parsing/responses. Services contain business logic. Repositories handle data access. Don't mix these concerns.
- **Open/Closed:** Add new storage backends (e.g., Drizzle repos) by implementing the repository interfaces — don't modify existing JSON implementations or services.
- **Liskov Substitution:** All repository implementations must be interchangeable via their interface. `JsonCourseRepository` and a future `DrizzleCourseRepository` must both satisfy `ICourseRepository` without callers knowing which is active.
- **Interface Segregation:** Repository interfaces are split by domain (`ICourseRepository`, `IPlanRepository`, `IPlanEntryRepository`, `IValidationCache`). Services only depend on the interfaces they actually use.
- **Dependency Inversion:** Services depend on repository interfaces (defined in `src/repositories/interfaces.ts`), never on concrete implementations. All wiring happens in `src/container.ts`. Never import `db`, `redis`, or JSON repo classes directly in routes or services.

**In practice:**
- New features: add logic to the appropriate service, add data access to the appropriate repository interface + implementation.
- Swapping storage: implement new repos satisfying the existing interfaces, update `container.ts`. Nothing else changes.
- Tests mock at the container level (`vi.mock("../../container")`), not at the DB/storage level.

## Gotchas

- BullMQ bundles its own ioredis — pass `{ url: REDIS_URL }` as a plain object to BullMQ constructors, not a Redis instance.
- `plan_entries` has CHECK constraints on `year` (1-5), `term` (W1/W2/S), and `status` (planned/completed/failed/in_progress), plus a UNIQUE on `(plan_id, course_id)`.
- The seed data contains 29 courses (comment in code says 30, but it's 29).
