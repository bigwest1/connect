import { test, expect } from '@playwright/test';

test('scan mesh import/export APIs round-trip', async ({ page }) => {
  // Use owner for scoped access
  await page.addInitScript(() => {
    document.cookie = 'email=owner@example.com; path=/';
  });

  // Prepare a small payload ("hello") and 32-byte zero key
  const content = Buffer.from('hello').toString('base64');
  const key = Buffer.alloc(32).toString('base64');

  await page.goto('/');

  // Import (encrypt & store)
  const id = await page.evaluate(async ({ content, key }) => {
    const res = await fetch('/api/scan-mesh', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ack-import-risk': 'yes', 'x-email': 'owner@example.com' },
      body: JSON.stringify({ name: 'test.glb', mime: 'model/gltf-binary', contentBase64: content, keyBase64: key })
    });
    const j = await res.json();
    if (!j?.id) throw new Error('no id');
    return j.id as string;
  }, { content, key });

  expect(id).toBeTruthy();

  // Download raw encrypted payload
  const raw = await page.evaluate(async (id) => {
    const res = await fetch(`/api/scan-mesh/${id}?raw=1`, { headers: { 'x-ack-export-risk': 'yes', 'x-email': 'owner@example.com' } });
    return await res.text();
  }, id);
  expect(typeof raw).toBe('string');
  expect(raw.length).toBeGreaterThan(0);

  // Download decrypted binary
  const bufLen = await page.evaluate(async ({ id, key }) => {
    const res = await fetch(`/api/scan-mesh/${id}?key=${encodeURIComponent(key)}`, { headers: { 'x-ack-export-risk': 'yes', 'x-email': 'owner@example.com' } });
    const ab = await res.arrayBuffer();
    return ab.byteLength;
  }, { id, key });
  expect(bufLen).toBe(5);
});

