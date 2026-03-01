import type { CourseRow, PlanSummary, PlanWithEntries, EntryRow, ValidationResult } from '../types';

const BASE = '/api/v1';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Courses
export const getCourses = async (search?: string): Promise<CourseRow[]> => {
  const params = search ? `?q=${encodeURIComponent(search)}` : '';
  const res = await request<{ data: CourseRow[] }>(`${BASE}/courses${params}`);
  return res.data;
};

export const getCourse = (id: string): Promise<CourseRow> =>
  request(`${BASE}/courses/${id}`);

export const seedCourses = (): Promise<{ message: string; jobId: string }> =>
  request(`${BASE}/courses/seed`, { method: 'POST' });

// Plans
export const getPlans = (): Promise<PlanSummary[]> =>
  request(`${BASE}/plans`);

export const createPlan = (name: string, description?: string): Promise<PlanSummary> =>
  request(`${BASE}/plans`, {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });

export const getPlan = (id: string): Promise<PlanWithEntries> =>
  request(`${BASE}/plans/${id}`);

export const updatePlan = (id: string, name: string, description?: string): Promise<void> =>
  request(`${BASE}/plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description }),
  });

export const deletePlan = (id: string): Promise<PlanSummary> =>
  request(`${BASE}/plans/${id}`, { method: 'DELETE' });

// Plan entries
export const addEntry = (
  planId: string,
  courseId: string,
  year: number,
  term: string,
  status = 'planned'
): Promise<EntryRow> =>
  request(`${BASE}/plans/${planId}/entries`, {
    method: 'POST',
    body: JSON.stringify({ courseId, year, term, status }),
  });

export const updateEntry = (
  planId: string,
  entryId: string,
  updates: Partial<Pick<EntryRow, 'year' | 'term' | 'status' | 'position'>>
): Promise<void> =>
  request(`${BASE}/plans/${planId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });

export const deleteEntry = (planId: string, entryId: string): Promise<EntryRow> =>
  request(`${BASE}/plans/${planId}/entries/${entryId}`, { method: 'DELETE' });

export const reorderEntries = (
  planId: string,
  positions: Array<{ entryId: string; position: number }>
): Promise<void> =>
  request(`${BASE}/plans/${planId}/entries/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ positions }),
  });

export const validatePlan = (planId: string): Promise<ValidationResult> =>
  request(`${BASE}/plans/${planId}/validate`);
