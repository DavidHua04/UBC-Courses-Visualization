import type { Page, Route } from '@playwright/test';

// ── Shape types (mirror frontend/src/types, kept loose for fixtures) ──

type CourseRow = {
  id: string;
  dept: string;
  code: string;
  title: string;
  credits: string;
  description: string | null;
  prerequisites: unknown;
  corequisites: string[];
  termsOffered: string[];
};

type PlanSummary = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  entryCount: number;
};

type EntryRow = {
  id: string;
  planId: string;
  courseId: string;
  year: number;
  term: string;
  status: string;
  position: number;
};

// ── In-memory store, reset per test via setupApiMocks() ──

interface MockState {
  plans: PlanSummary[];
  // planId -> entries
  entries: Record<string, EntryRow[]>;
  courses: CourseRow[];
}

const seedCourses: CourseRow[] = [
  {
    id: 'CPSC 110',
    dept: 'CPSC',
    code: '110',
    title: 'Computation, Programs, and Programming',
    credits: '4',
    description: 'Intro to systematic program design.',
    prerequisites: null,
    corequisites: [],
    termsOffered: ['W1', 'W2'],
  },
  {
    id: 'CPSC 121',
    dept: 'CPSC',
    code: '121',
    title: 'Models of Computation',
    credits: '4',
    description: 'Boolean algebra, propositional logic.',
    prerequisites: null,
    corequisites: [],
    termsOffered: ['W1', 'W2'],
  },
  {
    id: 'MATH 100',
    dept: 'MATH',
    code: '100',
    title: 'Differential Calculus',
    credits: '3',
    description: 'Limits, derivatives, applications.',
    prerequisites: null,
    corequisites: [],
    termsOffered: ['W1'],
  },
];

function freshState(): MockState {
  return {
    plans: [
      {
        id: 'plan-1',
        name: 'My CS Plan',
        description: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        entryCount: 0,
      },
    ],
    entries: { 'plan-1': [] },
    courses: seedCourses,
  };
}

function planWithEntries(state: MockState, planId: string) {
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan) return null;
  const grouped: Record<string, Record<string, EntryRow[]>> = {};
  for (const e of state.entries[planId] ?? []) {
    grouped[String(e.year)] ??= {};
    grouped[String(e.year)][e.term] ??= [];
    grouped[String(e.year)][e.term].push(e);
  }
  return { ...plan, entries: grouped };
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

// Registers all /api/v1/* handlers against the page using an isolated store.
// Returns the state object so tests can inspect/mutate it directly if needed.
export async function setupApiMocks(page: Page): Promise<MockState> {
  const state = freshState();

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api\/v1/, '');
    const method = route.request().method();

    // Courses
    if (path === '/courses' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').toLowerCase();
      const filtered = q
        ? state.courses.filter(
            (c) =>
              c.id.toLowerCase().includes(q) ||
              c.title.toLowerCase().includes(q),
          )
        : state.courses;
      return json(route, 200, { data: filtered });
    }

    // Faculties (empty for smoke — program picker still mounts)
    if (path === '/faculties' && method === 'GET') {
      return json(route, 200, { data: [] });
    }

    if (path === '/programs' && method === 'GET') {
      return json(route, 200, { data: [] });
    }

    // Plans collection
    if (path === '/plans' && method === 'GET') {
      return json(
        route,
        200,
        state.plans.map((p) => ({
          ...p,
          entryCount: state.entries[p.id]?.length ?? 0,
        })),
      );
    }
    if (path === '/plans' && method === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const id = `plan-${state.plans.length + 1}`;
      const now = new Date().toISOString();
      const created: PlanSummary = {
        id,
        name: body.name,
        description: body.description ?? null,
        createdAt: now,
        updatedAt: now,
        entryCount: 0,
      };
      state.plans.push(created);
      state.entries[id] = [];
      return json(route, 201, created);
    }

    // Single plan
    const planMatch = path.match(/^\/plans\/([^/]+)$/);
    if (planMatch) {
      const id = planMatch[1];
      if (method === 'GET') {
        const p = planWithEntries(state, id);
        if (!p) return json(route, 404, { message: 'Not found' });
        return json(route, 200, p);
      }
      if (method === 'DELETE') {
        const idx = state.plans.findIndex((p) => p.id === id);
        if (idx === -1) return json(route, 404, { message: 'Not found' });
        const [removed] = state.plans.splice(idx, 1);
        delete state.entries[id];
        return json(route, 200, removed);
      }
      if (method === 'PUT') {
        return json(route, 204, {});
      }
    }

    // Add entry
    const addEntryMatch = path.match(/^\/plans\/([^/]+)\/entries$/);
    if (addEntryMatch && method === 'POST') {
      const planId = addEntryMatch[1];
      const body = JSON.parse(route.request().postData() || '{}');
      const list = (state.entries[planId] ??= []);
      const entry: EntryRow = {
        id: `entry-${list.length + 1}`,
        planId,
        courseId: body.courseId,
        year: body.year,
        term: body.term,
        status: body.status ?? 'planned',
        position: list.length,
      };
      list.push(entry);
      return json(route, 201, entry);
    }

    // Validate
    const validateMatch = path.match(/^\/plans\/([^/]+)\/validate$/);
    if (validateMatch && method === 'GET') {
      return json(route, 200, {
        valid: true,
        errors: [],
        warnings: [],
        computedAt: new Date().toISOString(),
        cached: false,
      });
    }

    // Progress
    const progressMatch = path.match(/^\/plans\/([^/]+)\/progress$/);
    if (progressMatch && method === 'GET') {
      const transferRaw = url.searchParams.get('transferCredits') || '';
      const transferred = new Set(transferRaw.split(',').filter(Boolean));

      const reqs = [
        {
          requirementId: 'req-cpsc-core',
          requirementName: 'CPSC Core (110, 121)',
          requirementType: 'required' as const,
          completedCredits: transferred.has('req-cpsc-core') ? 8 : 0,
          requiredCredits: 8,
          satisfied: transferred.has('req-cpsc-core'),
          satisfyingCourseIds: transferred.has('req-cpsc-core')
            ? ['CPSC 110', 'CPSC 121']
            : [],
        },
        {
          requirementId: 'req-math-100',
          requirementName: 'MATH 100 - Differential Calculus',
          requirementType: 'required' as const,
          completedCredits: transferred.has('req-math-100') ? 3 : 0,
          requiredCredits: 3,
          satisfied: transferred.has('req-math-100'),
          satisfyingCourseIds: [],
        },
      ];

      const completed = reqs.reduce((s, r) => s + r.completedCredits, 0);
      const total = reqs.reduce((s, r) => s + r.requiredCredits, 0);
      return json(route, 200, {
        programId: url.searchParams.get('programId'),
        totalCredits: total,
        completedCredits: completed,
        percent: Math.round((completed / total) * 100),
        requirements: reqs,
      });
    }

    // Recommendations
    const recsMatch = path.match(/^\/plans\/([^/]+)\/recommendations$/);
    if (recsMatch && method === 'GET') {
      return json(route, 200, {
        data: [
          {
            id: 'rec-1',
            severity: 'suggestion',
            title: 'Plan has no courses',
            message: 'Add courses to get prerequisite validation.',
          },
        ],
      });
    }

    // Fallback — unhandled
    return json(route, 404, { message: `Unmocked: ${method} ${path}` });
  });

  return state;
}
