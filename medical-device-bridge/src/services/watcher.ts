/**
 * File Watcher Service
 * 
 * Uses chokidar to monitor device output directories for new GDT/PDF result files.
 * When a new file is detected, it parses the GDT data and triggers the callback pipeline.
 * 
 * @module services/watcher
 */

import chokidar, { type FSWatcher } from 'chokidar';
import { readFile, stat, access, readdir, unlink } from 'fs/promises';
import { basename, dirname, extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { parseGdtFile, buildExamResult, extractPdfPath } from '../gdt/parser.js';
import type { DeviceConfig, ExamSession, ExamResult } from '../types/index.js';

type ResultCallback = (result: ExamResult, pdfBuffer?: Buffer, pdfFilename?: string) => Promise<void>;
const RESULT_RECORD_TYPES = new Set(['6301', '6310']);
const EDAN_OUTPUT_BASENAME = 'EKG_EDP';

function isEdanOutputFile(filePath: string, device: DeviceConfig): boolean {
    if (device.type !== 'edan-ecg' && device.examType !== 'ecg') return false;
    const filename = basename(filePath);
    const base = basename(filename, extname(filename)).toUpperCase();
    return base === EDAN_OUTPUT_BASENAME;
}

function isGdtLikeFile(filePath: string, device: DeviceConfig): boolean {
    const ext = extname(filePath).toLowerCase();
    return ext === '.gdt' || ext === '.txt' || isEdanOutputFile(filePath, device);
}

/**
 * File watcher for medical device output directories
 */
export class DeviceWatcher {
    private watchers: Map<string, FSWatcher> = new Map();
    private activeSessions: Map<string, ExamSession> = new Map();
    private onResult: ResultCallback;
    private processedFiles: Set<string> = new Set();
    private pendingGdtDevices: Set<string> = new Set();
    private cleanupInterval?: ReturnType<typeof setInterval>;
    private static readonly MAX_PROCESSED_FILES = 1000;
    private static readonly PDF_RECENT_WINDOW_MS = 5 * 60 * 1000;
    private static readonly PDF_POLL_TIMEOUT_MS = 60 * 1000;
    private static readonly PDF_POLL_INTERVAL_MS = 3 * 1000;

    constructor(onResult: ResultCallback) {
        this.onResult = onResult;
        // Periodically clean up old entries to prevent memory leak
        this.cleanupInterval = setInterval(() => this.cleanupProcessedFiles(), 60 * 60 * 1000); // Every hour
    }

    /** Remove oldest processed file entries when limit is exceeded */
    private cleanupProcessedFiles(): void {
        if (this.processedFiles.size > DeviceWatcher.MAX_PROCESSED_FILES) {
            const toRemove = this.processedFiles.size - DeviceWatcher.MAX_PROCESSED_FILES;
            const iterator = this.processedFiles.values();
            for (let i = 0; i < toRemove; i++) {
                const val = iterator.next().value;
                if (val) this.processedFiles.delete(val);
            }
            logger.debug('Cleaned up processed files set', { removed: toRemove, remaining: this.processedFiles.size });
        }
        // Also clean up completed/error sessions older than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        for (const [id, session] of this.activeSessions) {
            if ((session.status === 'completed' || session.status === 'error') && session.startedAt < oneHourAgo) {
                this.activeSessions.delete(id);
            }
        }
    }

    /**
     * Start watching a device's output directory
     */
    startWatching(device: DeviceConfig): void {
        const dir = device.gdtOutputDir;

        // Skip if no output directory is configured — avoids chokidar watching
        // the entire filesystem (or CWD) when the field is an empty string.
        // Also skip filesystem root ('/' on macOS/Linux, drive roots on Windows) which
        // is what resolve('.') returns when the bridge runs with cwd='/'.
        // Watching '/' immediately floods the event loop with EACCES/EPERM errors and
        // makes the HTTP server unresponsive.
        if (!dir || dir.trim() === '') {
            logger.warn('Skipping watcher: gdtOutputDir not configured', { device: device.type });
            return;
        }
        const isRootPath = dir === '/' || dir === '\\' || /^[A-Za-z]:[\\\/]?$/.test(dir);
        if (isRootPath) {
            logger.warn('Skipping watcher: gdtOutputDir is filesystem root — please configure a specific output directory in Bridge settings', { device: device.type, dir });
            return;
        }

        // Ensure directory exists
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
            logger.info('Created output directory', { device: device.type, dir });
        }

        // Don't double-watch
        if (this.watchers.has(device.type)) {
            logger.warn('Already watching device output', { device: device.type });
            return;
        }

        const watcher = chokidar.watch(dir, {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 2000,  // Wait 2s after last write
                pollInterval: 500,
            },
            depth: 1,
            // Watch for .gdt and .pdf files
        });

        watcher.on('add', async (filePath: string) => {
            await this.handleNewFile(filePath, device);
        });

        // Also watch for 'change' events — some device software overwrites
        // the same output file instead of creating a new one. This allows
        // results to be picked up without closing the instrument application.
        watcher.on('change', async (filePath: string) => {
            await this.handleChangedFile(filePath, device);
        });

        watcher.on('error', (error: unknown) => {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error('Watcher error', { device: device.type, error: msg });
        });

        this.watchers.set(device.type, watcher);
        logger.info('Started watching device output directory', {
            device: device.type,
            displayName: device.displayName,
            dir,
        });
    }

    /**
     * Handle a file that was overwritten in the output directory.
     * Some device software overwrites the same GDT/PDF file instead of creating
     * a new one — this allows results to be picked up live without closing
     * the instrument application.
     */
    private async handleChangedFile(filePath: string, device: DeviceConfig): Promise<void> {
        const filename = basename(filePath);
        const ext = extname(filename).toLowerCase();

        if (!isGdtLikeFile(filePath, device) && ext !== '.pdf') return;

        // Remove from processed set so it can be re-processed
        this.processedFiles.delete(filePath);

        logger.info('File changed (re-processing)', {
            device: device.type,
            filename,
            extension: ext,
        });

        await this.handleNewFile(filePath, device);
    }

    /**
     * Handle a new file detected in the output directory
     */
    private async handleNewFile(filePath: string, device: DeviceConfig): Promise<void> {
        const filename = basename(filePath);
        const ext = extname(filename).toLowerCase();

        // Skip already processed files
        if (this.processedFiles.has(filePath)) {
            return;
        }

        logger.info('New file detected', {
            device: device.type,
            filename,
            extension: ext,
        });

        try {
            if (isGdtLikeFile(filePath, device)) {
                await this.processGdtResult(filePath, device);
            } else if (ext === '.pdf') {
                await this.processPdfResult(filePath, device);
            } else {
                logger.debug('Ignoring non-GDT/TXT/PDF file', { filename });
            }

            this.processedFiles.add(filePath);
        } catch (error) {
            logger.error('Error processing file', {
                device: device.type,
                filename,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Process a GDT result file from a device
     */
    private async processGdtResult(filePath: string, device: DeviceConfig): Promise<void> {
        logger.info('Processing GDT result', { device: device.type, filePath });

        const record = await parseGdtFile(filePath);

        // Ignore request/control records to avoid false positives when devices
        // use a single shared GDT folder for both inbound and outbound files.
        const knownEdanOutput = isEdanOutputFile(filePath, device);
        if (!RESULT_RECORD_TYPES.has(record.recordType) && !knownEdanOutput) {
            logger.debug('Ignoring non-result GDT record type', {
                device: device.type,
                filePath,
                recordType: record.recordType || 'unknown',
            });
            return;
        }

        // Find matching session by patient ID in the GDT record
        const patientIdFromGdt = record.fields.find(f => f.fieldId === '3000')?.value;
        const session = this.findSessionForResult(device, patientIdFromGdt);

        // Build exam result
        const resultId = uuidv4();
        const result = buildExamResult(
            record,
            device.type,
            device.examType,
            session?.request.patient.patientId || patientIdFromGdt || 'unknown',
            session?.request.visitaId || '',
            session?.request.tenantId || '',
            resultId
        );

        // Attach bridge session ID so the backend can match to existing EsameStrumentale record
        if (session) {
            result.bridgeSessionId = session.id;
        }

        // Mark device as pending so processPdfResult skips standalone PDF handling
        this.pendingGdtDevices.add(device.type);

        let pdfBuffer: Buffer | undefined;
        let pdfFilename: string | undefined;

        try {
            // 1. Try conventional PDF discovery (same-name .pdf, configured pdfOutputDir, most-recent in dir)
            let pdfPath = await this.findAssociatedPdfPath(filePath, device);

            // 2. Oscilla AudioConsole embeds the PDF path in field 6305 — use it as fallback
            if (!pdfPath) {
                const embeddedPath = extractPdfPath(record);
                if (embeddedPath && await this.pathExists(embeddedPath)) {
                    pdfPath = embeddedPath;
                    logger.info('Using Oscilla embedded PDF path (field 6305)', {
                        device: device.type,
                        embeddedPath,
                    });
                }
            }

            // 3. PDF not yet present — poll for up to 60 s (generated after user saves exam)
            if (!pdfPath) {
                logger.info('PDF non trovato subito, attendo fino a 60 s...', { device: device.type });
                pdfPath = await this.waitForPdfPath(filePath, device);
            }

            if (pdfPath) {
                pdfBuffer = await readFile(pdfPath);
                pdfFilename = basename(pdfPath);
                logger.info('Found accompanying PDF', {
                    device: device.type,
                    pdfFilename,
                    size: pdfBuffer.length,
                });
            } else {
                logger.info('Nessun PDF trovato dopo attesa — invio risultato senza allegato', { device: device.type });
            }
        } catch {
            // No PDF file — that's fine
        } finally {
            this.pendingGdtDevices.delete(device.type);
        }

        // Update session if found
        if (session) {
            session.status = 'completed';
            session.result = result;
            if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
        }

        // Trigger callback
        await this.onResult(result, pdfBuffer, pdfFilename);

        // Delete the processed GDT file — it has been fully imported
        try { await unlink(filePath); } catch { /* non-fatal: file may have been moved already */ }
    }

    private async findAssociatedPdfPath(filePath: string, device: DeviceConfig): Promise<string | undefined> {
        const ext = extname(filePath);
        const sameNameInGdtDir = ext
            ? filePath.replace(/\.(gdt|txt)$/i, '.pdf')
            : `${filePath}.pdf`;
        if (await this.pathExists(sameNameInGdtDir)) {
            return sameNameInGdtDir;
        }

        const pdfDir = (device.pdfOutputDir || device.gdtOutputDir || '').trim();
        if (!pdfDir) return undefined;

        const baseName = basename(filePath, extname(filePath));
        const sameNameInPdfDir = join(pdfDir, `${baseName}.pdf`);
        if (sameNameInPdfDir !== sameNameInGdtDir && await this.pathExists(sameNameInPdfDir)) {
            return sameNameInPdfDir;
        }

        // Search for the most recent PDF in pdfDir, including when it is the same
        // directory as the GDT output dir. EDAN for example saves both EKG_EDP.GDT
        // and the PDF report to the same folder (C:\GDT), but names the PDF after
        // the patient ({PatientId}_{Name}.pdf), so same-name lookup above fails.
        const recentPdf = await this.findRecentPdfInDirectory(pdfDir);
        if (recentPdf) {
            logger.debug('Using most recent PDF from PDF directory', {
                device: device.type,
                filePath,
                recentPdf,
            });
            return recentPdf;
        }

        // If pdfDir differs from the GDT output dir, also scan the GDT output dir
        // itself as a last resort (catches devices that write PDF alongside GDT).
        const gdtDir = dirname(filePath);
        if (pdfDir !== gdtDir) {
            return await this.findRecentPdfInDirectory(gdtDir);
        }

        return undefined;
    }

    private async pathExists(pathToCheck: string): Promise<boolean> {
        try {
            await access(pathToCheck);
            return true;
        } catch {
            return false;
        }
    }

    private async findRecentPdfInDirectory(directory: string): Promise<string | undefined> {
        try {
            const entries = await readdir(directory, { withFileTypes: true });
            const now = Date.now();
            let newestPath: string | undefined;
            let newestMtime = 0;

            for (const entry of entries) {
                if (!entry.isFile()) continue;
                if (extname(entry.name).toLowerCase() !== '.pdf') continue;

                const candidatePath = join(directory, entry.name);
                const info = await stat(candidatePath);
                const age = now - info.mtimeMs;
                if (age <= DeviceWatcher.PDF_RECENT_WINDOW_MS && info.mtimeMs > newestMtime) {
                    newestMtime = info.mtimeMs;
                    newestPath = candidatePath;
                }
            }

            return newestPath;
        } catch {
            return undefined;
        }
    }

    private async waitForPdfPath(filePath: string, device: DeviceConfig): Promise<string | undefined> {
        const deadline = Date.now() + DeviceWatcher.PDF_POLL_TIMEOUT_MS;
        while (Date.now() < deadline) {
            await new Promise<void>(resolve => setTimeout(resolve, DeviceWatcher.PDF_POLL_INTERVAL_MS));
            const pdfPath = await this.findAssociatedPdfPath(filePath, device);
            if (pdfPath) {
                logger.info('PDF trovato tramite polling', {
                    device: device.type,
                    pdfPath,
                    waitedMs: DeviceWatcher.PDF_POLL_TIMEOUT_MS - (deadline - Date.now()),
                });
                return pdfPath;
            }
        }
        return undefined;
    }

    /**
     * Process a standalone PDF result file
     * Some devices output PDFs separately or without GDT
     */
    private async processPdfResult(filePath: string, device: DeviceConfig): Promise<void> {
        // If a GDT is currently being processed for this device, the PDF will be
        // picked up by the polling loop inside processGdtResult — skip here.
        if (this.pendingGdtDevices.has(device.type)) {
            logger.debug('PDF ignorato: GDT in elaborazione per questo dispositivo', { filePath, device: device.type });
            return;
        }

        // Check if there's a matching GDT file that was already processed
        const gdtPath = filePath.replace(/\.pdf$/i, '.gdt');
        if (this.processedFiles.has(gdtPath)) {
            // The GDT handler already picked up this PDF
            logger.debug('PDF already processed with GDT', { filePath });
            return;
        }

        // Standalone PDF — find any active session for this device
        const session = this.findAnySessionForDevice(device);

        const pdfBuffer = await readFile(filePath);
        const pdfFilename = basename(filePath);

        logger.info('Processing standalone PDF result', {
            device: device.type,
            filename: pdfFilename,
            size: pdfBuffer.length,
        });

        // Build minimal result
        const resultId = uuidv4();
        const result: ExamResult = {
            resultId,
            examType: device.examType,
            deviceType: device.type,
            patientId: session?.request.patient.patientId || 'unknown',
            visitaId: session?.request.visitaId || '',
            tenantId: session?.request.tenantId || '',
            examDate: new Date().toISOString(),
            gdtData: { recordType: '', fields: [] },
            testResults: [],
            findings: [],
            pdfBase64: pdfBuffer.toString('base64'),
            pdfFilename,
            status: 'completed',
        };

        // Update session
        if (session) {
            session.status = 'completed';
            session.result = result;
            if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
        }

        await this.onResult(result, pdfBuffer, pdfFilename);
    }

    /**
     * Register an active exam session
     */
    registerSession(session: ExamSession): void {
        this.activeSessions.set(session.id, session);

        // Set timeout (10 minutes default)
        const EXAM_TIMEOUT_MS = 10 * 60 * 1000;
        session.timeoutTimer = setTimeout(() => {
            if (session.status === 'waiting_results' || session.status === 'device_launched') {
                session.status = 'timeout';
                logger.warn('Exam session timed out', {
                    sessionId: session.id,
                    device: session.device.type,
                    patientId: session.request.patient.patientId,
                });
                this.activeSessions.delete(session.id);
            }
        }, EXAM_TIMEOUT_MS);

        logger.info('Exam session registered', {
            sessionId: session.id,
            device: session.device.type,
            patientId: session.request.patient.patientId,
        });
    }

    /**
     * Find a session matching a device result.
     * First tries to match by patient ID (exact or short form without hyphens).
     * Falls back to device-type-only match because some devices (e.g. EDAN ECG)
     * overwrite field 3000 with their own internal ID rather than echoing ours.
     */
    private findSessionForResult(device: DeviceConfig, patientId?: string): ExamSession | undefined {
        if (patientId) {
            for (const session of this.activeSessions.values()) {
                if (
                    session.device.type === device.type &&
                    (session.status === 'waiting_results' || session.status === 'device_launched')
                ) {
                    const shortId = session.request.patient.patientId.replace(/-/g, '').substring(0, 20);
                    if (session.request.patient.patientId === patientId || shortId === patientId) {
                        return session;
                    }
                }
            }
        }
        // Fallback: device may not echo our patient ID — match by device type alone
        return this.findAnySessionForDevice(device);
    }

    /**
     * Find any active session for a device (fallback)
     */
    private findAnySessionForDevice(device: DeviceConfig): ExamSession | undefined {
        for (const session of this.activeSessions.values()) {
            if (
                session.device.type === device.type &&
                (session.status === 'waiting_results' || session.status === 'device_launched')
            ) {
                return session;
            }
        }
        return undefined;
    }

    /**
     * Get all active sessions
     */
    getActiveSessions(): ExamSession[] {
        return Array.from(this.activeSessions.values());
    }

    /**
     * Stop watching all devices
     */
    async stopAll(): Promise<void> {
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        for (const [deviceType, watcher] of this.watchers) {
            await watcher.close();
            logger.info('Stopped watching device', { device: deviceType });
        }
        this.watchers.clear();

        // Clear all timeouts
        for (const session of this.activeSessions.values()) {
            if (session.timeoutTimer) clearTimeout(session.timeoutTimer);
        }
        this.activeSessions.clear();
        this.processedFiles.clear();
        this.pendingGdtDevices.clear();
    }
}
