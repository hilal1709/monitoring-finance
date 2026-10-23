import { defineConfig, devices } from '@playwright/test';

/**
 * Runs the e2e tests against an already running production server
 * (`npm run build && npm run start -- -p 3100`), e.g. before a Lighthouse pass:
 * npx playwright test --config playwright.prod.config.ts
 */
export default defineConfig({
    testDir: './tests',
    reporter: 'line',
    use: {
        baseURL: 'http://localhost:3100',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
