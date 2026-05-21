// spec: frontend/e2e/plans/delete-plan-cancel.spec.ts
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test('Cancel plan deletion leaves state unchanged', async ({ page }) => {
    // 1. Set up mocks; rename plan to "Survivor"; navigate to `/`
    const state = await setupApiMocks(page);
    state.plans[0].name = 'Survivor';

    await page.goto('/');

    // 2. Assert "Survivor" is auto-selected (board heading = "Survivor")
    await expect(page.getByRole('heading', { name: 'Survivor' })).toBeVisible();

    // 3. Hover over "Survivor" row, register dialog DISMISS, click × with `force: true`
    const planRow = page
      .locator('div', { has: page.getByText('Survivor') })
      .filter({ has: page.getByTitle('Delete plan') })
      .first();
    await planRow.hover();
    page.once('dialog', (d) => d.dismiss());
    // opacity-0 until hover; force the click to bypass actionability flakiness
    await planRow.getByTitle('Delete plan').click({ force: true });

    // 4. Assert "Survivor" still appears in the Sidebar plans list
    const sidebar = page.locator('section', {
      has: page.getByRole('heading', { name: 'Simulated Plans' }),
    });
    await expect(sidebar.getByText('Survivor')).toBeVisible();

    // 5. Assert board heading is still "Survivor" (still selected)
    await expect(page.getByRole('heading', { name: 'Survivor' })).toBeVisible();

    // 6. Assert the empty state is NOT shown (no "No plan selected" text)
    await expect(page.getByText('No plan selected')).toBeHidden();
  });
});
