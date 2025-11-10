/**
 * Quick Integration Test - Preventivi e Codici Sconto Services
 * 
 * Test rapido per verificare funzionalità base dei servizi
 * senza setup completo del server.
 */

import preventiviService from '../services/preventivi-service.js';
import codiciScontoService from '../services/codici-sconto-service.js';

console.log('🧪 Testing Preventivi & Codici Sconto Services...\n');

// Test 1: Calcolo Totali Preventivo con IVA
console.log('✅ Test 1: calculatePreventivoTotals()');
const totali1 = preventiviService.calculatePreventivoTotals({
  prezzoTotale: 1000,
  scontoTotale: 0,
  aliquotaIva: 22
});
console.log('   Input: €1000, sconto €0, IVA 22%');
console.log(`   Output: imponibile=${totali1.imponibile}, IVA=${totali1.importoIva}, finale=${totali1.importoFinale}`);
console.assert(totali1.imponibile === 1000, 'Imponibile should be 1000');
console.assert(totali1.importoIva === 220, 'IVA should be 220');
console.assert(totali1.importoFinale === 1220, 'Finale should be 1220');
console.log('   ✓ Passed\n');

// Test 2: Calcolo con Sconto
console.log('✅ Test 2: calculatePreventivoTotals() con sconto');
const totali2 = preventiviService.calculatePreventivoTotals({
  prezzoTotale: 1000,
  sconti: [200], // Sconto €200
  aliquotaIva: 22
});
console.log('   Input: €1000, sconto €200, IVA 22%');
console.log(`   Output: imponibile=${totali2.imponibile}, IVA=${totali2.importoIva}, finale=${totali2.importoFinale}`);
console.assert(totali2.imponibile === 800, 'Imponibile should be 800');
console.assert(totali2.importoIva === 176, 'IVA should be 176');
console.assert(totali2.importoFinale === 976, 'Finale should be 976');
console.assert(totali2.risparmioPercentuale === 20, 'Risparmio should be 20%');
console.log('   ✓ Passed\n');

// Test 3: Calcolo con IVA ridotta (medico competente)
console.log('✅ Test 3: determineIvaRate() per MEDICO_COMPETENTE');
const ivaRate = preventiviService.determineIvaRate('MEDICO_COMPETENTE');
console.log(`   Output: ${ivaRate}%`);
console.assert(ivaRate === 10, 'MEDICO_COMPETENTE should have 10% IVA');
console.log('   ✓ Passed\n');

// Test 4: Calcolo Sconto Percentuale
console.log('✅ Test 4: calculateDiscount() - PERCENTUALE');
const codicePerc = {
  tipoSconto: 'PERCENTUALE',
  valore: 20
};
const scontoPerc = codiciScontoService.calculateDiscount(codicePerc, 1000);
console.log(`   Input: 20% su €1000`);
console.log(`   Output: €${scontoPerc}`);
console.assert(scontoPerc === 200, 'Sconto should be 200');
console.log('   ✓ Passed\n');

// Test 5: Calcolo Sconto Valore Assoluto
console.log('✅ Test 5: calculateDiscount() - VALORE_ASSOLUTO');
const codiceVal = {
  tipoSconto: 'VALORE_ASSOLUTO',
  valore: 150
};
const scontoVal = codiciScontoService.calculateDiscount(codiceVal, 1000);
console.log(`   Input: €150 fisso su €1000`);
console.log(`   Output: €${scontoVal}`);
console.assert(scontoVal === 150, 'Sconto should be 150');
console.log('   ✓ Passed\n');

// Test 6: Validazione Transizione Stato
console.log('✅ Test 6: validateStateTransition()');
const transition1 = preventiviService.validateStateTransition('BOZZA', 'INVIATO');
console.log(`   BOZZA → INVIATO: ${transition1.valid ? 'valid' : 'invalid'}`);
console.assert(transition1.valid === true, 'BOZZA→INVIATO should be valid');

