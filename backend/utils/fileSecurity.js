import fs from 'fs';
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const TRUE_VALUES = new Set(['1', 'true', 'yes']);

export function computeSha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function computeSha256File(filePath) {
  return computeSha256Buffer(fs.readFileSync(filePath));
}

export async function scanFileForMalware(filePath) {
  const rawCommand = process.env.CLAMAV_SCAN_COMMAND || process.env.FILE_SCAN_COMMAND || '';
  if (!rawCommand.trim()) {
    const allowUnscanned = TRUE_VALUES.has(String(process.env.ALLOW_UNSCANNED_UPLOADS || '').toLowerCase());
    if (process.env.NODE_ENV === 'production' && !allowUnscanned) {
      const configError = new Error('Scanner malware non configurato');
      configError.code = 'MALWARE_SCAN_NOT_CONFIGURED';
      configError.details = { status: 'NOT_CONFIGURED' };
      throw configError;
    }
    return { scanned: false, status: 'NOT_CONFIGURED' };
  }

  const parts = rawCommand.split(/\s+/).filter(Boolean);
  const command = parts.shift();
  if (!command) {
    return { scanned: false, status: 'NOT_CONFIGURED' };
  }

  try {
    await execFileAsync(command, [...parts, filePath], { timeout: 30_000 });
    return { scanned: true, status: 'CLEAN' };
  } catch (error) {
    const scanError = new Error('File rifiutato dalla scansione sicurezza');
    scanError.code = 'MALWARE_SCAN_FAILED';
    scanError.details = {
      status: 'BLOCKED',
      exitCode: error.code,
      signal: error.signal
    };
    throw scanError;
  }
}

export async function assertUploadedFileIsSafe(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    const error = new Error('File upload non trovato per scansione sicurezza');
    error.code = 'UPLOAD_FILE_NOT_FOUND';
    throw error;
  }
  const sha256 = computeSha256File(filePath);
  const scan = await scanFileForMalware(filePath);
  return { sha256, scan };
}
