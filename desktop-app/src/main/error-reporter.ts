/**
 * Error Reporter — P98 §6.4
 *
 * Local crash / error reporting system for the Electron main and renderer processes.
 * No external service (GDPR compliance) — all reports stored locally in userData/logs/crashes/.
 *
 * Features:
 *  - Catch uncaught Node.js exceptions + unhandled promise rejections (main process)
 *  - Receive error reports from renderer via IPC
 *  - Write JSON crash reports to disk with rotation (max 50 files)
 *  - Expose IPC handler: 'app:reportError' → called by renderer ErrorBoundary / try-catch
 *  - Expose IPC handler: 'app:getCrashLogs' → called by SettingsPage to show last N crashes
 */

import { app, ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, unlinkSync, statSync } from 'fs'

// ────────────────────────── Types ──────────────────────────────

export interface CrashReport {
    id: string
    timestamp: string
    appVersion: string
    platform: NodeJS.Platform
    arch: string
    processType: 'main' | 'renderer'
    errorType: 'uncaught-exception' | 'unhandled-rejection' | 'renderer-error' | 'renderer-crash' | 'manual'
    message: string
    stack?: string
    extra?: Record<string, unknown>
}

// ────────────────────────── Constants ──────────────────────────

const MAX_CRASH_FILES = 50

// ────────────────────────── Crash dir ──────────────────────────

function getCrashDir(): string {
    const dir = join(app.getPath('userData'), 'logs', 'crashes')
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
    }
    return dir
}

// ────────────────────────── Write ──────────────────────────────

function writeCrashReport(report: CrashReport): void {
    try {
        const dir = getCrashDir()
        const filename = `crash-${report.timestamp.replace(/[:.]/g, '-')}-${report.id.slice(0, 8)}.json`
        writeFileSync(join(dir, filename), JSON.stringify(report, null, 2), 'utf8')
        rotateCrashFiles(dir)
    } catch {
        // Never throw from error reporter
    }
}

function rotateCrashFiles(dir: string): void {
    try {
        const files = readdirSync(dir)
            .filter((f) => f.startsWith('crash-') && f.endsWith('.json'))
            .map((f) => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
            .sort((a, b) => a.mtime - b.mtime)

        while (files.length > MAX_CRASH_FILES) {
            const oldest = files.shift()!
            unlinkSync(join(dir, oldest.name))
        }
    } catch {
        // Ignore
    }
}

// ────────────────────────── ID ─────────────────────────────────

function generateId(): string {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ────────────────────────── Main process handlers ──────────────

function handleMainError(
    type: CrashReport['errorType'],
    error: unknown
): void {
    const err = error instanceof Error ? error : new Error(String(error))
    const report: CrashReport = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        appVersion: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        processType: 'main',
        errorType: type,
        message: err.message,
        stack: err.stack,
    }
    writeCrashReport(report)
}

// ────────────────────────── Public API ─────────────────────────

/** Set up main-process error catching. Call once at app start. */
export function setupErrorReporter(): void {
    // Uncaught Node.js exceptions
    process.on('uncaughtException', (error) => {
        handleMainError('uncaught-exception', error)
        // Do NOT re-throw — electron handles shutdown; we just log
    })

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
        handleMainError('unhandled-rejection', reason)
    })

    // IPC: renderer reports an error (from ErrorBoundary or catch blocks)
    ipcMain.handle('app:reportError', (_event, payload: {
        message: string
        stack?: string
        extra?: Record<string, unknown>
    }) => {
        const MAX_MSG = 10_000
        const MAX_STACK = 20_000
        const report: CrashReport = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            appVersion: app.getVersion(),
            platform: process.platform,
            arch: process.arch,
            processType: 'renderer',
            errorType: 'renderer-error',
            message: typeof payload.message === 'string' ? payload.message.slice(0, MAX_MSG) : 'Unknown renderer error',
            stack: typeof payload.stack === 'string' ? payload.stack.slice(0, MAX_STACK) : undefined,
            // Only accept a shallow plain object for extra to prevent prototype pollution
            extra: payload.extra && typeof payload.extra === 'object' && !Array.isArray(payload.extra)
                ? Object.fromEntries(Object.entries(payload.extra).slice(0, 20).map(([k, v]) => [k, typeof v === 'object' ? '[object]' : v]))
                : undefined,
        }
        writeCrashReport(report)
        return { ok: true }
    })

    // IPC: SettingsPage fetches last N crash reports
    ipcMain.handle('app:getCrashLogs', (_event, limit: number = 20) => {
        try {
            const safeLimit = Math.max(1, Math.min(typeof limit === 'number' ? limit : 20, 200))
            const dir = getCrashDir()
            const files = readdirSync(dir)
                .filter((f) => f.startsWith('crash-') && f.endsWith('.json'))
                .map((f) => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
                .sort((a, b) => b.mtime - a.mtime)
                .slice(0, safeLimit)

            const reports = files.map(({ name }) => {
                try {
                    return JSON.parse(readFileSync(join(dir, name), 'utf8')) as CrashReport
                } catch {
                    return null
                }
            }).filter(Boolean) as CrashReport[]

            return { ok: true, reports }
        } catch {
            return { ok: false, reports: [] }
        }
    })

    // IPC: clear crash logs
    ipcMain.handle('app:clearCrashLogs', () => {
        try {
            const dir = getCrashDir()
            const files = readdirSync(dir).filter((f) => f.startsWith('crash-') && f.endsWith('.json'))
            for (const f of files) {
                unlinkSync(join(dir, f))
            }
            return { ok: true, deleted: files.length }
        } catch {
            return { ok: false, deleted: 0 }
        }
    })
}

/** Attach renderer-crash handler to a BrowserWindow (call after window creation) */
export function watchWindowCrashes(win: BrowserWindow): void {
    win.webContents.on('render-process-gone', (_event, details) => {
        const report: CrashReport = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            appVersion: app.getVersion(),
            platform: process.platform,
            arch: process.arch,
            processType: 'renderer',
            errorType: 'renderer-crash',
            message: `Renderer process gone: ${details.reason}`,
            extra: { exitCode: details.exitCode, reason: details.reason },
        }
        writeCrashReport(report)
    })
}