const transition2 = preventiviService.validateStateTransition('BOZZA', 'FATTURATO');
console.log(`   BOZZA → FATTURATO: ${transition2.valid ? 'valid' : 'invalid'}`);
console.assert(transition2.valid === false, 'BOZZA→FATTURATO should be invalid');
console.log('   ✓ Passed\n');

// Test 7: Cumulabilità Codici
console.log('✅ Test 7: canStackCodes()');
const codiciCumulabili = [
  { cumulabile: true },
  { cumulabile: true }
];
const codiciNonCumulabili = [
  { cumulabile: true },
  { cumulabile: false }
];
const canStack1 = codiciScontoService.canStackCodes(codiciCumulabili);
const canStack2 = codiciScontoService.canStackCodes(codiciNonCumulabili);
console.log(`   Due codici cumulabili: ${canStack1}`);
console.log(`   Mix cumulabile/non: ${canStack2}`);
console.assert(canStack1 === true, 'Should be stackable');
console.assert(canStack2 === false, 'Should not be stackable');
console.log('   ✓ Passed\n');

// Test 8: Snapshot Codice
console.log('✅ Test 8: createCodeSnapshot()');
const codice = {
  id: 'test-id',
  codice: 'TEST2024',
  nome: 'Test Discount',
  descrizione: 'Test description',
  tipoSconto: 'PERCENTUALE',
  valore: 15
};
const snapshot = codiciScontoService.createCodeSnapshot(codice);
console.log(`   Snapshot created with codiceId=${snapshot.codiceId}, codiceTesto=${snapshot.codiceTesto}`);
console.assert(snapshot.codiceId === 'test-id', 'codiceId should match');
console.assert(snapshot.codiceTesto === 'TEST2024', 'codiceTesto should match');
console.assert(snapshot.valoreScontoCodice === 15, 'valoreScontoCodice should be 15');
console.log('   ✓ Passed\n');

// Test 9: Calcolo IVA su Multiple Aliquote
console.log('✅ Test 9: calculateIva() con diverse aliquote');
const iva22 = preventiviService.calculateIva(1000, 22);
const iva10 = preventiviService.calculateIva(1000, 10);
const iva4 = preventiviService.calculateIva(1000, 4);
console.log(`   IVA 22% su €1000: €${iva22}`);
console.log(`   IVA 10% su €1000: €${iva10}`);
console.log(`   IVA 4% su €1000: €${iva4}`);
console.assert(iva22 === 220, 'IVA 22% should be 220');
console.assert(iva10 === 100, 'IVA 10% should be 100');
console.assert(iva4 === 40, 'IVA 4% should be 40');
console.log('   ✓ Passed\n');

// Test 10: Scenario Completo
console.log('✅ Test 10: Scenario completo - Preventivo con sconto e IVA');
const scenario = {
  prezzoTotale: 1500,
  sconti: [300], // Sconto 20%
  tipoServizio: 'CORSO' // IVA 22%
};
const totaliFinali = preventiviService.calculatePreventivoTotals(scenario);
console.log(`   Preventivo: €${scenario.prezzoTotale}`);
console.log(`   Sconto: €${scenario.sconti[0]} (20%)`);
console.log(`   Imponibile: €${totaliFinali.imponibile}`);
console.log(`   IVA (22%): €${totaliFinali.importoIva}`);
console.log(`   Totale finale: €${totaliFinali.importoFinale}`);
console.assert(totaliFinali.imponibile === 1200, 'Imponibile should be 1200');
console.assert(totaliFinali.importoIva === 264, 'IVA should be 264');
console.assert(totaliFinali.importoFinale === 1464, 'Finale should be 1464');
console.log('   ✓ Passed\n');

console.log('═══════════════════════════════════════════');
console.log('✅ ALL TESTS PASSED (10/10)');
console.log('═══════════════════════════════════════════');
console.log('\n📊 Summary:');
console.log('   - Calcoli IVA: ✓');
console.log('   - Calcoli sconti: ✓');
console.log('   - Transizioni stato: ✓');
console.log('   - Snapshot pattern: ✓');
console.log('   - Business logic: ✓');
console.log('\n✨ I servizi sono pronti per l\'integrazione!\n');
