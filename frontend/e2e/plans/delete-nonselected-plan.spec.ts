// spec: frontend/e2e/plans/delete-nonselected-plan.spec.ts
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test('Delete a non-selected plan', async ({ page }) => {
    // 1. Set up mocks with two plans ["Keep Me", "Delete Me"]; navigate to `/`
    const state = await setupApiMocks(page);
    state.plans.length = 0;
    delete state.entries['plan-1'];
    const now = new Date().toISOString();
    state.plans.push(
      { id: 'plan-keep', name: 'Keep Me', description: null, createdAt: now, updatedAt: now, entryCount: 0 },
      { id: 'plan-delete', name: 'Delete Me', description: null, createdAt: now, updatedAt: now, entryCount: 0 },
    );
    state.entries['plan-keep'] = [];
    state.entries['plan-delete'] = [];

    await page.goto('/');

    // 2. Assert "Keep Me" is auto-selected (board header shows "Keep Me")
    await expect(page.getByRole('heading', { name: 'Keep Me' })).toBeVisible();

    // 3. Locate the "Delete Me" plan row (scoped to Simulated Plans section + div.group row),
    //    hover over it, register dialog accept, click its × delete button with `force: true`
    const sidebar = page.locator('section', {
      has: page.getByRole('heading', { name: 'Simulated Plans' }),
    });
    const planRow = sidebar.locator('div.group', { hasText: 'Delete Me' });
    await planRow.hover();
    page.once('dialog', (d) => d.accept());
    // opacity-0 until hover; force the click to bypass actionability flakiness
    await planRow.getByTitle('Delete plan').click({ force: true });

    // 4. Assert "Delete Me" no longer appears in the Sidebar plans list
    await expect(sidebar.getByText('Delete Me')).toBeHidden();

    // 5. Assert "Keep Me" is still in the Sidebar
    await expect(sidebar.getByText('Keep Me')).toBeVisible();

    // 6. Assert Board header still shows "Keep Me" (selection unchanged)
    await expect(page.getByRole('heading', { name: 'Keep Me' })).toBeVisible();
  });
});
