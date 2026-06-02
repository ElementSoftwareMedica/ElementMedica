/**
 * Bridge Callback Server
 *
 * Minimal HTTP server on CALLBACK_PORT (4051) that receives exam results
 * sent by the Medical Device Bridge once a GDT device has finished processing.
 *
 * Flow:
 *   Device writes GDT result → Bridge parses → Bridge POSTs to
 *   http://127.0.0.1:4051/bridge-callback → we emit 'examResult' event
 *   → ipc-handlers.ts forwards to renderer via mainWindow.webContents.send()
 */

import { createServer, IncomingMessage, ServerResponse, Server } from 'http'
import { EventEmitter } from 'events'
import { randomBytes } from 'crypto'
import { CALLBACK_PORT } from './bridge-process'

/**
 * Shared secret token generated at app startup.
 * Passed to the bridge process via BRIDGE_CALLBACK_TOKEN env var so only
 * the legitimate bridge child process can POST results to this server.
 */
export const BRIDGE_CALLBACK_TOKEN: string = randomBytes(32).toString('hex')

// Event bus — consumed by ipc-handlers.ts
export const bridgeEvents = new EventEmitter()

export interface BridgeExamResult {
    sessionId: string
    visitaId?: string
    tipo: string
    risultato?: string
    valori?: Record<string, string>
    note?: string
    rawGdt?: string
    pdfPath?: string
    pdfBase64?: string
    pdfFilename?: string
    deviceName?: string
    completedAt: string
}

let callbackServer: Server | null = null

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = ''
        req.on('data', (chunk: Buffer) => {
            // Limit body size to 50 MB: exam PDFs are sent as base64 in this callback.
            if (body.length + chunk.length > 50 * 1024 * 1024) {
                req.destroy()  // Close the socket — stops further data from arriving
                reject(new Error('body_too_large'))
                return
            }
            body += chunk.toString('utf8')
        })
        req.on('end', () => resolve(body))
        req.on('error', reject)
    })
}

function normalizeBridgePayload(raw: unknown): BridgeExamResult {
    const payload = raw as {
        sessionId?: string
        visitaId?: string
        tipo?: string
        risultato?: string
        valori?: Record<string, string>
        note?: string
        rawGdt?: string
        pdfPath?: string
        pdfBase64?: string
        pdfFilename?: string
        deviceName?: string
        completedAt?: string
        result?: {
            bridgeSessionId?: string
            resultId?: string
            visitaId?: string
            examType?: string
            deviceType?: string
            examDate?: string
            testResults?: Array<{ testName?: string; testId?: string; value?: string; unit?: string }>
            findings?: string[]
            gdtData?: { raw?: string }
            pdfBase64?: string
            pdfFilename?: string
            status?: string
        }
    }

    if (!payload.result) {
        if (!payload.sessionId || !payload.tipo || !payload.completedAt) throw new Error('invalid_payload')
        return payload as BridgeExamResult
    }

    const result = payload.result
    const valori = Object.fromEntries((result.testResults || []).map(item => {
        const key = item.testName || item.testId || 'Valore'
        const value = [item.value, item.unit].filter(Boolean).join(' ')
        return [key, value]
    }))
    const note = (result.findings || []).join('\n')

    const tipoMap: Record<string, string> = {
        ecg: 'ECG',
        spirometry: 'SPIROMETRIA',
        audiometry: 'AUDIOMETRIA',
        drugtest: 'DRUG_TEST',
    }

    return {
        sessionId: result.bridgeSessionId || result.resultId || '',
        visitaId: result.visitaId,
        tipo: tipoMap[String(result.examType || '').toLowerCase()] || String(result.examType || '').toUpperCase(),
        risultato: result.status === 'error' ? 'ERRORE' : 'COMPLETATO',
        valori,
        note,
        rawGdt: result.gdtData?.raw,
        pdfBase64: result.pdfBase64,
        pdfFilename: result.pdfFilename,
        deviceName: result.deviceType,
        completedAt: result.examDate || new Date().toISOString(),
    }
}

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
    // ── Health check ────────────────────────────────────────────
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, server: 'bridge-callback' }))
        return
    }

    // ── Exam result callback ─────────────────────────────────────
    if (req.method === 'POST' && req.url === '/bridge-callback') {
        // Validate shared secret: only the bridge child process knows this token
        const providedToken = req.headers['x-bridge-token']
        if (!providedToken || providedToken !== BRIDGE_CALLBACK_TOKEN) {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'unauthorized' }))
            return
        }
        readBody(req)
            .then((raw) => {
                const data = normalizeBridgePayload(JSON.parse(raw))
                // Validate required fields minimally
                if (!data.sessionId || !data.tipo || !data.completedAt) {
                    throw new Error('invalid_payload')
                }
                bridgeEvents.emit('examResult', data)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ ok: true }))
            })
            .catch(() => {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'invalid_body' }))
            })
        return
    }

    res.writeHead(404)
    res.end()
}

/** Start the callback HTTP server. Idempotent. */
export function startCallbackServer(): void {
    if (callbackServer) return
    callbackServer = createServer(handleRequest)
    callbackServer.listen(CALLBACK_PORT, '127.0.0.1')
}

/** Stop the callback HTTP server. */
export function stopCallbackServer(): void {
    if (callbackServer) {
        callbackServer.close()
        callbackServer = null
    }
}
