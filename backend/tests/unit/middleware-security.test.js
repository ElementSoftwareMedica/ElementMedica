/**
 * @file Unit Tests - Middleware Security (Phase 7.2)
 * 
 * Tests to verify tenant-security middleware still works correctly after removing:
 * - PreventivoPartecipante from TENANT_REQUIRED_MODELS
 * 
 * Note: TENANT_REQUIRED_MODELS is not exported, so we test via file content inspection
 */

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Phase 7.2 - Middleware Security Tests', () => {
  let middlewareContent;

  beforeAll(() => {
    // Read middleware file content
    const middlewarePath = join(__dirname, '../../middleware/tenant-security.js');
    middlewareContent = readFileSync(middlewarePath, 'utf-8');
  });

  describe('Removed Models - Verification', () => {
    test('should NOT contain PreventivoPartecipante in TENANT_REQUIRED_MODELS', () => {
      // Extract TENANT_REQUIRED_MODELS array from file
      const match = middlewareContent.match(/const TENANT_REQUIRED_MODELS = \[([\s\S]*?)\]/);
      expect(match).toBeTruthy();
      
      const modelsArray = match[1];
      expect(modelsArray).not.toContain('PreventivoPartecipante');
    });

    test('should NOT contain PreventivoAzienda in TENANT_REQUIRED_MODELS', () => {
      const match = middlewareContent.match(/const TENANT_REQUIRED_MODELS = \[([\s\S]*?)\]/);
      expect(match).toBeTruthy();
      
      const modelsArray = match[1];
      expect(modelsArray).not.toContain('PreventivoAzienda');
    });

    test('should still contain Preventivo in TENANT_REQUIRED_MODELS', () => {
      const match = middlewareContent.match(/const TENANT_REQUIRED_MODELS = \[([\s\S]*?)\]/);
      expect(match).toBeTruthy();
      
      const modelsArray = match[1];
      expect(modelsArray).toContain('Preventivo');
    });
  });

  describe('Phase 7.2 Cleanup Verification', () => {
    test('✅ middleware file reflects Phase 7.2 changes', () => {
      // Verify that:
      // 1. Preventivo is still present
      expect(middlewareContent).toContain("'Preventivo'");
      
      // 2. Removed models are not present
      expect(middlewareContent).not.toContain("'PreventivoPartecipante'");
      expect(middlewareContent).not.toContain("'PreventivoAzienda'");
    });

    test('✅ file has valid TENANT_REQUIRED_MODELS array', () => {
      // Check that TENANT_REQUIRED_MODELS is defined
      expect(middlewareContent).toContain('const TENANT_REQUIRED_MODELS = [');
      
      // Check that it has valid structure
      const match = middlewareContent.match(/const TENANT_REQUIRED_MODELS = \[([\s\S]*?)\]/);
      expect(match).toBeTruthy();
      expect(match[1].length).toBeGreaterThan(0);
    });
  });

  describe('Other Critical Models', () => {
    test('should still include other billing models', () => {
      expect(middlewareContent).toContain("'Preventivo'");
      expect(middlewareContent).toContain("'Fattura'");
    });

    test('should still include core tenant-scoped models', () => {
      expect(middlewareContent).toContain("'Person'");
      expect(middlewareContent).toContain("'Company'");
      expect(middlewareContent).toContain("'Course'");
    });
  });
});
