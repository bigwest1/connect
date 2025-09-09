import { test, expect } from '@playwright/test';

test('scan simulate, toggle light, run Evening, assert state and screenshot', async ({ page }, testInfo) => {
  await page.goto('/');

  // Navigate to Scan and simulate
  await page.getByRole('link', { name: /Scan/i }).click();
  await page.getByRole('button', { name: /Continue/i }).click();
  await page.getByRole('button', { name: /Simulate Scan/i }).click();
  await page.getByRole('button', { name: /Next: Align/i }).click();

  // Go back home
  await page.getByRole('link', { name: /Back/i }).click();

  // Take before screenshot of canvas
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible' });
  const beforePng = await canvas.screenshot();
  await testInfo.attach('before-canvas', { body: beforePng, contentType: 'image/png' });

  // Toggle first light switch
  const switchBtn = page.getByRole('switch').first();
  await switchBtn.click();

  // Wait for device states POST after toggle
  const post1 = await page.waitForRequest((req) => req.method() === 'POST' && req.url().includes('/api/devices/state'), { timeout: 5000 });
  expect(post1.url()).toContain('/api/devices/state');

  // Run Evening scene from left rail
  const eveningBtn = page.getByRole('button', { name: /Evening/i });
  // Hover preview then click to apply
  await eveningBtn.hover();
  await page.waitForTimeout(300);
  const postScenePromise = page.waitForRequest((req) => req.method() === 'POST' && req.url().includes('/api/devices/state'));
  await eveningBtn.click();
  const postScene = await postScenePromise;

  // Assert payload shows a light brightness around 0.5
  const data = postScene.postDataJSON?.() as any | undefined;
  const states = data?.states ?? {};
  const lightEntry = Object.entries(states).find(([id, st]) => String(id).startsWith('light-') && typeof (st as any)?.brightness === 'number');
  expect(lightEntry, 'light state present in payload').toBeTruthy();
  if (lightEntry) {
    const brightness = (lightEntry[1] as any).brightness as number;
    expect(brightness).toBeGreaterThan(0.35);
    expect(brightness).toBeLessThan(0.65);
  }

  // After screenshot
  await page.waitForTimeout(500);
  const afterPng = await canvas.screenshot();
  await testInfo.attach('after-canvas', { body: afterPng, contentType: 'image/png' });
});

