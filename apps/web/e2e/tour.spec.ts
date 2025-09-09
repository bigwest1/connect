import { test } from '@playwright/test';

async function takePose(page: any, name: string, attach: (n: string, b: Buffer)=>Promise<void>) {
  await page.evaluate((p: string) => (window as any).__tourSetPose?.(p), name);
  await page.waitForTimeout(350);
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible' });
  const png = await canvas.screenshot();
  await attach(`tour-${name}`, png);
}

test('guided 4-pose camera tour screenshots', async ({ page }, testInfo) => {
  await page.goto('/');
  // Wait for the R3F tour API to be present
  await page.waitForFunction(() => !!(window as any).__tourSetPose, undefined, { timeout: 10000 });

  await takePose(page, 'front', (n, b) => testInfo.attach(n, { body: b, contentType: 'image/png' }));
  await takePose(page, 'front-right', (n, b) => testInfo.attach(n, { body: b, contentType: 'image/png' }));
  await takePose(page, 'back', (n, b) => testInfo.attach(n, { body: b, contentType: 'image/png' }));
  await takePose(page, 'left', (n, b) => testInfo.attach(n, { body: b, contentType: 'image/png' }));
});
