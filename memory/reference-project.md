# Reference Project: project_team134 (InsightUBC / CPSC 310)

## Architecture Overview
Full-stack monorepo: TypeScript Express backend + React 18 + Tailwind CSS v3 frontend
- Backend: port 4321
- Frontend dev: port 5173 (proxies /api → :4321)
- File-based JSON persistence (no database)
- RESTful API with /api/v1/ prefix

## What the Project Does
Course section search/query engine for UBC course offerings.
- Upload ZIP of course JSONs → background processing with polling
- CRUD for Courses + nested Sections
- Advanced search DSL (AND/OR/NOT/LT/GT/EQ/IS filters)

## Reusable Backend Patterns

### Express App Setup (src/App.ts)
- `createApp(config)` factory function
- Middleware: static → cors → json → raw → multer
- 4-param error handler at bottom
- Data directory auto-creation on startup

### Validation Pattern (src/validate.ts)
Returns `{ ok: true } | { ok: false; fields/message }`
- validateCourseBody, validateSectionBody, validateQuery
- Recursive filter validation

### File-Based Storage (src/DataModel/ModelAPI.ts)
- Directory structure: data/courses/[id]/meta.json + sections/[id].json
- Atomic writes: write to .tmp-{pid}-{timestamp} then rename
- All async using fs/promises
- Returns undefined for 404 (caller decides status code)

### Async Background Processing Pattern
- POST returns 202 with UUID immediately
- Background process runs (fire-and-forget with .catch)
- Client polls GET /:id for status updates

### HTTP Status Codes Used
- 200 OK (read)
- 201 Created (new resource)
- 202 Accepted (async job started)
- 204 No Content (update)
- 404 Not Found
- 413 Too Large (>5000 results)
- 422 Unprocessable Entity (validation failure)

## Reusable Frontend Patterns

### API Client (frontend/src/api/client.ts)
```typescript
const BASE = "/api/v1";
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) { // parse error body, throw with message + fields }
  if (res.status === 204) return undefined as T;
  return res.json();
}
```
Typed fetch wrappers per endpoint, relative URLs for Vite proxy.

### Tab-Based App (frontend/src/App.tsx)
- activeTab state at root
- Render different panels based on tab
- Pass callbacks down as props (no Context/Redux)
- selectedCourseId lifted to App for cross-tab navigation

### Component Patterns
- useCallback + useEffect for data fetching with deps
- Loading/error/data states as separate state vars
- Modal visibility flags as boolean state
- Pagination: offset + limit, page jump control

### Tailwind Color Palette (v3)
- bg-ubc-blue (header)
- bg-ubc-light-blue (buttons)
- border-ubc-gold (active tab)

## Key Types (frontend/src/types/index.ts)
```typescript
PaginatedResponse<T> { total, limit, offset, items: T[] }
Section { id, instructor, year, avg, pass, fail, audit, links? }
Course { id, title, dept, code, sections?, links? }
Filter = AND[] | OR[] | NOT | LT | GT | EQ | IS
```

## Package Differences vs Current Project
| Feature | Reference (team134) | Current Project |
|---------|--------------------|--------------------|
| Tailwind | v3 (postcss) | v4 (@tailwindcss/vite) |
| React | 18.3.1 | 19.2.0 |
| Package mgr | yarn | npm |
| Backend runner | ts-node | tsx |
| Express | 5.1.0 | 5.2.1 |
| Testing | mocha/chai/supertest | none yet |

## Files Worth Reading/Copying
- src/App.ts — Express setup boilerplate
- src/controller.ts — Full CRUD + validation patterns
- src/validate.ts — Validation helper pattern
- src/DataModel/ModelAPI.ts — File-based persistence
- src/DataModel/ModelType.ts — TypeScript types
- frontend/src/api/client.ts — API client pattern
- frontend/src/types/index.ts — Shared types
- frontend/src/components/CourseList.tsx — Pagination UI
- frontend/src/components/Navbar.tsx — Tab navigation
