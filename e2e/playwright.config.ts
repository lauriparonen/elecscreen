import { defineConfig, devices } from '@playwright/test';

/**
 * The suite drives the real stack: fastify against the provided postgres
 * container, and the vite dev server (dev, not `preview`, because the `/api`
 * proxy lives in `server.proxy` and preview would not forward it).
 *
 * `docker compose up -d` must be running — the tests assert on the seeded
 * data, so there is nothing to mock.
 */
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @repo/api dev',
      url: `${API_URL}/health`,
      cwd: '..',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @repo/web dev',
      url: WEB_URL,
      cwd: '..',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});

export { API_URL, WEB_URL };
