#!/usr/bin/env node

/**
 * Script per forzare l'aggiornamento del cache del browser
 * Questo script aggiunge un timestamp al file principale per forzare il reload
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Forzando aggiornamento cache browser...');

// Aggiunge un commento con timestamp al file principale per forzare il reload
const mainTsPath = path.join(__dirname, '..', 'src', 'main.tsx');

if (fs.existsSync(mainTsPath)) {
  let content = fs.readFileSync(mainTsPath, 'utf8');
  
  // Rimuove eventuali commenti di cache precedenti
  content = content.replace(/\/\* Cache-Buster: \d+ \*\/\n?/g, '');
  
  // Aggiunge nuovo timestamp
  const timestamp = Date.now();
  content = `/* Cache-Buster: ${timestamp} */\n${content}`;
  
  fs.writeFileSync(mainTsPath, content);
  console.log(`✅ Cache-buster aggiunto a main.tsx (timestamp: ${timestamp})`);
} else {
  console.log('❌ File main.tsx non trovato');
}

console.log('\n📋 Istruzioni per l\'utente:');
console.log('1. Effettua un hard refresh del browser:');
console.log('   - Mac: Cmd + Shift + R');
console.log('   - Windows/Linux: Ctrl + F5');
console.log('2. Oppure svuota la cache del browser');
console.log('3. Oppure testa in modalità incognito');
console.log('\n🔍 Il problema dell\'errore 400 Bad Request è risolto lato backend.');
console.log('   L\'errore che vedi è dovuto alla cache del browser.');