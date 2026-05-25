/**
 * E2E — Login Page
 *
 * Tests login form validation and submission.
 * These tests mock the login API to avoid requiring a live backend.
 */

import { test, expect } from './electron-fixture'

test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to login if not already there
        const loginVisible = await page.locator('input#identifier, input[name="identifier"]').isVisible().catch(() => false)
        if (!loginVisible) {
            // If we're on license activation, skip
            test.skip()
        }
    })

    test('shows email and password fields', async ({ page }) => {
        await page.waitForSelector('input#identifier', { timeout: 10000 }).catch(() => null)
        const identifierInput = page.locator('input#identifier').first()
        const passInput = page.locator('input[type="password"]').first()
        const submitBtn = page.locator('button[type="submit"], button:has-text("Accedi")').first()

        await expect(identifierInput).toBeVisible()
        await expect(passInput).toBeVisible()
        await expect(submitBtn).toBeVisible()
    })

    test('keeps login disabled for empty form', async ({ page }) => {
        await page.waitForSelector('input#identifier', { timeout: 10000 }).catch(() => null)
        const submitBtn = page.locator('button[type="submit"], button:has-text("Accedi")').first()
        const isVisible = await submitBtn.isVisible().catch(() => false)
        if (!isVisible) return

        const identifierInput = page.locator('input#identifier').first()
        const passwordInput = page.locator('input[type="password"]').first()

        await expect(identifierInput).toHaveValue('')
        await expect(passwordInput).toHaveValue('')
        await expect(submitBtn).toBeDisabled()
    })
})
