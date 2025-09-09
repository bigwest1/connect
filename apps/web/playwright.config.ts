import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
  testDir: './e2e',
  use: { ...devices['Desktop Chrome'] }
});

