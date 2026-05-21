import { test } from '@playwright/test';

test.describe('seed', () => {
  test('navigate to app', async ({ page }) => {
    await page.goto('http://localhost:5173/');
  });
});
