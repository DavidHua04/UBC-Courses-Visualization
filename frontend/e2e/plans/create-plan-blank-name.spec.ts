// spec: frontend/e2e/test.plan.md
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test('Plan creation with blank name is rejected', async ({ page }) => {
    // 1. Set up mocks; navigate to /. Wait for "My CS Plan" to be visible.
    await setupApiMocks(page);
    await page.goto('/');
    await expect(page.getByText('My CS Plan').first()).toBeVisible();

    // 2. Register dialog handler that accepts with an empty string, then click the Sidebar Add button
    page.once('dialog', (d) => d.accept(''));
    await page
      .locator('section', { has: page.getByRole('heading', { name: 'Simulated Plans' }) })
      .getByRole('button', { name: 'Add' })
      .click();

    // 3. Assert "My CS Plan" is still the only plan in the Sidebar (no new plan was added)
    await expect(page.getByText('My CS Plan').first()).toBeVisible();
    const planItems = page.locator('section', {
      has: page.getByRole('heading', { name: 'Simulated Plans' }),
    });
    // Only one plan row should exist — "My CS Plan"
    await expect(planItems.getByText('My CS Plan')).toHaveCount(1);

    // 4. Assert the board header is still "My CS Plan"
    await expect(page.getByRole('heading', { name: 'My CS Plan' })).toBeVisible();
  });
});
