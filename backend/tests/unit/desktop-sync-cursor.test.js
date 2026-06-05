import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

const syncEngineSource = readFileSync(
  new URL('../../../desktop-app/src/renderer/sync/SyncEngine.ts', import.meta.url),
  'utf8'
);
const dashboardSource = readFileSync(
  new URL('../../../desktop-app/src/renderer/pages/DashboardPage.tsx', import.meta.url),
  'utf8'
);
const desktopLayoutSource = readFileSync(
  new URL('../../../desktop-app/src/renderer/components/DesktopLayout.tsx', import.meta.url),
  'utf8'
);

describe('desktop incremental sync cursor', () => {
  test('incremental downloads return the server cursor to callbacks', () => {
    expect(syncEngineSource).toContain('getPayloadSyncCursor');
    expect(syncEngineSource).toContain('callbacks.onComplete(0, syncCursor)');
    expect(syncEngineSource).toContain('callbacks.onComplete(totalRecords, syncCursor)');
  });

  test('manual full database download persists the server cursor', () => {
    expect(dashboardSource).toContain('const syncCursor = getPayloadSyncCursor(data) || new Date().toISOString()');
    expect(dashboardSource).toContain('setLastDownloadAt(syncCursor)');
    expect(dashboardSource).not.toContain("setLastDownloadAt(now) // Attiva l'auto-sync incrementale dal server");
  });

  test('automatic download stores the cursor supplied by the server', () => {
    expect(desktopLayoutSource).toContain('onComplete: (recordCount: number, syncCursor?: string)');
    expect(desktopLayoutSource).toContain('const cursor = syncCursor || new Date().toISOString()');
    expect(desktopLayoutSource).toContain('setLastDownloadAt(cursor)');
  });
});
