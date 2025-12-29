#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');

console.log('🔍 Test rilevamento modelli...');

try {
  const content = fs.readFileSync(SCHEMA_PATH, 'utf8');
  console.log(`📖 Schema letto: ${content.length} caratteri`);
  
  const models = ['Person', 'PersonRole', 'Course', 'CourseSchedule', 'CourseEnrollment', 'ActivityLog', 'RefreshToken'];
  
  models.forEach(model => {
    console.log(`\n🔍 Cercando modello: ${model}`);
    
    // Test regex originale
    const oldPattern = new RegExp(`(model ${model}\\s*{[^}]+)(})`,'s');
    const oldMatch = content.match(oldPattern);
    console.log(`  Regex originale: ${oldMatch ? '✅ TROVATO' : '❌ NON TROVATO'}`);
    
    // Test nuova regex
    const newPattern = new RegExp(`(model\\s+${model}\\s*\\{[\\s\\S]*?)(\\n\\})`, 'g');
    const newMatch = content.match(newPattern);
    console.log(`  Nuova regex: ${newMatch ? '✅ TROVATO' : '❌ NON TROVATO'}`);
    
    // Test regex semplice
    const simplePattern = new RegExp(`model\\s+${model}\\s*\\{`);
    const simpleMatch = content.match(simplePattern);
    console.log(`  Regex semplice: ${simpleMatch ? '✅ TROVATO' : '❌ NON TROVATO'}`);
    
    if (simpleMatch) {
      const index = content.indexOf(simpleMatch[0]);
      const lineNumber = content.substring(0, index).split('\n').length;
      console.log(`  Trovato alla riga: ${lineNumber}`);
    }
  });
  
} catch (error) {
  console.error('❌ Errore:', error.message);
}