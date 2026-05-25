/**
 * Medical Device Bridge — Process Manager
 *
 * Manages the lifecycle of the Medical Device Bridge as a child process of Electron.
 * The bridge is a local Express server that communicates with GDT 2.1 devices
 * (Edan ECG, MIR Spirometer, Oscilla Audiometer) via file-based GDT protocol.
 *
 * Port allocation:
 *   Bridge HTTP:    4050  (env BRIDGE_PORT)
 *   Callback HTTP:  4051  (env BRIDGE_CALLBACK_URL target — see bridge-callback-server.ts)
 *
 * Availability:
 *   dev  → ./node path + ../../../medical-device-bridge/dist/index.js
 *   prod Windows → resources/bridge/medical-bridge-win.exe
 *   prod macOS/Linux → not bundled; bridge must be installed separately
 */

import { app } from 'electron'
import { spawn, ChildProcess, execSync } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync, appendFileSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import { BRIDGE_CALLBACK_TOKEN } from './bridge-callback-server'

// ────────────────────────── Constants ──────────────────────────

/** Port on which the bridge HTTP server will listen */
export const BRIDGE_PORT = 4050

/** Port of the local callback receiver (bridge-callback-server.ts) */
export const CALLBACK_PORT = 4051

// ────────────────────────── State ──────────────────────────────

let bridgeProcess: ChildProcess | null = null

// ────────────────────────── Path resolution ────────────────────

interface BridgeLaunchInfo {
    cmd: string
    args: string[]
}

function getBridgeLaunchInfo(): BridgeLaunchInfo | null {
    // ── Development ──────────────────────────────────────────────
    if (is.dev) {
        // Expect sibling medical-device-bridge/dist/index.js relative to desktop-app/out/main/
        // __dirname resolves to out/main/ at runtime; dist/ is built in dev via electron-vite
        const candidates = [
            join(__dirname, '../../../../medical-device-bridge/dist/index.js'),
            join(process.cwd(), '../medical-device-bridge/dist/index.js'),
        ]
        for (const candidate of candidates) {
            if (existsSync(candidate)) {
                return { cmd: process.execPath, args: [candidate] }
            }
        }
        return null
    }

    // ── Production ───────────────────────────────────────────────
    // Windows: bundled .exe (pkg binary, self-contained Node)
    if (process.platform === 'win32') {
        const winExe = join(process.resourcesPath, 'bridge', 'medical-bridge-win.exe')
        if (existsSync(winExe)) {
            return { cmd: winExe, args: [] }
        }
    }

    // macOS/Linux: bundled arch-specific binary built with pkg
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const macBin = join(process.resourcesPath, 'bridge', `medical-bridge-mac-${arch}`)
    if (existsSync(macBin)) {
        return { cmd: macBin, args: [] }
    }

    return null
}

// ────────────────────────── Zombie cleanup ────────────────────

/**
 * On macOS/Linux, kill any process listening on the given TCP port.
 * This prevents IPv6-only zombie bridge processes from blocking port reuse.
 * Safe to call even if no process is on the port.
 */
function killZombiesOnPort(port: number): void {
    if (process.platform === 'win32') return // handled separately on Windows
    try {
        execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { timeout: 3000 })
    } catch {
        // Non-fatal: port might be free already
    }
}

// ────────────────────────── Public API ─────────────────────────

export interface BridgeStartResult {
    started: boolean
    reason?: 'already_running' | 'not_found' | 'ok'
}

/** Start the bridge child process. Idempotent — safe to call multiple times. */
export function startBridge(): BridgeStartResult {
    if (bridgeProcess && !bridgeProcess.killed) {
        return { started: true, reason: 'already_running' }
    }

    const launchInfo = getBridgeLaunchInfo()
    if (!launchInfo) {
        return { started: false, reason: 'not_found' }
    }

    // Ensure data directory exists
    const bridgeDataDir = join(app.getPath('userData'), 'bridge')
    const bridgeLogDir = join(bridgeDataDir, 'logs')
    try {
        mkdirSync(bridgeDataDir, { recursive: true })
        mkdirSync(bridgeLogDir, { recursive: true })
    } catch {
        // Ignore mkdir errors
    }

    // Kill any zombie process on the bridge port before spawning — prevents IPv6-only
    // orphan processes from blocking port 4050 and causing timeout in health checks.
    killZombiesOnPort(BRIDGE_PORT)

    const bridgeStdoutLog = join(bridgeLogDir, 'bridge-stdout.log')
    const bridgeStderrLog = join(bridgeLogDir, 'bridge-stderr.log')
    const ts = () => new Date().toISOString()

    const env: NodeJS.ProcessEnv = {
        ...process.env,
        BRIDGE_PORT: String(BRIDGE_PORT),
        BRIDGE_DATA_DIR: bridgeDataDir,
        BRIDGE_CALLBACK_URL: `http://127.0.0.1:${CALLBACK_PORT}/bridge-callback`,
        BRIDGE_CALLBACK_TOKEN,  // shared secret — bridge must send this in X-Bridge-Token header
        LOG_DIR: bridgeLogDir,
        NODE_ENV: 'production',
        // These env vars tell the bridge that Electron is the host, so it skips the activation
        // setup page and runs directly in operational mode using the Electron callback server.
        WEBAPP_CALLBACK_URL: `http://127.0.0.1:${CALLBACK_PORT}/bridge-callback`,
        WEBAPP_API_KEY: BRIDGE_CALLBACK_TOKEN,
    }

    bridgeProcess = spawn(launchInfo.cmd, launchInfo.args, {
        env,
        stdio: 'pipe',
        detached: false,
        windowsHide: true,
        // Set cwd to the bridge data directory so that path resolution inside
        // the bridge (resolve('.')) never falls back to the root filesystem.
        // Without this, the bridge binary inherits cwd='/' from Electron, causing
        // chokidar to watch the entire filesystem and block the Node.js event loop.
        cwd: bridgeDataDir,
    })

    bridgeProcess.stdout?.on('data', (data: Buffer) => {
        try { appendFileSync(bridgeStdoutLog, `[${ts()}] ${data.toString()}`) } catch { /* non-fatal */ }
    })

    bridgeProcess.stderr?.on('data', (data: Buffer) => {
        try { appendFileSync(bridgeStderrLog, `[${ts()}] STDERR: ${data.toString()}`) } catch { /* non-fatal */ }
    })

    bridgeProcess.on('exit', (code: number | null) => {
        try { appendFileSync(bridgeStderrLog, `[${ts()}] EXIT code=${code ?? 'null'}\n`) } catch { /* non-fatal */ }
        bridgeProcess = null
    })

    bridgeProcess.on('error', (_err: Error) => {
        bridgeProcess = null
    })

    return { started: true, reason: 'ok' }
}

/** Gracefully stop the bridge child process. */
export function stopBridge(): void {
    if (bridgeProcess) {
        bridgeProcess.kill('SIGTERM')
        bridgeProcess = null
    }
}

export interface BridgeStatusInfo {
    running: boolean
    port: number
    pid?: number
    available: boolean
}

/** Returns current process status and port. Does NOT make HTTP calls. */
export function getBridgeStatus(): BridgeStatusInfo {
    return {
        running: bridgeProcess !== null && !bridgeProcess.killed,
        port: BRIDGE_PORT,
        pid: bridgeProcess?.pid ?? undefined,
        available: getBridgeLaunchInfo() !== null,
    }
}
