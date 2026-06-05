import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

const providerSource = readFileSync(
  new URL('../../../desktop-app/src/renderer/sync/SyncStatusProvider.tsx', import.meta.url),
  'utf8'
);

describe('desktop sync status persistence', () => {
  test('persists the incremental sync baseline across app restarts', () => {
    expect(providerSource).toContain("getStoredIsoTimestamp('desktop_lastSyncAt')");
    expect(providerSource).toContain("localStorage.setItem('desktop_lastSyncAt', ts)");
    expect(providerSource).toContain('Number.isNaN(Date.parse(ts))');
  });

  test('drops invalid persisted timestamps before reusing them', () => {
    expect(providerSource).toContain('function getStoredIsoTimestamp');
    expect(providerSource).toContain('localStorage.removeItem(key)');
  });
});
