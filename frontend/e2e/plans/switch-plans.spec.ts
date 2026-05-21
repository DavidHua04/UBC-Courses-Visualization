// spec: frontend/e2e/plans/switch-plans.spec.ts
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test('Switch between multiple plans', async ({ page }) => {
    // 1. Pre-seed mock state with two plans "Plan A" and "Plan B"; navigate to `/`
    const state = await setupApiMocks(page);
    state.plans.length = 0;
    delete state.entries['plan-1'];
    const now = new Date().toISOString();
    state.plans.push(
      { id: 'plan-a', name: 'Plan A', description: null, createdAt: now, updatedAt: now, entryCount: 0 },
      { id: 'plan-b', name: 'Plan B', description: null, createdAt: now, updatedAt: now, entryCount: 0 },
    );
    state.entries['plan-a'] = [];
    state.entries['plan-b'] = [];

    await page.goto('/');

    // 2. Both plans appear in the Sidebar Simulated Plans list
    const sidebar = page.locator('section', { has: page.getByRole('heading', { name: 'Simulated Plans' }) });
    await expect(sidebar.getByText('Plan A')).toBeVisible();
    await expect(sidebar.getByText('Plan B')).toBeVisible();

    // 3. The app auto-selects the first plan ("Plan A") — assert board header shows "Plan A"
    await expect(page.getByRole('heading', { name: 'Plan A' })).toBeVisible();

    // 4. Click on "Plan B" in the Sidebar — assert board header changes to "Plan B"
    await sidebar.getByText('Plan B').click();
    await expect(page.getByRole('heading', { name: 'Plan B' })).toBeVisible();

    // 5. Click on "Plan A" — assert board header changes back to "Plan A"
    await sidebar.getByText('Plan A').click();
    await expect(page.getByRole('heading', { name: 'Plan A' })).toBeVisible();
  });
});
