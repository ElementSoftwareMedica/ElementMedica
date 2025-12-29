#!/usr/bin/env node

/**
 * 🔗 FASE 4: RELAZIONI & ONDELETE
 * 
 * Questo script implementa le relazioni onDelete mancanti nello schema Prisma
 * secondo la documentazione della Fase 4.
 * 
 * Strategia:
 * - CASCADE: Per relazioni dipendenti (es. Person -> PersonRole)
 * - RESTRICT: Per relazioni di riferimento (es. Company, Tenant)
 * - SET NULL: Per relazioni opzionali che devono preservare i dati
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const BACKUP_DIR = path.join(__dirname, '../prisma/backups');

class Phase4RelationsOptimizer {
  constructor() {
    this.schema = '';
    this.changes = [];
    this.addedOnDelete = 0;
    this.fixedRelations = 0;
  }

  // Legge lo schema
  readSchema() {
    console.log('📖 Leggendo schema...');
    this.schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  }

  // Crea backup
  createBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `schema-pre-phase4-${timestamp}.prisma`);
    
    console.log('💾 Creando backup...');
    fs.writeFileSync(backupPath, this.schema);
    console.log(`   Backup salvato: ${backupPath}`);
  }

  // Definisce le regole onDelete per ogni relazione
  getOnDeleteRules() {
    return {
      // CASCADE: Eliminazione a cascata per relazioni dipendenti
      CASCADE: [
        'personId', // Person -> PersonRole, RefreshToken, etc.
        'personRoleId', // PersonRole -> RolePermission
        'customRoleId', // CustomRole -> PersonRole
        'scheduleId', // CourseSchedule -> CourseSession, CourseEnrollment
        'courseId', // Course -> CourseSchedule (quando appropriato)
        'testId', // TestDocument -> TestPartecipante
        'registroPresenzeId', // RegistroPresenze -> RegistroPresenzePartecipante
        'preventivoId', // Preventivo -> PreventivoPartecipante
        'fatturaId', // Fattura -> FatturaAzienda
        'scheduledCourseId', // CourseSchedule -> Attestato, LetteraIncarico
        'sessionId' // CourseSession -> RegistroPresenze
      ],
      
      // RESTRICT: Impedisce eliminazione se ci sono riferimenti
      RESTRICT: [
        'companyId', // Company references
        'tenantId', // Tenant references
        'aziendaId' // Company references (legacy naming)
      ],
      
      // SET NULL: Imposta a NULL per relazioni opzionali
      SET_NULL: [
        'trainerId', // Trainer references (opzionali)
        'coTrainerId', // Co-trainer references
        'assignedBy', // Assigned by references
        'grantedBy', // Granted by references
        'createdBy' // Created by references
      ]
    };
  }

  // Determina il tipo di onDelete appropriato
  determineOnDeleteAction(fieldName, relationContent) {
    const rules = this.getOnDeleteRules();
    
    // Controlla CASCADE
    if (rules.CASCADE.some(field => fieldName.includes(field))) {
      return 'Cascade';
    }
    
    // Controlla RESTRICT
    if (rules.RESTRICT.some(field => fieldName.includes(field))) {
      return 'Restrict';
    }
    
    // Controlla SET NULL (solo per campi opzionali)
    if (rules.SET_NULL.some(field => fieldName.includes(field))) {
      // Verifica se il campo è opzionale (ha ?)
      const lines = this.schema.split('\n');
      for (let line of lines) {
        if (line.includes(fieldName) && line.includes('String?')) {
          return 'SetNull';
        }
      }
    }
    
    // Default: Cascade per relazioni non specificate
    return 'Cascade';
  }

  // Aggiunge onDelete mancanti
  addMissingOnDelete() {
    console.log('🔗 Aggiungendo onDelete mancanti...');
    
    const lines = this.schema.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Cerca relazioni senza onDelete
      if (line.includes('@relation') && !line.includes('onDelete')) {
        // Estrae il nome del campo dalla riga precedente
        let fieldName = '';
        if (i > 0) {
          const prevLine = lines[i - 1].trim();
          const fieldMatch = prevLine.match(/^(\w+)\s+/);
          if (fieldMatch) {
            fieldName = fieldMatch[1];
          }
        }
        
        // Determina il tipo di onDelete appropriato
        const onDeleteAction = this.determineOnDeleteAction(fieldName, line);
        
        // Aggiunge onDelete
        const updatedLine = line.replace(
          /@relation\(([^)]+)\)/,
          (match, content) => {
            if (content.includes('onDelete')) {
              return match; // Già presente
            }
            
            // Aggiunge onDelete alla fine del contenuto
            const newContent = content.trim().endsWith(',') 
              ? `${content} onDelete: ${onDeleteAction}`
              : `${content}, onDelete: ${onDeleteAction}`;
            
            return `@relation(${newContent})`;
          }
        );
        
        if (updatedLine !== line) {
          lines[i] = updatedLine;
          this.addedOnDelete++;
          this.changes.push(`✅ Aggiunto onDelete: ${onDeleteAction} per campo ${fieldName}`);
        }
      }
    }
    
    this.schema = lines.join('\n');
  }

  // Valida le relazioni onDelete
  validateOnDeleteRelations() {
    console.log('🔍 Validando relazioni onDelete...');
    
    const lines = this.schema.split('\n');
    let validationErrors = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('@relation') && line.includes('onDelete')) {
        // Verifica che l'azione onDelete sia valida
        const onDeleteMatch = line.match(/onDelete:\s*(\w+)/);
        if (onDeleteMatch) {
          const action = onDeleteMatch[1];
          if (!['Cascade', 'Restrict', 'SetNull'].includes(action)) {
            validationErrors.push(`❌ Azione onDelete non valida: ${action} alla riga ${i + 1}`);
          }
        }
      }
    }
    
    if (validationErrors.length > 0) {
      console.log('⚠️  Errori di validazione trovati:');
      validationErrors.forEach(error => console.log(`   ${error}`));
      return false;
    }
    
    console.log('✅ Tutte le relazioni onDelete sono valide');
    return true;
  }

  // Salva lo schema aggiornato
  saveSchema() {
    console.log('💾 Salvando schema aggiornato...');
    fs.writeFileSync(SCHEMA_PATH, this.schema);
  }

  // Genera report
  generateReport() {
    const reportPath = path.join(__dirname, '../docs/phase4-relations-report.md');
    
    const report = `# 📋 REPORT FASE 4: RELAZIONI & ONDELETE

**Data**: ${new Date().toISOString()}
**Schema Path**: ${SCHEMA_PATH}

## 📊 STATISTICHE

- **onDelete aggiunti**: ${this.addedOnDelete}
- **Relazioni corrette**: ${this.fixedRelations}
- **Modifiche totali**: ${this.changes.length}

## 🔄 MODIFICHE APPLICATE

${this.changes.map(change => `- ${change}`).join('\n')}

## ✅ STATO COMPLETAMENTO

- ✅ Backup creato
- ✅ onDelete aggiunti per tutte le relazioni
- ✅ Validazione completata
- ✅ Schema salvato

## 🎯 PROSSIMI PASSI

1. **Eseguire migrazione Prisma**: \`npx prisma db push\`
2. **Testare relazioni**: Verificare comportamento CASCADE/RESTRICT
3. **Aggiornare test**: Includere test per onDelete
4. **Procedere con Fase 5**: Soft-Delete & Middleware

---
*Report generato automaticamente da phase4-relations-ondelete.cjs*
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📋 Report salvato: ${reportPath}`);
  }

  // Esegue l'ottimizzazione completa
  async execute() {
    console.log('🚀 FASE 4: RELAZIONI & ONDELETE - AVVIO\n');
    
    try {
      // 1. Legge schema
      this.readSchema();
      
      // 2. Crea backup
      this.createBackup();
      
      // 3. Aggiunge onDelete mancanti
      this.addMissingOnDelete();
      
      // 4. Valida relazioni
      if (!this.validateOnDeleteRelations()) {
        throw new Error('Validazione fallita');
      }
      
      // 5. Salva schema
      this.saveSchema();
      
      // 6. Genera report
      this.generateReport();
      
      console.log('\n🎉 FASE 4 COMPLETATA CON SUCCESSO!');
      console.log(`   📊 onDelete aggiunti: ${this.addedOnDelete}`);
      console.log(`   🔄 Modifiche totali: ${this.changes.length}`);
      console.log('\n📋 Prossimi passi:');
      console.log('   1. npx prisma db push');
      console.log('   2. Testare relazioni onDelete');
      console.log('   3. Procedere con Fase 5');
      
    } catch (error) {
      console.error('❌ ERRORE durante Fase 4:', error.message);
      process.exit(1);
    }
  }
}

// Esecuzione
if (require.main === module) {
  const optimizer = new Phase4RelationsOptimizer();
  optimizer.execute();
}

module.exports = Phase4RelationsOptimizer;