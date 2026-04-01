/**
 * API Routes for Medical Device Bridge
 * 
 * Endpoints:
 * - POST /start-exam    Start a new examination
 * - GET  /status        Get bridge and device status
 * - GET  /sessions      List active exam sessions
 * - GET  /devices       List configured devices
 * 
 * @module routes
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { spawn } from 'child_process';
import type { StdioOptions } from 'child_process';
import { openSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { loadConfig, getDeviceForExam, CONFIG_FILE_PATH, loadSavedConfig, saveConfig, clearSavedConfig } from '../config/index.js';
import { generateExamRequest, writeGdtFile } from '../gdt/generator.js';
import { launchDevice, isDeviceAvailable } from '../services/launcher.js';
import type { DeviceWatcher } from '../services/watcher.js';
import type { ExamRequest, ExamSession, BridgeStatus } from '../types/index.js';
import { existsSync } from 'fs';
import { hostname, platform, uptime } from 'os';
import { deviceSetupPageHtml } from '../activation/pages.js';

const BRIDGE_VERSION = '1.0.0';

type ProcessWithPkg = NodeJS.Process & { pkg?: unknown };

function restartBridgeProcess(): void {
    try {
        const isPackaged = Boolean((process as ProcessWithPkg).pkg);
        const command = process.execPath;
        const args = isPackaged ? [] : process.argv.slice(1);

        // Redirect stdout+stderr to bridge-runtime.log so logs are continuous after restart
        let stdioOption: StdioOptions = 'ignore';
        if (process.platform === 'win32') {
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
        logger.error('Failed to restart bridge process', {
            component: 'runtime-setup',
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
 * Validate API key on Bridge endpoints that modify state.
 * If WEBAPP_API_KEY is configured, requests must include X-Bridge-Api-Key header.
 * If no key is configured, all requests are accepted (backward compat for dev).
 */
function validateApiKey(req: Request, res: Response, next: NextFunction): void {
    const configuredKey = process.env.WEBAPP_API_KEY;
    if (!configuredKey) {
        // No API key configured — allow all requests (development mode)
        return next();
    }

    const providedKey = req.headers['x-bridge-api-key'] as string;
    if (!providedKey) {
        res.status(401).json({
            success: false,
            error: 'Autenticazione richiesta: header X-Bridge-Api-Key mancante',
        });
        return;
    }

    // Timing-safe comparison to prevent side-channel attacks
    if (providedKey.length !== configuredKey.length) {
        const buf = Buffer.from(configuredKey);
        crypto.timingSafeEqual(buf, buf); // constant time even on length mismatch
        res.status(401).json({ success: false, error: 'API key non valida' });
        return;
    }

    if (!crypto.timingSafeEqual(Buffer.from(providedKey), Buffer.from(configuredKey))) {
        res.status(401).json({ success: false, error: 'API key non valida' });
        return;
    }

    next();
}

/**
 * Create API routes with watcher injection
 */
