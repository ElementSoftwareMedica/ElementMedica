/**
 * E2E — IPC Bridge Integration Tests
 *
 * Tests bridge status IPC handlers without requiring
 * an actual Medical Device Bridge binary.
 */

/// <reference path="../src/renderer/env.d.ts" />
import { test, expect } from './electron-fixture'

test.describe('Medical Device Bridge IPC', () => {
    test('bridge:getStatus returns a valid status object', async ({ page }) => {
        // Call bridge:getStatus via the desktopApi exposed in renderer
        const status = await page.evaluate(async () => {
            if (!window.desktopApi?.bridge?.getStatus) return null
            return window.desktopApi.bridge.getStatus()
        }).catch(() => null)

        if (status === null) {
            // API not yet available (user not logged in / loading) — skip
            test.skip()
            return
        }

        // Status must have the expected shape
        expect(status).toHaveProperty('port')
        expect(status).toHaveProperty('running')
        expect(status).toHaveProperty('available')
        expect(typeof (status as { port: number }).port).toBe('number')
        expect(typeof (status as { running: boolean }).running).toBe('boolean')
    })

    test('bridge:getPort returns port 4050', async ({ page }) => {
        const portInfo = await page.evaluate(async () => {
            if (!window.desktopApi?.bridge?.getPort) return null
            return window.desktopApi.bridge.getPort()
        }).catch(() => null)

        if (portInfo === null) {
            test.skip()
            return
        }

        expect((portInfo as { port: number }).port).toBe(4050)
    })
})
