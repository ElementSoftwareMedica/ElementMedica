/**
 * Test di integrazione per il login con remember_me
 */

import request from 'supertest';
import { createTestApp } from './helpers/test-app.js';
import { prisma, createTestCompany, createTestUser, cleanupTestDataSafe } from './setup.js';

describe('Auth Login remember_me flow', () => {
  let app;
  let testCompany;
  let testUser;

  beforeAll(async () => {
    app = await createTestApp();
    testCompany = await createTestCompany();

    // Crea un utente dedicato a questo file di test per evitare collisioni
    const ts = Date.now();
    testUser = await createTestUser(testCompany.id, {
      email: `rememberme_${ts}@example.com`,
      username: `rememberme_${ts}`,
      firstName: 'Remember',
      lastName: 'Me'
    });
  });

  afterAll(async () => {
    // Pulisci solo i dati creati da questo file
    if (testUser && testCompany) {
      await prisma.refreshToken.deleteMany({ where: { personId: testUser.id } });
      await cleanupTestDataSafe(testCompany.id, [testUser.id]);
    }
  });

  test('login default (remember_me=false) => access 1h, refresh ~7d', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: testUser.email,
        password: 'Admin123!'
      })
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.tokens).toBeDefined();

    const { access_token, refresh_token, expires_in } = res.body.tokens;
    expect(typeof access_token).toBe('string');
    expect(typeof refresh_token).toBe('string');

    // expires_in in secondi: 1h = 3600
    expect(expires_in).toBe(60 * 60);

    // Verifica persistenza refresh token con scadenza ~7 giorni
    const stored = await prisma.refreshToken.findFirst({ where: { token: refresh_token } });
    expect(stored).toBeTruthy();
    expect(stored.personId).toBe(testUser.id);

    const msLeft = new Date(stored.expiresAt).getTime() - Date.now();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);

    // Tolleranza ampia per runtime CI: tra 6 e 8 giorni
    expect(daysLeft).toBeGreaterThan(6);
    expect(daysLeft).toBeLessThan(8);
  });

  test('login remember_me=true => access 7d, refresh ~30d', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: testUser.email,
        password: 'Admin123!',
        remember_me: true
      })
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.tokens).toBeDefined();

    const { access_token, refresh_token, expires_in } = res.body.tokens;
    expect(typeof access_token).toBe('string');
    expect(typeof refresh_token).toBe('string');

    // expires_in in secondi: 7d = 604800
    expect(expires_in).toBe(7 * 24 * 60 * 60);

    // Verifica persistenza refresh token con scadenza ~30 giorni
    const stored = await prisma.refreshToken.findFirst({ where: { token: refresh_token } });
    expect(stored).toBeTruthy();
    expect(stored.personId).toBe(testUser.id);

    const msLeft = new Date(stored.expiresAt).getTime() - Date.now();
    const daysLeft = msLeft / (1000 * 60 * 60 * 24);

    // Tolleranza ampia: tra 28 e 32 giorni
    expect(daysLeft).toBeGreaterThan(28);
    expect(daysLeft).toBeLessThan(32);
  });
});