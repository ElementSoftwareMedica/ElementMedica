const fs = require('fs');
const path = require('path');

// Configurazione
const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const DOCS_DIR = path.join(__dirname, '../docs');
const REPORT_PATH = path.join(DOCS_DIR, 'phase3-indices-report.md');

// Assicura che la directory docs esista
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

class Phase3IndicesOptimizer {
  constructor() {
    this.schema = '';
    this.changes = [];
    this.addedIndices = 0;
    this.fixedConstraints = 0;
  }

  // Legge lo schema
  readSchema() {
    console.log('📖 Leggendo schema...');
    this.schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  }

  // Crea backup
  createBackup() {
    const backupPath = `${SCHEMA_PATH}.backup-phase3`;
    console.log('💾 Creando backup...');
    fs.writeFileSync(backupPath, this.schema);
    console.log(`   Backup salvato: ${backupPath}`);
  }

  // Trova tutti i campi che sono foreign keys
  findForeignKeys() {
    const foreignKeys = [];
    const lines = this.schema.split('\n');
    let currentModel = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Identifica il modello corrente
      if (line.startsWith('model ')) {
        currentModel = line.split(' ')[1];
        continue;
      }
      
      // Fine del modello
      if (line === '}' && currentModel) {
        currentModel = null;
        continue;
      }
      
      // Cerca relazioni @relation
      if (currentModel && line.includes('@relation')) {
        // Trova il campo che contiene la foreign key
        const fieldMatch = line.match(/^(\w+)\s+/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          // Se il campo finisce con Id, è probabilmente una FK
          if (fieldName.endsWith('Id') || fieldName.endsWith('_id')) {
            foreignKeys.push({
              model: currentModel,
              field: fieldName,
              line: i + 1
            });
          }
        }
        
        // Cerca anche nei campi references
        const referencesMatch = line.match(/references:\s*\[(\w+)\]/);
        if (referencesMatch) {
          // Trova il campo che fa riferimento
          const fieldsMatch = line.match(/fields:\s*\[(\w+)\]/);
          if (fieldsMatch) {
            const fieldName = fieldsMatch[1];
            foreignKeys.push({
              model: currentModel,
              field: fieldName,
              line: i + 1
            });
          }
        }
      }
    }
    
