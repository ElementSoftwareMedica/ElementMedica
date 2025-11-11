/**
 * @file Unit Tests - Validation Layer (Phase 7.2)
 * 
 * Tests to verify validation schemas work correctly after removing:
 * - PreventivoPartecipanteSchema
 * - CreatePreventivoPartecipanteSchema  
 * - UpdatePreventivoPartecipanteSchema
 * 
 * Ensures:
 * - ✅ Preventivo schemas still export correctly
 * - ✅ No references to removed schemas
 * - ✅ Validation still works for Preventivo
 */

import { describe, test, expect } from '@jest/globals';
import billingValidations from '../../validations/modules/billing.js';

describe('Phase 7.2 - Validation Layer Tests', () => {
  
  describe('Removed Schemas - Verification', () => {
    test('should NOT have PreventivoPartecipante schema', () => {
      expect(billingValidations.PreventivoPartecipanteSchema).toBeUndefined();
    });

    test('should NOT have CreatePreventivoPartecipante schema', () => {
      expect(billingValidations.CreatePreventivoPartecipanteSchema).toBeUndefined();
    });

    test('should NOT have UpdatePreventivoPartecipante schema', () => {
      expect(billingValidations.UpdatePreventivoPartecipanteSchema).toBeUndefined();
    });
  });

  describe('Existing Preventivo Schemas - Still Working', () => {
    test('should have PreventivoSchema', () => {
      expect(billingValidations.PreventivoSchema).toBeDefined();
    });

    test('should have CreatePreventivoSchema', () => {
      expect(billingValidations.CreatePreventivoSchema).toBeDefined();
    });

    test('should have UpdatePreventivoSchema', () => {
      expect(billingValidations.UpdatePreventivoSchema).toBeDefined();
    });

    test('PreventivoSchema should validate correctly with aziendaId', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        numero: 'PREV-2025-0001',
        annoProgressivo: 2025,
        numeroProgressivo: 1,
        tipoServizio: 'CORSO',
        tipoPrezzo: 'PER_PERSONA',
        clienteType: 'AZIENDA',
        aziendaId: '123e4567-e89b-12d3-a456-426614174000',
        titoloServizio: 'Test Corso',
        quantita: 10,
        prezzoUnitario: 100.00,
        prezzoTotale: 1000.00,
        scontoTotale: 0,
        imponibile: 1000.00,
        aliquotaIva: 22.00,
        importoIva: 220.00,
        importoFinale: 1220.00,
        dataEmissione: new Date().toISOString(),
        dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stato: 'BOZZA',
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        generatedBy: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = billingValidations.PreventivoSchema.safeParse(validData);
      if (!result.success) {
        console.error('Validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });

    test('PreventivoSchema should validate correctly with personaId', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        numero: 'PREV-2025-0002',
        annoProgressivo: 2025,
        numeroProgressivo: 2,
        tipoServizio: 'MEDICO_COMPETENTE',
        tipoPrezzo: 'PER_UNITA',
        clienteType: 'PERSONA',
        personaId: '123e4567-e89b-12d3-a456-426614174000',
        titoloServizio: 'Test Medico',
        quantita: 1,
        prezzoUnitario: 300.00,
        prezzoTotale: 300.00,
        scontoTotale: 0,
        imponibile: 300.00,
        aliquotaIva: 10.00,
        importoIva: 30.00,
        importoFinale: 330.00,
        dataEmissione: new Date().toISOString(),
        dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        stato: 'BOZZA',
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        generatedBy: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = billingValidations.PreventivoSchema.safeParse(validData);
      if (!result.success) {
        console.error('Validation errors:', result.error.issues);
      }
      expect(result.success).toBe(true);
    });
  });

  describe('Billing Module - Complete Export', () => {
    test('should export Preventivo schemas', () => {
      expect(billingValidations.PreventivoSchema).toBeDefined();
      expect(billingValidations.CreatePreventivoSchema).toBeDefined();
      expect(billingValidations.UpdatePreventivoSchema).toBeDefined();
    });

    test('should export Fattura schemas', () => {
      expect(billingValidations.FatturaSchema).toBeDefined();
      expect(billingValidations.CreateFatturaSchema).toBeDefined();
      expect(billingValidations.UpdateFatturaSchema).toBeDefined();
    });

    test('should NOT export removed schemas', () => {
      const exports = Object.keys(billingValidations.default || billingValidations);
      
      expect(exports).not.toContain('PreventivoPartecipanteSchema');
      expect(exports).not.toContain('CreatePreventivoPartecipanteSchema');
      expect(exports).not.toContain('UpdatePreventivoPartecipanteSchema');
      expect(exports).not.toContain('PreventivoAziendaSchema');
    });
  });
});
