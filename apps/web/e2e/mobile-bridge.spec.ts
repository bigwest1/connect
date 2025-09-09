import { test, expect, devices } from '@playwright/test';

test.describe('MobileBridge smoke', () => {
  test('RoomPlan.scan() mock on web', async ({ page }) => {
    await page.goto('/scan');
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Start Capture/i }).click();
    // Next enabled indicates meshUrl set from RoomPlan.scan mock
    const next = page.getByRole('button', { name: /Next: Align/i });
    await expect(next).toBeEnabled();
  });

  test.use({ ...devices['Pixel 5'] });
  test('ARCoreDepth.scan() mock on Android UA', async ({ page }) => {
    await page.goto('/scan');
    await page.getByRole('button', { name: /Continue/i }).click();
    await page.getByRole('button', { name: /Start Capture/i }).click();
    const next = page.getByRole('button', { name: /Next: Align/i });
    await expect(next).toBeEnabled();
  });
});

