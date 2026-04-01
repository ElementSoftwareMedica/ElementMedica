/**
 * Unit Tests - Preventivi Service
 * 
 * Test completo business logic preventivi:
 * - Calcoli finanziari (IVA, sconti, totali)
 * - Validazione transizioni stato
 * - Generazione numeri preventivo
 * - Applicazione/rimozione sconti
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import preventiviService from '../../services/preventivi-service.js';
import prisma from '../../config/prisma-optimization.js';

describe('Preventivi Service - Calcoli Finanziari', () => {

  test('calculatePreventivoTotals() - calcolo base senza sconti', () => {
    const result = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 1000,
      scontoTotale: 0,
      aliquotaIva: 22
    });

    expect(result.prezzoTotale).toBe(1000);
    expect(result.scontoTotale).toBe(0);
    expect(result.imponibile).toBe(1000);
    expect(result.aliquotaIva).toBe(22);
    expect(result.importoIva).toBe(220);
    expect(result.importoFinale).toBe(1220);
    expect(result.risparmioPercentuale).toBe(0);
  });

  test('calculatePreventivoTotals() - calcolo con sconto singolo', () => {
    const result = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 1000,
      sconti: [200],
      aliquotaIva: 22
    });

    expect(result.imponibile).toBe(800);
    expect(result.importoIva).toBe(176);
    expect(result.importoFinale).toBe(976);
    expect(result.risparmioPercentuale).toBe(20);
  });

  test('calculatePreventivoTotals() - calcolo con sconti multipli', () => {
    const result = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 1500,
      sconti: [200, 100, 50],
      aliquotaIva: 22
    });

    expect(result.scontoTotale).toBe(350);
    expect(result.imponibile).toBe(1150);
    expect(result.importoIva).toBe(253);
    expect(result.importoFinale).toBe(1403);
  });

  test('calculatePreventivoTotals() - IVA ridotta 10%', () => {
    const result = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 1000,
      scontoTotale: 0,
      aliquotaIva: 10
    });

    expect(result.importoIva).toBe(100);
    expect(result.importoFinale).toBe(1100);
  });

  test('calculatePreventivoTotals() - IVA minima 4%', () => {
    const result = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 1000,
      scontoTotale: 0,
      aliquotaIva: 4
    });

    expect(result.importoIva).toBe(40);
    expect(result.importoFinale).toBe(1040);
  });

  test('calculatePreventivoTotals() - sconto maggiore del prezzo (edge case)', () => {
    const result = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 100,
      sconti: [150],
      aliquotaIva: 22
    });

    // Imponibile non può essere negativo
    expect(result.imponibile).toBe(0);
    expect(result.importoIva).toBe(0);
    expect(result.importoFinale).toBe(0);
  });

  test('calculatePreventivoTotals() - auto-detect IVA da tipoServizio', () => {
    const resultCorso = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 1000,
      scontoTotale: 0,
      tipoServizio: 'CORSO'
    });
    expect(resultCorso.aliquotaIva).toBe(22);

    const resultMedico = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 1000,
      scontoTotale: 0,
      tipoServizio: 'MEDICO_COMPETENTE'
    });
    expect(resultMedico.aliquotaIva).toBe(10);
  });

  test('calculatePreventivoTotals() - precisione decimale', () => {
    const result = preventiviService.calculatePreventivoTotals({
      prezzoTotale: 123.45,
      sconti: [23.45],
      aliquotaIva: 22
    });

    expect(result.imponibile).toBe(100);
    expect(result.importoIva).toBe(22);
    expect(result.importoFinale).toBe(122);
  });
});

describe('Preventivi Service - Calcolo IVA', () => {

  test('calculateIva() - IVA ordinaria 22%', () => {
    const iva = preventiviService.calculateIva(1000, 22);
    expect(iva).toBe(220);
  });

  test('calculateIva() - IVA ridotta 10%', () => {
    const iva = preventiviService.calculateIva(1000, 10);
    expect(iva).toBe(100);
  });

  test('calculateIva() - IVA minima 4%', () => {
    const iva = preventiviService.calculateIva(1000, 4);
    expect(iva).toBe(40);
  });

  test('calculateIva() - imponibile zero', () => {
    const iva = preventiviService.calculateIva(0, 22);
    expect(iva).toBe(0);
  });

  test('determineIvaRate() - tutti i tipi servizio', () => {
    expect(preventiviService.determineIvaRate('CORSO')).toBe(22);
    expect(preventiviService.determineIvaRate('DVR')).toBe(22);
    expect(preventiviService.determineIvaRate('RSPP')).toBe(22);
    expect(preventiviService.determineIvaRate('MEDICO_COMPETENTE')).toBe(10);
    expect(preventiviService.determineIvaRate('PRIVACY')).toBe(22);
    expect(preventiviService.determineIvaRate('ALTRO')).toBe(22);
  });

  test('determineIvaRate() - tipo non riconosciuto usa default', () => {
    expect(preventiviService.determineIvaRate('UNKNOWN')).toBe(22);
  });
});

describe('Preventivi Service - Validazione Transizioni Stato', () => {

  test('validateStateTransition() - transizioni valide da BOZZA', () => {
    const toInviato = preventiviService.validateStateTransition('BOZZA', 'INVIATO');
    expect(toInviato.valid).toBe(true);

    const toArchiviato = preventiviService.validateStateTransition('BOZZA', 'ARCHIVIATO');
    expect(toArchiviato.valid).toBe(true);
  });

  test('validateStateTransition() - transizioni invalide da BOZZA', () => {
    const toVisualizzato = preventiviService.validateStateTransition('BOZZA', 'VISUALIZZATO');
    expect(toVisualizzato.valid).toBe(false);
    expect(toVisualizzato.error).toContain('Transizione non valida');

    const toFatturato = preventiviService.validateStateTransition('BOZZA', 'FATTURATO');
    expect(toFatturato.valid).toBe(false);
  });

  test('validateStateTransition() - workflow completo', () => {
    const steps = [
      ['BOZZA', 'INVIATO'],
      ['INVIATO', 'VISUALIZZATO'],
      ['VISUALIZZATO', 'ACCETTATO'],
      ['ACCETTATO', 'FATTURATO']
    ];

    steps.forEach(([from, to]) => {
      const result = preventiviService.validateStateTransition(from, to);
      expect(result.valid).toBe(true);
    });
  });

  test('validateStateTransition() - stati finali non hanno transizioni', () => {
    const fromFatturato = preventiviService.validateStateTransition('FATTURATO', 'ACCETTATO');
    expect(fromFatturato.valid).toBe(false);

    const fromAnnullato = preventiviService.validateStateTransition('ANNULLATO', 'BOZZA');
    expect(fromAnnullato.valid).toBe(false);

    const fromArchiviato = preventiviService.validateStateTransition('ARCHIVIATO', 'INVIATO');
    expect(fromArchiviato.valid).toBe(false);
  });

  test('validateStateTransition() - ritorna allowedTransitions', () => {
    const result = preventiviService.validateStateTransition('INVIATO', 'FATTURATO');
    expect(result.valid).toBe(false);
    expect(result.allowedTransitions).toBeDefined();
    expect(result.allowedTransitions).toContain('VISUALIZZATO');
    expect(result.allowedTransitions).toContain('ACCETTATO');
    expect(result.allowedTransitions).toContain('RIFIUTATO');
  });
});

describe('Preventivi Service - Generazione Numero Preventivo', () => {
  let testTenantId;
  let createdPreventiviIds = [];

  beforeAll(async () => {
    // Usa tenant esistente invece di crearne uno nuovo
    const tenant = await prisma.tenant.findFirst();
    testTenantId = tenant.id;
  });

  afterAll(async () => {
    // Cleanup solo preventivi creati nei test
    if (createdPreventiviIds.length > 0) {
      await prisma.preventivo.deleteMany({
        where: { id: { in: createdPreventiviIds } }
      });
    }
    await prisma.$disconnect();
  });

  test('generateNumeroPreventivo() - primo preventivo anno corrente', async () => {
    const anno = new Date().getFullYear();
    const numero = await preventiviService.generateNumeroPreventivo(testTenantId);

    // Il numero dipende da quanti preventivi esistono già, quindi verifica solo il formato
    expect(numero).toMatch(new RegExp(`^PREV-${anno}-\\d{4}$`));
  });

  test('generateNumeroPreventivo() - sequenza incrementale', async () => {
    const anno = new Date().getFullYear();
    const azienda = await prisma.company.findFirst();

    // P63: Person.tenantId RIMOSSO - trovare la persona tramite PersonTenantProfile
    const profile = await prisma.personTenantProfile.findFirst({
      where: { tenantId: testTenantId, deletedAt: null },
      include: { person: true }
    });
    const persona = profile?.person;
    const prev = await prisma.preventivo.create({
      data: {
        numero: `PREV-${anno}-9990`,
        numeroProgressivo: 9990, // Fix: add required numeroProgressivo field
        annoProgressivo: anno,
        tipoServizio: 'CORSO',
        tipoPrezzo: 'PER_PERSONA', // Fix: add required tipoPrezzo field
        clienteType: 'AZIENDA', // Fix: add required clienteType field
        titoloServizio: 'Test',
        descrizioneServizio: 'Test',
        quantita: 1,
        prezzoUnitario: 100, // Fix: add required prezzoUnitario field
        prezzoTotale: 100,
        scontoTotale: 0,
        imponibile: 100,
        aliquotaIva: 22,
        importoIva: 22,
        importoFinale: 122,
        dataEmissione: new Date(),
        dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Fix: add required dataScadenza field
        stato: 'BOZZA',
        aziendaId: azienda.id,
        tenantId: testTenantId,
        generatedBy: persona.id // Fix: add required generatedBy field
      }
    });
    createdPreventiviIds.push(prev.id);

    const numero = await preventiviService.generateNumeroPreventivo(testTenantId);
    expect(numero).toBe(`PREV-${anno}-9991`);
  });

  test('generateNumeroPreventivo() - anno specifico', async () => {
    const numero = await preventiviService.generateNumeroPreventivo(testTenantId, 2026);
    expect(numero).toBe('PREV-2026-0001');
  });

  test('generateNumeroPreventivo() - formato con padding', async () => {
    const numero = await preventiviService.generateNumeroPreventivo(testTenantId);
    // Verifica formato PREV-YYYY-NNNN con 4 cifre
    expect(numero).toMatch(/^PREV-\d{4}-\d{4}$/);
  });
});

describe('Preventivi Service - Applicazione Sconti (mock)', () => {
  // Questi test richiedono setup completo DB, facciamo test logica base

  test('applyDiscount() - verifica che richieda preventivo esistente', async () => {
    await expect(
      preventiviService.applyDiscount('invalid-id', 'codice-id')
    ).rejects.toThrow();
  });
});

describe('Preventivi Service - Statistiche', () => {

  test('getPreventivoStats() - verifica che richieda preventivo esistente', async () => {
    await expect(
      preventiviService.getPreventivoStats('invalid-id')
    ).rejects.toThrow();
  });
});

describe('Preventivi Service - Costanti', () => {

  test('IVA_RATES_BY_SERVICE - contiene tutti i tipi servizio', () => {
    const rates = preventiviService.IVA_RATES_BY_SERVICE;

    expect(rates.CORSO).toBe(22);
    expect(rates.DVR).toBe(22);
    expect(rates.RSPP).toBe(22);
    expect(rates.MEDICO_COMPETENTE).toBe(10);
    expect(rates.PRIVACY).toBe(22);
    expect(rates.ALTRO).toBe(22);
  });

  test('STATO_TRANSITIONS - contiene tutti gli stati', () => {
    const transitions = preventiviService.STATO_TRANSITIONS;

    expect(transitions.BOZZA).toBeDefined();
    expect(transitions.INVIATO).toBeDefined();
    expect(transitions.VISUALIZZATO).toBeDefined();
    expect(transitions.ACCETTATO).toBeDefined();
    expect(transitions.RIFIUTATO).toBeDefined();
    expect(transitions.FATTURATO).toBeDefined();
    expect(transitions.ANNULLATO).toBeDefined();
    expect(transitions.ARCHIVIATO).toBeDefined();
  });

  test('STATO_TRANSITIONS - stati finali non hanno transizioni', () => {
    const transitions = preventiviService.STATO_TRANSITIONS;

    expect(transitions.FATTURATO).toEqual([]);
    expect(transitions.ANNULLATO).toEqual([]);
    expect(transitions.ARCHIVIATO).toEqual([]);
  });
});
