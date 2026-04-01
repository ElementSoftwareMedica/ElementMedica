/**
 * Bridge Activation Flow
 * 
 * When the bridge starts without a config.json, it serves a local
 * setup page where the user enters their activation code.
 * The bridge then calls the server to validate and receive config.
 * 
 * Flow:
 * 1. Bridge starts, no config.json found
 * 2. Express serves setup UI on http://localhost:3000/setup
 * 3. Browser opens automatically
 * 4. User enters activation code (from webapp admin)
 * 5. Bridge calls POST /api/v1/public/bridge/activate
 * 6. Server returns full config (API key, callback URL, tenant info)
 * 7. Bridge saves config.json
 * 8. User configures devices via /setup/devices page
 * 9. Bridge saves device config and restarts in normal mode
 * 
 * @module activation
 */

import express from 'express';
import cors from 'cors';
import { hostname, platform } from 'os';
import { createHash } from 'crypto';
import { networkInterfaces } from 'os';
import { exec, spawn } from 'child_process';
import type { StdioOptions } from 'child_process';
import { openSync } from 'fs';
import { join } from 'path';
import { saveConfig, CONFIG_FILE_PATH, loadSavedConfig } from '../config/index.js';
import logger from '../utils/logger.js';
import { setupPageHtml, deviceSetupPageHtml, activationCompleteHtml } from './pages.js';

const BRIDGE_VERSION = '1.0.0';
const DEFAULT_SERVER_URL = 'https://www.elementmedica.com';
const FALLBACK_SERVER_URLS = [
    'https://www.elementmedica.com',
];

function normalizeActivationServerUrl(url: string): string {
    const raw = (url || '').trim();
    if (!raw) return DEFAULT_SERVER_URL;

    // Accept values with/without protocol, then canonicalize to https://www.elementmedica.com.
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
        const parsed = new URL(withProtocol);
        const host = parsed.hostname.toLowerCase();

        if (host === 'app.elementmedica.com' || host === 'elementmedica.com' || host === 'www.elementmedica.com') {
            return DEFAULT_SERVER_URL;
        }

        return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, '');
    } catch {
        return DEFAULT_SERVER_URL;
    }
}

type ProcessWithPkg = NodeJS.Process & { pkg?: unknown };

function restartInOperationalMode(): void {
    try {
        const isPackaged = Boolean((process as ProcessWithPkg).pkg);
        const command = process.execPath;
        const args = isPackaged ? [] : process.argv.slice(1);

        logger.info('Starting bridge operational process', {
            component: 'activation',
            command,
            argCount: args.length,
            packaged: isPackaged,
        });

        // Redirect stdout+stderr to bridge-runtime.log so logs are continuous after restart
        let stdioOption: StdioOptions = 'ignore';
        if (platform() === 'win32') {
            try {
                const logDir = process.env.LOCALAPPDATA
                    ? join(process.env.LOCALAPPDATA, 'ElementMedica', 'MedicalDeviceBridge', 'logs')
                    : join(process.cwd(), 'logs');
                const logFd = openSync(join(logDir, 'bridge-runtime.log'), 'a');
                stdioOption = ['ignore', logFd, logFd];
            } catch {
                stdioOption = 'ignore';
            }
        }

        const child = spawn(command, args, {
            detached: true,
            stdio: stdioOption,
            windowsHide: true,
        });

        child.unref();
    } catch (error) {
        logger.error('Failed to spawn operational process', {
            component: 'activation',
            error: error instanceof Error ? error.message : String(error),
        });
    } finally {
        process.exit(0);
    }
}

function normalizeDevicesPayload(devices: unknown[]): unknown[] {
    return devices.map((device) => {
        if (!device || typeof device !== 'object') return device;
        const raw = device as Record<string, unknown>;
        const gdtOutputDir = typeof raw.gdtOutputDir === 'string' ? raw.gdtOutputDir : '';
        const pdfOutputDir = typeof raw.pdfOutputDir === 'string' && raw.pdfOutputDir.trim()
            ? raw.pdfOutputDir
            : gdtOutputDir;

        return {
            ...raw,
            pdfOutputDir,
        };
    });
}

/**
 * Generate a machine identifier based on hardware info.
 * Uses hostname + MAC addresses hashed for privacy.
 */
function getMachineId(): string {
    const interfaces = networkInterfaces();
    const macs: string[] = [];
    for (const name in interfaces) {
        for (const iface of interfaces[name] || []) {
            if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
                macs.push(iface.mac);
            }
        }
    }
    const raw = `${hostname()}-${macs.sort().join('-')}`;
    return createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

