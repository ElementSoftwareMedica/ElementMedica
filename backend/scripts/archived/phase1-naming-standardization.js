#!/usr/bin/env node
/**
 * Fase 1: Naming & Convenzioni - Standardizzazione Schema Prisma
 * 
 * Questo script:
 * 1. Rimuove @map superflui per campi già in camelCase
 * 2. Standardizza naming conventions
 * 3. Mantiene compatibilità con il codice esistente
 * 4. Crea backup di sicurezza
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const BACKUP_DIR = path.join(__dirname, '../prisma/backups');

class NamingStandardizer {
  constructor() {
    this.changes = [];
    this.errors = [];
  }

  /**
   * Crea backup dello schema
   */
  createBackup() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `schema-pre-phase1-${timestamp}.prisma`);
      
      fs.copyFileSync(SCHEMA_PATH, backupPath);
      console.log(`✅ Backup creato: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Errore creazione backup:', error.message);
      throw error;
    }
  }

  /**
   * Legge il contenuto dello schema
   */
  readSchema() {
    try {
      return fs.readFileSync(SCHEMA_PATH, 'utf8');
    } catch (error) {
      console.error('❌ Errore lettura schema:', error.message);
      throw error;
    }
  }

  /**
   * Scrive il contenuto dello schema
   */
  writeSchema(content) {
    try {
      fs.writeFileSync(SCHEMA_PATH, content, 'utf8');
      console.log('✅ Schema aggiornato con successo');
    } catch (error) {
      console.error('❌ Errore scrittura schema:', error.message);
      throw error;
    }
  }

  /**
   * Rimuove @map superflui per campi timestamp standard
   */
  removeSuperfluousMaps(content) {
    console.log('🔄 Rimozione @map superflui...');
    
    // Pattern per @map su campi timestamp standard
    const superfluousMaps = [
      // Timestamp fields che sono già in camelCase
      { pattern: /createdAt\s+DateTime[^\n]*@map\("created_at"\)/g, replacement: 'createdAt          DateTime            @default(now())' },
      { pattern: /updatedAt\s+DateTime[^\n]*@map\("updated_at"\)/g, replacement: 'updatedAt          DateTime            @updatedAt @default(now())' },
      { pattern: /deletedAt\s+DateTime[^\n]*@map\("deleted_at"\)/g, replacement: 'deletedAt          DateTime?' },
      
      // Altri campi comuni già in camelCase
      { pattern: /firstName\s+String[^\n]*@map\("first_name"\)/g, replacement: 'firstName          String' },
      { pattern: /lastName\s+String[^\n]*@map\("last_name"\)/g, replacement: 'lastName           String' },
      { pattern: /companyId\s+String[^\n]*@map\("company_id"\)/g, replacement: 'companyId          String' },
      { pattern: /tenantId\s+String[^\n]*@map\("tenant_id"\)/g, replacement: 'tenantId           String' },
      { pattern: /personId\s+String[^\n]*@map\("person_id"\)/g, replacement: 'personId           String' },
    ];

    let updatedContent = content;
    
    superfluousMaps.forEach(({ pattern, replacement }) => {
      const matches = updatedContent.match(pattern);
      if (matches) {
        updatedContent = updatedContent.replace(pattern, replacement);
        this.changes.push(`Rimosso @map superfluo: ${matches.length} occorrenze`);
        console.log(`  ✅ Rimosso @map superfluo: ${matches.length} occorrenze`);
      }
    });

    return updatedContent;
  }

  /**
   * Mantiene @map necessari per compatibilità legacy
   */
  preserveNecessaryMaps(content) {
    console.log('🔄 Preservazione @map necessari per compatibilità...');
    
    // Questi @map devono essere mantenuti perché il DB usa ancora snake_case
    const necessaryMaps = [
      'employee_id',
      'partecipante_id', 
      'user_id',
      'nome_file',
      'data_generazione',
      'numero_progressivo',
      'anno_progressivo'
    ];

    necessaryMaps.forEach(mapName => {
      const pattern = new RegExp(`@map\("${mapName}"\)`, 'g');
      const matches = content.match(pattern);
      if (matches) {
        console.log(`  ℹ️  Mantenuto @map necessario: ${mapName} (${matches.length} occorrenze)`);
      }
    });

    return content;
  }

  /**
   * Standardizza spacing e formattazione
   */
  standardizeFormatting(content) {
    console.log('🔄 Standardizzazione formattazione...');
    
    // Standardizza spacing nei campi
    let updatedContent = content;
    
    // Normalizza spacing multipli
    updatedContent = updatedContent.replace(/\s{2,}/g, '  ');
    
    // Assicura newline consistenti
    updatedContent = updatedContent.replace(/\r\n/g, '\n');
    
    this.changes.push('Standardizzata formattazione');
    console.log('  ✅ Formattazione standardizzata');
    
    return updatedContent;
  }

  /**
   * Valida il contenuto dello schema
   */
  validateSchema(content) {
    console.log('🔄 Validazione schema...');
    
    const validationChecks = [
      {
        name: 'Presenza generator client',
        check: content.includes('generator client'),
        required: true
      },
      {
        name: 'Presenza datasource db',
        check: content.includes('datasource db'),
        required: true
      },
      {
        name: 'Presenza modello Person',
        check: content.includes('model Person'),
        required: true
      },
      {
        name: 'Presenza enum CourseStatus',
        check: content.includes('enum CourseStatus'),
        required: true
      }
    ];

    let isValid = true;
    
    validationChecks.forEach(({ name, check, required }) => {
      if (required && !check) {
        this.errors.push(`Validazione fallita: ${name}`);
        console.error(`  ❌ ${name}`);
        isValid = false;
      } else if (check) {
        console.log(`  ✅ ${name}`);
      }
    });

    return isValid;
  }

  /**
   * Genera report delle modifiche
   */
  generateReport() {
    const reportPath = path.join(__dirname, '../reports/phase1-naming-conventions-report.md');
    
    const reportContent = `# Fase 1: Naming & Convenzioni - Report Finale

## 📊 Riepilogo Modifiche

**Data Esecuzione**: ${new Date().toISOString()}
**Totale Modifiche**: ${this.changes.length}
**Errori**: ${this.errors.length}

## ✅ Modifiche Applicate

${this.changes.map((change, index) => `${index + 1}. ${change}`).join('\n')}

## ❌ Errori Riscontrati

${this.errors.length > 0 ? this.errors.map((error, index) => `${index + 1}. ${error}`).join('\n') : 'Nessun errore'}

## 📁 File Modificati
- \`backend/prisma/schema.prisma\`: Schema principale aggiornato
- \`backend/prisma/schema.prisma.backup-safe-*\`: Backup di sicurezza

## 🎯 Prossimi Passi
- Fase 2: Indici & Vincoli
- Test funzionalità login
- Validazione performance

## 📋 Checklist Post-Fase
- [ ] Test login funzionante
- [ ] Validazione schema Prisma
- [ ] Performance query invariate
- [ ] Backup verificato
`;

    try {
      const reportsDir = path.dirname(reportPath);
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, reportContent, 'utf8');
      console.log(`📄 Report generato: ${reportPath}`);
    } catch (error) {
      console.error('❌ Errore generazione report:', error.message);
    }
  }

  /**
   * Esegue la standardizzazione completa
   */
  async execute() {
    console.log('🚀 Avvio Fase 1: Naming & Convenzioni\n');
    
    try {
      // 1. Crea backup
      this.createBackup();
      
      // 2. Leggi schema corrente
      let content = this.readSchema();
      console.log(`📖 Schema letto: ${content.length} caratteri\n`);
      
      // 3. Applica trasformazioni
      content = this.removeSuperfluousMaps(content);
      content = this.preserveNecessaryMaps(content);
      content = this.standardizeFormatting(content);
      
      // 4. Valida risultato
      if (!this.validateSchema(content)) {
        throw new Error('Validazione schema fallita');
      }
      
      // 5. Scrivi schema aggiornato
      this.writeSchema(content);
      
      // 6. Genera report
      this.generateReport();
      
      console.log('\n🎉 Fase 1 completata con successo!');
      console.log(`📊 Modifiche applicate: ${this.changes.length}`);
      console.log(`❌ Errori: ${this.errors.length}`);
      
      return {
        success: true,
        changes: this.changes.length,
        errors: this.errors.length
      };
      
    } catch (error) {
      console.error('\n💥 Fase 1 fallita:', error.message);
      this.errors.push(error.message);
      this.generateReport();
      
      return {
        success: false,
        error: error.message,
        changes: this.changes.length,
        errors: this.errors.length
      };
    }
  }
}

// Esecuzione se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const standardizer = new NamingStandardizer();
  
  standardizer.execute().then(result => {
    if (result.success) {
      console.log('\n✅ Standardizzazione completata');
      process.exit(0);
    } else {
      console.error('\n❌ Standardizzazione fallita');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Errore fatale:', error.message);
    process.exit(1);
  });
}

export default NamingStandardizer;