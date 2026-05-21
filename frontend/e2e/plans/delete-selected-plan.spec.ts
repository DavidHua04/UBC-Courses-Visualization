// spec: frontend/e2e/plans/delete-selected-plan.spec.ts
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test('Delete the currently selected plan falls back to next plan', async ({ page }) => {
    // 1. Set up mocks with two plans ["First", "Second"]; navigate to `/`
    const state = await setupApiMocks(page);
    state.plans.length = 0;
    delete state.entries['plan-1'];
    const now = new Date().toISOString();
    state.plans.push(
      { id: 'plan-first', name: 'First', description: null, createdAt: now, updatedAt: now, entryCount: 0 },
      { id: 'plan-second', name: 'Second', description: null, createdAt: now, updatedAt: now, entryCount: 0 },
    );
    state.entries['plan-first'] = [];
    state.entries['plan-second'] = [];

    await page.goto('/');

    // 2. Assert "First" is auto-selected (board heading = "First")
    await expect(page.getByRole('heading', { name: 'First' })).toBeVisible();

    // 3. Hover over "First" row (scoped to Simulated Plans section + div.group row),
    //    register dialog accept, click its × button with `force: true`
    const sidebar = page.locator('section', {
      has: page.getByRole('heading', { name: 'Simulated Plans' }),
    });
    const planRow = sidebar.locator('div.group', { hasText: 'First' });
    await planRow.hover();
    page.once('dialog', (d) => d.accept());
    // opacity-0 until hover; force the click to bypass actionability flakiness
    await planRow.getByTitle('Delete plan').click({ force: true });

    // 4. Assert "First" is no longer visible in the Sidebar plans list
    await expect(sidebar.getByText('First')).toBeHidden();

    // 5. Assert the board heading now shows "Second" (auto-fell-back to next plan)
    await expect(page.getByRole('heading', { name: 'Second' })).toBeVisible();

    // 6. Assert "Second" still appears in the Sidebar
    await expect(sidebar.getByText('Second')).toBeVisible();
  });
});
