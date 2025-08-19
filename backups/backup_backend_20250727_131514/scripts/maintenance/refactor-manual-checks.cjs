#!/usr/bin/env node

/**
 * Script per rimuovere i controlli manuali di soft-delete dal codice
 * Fase 5: Soft-Delete & Middleware
 * 
 * Questo script rimuove:
 * - deletedAt: null
 * - isActive: true
 * - where: { ...existing, deletedAt: null }
 * - where: { ...existing, isActive: true }
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

class SoftDeleteRefactor {
  constructor() {
    this.changes = [];
    this.backupDir = path.join(__dirname, '../backups/refactor-manual-checks');
    this.targetDirs = [
      '../controllers',
      '../services', 
      '../routes',
      '../middleware',
      '../scripts'
    ];
  }

  async run() {
    console.log('🔄 Avvio refactoring controlli manuali soft-delete...');
    
    // Crea directory backup
    await this.createBackupDir();
    
    // Trova tutti i file JS
    const files = await this.findJSFiles();
    console.log(`📁 Trovati ${files.length} file da analizzare`);
    
    // Processa ogni file
    for (const file of files) {
      await this.processFile(file);
    }
    
    // Report finale
    this.generateReport();
  }

  async createBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async findJSFiles() {
    const files = [];
    
    for (const dir of this.targetDirs) {
      const fullPath = path.join(__dirname, dir);
      if (fs.existsSync(fullPath)) {
        const pattern = path.join(fullPath, '**/*.js');
        const dirFiles = glob.sync(pattern);
        files.push(...dirFiles);
      }
    }
    
    return files;
  }

  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      let modifiedContent = content;
      let hasChanges = false;
      
      // Pattern per rimuovere deletedAt: null
      const deletedAtPatterns = [
        // deletedAt: null in oggetti where
        /,\s*deletedAt:\s*null/g,
        /deletedAt:\s*null,?/g,
        // where: { ...existing, deletedAt: null }
        /where:\s*{([^}]*),\s*deletedAt:\s*null\s*}/g,
        /where:\s*{\s*deletedAt:\s*null,?([^}]*)}/g
      ];
      
      // Pattern per rimuovere isActive: true
      const isActivePatterns = [
        // isActive: true in oggetti where
        /,\s*isActive:\s*true/g,
        /isActive:\s*true,?/g,
        // where: { ...existing, isActive: true }
        /where:\s*{([^}]*),\s*isActive:\s*true\s*}/g,
        /where:\s*{\s*isActive:\s*true,?([^}]*)}/g
      ];
      
      // Applica pattern deletedAt
      for (const pattern of deletedAtPatterns) {
        const newContent = modifiedContent.replace(pattern, (match, group1, group2) => {
          hasChanges = true;
          
          // Se è un where object, mantieni solo il contenuto valido
          if (group1 !== undefined) {
            return group1.trim() ? `where: {${group1}}` : 'where: {}';
          }
          if (group2 !== undefined) {
            return group2.trim() ? `where: {${group2}}` : 'where: {}';
          }
          
          // Rimuovi semplicemente la proprietà
          return '';
        });
        modifiedContent = newContent;
      }
      
      // Applica pattern isActive
      for (const pattern of isActivePatterns) {
        const newContent = modifiedContent.replace(pattern, (match, group1, group2) => {
          hasChanges = true;
          
          // Se è un where object, mantieni solo il contenuto valido
          if (group1 !== undefined) {
            return group1.trim() ? `where: {${group1}}` : 'where: {}';
          }
          if (group2 !== undefined) {
            return group2.trim() ? `where: {${group2}}` : 'where: {}';
          }
          
          // Rimuovi semplicemente la proprietà
          return '';
        });
        modifiedContent = newContent;
      }
      
      // Pulisci virgole doppie e spazi extra
      modifiedContent = modifiedContent
        .replace(/,\s*,/g, ',')
        .replace(/\{\s*,/g, '{')
        .replace(/,\s*\}/g, '}')
        .replace(/\{\s*\}/g, '{}');
      
      if (hasChanges) {
        // Crea backup
        const backupPath = path.join(this.backupDir, path.basename(filePath) + '.backup');
        fs.writeFileSync(backupPath, originalContent);
        
        // Scrivi file modificato
        fs.writeFileSync(filePath, modifiedContent);
        
        this.changes.push({
          file: filePath,
          backup: backupPath,
          changes: this.countChanges(originalContent, modifiedContent)
        });
        
        console.log(`✅ Modificato: ${path.relative(process.cwd(), filePath)}`);
      }
      
    } catch (error) {
      console.error(`❌ Errore processando ${filePath}:`, error.message);
    }
  }

  countChanges(original, modified) {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    let deletedAtRemoved = 0;
    let isActiveRemoved = 0;
    
    for (let i = 0; i < originalLines.length; i++) {
      const originalLine = originalLines[i] || '';
      const modifiedLine = modifiedLines[i] || '';
      
      if (originalLine.includes('deletedAt: null') && !modifiedLine.includes('deletedAt: null')) {
        deletedAtRemoved++;
      }
      if (originalLine.includes('isActive: true') && !modifiedLine.includes('isActive: true')) {
        isActiveRemoved++;
      }
    }
    
    return { deletedAtRemoved, isActiveRemoved };
  }

  generateReport() {
    console.log('\n📊 REPORT REFACTORING CONTROLLI MANUALI');
    console.log('=' .repeat(50));
    
    if (this.changes.length === 0) {
      console.log('✅ Nessun controllo manuale trovato da rimuovere.');
      return;
    }
    
    let totalDeletedAt = 0;
    let totalIsActive = 0;
    
    console.log(`\n📁 File modificati: ${this.changes.length}`);
    
    for (const change of this.changes) {
      console.log(`\n📄 ${path.relative(process.cwd(), change.file)}`);
      console.log(`   - deletedAt: null rimossi: ${change.changes.deletedAtRemoved}`);
      console.log(`   - isActive: true rimossi: ${change.changes.isActiveRemoved}`);
      console.log(`   - Backup: ${path.relative(process.cwd(), change.backup)}`);
      
      totalDeletedAt += change.changes.deletedAtRemoved;
      totalIsActive += change.changes.isActiveRemoved;
    }
    
    console.log('\n📈 TOTALI:');
    console.log(`   - deletedAt: null rimossi: ${totalDeletedAt}`);
    console.log(`   - isActive: true rimossi: ${totalIsActive}`);
    console.log(`   - File modificati: ${this.changes.length}`);
    
    // Salva report
    const reportPath = path.join(__dirname, '../docs/phase5-refactor-report.md');
    this.saveReport(reportPath, totalDeletedAt, totalIsActive);
    
    console.log(`\n💾 Report salvato in: ${reportPath}`);
    console.log('\n✅ Refactoring completato!');
    console.log('\n⚠️  IMPORTANTE: Testa l\'applicazione per verificare che tutto funzioni correttamente.');
  }

  saveReport(reportPath, totalDeletedAt, totalIsActive) {
    const report = `# Fase 5 - Report Refactoring Controlli Manuali

## Sommario
- **Data**: ${new Date().toISOString()}
- **File modificati**: ${this.changes.length}
- **deletedAt: null rimossi**: ${totalDeletedAt}
- **isActive: true rimossi**: ${totalIsActive}

## Dettagli Modifiche

${this.changes.map(change => `### ${path.relative(process.cwd(), change.file)}
- deletedAt: null rimossi: ${change.changes.deletedAtRemoved}
- isActive: true rimossi: ${change.changes.isActiveRemoved}
- Backup: ${path.relative(process.cwd(), change.backup)}`).join('\n\n')}

## Prossimi Passi

1. ✅ Middleware avanzato implementato
2. ✅ Controlli manuali rimossi
3. 🔄 Test dell'applicazione
4. 🔄 Verifica performance
5. 🔄 Procedere con Fase 6

## Note

- Tutti i file originali sono stati salvati nella directory backup
- Il middleware gestisce automaticamente il soft-delete
- Non sono più necessari controlli manuali di deletedAt o isActive
`;
    
    fs.writeFileSync(reportPath, report);
  }
}

// Esegui se chiamato direttamente
if (require.main === module) {
  const refactor = new SoftDeleteRefactor();
  refactor.run().catch(console.error);
}

module.exports = SoftDeleteRefactor;