/**
 * Logger for Medical Device Bridge
 * Uses Winston for structured logging
 * 
 * @module utils/logger
 */

import winston from 'winston';
import { mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { platform } from 'os';
import { bootstrapLog } from './bootstrapLogger.js';

function resolveLogDir(): string {
    if (process.env.LOG_DIR && process.env.LOG_DIR.trim()) {
        return resolve(process.env.LOG_DIR);
    }

    if (platform() === 'win32' && process.env.LOCALAPPDATA && process.env.LOCALAPPDATA.trim()) {
        return join(process.env.LOCALAPPDATA, 'ElementMedica', 'MedicalDeviceBridge', 'logs');
    }

    if (process.env.TEMP && process.env.TEMP.trim()) {
        return join(process.env.TEMP, 'ElementMedica', 'MedicalDeviceBridge', 'logs');
    }

    return resolve('./logs');
}

function ensureLogDirectory(logDir: string): boolean {
    try {
        if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
        }
        return true;
    } catch (error) {
        bootstrapLog('ERROR', 'Unable to create log directory, switching to console-only logging', {
            logDir,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
}

const logDir = resolveLogDir();
const hasWritableLogDir = ensureLogDirectory(logDir);

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
            })
        ),
    }),
];

if (hasWritableLogDir) {
    transports.push(
        new winston.transports.File({
            filename: resolve(logDir, 'bridge.log'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: resolve(logDir, 'bridge-error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024,
            maxFiles: 3,
        })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'medical-device-bridge' },
    transports,
});

if (hasWritableLogDir) {
    bootstrapLog('INFO', 'File logging initialized', { logDir });
} else {
    bootstrapLog('WARN', 'Running with console-only logger because no writable log directory was found');
}

export default logger;
