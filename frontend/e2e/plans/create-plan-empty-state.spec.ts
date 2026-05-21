// spec: frontend/e2e/test.plan.md § 2.2
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test('Create a plan via the empty-state Create your first plan button', async ({ page }) => {
    // 1. Set up mocks with NO plans, then navigate to the app
    const state = await setupApiMocks(page);
    state.plans.length = 0;
    delete state.entries['plan-1'];

    await page.goto('/');

    // 2. Assert the "Create your first plan" button is visible in the center area
    await expect(page.getByRole('button', { name: 'Create your first plan' })).toBeVisible();

    // 3. Register the dialog handler to accept "First Plan", then click the button
    page.once('dialog', (d) => d.accept('First Plan'));
    await page.getByRole('button', { name: 'Create your first plan' }).click();

    // 4. Assert "First Plan" appears in the Sidebar plans list
    await expect(page.getByText('First Plan').first()).toBeVisible();

    // 4. Assert the PlanBoard header shows "First Plan"
    await expect(page.getByRole('heading', { name: 'First Plan' })).toBeVisible();
  });
});
