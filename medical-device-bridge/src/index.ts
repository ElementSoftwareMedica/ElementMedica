/**
 * Medical Device Bridge - Main Entry Point
 * 
 * Local server that bridges ElementMedica webapp with medical devices:
 * - Edan ECG
 * - MIR Spirometer (WinSpiro)
 * - Oscilla Audiometer
 * 
 * Communication flow:
 * 1. Webapp sends exam request via POST /start-exam
 * 2. Bridge generates GDT 2.1 file with patient data
 * 3. Bridge writes GDT file to device's input directory
 * 4. Bridge launches device software (optional)
 * 5. Bridge monitors device output directory (chokidar)
 * 6. When device writes results (GDT/PDF), bridge parses them
 * 7. Bridge sends results back to webapp via POST callback
 * 
 * @module index
 * @version 1.0.0
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { hostname } from 'os';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { loadConfig, validateConfig, isActivated } from './config/index.js';
import { createRoutes } from './routes/index.js';
import { DeviceWatcher } from './services/watcher.js';
import { sendResult } from './services/callback.js';
import { startActivationServer } from './activation/index.js';
import logger from './utils/logger.js';
import { bootstrapLog, getBootstrapLogFilePath } from './utils/bootstrapLogger.js';

function loadEnvironmentSafely(): void {
    try {
        const envResult = dotenv.config();
        if (envResult.error) {
            bootstrapLog('WARN', 'Unable to load .env file', {
                error: envResult.error.message,
                bootstrapLog: getBootstrapLogFilePath(),
            });
        }
    } catch (error) {
        bootstrapLog('ERROR', 'Fatal error while loading environment configuration', {
            error: error instanceof Error ? error.message : String(error),
            bootstrapLog: getBootstrapLogFilePath(),
        });
    }
}

process.on('uncaughtException', (error) => {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    bootstrapLog('ERROR', 'Uncaught exception', { error: message, stack });

    try {
        logger.error('Uncaught exception', { error: message, stack });
    } catch {
        // Logger may not be initialized yet.
    }

    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    const reasonText = String(reason);
    bootstrapLog('ERROR', 'Unhandled rejection', { reason: reasonText });

    try {
        logger.error('Unhandled rejection', { reason: reasonText });
    } catch {
        // Logger may not be initialized yet.
    }
});

function ensureWindowsAutoStartShortcut(): void {
    if (process.platform !== 'win32') {
        return;
    }

    const localAppData = process.env.LOCALAPPDATA;
    const appData = process.env.APPDATA;

    if (!localAppData || !appData) {
        return;
    }

    const installDir = join(localAppData, 'ElementMedica', 'MedicalDeviceBridge');
    const launcherPath = join(installDir, 'avvia-bridge.bat');

    // Avoid creating startup entries that point to temporary download folders.
    if (!existsSync(launcherPath)) {
        return;
    }

    const startupLinkPath = join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'ElementMedica Bridge.lnk');

    if (existsSync(startupLinkPath)) {
        return;
    }

    const escapeForPs = (value: string) => value.replace(/'/g, "''");

    const command = [
        "$ErrorActionPreference='Stop'",
        "$ws = New-Object -ComObject WScript.Shell",
        `$s = $ws.CreateShortcut('${escapeForPs(startupLinkPath)}')`,
        `$s.TargetPath = '${escapeForPs(launcherPath)}'`,
        `$s.WorkingDirectory = '${escapeForPs(installDir)}'`,
        "$s.Description = 'ElementMedica Medical Device Bridge'",
        '$s.WindowStyle = 7',
        '$s.Save()'
    ].join('; ');

    exec(`powershell -NoProfile -Command "${command}"`, (error: Error | null) => {
        if (error) {
            logger.warn('Unable to create Windows startup shortcut automatically', {
                component: 'startup',
                error: error.message,
                startupLinkPath,
            });
            return;
        }

        logger.info('Windows startup shortcut created automatically', {
            component: 'startup',
            startupLinkPath,
        });
    });
}

function terminateSiblingBridgeProcesses(): void {
    if (process.platform !== 'win32') {
        return;
    }

    const currentPid = process.pid;
    const command = [
        "$ErrorActionPreference='SilentlyContinue'",
        `$currentPid=${currentPid}`,
        "$targets=@('medical-bridge','medical-bridge-win')",
        "$killed=@()",
        "foreach ($name in $targets) {",
        "  Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $currentPid } | ForEach-Object {",
        "    try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; $killed += ('{0}:{1}' -f $_.ProcessName, $_.Id) } catch {}",
        "  }",
        "}",
        "if ($killed.Count -gt 0) { Write-Output ($killed -join ',') }"
    ].join('; ');

    exec(`powershell -NoProfile -Command "${command}"`, (error: Error | null, stdout: string) => {
        if (error) {
            logger.warn('Unable to terminate sibling bridge processes automatically', {
                component: 'startup',
                error: error.message,
            });
            return;
        }

        const killed = (stdout || '').trim();
        if (killed) {
            logger.warn('Terminated sibling bridge processes to avoid port conflict', {
                component: 'startup',
                killed,
            });
        }
    });
}

function promptRuntimeDeviceSetupIfNeeded(port: number, hasDevices: boolean): void {
    if (hasDevices || process.platform !== 'win32') {
        return;
    }

    // In operational mode with zero devices configured, guide user directly
    // to runtime setup to avoid "bridge running but unusable" confusion.
    const setupUrl = `http://localhost:${port}/setup/devices`;
    exec(`start "" "${setupUrl}"`, () => {
        // Non-fatal: best-effort UX improvement only.
    });
}

async function isBridgeAlreadyRunningOnPort(port: number): Promise<boolean> {
    try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
            signal: AbortSignal.timeout(1500),
        });

        if (!response.ok) {
            return false;
        }

        const data = await response.json().catch(() => null) as { status?: string; service?: string } | null;
        const status = String(data?.status || '').toLowerCase();
        const service = String(data?.service || '').toLowerCase();

        // Accept both activation mode and operational mode as valid running Bridge.
        return status.includes('ok') || status.includes('setup') || service.includes('medical-device-bridge');
    } catch {
        return false;
    }
}

async function main() {
    loadEnvironmentSafely();

    terminateSiblingBridgeProcesses();

    ensureWindowsAutoStartShortcut();

    bootstrapLog('INFO', 'Starting Medical Device Bridge process', {
        bootstrapLog: getBootstrapLogFilePath(),
        cwd: process.cwd(),
        execPath: process.execPath,
    });

    logger.info('=== Medical Device Bridge starting ===');

    // Check if bridge has been activated
    if (!isActivated()) {
        // Check if .env has minimal config (backward compat)
        const hasEnvConfig = process.env.WEBAPP_API_KEY || process.env.WEBAPP_CALLBACK_URL;
        if (!hasEnvConfig) {
            logger.info('No configuration found — starting activation setup');
            const basePort = parseInt(process.env.BRIDGE_PORT || '3000', 10);
            const candidatePorts = [basePort, basePort + 1, basePort + 2];
            let started = false;

            for (const candidatePort of candidatePorts) {
                try {
                    await startActivationServer(candidatePort);
                    if (candidatePort !== basePort) {
                        logger.warn('Activation server started on fallback port due to port conflict', {
                            requestedPort: basePort,
                            activePort: candidatePort,
                        });
                    }
                    started = true;
                    break;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    logger.error('Failed to start activation server on candidate port', {
                        port: candidatePort,
                        error: message,
                    });
                    bootstrapLog('ERROR', 'Activation server startup failed on candidate port', {
                        port: candidatePort,
                        error: message,
                    });
                }
            }

            if (!started) {
                logger.error('Unable to start activation server on all candidate ports', {
                    candidatePorts,
                });
                process.exit(1);
            }

            return; // Activation server runs until user completes setup
        }
    }

    // 1. Load and validate configuration
    const config = loadConfig();
    const validation = validateConfig(config);

    if (!validation.valid) {
        logger.error('Configuration errors:', { errors: validation.errors });
        process.exit(1);
    }

    for (const warning of validation.warnings) {
        logger.warn(`Config: ${warning}`);
    }

    logger.info('Configuration loaded', {
        port: config.port,
        devices: config.devices.map(d => `${d.displayName} (${d.gdtId})`),
        callbackUrl: config.callbackUrl,
    });

    if (config.devices.length === 0) {
        promptRuntimeDeviceSetupIfNeeded(config.port, false);
    }

    // 2. Initialize file watcher with result callback
    const watcher = new DeviceWatcher(async (result, pdfBuffer, pdfFilename) => {
        logger.info('Exam result received', {
            resultId: result.resultId,
            examType: result.examType,
            device: result.deviceType,
            patientId: result.patientId,
            testCount: result.testResults.length,
            hasPdf: !!pdfBuffer,
            status: result.status,
        });

        // Send results back to webapp
        const sent = await sendResult(config, result, pdfBuffer, pdfFilename);
        if (!sent) {
            logger.error('Failed to send result to webapp — result may be lost', {
                resultId: result.resultId,
            });
        }
    });

    // 3. Start watching device output directories
    for (const device of config.devices) {
        watcher.startWatching(device);
    }

    // 4. Create and configure Express app
    const app = express();

    /**
     * Try to start an HTTP server on the given port.
     * Resolves with the server on success, null on EADDRINUSE.
     */
    function tryListen(port: number): Promise<import('http').Server | null> {
        return new Promise((resolve) => {
            // Bind explicitly to 127.0.0.1 (IPv4) so that Electron's health checks
            // via http://127.0.0.1:<port>/health always reach this server.
            // On macOS, app.listen(port) without a host binds to :: (IPv6 only),
            // which causes IPv4 clients to time out instead of getting refused.
            const srv = app.listen(port, '127.0.0.1', () => resolve(srv));
            srv.once('error', () => resolve(null));
        });
    }

    // Chrome Private Network Access (PNA): when the webapp is served over HTTPS,
    // Chrome 113+ sends an OPTIONS preflight with Access-Control-Request-Private-Network: true
    // before any fetch to http://localhost. Without this header in the response the browser
    // aborts the request, making the bridge appear unreachable even when it is running.
    app.use((_req, res, next) => {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
        next();
    });

    // CORS: The bridge is a local-only server (binds to localhost).
    // Allow ElementMedica origins and local dev only; do not expose device launch endpoints
    // to arbitrary HTTPS sites.
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true); // same-origin / non-browser callers
            const localhostOrigins = [
                'http://localhost:5173',
                'http://localhost:5174',
                'http://localhost:4001',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:5174',
                'http://127.0.0.1:4001',
            ];
            const trustedWebOrigins = [
                'https://www.elementmedica.com',
                'https://elementmedica.com',
                'https://app.elementmedica.com',
            ];
            if (localhostOrigins.includes(origin) || trustedWebOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('CORS: origin not allowed'));
        },
        credentials: true,
    }));

    // Parse JSON body (limit for potential PDF uploads)
    app.use(express.json({ limit: '50mb' }));

    // Mount API routes
    app.use('/', createRoutes(watcher));

    // 5. Start server — try configured port then up to 2 fallbacks
    // Skip port+1 (4051 when default 4050) as it is reserved for the Electron callback server.
    const reservedPort = config.port + 1;
    const PORT_CANDIDATES = [config.port, config.port + 2, config.port + 3]
        .filter(p => p !== reservedPort);
    let server: import('http').Server | null = null;
    let activePort = config.port;

    for (const candidatePort of PORT_CANDIDATES) {
        const alreadyRunning = await isBridgeAlreadyRunningOnPort(candidatePort);
        if (alreadyRunning) {
            logger.warn('Port already in use but another Bridge instance is healthy — exiting current duplicate process', {
                port: candidatePort,
                component: 'startup',
            });
            bootstrapLog('WARN', 'Duplicate Bridge process exited because a healthy instance is already running', {
                port: candidatePort,
            });
            process.exit(0);
            return;
        }

        server = await tryListen(candidatePort);
        if (server) {
            activePort = candidatePort;
            break;
        }

        logger.warn('Port in use, trying next candidate', { port: candidatePort, component: 'startup' });
        bootstrapLog('WARN', 'Port in use, trying next candidate', { port: candidatePort });
    }

    if (!server) {
        logger.error('Unable to start Bridge: all candidate ports are in use', { candidates: PORT_CANDIDATES });
        bootstrapLog('ERROR', 'Bridge HTTP server error — all ports in use', { candidates: PORT_CANDIDATES });
        process.exit(1);
        return;
    }

    if (activePort !== config.port) {
        logger.warn('Bridge started on fallback port due to port conflict', {
            requestedPort: config.port,
            activePort,
            component: 'startup',
        });
        bootstrapLog('WARN', 'Bridge started on fallback port', { requestedPort: config.port, activePort });
    }

    logger.info(`Medical Device Bridge running on http://localhost:${activePort}`);
    logger.info(`   Health: http://localhost:${activePort}/health`);
    logger.info(`   Status: http://localhost:${activePort}/status`);
    logger.info(`   Devices: ${config.devices.length} configured`);
    for (const device of config.devices) {
        logger.info(`   - ${device.displayName} (GDT: ${device.gdtId})`);
    }

    server.on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Bridge HTTP server runtime error', { activePort, error: message });
        bootstrapLog('ERROR', 'Bridge HTTP server runtime error', { port: activePort, error: message });
        process.exit(1);
    });

    // 5b. Start heartbeat (if activated via license)
    if (config.activationServerUrl && config.apiKey) {
        const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes
        const sendHeartbeat = async () => {
            try {
                const baseUrl = config.activationServerUrl!.replace(/\/+$/, '');
                await fetch(`${baseUrl}/api/v1/public/bridge/heartbeat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Bridge-Api-Key': config.apiKey,
                    },
                    body: JSON.stringify({
                        bridgeVersion: '1.0.0',
                        machineName: hostname(),
                    }),
                    signal: AbortSignal.timeout(10000),
                });
            } catch {
                // Non-fatal
            }
        };
        sendHeartbeat();
        setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    }

    // 6. Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info(`${signal} received — shutting down gracefully...`);

        server.close(() => {
            logger.info('HTTP server closed');
        });

        await watcher.stopAll();
        logger.info('All watchers stopped');

        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

}

main().catch((error) => {
    bootstrapLog('ERROR', 'Fatal error during startup', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
    });
    logger.error('Fatal error during startup', { error: error.message, stack: error.stack });
    process.exit(1);
});
