/**
 * Test di integrazione per API Codici Sconto
 * 
 * Test completi delle route REST per la gestione dei codici sconto:
 * - GET /api/codici-sconto (list con filtri)
 * - GET /api/codici-sconto/:id (dettaglio)
 * - POST /api/codici-sconto (creazione)
 * - PUT /api/codici-sconto/:id (aggiornamento)
 * - DELETE /api/codici-sconto/:id (soft delete)
 * 
 * @group integration
 */

import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';
import { prisma, createTestCompany, createTestUser, cleanupTestDataSafe } from '../setup.js';

describe('Codici Sconto API Integration Tests', () => {
  let app;
  let testCompany;
  let testUser;
  let authToken;
  let tenantId;
  let createdCodiciIds = [];

  beforeAll(async () => {
    app = await createTestApp();
    testCompany = await createTestCompany();
    tenantId = testCompany.tenantId;

    // Crea utente di test
    const ts = Date.now();
    testUser = await createTestUser(testCompany.id, {
      email: `codici_${ts}@example.com`,
      username: `codici_${ts}`,
      firstName: 'Codici',
      lastName: 'Test'
    });

    // Aggiungi permessi per codici sconto (nuovi permessi enum)
    const adminRole = await prisma.personRole.findFirst({
      where: { personId: testUser.id, roleType: 'ADMIN' }
    });

    if (adminRole) {
      const permissions = [
        'VIEW_CODICI_SCONTO',
        'CREATE_CODICI_SCONTO',
        'EDIT_CODICI_SCONTO',
        'DELETE_CODICI_SCONTO',
        'MANAGE_CODICI_SCONTO'
      ];
      
      for (const perm of permissions) {
        const existing = await prisma.rolePermission.findFirst({
          where: { personRoleId: adminRole.id, permission: perm }
        });
        
        if (!existing) {
          await prisma.rolePermission.create({
            data: { permission: perm, personRoleId: adminRole.id }
          });
        }
      }
    }

    // Login per ottenere token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: testUser.email,
        password: 'Admin123!'
      });
    
    authToken = loginRes.body.tokens.access_token;
  });

  afterAll(async () => {
    // Cleanup codici creati (filter out undefined)
    const validIds = createdCodiciIds.filter(id => id != null);
    if (validIds.length > 0) {
      await prisma.codiceSconto.deleteMany({
        where: { id: { in: validIds } }
      });
    }

    // Cleanup utente e company
    if (testUser && testCompany) {
      await cleanupTestDataSafe(testCompany.id, [testUser.id]);
    }
  });

  describe('POST /api/codici-sconto - Create', () => {
    test('should create codice sconto with valid data', async () => {
      const newCodice = {
        codice: `TEST${Date.now()}`,
        nome: 'Sconto Test',
        descrizione: 'Codice di test per integration test',
        tipoSconto: 'PERCENTUALE',
        valore: 10.5,
        dataInizio: new Date().toISOString(),
        dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        attivo: true,
        applicabileA: 'TUTTI',
        cumulabile: true,
        createdBy: testUser.id
      };

      const res = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newCodice)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.codice).toBe(newCodice.codice);
      expect(res.body.data.nome).toBe(newCodice.nome);
      expect(res.body.data.tipoSconto).toBe(newCodice.tipoSconto);
      expect(parseFloat(res.body.data.valore)).toBe(newCodice.valore);

      createdCodiciIds.push(res.body.data.id);
    });

    test('should fail with missing required fields', async () => {
      const invalidCodice = {
        codice: `INVALID${Date.now()}`,
        nome: 'Sconto Invalido'
        // Missing: tipoSconto, valore, dataInizio, dataFine, createdBy
      };

      await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidCodice)
        .expect(400);
    });

    test('should fail with duplicate codice', async () => {
      const codice = `DUPLICATE${Date.now()}`;
      
      // Crea primo codice
      const first = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice,
          nome: 'First',
          descrizione: 'First code',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        })
        .expect(201);

      createdCodiciIds.push(first.body.id);

      // Tenta di creare duplicato
      await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice, // Stesso codice
          nome: 'Duplicate',
          descrizione: 'Duplicate code',
          tipoSconto: 'VALORE_ASSOLUTO',
          valore: 50,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        })
        .expect(409); // Conflict
    });

    test('should fail with invalid tipoSconto', async () => {
      await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: `INVALID${Date.now()}`,
          nome: 'Invalid Type',
          tipoSconto: 'INVALID_TYPE', // Invalid enum
          valore: 10,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        })
        .expect(400);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .post('/api/codici-sconto')
        .send({
          codice: `NOAUTH${Date.now()}`,
          nome: 'No Auth',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        })
        .expect(401);
    });
  });

  describe('GET /api/codici-sconto - List', () => {
    let activeCodiceId;
    let inactiveCodiceId;

    beforeAll(async () => {
      // Crea codice attivo
      const activeRes = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: `ACTIVE${Date.now()}`,
          nome: 'Active Code',
          tipoSconto: 'PERCENTUALE',
          valore: 15,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        });
      
      activeCodiceId = activeRes.body.data.id;
      createdCodiciIds.push(activeCodiceId);

      // Crea codice inattivo
      const inactiveRes = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: `INACTIVE${Date.now()}`,
          nome: 'Inactive Code',
          tipoSconto: 'VALORE_ASSOLUTO',
          valore: 50,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: false,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        });
      
      inactiveCodiceId = inactiveRes.body.data.id;
      createdCodiciIds.push(inactiveCodiceId);
    });

    test('should list all codici sconto', async () => {
      const res = await request(app)
        .get('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verifica struttura
      const codice = res.body.data.find(c => c.id === activeCodiceId);
      expect(codice).toBeDefined();
      expect(codice).toHaveProperty('codice');
      expect(codice).toHaveProperty('nome');
      expect(codice).toHaveProperty('tipoSconto');
      expect(codice).toHaveProperty('valore');
    });

    test('should filter by attivo=true', async () => {
      const res = await request(app)
        .get('/api/codici-sconto?attivo=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Verifica che ci sia il codice attivo
      const active = res.body.data.find(c => c.id === activeCodiceId);
      expect(active).toBeDefined();
      
      // Verifica che NON ci sia il codice inattivo
      const inactive = res.body.data.find(c => c.id === inactiveCodiceId);
      expect(inactive).toBeUndefined();
    });

    test('should filter by tipoSconto', async () => {
      const res = await request(app)
        .get('/api/codici-sconto?tipoSconto=PERCENTUALE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Tutti i risultati devono essere PERCENTUALE
      const allPercentuale = res.body.data.every(c => c.tipoSconto === 'PERCENTUALE');
      expect(allPercentuale).toBe(true);
    });

    test('should search by codice', async () => {
      const searchTerm = 'ACTIVE';
      const res = await request(app)
        .get(`/api/codici-sconto?search=${searchTerm}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Deve contenere il codice con ACTIVE nel nome
      const found = res.body.data.some(c => c.codice.includes(searchTerm));
      expect(found).toBe(true);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .get('/api/codici-sconto')
        .expect(401);
    });
  });

  describe('GET /api/codici-sconto/:id - Get Single', () => {
    let testCodiceId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: `DETAIL${Date.now()}`,
          nome: 'Detail Test',
          descrizione: 'Test get detail',
          tipoSconto: 'PERCENTUALE',
          valore: 20,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        });
      
      testCodiceId = res.body.data.id;
      createdCodiciIds.push(testCodiceId);
    });

    test('should get single codice sconto by id', async () => {
      const res = await request(app)
        .get(`/api/codici-sconto/${testCodiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id', testCodiceId);
      expect(res.body.data).toHaveProperty('codice');
      expect(res.body.data).toHaveProperty('nome');
      expect(res.body.data).toHaveProperty('descrizione');
      expect(res.body.data).toHaveProperty('tipoSconto');
      expect(res.body.data).toHaveProperty('valore');
      expect(res.body.data).toHaveProperty('dataInizio');
      expect(res.body.data).toHaveProperty('dataFine');
      expect(res.body.data).toHaveProperty('attivo');
      expect(res.body.data).toHaveProperty('stats'); // Include stats
    });

    test('should return 404 for non-existent id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/codici-sconto/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .get(`/api/codici-sconto/${testCodiceId}`)
        .expect(401);
    });
  });

  describe('PUT /api/codici-sconto/:id - Update', () => {
    let updateCodiceId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: `UPDATE${Date.now()}`,
          nome: 'Before Update',
          descrizione: 'Will be updated',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        });
      
      updateCodiceId = res.body.data.id;
      createdCodiciIds.push(updateCodiceId);
    });

    test('should update codice sconto', async () => {
      const updates = {
        nome: 'After Update',
        descrizione: 'Has been updated',
        valore: 25,
        attivo: false
      };

      const res = await request(app)
        .put(`/api/codici-sconto/${updateCodiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.nome).toBe(updates.nome);
      expect(res.body.data.descrizione).toBe(updates.descrizione);
      expect(parseFloat(res.body.data.valore)).toBe(updates.valore);
      expect(res.body.data.attivo).toBe(updates.attivo);
    });

    test('should fail updating non-existent codice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/codici-sconto/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ nome: 'Should Fail' })
        .expect(404);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .put(`/api/codici-sconto/${updateCodiceId}`)
        .send({ nome: 'No Auth' })
        .expect(401);
    });
  });

  describe('DELETE /api/codici-sconto/:id - Soft Delete', () => {
    let deleteCodiceId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: `DELETE${Date.now()}`,
          nome: 'To Be Deleted',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: true,
          createdBy: testUser.id
        });
      
      deleteCodiceId = res.body.data.id;
      createdCodiciIds.push(deleteCodiceId);
    });

    test('should soft delete codice sconto', async () => {
      await request(app)
        .delete(`/api/codici-sconto/${deleteCodiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verifica soft delete
      const deleted = await prisma.codiceSconto.findUnique({
        where: { id: deleteCodiceId }
      });

      expect(deleted).toBeDefined();
      expect(deleted.deletedAt).not.toBeNull();
    });

    test('should return 404 for non-existent codice', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .delete(`/api/codici-sconto/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .delete(`/api/codici-sconto/${deleteCodiceId}`)
        .expect(401);
    });
  });
});
