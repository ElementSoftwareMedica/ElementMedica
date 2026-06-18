/**
 * Configuration loader for Medical Device Bridge
 * 
 * Priority:
 * 1. config.json (created by activation flow)
 * 2. .env file (legacy/backward compatibility)
 * 
 * @module config
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { platform } from 'os';
import type { BridgeConfig, DeviceConfig, GdtCharset } from '../types/index.js';

const isWindows = platform() === 'win32';

function resolveBridgeDataDir(): string {
    if (process.env.BRIDGE_DATA_DIR && process.env.BRIDGE_DATA_DIR.trim()) {
        return resolve(process.env.BRIDGE_DATA_DIR);
    }

    if (isWindows && process.env.LOCALAPPDATA && process.env.LOCALAPPDATA.trim()) {
        return join(process.env.LOCALAPPDATA, 'ElementMedica', 'MedicalDeviceBridge');
    }

    if (process.env.TEMP && process.env.TEMP.trim()) {
        return join(process.env.TEMP, 'ElementMedica', 'MedicalDeviceBridge');
    }

    return resolve('.');
}

function resolveBridgeLogDir(): string {
    if (process.env.LOG_DIR && process.env.LOG_DIR.trim()) {
        return resolve(process.env.LOG_DIR);
    }

    return resolve(resolveBridgeDataDir(), 'logs');
}

function ensureDirectory(pathToCreate: string): void {
    if (!existsSync(pathToCreate)) {
        mkdirSync(pathToCreate, { recursive: true });
    }
}

function normalizeBridgeHost(host: string): string {
    const normalizedHost = host.toLowerCase();
    if (
        normalizedHost === 'app.elementmedica.com' ||
        normalizedHost === 'elementmedica.com' ||
        normalizedHost === 'www.elementmedica.com'
    ) {
        return 'www.elementmedica.com';
    }
    return host;
}

function normalizeBridgeBaseUrl(url?: unknown): string | undefined {
    if (typeof url !== 'string' || !url.trim()) return undefined;

    const raw = url.trim();
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
        const parsed = new URL(withProtocol);
        const host = normalizeBridgeHost(parsed.host);
        return `https://${host}`.replace(/\/+$/, '');
    } catch {
        return undefined;
    }
}

function normalizeBridgeCallbackUrl(url?: unknown): string | undefined {
    if (typeof url !== 'string' || !url.trim()) return undefined;

    try {
        const parsed = new URL(url.trim());
        const host = normalizeBridgeHost(parsed.host);
        parsed.protocol = 'https:';
        parsed.host = host;
        return parsed.toString();
    } catch {
        return undefined;
    }
}

/** Path to persisted config file */
export const CONFIG_FILE_PATH = resolve(resolveBridgeDataDir(), 'config.json');

/** Check if bridge has been activated (config.json exists) */
export function isActivated(): boolean {
    return existsSync(CONFIG_FILE_PATH);
}

