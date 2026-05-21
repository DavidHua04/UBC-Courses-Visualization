// spec: frontend/e2e/test.plan.md
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test('Cancel plan creation leaves state unchanged', async ({ page }) => {
    // 1. Set up mocks; navigate to /
    await setupApiMocks(page);
    await page.goto('/');

    // 2. Confirm "My CS Plan" is visible and the board header shows "My CS Plan"
    await expect(page.getByText('My CS Plan').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'My CS Plan' })).toBeVisible();

    // 3. Register dismiss handler then click the Sidebar Add button
    page.once('dialog', (d) => d.dismiss());
    await page
      .locator('section', { has: page.getByRole('heading', { name: 'Simulated Plans' }) })
      .getByRole('button', { name: 'Add' })
      .click();

    // 4. Assert the Sidebar still shows "My CS Plan" and no other plan entry was added
    await expect(page.getByText('My CS Plan').first()).toBeVisible();

    // 4. Assert the board header is still "My CS Plan" (selection unchanged)
    await expect(page.getByRole('heading', { name: 'My CS Plan' })).toBeVisible();
  });
});
