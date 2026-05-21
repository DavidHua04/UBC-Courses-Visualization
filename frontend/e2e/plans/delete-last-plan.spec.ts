// spec: frontend/e2e/plans/delete-last-plan.spec.ts
// seed: frontend/e2e/fixtures.ts

import { test, expect } from '@playwright/test';
import { setupApiMocks } from '../fixtures';

test.describe('Plan Management', () => {
  test('Delete the only existing plan shows empty state', async ({ page }) => {
    // 1. Set up mocks; rename the only plan to "Only Plan"; navigate to `/`
    const state = await setupApiMocks(page);
    state.plans[0].name = 'Only Plan';

    await page.goto('/');

    // 2. Assert "Only Plan" is auto-selected (board heading shows "Only Plan")
    await expect(page.getByRole('heading', { name: 'Only Plan' })).toBeVisible();

    // 3. Hover over "Only Plan" row (scoped to Simulated Plans section + div.group row),
    //    register dialog accept, click × with `force: true`
    const sidebar = page.locator('section', {
      has: page.getByRole('heading', { name: 'Simulated Plans' }),
    });
    const planRow = sidebar.locator('div.group', { hasText: 'Only Plan' });
    await planRow.hover();
    page.once('dialog', (d) => d.accept());
    // opacity-0 until hover; force the click to bypass actionability flakiness
    await planRow.getByTitle('Delete plan').click({ force: true });

    // 4. Assert "Only Plan" is removed from the Sidebar (not visible)
    await expect(sidebar.getByText('Only Plan')).toBeHidden();

    // 5. Assert the Sidebar shows "No plans yet." in the Simulated Plans section
    await expect(sidebar.getByText('No plans yet.')).toBeVisible();

    // 6. Assert the center area shows "No plan selected"
    await expect(page.getByText('No plan selected')).toBeVisible();

    // 7. Assert the "Create your first plan" button is visible
    await expect(page.getByRole('button', { name: 'Create your first plan' })).toBeVisible();
  });
});
