#!/usr/bin/env node

import IndicesOptimizer from './phase2-indices-optimization.js';

console.log('🚀 Avvio Fase 2: Indici & Vincoli');
console.log('=' .repeat(50));

const optimizer = new IndicesOptimizer();

try {
  const result = await optimizer.execute();
  
  if (result.success) {
    console.log('\n✅ Ottimizzazione indici completata con successo!');
    console.log(`📊 Indici aggiunti: ${result.indicesAdded}`);
    console.log(`✅ Modifiche applicate: ${result.changes}`);
    console.log(`❌ Errori: ${result.errors}`);
    process.exit(0);
  } else {
    console.error('\n❌ Ottimizzazione indici fallita');
    console.error(`Errore: ${result.error}`);
    process.exit(1);
  }
} catch (error) {
  console.error('\n💥 Errore fatale:', error.message);
  console.error(error.stack);
  process.exit(1);
}