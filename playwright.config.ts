import { defineConfig, devices } from '@playwright/test';

const PLAYWRIGHT_PORT = Number(process.env.PLAYWRIGHT_PORT || 3010);
const PLAYWRIGHT_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PLAYWRIGHT_PORT}`;

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'playwright/tests/**/*.spec.ts'],
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    headless: true,
    baseURL: PLAYWRIGHT_BASE_URL,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${PLAYWRIGHT_PORT}`,
    port: PLAYWRIGHT_PORT,
    timeout: 120 * 1000,
    reuseExistingServer: false,
  },
});
