#!/usr/bin/env node
/**
 * Fase 2: Indici & Vincoli - Ottimizzazione Performance Schema Prisma
 * 
 * Questo script:
 * 1. Analizza gli indici esistenti
 * 2. Aggiunge indici compositi strategici
 * 3. Ottimizza performance query multi-tenant
 * 4. Mantiene integrità referenziale
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const BACKUP_DIR = path.join(__dirname, '../prisma/backups');

class IndicesOptimizer {
  constructor() {
    this.changes = [];
    this.errors = [];
    this.addedIndices = [];
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
      const backupPath = path.join(BACKUP_DIR, `schema-pre-phase2-${timestamp}.prisma`);
      
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
   * Analizza gli indici esistenti
   */
  analyzeExistingIndices(content) {
    console.log('🔍 Analisi indici esistenti...');
    
    const indexPattern = /@@index\(\[([^\]]+)\]\)/g;
    const existingIndices = [];
    let match;
    
    while ((match = indexPattern.exec(content)) !== null) {
      existingIndices.push(match[1]);
    }
    
    console.log(`  📊 Trovati ${existingIndices.length} indici esistenti:`);
    existingIndices.forEach(index => {
      console.log(`    - ${index}`);
    });
    
    return existingIndices;
  }

  /**
   * Aggiunge indici compositi strategici per performance
   */
  addCompositeIndices(content) {
    console.log('🔄 Aggiunta indici compositi strategici...');
    
    const compositeIndices = [
      {
        model: 'Person',
        indices: [
          '@@index([tenantId, status])',
          '@@index([companyId, tenantId])',
          '@@index([email, tenantId])',
          '@@index([status, isVerified])'
        ]
      },
      {
        model: 'PersonRole',
        indices: [
          '@@index([personId, isActive])',
          '@@index([tenantId, roleType])',
          '@@index([companyId, roleType, isActive])'
        ]
      },
      {
        model: 'Course',
        indices: [
          '@@index([tenantId, status])',
          '@@index([companyId, status])',
          '@@index([status, createdAt])'
        ]
      },
      {
        model: 'CourseSchedule',
        indices: [
          '@@index([startDate, endDate])',
          '@@index([tenantId, startDate])',
          '@@index([companyId, startDate])'
        ]
      },
      {
        model: 'CourseEnrollment',
        indices: [
          '@@index([personId, status])',
          '@@index([scheduleId, status])',
          '@@index([tenantId, status])'
        ]
      },
      {
        model: 'ActivityLog',
        indices: [
          '@@index([personId, timestamp])',
          '@@index([action, timestamp])',
          '@@index([timestamp])' // Per cleanup automatico
        ]
      },
      {
        model: 'RefreshToken',
        indices: [
          '@@index([personId, expiresAt])',
          '@@index([expiresAt])' // Per cleanup automatico
        ]
      }
    ];

    let updatedContent = content;
    
    compositeIndices.forEach(({ model, indices }) => {
      // Trova il modello nel contenuto con regex più robusta
      const modelPattern = new RegExp(`(model\\s+${model}\\s*\\{[\\s\\S]*?)(\\n\\})`);
      const modelMatch = updatedContent.match(modelPattern);
      
      if (modelMatch && modelMatch.length > 2) {
        const fullMatch = modelMatch[0];
        const modelContent = modelMatch[1];
        const modelEnd = modelMatch[2];
        
        // Verifica quali indici non esistono già
        const newIndices = indices.filter(index => {
          const indexFields = index.match(/\[([^\]]+)\]/)[1];
          return !fullMatch.includes(`@@index([${indexFields}])`);
        });
        
        if (newIndices.length > 0) {
          const indicesText = newIndices.map(index => `  ${index}`).join('\n');
          const updatedModel = `${modelContent}\n${indicesText}${modelEnd}`;
          
          updatedContent = updatedContent.replace(fullMatch, updatedModel);
          
          this.addedIndices.push(...newIndices.map(index => `${model}: ${index}`));
          this.changes.push(`Aggiunti ${newIndices.length} indici compositi al modello ${model}`);
          console.log(`  ✅ ${model}: ${newIndices.length} nuovi indici`);
        } else {
          console.log(`  ℹ️  ${model}: tutti gli indici già presenti`);
        }
      } else {
        console.log(`  ⚠️  Modello ${model} non trovato`);
      }
    });
    
    return updatedContent;
  }

  /**
   * Ottimizza indici per query GDPR e audit
   */
  optimizeGDPRIndices(content) {
    console.log('🔄 Ottimizzazione indici GDPR e audit...');
    
    const gdprOptimizations = [
      {
        model: 'GdprAuditLog',
        indices: [
          '@@index([personId, action, timestamp])',
          '@@index([dataType, timestamp])',
          '@@index([legalBasis])'
        ]
      },
      {
        model: 'ConsentRecord',
        indices: [
          '@@index([personId, consentType])',
          '@@index([consentType, consentGiven])',
          '@@index([consentDate])'
        ]
      }
    ];

    let updatedContent = content;
    
    gdprOptimizations.forEach(({ model, indices }) => {
      const modelPattern = new RegExp(`(model\\s+${model}\\s*\\{[\\s\\S]*?)(\\n\\})`);
      const modelMatch = updatedContent.match(modelPattern);
      
      if (modelMatch && modelMatch.length > 2) {
        const fullMatch = modelMatch[0];
        const modelContent = modelMatch[1];
        const modelEnd = modelMatch[2];
        
        const newIndices = indices.filter(index => {
          const indexFields = index.match(/\[([^\]]+)\]/)[1];
          return !fullMatch.includes(`@@index([${indexFields}])`);
        });
        
        if (newIndices.length > 0) {
          const indicesText = newIndices.map(index => `  ${index}`).join('\n');
          const updatedModel = `${modelContent}\n${indicesText}${modelEnd}`;
          
          updatedContent = updatedContent.replace(fullMatch, updatedModel);
          
          this.addedIndices.push(...newIndices.map(index => `${model}: ${index}`));
          this.changes.push(`Ottimizzati indici GDPR per ${model}`);
          console.log(`  ✅ ${model}: ${newIndices.length} indici GDPR`);
        }
      }
    });
    
    return updatedContent;
  }

  /**
   * Aggiunge vincoli di integrità referenziale
   */
  addIntegrityConstraints(content) {
    console.log('🔄 Aggiunta vincoli integrità referenziale...');
    
    // Verifica che le relazioni abbiano onDelete appropriati
    const relationChecks = [
      {
        pattern: /Person.*@relation.*onDelete:\s*Cascade/g,
        description: 'Relazioni Person con Cascade'
      },
      {
        pattern: /Company.*@relation.*onDelete:\s*Restrict/g,
        description: 'Relazioni Company con Restrict'
      },
      {
        pattern: /Tenant.*@relation.*onDelete:\s*Restrict/g,
        description: 'Relazioni Tenant con Restrict'
      }
    ];

    relationChecks.forEach(({ pattern, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`  ✅ ${description}: ${matches.length} trovate`);
      } else {
        console.log(`  ⚠️  ${description}: nessuna trovata`);
      }
    });

    this.changes.push('Verificati vincoli integrità referenziale');
    return content;
  }

  /**
   * Valida gli indici aggiunti
   */
  validateIndices(content) {
    console.log('🔄 Validazione indici...');
    
    const validationChecks = [
      {
        name: 'Indici tenantId per multi-tenancy',
        check: (content.match(/@@index\(\[tenantId/g) || []).length >= 5,
        required: true
      },
      {
        name: 'Indici compositi performance',
        check: (content.match(/@@index\(\[[^\]]+,\s*[^\]]+\]/g) || []).length >= 10,
        required: true
      },
      {
        name: 'Indici timestamp per cleanup',
        check: content.includes('@@index([timestamp])'),
        required: true
      },
      {
        name: 'Indici GDPR compliance',
        check: content.includes('@@index([personId, action, timestamp])'),
        required: false
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
      } else {
        console.log(`  ⚠️  ${name} (opzionale)`);
      }
    });

    return isValid;
  }

  /**
   * Genera report delle modifiche
   */
  generateReport() {
    const reportPath = path.join(__dirname, '../reports/phase2-indices-optimization-report.md');
    
    const reportContent = `# Fase 2: Indici & Vincoli - Report Finale

## 📊 Riepilogo Ottimizzazioni

**Data Esecuzione**: ${new Date().toISOString()}
**Indici Aggiunti**: ${this.addedIndices.length}
**Modifiche Totali**: ${this.changes.length}
**Errori**: ${this.errors.length}

## 🚀 Indici Compositi Aggiunti

${this.addedIndices.map((index, i) => `${i + 1}. ${index}`).join('\n')}

## ✅ Modifiche Applicate

${this.changes.map((change, index) => `${index + 1}. ${change}`).join('\n')}

## ❌ Errori Riscontrati

${this.errors.length > 0 ? this.errors.map((error, index) => `${index + 1}. ${error}`).join('\n') : 'Nessun errore'}

## 🎯 Benefici Performance

### Multi-Tenancy
- Indici compositi \`[tenantId, status]\` per isolamento tenant
- Indici \`[companyId, tenantId]\` per sicurezza
- Query filtrate per tenant ottimizzate

### Query Frequenti
- Indici \`[personId, isActive]\` per ruoli attivi
- Indici \`[startDate, endDate]\` per range temporali
- Indici \`[status, createdAt]\` per ordinamenti

### GDPR & Audit
- Indici \`[personId, action, timestamp]\` per audit trail
- Indici \`[timestamp]\` per cleanup automatico
- Indici \`[consentType, consentGiven]\` per compliance

## 📁 File Modificati
- \`backend/prisma/schema.prisma\`: Schema con indici ottimizzati
- \`backend/prisma/backups/schema-pre-phase2-*\`: Backup pre-ottimizzazione

## 🎯 Prossimi Passi
- Fase 3: Relazioni & onDelete
- Test performance query
- Monitoraggio utilizzo indici

## 📋 Checklist Post-Fase
- [ ] Test login funzionante
- [ ] Performance query migliorate
- [ ] Indici utilizzati correttamente
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
   * Esegue l'ottimizzazione completa degli indici
   */
  async execute() {
    console.log('🚀 Avvio Fase 2: Indici & Vincoli\n');
    
    try {
      // 1. Crea backup
      this.createBackup();
      
      // 2. Leggi schema corrente
      let content = this.readSchema();
      console.log(`📖 Schema letto: ${content.length} caratteri\n`);
      
      // 3. Analizza indici esistenti
      this.analyzeExistingIndices(content);
      console.log();
      
      // 4. Applica ottimizzazioni
      content = this.addCompositeIndices(content);
      content = this.optimizeGDPRIndices(content);
      content = this.addIntegrityConstraints(content);
      
      // 5. Valida risultato
      if (!this.validateIndices(content)) {
        throw new Error('Validazione indici fallita');
      }
      
      // 6. Scrivi schema aggiornato
      this.writeSchema(content);
      
      // 7. Genera report
      this.generateReport();
      
      console.log('\n🎉 Fase 2 completata con successo!');
      console.log(`📊 Indici aggiunti: ${this.addedIndices.length}`);
      console.log(`✅ Modifiche applicate: ${this.changes.length}`);
      console.log(`❌ Errori: ${this.errors.length}`);
      
      return {
        success: true,
        indicesAdded: this.addedIndices.length,
        changes: this.changes.length,
        errors: this.errors.length
      };
      
    } catch (error) {
      console.error('\n💥 Fase 2 fallita:', error.message);
      this.errors.push(error.message);
      this.generateReport();
      
      return {
        success: false,
        error: error.message,
        indicesAdded: this.addedIndices.length,
        changes: this.changes.length,
        errors: this.errors.length
      };
    }
  }
}

// Esecuzione se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new IndicesOptimizer();
  
  optimizer.execute().then(result => {
    if (result.success) {
      console.log('\n✅ Ottimizzazione indici completata');
      process.exit(0);
    } else {
      console.error('\n❌ Ottimizzazione indici fallita');
      process.exit(1);
    }
  }).catch(error => {
    console.error('\n💥 Errore fatale:', error.message);
    process.exit(1);
  });
}

export default IndicesOptimizer;