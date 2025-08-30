#!/usr/bin/env node

/**
 * Script per rimuovere automaticamente le variabili non utilizzate
 * Analizza gli errori ESLint e rimuove import/variabili non utilizzate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Funzione per ottenere gli errori ESLint
function getUnusedVarsErrors() {
  try {
    const lintOutput = execSync('npm run lint 2>&1', { encoding: 'utf8' });
    const lines = lintOutput.split('\n');
    const errors = [];
    
    for (const line of lines) {
      if (line.includes('no-unused-vars')) {
        const match = line.match(/^(.+):(\d+):(\d+)\s+error\s+'([^']+)' is (?:defined but never used|assigned a value but never used)/);
        if (match) {
          const [, filePath, lineNum, colNum, varName] = match;
          errors.push({
            file: filePath.trim(),
            line: parseInt(lineNum),
            column: parseInt(colNum),
            variable: varName
          });
        }
      }
    }
    
    return errors;
  } catch (error) {
    console.error('Errore nell\'esecuzione di ESLint:', error.message);
    return [];
  }
}

// Funzione per rimuovere import non utilizzati
function removeUnusedImport(filePath, variable) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Pattern per import singolo: import { variable } from '...'
    const singleImportPattern = new RegExp(`import\\s*{\\s*${variable}\\s*}\\s*from\\s*['"][^'"]+['"]\\s*;?`, 'g');
    
    // Pattern per import multiplo: import { var1, variable, var2 } from '...'
    const multipleImportPattern = new RegExp(`(import\\s*{[^}]*),\\s*${variable}\\s*([^}]*}\\s*from\\s*['"][^'"]+['"]\\s*;?)`, 'g');
    const multipleImportPattern2 = new RegExp(`(import\\s*{\\s*)${variable}\\s*,\\s*([^}]*}\\s*from\\s*['"][^'"]+['"]\\s*;?)`, 'g');
    
    // Pattern per import default: import variable from '...'
    const defaultImportPattern = new RegExp(`import\\s+${variable}\\s+from\\s*['"][^'"]+['"]\\s*;?`, 'g');
    
    let newContent = content;
    
    // Rimuovi import singolo
    newContent = newContent.replace(singleImportPattern, '');
    
    // Rimuovi da import multiplo
    newContent = newContent.replace(multipleImportPattern, '$1$2');
    newContent = newContent.replace(multipleImportPattern2, '$1$2');
    
    // Rimuovi import default
    newContent = newContent.replace(defaultImportPattern, '');
    
    // Rimuovi righe vuote multiple
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✅ Rimosso import '${variable}' da ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Errore nel processare ${filePath}:`, error.message);
    return false;
  }
}

// Funzione per rimuovere variabili non utilizzate (non import)
function removeUnusedVariable(filePath, variable, lineNum) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    if (lineNum > 0 && lineNum <= lines.length) {
      const line = lines[lineNum - 1];
      
      // Se è una dichiarazione di variabile semplice, rimuovila
      if (line.trim().match(new RegExp(`^(const|let|var)\\s+${variable}\\s*=`))) {
        lines.splice(lineNum - 1, 1);
        const newContent = lines.join('\n');
        fs.writeFileSync(filePath, newContent);
        console.log(`✅ Rimossa variabile '${variable}' da ${filePath}:${lineNum}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Errore nel processare ${filePath}:`, error.message);
    return false;
  }
}

// Funzione principale
function main() {
  console.log('🔍 Analizzando errori ESLint per variabili non utilizzate...');
  
  const errors = getUnusedVarsErrors();
  console.log(`📊 Trovati ${errors.length} errori di variabili non utilizzate`);
  
  if (errors.length === 0) {
    console.log('✅ Nessun errore di variabili non utilizzate trovato!');
    return;
  }
  
  // Raggruppa per file
  const errorsByFile = {};
  for (const error of errors) {
    if (!errorsByFile[error.file]) {
      errorsByFile[error.file] = [];
    }
    errorsByFile[error.file].push(error);
  }
  
  let fixedCount = 0;
  
  for (const [filePath, fileErrors] of Object.entries(errorsByFile)) {
    console.log(`\n📁 Processando ${filePath} (${fileErrors.length} errori)...`);
    
    for (const error of fileErrors) {
      // Prima prova a rimuovere come import
      if (removeUnusedImport(filePath, error.variable)) {
        fixedCount++;
      } else {
        // Altrimenti prova a rimuovere come variabile
        if (removeUnusedVariable(filePath, error.variable, error.line)) {
          fixedCount++;
        } else {
          console.log(`⚠️  Non riuscito a rimuovere '${error.variable}' da ${filePath}:${error.line}`);
        }
      }
    }
  }
  
  console.log(`\n🎉 Completato! Risolti ${fixedCount}/${errors.length} errori`);
  
  // Riesegui ESLint per verificare i miglioramenti
  console.log('\n🔍 Verificando miglioramenti...');
  try {
    const newErrors = getUnusedVarsErrors();
    console.log(`📊 Errori rimanenti: ${newErrors.length} (riduzione: ${errors.length - newErrors.length})`);
  } catch (error) {
    console.log('⚠️  Non riuscito a verificare i miglioramenti');
  }
}

if (require.main === module) {
  main();
}

module.exports = { getUnusedVarsErrors, removeUnusedImport, removeUnusedVariable };