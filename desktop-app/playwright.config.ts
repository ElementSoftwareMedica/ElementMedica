import { defineConfig } from '@playwright/test'
import { join } from 'path'

/**
 * Playwright E2E configuration for ElementMedica Desktop (Electron).
 *
 * Tests use playwright-electron which provides a real Electron process.
 * The app must be built first: npm run build
 */
export default defineConfig({
    testDir: './tests',
    fullyParallel: false,    // Electron tests share a single app instance per file
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,              // Single Electron process at a time
    reporter: [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['list'],
    ],
    use: {
        // Screenshots on failure
        screenshot: 'only-on-failure',
        // Video on first retry
        video: 'on-first-retry',
        // Traces on first retry
        trace: 'on-first-retry',
    },
    outputDir: 'test-results',
    timeout: 30_000,
    expect: { timeout: 8_000 },
    projects: [
        {
            name: 'electron',
            use: {},
        },
    ],
})
