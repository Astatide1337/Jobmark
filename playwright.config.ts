import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const parsedBaseURL = new URL(baseURL);

// Why: these tests create local demo-user records and intentionally exercise
// only local development. A typo in PLAYWRIGHT_BASE_URL must not turn a smoke
// run into a production data mutation.
if (
  parsedBaseURL.protocol !== 'http:' ||
  !['localhost', '127.0.0.1'].includes(parsedBaseURL.hostname)
) {
  throw new Error(
    `Playwright E2E tests are local-only. Received ${baseURL}; use an http://localhost or http://127.0.0.1 URL.`
  );
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'test-results/playwright-report', open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    browserName: 'chromium',
    colorScheme: 'dark',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- --port 3000',
        url: `${baseURL}/signin`,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
