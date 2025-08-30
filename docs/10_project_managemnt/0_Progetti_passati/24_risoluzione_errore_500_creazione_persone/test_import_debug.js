#!/usr/bin/env node

/**
 * Script di test per debug dell'importazione CSV
 * Testa le funzioni del PersonImportService senza effettuare importazioni reali
 */

import PersonImportService from '../../../backend/services/person/PersonImportService.js';
import PersonService from '../../../backend/services/person/PersonService.js';

// Mock del PersonService per i test
const mockPersonService = {
  constructor: {
    mapRoleType: (roleType) => roleType || 'EMPLOYEE'
  }
};

const importService = new PersonImportService(mockPersonService);

console.log('🧪 Test PersonImportService - Debug Importazione CSV\n');

// Test 1: Parsing date
console.log('📅 Test 1: Parsing Date');
const testDates = [
  '01/01/1980',
  '15/02/1985', 
  '20/03/1990',
  '1980-01-01',
  '1985-02-15',
  '2024-12-31'
];

testDates.forEach(dateStr => {
  try {
    const parsed = importService.parseDate(dateStr);
    console.log(`  ✅ ${dateStr} -> ${parsed ? parsed.toISOString().split('T')[0] : 'null'}`);
  } catch (error) {
    console.log(`  ❌ ${dateStr} -> Error: ${error.message}`);
  }
});

// Test 2: Validazione email
console.log('\n📧 Test 2: Validazione Email');
const testEmails = [
  'mario.rossi@test.com',
  'giulia.bianchi@test.com',
  'invalid-email',
  'test@',
  '@test.com'
];

testEmails.forEach(email => {
  const isValid = importService.isValidEmail(email);
  console.log(`  ${isValid ? '✅' : '❌'} ${email}`);
});

// Test 3: Validazione dati persona
console.log('\n👤 Test 3: Validazione Dati Persona');
const testPersons = [
  { firstName: 'Mario', lastName: 'Rossi', email: 'mario.rossi@test.com' },
  { firstName: '', lastName: 'Rossi', email: 'test@test.com' },
  { firstName: 'Mario', lastName: '', email: 'test@test.com' },
  { firstName: 'Mario', lastName: 'Rossi', email: 'invalid-email' }
];

testPersons.forEach((person, index) => {
  const validation = importService.validatePersonData(person);
  console.log(`  Test ${index + 1}: ${validation.valid ? '✅' : '❌'} ${validation.error || 'Valido'}`);
});

// Test 4: UUID validation
console.log('\n🔑 Test 4: Validazione UUID');
const testUUIDs = [
  '123e4567-e89b-12d3-a456-426614174000',
  'invalid-uuid',
  '123e4567-e89b-12d3-a456-42661417400',
  'test-company-name'
];

testUUIDs.forEach(uuid => {
  const isValid = importService.isValidUUID(uuid);
  console.log(`  ${isValid ? '✅' : '❌'} ${uuid}`);
});

// Test 5: Estrazione data da codice fiscale
console.log('\n🆔 Test 5: Estrazione Data da Codice Fiscale');
const testTaxCodes = [
  'RSSMRA80A01H501Z',
  'BNCGLI85B02H501Y',
  'VRDLCU90C03H501X'
];

testTaxCodes.forEach(taxCode => {
  try {
    const extractedDate = importService.extractBirthDateFromTaxCode(taxCode);
    console.log(`  ✅ ${taxCode} -> ${extractedDate.toISOString().split('T')[0]}`);
  } catch (error) {
    console.log(`  ❌ ${taxCode} -> Error: ${error.message}`);
  }
});

console.log('\n✅ Test completati');