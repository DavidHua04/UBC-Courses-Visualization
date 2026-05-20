import { test, expect, type Page } from '@playwright/test';
import { setupApiMocks } from './fixtures';

test.beforeEach(async ({ page }) => {
  await setupApiMocks(page);
});

test('app loads and shows the seeded plan', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Transcript & Goals' })).toBeVisible();
  await expect(page.getByText('My CS Plan').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My CS Plan' })).toBeVisible();
});

test('user can create a new plan via the sidebar', async ({ page }) => {
  await page.goto('/');

  // prompt() is invoked by handleCreatePlan
  page.once('dialog', (d) => d.accept('Year 4 Lite'));
  await page
    .locator('section', { has: page.getByRole('heading', { name: 'Simulated Plans' }) })
    .getByRole('button', { name: 'Add' })
    .click();

  await expect(page.getByText('Year 4 Lite').first()).toBeVisible();
});

test('user can delete a plan after confirming', async ({ page }) => {
  await page.goto('/');

  const planRow = page
    .locator('div', { has: page.getByText('My CS Plan') })
    .filter({ has: page.getByTitle('Delete plan') })
    .first();
  await planRow.hover();
  page.once('dialog', (d) => d.accept()); // confirm("Delete this plan?")
  // opacity-0 until hover; force the click to bypass actionability flakiness
  await planRow.getByTitle('Delete plan').click({ force: true });

  // Falls back to empty state when no plans remain
  await expect(page.getByText('No plan selected')).toBeVisible();
});

test('user can search and add a course to a term', async ({ page }) => {
  await page.goto('/');

  await openCourseSearch(page);

  const searchInput = page.getByPlaceholder('Search by code or name…');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('CPSC');

  // The "+ Add" button text is unique to the course-row add button in the modal
  // (sidebar "Add" buttons don't have the plus sign).
  await page.getByRole('button', { name: '+ Add' }).first().click();

  // Modal closes and the card appears on the board
  await expect(searchInput).toBeHidden();
  await expect(page.getByText('CPSC 110').first()).toBeVisible();
});

test('user can validate the plan and see a passing result', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Re-check' }).click();

  // After validation, SummaryPanel renders both Valid Courses and Invalid Courses rows.
  // The label is preceded by a ✓/✗ glyph in a sibling span so we match by regex.
  await expect(page.getByText(/^✓Valid Courses$/)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/^✗Invalid Courses$/)).toBeVisible();
});

test('progress modal opens and renders the fallback view without a program', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Progress' }).click();

  await expect(page.getByText('Academic Progress')).toBeVisible();
  await expect(
    page.getByText(/Select a program above to track degree requirements/i),
  ).toBeVisible();
});

test('progress modal shows requirements and persists transfer-credit toggles', async ({
  page,
  context,
}) => {
  // Pre-seed the per-plan program selection so PlanBoard mounts with a programId.
  await context.addInitScript(() => {
    window.localStorage.setItem('ubcdp:program:plan-1', 'cs-bsc');
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Progress' }).click();

  // First requirement appears with the "Transfer" toggle button
  await expect(page.getByText('CPSC Core (110, 121)')).toBeVisible();
  const transferBtn = page
    .getByRole('button', { name: /Transfer$/ })
    .first();
  await expect(transferBtn).toHaveAttribute('aria-pressed', 'false');

  await transferBtn.click();

  // Toggled state — refetch returns satisfied=true for that requirement
  await expect(
    page.getByRole('button', { name: /✓ Transfer/ }).first(),
  ).toHaveAttribute('aria-pressed', 'true');

  // Reload — localStorage should re-hydrate the toggle
  await page.reload();
  await page.getByRole('button', { name: 'Progress' }).click();
  await expect(
    page.getByRole('button', { name: /✓ Transfer/ }).first(),
  ).toBeVisible();
});

test('recommendations panel is visible and shows mocked items', async ({ page }) => {
  await page.goto('/');

  // The floating panel header
  await expect(page.getByText('Recommendations', { exact: true })).toBeVisible();
  await expect(page.getByText('Plan has no courses')).toBeVisible();
});

// ── Helpers ──

async function openCourseSearch(page: Page) {
  // The "+ Term" button in the header opens the search modal with year:1, term:W1
  await page.getByRole('button', { name: '+ Term' }).click();
}
