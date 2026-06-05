import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

const apiServerSource = readFileSync(new URL('../../servers/api-server.js', import.meta.url), 'utf8');
const desktopSyncRoutesSource = readFileSync(new URL('../../routes/desktop-sync-routes.js', import.meta.url), 'utf8');
const desktopLicensesRoutesSource = readFileSync(new URL('../../routes/desktop-licenses.routes.js', import.meta.url), 'utf8');
const clinicalDocumentsRoutesSource = readFileSync(new URL('../../routes/clinica/documenti-clinici.routes.js', import.meta.url), 'utf8');

describe('desktop API route registration', () => {
  test('mounts desktop sync and license routers under /api/v1', () => {
    expect(apiServerSource).toContain("v1Router.use('/desktop-sync', desktopSyncRoutes)");
    expect(apiServerSource).toContain("v1Router.use('/desktop-licenses', desktopLicensesRoutes)");
  });

  test('keeps desktop sync attachment upload endpoint registered', () => {
    expect(desktopSyncRoutesSource).toContain("router.post('/upload-attachment'");
    expect(desktopSyncRoutesSource).toContain('desktopSyncController.uploadAttachment');
  });

  test('keeps desktop license heartbeat endpoint registered', () => {
    expect(desktopLicensesRoutesSource).toContain("router.post('/heartbeat'");
  });

  test('keeps clinical visit document fallback upload endpoint registered', () => {
    expect(clinicalDocumentsRoutesSource).toContain("router.post('/visita/upload'");
  });
});