function buildActivationServerCandidates(inputServerUrl?: string): string[] {
    const first = normalizeActivationServerUrl(inputServerUrl || DEFAULT_SERVER_URL);
    const candidates = [first, ...FALLBACK_SERVER_URLS.map((u) => u.replace(/\/+$/, ''))];
    return Array.from(new Set(candidates));
}

/**
 * Start the activation server.
 * Serves a setup UI and handles activation + device config API calls.
 */
export function startActivationServer(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
        const app = express();
        // Chrome PNA: allow cross-origin requests from https:// pages to http://localhost
        app.use((_req, res, next) => {
            res.setHeader('Access-Control-Allow-Private-Network', 'true');
            next();
        });
        // CORS: allow any https:// origin (same logic as operational mode — Bridge is local-only)
        app.use(cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                const localhostOrigins = [
                    'http://localhost:5173', 'http://localhost:5174', 'http://localhost:4001',
                    'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:4001',
                ];
                if (localhostOrigins.includes(origin) || origin.startsWith('https://')) {
                    return callback(null, true);
                }
                return callback(new Error('CORS: origin not allowed'));
            },
            credentials: true,
        }));
        app.use(express.json());

        // Serve the activation setup page
        app.get('/setup', (_req, res) => {
            res.type('html').send(setupPageHtml(DEFAULT_SERVER_URL));
        });

        // Serve the device configuration page
        app.get('/setup/devices', (_req, res) => {
            const saved = loadSavedConfig();
            const currentDevices = saved?.devices as Array<Record<string, unknown>> | undefined;
            res.type('html').send(deviceSetupPageHtml(currentDevices));
        });

        // Serve activation complete page
        app.get('/setup/complete', (_req, res) => {
            res.type('html').send(activationCompleteHtml());
        });

        // Health endpoint (minimal)
        app.get('/health', (_req, res) => {
            res.json({ status: 'setup', message: 'Bridge in modalità attivazione' });
        });

        // Handle activation request from the setup page
        app.post('/api/activate', async (req, res) => {
            try {
                const { licenseKey, serverUrl } = req.body;

                if (!licenseKey || typeof licenseKey !== 'string') {
                    return res.status(400).json({
                        success: false,
                        error: 'Inserire il codice di attivazione',
                    });
                }

                const candidates = buildActivationServerCandidates(serverUrl);
                logger.info('Attempting activation', {
                    component: 'activation',
                    candidates,
                    licenseKey: licenseKey.substring(0, 9) + '***',
                });

                const machineId = getMachineId();
                const machineName = hostname();

                let successfulBaseUrl: string | null = null;
                let successfulData: unknown = null;
                let lastHttpStatus = 503;
                let lastError = 'Attivazione non riuscita';

                for (const candidateBaseUrl of candidates) {
                    const activateUrl = `${candidateBaseUrl}/api/v1/public/bridge/activate`;
                    try {
                        const response = await fetch(activateUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                licenseKey: licenseKey.trim().toUpperCase(),
                                machineId,
                                machineName,
                                bridgeVersion: BRIDGE_VERSION,
                            }),
                            signal: AbortSignal.timeout(15000),
                        });

                        const data = await response.json();
                        if (response.ok && data?.success) {
                            successfulBaseUrl = candidateBaseUrl;
                            successfulData = data;
                            break;
                        }

                        lastHttpStatus = response.status;
                        lastError = data?.error || 'Attivazione non riuscita';

                        logger.warn('Activation attempt failed on server candidate', {
                            component: 'activation',
                            candidateBaseUrl,
                            status: response.status,
                            error: data?.error || null,
                        });
                    } catch (candidateError) {
                        const candidateMessage = candidateError instanceof Error ? candidateError.message : String(candidateError);
                        lastError = candidateMessage;
                        logger.warn('Activation request network failure on server candidate', {
                            component: 'activation',
                            candidateBaseUrl,
                            error: candidateMessage,
                        });
                    }
                }

                if (!successfulBaseUrl || !successfulData) {
                    const businessErrorStatuses = new Set([400, 401, 403, 404, 409]);
                    const responseStatus = businessErrorStatuses.has(lastHttpStatus) ? 200 : lastHttpStatus;

                    return res.status(responseStatus).json({
                        success: false,
                        error: lastError || 'Attivazione non riuscita',
                        statusCode: lastHttpStatus,
                    });
                }

                const data = successfulData as {
                    data: {
                        tenantId: string;
                        tenantName: string;
                        apiKey: string;
                        callbackUrl: string;
                        port?: number;
                        gdtVersion?: string;
                        gdtSenderId?: string;
                        gdtCharset?: number;
                        logLevel?: string;
                        devices?: unknown[];
                    };
                };

                // Save the config
                // IMPORTANT: Use the local activation server port (known-available), NOT the
                // server-suggested port.  The remote API hardcodes port:3000, but the local
                // machine may already have 3000 occupied by another process, which would
                // cause the operational-mode restart to crash with EADDRINUSE.
                const configData = {
                    licenseKey: licenseKey.trim().toUpperCase(),
                    tenantId: data.data.tenantId,
                    tenantName: data.data.tenantName,
                    apiKey: data.data.apiKey,
                    callbackUrl: data.data.callbackUrl,
                    port: port,  // Always the actual local port (not server-suggested)
                    gdtVersion: data.data.gdtVersion || '02.10',
                    gdtSenderId: data.data.gdtSenderId || 'ELEM_MED',
                    gdtCharset: data.data.gdtCharset || 3,
                    logLevel: data.data.logLevel || 'info',
                    activationServerUrl: successfulBaseUrl,
                    machineId,
                    machineName,
                    activatedAt: new Date().toISOString(),
                    devices: data.data.devices || [],
                };

                saveConfig(configData);

                logger.info('Activation successful', {
                    component: 'activation',
                    tenantName: configData.tenantName,
                    configPath: CONFIG_FILE_PATH,
                });

                res.json({
                    success: true,
                    data: {
                        tenantName: configData.tenantName,
                        hasDevices: configData.devices.length > 0,
                    }
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                logger.error('Activation failed', {
                    component: 'activation',
                    error: message,
                });

                if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
                    return res.status(503).json({
                        success: false,
                        error: 'Impossibile raggiungere il server. Verificare la connessione internet.',
                    });
                }

                res.status(500).json({
                    success: false,
                    error: 'Errore durante l\'attivazione. Riprovare.',
                });
            }
        });

        // Handle device configuration save
        app.post('/api/save-devices', async (req, res) => {
            try {
                const { devices } = req.body;

                if (!Array.isArray(devices)) {
                    return res.status(400).json({
                        success: false,
                        error: 'devices deve essere un array',
                    });
                }

                // Load existing config and add devices
                const existing = loadSavedConfig();
                if (!existing) {
                    return res.status(400).json({
                        success: false,
                        error: 'Bridge non ancora attivato',
                    });
                }

                existing.devices = normalizeDevicesPayload(devices);
                saveConfig(existing);

                // Also notify the server about device config
                if (existing.activationServerUrl && existing.apiKey) {
                    try {
                        const serverUrl = (existing.activationServerUrl as string).replace(/\/+$/, '');
                        await fetch(`${serverUrl}/api/v1/public/bridge/save-devices`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-Bridge-Api-Key': existing.apiKey as string,
                            },
                            body: JSON.stringify({ devices }),
                            signal: AbortSignal.timeout(10000),
                        });
                    } catch {
                        // Non-fatal: config saved locally even if server sync fails
                    }
                }

                logger.info('Device config saved', {
                    component: 'activation',
                    deviceCount: devices.length,
                });

                res.json({
                    success: true,
                    message: 'Configurazione salvata. Il Bridge si riavvierà in modalità operativa.',
                    restart: true,
                });

                // Schedule transition to operational mode after response is sent
                setTimeout(() => {
                    logger.info('Transitioning bridge to operational mode...');
                    restartInOperationalMode();
                }, 1500);
            } catch (error) {
                logger.error('Failed to save device config', {
                    component: 'activation',
                    error: error instanceof Error ? error.message : String(error),
                });
                res.status(500).json({
                    success: false,
                    error: 'Errore nel salvataggio della configurazione',
                });
            }
        });

        const server = app.listen(port);

        server.once('listening', () => {
            const setupUrl = `http://localhost:${port}/setup`;
            logger.info(`Bridge setup server running at ${setupUrl}`);
            logger.info('Waiting for activation...');

            // Try to open browser automatically
            openBrowser(setupUrl);

            resolve();
        });

        server.once('error', (error: unknown) => {
            logger.error('Activation server failed to start', {
                component: 'activation',
                port,
                error: error instanceof Error ? error.message : String(error),
            });
            reject(error);
        });

        // Graceful shutdown
        process.on('SIGINT', () => {
            server.close();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            server.close();
            process.exit(0);
        });
    });
}

/** Open URL in default browser (cross-platform) */
function openBrowser(url: string): void {
    const os = platform();
    try {
        if (os === 'win32') {
            exec(`start "" "${url}"`);
        } else if (os === 'darwin') {
            exec(`open "${url}"`);
        } else {
            exec(`xdg-open "${url}"`);
        }
    } catch {
        logger.info(`Open this URL in your browser: ${url}`);
    }
}