/** Save activation config to disk */
export function saveConfig(config: Record<string, unknown>): void {
    ensureDirectory(dirname(CONFIG_FILE_PATH));
    writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/** Load saved config from disk */
export function loadSavedConfig(): Record<string, unknown> | null {
    if (!existsSync(CONFIG_FILE_PATH)) return null;
    try {
        const parsed = JSON.parse(readFileSync(CONFIG_FILE_PATH, 'utf-8')) as Record<string, unknown>;

        // Auto-migrate legacy domains to canonical www host.
        const normalizedActivationServerUrl = normalizeBridgeBaseUrl(parsed.activationServerUrl);
        const normalizedCallbackUrl = normalizeBridgeCallbackUrl(parsed.callbackUrl);

        const changed =
            (normalizedActivationServerUrl && normalizedActivationServerUrl !== parsed.activationServerUrl) ||
            (normalizedCallbackUrl && normalizedCallbackUrl !== parsed.callbackUrl);

        if (changed) {
            const migrated: Record<string, unknown> = {
                ...parsed,
                ...(normalizedActivationServerUrl ? { activationServerUrl: normalizedActivationServerUrl } : {}),
                ...(normalizedCallbackUrl ? { callbackUrl: normalizedCallbackUrl } : {}),
            };

            saveConfig(migrated);
            return migrated;
        }

        return parsed;
    } catch {
        return null;
    }
}

/** Remove persisted config to force re-activation flow */
export function clearSavedConfig(): boolean {
    if (!existsSync(CONFIG_FILE_PATH)) {
        return true;
    }

    try {
        unlinkSync(CONFIG_FILE_PATH);
        return true;
    } catch {
        return false;
    }
}

/**
 * Load and validate bridge configuration.
 * If config.json exists (from activation), use it.
 * Otherwise fall back to environment variables (.env).
 */
export function loadConfig(): BridgeConfig {
    const saved = loadSavedConfig();

    const config: BridgeConfig = {
        port: saved?.port as number || parseInt(process.env.BRIDGE_PORT || '3000', 10),
        callbackUrl: saved?.callbackUrl as string || process.env.WEBAPP_CALLBACK_URL || 'http://localhost:4001/api/v1/clinica/strumenti-bridge/risultati',
        apiKey: saved?.apiKey as string || process.env.WEBAPP_API_KEY || '',
        gdtVersion: saved?.gdtVersion as string || process.env.GDT_VERSION || '2.10',
        gdtSenderId: saved?.gdtSenderId as string || process.env.GDT_SENDER_ID || 'ELEM_MED',
        gdtCharset: (saved?.gdtCharset as number || parseInt(process.env.GDT_CHARSET || '3', 10)) as GdtCharset,
        logLevel: saved?.logLevel as string || process.env.LOG_LEVEL || 'info',
        logDir: resolveBridgeLogDir(),
        devices: [],
        // Activation metadata
        licenseKey: saved?.licenseKey as string | undefined,
        tenantId: saved?.tenantId as string | undefined,
        tenantName: saved?.tenantName as string | undefined,
        activationServerUrl: saved?.activationServerUrl as string | undefined,
    };

    // Load devices from saved config (activation flow)
    if (saved?.devices && Array.isArray(saved.devices)) {
        config.devices = (saved.devices as Array<Record<string, unknown>>).map(d => ({
            type: d.type as DeviceConfig['type'],
            enabled: d.enabled as boolean,
            gdtId: (d.gdtId as string || '').substring(0, 8),
            gdtInputDir: (d.gdtInputDir as string || '').trim() ? resolve(d.gdtInputDir as string) : '',
            gdtOutputDir: (d.gdtOutputDir as string || '').trim() ? resolve(d.gdtOutputDir as string) : '',
            pdfOutputDir: ((d.pdfOutputDir as string) || (d.gdtOutputDir as string) || '').trim()
                ? resolve((d.pdfOutputDir as string) || (d.gdtOutputDir as string))
                : '',
            executable: d.executable as string || '',
            examType: d.examType as DeviceConfig['examType'],
            displayName: d.displayName as string || '',
        }));
        return config;
    }

    // Legacy: Load device configurations from environment variables
    const devices: DeviceConfig[] = [];

    // Edan ECG
    if (process.env.EDAN_ENABLED === 'true') {
        devices.push({
            type: 'edan-ecg',
            enabled: true,
            gdtId: (process.env.EDAN_GDT_ID || 'EKG').substring(0, 8),
            gdtInputDir: resolve(process.env.EDAN_GDT_INPUT_DIR || './data/edan/input'),
            gdtOutputDir: resolve(process.env.EDAN_GDT_OUTPUT_DIR || './data/edan/output'),
            pdfOutputDir: resolve(process.env.EDAN_PDF_OUTPUT_DIR || process.env.EDAN_GDT_OUTPUT_DIR || './data/edan/output'),
            executable: isWindows
                ? (process.env.EDAN_EXECUTABLE_WIN || 'C:\\Program Files\\EDAN\\ECGViewer.exe')
                : (process.env.EDAN_EXECUTABLE_MAC || '/Applications/EDAN/ECGViewer.app'),
            examType: 'ecg',
            displayName: 'Edan ECG',
        });
    }

    // MIR Spirometer
    if (process.env.MIR_ENABLED === 'true') {
        devices.push({
            type: 'mir-spirometer',
            enabled: true,
            gdtId: (process.env.MIR_GDT_ID || 'WINSPIRO').substring(0, 8),
            gdtInputDir: resolve(process.env.MIR_GDT_INPUT_DIR || './data/mir/input'),
            gdtOutputDir: resolve(process.env.MIR_GDT_OUTPUT_DIR || './data/mir/output'),
            pdfOutputDir: resolve(process.env.MIR_PDF_OUTPUT_DIR || process.env.MIR_GDT_OUTPUT_DIR || './data/mir/output'),
            executable: isWindows
                ? (process.env.MIR_EXECUTABLE_WIN || 'C:\\Program Files\\MIR\\WinspiroPRO\\Winspiro.exe')
                : (process.env.MIR_EXECUTABLE_MAC || '/Applications/Winspiro.app'),
            examType: 'spirometry',
            displayName: 'MIR Spirometro',
        });
    }

    // Oscilla Audiometer
    if (process.env.OSCILLA_ENABLED === 'true') {
        devices.push({
            type: 'oscilla-audiometer',
            enabled: true,
            gdtId: (process.env.OSCILLA_GDT_ID || 'OSCILLA').substring(0, 8),
            gdtInputDir: resolve(process.env.OSCILLA_GDT_INPUT_DIR || './data/oscilla/input'),
            gdtOutputDir: resolve(process.env.OSCILLA_GDT_OUTPUT_DIR || './data/oscilla/output'),
            pdfOutputDir: resolve(process.env.OSCILLA_PDF_OUTPUT_DIR || process.env.OSCILLA_GDT_OUTPUT_DIR || './data/oscilla/output'),
            executable: isWindows
                ? (process.env.OSCILLA_EXECUTABLE_WIN || 'C:\\Program Files\\Oscilla\\AudioConsole.exe')
                : (process.env.OSCILLA_EXECUTABLE_MAC || '/Applications/Oscilla/AudioConsole.app'),
            examType: 'audiometry',
            displayName: 'Oscilla Audiometro',
        });
    }

    // Drug test analyzer (generic GDT-capable device)
    if (process.env.DRUGTEST_ENABLED === 'true') {
        devices.push({
            type: 'drugtest-analyzer',
            enabled: true,
            gdtId: (process.env.DRUGTEST_GDT_ID || 'DRUGTEST').substring(0, 8),
            gdtInputDir: resolve(process.env.DRUGTEST_GDT_INPUT_DIR || './data/drugtest/input'),
            gdtOutputDir: resolve(process.env.DRUGTEST_GDT_OUTPUT_DIR || './data/drugtest/output'),
            pdfOutputDir: resolve(process.env.DRUGTEST_PDF_OUTPUT_DIR || process.env.DRUGTEST_GDT_OUTPUT_DIR || './data/drugtest/output'),
            executable: isWindows
                ? (process.env.DRUGTEST_EXECUTABLE_WIN || '')
                : (process.env.DRUGTEST_EXECUTABLE_MAC || ''),
            examType: 'drugtest',
            displayName: 'Drug Test',
        });
    }

    config.devices = devices;
    return config;
}

/**
 * Validate configuration and report issues
 */
export function validateConfig(config: BridgeConfig): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (config.port < 1 || config.port > 65535) {
        errors.push(`Invalid port: ${config.port}`);
    }

    if (!config.callbackUrl) {
        warnings.push('No callback URL configured — results will be logged but not sent to webapp');
    }

    if (!config.apiKey) {
        warnings.push('No API key configured — callbacks will be sent without authentication');
    }

    if (config.devices.length === 0) {
        warnings.push('No devices enabled — bridge will start but cannot process exams');
    }

    for (const device of config.devices) {
        if (device.executable && !existsSync(device.executable)) {
            warnings.push(`${device.displayName}: executable not found at ${device.executable}`);
        }

        if (device.gdtId.length > 8) {
            errors.push(`${device.displayName}: GDT ID '${device.gdtId}' exceeds 8 characters`);
        }

        const pdfDir = device.pdfOutputDir || device.gdtOutputDir;
        if (pdfDir && !existsSync(pdfDir)) {
            warnings.push(`${device.displayName}: PDF output directory not found at ${pdfDir}`);
        }
    }

    return {
        valid: errors.length === 0,
        warnings,
        errors,
    };
}

/**
 * Get device config by exam type
 */
export function getDeviceForExam(config: BridgeConfig, examType: string): DeviceConfig | undefined {
    return config.devices.find(d => d.examType === examType && d.enabled);
}

export default { loadConfig, validateConfig, getDeviceForExam, clearSavedConfig };
