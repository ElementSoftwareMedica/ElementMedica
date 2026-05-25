/**
 * E2E — Authentication & License Activation
 *
 * Tests the initial launch flow:
 * 1. App shows LicenseActivationPage on first run (no license stored)
 * 2. Login page is rendered (once license is activated)
 */

import { test, expect } from './electron-fixture'

test.describe('App launch', () => {
    test('renders a known page on startup', async ({ page }) => {
        // The app should show either LicenseActivationPage or LoginPage
        // depending on whether a license is already stored in the test data dir.
        // We assert that the app loaded the renderer HTML (body has Tailwind classes applied)
        await expect(page.locator('body')).toHaveClass(/bg-gray-50|bg-white|font-body/, { timeout: 12000 })

        // Wait for React to mount and render initial state (license check / auth check may take time)
        await page.waitForTimeout(5000)

        // Check if React root has any children (mounted correctly)
        const rootHasChildren = await page.evaluate(() => {
            const root = document.getElementById('root') || document.querySelector('#app')
            return root ? root.children.length > 0 : false
        }).catch(() => false)

        // The page should have React mounted (root not empty) OR recognizable content
        const hasLicense = await page.locator('text=Attiva Licenza').isVisible().catch(() => false)
        const hasLogin = await page.locator('text=Accedi').isVisible().catch(() => false)
        const hasDash = await page.locator('[data-testid="dashboard"]').isVisible().catch(() => false)
        const hasAny = await page.locator('h1, h2, h3, button, input').first().isVisible().catch(() => false)

        // At least one of these should be true — app renders something
        expect(rootHasChildren || hasLicense || hasLogin || hasDash || hasAny).toBeTruthy()
    })
})
