import { test, expect } from '@playwright/test';

test('loads and shows canvas', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Evening' })).toBeVisible();
});

