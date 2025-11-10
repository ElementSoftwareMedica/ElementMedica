/**
 * Unit Tests - Codici Sconto Service
 * 
 * Test completo business logic codici sconto:
 * - Validazione applicabilità
 * - Calcolo sconti
 * - Gestione limiti utilizzo
 * - Ricerca codici applicabili
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import codiciScontoService from '../../services/codici-sconto-service.js';
import prisma from '../../config/prisma-optimization.js';

describe('Codici Sconto Service - Calcolo Sconti', () => {
  
  test('calculateDiscount() - sconto percentuale', () => {
    const codice = {
      tipoSconto: 'PERCENTUALE',
      valore: 20
    };
    
    const sconto = codiciScontoService.calculateDiscount(codice, 1000);
    expect(sconto).toBe(200);
  });
  
  test('calculateDiscount() - sconto percentuale con decimali', () => {
    const codice = {
      tipoSconto: 'PERCENTUALE',
      valore: 15.5
    };
    
    const sconto = codiciScontoService.calculateDiscount(codice, 1000);
    expect(sconto).toBe(155);
  });
  
  test('calculateDiscount() - sconto valore assoluto', () => {
    const codice = {
      tipoSconto: 'VALORE_ASSOLUTO',
      valore: 150
    };
    
    const sconto = codiciScontoService.calculateDiscount(codice, 1000);
    expect(sconto).toBe(150);
  });
  
  test('calculateDiscount() - valore assoluto non supera prezzo base', () => {
    const codice = {
      tipoSconto: 'VALORE_ASSOLUTO',
      valore: 1500
    };
    
    const sconto = codiciScontoService.calculateDiscount(codice, 1000);
    expect(sconto).toBe(1000); // Non può scontare più del prezzo
  });
  
  test('calculateDiscount() - percentuale 100%', () => {
    const codice = {
      tipoSconto: 'PERCENTUALE',
      valore: 100
    };
    
    const sconto = codiciScontoService.calculateDiscount(codice, 1000);
    expect(sconto).toBe(1000);
  });
  
  test('calculateDiscount() - prezzo base zero', () => {
    const codice = {
      tipoSconto: 'PERCENTUALE',
      valore: 20
    };
    
    const sconto = codiciScontoService.calculateDiscount(codice, 0);
    expect(sconto).toBe(0);
  });
});

describe('Codici Sconto Service - Validazione Applicabilità', () => {
  let testTenantId;
  let testCodiceId;
  let testAziendaId;
  let testPersonaId;
  
  beforeAll(async () => {
    // Usa tenant esistente
    const tenant = await prisma.tenant.findFirst();
    testTenantId = tenant.id;
    
    const azienda = await prisma.company.findFirst();
    testAziendaId = azienda.id;
    
    const persona = await prisma.person.findFirst();
    testPersonaId = persona.id;
    
    // Crea codice di test con nome univoco
    const codice = await prisma.codiceSconto.create({
      data: {
        codice: `TEST${Date.now()}`,
        nome: 'Test Discount',
        descrizione: 'Test description',
        tipoSconto: 'PERCENTUALE',
        valore: 20,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2025-12-31'),
        attivo: true,
        utilizzoMassimo: 10,
        utilizzoCorrente: 0,
        cumulabile: true,
        minImporto: 100,
        maxImporto: 5000,
        applicabileA: 'TUTTI',
        applicabileServizi: ['CORSO', 'DVR'],
        tipoCorso: 'TUTTI',
        tenantId: testTenantId,
        createdBy: testPersonaId // Fix: add required createdBy field
      }
    });
    testCodiceId = codice.id;
  });
  
  afterAll(async () => {
    // Cleanup
    if (testCodiceId) {
      await prisma.codiceSconto.delete({ where: { id: testCodiceId } });
    }
    await prisma.$disconnect();
  });
  
  test('validateCodeApplicability() - codice valido con tutti i criteri soddisfatti', async () => {
    const codice = await prisma.codiceSconto.findUnique({ where: { id: testCodiceId } });
    
    const result = await codiciScontoService.validateCodeApplicability(
      codice.codice,
      testTenantId,
      {
        prezzoBase: 1000,
        tipoServizio: 'CORSO',
        clienteId: testAziendaId,
        clienteType: 'azienda'
      }
    );
    
    expect(result.valid).toBe(true);
    expect(result.codice).toBeDefined();
    expect(result.errors).toBeNull();
  });
  
  test('validateCodeApplicability() - codice non trovato', async () => {
    const result = await codiciScontoService.validateCodeApplicability(
      'NONEXISTENT',
      testTenantId,
      {
        prezzoBase: 1000,
        tipoServizio: 'CORSO',
        clienteId: testAziendaId,
        clienteType: 'azienda'
      }
    );
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Codice sconto non trovato');
  });
  
  test('validateCodeApplicability() - prezzo sotto minimo', async () => {
    const codice = await prisma.codiceSconto.findUnique({ where: { id: testCodiceId } });
    
    const result = await codiciScontoService.validateCodeApplicability(
      codice.codice,
      testTenantId,
      {
        prezzoBase: 50, // minImporto è 100
        tipoServizio: 'CORSO',
        clienteId: testAziendaId,
        clienteType: 'azienda'
      }
    );
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Importo minimo'))).toBe(true);
  });
  
  test('validateCodeApplicability() - prezzo sopra massimo', async () => {
    const codice = await prisma.codiceSconto.findUnique({ where: { id: testCodiceId } });
    
    const result = await codiciScontoService.validateCodeApplicability(
      codice.codice,
      testTenantId,
      {
        prezzoBase: 6000, // maxImporto è 5000
        tipoServizio: 'CORSO',
        clienteId: testAziendaId,
        clienteType: 'azienda'
      }
    );
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Importo massimo'))).toBe(true);
  });
  
  test('validateCodeApplicability() - servizio non applicabile', async () => {
    const codice = await prisma.codiceSconto.findUnique({ where: { id: testCodiceId } });
    
    const result = await codiciScontoService.validateCodeApplicability(
      codice.codice,
      testTenantId,
      {
        prezzoBase: 1000,
        tipoServizio: 'PRIVACY', // Non in applicabileServizi
        clienteId: testAziendaId,
        clienteType: 'azienda'
      }
    );
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('non applicabile al servizio'))).toBe(true);
  });
});

describe('Codici Sconto Service - Gestione Limiti', () => {
  let testTenantId;
  let testCodiceId;
  
  beforeAll(async () => {
    const tenant = await prisma.tenant.findFirst();
    testTenantId = tenant.id;
    
    const persona = await prisma.person.findFirst({ where: { tenantId: testTenantId } });
    
    const codice = await prisma.codiceSconto.create({
      data: {
        codice: `LIMIT${Date.now()}`,
        nome: 'Limited Discount',
        descrizione: 'Test',
        tipoSconto: 'PERCENTUALE',
        valore: 15,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2025-12-31'),
        attivo: true,
        utilizzoMassimo: 10,
        utilizzoCorrente: 5,
        utilizzoPerUtente: 2,
        cumulabile: true,
        applicabileA: 'TUTTI',
        applicabileServizi: [],
        tipoCorso: 'TUTTI',
        tenantId: testTenantId,
        createdBy: persona.id // Fix: add required createdBy field
      }
    });
    testCodiceId = codice.id;
  });
  
  afterAll(async () => {
    if (testCodiceId) {
      await prisma.codiceSconto.delete({ where: { id: testCodiceId } });
    }
  });
  
  test('checkCodeLimits() - verifica limiti globali', async () => {
    const limits = await codiciScontoService.checkCodeLimits(testCodiceId);
    
    expect(limits.globalLimit.hasLimit).toBe(true);
    expect(limits.globalLimit.current).toBe(5);
    expect(limits.globalLimit.max).toBe(10);
    expect(limits.globalLimit.reached).toBe(false);
    expect(limits.globalLimit.remaining).toBe(5);
    expect(limits.canUse).toBe(true);
  });
  
  test('checkCodeLimits() - verifica limiti per utente', async () => {
    const azienda = await prisma.company.findFirst();
    const limits = await codiciScontoService.checkCodeLimits(
      testCodiceId,
      azienda.id,
      'azienda'
    );
    
    expect(limits.userLimit.hasLimit).toBe(true);
    expect(limits.userLimit.max).toBe(2);
  });
  
  test('incrementCodeUsage() - incrementa contatore', async () => {
    const before = await prisma.codiceSconto.findUnique({
      where: { id: testCodiceId },
      select: { utilizzoCorrente: true }
    });
    
    await codiciScontoService.incrementCodeUsage(testCodiceId);
    
    const after = await prisma.codiceSconto.findUnique({
      where: { id: testCodiceId },
      select: { utilizzoCorrente: true }
    });
    
    expect(after.utilizzoCorrente).toBe(before.utilizzoCorrente + 1);
  });
  
  test('decrementCodeUsage() - decrementa contatore', async () => {
    const before = await prisma.codiceSconto.findUnique({
      where: { id: testCodiceId },
      select: { utilizzoCorrente: true }
    });
    
    await codiciScontoService.decrementCodeUsage(testCodiceId);
    
    const after = await prisma.codiceSconto.findUnique({
      where: { id: testCodiceId },
      select: { utilizzoCorrente: true }
    });
    
    expect(after.utilizzoCorrente).toBe(before.utilizzoCorrente - 1);
  });
  
  test('decrementCodeUsage() - non va sotto zero', async () => {
    // Porta a zero
    await prisma.codiceSconto.update({
      where: { id: testCodiceId },
      data: { utilizzoCorrente: 0 }
    });
    
    await codiciScontoService.decrementCodeUsage(testCodiceId);
    
    const after = await prisma.codiceSconto.findUnique({
      where: { id: testCodiceId },
      select: { utilizzoCorrente: true }
    });
    
    expect(after.utilizzoCorrente).toBe(0);
  });
});

describe('Codici Sconto Service - Snapshot Pattern', () => {
  
  test('createCodeSnapshot() - crea snapshot completo', () => {
    const codice = {
      id: 'test-uuid-123',
      codice: 'SNAPSHOT2024',
      nome: 'Test Snapshot Code',
      descrizione: 'Test snapshot description',
      tipoSconto: 'PERCENTUALE',
      valore: 25
    };
    
    const snapshot = codiciScontoService.createCodeSnapshot(codice);
    
    expect(snapshot.codiceId).toBe('test-uuid-123');
    expect(snapshot.codiceTesto).toBe('SNAPSHOT2024');
    expect(snapshot.nomeCodice).toBe('Test Snapshot Code');
    expect(snapshot.descrizioneCodice).toBe('Test snapshot description');
    expect(snapshot.tipoSconto).toBe('PERCENTUALE');
    expect(snapshot.valoreScontoCodice).toBe(25);
  });
  
  test('createCodeSnapshot() - converte valore a number', () => {
    const codice = {
      id: 'test-uuid',
      codice: 'TEST',
      nome: 'Test',
      descrizione: 'Test',
      tipoSconto: 'PERCENTUALE',
      valore: '15.50' // String
    };
    
    const snapshot = codiciScontoService.createCodeSnapshot(codice);
    expect(typeof snapshot.valoreScontoCodice).toBe('number');
    expect(snapshot.valoreScontoCodice).toBe(15.50);
  });
});

describe('Codici Sconto Service - Cumulabilità', () => {
  
  test('canStackCodes() - tutti cumulabili', () => {
    const codici = [
      { cumulabile: true },
      { cumulabile: true },
      { cumulabile: true }
    ];
    
    const result = codiciScontoService.canStackCodes(codici);
    expect(result).toBe(true);
  });
  
  test('canStackCodes() - uno non cumulabile', () => {
    const codici = [
      { cumulabile: true },
      { cumulabile: false },
      { cumulabile: true }
    ];
    
    const result = codiciScontoService.canStackCodes(codici);
    expect(result).toBe(false);
  });
  
  test('canStackCodes() - array vuoto', () => {
    const result = codiciScontoService.canStackCodes([]);
    expect(result).toBe(true); // Nessun codice = tutti cumulabili
  });
  
  test('canStackCodes() - singolo codice cumulabile', () => {
    const result = codiciScontoService.canStackCodes([{ cumulabile: true }]);
    expect(result).toBe(true);
  });
  
  test('canStackCodes() - singolo codice non cumulabile', () => {
    const result = codiciScontoService.canStackCodes([{ cumulabile: false }]);
    expect(result).toBe(false);
  });
});

describe('Codici Sconto Service - Ricerca Codici Applicabili', () => {
  let testTenantId;
  let testAziendaId;
  let testCorsoId;
  let createdCodiciIds = [];
  
  beforeAll(async () => {
    const tenant = await prisma.tenant.findFirst();
    testTenantId = tenant.id;
    
    const azienda = await prisma.company.findFirst();
    testAziendaId = azienda.id;
    
    const corso = await prisma.course.findFirst();
    testCorsoId = corso?.id;
    
    const persona = await prisma.person.findFirst({ where: { tenantId: testTenantId } });
    
    // Crea diversi codici per test ricerca con nomi univoci
    const timestamp = Date.now();
    const codici = await prisma.codiceSconto.createMany({
      data: [
        {
          codice: `ACTIVE${timestamp}`,
          nome: 'Active Code',
          descrizione: 'Test',
          tipoSconto: 'PERCENTUALE',
          valore: 20,
          dataInizio: new Date('2024-01-01'),
          dataFine: new Date('2025-12-31'),
          attivo: true,
          utilizzoMassimo: null,
          utilizzoCorrente: 0,
          cumulabile: true,
          applicabileA: 'TUTTI',
          applicabileServizi: [],
          tipoCorso: 'TUTTI',
          tenantId: testTenantId,
          createdBy: persona.id // Fix: add required createdBy field
        },
        {
          codice: `EXPIRED${timestamp}`,
          nome: 'Expired Code',
          descrizione: 'Test',
          tipoSconto: 'PERCENTUALE',
          valore: 30,
          dataInizio: new Date('2023-01-01'),
          dataFine: new Date('2023-12-31'),
          attivo: true,
          utilizzoMassimo: null,
          utilizzoCorrente: 0,
          cumulabile: true,
          applicabileA: 'TUTTI',
          applicabileServizi: [],
          tipoCorso: 'TUTTI',
          tenantId: testTenantId,
          createdBy: persona.id // Fix: add required createdBy field
        },
        {
          codice: `DISABLED${timestamp}`,
          nome: 'Disabled Code',
          descrizione: 'Test',
          tipoSconto: 'PERCENTUALE',
          valore: 25,
          dataInizio: new Date('2024-01-01'),
          dataFine: new Date('2025-12-31'),
          attivo: false, // Disattivo
          utilizzoMassimo: null,
          utilizzoCorrente: 0,
          cumulabile: true,
          applicabileA: 'TUTTI',
          applicabileServizi: [],
          tipoCorso: 'TUTTI',
          tenantId: testTenantId,
          createdBy: persona.id // Fix: add required createdBy field
        }
      ]
    });
    
    // Trova gli ID dei codici creati per cleanup
    const codiciCreati = await prisma.codiceSconto.findMany({
      where: {
        codice: {
          in: [`ACTIVE${timestamp}`, `EXPIRED${timestamp}`, `DISABLED${timestamp}`]
        }
      },
      select: { id: true }
    });
    createdCodiciIds = codiciCreati.map(c => c.id);
  });
  
  afterAll(async () => {
    if (createdCodiciIds.length > 0) {
      await prisma.codiceSconto.deleteMany({
        where: { id: { in: createdCodiciIds } }
      });
    }
  });
  
  test('getApplicableCodes() - trova solo codici attivi e validi', async () => {
    const codici = await codiciScontoService.getApplicableCodes(testTenantId, {
      clienteId: testAziendaId,
      clienteType: 'azienda',
      tipoServizio: 'CORSO'
    });
    
    // Deve trovare almeno il codice ACTIVE (non expired, non disabled)
    // Potrebbero esserci anche altri codici dal seed o da altri test
    const activeCode = codici.find(c => c.codice.startsWith('ACTIVE'));
    expect(activeCode).toBeDefined();
    
    // Non deve trovare expired o disabled
    const expiredCode = codici.find(c => c.codice.startsWith('EXPIRED'));
    const disabledCode = codici.find(c => c.codice.startsWith('DISABLED'));
    expect(expiredCode).toBeUndefined();
    expect(disabledCode).toBeUndefined();
  });
  
  test('getApplicableCodes() - filtra per prezzo base', async () => {
    // Crea codice con min/max importo con nome univoco
    const timestamp = Date.now();
    const persona = await prisma.person.findFirst({ where: { tenantId: testTenantId } });
    const newCodice = await prisma.codiceSconto.create({
      data: {
        codice: `PRICE${timestamp}`,
        nome: 'Price Limited',
        descrizione: 'Test',
        tipoSconto: 'PERCENTUALE',
        valore: 10,
        dataInizio: new Date('2024-01-01'),
        dataFine: new Date('2025-12-31'),
        attivo: true,
        minImporto: 100,
        maxImporto: 1000,
        utilizzoMassimo: null,
        utilizzoCorrente: 0,
        cumulabile: true,
        applicabileA: 'TUTTI',
        applicabileServizi: [],
        tipoCorso: 'TUTTI',
        tenantId: testTenantId,
        createdBy: persona.id // Fix: add required createdBy field
      }
    });
    createdCodiciIds.push(newCodice.id);
    
    const codiciValid = await codiciScontoService.getApplicableCodes(testTenantId, {
      clienteId: testAziendaId,
      clienteType: 'azienda',
      tipoServizio: 'CORSO',
      prezzoBase: 500 // Dentro range
    });
    
    expect(codiciValid.some(c => c.codice === `PRICE${timestamp}`)).toBe(true);
    
    const codiciInvalid = await codiciScontoService.getApplicableCodes(testTenantId, {
      clienteId: testAziendaId,
      clienteType: 'azienda',
      tipoServizio: 'CORSO',
      prezzoBase: 50 // Sotto minImporto
    });
    
    expect(codiciInvalid.some(c => c.codice === `PRICE${timestamp}`)).toBe(false);
  });
});
