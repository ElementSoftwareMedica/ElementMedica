/**
 * Playwright Electron test fixture
 *
 * Provides a real Electron app instance for each test file.
 * Uses the modern `_electron` API from the `playwright` package (compatible with Electron 33+).
 *
 * Usage:
 *   import { test, expect } from './electron-fixture'
 *   test('...', async ({ page }) => { ... })
 *
 * NOTE: Build the app first: npm run build
 * Then run: npx playwright test
 */

import { test as base, expect } from '@playwright/test'
import { _electron as electron, ElectronApplication, Page } from 'playwright'
import { join } from 'path'

interface ElectronFixtures {
    app: ElectronApplication
    page: Page
}

export const test = base.extend<ElectronFixtures>({
    // eslint-disable-next-line no-empty-pattern
    app: async ({ }, use) => {
        const mainPath = join(__dirname, '../out/main/index.js')

        const app = await electron.launch({
            args: [mainPath],
            env: {
                ...process.env,
                NODE_ENV: 'test',
                // Disable auto-updater in tests
                ELECTRON_NO_UPDATER: '1',
                // Use a temp data dir so tests don't pollute real data
                E2E_TEST_MODE: '1',
            },
        })

        await use(app)

        await app.close()
    },

    page: async ({ app }, use) => {
        const window = await app.firstWindow()
        // Wait for the renderer to be ready
        await window.waitForLoadState('domcontentloaded')
        await use(window)
    },
})

export { expect }
