import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Phase1NamingOptimizer {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.schemaPath = path.join(this.projectRoot, 'backend/prisma/schema.prisma');
    this.backupDir = path.join(__dirname, '../backups/phase1-naming');
    this.changes = [];
    this.snakeCaseFields = [];
    this.superfluousMaps = [];
  }

  /**
   * Esegue la Fase 1: Naming & Convenzioni
   */
  async execute() {
    console.log('🚀 Fase 1: Naming & Convenzioni - INIZIO');
    console.log('=' .repeat(50));

    try {
      // 1. Backup
      await this.createBackup();
      
      // 2. Analisi schema
      await this.analyzeSchema();
      
      // 3. Conversione naming
      await this.convertNaming();
      
      // 4. Rimozione @map superflui
      await this.removeSuperfluousMaps();
      
      // 5. Validazione
      await this.validateChanges();
      
      // 6. Report finale
      this.generateReport();
      
      console.log('✅ Fase 1 completata con successo!');
      
    } catch (error) {
      console.error('❌ Errore durante Fase 1:', error.message);
      await this.rollback();
      throw error;
    }
  }

  /**
   * Crea backup dello schema
   */
  async createBackup() {
    console.log('📦 Creazione backup...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `schema-${timestamp}.prisma`);
    
    fs.copyFileSync(this.schemaPath, backupPath);
    console.log(`✅ Backup creato: ${backupPath}`);
  }

  /**
   * Analizza lo schema per identificare problemi naming
   */
  async analyzeSchema() {
    console.log('🔍 Analisi schema per naming issues...');
    
    const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    const lines = schemaContent.split('\n');
    
    let currentModel = null;
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Identifica modello corrente
      const modelMatch = line.match(/^model\s+(\w+)\s*{/);
      if (modelMatch) {
        currentModel = modelMatch[1];
        continue;
      }
      
      // Fine modello
      if (line.trim() === '}' && currentModel) {
        currentModel = null;
        continue;
      }
      
      if (currentModel) {
        // Cerca campi snake_case
        const fieldMatch = line.match(/^\s+(\w+)\s+/);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          
          if (this.isSnakeCase(fieldName)) {
            this.snakeCaseFields.push({
              model: currentModel,
              field: fieldName,
              camelCase: this.toCamelCase(fieldName),
              line: lineNumber,
              content: line.trim()
            });
          }
          
          // Cerca @map superflui
          const mapMatch = line.match(/@map\("([^"]+)"\)/);
          if (mapMatch) {
            const mapValue = mapMatch[1];
            const camelCaseField = this.toCamelCase(fieldName);
            
            // Se il @map corrisponde al nome camelCase, è superfluo
            if (mapValue === fieldName || mapValue === camelCaseField) {
              this.superfluousMaps.push({
                model: currentModel,
                field: fieldName,
                mapValue: mapValue,
                line: lineNumber,
                content: line.trim()
              });
            }
          }
        }
      }
    }
    
    console.log(`📊 Trovati ${this.snakeCaseFields.length} campi snake_case`);
    console.log(`📊 Trovati ${this.superfluousMaps.length} @map superflui`);
  }

  /**
   * Converte naming da snake_case a camelCase
   */
  async convertNaming() {
    console.log('🔄 Conversione naming snake_case → camelCase...');
    
    let schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    
    for (const field of this.snakeCaseFields) {
      const oldPattern = new RegExp(
        `(\\s+)${field.field}(\\s+)`,
        'g'
      );
      
      schemaContent = schemaContent.replace(
        oldPattern,
        `$1${field.camelCase}$2`
      );
      
      this.changes.push({
        type: 'FIELD_RENAME',
        model: field.model,
        from: field.field,
        to: field.camelCase
      });
      
      console.log(`  ✅ ${field.model}.${field.field} → ${field.camelCase}`);
    }
    
    fs.writeFileSync(this.schemaPath, schemaContent);
    console.log(`✅ ${this.snakeCaseFields.length} campi convertiti`);
  }

  /**
   * Rimuove @map superflui
   */
  async removeSuperfluousMaps() {
    console.log('🗑️  Rimozione @map superflui...');
    
    let schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    
    for (const mapItem of this.superfluousMaps) {
      // Rimuovi @map("value") dalla linea
      const mapPattern = new RegExp(
        `\\s*@map\\("${mapItem.mapValue}"\\)`,
        'g'
      );
      
      schemaContent = schemaContent.replace(mapPattern, '');
      
      this.changes.push({
        type: 'MAP_REMOVAL',
        model: mapItem.model,
        field: mapItem.field,
        removedMap: mapItem.mapValue
      });
      
      console.log(`  ✅ Rimosso @map("${mapItem.mapValue}") da ${mapItem.model}.${mapItem.field}`);
    }
    
    fs.writeFileSync(this.schemaPath, schemaContent);
    console.log(`✅ ${this.superfluousMaps.length} @map rimossi`);
  }

  /**
   * Valida le modifiche
   */
  async validateChanges() {
    console.log('✅ Validazione modifiche...');
    
    try {
      // Verifica sintassi Prisma
      const { execSync } = await import('child_process');
      execSync('npx prisma validate', { 
        cwd: path.join(this.projectRoot, 'backend'),
        stdio: 'pipe'
      });
      
      console.log('✅ Schema Prisma valido');
      
    } catch (error) {
      throw new Error(`Schema non valido: ${error.message}`);
    }
  }

  /**
   * Genera report delle modifiche
   */
  generateReport() {
    console.log('\n📋 REPORT FASE 1 - NAMING & CONVENZIONI');
    console.log('=' .repeat(50));
    
    console.log(`\n🔄 Campi Convertiti (${this.snakeCaseFields.length}):`);
    this.snakeCaseFields.forEach(field => {
      console.log(`  • ${field.model}.${field.field} → ${field.camelCase}`);
    });
    
    console.log(`\n🗑️  @map Rimossi (${this.superfluousMaps.length}):`);
    this.superfluousMaps.forEach(map => {
      console.log(`  • ${map.model}.${map.field}: @map("${map.mapValue}")`);
    });
    
    console.log(`\n📊 Totale Modifiche: ${this.changes.length}`);
    
    // Salva report
    const reportPath = path.join(this.backupDir, 'phase1-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      phase: 1,
      snakeCaseFields: this.snakeCaseFields,
      superfluousMaps: this.superfluousMaps,
      changes: this.changes
    }, null, 2));
    
    console.log(`\n💾 Report salvato: ${reportPath}`);
  }

  /**
   * Rollback in caso di errore
   */
  async rollback() {
    console.log('🔄 Rollback in corso...');
    
    const backupFiles = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('schema-'))
      .sort()
      .reverse();
    
    if (backupFiles.length > 0) {
      const latestBackup = path.join(this.backupDir, backupFiles[0]);
      fs.copyFileSync(latestBackup, this.schemaPath);
      console.log(`✅ Rollback completato da: ${latestBackup}`);
    }
  }

  /**
   * Utility: verifica se stringa è snake_case
   */
  isSnakeCase(str) {
    return /^[a-z]+(_[a-z]+)+$/.test(str);
  }

  /**
   * Utility: converte snake_case in camelCase
   */
  toCamelCase(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }
}

// Esecuzione se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new Phase1NamingOptimizer();
  optimizer.execute().catch(console.error);
}

export default Phase1NamingOptimizer;