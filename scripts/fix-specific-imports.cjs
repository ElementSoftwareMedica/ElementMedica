#!/usr/bin/env node

/**
 * Script per rimuovere import specifici non utilizzati
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Lista di import comuni non utilizzati da rimuovere
const COMMON_UNUSED_IMPORTS = [
  'Like',
  'RolesService', 
  'ChevronRight',
  'Settings',
  'apiPost',
  'apiPut',
  'User',
  'GraduationCap',
  'Calendar',
  'NavLink',
  'FileText',
  'useTenant',
  'CompanyFilters',
  'EnhancedUserRole',
  'validateTenantLimits',
  'PrismaClient',
  'TenantRequest',
  'AppError'
];

// Funzione per rimuovere import da un file
function removeUnusedImportsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let changed = false;
    
    for (const importName of COMMON_UNUSED_IMPORTS) {
      // Pattern per import singolo: import { importName } from '...'
      const singleImportPattern = new RegExp(`import\\s*{\\s*${importName}\\s*}\\s*from\\s*['"][^'"]+['"]\\s*;?\\s*\\n?`, 'g');
      
      // Pattern per import multiplo: rimuovi solo l'import specifico
      const multipleImportPattern1 = new RegExp(`(import\\s*{[^}]*),\\s*${importName}\\s*([^}]*}\\s*from\\s*['"][^'"]+['"]\\s*;?)`, 'g');
      const multipleImportPattern2 = new RegExp(`(import\\s*{\\s*)${importName}\\s*,\\s*([^}]*}\\s*from\\s*['"][^'"]+['"]\\s*;?)`, 'g');
      
      // Pattern per import default: import importName from '...'
      const defaultImportPattern = new RegExp(`import\\s+${importName}\\s+from\\s*['"][^'"]+['"]\\s*;?\\s*\\n?`, 'g');
      
      const beforeLength = newContent.length;
      
      // Applica i pattern
      newContent = newContent.replace(singleImportPattern, '');
      newContent = newContent.replace(multipleImportPattern1, '$1$2');
      newContent = newContent.replace(multipleImportPattern2, '$1$2');
      newContent = newContent.replace(defaultImportPattern, '');
      
      if (newContent.length !== beforeLength) {
        console.log(`  ✅ Rimosso import '${importName}'`);
        changed = true;
      }
    }
    
    // Rimuovi righe vuote multiple
    newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    if (changed) {
      fs.writeFileSync(filePath, newContent);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Errore nel processare ${filePath}:`, error.message);
    return false;
  }
}

// Funzione per trovare file TypeScript/JavaScript
function findSourceFiles(dir) {
  const files = [];
  
  function scanDir(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Salta directory di backup e node_modules
          if (!item.includes('backup') && item !== 'node_modules' && item !== 'dist' && item !== '.git') {
            scanDir(fullPath);
          }
        } else if (stat.isFile()) {
          // Include solo file TypeScript e JavaScript
          if (fullPath.match(/\.(ts|tsx|js|jsx)$/)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignora errori di accesso alle directory
    }
  }
  
  scanDir(dir);
  return files;
}

// Funzione principale
function main() {
  console.log('🔍 Cercando file sorgente...');
  
  const projectRoot = '/Users/matteo.michielon/project 2.0';
  const sourceFiles = findSourceFiles(projectRoot);
  
  console.log(`📁 Trovati ${sourceFiles.length} file sorgente`);
  console.log('🧹 Rimuovendo import non utilizzati...');
  
  let processedFiles = 0;
  let modifiedFiles = 0;
  
  for (const filePath of sourceFiles) {
    processedFiles++;
    
    if (processedFiles % 50 === 0) {
      console.log(`📊 Processati ${processedFiles}/${sourceFiles.length} file...`);
    }
    
    if (removeUnusedImportsFromFile(filePath)) {
      modifiedFiles++;
      console.log(`📝 Modificato: ${filePath.replace(projectRoot, '.')}`);
    }
  }
  
  console.log(`\n🎉 Completato!`);
  console.log(`📊 File processati: ${processedFiles}`);
  console.log(`📝 File modificati: ${modifiedFiles}`);
  
  // Verifica miglioramenti
  console.log('\n🔍 Verificando miglioramenti...');
  try {
    const result = execSync('npm run lint 2>&1 | grep -c "error"', { encoding: 'utf8' });
    console.log(`📊 Errori ESLint rimanenti: ${result.trim()}`);
  } catch (error) {
    console.log('⚠️  Non riuscito a verificare i miglioramenti');
  }
}

if (require.main === module) {
  main();
}

module.exports = { removeUnusedImportsFromFile, COMMON_UNUSED_IMPORTS };