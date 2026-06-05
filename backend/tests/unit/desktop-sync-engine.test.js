import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

const syncEngineSource = readFileSync(
  new URL('../../../desktop-app/src/renderer/sync/SyncEngine.ts', import.meta.url),
  'utf8'
);

describe('desktop SyncEngine queue hygiene', () => {
  test('does not duplicate the entityType mapping in upload payloads', () => {
    expect(syncEngineSource).not.toMatch(
      /entityType:\s*ENTITY_MAP\[op\.entity\],\s*entityType:\s*ENTITY_MAP\[op\.entity\]/
    );
  });

  test('marks unsupported or retry-exhausted pending operations as failed', () => {
    expect(syncEngineSource).toContain('getRejectedOperationReason');
    expect(syncEngineSource).toContain('retryCount >= MAX_RETRIES');
    expect(syncEngineSource).toContain("status: 'FAILED'");
    expect(syncEngineSource).toContain('Tipo operazione sync non supportata');
    expect(syncEngineSource).toContain('Retry massimo raggiunto');
  });

  test('keeps server rejected results with diagnostics in the local queue', () => {
    expect(syncEngineSource).toContain("conflictData: effectiveResult.status !== 'success'");
    expect(syncEngineSource).toContain("status: 'rejected'");
  });
});
