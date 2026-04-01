import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { platform } from 'os';

function resolveBootstrapLogDir(): string | null {
    try {
        if (process.env.BOOTSTRAP_LOG_DIR && process.env.BOOTSTRAP_LOG_DIR.trim()) {
            return resolve(process.env.BOOTSTRAP_LOG_DIR);
        }

        if (platform() === 'win32' && process.env.LOCALAPPDATA && process.env.LOCALAPPDATA.trim()) {
            return join(process.env.LOCALAPPDATA, 'ElementMedica', 'MedicalDeviceBridge', 'logs');
        }

        if (process.env.TEMP && process.env.TEMP.trim()) {
            return join(process.env.TEMP, 'ElementMedica', 'MedicalDeviceBridge', 'logs');
        }

        return resolve('./logs');
    } catch {
        return null;
    }
}

function ensureDirectory(dir: string): boolean {
    try {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        return true;
    } catch {
        return false;
    }
}

const bootstrapLogDir = resolveBootstrapLogDir();
const bootstrapLogFile = bootstrapLogDir ? join(bootstrapLogDir, 'bridge-bootstrap.log') : null;

if (bootstrapLogDir) {
    ensureDirectory(bootstrapLogDir);
}

export function bootstrapLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, details?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const detailsPart = details ? ` ${JSON.stringify(details)}` : '';
    const line = `[${timestamp}] [${level}] ${message}${detailsPart}`;

    if (bootstrapLogFile) {
        try {
            appendFileSync(bootstrapLogFile, `${line}\n`, 'utf8');
        } catch {
            // Ignore write errors: console fallback is still available.
        }
    }

    if (level === 'ERROR') {
        console.error(line);
    } else {
        console.log(line);
    }
}

export function getBootstrapLogFilePath(): string | null {
    return bootstrapLogFile;
}
