/**
 * GiudiziIdoneita Batch Scheduler — Main Process
 *
 * Fires at 22:00 every day:
 *   • generates PDFs not yet generated (server-side)
 *   • sends email to each lavoratore
 *   • sends ZIP to each azienda
 *
 * Handles:
 *   • missed runs (app offline / shut down at 22:00 → re-runs on next startup after 22:00)
 *   • immediate retry (3 attempts, 3 s apart) if server returns an error
 *   • manual force-send via IPC 'giudizi:runBatch'
 *   • deferred send on next calendar day if all retries fail
 *
 * IPC exposed:
 *   giudizi:runBatch(force?)  → Promise<BatchResult>
 *   giudizi:getStatus()       → { lastRun, lastResult, isRunning }
 *   giudizi:batchResult       → BrowserWindow.send (outgoing event)
 */

import { ipcMain, BrowserWindow, safeStorage } from 'electron'
import { getDatabase } from './database'

const API_BASE = 'https://www.elementmedica.com'

const KEY_LAST_RUN = 'giudizi_batch:last_run_date'
const KEY_LAST_RESULT = 'giudizi_batch:last_result'

export interface BatchResult {
    date: string
    status: 'success' | 'failed' | 'no_giudizi' | 'offline'
    giudiziTrovati?: number
    pdfGenerati?: number
    emailInviati?: number
    zipAziende?: number
    error?: string
    completedAt?: string
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null
let isBatchRunning = false

// ─── DB helpers ─────────────────────────────────────────────────────────────

function dbGet(key: string): string | null {
    try {
        const row = getDatabase()
            .prepare(`SELECT value FROM sync_state WHERE key = ?`)
            .get(key) as { value: string } | undefined
        return row?.value ?? null
    } catch { return null }
}

function dbSet(key: string, value: string): void {
    try {
        const now = new Date().toISOString()
        getDatabase()
            .prepare(`INSERT OR REPLACE INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?)`)
            .run(key, value, now)
    } catch { /* non-critical */ }
}

function todayStr(): string {
    return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
    try {
        const row = getDatabase()
            .prepare(`SELECT value FROM sync_state WHERE key = ?`)
            .get('auth:accessToken') as { value: string } | undefined
        if (!row) return null
        return safeStorage.isEncryptionAvailable()
            ? safeStorage.decryptString(Buffer.from(row.value, 'base64'))
            : Buffer.from(row.value, 'base64').toString('utf8')
    } catch { return null }
}

// ─── Batch call ──────────────────────────────────────────────────────────────

async function callBatchEndpoint(force: boolean): Promise<BatchResult> {
    const date = todayStr()
    const token = await getAccessToken()

    if (!token) {
        return { date, status: 'offline', error: 'Nessun token di accesso — effettua il login' }
    }

    try {
        const res = await fetch(
            `${API_BASE}/api/v1/clinica/giudizi-idoneita/batch-generate-send`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ force }),
                signal: AbortSignal.timeout(90_000)
            }
        )

        if (res.status === 401) {
            return { date, status: 'offline', error: 'Sessione scaduta — sincronizza l\'app per rinnovare il token' }
        }
        if (!res.ok) {
            const body = await res.json().catch(() => ({})) as { error?: string }
            return { date, status: 'failed', error: `HTTP ${res.status}: ${body.error ?? 'Errore server'}` }
        }

        const json = await res.json() as { data?: Record<string, unknown> }
        const data = json.data ?? {}
        const giudiziTrovati = (data.giudiziTrovati as number) ?? 0
        const emailStats = data.email as Record<string, number> | undefined
        const zipStats = data.zipAziende as Record<string, number> | undefined

        return {
            date,
            status: giudiziTrovati === 0 ? 'no_giudizi' : 'success',
            giudiziTrovati,
            pdfGenerati: (data.pdfGenerati as number) ?? 0,
            emailInviati: emailStats?.sent ?? 0,
            zipAziende: zipStats?.sent ?? 0,
            completedAt: new Date().toISOString()
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        const isOffline = /fetch|network|ECONNREFUSED|ENOTFOUND|connect/i.test(msg)
        return { date, status: isOffline ? 'offline' : 'failed', error: msg }
    }
}

// ─── Retry wrapper ───────────────────────────────────────────────────────────

async function runWithRetry(force: boolean): Promise<BatchResult> {
    // 3 attempts, 5 s apart
    const MAX_ATTEMPTS = 3
    let result: BatchResult = { date: todayStr(), status: 'failed' }
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 5_000))
        result = await callBatchEndpoint(force)
        if (result.status === 'success' || result.status === 'no_giudizi') break
    }
    return result
}

// ─── Notification ────────────────────────────────────────────────────────────

function notifyRenderer(result: BatchResult): void {
    for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
            win.webContents.send('giudizi:batchResult', result)
        }
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function runGiudiziiBatch(force = false): Promise<BatchResult> {
    if (isBatchRunning) {
        return { date: todayStr(), status: 'failed', error: 'Batch già in esecuzione' }
    }
    isBatchRunning = true
    try {
        const result = await runWithRetry(force)
        dbSet(KEY_LAST_RUN, todayStr())
        dbSet(KEY_LAST_RESULT, JSON.stringify(result))
        notifyRenderer(result)
        return result
    } finally {
        isBatchRunning = false
    }
}

export function getSchedulerStatus(): { lastRun: string | null; lastResult: BatchResult | null; isRunning: boolean } {
    const lastRun = dbGet(KEY_LAST_RUN)
    const raw = dbGet(KEY_LAST_RESULT)
    let lastResult: BatchResult | null = null
    try { if (raw) lastResult = JSON.parse(raw) as BatchResult } catch { /* malformed */ }
    return { lastRun, lastResult, isRunning: isBatchRunning }
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

async function checkSchedule(): Promise<void> {
    if (isBatchRunning) return
    const now = new Date()
    const today = todayStr()
    const lastRun = dbGet(KEY_LAST_RUN)

    // Missed run check: it's past 22:00 and we haven't run today yet
    if (now.getHours() >= 22 && lastRun !== today) {
        await runGiudiziiBatch(false)
    }
}

export function startGiudziScheduler(): void {
    if (schedulerInterval) return

    // Check for missed runs 60 s after startup (auth token needs to load)
    setTimeout(() => checkSchedule(), 60_000)

    // Check every 60 s — lightweight (just reads DB + compares time)
    schedulerInterval = setInterval(() => { checkSchedule() }, 60_000)

    ipcMain.handle('giudizi:runBatch', (_event, force?: boolean) => runGiudiziiBatch(force ?? true))
    ipcMain.handle('giudizi:getStatus', () => getSchedulerStatus())
}

export function stopGiudziScheduler(): void {
    if (schedulerInterval) {
        clearInterval(schedulerInterval)
        schedulerInterval = null
    }
    try { ipcMain.removeHandler('giudizi:runBatch') } catch { /* may not be registered */ }
    try { ipcMain.removeHandler('giudizi:getStatus') } catch { /* may not be registered */ }
}
