#!/usr/bin/env node

/**
 * Script per rimuovere variabili non utilizzate comuni
 */

const fs = require('fs');
const path = require('path');

// Funzione per rimuovere variabili non utilizzate da un file
function fixUnusedVariablesInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let changed = false;
    
    // 1. Rimuovi import non utilizzati comuni
    const unusedImports = [
      'Users', 'Star', 'Trash2Plus', 'Plus', 'EntityFormFullWidthField'
    ];
    
    for (const importName of unusedImports) {
      const patterns = [
        // Import singolo
        new RegExp(`import\\s*{\\s*${importName}\\s*}\\s*from\\s*['"][^'"]+['"]\\s*;?\\s*\\n?`, 'g'),
        // Import multiplo - rimuovi solo quello specifico
        new RegExp(`(import\\s*{[^}]*),\\s*${importName}\\s*([^}]*}\\s*from\\s*['"][^'"]+['"]\\s*;?)`, 'g'),
        new RegExp(`(import\\s*{\\s*)${importName}\\s*,\\s*([^}]*}\\s*from\\s*['"][^'"]+['"]\\s*;?)`, 'g'),
        // Import default
        new RegExp(`import\\s+${importName}\\s+from\\s*['"][^'"]+['"]\\s*;?\\s*\\n?`, 'g')
      ];
      
      const beforeLength = newContent.length;
      patterns.forEach(pattern => {
        if (pattern.source.includes('(')) {
          newContent = newContent.replace(pattern, '$1$2');
        } else {
          newContent = newContent.replace(pattern, '');
        }
      });
      
      if (newContent.length !== beforeLength) {
        console.log(`  ✅ Rimosso import '${importName}'`);
        changed = true;
      }
    }
    
    // 2. Aggiungi underscore a parametri non utilizzati
    const lines = newContent.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pattern per parametri di funzioni non utilizzati
      if (line.includes('error') && line.includes('is defined but never used')) {
        // Cerca parametri comuni come 'e', 'error', 'index'
        const paramPatterns = [
          { from: /\(([^)]*)\s*e\s*([^)]*)\)/, to: '($1_e$2)' },
          { from: /\(([^)]*)\s*error\s*([^)]*)\)/, to: '($1_error$2)' },
          { from: /\(([^)]*)\s*index\s*([^)]*)\)/, to: '($1_index$2)' },
          { from: /\(([^)]*)\s*event\s*([^)]*)\)/, to: '($1_event$2)' }
        ];
        
        // Applica ai parametri nelle righe precedenti
        for (let j = Math.max(0, i - 5); j < i; j++) {
          for (const pattern of paramPatterns) {
            if (lines[j].match(pattern.from)) {
              lines[j] = lines[j].replace(pattern.from, pattern.to);
              changed = true;
              console.log(`  ✅ Aggiunto underscore a parametro non utilizzato`);
            }
          }
        }
      }
    }
    
    if (changed) {
      newContent = lines.join('\n');
    }
    
    // 3. Rimuovi dichiarazioni di variabili non utilizzate semplici
    const variablePatterns = [
      // const variabile = useState(...)
      /const\s+\w+\s*=\s*useState\([^)]*\);\s*\n/g,
      // const variabile = useRef(...)
      /const\s+\w+\s*=\s*useRef\([^)]*\);\s*\n/g
    ];
    
    // Nota: Questo è più complesso e rischioso, lo saltiamo per ora
    
    // 4. Rimuovi righe vuote multiple
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
  console.log('🔍 Cercando file sorgente per fix variabili non utilizzate...');
  
  const projectRoot = '/Users/matteo.michielon/project 2.0';
  const sourceFiles = findSourceFiles(projectRoot);
  
  console.log(`📁 Trovati ${sourceFiles.length} file sorgente`);
  console.log('🧹 Rimuovendo variabili non utilizzate...');
  
  let processedFiles = 0;
  let modifiedFiles = 0;
  
  for (const filePath of sourceFiles) {
    processedFiles++;
    
    if (processedFiles % 100 === 0) {
      console.log(`📊 Processati ${processedFiles}/${sourceFiles.length} file...`);
    }
    
    if (fixUnusedVariablesInFile(filePath)) {
      modifiedFiles++;
      console.log(`📝 Modificato: ${filePath.replace(projectRoot, '.')}`);
    }
  }
  
  console.log(`\n🎉 Completato!`);
  console.log(`📊 File processati: ${processedFiles}`);
  console.log(`📝 File modificati: ${modifiedFiles}`);
}

if (require.main === module) {
  main();
}

module.exports = { fixUnusedVariablesInFile };