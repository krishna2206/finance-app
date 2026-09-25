import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4999);
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests',
  // Une seule base partagée : les scénarios s'exécutent dans l'ordre, un par un.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  // Pas de nouvel essai : les scénarios partagent une base, un test instable doit échouer franchement.
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: isCI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Indian/Antananarivo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-chrome',
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'bash scripts/start-server.sh',
    url: `http://127.0.0.1:${PORT}/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