    return foreignKeys;
  }

  // Trova modelli che hanno già indici
  findExistingIndices() {
    const indices = new Set();
    const lines = this.schema.split('\n');
    let currentModel = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('model ')) {
        currentModel = trimmed.split(' ')[1];
        continue;
      }
      
      if (trimmed === '}') {
        currentModel = null;
        continue;
      }
      
      // Cerca @@index
      if (currentModel && trimmed.includes('@@index')) {
        const indexMatch = trimmed.match(/@@index\(\[(\w+)\]/);
        if (indexMatch) {
          indices.add(`${currentModel}.${indexMatch[1]}`);
        }
      }
      
      // Cerca @db.Index
      if (currentModel && trimmed.includes('@db.Index')) {
        const fieldMatch = trimmed.match(/^(\w+)\s+/);
        if (fieldMatch) {
          indices.add(`${currentModel}.${fieldMatch[1]}`);
        }
      }
    }
    
    return indices;
  }

  // Aggiunge indici mancanti
  addMissingIndices() {
    console.log('🔍 Aggiungendo indici mancanti...');
    
    const foreignKeys = this.findForeignKeys();
    const existingIndices = this.findExistingIndices();
    const lines = this.schema.split('\n');
    
    // Raggruppa FK per modello
    const fksByModel = {};
    for (const fk of foreignKeys) {
      if (!fksByModel[fk.model]) {
        fksByModel[fk.model] = [];
      }
      
      const indexKey = `${fk.model}.${fk.field}`;
      if (!existingIndices.has(indexKey)) {
        fksByModel[fk.model].push(fk.field);
      }
    }
    
    // Aggiunge indici per ogni modello
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      
      // Trova la fine di un modello
      if (line === '}') {
        // Trova il nome del modello
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim();
          if (prevLine.startsWith('model ')) {
            const modelName = prevLine.split(' ')[1];
            
            if (fksByModel[modelName] && fksByModel[modelName].length > 0) {
              // Aggiunge indici prima della chiusura del modello
              const indicesLines = [];
              
              for (const field of fksByModel[modelName]) {
                indicesLines.push(`  @@index([${field}])`);
                this.addedIndices++;
                this.changes.push(`Aggiunto indice su ${modelName}.${field}`);
              }
              
              if (indicesLines.length > 0) {
                indicesLines.push(''); // Riga vuota prima degli indici
                lines.splice(i, 0, ...indicesLines);
              }
            }
            break;
          }
        }
      }
    }
    
    this.schema = lines.join('\n');
  }

  // Aggiunge onDelete mancanti
  addMissingOnDelete() {
    console.log('🔗 Aggiungendo onDelete mancanti...');
    
    const lines = this.schema.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Cerca relazioni senza onDelete
      if (line.includes('@relation') && !line.includes('onDelete')) {
        // Determina il tipo di onDelete appropriato
        let onDeleteAction = 'Cascade';
        
        // Per alcuni campi specifici, usa Restrict
        if (line.includes('tenantId') || line.includes('companyId')) {
          onDeleteAction = 'Restrict';
        }
        
        // Aggiunge onDelete
        const updatedLine = line.replace(
          /@relation\(([^)]+)\)/,
          (match, content) => {
            if (content.includes('onDelete')) {
              return match; // Già presente
            }
            return `@relation(${content}, onDelete: ${onDeleteAction})`;
          }
        );
        
        if (updatedLine !== line) {
          lines[i] = updatedLine;
          this.fixedConstraints++;
          this.changes.push(`Aggiunto onDelete: ${onDeleteAction} alla linea ${i + 1}`);
        }
      }
    }
    
    this.schema = lines.join('\n');
  }

  // Salva lo schema modificato
  saveSchema() {
    console.log('💾 Salvando schema modificato...');
    fs.writeFileSync(SCHEMA_PATH, this.schema);
  }

  // Genera report
  generateReport() {
    const report = `# 📋 REPORT FASE 3: INDICI & VINCOLI

**Data**: ${new Date().toISOString()}
**Schema**: ${SCHEMA_PATH}
**Backup**: ${SCHEMA_PATH}.backup-phase3

## ✅ MODIFICHE APPLICATE

### Indici Aggiunti (${this.addedIndices})
${this.changes.filter(c => c.includes('indice')).map(c => `- ${c}`).join('\n')}

### Vincoli Aggiunti (${this.fixedConstraints})
${this.changes.filter(c => c.includes('onDelete')).map(c => `- ${c}`).join('\n')}

## 🎯 RISULTATI

- **Indici aggiunti**: ${this.addedIndices}
- **Vincoli aggiunti**: ${this.fixedConstraints}
- **Problemi risolti**: ${this.addedIndices + this.fixedConstraints}

## 📋 PROSSIMI PASSI

1. ✅ **Fase 3 completata**: Indici e vincoli ottimizzati
2. 🔄 **Prossima fase**: Fase 4 - Multi-tenancy
3. 🧪 **Testing**: Verificare performance delle query
4. 🗄️ **Migrazione**: Aggiornare database

---
*Report generato automaticamente - Fase 3 Optimizer*
`;

    fs.writeFileSync(REPORT_PATH, report);
    console.log(`\n📋 Report salvato in: ${REPORT_PATH}`);
  }

  // Esegue l'ottimizzazione
  async run() {
    try {
      console.log('🔧 Avvio Fase 3: Indici & Vincoli...');
      
      this.readSchema();
      this.createBackup();
      this.addMissingIndices();
      this.addMissingOnDelete();
      this.saveSchema();
      this.generateReport();
      
      console.log(`\n🎯 RISULTATI FASE 3:`);
      console.log(`   Indici aggiunti: ${this.addedIndices}`);
      console.log(`   Vincoli aggiunti: ${this.fixedConstraints}`);
      console.log(`   Problemi risolti: ${this.addedIndices + this.fixedConstraints}`);
      console.log('✅ Fase 3 completata!');
      
    } catch (error) {
      console.error('❌ Errore durante Fase 3:', error.message);
      process.exit(1);
    }
  }
}

// Esegue l'ottimizzazione
if (require.main === module) {
  const optimizer = new Phase3IndicesOptimizer();
  optimizer.run();
}

module.exports = Phase3IndicesOptimizer;