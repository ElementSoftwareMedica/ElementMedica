import { describe, expect, test, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  assertUploadedFileIsSafe,
  computeSha256Buffer,
  computeSha256File
} from '../../utils/fileSecurity.js';

describe('fileSecurity', () => {
  const oldScanCommand = process.env.CLAMAV_SCAN_COMMAND;

  afterEach(() => {
    if (oldScanCommand === undefined) {
      delete process.env.CLAMAV_SCAN_COMMAND;
    } else {
      process.env.CLAMAV_SCAN_COMMAND = oldScanCommand;
    }
    delete process.env.FILE_SCAN_COMMAND;
  });

  test('calcola hash SHA-256 coerente per buffer e file', () => {
    const content = Buffer.from('elementmedica-security-test', 'utf8');
    const tmp = path.join(os.tmpdir(), `file-security-${Date.now()}.txt`);
    fs.writeFileSync(tmp, content);

    try {
      expect(computeSha256File(tmp)).toBe(computeSha256Buffer(content));
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  test('non blocca upload quando scanner malware non configurato', async () => {
    delete process.env.CLAMAV_SCAN_COMMAND;
    delete process.env.FILE_SCAN_COMMAND;
    const tmp = path.join(os.tmpdir(), `file-security-${Date.now()}.pdf`);
    fs.writeFileSync(tmp, Buffer.from('%PDF-1.4\n'));

    try {
      const result = await assertUploadedFileIsSafe(tmp);
      expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result.scan).toEqual({ scanned: false, status: 'NOT_CONFIGURED' });
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  test('blocca upload quando lo scanner configurato fallisce', async () => {
    process.env.CLAMAV_SCAN_COMMAND = 'node -e process.exit(1)';
    const tmp = path.join(os.tmpdir(), `file-security-${Date.now()}.pdf`);
    fs.writeFileSync(tmp, Buffer.from('%PDF-1.4\n'));

    try {
      await expect(assertUploadedFileIsSafe(tmp)).rejects.toMatchObject({
        code: 'MALWARE_SCAN_FAILED'
      });
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
