# UBC Degree Planner - Project Memory

## Project Overview
Web app helping UBC students build, validate, and visualize multi-year degree plans.
- Drag-and-drop course scheduling by term
- Prerequisite validation in real-time
- Progress tracking toward graduation

## Tech Stack
- Frontend: React 19, TypeScript, Tailwind CSS v4 (via @tailwindcss/vite), Vite 7
- Backend: TypeScript, Express 5, tsx (for dev), cors

## Repository Structure
```
UBC-Courses-Visualization/
├── backend/src/          # Express API (mostly empty, only index.ts + empty dirs)
│   ├── routes/           # (empty)
│   ├── services/         # (empty)
│   ├── models/           # (empty)
│   └── index.ts          # Basic Express server on port 3000
├── frontend/src/         # React SPA (mostly empty stubs)
│   ├── components/       # (empty)
│   ├── hooks/            # (empty)
│   ├── pages/            # (empty)
│   ├── services/         # (empty)
│   ├── types/            # (empty)
│   ├── App.tsx           # Stub: just renders "UBC Degree Planner" heading
│   ├── main.tsx          # Standard React entry
│   └── index.css         # @import "tailwindcss"
└── reference/project_team134/  # CPSC 310 InsightUBC reference project
```

## Key Architecture Decisions
- Tailwind CSS v4 (NOT v3) — uses `@import "tailwindcss"` not `@tailwind base/components/utilities`
- Tailwind v4 via @tailwindcss/vite plugin (NOT postcss config)
- Vite proxy should be added to forward /api to backend :3000
- Backend port: 3000 (frontend dev: 5173)

## Reference Project (project_team134) Summary
See memory/reference-project.md for full details.
Key reusable patterns:
- API client pattern (typed fetch wrappers in frontend/src/api/client.ts)
- Tab-based App.tsx with lifted state
- Pagination component pattern
- Request validation pattern (validate.ts)
- File-based persistence with atomic writes (ModelAPI.ts)
- Navbar with UBC branding

## Planned Features
1. Dynamic Plan Builder (drag-drop courses into year/term grid)
2. Prerequisite validation (real-time, graph-based)
3. Progress tracking (credit bar, requirement checklist)
4. Course search & discovery
5. Side-by-side plan comparison ("what-if" scenarios)