export function createRoutes(watcher: DeviceWatcher): Router {
    const router = Router();
    const config = loadConfig();
    const startTime = Date.now();

    /**
     * GET /setup
     * Operational mode helper endpoint to avoid confusing 404 when opening setup URL.
     */
    router.get('/setup', (_req: Request, res: Response) => {
        res.type('html').send(`<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ElementMedica Bridge - Gia attivo</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f3f4f6; margin:0; padding:24px; }
        .card { max-width:640px; margin:40px auto; background:#fff; border-radius:12px; padding:24px; box-shadow:0 10px 25px rgba(0,0,0,.08); }
        h1 { margin:0 0 8px; font-size:22px; color:#0d9488; }
        p { margin:8px 0; color:#374151; line-height:1.5; }
        code { background:#f3f4f6; padding:2px 6px; border-radius:6px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Bridge gia attivo</h1>
        <p>Il Bridge e in modalita operativa su questa macchina.</p>
        <p>Puoi riconfigurare i dispositivi senza reinstallare aprendo <a href="/setup/devices"><code>/setup/devices</code></a>.</p>
        <p>Stato rapido: <code>/status</code> e <code>/health</code>.</p>
        <p>Se vuoi rifare la sola attivazione licenza, usa il pulsante qui sotto (reset automatico).</p>
        <form method="post" action="/api/reconfigure" style="margin-top:16px;">
            <button type="submit" style="background:#0d9488;color:#fff;border:none;border-radius:8px;padding:10px 14px;cursor:pointer;">Rifai attivazione guidata</button>
        </form>
        <p style="margin-top:12px;font-size:12px;color:#6b7280;">Config path attuale: <code>${CONFIG_FILE_PATH.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></p>
    </div>
</body>
</html>`);
    });

    router.get('/setup/devices', (_req: Request, res: Response) => {
        const saved = loadSavedConfig();
        const currentDevices = saved?.devices as Array<Record<string, unknown>> | undefined;
        res.type('html').send(deviceSetupPageHtml(currentDevices));
    });

    /**
     * GET /setup/complete
     * Shown after device configuration is saved and bridge restarts in operational mode.
     * Activation flow redirects here after save-devices succeeds.
     */
    router.get('/setup/complete', (_req: Request, res: Response) => {
        res.type('html').send(`<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ElementMedica Bridge - Configurazione Completata</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg,#0d9488 0%,#0f766e 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: white; border-radius: 16px; padding: 48px 40px; max-width: 480px; width: 100%; box-shadow: 0 25px 50px rgba(0,0,0,.15); text-align: center; }
        .icon { font-size: 64px; margin-bottom: 24px; }
        h1 { font-size: 22px; color: #0d9488; margin-bottom: 12px; }
        p { color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 12px; }
        .status { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin: 16px 0; color: #16a34a; font-size: 14px; font-weight: 500; }
        .btn { display: inline-block; margin-top: 8px; padding: 10px 24px; background: #0d9488; color: white; border: none; border-radius: 8px; font-size: 14px; text-decoration: none; cursor: pointer; }
        .btn:hover { background: #0f766e; }
        .links { margin-top: 16px; font-size: 13px; color: #9ca3af; }
        .links a { color: #0d9488; text-decoration: none; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">✅</div>
        <h1>Bridge Configurato e Attivo</h1>
        <div class="status">Bridge in modalita operativa su questa macchina</div>
        <p>La configurazione e stata salvata. Il Bridge elaborera automaticamente gli esami dai dispositivi medici collegati.</p>
        <p>Puoi chiudere questa finestra. Il Bridge continua a funzionare in background.</p>
        <div class="links">
            <a href="/status">Stato Bridge</a> &nbsp;·&nbsp;
            <a href="/setup/devices">Riconfigura dispositivi</a>
        </div>
    </div>
</body>
</html>`);
    });

    /**
     * POST /api/activate
     * Operational mode helper endpoint to avoid misleading 404 in browser console.
     */
    router.post('/api/activate', (_req: Request, res: Response) => {
        res.status(409).json({
            success: false,
            code: 'BRIDGE_ALREADY_ACTIVATED',
            error: 'Bridge gia attivo su questa macchina',
            message: 'Per riattivare, invia POST a /api/reconfigure oppure usa la pagina /setup',
            configPath: CONFIG_FILE_PATH,
        });
    });

    router.post('/api/save-devices', async (req: Request, res: Response) => {
        try {
            const { devices } = req.body;

            if (!Array.isArray(devices)) {
                return res.status(400).json({
                    success: false,
                    error: 'devices deve essere un array',
                });
            }

            const existing = loadSavedConfig();
            if (!existing) {
                return res.status(400).json({
                    success: false,
                    error: 'Bridge non ancora attivato',
                });
            }

            existing.devices = normalizeDevicesPayload(devices);
            saveConfig(existing);

            if (existing.activationServerUrl && existing.apiKey) {
                try {
                    const serverUrl = String(existing.activationServerUrl).replace(/\/+$/, '');
                    await fetch(`${serverUrl}/api/v1/public/bridge/save-devices`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Bridge-Api-Key': String(existing.apiKey),
                        },
                        body: JSON.stringify({ devices }),
                        signal: AbortSignal.timeout(10000),
                    });
                } catch {
                    // Non-fatal: devices saved locally.
                }
            }

            logger.info('Device config saved in operational mode', {
                component: 'runtime-setup',
                deviceCount: devices.length,
            });

            res.json({
                success: true,
                message: 'Configurazione dispositivi salvata. Il Bridge si riavvia in modalita operativa.',
                restart: true,
            });

            setTimeout(() => {
                restartBridgeProcess();
            }, 1200);
        } catch (error) {
            logger.error('Failed to save device config in operational mode', {
                component: 'runtime-setup',
                error: error instanceof Error ? error.message : String(error),
            });

            res.status(500).json({
                success: false,
                error: 'Errore nel salvataggio della configurazione dispositivi',
            });
        }
    });

    router.post('/api/reconfigure', (_req: Request, res: Response) => {
        const cleared = clearSavedConfig();
        if (!cleared) {
            return res.status(500).json({
                success: false,
                error: 'Impossibile resettare la configurazione. Verificare i permessi del file config.',
                configPath: CONFIG_FILE_PATH,
            });
        }

        res.json({
            success: true,
            message: 'Reset configurazione completato. Riavvio in modalita attivazione...',
            restart: true,
        });

        setTimeout(() => {
            restartBridgeProcess();
        }, 1200);
    });

    /**
     * POST /start-exam
     * Start a new examination with a medical device
     * 
     * Body:
     * {
     *   examType: 'ecg' | 'spirometry' | 'audiometry',
     *   patient: { patientId, lastName, firstName, dateOfBirth, gender, ... },
     *   visitaId: string,
     *   tenantId: string,
     *   callbackUrl?: string
     * }
     */
    router.post('/start-exam', validateApiKey, async (req: Request, res: Response) => {
        try {
            const examRequest = req.body as ExamRequest;

            // Log received request for diagnostics
            logger.info('start-exam request received', {
                examType: examRequest.examType,
                patientId: examRequest.patient?.patientId,
                hasLastName: !!examRequest.patient?.lastName,
                hasFirstName: !!examRequest.patient?.firstName,
                hasDateOfBirth: !!examRequest.patient?.dateOfBirth,
                visitaId: examRequest.visitaId,
                tenantId: examRequest.tenantId,
            });

            // Validate required fields
            if (!examRequest.examType) {
                logger.warn('start-exam 400: examType missing', { body: JSON.stringify(examRequest) });
                res.status(400).json({
                    success: false,
                    error: 'examType is required (ecg, spirometry, audiometry)',
                });
                return;
            }

            if (!examRequest.patient?.patientId || !examRequest.patient?.lastName || !examRequest.patient?.firstName) {
                logger.warn('start-exam 400: patient fields missing', {
                    patientId: examRequest.patient?.patientId,
                    lastName: examRequest.patient?.lastName,
                    firstName: examRequest.patient?.firstName,
                });
                res.status(400).json({
                    success: false,
                    error: 'patient.patientId, patient.lastName, and patient.firstName are required',
                });
                return;
            }

            if (!examRequest.patient?.dateOfBirth) {
                logger.warn('start-exam 400: dateOfBirth missing', { patientId: examRequest.patient?.patientId });
                res.status(400).json({
                    success: false,
                    error: 'patient.dateOfBirth is required (format: YYYY-MM-DD)',
                });
                return;
            }

            if (!examRequest.visitaId) {
                logger.warn('start-exam 400: visitaId missing');
                res.status(400).json({
                    success: false,
                    error: 'visitaId is required',
                });
                return;
            }

            if (!examRequest.tenantId) {
                logger.warn('start-exam 400: tenantId missing');
                res.status(400).json({
                    success: false,
                    error: 'tenantId is required',
                });
                return;
            }

            // Find device for this exam type
            const device = getDeviceForExam(config, examRequest.examType);
            if (!device) {
                res.status(404).json({
                    success: false,
                    error: `No device configured for exam type: ${examRequest.examType}`,
                    availableTypes: config.devices.map(d => d.examType),
                });
                return;
            }

            // Generate session ID
            const sessionId = uuidv4();

            logger.info('Starting exam', {
                sessionId,
                examType: examRequest.examType,
                device: device.type,
                patientId: examRequest.patient.patientId,
                visitaId: examRequest.visitaId,
            });

            // 1. Generate GDT file
            const gdtBuffer = generateExamRequest(examRequest.patient, device, config);

            // 2. Write GDT file to device input directory
            const gdtFilePath = await writeGdtFile(gdtBuffer, device, sessionId);

            // 3. Create exam session
            const session: ExamSession = {
                id: sessionId,
                request: examRequest,
                device,
                gdtFilePath,
                startedAt: new Date(),
                status: 'pending',
            };

            // 4. Register session with watcher
            watcher.registerSession(session);

            // 5. Launch device software
            const launched = await launchDevice(device, gdtFilePath);
            session.status = launched ? 'device_launched' : 'waiting_results';

            if (!launched) {
                logger.warn('Device not launched — waiting for manual start or existing device instance', {
                    sessionId,
                    device: device.type,
                });
            }

            // Update status
            session.status = 'waiting_results';

            res.status(200).json({
                success: true,
                sessionId,
                examType: examRequest.examType,
                device: {
                    type: device.type,
                    displayName: device.displayName,
                    launched,
                },
                gdtFile: gdtFilePath,
                message: launched
                    ? `Esame avviato. ${device.displayName} è stato aperto. I risultati saranno inviati automaticamente.`
                    : `File GDT creato. Avviare manualmente ${device.displayName}. I risultati saranno rilevati automaticamente.`,
            });

        } catch (error) {
            logger.error('Error starting exam', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
            });

            res.status(500).json({
                success: false,
                error: 'Errore interno nell\'avvio dell\'esame. Verificare la configurazione del dispositivo.',
            });
        }
    });

    /**
     * GET /status
     * Get bridge and device status
     */
    router.get('/status', (_req: Request, res: Response) => {
        const status: BridgeStatus = {
            running: true,
            version: BRIDGE_VERSION,
            uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
            devices: config.devices.map(device => ({
                type: device.type,
                displayName: device.displayName,
                enabled: device.enabled,
                gdtId: device.gdtId,
                executableExists: isDeviceAvailable(device),
                inputDirExists: existsSync(device.gdtInputDir),
                outputDirExists: existsSync(device.gdtOutputDir),
                pdfOutputDir: device.pdfOutputDir || device.gdtOutputDir,
                pdfDirExists: existsSync(device.pdfOutputDir || device.gdtOutputDir),
            })),
            activeSessions: watcher.getActiveSessions().length,
            platform: `${platform()} (${process.arch})`,
        };

        res.json(status);
    });

    /**
     * GET /sessions
     * List active exam sessions
     */
    router.get('/sessions', (_req: Request, res: Response) => {
        const sessions = watcher.getActiveSessions().map(s => ({
            id: s.id,
            examType: s.request.examType,
            device: s.device.type,
            patientId: s.request.patient.patientId,
            patientName: `${s.request.patient.lastName} ${s.request.patient.firstName}`,
            visitaId: s.request.visitaId,
            status: s.status,
            startedAt: s.startedAt.toISOString(),
        }));

        res.json({ sessions, count: sessions.length });
    });

    /**
     * GET /devices
     * List configured devices
     */
    router.get('/devices', (_req: Request, res: Response) => {
        const devices = config.devices.map(device => ({
            type: device.type,
            displayName: device.displayName,
            examType: device.examType,
            enabled: device.enabled,
            gdtId: device.gdtId,
            available: isDeviceAvailable(device),
            inputDir: device.gdtInputDir,
            outputDir: device.gdtOutputDir,
            pdfOutputDir: device.pdfOutputDir || device.gdtOutputDir,
        }));

        res.json({ devices, count: devices.length });
    });

    /**
     * GET /health
     * Health check endpoint
     */
    router.get('/health', (_req: Request, res: Response) => {
        res.json({
            status: 'ok',
            version: BRIDGE_VERSION,
            hostname: hostname(),
            uptime: Math.floor((Date.now() - startTime) / 1000),
        });
    });

    return router;
}
