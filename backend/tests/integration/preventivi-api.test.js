/**
 * @file Integration Tests - Preventivi API
 * 
 * Test completi per le API di gestione preventivi:
 * - POST /api/preventivi - Creazione con auto-numero e validazioni
 * - GET /api/preventivi - Lista con filtri (stato, data, search, pagination)
 * - GET /api/preventivi/:id - Dettagli con sconti applicati
 * - PUT /api/preventivi/:id - Aggiornamento con ricalcoli
 * - DELETE /api/preventivi/:id - Soft delete con check dipendenze
 * - POST /api/preventivi/:id/sconti - Applica codice sconto
 * - DELETE /api/preventivi/:id/sconti/:scontoId - Rimuovi sconto
 * - GET /api/preventivi/:id/pdf - Genera PDF
 * - PUT /api/preventivi/:id/stato - Transizioni workflow
 */

import request from 'supertest';
import { createTestApp } from '../helpers/test-app.js';
import { prisma, createTestCompany, createTestUser, cleanupTestDataSafe } from '../setup.js';

describe('Preventivi API Integration Tests', () => {
  let app;
  let testCompany;
  let testUser;
  let authToken;
  let tenantId;
  let createdPreventiviIds = [];
  let createdCodiciIds = [];

  beforeAll(async () => {
    // Setup test app
    app = await createTestApp();

    // Create test company
    testCompany = await createTestCompany({
      ragioneSociale: `Preventivi Test Company ${Date.now()}`
    });
    
    tenantId = testCompany.tenantId;

    // Create test user with ADMIN role
    const ts = Date.now();
    testUser = await createTestUser(testCompany.id, {
      email: `preventivi_${ts}@example.com`,
      username: `preventivi_${ts}`,
      firstName: 'Preventivi',
      lastName: 'Test'
    });

    // Assign all preventivi permissions
    const adminRole = await prisma.personRole.findFirst({
      where: {
        personId: testUser.id,
        roleType: 'ADMIN'
      }
    });

    if (adminRole) {
      const permissions = [
        'VIEW_PREVENTIVI',
        'CREATE_PREVENTIVI',
        'EDIT_PREVENTIVI',
        'DELETE_PREVENTIVI',
        'MANAGE_PREVENTIVI',
        'GENERATE_PREVENTIVI_PDF',
        'SEND_PREVENTIVI'
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

    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: testUser.email,
        password: 'Admin123!'
      })
      .expect(200);

    authToken = loginRes.body.tokens.access_token;
  });

  afterAll(async () => {
    // Cleanup created preventivi
    const validPrevIds = createdPreventiviIds.filter(id => id != null);
    if (validPrevIds.length > 0) {
      await prisma.preventivo.deleteMany({
        where: { id: { in: validPrevIds } }
      });
    }

    // Cleanup created codici sconto
    const validCodIds = createdCodiciIds.filter(id => id != null);
    if (validCodIds.length > 0) {
      await prisma.codiceSconto.deleteMany({
        where: { id: { in: validCodIds } }
      });
    }

    // Cleanup test data
    if (testUser && testCompany) {
      await cleanupTestDataSafe(testCompany.id, [testUser.id]);
    }
    
    // Close connections
    await prisma.$disconnect();
  });

  describe('POST /api/preventivi - Create', () => {
    test('should create preventivo with valid data and auto-numero', async () => {
      const newPreventivo = {
        aziendaId: testCompany.id,
        titoloServizio: 'Corso Sicurezza Base',
        descrizioneServizio: 'Formazione obbligatoria',
        tipoServizio: 'CORSO',
        dataEmissione: new Date().toISOString(),
        dataValidita: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stato: 'BOZZA',
        prezzoTotale: 1500.00,
        aliquotaIva: 22,
        note: 'Test integration preventivo'
      };

      const res = await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPreventivo)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('numero');
      expect(res.body.data.numero).toMatch(/^PREV-\d{4}-\d{4}$/);
      expect(res.body.data.titoloServizio).toBe(newPreventivo.titoloServizio);
      expect(res.body.data.stato).toBe('BOZZA');

      createdPreventiviIds.push(res.body.data.id);
    });

    test('should fail with missing required fields', async () => {
      await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          titoloServizio: 'Incomplete Preventivo'
          // Missing: aziendaId, tipoServizio, importoBase, etc.
        })
        .expect(400);
    });

    test('should fail with invalid importo values', async () => {
      await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aziendaId: testCompany.id,
          titoloServizio: 'Invalid Importo',
          tipoServizio: 'CORSO',
          importoBase: -100, // Invalid negative
          importoFinale: 0
        })
        .expect(400);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .post('/api/preventivi')
        .send({
          titoloServizio: 'No Auth'
        })
        .expect(401);
    });
  });

  describe('GET /api/preventivi - List', () => {
    let bozzaId;
    let inviatoId;

    beforeAll(async () => {
      // Create BOZZA preventivo
      const bozzaRes = await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aziendaId: testCompany.id,
          titoloServizio: 'Preventivo Bozza',
          tipoServizio: 'CORSO',
          dataEmissione: new Date().toISOString(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stato: 'BOZZA',
          importoBase: 1000,
          importoIVA: 220,
          importoFinale: 1220
        });
      
      bozzaId = bozzaRes.body.data.id;
      createdPreventiviIds.push(bozzaId);

      // Create INVIATO preventivo
      const inviatoRes = await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aziendaId: testCompany.id,
          titoloServizio: 'Preventivo Inviato',
          tipoServizio: 'DVR',
          dataEmissione: new Date().toISOString(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stato: 'INVIATO',
          importoBase: 2000,
          importoIVA: 440,
          importoFinale: 2440
        });
      
      inviatoId = inviatoRes.body.data.id;
      createdPreventiviIds.push(inviatoId);
    });

    test('should list all preventivi', async () => {
      const res = await request(app)
        .get('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Verify structure
      const preventivo = res.body.data.find(p => p.id === bozzaId);
      expect(preventivo).toBeDefined();
      expect(preventivo).toHaveProperty('numero');
      expect(preventivo).toHaveProperty('titoloServizio');
      expect(preventivo).toHaveProperty('stato');
      expect(preventivo).toHaveProperty('importoFinale');
    });

    test('should filter by stato', async () => {
      const res = await request(app)
        .get('/api/preventivi?stato=BOZZA')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // All results should be BOZZA
      const allBozza = res.body.data.every(p => p.stato === 'BOZZA');
      expect(allBozza).toBe(true);
      
      // Should include bozzaId
      const hasBozza = res.body.data.some(p => p.id === bozzaId);
      expect(hasBozza).toBe(true);
    });

    test('should filter by tipoServizio', async () => {
      const res = await request(app)
        .get('/api/preventivi?tipoServizio=CORSO')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // All results should be CORSO
      const allCorso = res.body.data.every(p => p.tipoServizio === 'CORSO');
      expect(allCorso).toBe(true);
    });

    test('should search by titolo', async () => {
      const searchTerm = 'Bozza';
      const res = await request(app)
        .get(`/api/preventivi?search=${searchTerm}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      
      // Should contain preventivo with search term
      const found = res.body.data.some(p => 
        p.titoloServizio.includes(searchTerm) || 
        p.numero.includes(searchTerm)
      );
      expect(found).toBe(true);
    });

    test('should paginate results', async () => {
      const res = await request(app)
        .get('/api/preventivi?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('page', 1);
      expect(res.body.pagination).toHaveProperty('limit', 5);
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .get('/api/preventivi')
        .expect(401);
    });
  });

  describe('GET /api/preventivi/:id - Get Single', () => {
    let testPreventivoId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aziendaId: testCompany.id,
          titoloServizio: 'Preventivo Detail Test',
          descrizioneServizio: 'Test get detail',
          tipoServizio: 'CORSO',
          dataEmissione: new Date().toISOString(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stato: 'BOZZA',
          importoBase: 1500,
          importoIVA: 330,
          importoFinale: 1830
        });
      
      testPreventivoId = res.body.data.id;
      createdPreventiviIds.push(testPreventivoId);
    });

    test('should get single preventivo by id with full details', async () => {
      const res = await request(app)
        .get(`/api/preventivi/${testPreventivoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id', testPreventivoId);
      expect(res.body.data).toHaveProperty('numero');
      expect(res.body.data).toHaveProperty('titoloServizio');
      expect(res.body.data).toHaveProperty('stato');
      expect(res.body.data).toHaveProperty('importoBase');
      expect(res.body.data).toHaveProperty('importoFinale');
      expect(res.body.data).toHaveProperty('azienda'); // Include relation
      expect(res.body.data).toHaveProperty('sconti'); // Include sconti array
    });

    test('should return 404 for non-existent id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/preventivi/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .get(`/api/preventivi/${testPreventivoId}`)
        .expect(401);
    });
  });

  describe('PUT /api/preventivi/:id - Update', () => {
    let updatePreventivoId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aziendaId: testCompany.id,
          titoloServizio: 'Before Update',
          tipoServizio: 'CORSO',
          dataEmissione: new Date().toISOString(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stato: 'BOZZA',
          importoBase: 1000,
          importoIVA: 220,
          importoFinale: 1220
        });
      
      updatePreventivoId = res.body.data.id;
      createdPreventiviIds.push(updatePreventivoId);
    });

    test('should update preventivo with recalculation', async () => {
      const updates = {
        titoloServizio: 'After Update',
        importoBase: 2000,
        importoIVA: 440,
        importoFinale: 2440
      };

      const res = await request(app)
        .put(`/api/preventivi/${updatePreventivoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.titoloServizio).toBe(updates.titoloServizio);
      expect(parseFloat(res.body.data.importoBase)).toBe(updates.importoBase);
      expect(parseFloat(res.body.data.importoFinale)).toBe(updates.importoFinale);
    });

    test('should fail updating non-existent preventivo', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/preventivi/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ titoloServizio: 'Should Fail' })
        .expect(404);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .put(`/api/preventivi/${updatePreventivoId}`)
        .send({ titoloServizio: 'No Auth' })
        .expect(401);
    });
  });

  describe('DELETE /api/preventivi/:id - Soft Delete', () => {
    let deletePreventivoId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aziendaId: testCompany.id,
          titoloServizio: 'To Be Deleted',
          tipoServizio: 'CORSO',
          dataEmissione: new Date().toISOString(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stato: 'BOZZA',
          importoBase: 1000,
          importoIVA: 220,
          importoFinale: 1220
        });
      
      deletePreventivoId = res.body.data.id;
      createdPreventiviIds.push(deletePreventivoId);
    });

    test('should soft delete preventivo', async () => {
      await request(app)
        .delete(`/api/preventivi/${deletePreventivoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify soft delete
      const deleted = await prisma.preventivo.findUnique({
        where: { id: deletePreventivoId }
      });

      expect(deleted).toBeDefined();
      expect(deleted.deletedAt).not.toBeNull();
    });

    test('should return 404 for non-existent preventivo', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .delete(`/api/preventivi/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .delete(`/api/preventivi/${deletePreventivoId}`)
        .expect(401);
    });
  });

  describe('POST /api/preventivi/:id/sconti - Apply Discount', () => {
    let preventivoConScontoId;
    let codiceId;

    beforeAll(async () => {
      // Create preventivo
      const prevRes = await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aziendaId: testCompany.id,
          titoloServizio: 'Preventivo per Sconto',
          tipoServizio: 'CORSO',
          dataEmissione: new Date().toISOString(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stato: 'BOZZA',
          importoBase: 1000,
          importoIVA: 220,
          importoFinale: 1220
        });
      
      preventivoConScontoId = prevRes.body.data.id;
      createdPreventiviIds.push(preventivoConScontoId);

      // Create active codice sconto
      const codiceRes = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: `DISCOUNT${Date.now()}`,
          nome: 'Test Discount',
          descrizione: 'Test discount code',
          tipoSconto: 'PERCENTUALE',
          valore: 10,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: false,
          createdBy: testUser.id
        });
      
      codiceId = codiceRes.body.data.id;
      createdCodiciIds.push(codiceId);
    });

    test('should apply discount code to preventivo', async () => {
      const res = await request(app)
        .post(`/api/preventivi/${preventivoConScontoId}/sconti`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ codiceId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.codiceId).toBe(codiceId);
      expect(res.body.data).toHaveProperty('importoScontato');
      
      // Verify preventivo totals recalculated
      const prevRes = await request(app)
        .get(`/api/preventivi/${preventivoConScontoId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(prevRes.body.data.sconti.length).toBe(1);
      expect(parseFloat(prevRes.body.data.importoFinale)).toBeLessThan(1220);
    });

    test('should fail with invalid codice', async () => {
      const fakeCodeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .post(`/api/preventivi/${preventivoConScontoId}/sconti`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ codiceId: fakeCodeId })
        .expect(404);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .post(`/api/preventivi/${preventivoConScontoId}/sconti`)
        .send({ codiceId })
        .expect(401);
    });
  });

  describe('DELETE /api/preventivi/:id/sconti/:scontoId - Remove Discount', () => {
    let preventivoId;
    let scontoId;

    beforeAll(async () => {
      // Create preventivo
      const prevRes = await request(app)
        .post('/api/preventivi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aziendaId: testCompany.id,
          titoloServizio: 'Preventivo Remove Sconto',
          tipoServizio: 'CORSO',
          dataEmissione: new Date().toISOString(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          stato: 'BOZZA',
          importoBase: 1000,
          importoIVA: 220,
          importoFinale: 1220
        });
      
      preventivoId = prevRes.body.data.id;
      createdPreventiviIds.push(preventivoId);

      // Create and apply codice sconto
      const codiceRes = await request(app)
        .post('/api/codici-sconto')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          codice: `REMOVE${Date.now()}`,
          nome: 'To Remove',
          tipoSconto: 'PERCENTUALE',
          valore: 15,
          dataInizio: new Date().toISOString(),
          dataFine: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          attivo: true,
          applicabileA: 'TUTTI',
          cumulabile: false,
          createdBy: testUser.id
        });
      
      const codiceId = codiceRes.body.data.id;
      createdCodiciIds.push(codiceId);

      // Apply sconto
      const scontoRes = await request(app)
        .post(`/api/preventivi/${preventivoId}/sconti`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ codiceId });
      
      scontoId = scontoRes.body.data.id;
    });

    test('should remove discount from preventivo', async () => {
      await request(app)
        .delete(`/api/preventivi/${preventivoId}/sconti/${scontoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify sconto removed
      const prevRes = await request(app)
        .get(`/api/preventivi/${preventivoId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(prevRes.body.data.sconti.length).toBe(0);
      expect(parseFloat(prevRes.body.data.importoFinale)).toBe(1220); // Back to original
    });

    test('should return 404 for non-existent sconto', async () => {
      const fakeScontoId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .delete(`/api/preventivi/${preventivoId}/sconti/${fakeScontoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should fail without authentication', async () => {
      await request(app)
        .delete(`/api/preventivi/${preventivoId}/sconti/${scontoId}`)
        .expect(401);
    });
  });
});
