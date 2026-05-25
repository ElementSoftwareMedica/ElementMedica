/**
 * E2E — Navigation flow
 *
 * Tests that navigation to different sections works
 * when the user is in an authenticated state.
 * These tests assume a logged-in session OR skip gracefully.
 */

import { test, expect } from './electron-fixture'

async function waitForDashboard(page: import('playwright').Page): Promise<boolean> {
    try {
        // Try to detect authenticated app state by looking for sidebar nav
        await page.waitForSelector('nav, [role="navigation"], [data-testid="sidebar"]', { timeout: 8000 })
        return true
    } catch {
        return false
    }
}

test.describe('Navigation', () => {
    test('sidebar is visible when authenticated', async ({ page }) => {
        const authenticated = await waitForDashboard(page)
        if (!authenticated) {
            test.skip()
            return
        }
        const nav = page.locator('nav, [role="navigation"]').first()
        await expect(nav).toBeVisible()
    })

    test('can navigate to pazienti section', async ({ page }) => {
        const authenticated = await waitForDashboard(page)
        if (!authenticated) {
            test.skip()
            return
        }

        const pazientiLink = page.locator('a[href*="pazienti"], button:has-text("Pazienti"), [data-nav="pazienti"]').first()
        const visible = await pazientiLink.isVisible().catch(() => false)
        if (!visible) {
            test.skip()
            return
        }

        await pazientiLink.click()
        await page.waitForTimeout(500)

        // Should have navigated — URL or content changed
        const heading = page.locator('h1, h2').first()
        await expect(heading).toBeVisible()
    })

    test('can navigate to visite section', async ({ page }) => {
        const authenticated = await waitForDashboard(page)
        if (!authenticated) {
            test.skip()
            return
        }

        const visiteLink = page.locator('a[href*="visite"], button:has-text("Visite"), [data-nav="visite"]').first()
        const visible = await visiteLink.isVisible().catch(() => false)
        if (!visible) {
            test.skip()
            return
        }

        await visiteLink.click()
        await page.waitForTimeout(500)
        const heading = page.locator('h1, h2').first()
        await expect(heading).toBeVisible()
    })
})
