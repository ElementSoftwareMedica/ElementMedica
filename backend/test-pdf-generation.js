/**
 * Test Script - PDF Generation FASE 5
 * 
 * Testa direttamente il metodo generatePDF() del preventivi-service
 * senza passare per autenticazione API.
 * 
 * Usage: node test-pdf-generation.js
 */

import preventiviService from './services/preventivi-service.js';
import logger from './utils/logger.js';
import prisma from './config/prisma-optimization.js';

const PREVENTIVO_ID = '068dfa1b-8f84-444a-8c43-3ebf9a6ca539';
const TENANT_ID = '21ec594c-efc3-4300-bfa8-b43307a80c9b';
const USER_ID = '3b0cf909-6426-4d97-83df-95dddc6b42bc'; // Admin User - Person ID valido

async function testPDFGeneration() {
  console.log('🧪 FASE 5: Test PDF Generation');
  console.log('================================\n');
  
  console.log(`📋 Preventivo ID: ${PREVENTIVO_ID}`);
  console.log(`🏢 Tenant ID: ${TENANT_ID}`);
  console.log(`👤 User ID: ${USER_ID}\n`);
  
  try {
    console.log('⏳ Generazione PDF in corso...\n');
    
    const startTime = Date.now();
    const result = await preventiviService.generatePDF({
      preventivoId: PREVENTIVO_ID,
      userId: USER_ID,
      tenantId: TENANT_ID
    });
    const duration = Date.now() - startTime;
    
    console.log('✅ PDF generato con successo!\n');
    console.log(`📊 Risultati:`);
    console.log(`   - Filename: ${result.filename}`);
    console.log(`   - File size: ${(result.buffer.length / 1024).toFixed(2)} KB`);
    console.log(`   - Document ID: ${result.documentId}`);
    console.log(`   - Filepath: ${result.filepath}`);
    console.log(`   - Duration: ${duration}ms`);
    
    if (duration < 3000) {
      console.log(`\n⚡ Performance: OK (< 3s target)`);
    } else {
      console.log(`\n⚠️  Performance: SLOW (target < 3s, got ${duration}ms)`);
    }
    
    console.log(`\n✅ Test completato con successo!`);
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Errore generazione PDF:\n');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}\n`);
    
    if (error.message.includes('Template "Preventivo" non trovato')) {
      console.log('💡 Soluzione: Eseguire script SQL per creare template:');
      console.log('   psql -d dev_db -f backend/scripts/insert-preventivo-template-local.sql\n');
    }
    
    process.exit(1);
  }
}

testPDFGeneration();
