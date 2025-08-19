#!/usr/bin/env node

/**
 * Script per correggere automaticamente tutti gli URL API hardcoded
 * da http://localhost:4000 a /api per usare il proxy Vite
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Trova tutti i file TypeScript e JavaScript nel src
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      // Ricorsione nelle sottocartelle
      results = results.concat(findFiles(filePath, extensions));
    } else {
      // Controlla se il file ha un'estensione valida
      if (extensions.some(ext => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  });
  
  return results;
}

// Sostituisce gli URL nel contenuto del file
function replaceApiUrls(content) {
  // Pattern per trovare http://localhost:4000 seguito da un endpoint
  const patterns = [
    // fetch('http://localhost:4000/endpoint')
    {
      regex: /fetch\s*\(\s*['"`]http:\/\/localhost:4000(\/[^'"` ]*)['"`]/g,
      replacement: "fetch('/api$1'"
    },
    // axios.get('http://localhost:4000/endpoint')
    {
      regex: /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]http:\/\/localhost:4000(\/[^'"` ]*)['"`]/g,
      replacement: "axios.$1('/api$2'"
    },
    // await fetch(`http://localhost:4000/endpoint/${id}`)
    {
      regex: /fetch\s*\(\s*`http:\/\/localhost:4000(\/[^`]*)`/g,
      replacement: "fetch(`/api$1`"
    },
    // axios.get(`http://localhost:4000/endpoint/${id}`)
    {
      regex: /axios\.(get|post|put|delete|patch)\s*\(\s*`http:\/\/localhost:4000(\/[^`]*)`/g,
      replacement: "axios.$1(`/api$2`"
    },
    // href="http://localhost:4000/file" (per download)
    {
      regex: /href\s*=\s*{\s*`http:\/\/localhost:4000([^`]*)`\s*}/g,
      replacement: "href={`/api$1`}"
    },
    // window.open('http://localhost:4000/file')
    {
      regex: /window\.open\s*\(\s*`http:\/\/localhost:4000([^`]*)`/g,
      replacement: "window.open(`/api$1`"
    },
    // Costanti API_URL
    {
      regex: /const\s+API_URL\s*=\s*['"`]http:\/\/localhost:4000['"`]/g,
      replacement: "const API_URL = '/api'"
    }
  ];
  
  let updatedContent = content;
  let hasChanges = false;
  
  patterns.forEach(pattern => {
    const originalContent = updatedContent;
    updatedContent = updatedContent.replace(pattern.regex, pattern.replacement);
    if (originalContent !== updatedContent) {
      hasChanges = true;
    }
  });
  
  return { content: updatedContent, hasChanges };
}

// Funzione principale
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  
  console.log('🔍 Ricerca file con URL API hardcoded...');
  
  const files = findFiles(srcDir);
  let totalFiles = 0;
  let updatedFiles = 0;
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Controlla se il file contiene localhost:4000
      if (content.includes('localhost:4000')) {
        totalFiles++;
        
        const { content: updatedContent, hasChanges } = replaceApiUrls(content);
        
        if (hasChanges) {
          fs.writeFileSync(filePath, updatedContent, 'utf8');
          updatedFiles++;
          console.log(`✅ Aggiornato: ${path.relative(srcDir, filePath)}`);
        } else {
          console.log(`⚠️  Nessuna modifica necessaria: ${path.relative(srcDir, filePath)}`);
        }
      }
    } catch (error) {
      console.error(`❌ Errore nel processare ${filePath}:`, error.message);
    }
  });
  
  console.log(`\n📊 Riepilogo:`);
  console.log(`   File con localhost:4000 trovati: ${totalFiles}`);
  console.log(`   File aggiornati: ${updatedFiles}`);
  
  if (updatedFiles > 0) {
    console.log(`\n✅ Correzione completata! Tutti gli URL API sono stati aggiornati per usare il proxy Vite.`);
    console.log(`   Gli URL sono stati cambiati da 'http://localhost:4000' a '/api'`);
  } else {
    console.log(`\n✅ Nessun file necessita di aggiornamenti.`);
  }
}

// Esegui lo script
if (require.main === module) {
  main();
}

module.exports = { replaceApiUrls, findFiles };