// spec: frontend/e2e/test.plan.md § 2.1
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('Create a new plan via the Sidebar Add button', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');

    // 2. Register dialog handler then click the Sidebar "Simulated Plans" Add button
    page.once('dialog', (d) => d.accept('My Degree Plan'));
    await page
      .locator('section', { has: page.getByRole('heading', { name: 'Simulated Plans' }) })
      .getByRole('button', { name: 'Add' })
      .click();

    // 3. Assert "My Degree Plan" appears in the Sidebar plans list
    await expect(page.getByText('My Degree Plan').first()).toBeVisible();

    // 3. Assert the PlanBoard header shows "My Degree Plan"
    await expect(page.getByRole('heading', { name: 'My Degree Plan' })).toBeVisible();

    // 3. Assert at least one term column shows "Drop courses here" placeholder
    await expect(page.getByText('Drop courses here').first()).toBeVisible();
  });
});
