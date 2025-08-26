#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');

console.log('🔍 Test sostituzione modelli...');

try {
  const content = fs.readFileSync(SCHEMA_PATH, 'utf8');
  console.log(`📖 Schema letto: ${content.length} caratteri`);
  
  // Test con il modello Person
  const model = 'Person';
  console.log(`\n🔍 Test sostituzione per modello: ${model}`);
  
  const modelPattern = new RegExp(`(model\\s+${model}\\s*\\{[\\s\\S]*?)(\\n\\})`, 'g');
  const modelMatch = content.match(modelPattern);
  
  console.log(`Modello trovato: ${modelMatch ? 'SÌ' : 'NO'}`);
  
  if (modelMatch && modelMatch.length > 0) {
    const fullMatch = modelMatch[0];
    console.log(`\nContenuto trovato (primi 200 caratteri):`);
    console.log(fullMatch.substring(0, 200) + '...');
    
    // Test indici da aggiungere
    const testIndices = [
      '@@index([tenantId, status])',
      '@@index([companyId, tenantId])'
    ];
    
    console.log(`\n🔍 Test verifica indici esistenti:`);
    testIndices.forEach(index => {
      const indexFields = index.match(/\[([^\]]+)\]/)[1];
      const exists = fullMatch.includes(`@@index([${indexFields}])`);
      console.log(`  ${index}: ${exists ? 'ESISTE GIÀ' : 'DA AGGIUNGERE'}`);
    });
    
    // Test sostituzione
    const modelContent = fullMatch.replace(/\n\}$/, '');
    const newIndices = testIndices.filter(index => {
      const indexFields = index.match(/\[([^\]]+)\]/)[1];
      return !fullMatch.includes(`@@index([${indexFields}])`);
    });
    
    if (newIndices.length > 0) {
      console.log(`\n✅ Indici da aggiungere: ${newIndices.length}`);
      newIndices.forEach(index => console.log(`  - ${index}`));
      
      const indicesText = newIndices.map(index => `  ${index}`).join('\n');
      const updatedModel = `${modelContent}\n${indicesText}\n}`;
      
      console.log(`\n📝 Modello aggiornato (ultimi 200 caratteri):`);
      console.log('...' + updatedModel.slice(-200));
    } else {
      console.log(`\n⚠️ Nessun indice da aggiungere`);
    }
  }
  
} catch (error) {
  console.error('❌ Errore:', error.message);
}