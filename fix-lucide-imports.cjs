const fs = require('fs');
const path = require('path');

// Mappa delle icone comuni che potrebbero mancare negli import
const commonIcons = [
  'Users', 'Star', 'Award', 'UserCheck', 'Plus', 'ChevronRight', 
  'Settings', 'Calendar', 'Shield', 'FileText', 'Building2', 
  'BookOpen', 'TreePine', 'Building', 'Layers', 'MessageSquare', 
  'Globe', 'Database', 'Crown', 'Move', 'Edit', 'Trash2'
];

function findTsxFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Ignora le directory di backup e node_modules
      if (!item.includes('backup') && item !== 'node_modules' && item !== '.git' && item !== 'dist') {
        findTsxFiles(fullPath, files);
      }
    } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Trova l'import di lucide-react
  const lucideImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"];?/);
  if (!lucideImportMatch) {
    return null; // Non usa lucide-react
  }
  
  const currentImports = lucideImportMatch[1]
    .split(',')
    .map(imp => imp.trim())
    .filter(imp => imp.length > 0);
  
  // Trova tutte le icone usate nel file
  const usedIcons = new Set();
  
  for (const icon of commonIcons) {
    // Cerca pattern come <IconName o {IconName
    const patterns = [
      new RegExp(`<${icon}\\s`, 'g'),
      new RegExp(`\\{${icon}\\s`, 'g'),
      new RegExp(`\\s${icon}\\s`, 'g'),
      new RegExp(`${icon}:`, 'g')
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        usedIcons.add(icon);
        break;
      }
    }
  }
  
  // Trova icone mancanti
  const missingIcons = Array.from(usedIcons).filter(icon => 
    !currentImports.some(imp => imp.includes(icon))
  );
  
  return {
    filePath,
    currentImports,
    usedIcons: Array.from(usedIcons),
    missingIcons
  };
}

function fixImports(filePath, missingIcons) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Trova l'import di lucide-react
  const lucideImportMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"];?/);
  if (!lucideImportMatch || missingIcons.length === 0) {
    return false;
  }
  
  const currentImports = lucideImportMatch[1]
    .split(',')
    .map(imp => imp.trim())
    .filter(imp => imp.length > 0);
  
  // Aggiungi le icone mancanti
  const allImports = [...currentImports, ...missingIcons].sort();
  
  // Rimuovi duplicati
  const uniqueImports = [...new Set(allImports)];
  
  // Crea il nuovo import
  const newImport = `import { 
  ${uniqueImports.join(',\n  ')}
} from 'lucide-react';`;
  
  // Sostituisci l'import esistente
  const newContent = content.replace(
    /import\s*\{[^}]+\}\s*from\s*['"]lucide-react['"];?/,
    newImport
  );
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  
  return false;
}

// Main execution
console.log('🔍 Analizzando file per problemi di import Lucide...');

const srcDir = path.join(__dirname, 'src');
const files = findTsxFiles(srcDir);

console.log(`📁 Trovati ${files.length} file TypeScript/React`);

let totalProblems = 0;
let totalFixed = 0;

for (const file of files) {
  try {
    const analysis = analyzeFile(file);
    
    if (analysis && analysis.missingIcons.length > 0) {
      totalProblems++;
      console.log(`\n❌ ${path.relative(__dirname, analysis.filePath)}`);
      console.log(`   Icone mancanti: ${analysis.missingIcons.join(', ')}`);
      console.log(`   Icone usate: ${analysis.usedIcons.join(', ')}`);
      
      const fixed = fixImports(analysis.filePath, analysis.missingIcons);
      if (fixed) {
        totalFixed++;
        console.log(`   ✅ Import corretti`);
      } else {
        console.log(`   ❌ Impossibile correggere automaticamente`);
      }
    }
  } catch (error) {
    console.error(`❌ Errore analizzando ${file}:`, error.message);
  }
}

console.log(`\n📊 Riepilogo:`);
console.log(`   File con problemi: ${totalProblems}`);
console.log(`   File corretti: ${totalFixed}`);
console.log(`   File rimanenti: ${totalProblems - totalFixed}`);