import { test, expect } from '@playwright/test';

async function setPose(page: any, name: string) {
  await page.waitForFunction(() => !!(window as any).__tourSetPose);
  await page.evaluate((p: string) => (window as any).__tourSetPose?.(p), name);
  await page.waitForTimeout(400);
}

test('derived metrics within 0.5% of spec', async ({ page }) => {
  await page.goto('/');
  // wait for validation to be populated by DemoAssembler
  const res = await page.waitForFunction(() => (window as any).__specValidation, null, { timeout: 15000 });
  const validation = await res.jsonValue() as { pass: boolean; deltas: Record<string, number> };
  const worst = Math.max(0, ...Object.values(validation.deltas));
  expect(worst).toBeLessThanOrEqual(0.005);
  expect(validation.pass).toBe(true);
});

test('golden screenshots for 4 poses remain stable', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible' });

  const poses = ['front','front-right','back','left'];
  for (const pose of poses) {
    await setPose(page, pose);
    const png = await canvas.screenshot({ animations: 'disabled' as any });
    // Use snapshot comparison with a small per-pixel threshold to protect lighting/materials
    await expect(png).toMatchSnapshot(`golden-${pose}.png`, { threshold: 0.06 });
  }
});

