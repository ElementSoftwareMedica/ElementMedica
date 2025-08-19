# 🧹 Fase 10: Pulizia Generale

## ✅ STATO: OTTIMIZZAZIONI COMPLETATE

**Data Completamento:** Dicembre 2024  
**Interventi Principali:** Unificazione Client Prisma e Middleware Soft-Delete  
**Documentazione:** [Fase 10 Completamento](./fase_10_completamento_ottimizzazioni.md)

### 🎯 Risultati Ottenuti
- ✅ **Client Prisma Unificato** - Tutti i file critici aggiornati
- ✅ **Middleware Soft-Delete** - Implementato per 26+ modelli
- ✅ **Configurazione Ottimizzata** - Logging e performance migliorati
- ✅ **Script di Test** - Creato per validazione login
- ⏳ **Test Completi** - In attesa avvio server

---

## 📋 Obiettivi Originali

### Obiettivi Primari
- **Rimozione Obsoleti**: Eliminazione modelli, campi e commenti obsoleti
- **Ottimizzazione @map**: Rimozione `@map` superflui dopo standardizzazione naming
- **Validazione Schema**: Verifica corrispondenza `@@map` con tabelle database
- **Cleanup Codice**: Pulizia codice non utilizzato e import obsoleti
- **Documentazione**: Aggiornamento documentazione finale

### Obiettivi Secondari
- **Performance**: Ottimizzazione finale performance schema
- **Manutenibilità**: Miglioramento leggibilità e manutenibilità
- **Conformità**: Verifica conformità standard e best practices
- **Testing**: Validazione completa funzionalità

## 🎯 Task Dettagliati

### 10.1 Analisi Modelli e Campi Obsoleti

#### 10.1.1 Identificazione Modelli Obsoleti
```bash
# Script per identificare modelli obsoleti
grep -n "^model" prisma/schema.prisma | while read line; do
  model_name=$(echo $line | awk '{print $2}')
  echo "Checking model: $model_name"
  
  # Cerca utilizzo nel codice
  find backend -name "*.js" -exec grep -l "$model_name" {} \; | wc -l
done
```

**Modelli Candidati per Rimozione:**
- `User` (sostituito da `Person`)
- `Employee` (integrato in `Person` con ruoli)
- `Role` (sostituito da `PersonRole`)
- `UserRole` (sostituito da `PersonRole`)
- `OldAuditLog` (sostituito da `GdprAuditLog`)

#### 10.1.2 Script Analisi Utilizzo Modelli
```javascript
// backend/scripts/analyze-model-usage.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ModelUsageAnalyzer {
  constructor() {
    this.schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
    this.backendPath = path.join(__dirname, '../');
    this.frontendPath = path.join(__dirname, '../../frontend');
  }
  
  // Estrai tutti i modelli dal schema
  extractModels() {
    const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    const modelRegex = /^model\s+(\w+)\s*{/gm;
    const models = [];
    let match;
    
    while ((match = modelRegex.exec(schemaContent)) !== null) {
      models.push(match[1]);
    }
    
    return models;
  }
  
  // Analizza utilizzo di un modello
  analyzeModelUsage(modelName) {
    const usage = {
      model: modelName,
      backendFiles: [],
      frontendFiles: [],
      prismaQueries: [],
      totalReferences: 0
    };
    
    try {
      // Cerca nel backend
      const backendResult = execSync(
        `find ${this.backendPath} -name "*.js" -exec grep -l "${modelName}" {} \;`,
        { encoding: 'utf8' }
      );
      
      if (backendResult.trim()) {
        usage.backendFiles = backendResult.trim().split('\n');
      }
      
      // Cerca nel frontend
      if (fs.existsSync(this.frontendPath)) {
        const frontendResult = execSync(
          `find ${this.frontendPath} -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "${modelName}" 2>/dev/null || true`,
          { encoding: 'utf8' }
        );
        
        if (frontendResult.trim()) {
          usage.frontendFiles = frontendResult.trim().split('\n').filter(f => f);
        }
      }
      
      // Cerca query Prisma specifiche
      const queryPatterns = [
        `prisma.${modelName.toLowerCase()}`,
        `${modelName.toLowerCase()}.create`,
        `${modelName.toLowerCase()}.update`,
        `${modelName.toLowerCase()}.delete`,
        `${modelName.toLowerCase()}.findMany`,
        `${modelName.toLowerCase()}.findFirst`,
        `${modelName.toLowerCase()}.findUnique`
      ];
      
      queryPatterns.forEach(pattern => {
        try {
          const queryResult = execSync(
            `find ${this.backendPath} -name "*.js" -exec grep -l "${pattern}" {} \;`,
            { encoding: 'utf8' }
          );
          
          if (queryResult.trim()) {
            usage.prismaQueries.push({
              pattern,
              files: queryResult.trim().split('\n')
            });
          }
        } catch (e) {
          // Pattern non trovato
        }
      });
      
      usage.totalReferences = usage.backendFiles.length + usage.frontendFiles.length;
      
    } catch (error) {
      console.warn(`Error analyzing ${modelName}:`, error.message);
    }
    
    return usage;
  }
  
  // Analizza tutti i modelli
  analyzeAllModels() {
    const models = this.extractModels();
    const analysis = {
      timestamp: new Date().toISOString(),
      totalModels: models.length,
      models: {},
      obsoleteModels: [],
      activeModels: []
    };
    
    console.log(`Analyzing ${models.length} models...`);
    
    models.forEach(model => {
      console.log(`Analyzing model: ${model}`);
      const usage = this.analyzeModelUsage(model);
      analysis.models[model] = usage;
      
      if (usage.totalReferences === 0 && usage.prismaQueries.length === 0) {
        analysis.obsoleteModels.push(model);
      } else {
        analysis.activeModels.push(model);
      }
    });
    
    return analysis;
  }
  
  // Genera report
  generateReport() {
    const analysis = this.analyzeAllModels();
    
    console.log('\n=== MODEL USAGE ANALYSIS REPORT ===');
    console.log(`Total Models: ${analysis.totalModels}`);
    console.log(`Active Models: ${analysis.activeModels.length}`);
    console.log(`Obsolete Models: ${analysis.obsoleteModels.length}`);
    
    if (analysis.obsoleteModels.length > 0) {
      console.log('\n🗑️  OBSOLETE MODELS (candidates for removal):');
      analysis.obsoleteModels.forEach(model => {
        console.log(`  - ${model}`);
      });
    }
    
    console.log('\n📊 DETAILED USAGE:');
    Object.entries(analysis.models).forEach(([model, usage]) => {
      console.log(`\n${model}:`);
      console.log(`  Backend files: ${usage.backendFiles.length}`);
      console.log(`  Frontend files: ${usage.frontendFiles.length}`);
      console.log(`  Prisma queries: ${usage.prismaQueries.length}`);
      
      if (usage.prismaQueries.length > 0) {
        usage.prismaQueries.forEach(query => {
          console.log(`    - ${query.pattern}: ${query.files.length} files`);
        });
      }
    });
    
    // Salva report dettagliato
    const reportPath = path.join(__dirname, '../reports/model-usage-analysis.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return analysis;
  }
}

// Esegui analisi se chiamato direttamente
if (require.main === module) {
  const analyzer = new ModelUsageAnalyzer();
  analyzer.generateReport();
}

module.exports = ModelUsageAnalyzer;
```

### 10.2 Rimozione Modelli Obsoleti

#### 10.2.1 Backup e Rimozione Sicura
```javascript
// backend/scripts/remove-obsolete-models.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ObsoleteModelRemover {
  constructor() {
    this.schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
    this.backupPath = path.join(__dirname, '../backups');
    
    // Modelli confermati come obsoleti
    this.obsoleteModels = [
      'User',
      'Employee', 
      'Role',
      'UserRole',
      'OldAuditLog'
    ];
  }
  
  // Crea backup dello schema
  createBackup() {
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(this.backupPath, `schema-backup-${timestamp}.prisma`);
    
    fs.copyFileSync(this.schemaPath, backupFile);
    console.log(`✅ Schema backup created: ${backupFile}`);
    
    return backupFile;
  }
  
  // Rimuovi modello dallo schema
  removeModelFromSchema(modelName) {
    let schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    
    // Pattern per trovare il modello completo
    const modelPattern = new RegExp(
      `^model\s+${modelName}\s*{[^}]*}\s*$`,
      'gm'
    );
    
    const match = schemaContent.match(modelPattern);
    if (match) {
      console.log(`🗑️  Removing model: ${modelName}`);
      schemaContent = schemaContent.replace(modelPattern, '');
      
      // Rimuovi anche eventuali relazioni verso il modello
      const relationPattern = new RegExp(
        `\s*\w+\s+${modelName}\??\s*@relation[^\n]*\n?`,
        'g'
      );
      schemaContent = schemaContent.replace(relationPattern, '');
      
      // Rimuovi riferimenti nei campi
      const fieldPattern = new RegExp(
        `\s*\w+\s+${modelName}\[\]\s*\n?`,
        'g'
      );
      schemaContent = schemaContent.replace(fieldPattern, '');
      
      return schemaContent;
    } else {
      console.log(`⚠️  Model ${modelName} not found in schema`);
      return schemaContent;
    }
  }
  
  // Rimuovi tutti i modelli obsoleti
  removeObsoleteModels() {
    console.log('🧹 Starting obsolete model removal...');
    
    // Crea backup
    const backupFile = this.createBackup();
    
    let schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    
    // Rimuovi ogni modello obsoleto
    this.obsoleteModels.forEach(modelName => {
      schemaContent = this.removeModelFromSchema(modelName);
    });
    
    // Pulisci linee vuote multiple
    schemaContent = schemaContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Salva schema aggiornato
    fs.writeFileSync(this.schemaPath, schemaContent);
    
    console.log('✅ Obsolete models removed from schema');
    
    // Valida schema
    try {
      execSync('npx prisma validate', { cwd: path.dirname(this.schemaPath) });
      console.log('✅ Schema validation passed');
    } catch (error) {
      console.error('❌ Schema validation failed:', error.message);
      console.log('🔄 Restoring backup...');
      fs.copyFileSync(backupFile, this.schemaPath);
      throw new Error('Schema validation failed, backup restored');
    }
    
    return {
      removedModels: this.obsoleteModels,
      backupFile,
      schemaPath: this.schemaPath
    };
  }
  
  // Genera migrazione per rimozione tabelle
  generateDropMigration() {
    const migrationName = `drop_obsolete_models_${Date.now()}`;
    const migrationDir = path.join(
      path.dirname(this.schemaPath), 
      'migrations', 
      migrationName
    );
    
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }
    
    const migrationSQL = this.generateDropSQL();
    const migrationFile = path.join(migrationDir, 'migration.sql');
    
    fs.writeFileSync(migrationFile, migrationSQL);
    
    console.log(`📄 Drop migration created: ${migrationFile}`);
    return migrationFile;
  }
  
  // Genera SQL per drop tabelle
  generateDropSQL() {
    const dropStatements = this.obsoleteModels.map(model => {
      const tableName = this.modelToTableName(model);
      return `-- Drop table for obsolete model ${model}\nDROP TABLE IF EXISTS "${tableName}" CASCADE;`;
    });
    
    return [
      '-- Migration: Drop obsolete models',
      `-- Generated: ${new Date().toISOString()}`,
      '-- WARNING: This will permanently delete data!',
      '',
      ...dropStatements,
      ''
    ].join('\n');
  }
  
  // Converti nome modello in nome tabella
  modelToTableName(modelName) {
    // Converti PascalCase in snake_case
    return modelName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .substring(1);
  }
}

// Esegui rimozione se chiamato direttamente
if (require.main === module) {
  const remover = new ObsoleteModelRemover();
  
  try {
    const result = remover.removeObsoleteModels();
    console.log('\n🎉 Obsolete model removal completed successfully!');
    console.log('Removed models:', result.removedModels);
    console.log('Backup saved to:', result.backupFile);
    
    // Genera migrazione drop
    const migrationFile = remover.generateDropMigration();
    console.log('Drop migration created:', migrationFile);
    
  } catch (error) {
    console.error('❌ Error during model removal:', error.message);
    process.exit(1);
  }
}

module.exports = ObsoleteModelRemover;
```

### 10.3 Ottimizzazione @map e @@map

#### 10.3.1 Analisi @map Superflui
```javascript
// backend/scripts/analyze-map-directives.js
const fs = require('fs');
const path = require('path');

class MapDirectiveAnalyzer {
  constructor() {
    this.schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
  }
  
  // Analizza direttive @map
  analyzeMapDirectives() {
    const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    const analysis = {
      fieldMaps: [],
      modelMaps: [],
      superfluousFieldMaps: [],
      superfluousModelMaps: [],
      recommendations: []
    };
    
    // Trova tutti i @map sui campi
    const fieldMapRegex = /(\w+)\s+\w+[^\n]*@map\("([^"]+)"\)/g;
    let match;
    
    while ((match = fieldMapRegex.exec(schemaContent)) !== null) {
      const fieldName = match[1];
      const mappedName = match[2];
      
      analysis.fieldMaps.push({ fieldName, mappedName });
      
      // Verifica se @map è superfluo (nome campo = nome mappato)
      if (this.isFieldMapSuperfluous(fieldName, mappedName)) {
        analysis.superfluousFieldMaps.push({ fieldName, mappedName });
      }
    }
    
    // Trova tutti i @@map sui modelli
    const modelMapRegex = /model\s+(\w+)\s*{[^}]*@@map\("([^"]+)"\)[^}]*}/g;
    
    while ((match = modelMapRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const mappedName = match[2];
      
      analysis.modelMaps.push({ modelName, mappedName });
      
      // Verifica se @@map è superfluo
      if (this.isModelMapSuperfluous(modelName, mappedName)) {
        analysis.superfluousModelMaps.push({ modelName, mappedName });
      }
    }
    
    // Genera raccomandazioni
    this.generateRecommendations(analysis);
    
    return analysis;
  }
  
  // Verifica se @map campo è superfluo
  isFieldMapSuperfluous(fieldName, mappedName) {
    // Converti camelCase in snake_case
    const expectedSnakeCase = this.camelToSnakeCase(fieldName);
    return mappedName === expectedSnakeCase;
  }
  
  // Verifica se @@map modello è superfluo
  isModelMapSuperfluous(modelName, mappedName) {
    // Converti PascalCase in snake_case
    const expectedSnakeCase = this.pascalToSnakeCase(modelName);
    return mappedName === expectedSnakeCase;
  }
  
  // Converti camelCase in snake_case
  camelToSnakeCase(str) {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
  
  // Converti PascalCase in snake_case
  pascalToSnakeCase(str) {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .substring(1);
  }
  
  // Genera raccomandazioni
  generateRecommendations(analysis) {
    if (analysis.superfluousFieldMaps.length > 0) {
      analysis.recommendations.push({
        type: 'REMOVE_FIELD_MAPS',
        count: analysis.superfluousFieldMaps.length,
        description: 'Remove superfluous @map directives on fields',
        items: analysis.superfluousFieldMaps
      });
    }
    
    if (analysis.superfluousModelMaps.length > 0) {
      analysis.recommendations.push({
        type: 'REMOVE_MODEL_MAPS',
        count: analysis.superfluousModelMaps.length,
        description: 'Remove superfluous @@map directives on models',
        items: analysis.superfluousModelMaps
      });
    }
    
    // Verifica consistenza naming
    const inconsistentFields = analysis.fieldMaps.filter(item => {
      const expectedMap = this.camelToSnakeCase(item.fieldName);
      return item.mappedName !== expectedMap && 
             !analysis.superfluousFieldMaps.some(s => s.fieldName === item.fieldName);
    });
    
    if (inconsistentFields.length > 0) {
      analysis.recommendations.push({
        type: 'INCONSISTENT_FIELD_NAMING',
        count: inconsistentFields.length,
        description: 'Fields with inconsistent naming conventions',
        items: inconsistentFields
      });
    }
  }
  
  // Genera report
  generateReport() {
    const analysis = this.analyzeMapDirectives();
    
    console.log('\n=== MAP DIRECTIVE ANALYSIS REPORT ===');
    console.log(`Total field @map directives: ${analysis.fieldMaps.length}`);
    console.log(`Total model @@map directives: ${analysis.modelMaps.length}`);
    console.log(`Superfluous field @map: ${analysis.superfluousFieldMaps.length}`);
    console.log(`Superfluous model @@map: ${analysis.superfluousModelMaps.length}`);
    
    if (analysis.recommendations.length > 0) {
      console.log('\n📋 RECOMMENDATIONS:');
      analysis.recommendations.forEach(rec => {
        console.log(`\n${rec.type}:`);
        console.log(`  Description: ${rec.description}`);
        console.log(`  Count: ${rec.count}`);
        
        if (rec.items.length <= 10) {
          rec.items.forEach(item => {
            if (item.fieldName) {
              console.log(`    - Field: ${item.fieldName} -> "${item.mappedName}"`);
            } else if (item.modelName) {
              console.log(`    - Model: ${item.modelName} -> "${item.mappedName}"`);
            }
          });
        } else {
          console.log(`    - ${rec.items.length} items (too many to display)`);
        }
      });
    } else {
      console.log('\n✅ No issues found with @map directives');
    }
    
    // Salva report
    const reportPath = path.join(__dirname, '../reports/map-directive-analysis.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return analysis;
  }
}

// Esegui analisi se chiamato direttamente
if (require.main === module) {
  const analyzer = new MapDirectiveAnalyzer();
  analyzer.generateReport();
}

module.exports = MapDirectiveAnalyzer;
```

#### 10.3.2 Rimozione @map Superflui
```javascript
// backend/scripts/remove-superfluous-maps.js
const fs = require('fs');
const path = require('path');
const MapDirectiveAnalyzer = require('./analyze-map-directives');

class SuperfluousMapRemover {
  constructor() {
    this.schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
    this.analyzer = new MapDirectiveAnalyzer();
  }
  
  // Rimuovi @map superflui
  removeSuperfluousMaps() {
    console.log('🧹 Starting superfluous @map removal...');
    
    // Analizza direttive correnti
    const analysis = this.analyzer.analyzeMapDirectives();
    
    if (analysis.superfluousFieldMaps.length === 0 && 
        analysis.superfluousModelMaps.length === 0) {
      console.log('✅ No superfluous @map directives found');
      return { removed: 0, analysis };
    }
    
    // Crea backup
    const backupFile = this.createBackup();
    
    let schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    let removedCount = 0;
    
    // Rimuovi @map superflui sui campi
    analysis.superfluousFieldMaps.forEach(item => {
      const pattern = new RegExp(
        `(${item.fieldName}\s+\w+[^\n]*)\s*@map\("${item.mappedName}"\)`,
        'g'
      );
      
      const newContent = schemaContent.replace(pattern, '$1');
      if (newContent !== schemaContent) {
        console.log(`🗑️  Removed @map("${item.mappedName}") from field ${item.fieldName}`);
        schemaContent = newContent;
        removedCount++;
      }
    });
    
    // Rimuovi @@map superflui sui modelli
    analysis.superfluousModelMaps.forEach(item => {
      const pattern = new RegExp(
        `\s*@@map\("${item.mappedName}"\)\s*`,
        'g'
      );
      
      const newContent = schemaContent.replace(pattern, '\n');
      if (newContent !== schemaContent) {
        console.log(`🗑️  Removed @@map("${item.mappedName}") from model ${item.modelName}`);
        schemaContent = newContent;
        removedCount++;
      }
    });
    
    // Pulisci spazi extra
    schemaContent = schemaContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Salva schema aggiornato
    fs.writeFileSync(this.schemaPath, schemaContent);
    
    console.log(`✅ Removed ${removedCount} superfluous @map directives`);
    
    // Valida schema
    try {
      const { execSync } = require('child_process');
      execSync('npx prisma validate', { cwd: path.dirname(this.schemaPath) });
      console.log('✅ Schema validation passed');
    } catch (error) {
      console.error('❌ Schema validation failed:', error.message);
      console.log('🔄 Restoring backup...');
      fs.copyFileSync(backupFile, this.schemaPath);
      throw new Error('Schema validation failed, backup restored');
    }
    
    return {
      removed: removedCount,
      backupFile,
      analysis
    };
  }
  
  // Crea backup
  createBackup() {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `schema-map-cleanup-${timestamp}.prisma`);
    
    fs.copyFileSync(this.schemaPath, backupFile);
    console.log(`✅ Schema backup created: ${backupFile}`);
    
    return backupFile;
  }
}

// Esegui rimozione se chiamato direttamente
if (require.main === module) {
  const remover = new SuperfluousMapRemover();
  
  try {
    const result = remover.removeSuperfluousMaps();
    console.log('\n🎉 Superfluous @map removal completed!');
    console.log(`Removed: ${result.removed} directives`);
    console.log('Backup saved to:', result.backupFile);
  } catch (error) {
    console.error('❌ Error during @map removal:', error.message);
    process.exit(1);
  }
}

module.exports = SuperfluousMapRemover;
```

### 10.4 Validazione @@map con Database

#### 10.4.1 Verifica Corrispondenza Tabelle
```javascript
// backend/scripts/validate-table-mappings.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

class TableMappingValidator {
  constructor() {
    this.prisma = new PrismaClient();
    this.schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
  }
  
  // Ottieni tabelle dal database
  async getDatabaseTables() {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      return result.map(row => row.table_name);
    } catch (error) {
      console.error('Error fetching database tables:', error.message);
      throw error;
    }
  }
  
  // Estrai mappings dal schema
  extractSchemaMappings() {
    const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    const mappings = {
      models: [],
      explicitMaps: [],
      implicitMaps: []
    };
    
    // Trova modelli con @@map esplicito
    const explicitMapRegex = /model\s+(\w+)\s*{[^}]*@@map\("([^"]+)"\)[^}]*}/g;
    let match;
    
    while ((match = explicitMapRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const tableName = match[2];
      
      mappings.models.push(modelName);
      mappings.explicitMaps.push({ modelName, tableName, type: 'explicit' });
    }
    
    // Trova modelli senza @@map (mapping implicito)
    const allModelsRegex = /^model\s+(\w+)\s*{/gm;
    const allModels = [];
    
    while ((match = allModelsRegex.exec(schemaContent)) !== null) {
      allModels.push(match[1]);
    }
    
    // Identifica mappings impliciti
    allModels.forEach(modelName => {
      if (!mappings.explicitMaps.some(m => m.modelName === modelName)) {
        const implicitTableName = this.modelToTableName(modelName);
        mappings.implicitMaps.push({ 
          modelName, 
          tableName: implicitTableName, 
          type: 'implicit' 
        });
      }
    });
    
    mappings.models = allModels;
    
    return mappings;
  }
  
  // Converti nome modello in nome tabella (convenzione Prisma)
  modelToTableName(modelName) {
    return modelName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .substring(1);
  }
  
  // Valida mappings
  async validateMappings() {
    console.log('🔍 Validating table mappings...');
    
    const [dbTables, schemaMappings] = await Promise.all([
      this.getDatabaseTables(),
      Promise.resolve(this.extractSchemaMappings())
    ]);
    
    const validation = {
      timestamp: new Date().toISOString(),
      databaseTables: dbTables,
      schemaMappings,
      validMappings: [],
      invalidMappings: [],
      orphanedTables: [],
      missingTables: []
    };
    
    // Verifica mappings espliciti
    schemaMappings.explicitMaps.forEach(mapping => {
      if (dbTables.includes(mapping.tableName)) {
        validation.validMappings.push(mapping);
      } else {
        validation.invalidMappings.push({
          ...mapping,
          issue: 'Table not found in database'
        });
      }
    });
    
    // Verifica mappings impliciti
    schemaMappings.implicitMaps.forEach(mapping => {
      if (dbTables.includes(mapping.tableName)) {
        validation.validMappings.push(mapping);
      } else {
        validation.invalidMappings.push({
          ...mapping,
          issue: 'Implicit table not found in database'
        });
      }
    });
    
    // Trova tabelle orfane (nel DB ma non nello schema)
    const mappedTables = [
      ...schemaMappings.explicitMaps.map(m => m.tableName),
      ...schemaMappings.implicitMaps.map(m => m.tableName)
    ];
    
    validation.orphanedTables = dbTables.filter(table => 
      !mappedTables.includes(table) && 
      !table.startsWith('_prisma') // Escludi tabelle Prisma interne
    );
    
    // Trova tabelle mancanti (nello schema ma non nel DB)
    validation.missingTables = mappedTables.filter(table => 
      !dbTables.includes(table)
    );
    
    return validation;
  }
  
  // Genera report validazione
  async generateValidationReport() {
    try {
      const validation = await this.validateMappings();
      
      console.log('\n=== TABLE MAPPING VALIDATION REPORT ===');
      console.log(`Database tables: ${validation.databaseTables.length}`);
      console.log(`Schema models: ${validation.schemaMappings.models.length}`);
      console.log(`Valid mappings: ${validation.validMappings.length}`);
      console.log(`Invalid mappings: ${validation.invalidMappings.length}`);
      console.log(`Orphaned tables: ${validation.orphanedTables.length}`);
      console.log(`Missing tables: ${validation.missingTables.length}`);
      
      if (validation.invalidMappings.length > 0) {
        console.log('\n❌ INVALID MAPPINGS:');
        validation.invalidMappings.forEach(mapping => {
          console.log(`  - Model: ${mapping.modelName} -> Table: "${mapping.tableName}" (${mapping.issue})`);
        });
      }
      
      if (validation.orphanedTables.length > 0) {
        console.log('\n🔍 ORPHANED TABLES (in DB but not in schema):');
        validation.orphanedTables.forEach(table => {
          console.log(`  - ${table}`);
        });
      }
      
      if (validation.missingTables.length > 0) {
        console.log('\n⚠️  MISSING TABLES (in schema but not in DB):');
        validation.missingTables.forEach(table => {
          console.log(`  - ${table}`);
        });
      }
      
      if (validation.invalidMappings.length === 0 && 
          validation.orphanedTables.length === 0 && 
          validation.missingTables.length === 0) {
        console.log('\n✅ All table mappings are valid!');
      }
      
      // Salva report
      const reportPath = path.join(__dirname, '../reports/table-mapping-validation.json');
      const reportsDir = path.dirname(reportPath);
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(validation, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      return validation;
      
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// Esegui validazione se chiamato direttamente
if (require.main === module) {
  const validator = new TableMappingValidator();
  
  validator.generateValidationReport()
    .then(validation => {
      if (validation.invalidMappings.length > 0 || 
          validation.missingTables.length > 0) {
        console.log('\n⚠️  Issues found in table mappings');
        process.exit(1);
      } else {
        console.log('\n🎉 Table mapping validation completed successfully!');
      }
    })
    .catch(error => {
      console.error('❌ Error during validation:', error.message);
      process.exit(1);
    });
}

module.exports = TableMappingValidator;
```

### 10.5 Pulizia Commenti e Codice

#### 10.5.1 Rimozione Commenti Obsoleti
```javascript
// backend/scripts/clean-schema-comments.js
const fs = require('fs');
const path = require('path');

class SchemaCommentCleaner {
  constructor() {
    this.schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
    
    // Pattern di commenti obsoleti da rimuovere
    this.obsoletePatterns = [
      /\/\/ TODO:.*\n/g,
      /\/\/ FIXME:.*\n/g,
      /\/\/ OLD:.*\n/g,
      /\/\/ DEPRECATED:.*\n/g,
      /\/\/ TEMP:.*\n/g,
      /\/\/ HACK:.*\n/g,
      /\/\/ DEBUG:.*\n/g,
      /\/\/ TEST:.*\n/g,
      /\/\/ REMOVE:.*\n/g,
      /\/\/ UNUSED:.*\n/g
    ];
    
    // Pattern di commenti da mantenere
    this.keepPatterns = [
      /\/\/ GDPR:/,
      /\/\/ Security:/,
      /\/\/ Business:/,
      /\/\/ Validation:/,
      /\/\/ Performance:/,
      /\/\/ Multi-tenant:/
    ];
  }
  
  // Analizza commenti nello schema
  analyzeComments() {
    const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    const lines = schemaContent.split('\n');
    
    const analysis = {
      totalLines: lines.length,
      commentLines: [],
      obsoleteComments: [],
      importantComments: [],
      emptyLines: [],
      codeLines: []
    };
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        analysis.emptyLines.push({ lineNumber: index + 1, content: line });
      } else if (trimmedLine.startsWith('//')) {
        analysis.commentLines.push({ lineNumber: index + 1, content: line });
        
        // Verifica se è un commento obsoleto
        const isObsolete = this.obsoletePatterns.some(pattern => 
          pattern.test(trimmedLine)
        );
        
        // Verifica se è un commento importante
        const isImportant = this.keepPatterns.some(pattern => 
          pattern.test(trimmedLine)
        );
        
        if (isObsolete) {
          analysis.obsoleteComments.push({ lineNumber: index + 1, content: line });
        } else if (isImportant) {
          analysis.importantComments.push({ lineNumber: index + 1, content: line });
        }
      } else {
        analysis.codeLines.push({ lineNumber: index + 1, content: line });
      }
    });
    
    return analysis;
  }
  
  // Pulisci commenti obsoleti
  cleanObsoleteComments() {
    console.log('🧹 Cleaning obsolete comments...');
    
    const analysis = this.analyzeComments();
    
    if (analysis.obsoleteComments.length === 0) {
      console.log('✅ No obsolete comments found');
      return { cleaned: 0, analysis };
    }
    
    // Crea backup
    const backupFile = this.createBackup();
    
    let schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    let cleanedCount = 0;
    
    // Rimuovi commenti obsoleti
    this.obsoletePatterns.forEach(pattern => {
      const matches = schemaContent.match(pattern);
      if (matches) {
        cleanedCount += matches.length;
        schemaContent = schemaContent.replace(pattern, '');
      }
    });
    
    // Pulisci linee vuote multiple (max 2 consecutive)
    schemaContent = schemaContent.replace(/\n\s*\n\s*\n+/g, '\n\n');
    
    // Rimuovi spazi trailing
    schemaContent = schemaContent.replace(/[ \t]+$/gm, '');
    
    // Assicura newline finale
    if (!schemaContent.endsWith('\n')) {
      schemaContent += '\n';
    }
    
    // Salva schema pulito
    fs.writeFileSync(this.schemaPath, schemaContent);
    
    console.log(`✅ Cleaned ${cleanedCount} obsolete comments`);
    
    return {
      cleaned: cleanedCount,
      backupFile,
      analysis
    };
  }
  
  // Crea backup
  createBackup() {
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `schema-comment-cleanup-${timestamp}.prisma`);
    
    fs.copyFileSync(this.schemaPath, backupFile);
    console.log(`✅ Schema backup created: ${backupFile}`);
    
    return backupFile;
  }
  
  // Genera report pulizia
  generateCleanupReport() {
    const analysis = this.analyzeComments();
    
    console.log('\n=== SCHEMA COMMENT ANALYSIS REPORT ===');
    console.log(`Total lines: ${analysis.totalLines}`);
    console.log(`Code lines: ${analysis.codeLines.length}`);
    console.log(`Comment lines: ${analysis.commentLines.length}`);
    console.log(`Empty lines: ${analysis.emptyLines.length}`);
    console.log(`Obsolete comments: ${analysis.obsoleteComments.length}`);
    console.log(`Important comments: ${analysis.importantComments.length}`);
    
    if (analysis.obsoleteComments.length > 0) {
      console.log('\n🗑️  OBSOLETE COMMENTS TO REMOVE:');
      analysis.obsoleteComments.forEach(comment => {
        console.log(`  Line ${comment.lineNumber}: ${comment.content.trim()}`);
      });
    }
    
    if (analysis.importantComments.length > 0) {
      console.log('\n✅ IMPORTANT COMMENTS TO KEEP:');
      analysis.importantComments.slice(0, 5).forEach(comment => {
        console.log(`  Line ${comment.lineNumber}: ${comment.content.trim()}`);
      });
      
      if (analysis.importantComments.length > 5) {
        console.log(`  ... and ${analysis.importantComments.length - 5} more`);
      }
    }
    
    // Salva report
    const reportPath = path.join(__dirname, '../reports/schema-comment-analysis.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return analysis;
  }
}

// Esegui pulizia se chiamato direttamente
if (require.main === module) {
  const cleaner = new SchemaCommentCleaner();
  
  try {
    const analysis = cleaner.generateCleanupReport();
    
    if (analysis.obsoleteComments.length > 0) {
      const result = cleaner.cleanObsoleteComments();
      console.log('\n🎉 Comment cleanup completed!');
      console.log(`Cleaned: ${result.cleaned} comments`);
      console.log('Backup saved to:', result.backupFile);
    } else {
      console.log('\n✅ No cleanup needed');
    }
  } catch (error) {
    console.error('❌ Error during comment cleanup:', error.message);
    process.exit(1);
  }
}

module.exports = SchemaCommentCleaner;
```

#### 10.5.2 Rimozione Import e Codice Non Utilizzato
```javascript
// backend/scripts/clean-unused-code.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class UnusedCodeCleaner {
  constructor() {
    this.backendPath = path.join(__dirname, '../');
    this.schemaPath = path.join(__dirname, '../../prisma/schema.prisma');
  }
  
  // Trova import non utilizzati
  findUnusedImports() {
    const unusedImports = [];
    
    // Cerca file JavaScript/TypeScript
    const jsFiles = this.findJSFiles();
    
    jsFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const imports = this.extractImports(content);
        
        imports.forEach(importInfo => {
          if (!this.isImportUsed(content, importInfo)) {
            unusedImports.push({
              file: filePath,
              import: importInfo
            });
          }
        });
      } catch (error) {
        console.warn(`Warning: Could not analyze ${filePath}:`, error.message);
      }
    });
    
    return unusedImports;
  }
  
  // Trova file JavaScript/TypeScript
  findJSFiles() {
    try {
      const result = execSync(
        `find ${this.backendPath} -name "*.js" -o -name "*.ts" | grep -v node_modules | grep -v dist`,
        { encoding: 'utf8' }
      );
      
      return result.trim().split('\n').filter(f => f);
    } catch (error) {
      console.warn('Warning: Could not find JS files:', error.message);
      return [];
    }
  }
  
  // Estrai import da file
  extractImports(content) {
    const imports = [];
    
    // Import ES6
    const es6ImportRegex = /import\s+(?:{([^}]+)}|([^\s,]+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = es6ImportRegex.exec(content)) !== null) {
      if (match[1]) {
        // Named imports
        const namedImports = match[1].split(',').map(imp => imp.trim());
        namedImports.forEach(namedImport => {
          imports.push({
            type: 'named',
            name: namedImport,
            module: match[3],
            fullMatch: match[0]
          });
        });
      } else if (match[2]) {
        // Default import
        imports.push({
          type: 'default',
          name: match[2],
          module: match[3],
          fullMatch: match[0]
        });
      }
    }
    
    // Require CommonJS
    const requireRegex = /const\s+(?:{([^}]+)}|([^\s,=]+))\s*=\s*require\(['"]([^'"]+)['"]\)/g;
    
    while ((match = requireRegex.exec(content)) !== null) {
      if (match[1]) {
        // Destructured require
        const destructured = match[1].split(',').map(imp => imp.trim());
        destructured.forEach(destructuredImport => {
          imports.push({
            type: 'destructured',
            name: destructuredImport,
            module: match[3],
            fullMatch: match[0]
          });
        });
      } else if (match[2]) {
        // Direct require
        imports.push({
          type: 'require',
          name: match[2],
          module: match[3],
          fullMatch: match[0]
        });
      }
    }
    
    return imports;
  }
  
  // Verifica se import è utilizzato
  isImportUsed(content, importInfo) {
    // Rimuovi la linea di import dal contenuto per la verifica
    const contentWithoutImport = content.replace(importInfo.fullMatch, '');
    
    // Cerca utilizzo del nome importato
    const usageRegex = new RegExp(`\\b${importInfo.name}\\b`, 'g');
    const matches = contentWithoutImport.match(usageRegex);
    
    return matches && matches.length > 0;
  }
  
  // Trova funzioni non utilizzate
  findUnusedFunctions() {
    const unusedFunctions = [];
    const jsFiles = this.findJSFiles();
    
    jsFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const functions = this.extractFunctions(content);
        
        functions.forEach(func => {
          if (!this.isFunctionUsed(func, jsFiles)) {
            unusedFunctions.push({
              file: filePath,
              function: func
            });
          }
        });
      } catch (error) {
        console.warn(`Warning: Could not analyze functions in ${filePath}:`, error.message);
      }
    });
    
    return unusedFunctions;
  }
  
  // Estrai funzioni da file
  extractFunctions(content) {
    const functions = [];
    
    // Function declarations
    const funcDeclRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match;
    
    while ((match = funcDeclRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'declaration'
      });
    }
    
    // Arrow functions assigned to variables
    const arrowFuncRegex = /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/g;
    
    while ((match = arrowFuncRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'arrow'
      });
    }
    
    // Exported functions
    const exportFuncRegex = /exports?\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
    
    while ((match = exportFuncRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        type: 'export'
      });
    }
    
    return functions;
  }
  
  // Verifica se funzione è utilizzata
  isFunctionUsed(func, allFiles) {
    // Le funzioni esportate sono considerate utilizzate
    if (func.type === 'export') {
      return true;
    }
    
    // Cerca utilizzo in tutti i file
    for (const filePath of allFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const usageRegex = new RegExp(`\\b${func.name}\\b`, 'g');
        const matches = content.match(usageRegex);
        
        // Se trovato più di una volta (definizione + utilizzo)
        if (matches && matches.length > 1) {
          return true;
        }
      } catch (error) {
        // Ignora errori di lettura file
      }
    }
    
    return false;
  }
  
  // Genera report codice non utilizzato
  generateUnusedCodeReport() {
    console.log('🔍 Analyzing unused code...');
    
    const unusedImports = this.findUnusedImports();
    const unusedFunctions = this.findUnusedFunctions();
    
    const report = {
      timestamp: new Date().toISOString(),
      unusedImports,
      unusedFunctions,
      summary: {
        totalUnusedImports: unusedImports.length,
        totalUnusedFunctions: unusedFunctions.length,
        filesWithUnusedImports: [...new Set(unusedImports.map(u => u.file))].length,
        filesWithUnusedFunctions: [...new Set(unusedFunctions.map(u => u.file))].length
      }
    };
    
    console.log('\n=== UNUSED CODE ANALYSIS REPORT ===');
    console.log(`Unused imports: ${report.summary.totalUnusedImports}`);
    console.log(`Unused functions: ${report.summary.totalUnusedFunctions}`);
    console.log(`Files with unused imports: ${report.summary.filesWithUnusedImports}`);
    console.log(`Files with unused functions: ${report.summary.filesWithUnusedFunctions}`);
    
    if (unusedImports.length > 0) {
      console.log('\n🗑️  UNUSED IMPORTS (first 10):');
      unusedImports.slice(0, 10).forEach(item => {
        const relativePath = path.relative(this.backendPath, item.file);
        console.log(`  ${relativePath}: ${item.import.name} from '${item.import.module}'`);
      });
      
      if (unusedImports.length > 10) {
        console.log(`  ... and ${unusedImports.length - 10} more`);
      }
    }
    
    if (unusedFunctions.length > 0) {
      console.log('\n🗑️  UNUSED FUNCTIONS (first 10):');
      unusedFunctions.slice(0, 10).forEach(item => {
        const relativePath = path.relative(this.backendPath, item.file);
        console.log(`  ${relativePath}: ${item.function.name} (${item.function.type})`);
      });
      
      if (unusedFunctions.length > 10) {
        console.log(`  ... and ${unusedFunctions.length - 10} more`);
      }
    }
    
    if (unusedImports.length === 0 && unusedFunctions.length === 0) {
      console.log('\n✅ No unused code found!');
    }
    
    // Salva report
    const reportPath = path.join(__dirname, '../reports/unused-code-analysis.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return report;
  }
}

// Esegui analisi se chiamato direttamente
if (require.main === module) {
  const cleaner = new UnusedCodeCleaner();
  
  try {
    const report = cleaner.generateUnusedCodeReport();
    
    if (report.summary.totalUnusedImports > 0 || report.summary.totalUnusedFunctions > 0) {
      console.log('\n⚠️  Unused code found. Consider manual cleanup.');
      console.log('Note: Automatic removal of unused code can be risky.');
      console.log('Please review the report and remove unused code manually.');
    } else {
      console.log('\n🎉 No unused code found!');
    }
  } catch (error) {
    console.error('❌ Error during unused code analysis:', error.message);
    process.exit(1);
  }
}

module.exports = UnusedCodeCleaner;
```

### 10.6 Strategia di Testing

#### 10.6.1 Test di Validazione Schema
```javascript
// backend/tests/schema-validation.test.js
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Schema Validation Tests', () => {
  let prisma;
  
  beforeAll(async () => {
    prisma = new PrismaClient();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  describe('Schema Syntax Validation', () => {
    test('should validate Prisma schema syntax', () => {
      expect(() => {
        execSync('npx prisma validate', { 
          cwd: path.join(__dirname, '../../prisma'),
          stdio: 'pipe'
        });
      }).not.toThrow();
    });
    
    test('should generate Prisma client without errors', () => {
      expect(() => {
        execSync('npx prisma generate', { 
          cwd: path.join(__dirname, '../../prisma'),
          stdio: 'pipe'
        });
      }).not.toThrow();
    });
  });
  
  describe('Database Connection', () => {
    test('should connect to database successfully', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });
    
    test('should execute simple query', async () => {
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toHaveLength(1);
      expect(result[0].test).toBe(1);
    });
  });
  
  describe('Model Validation', () => {
    test('should have all expected models available', async () => {
      const expectedModels = [
        'Person',
        'Company', 
        'Course',
        'CourseEnrollment',
        'RegistroPresenze',
        'Fattura',
        'GdprAuditLog'
      ];
      
      for (const modelName of expectedModels) {
        const model = prisma[modelName.toLowerCase()];
        expect(model).toBeDefined();
        expect(typeof model.findMany).toBe('function');
      }
    });
    
    test('should not have obsolete models', async () => {
      const obsoleteModels = ['User', 'Employee', 'Role', 'UserRole'];
      
      for (const modelName of obsoleteModels) {
        const model = prisma[modelName.toLowerCase()];
        expect(model).toBeUndefined();
      }
    });
  });
  
  describe('Table Mapping Validation', () => {
    test('should have correct table mappings', async () => {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tableNames = tables.map(t => t.table_name);
      
      // Verifica presenza tabelle principali
      const expectedTables = [
        'person',
        'company',
        'course',
        'course_enrollment',
        'registro_presenze',
        'fattura',
        'gdpr_audit_log'
      ];
      
      expectedTables.forEach(tableName => {
        expect(tableNames).toContain(tableName);
      });
    });
  });
  
  describe('Index Validation', () => {
    test('should have proper indexes on foreign keys', async () => {
      const indexes = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
      `;
      
      // Verifica presenza indici su FK principali
      const indexDefs = indexes.map(idx => idx.indexdef.toLowerCase());
      
      const expectedIndexes = [
        'company_id',
        'tenant_id',
        'course_id',
        'person_id'
      ];
      
      expectedIndexes.forEach(field => {
        const hasIndex = indexDefs.some(def => def.includes(field));
        expect(hasIndex).toBe(true);
      });
    });
  });
});
```

#### 10.6.2 Test di Compatibilità Applicazione
```javascript
// backend/tests/application-compatibility.test.js
const { PrismaClient } = require('@prisma/client');
const request = require('supertest');
const app = require('../app'); // Assumendo che esista un file app.js

describe('Application Compatibility Tests', () => {
  let prisma;
  let authToken;
  
  beforeAll(async () => {
    prisma = new PrismaClient();
    
    // Ottieni token di autenticazione per i test
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      });
    
    authToken = loginResponse.body.token;
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  describe('API Endpoints', () => {
    test('should get companies list', async () => {
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('should get courses list', async () => {
      const response = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
    
    test('should get persons list', async () => {
      const response = await request(app)
        .get('/api/persons')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
  
  describe('CRUD Operations', () => {
    let testCompanyId;
    
    test('should create a company', async () => {
      const companyData = {
        name: 'Test Company Cleanup',
        email: 'test-cleanup@example.com',
        phone: '+1234567890'
      };
      
      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(companyData);
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe(companyData.name);
      testCompanyId = response.body.id;
    });
    
    test('should update the company', async () => {
      const updateData = {
        name: 'Updated Test Company Cleanup'
      };
      
      const response = await request(app)
        .put(`/api/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
    });
    
    test('should delete the company', async () => {
      const response = await request(app)
        .delete(`/api/companies/${testCompanyId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('Multi-tenant Isolation', () => {
    test('should respect tenant isolation', async () => {
      // Test che i dati siano isolati per tenant
      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      
      // Verifica che tutti i risultati abbiano lo stesso tenantId
      if (response.body.length > 0) {
        const firstTenantId = response.body[0].tenantId;
        response.body.forEach(company => {
          expect(company.tenantId).toBe(firstTenantId);
        });
      }
    });
  });
  
  describe('Soft Delete Functionality', () => {
    test('should handle soft delete correctly', async () => {
      // Crea una company di test
      const companyData = {
        name: 'Soft Delete Test Company',
        email: 'softdelete@example.com'
      };
      
      const createResponse = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(companyData);
      
      const companyId = createResponse.body.id;
      
      // Soft delete
      await request(app)
        .delete(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Verifica che non sia più visibile nelle liste
      const listResponse = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${authToken}`);
      
      const deletedCompany = listResponse.body.find(c => c.id === companyId);
      expect(deletedCompany).toBeUndefined();
      
      // Verifica che esista ancora nel database con deletedAt
      const dbCompany = await prisma.company.findUnique({
        where: { id: companyId },
        include: { deletedAt: true }
      });
      
      expect(dbCompany).toBeDefined();
      expect(dbCompany.deletedAt).not.toBeNull();
    });
  });
});
```

#### 10.6.3 Test di Performance
```javascript
// backend/tests/performance.test.js
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

describe('Performance Tests', () => {
  let prisma;
  
  beforeAll(async () => {
    prisma = new PrismaClient();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  describe('Query Performance', () => {
    test('should execute company list query within acceptable time', async () => {
      const start = performance.now();
      
      const companies = await prisma.company.findMany({
        take: 100,
        include: {
          courses: {
            take: 5
          }
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(1000); // Meno di 1 secondo
      expect(Array.isArray(companies)).toBe(true);
    });
    
    test('should execute course enrollment query efficiently', async () => {
      const start = performance.now();
      
      const enrollments = await prisma.courseEnrollment.findMany({
        take: 100,
        include: {
          course: true,
          person: true
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(1500); // Meno di 1.5 secondi
      expect(Array.isArray(enrollments)).toBe(true);
    });
    
    test('should handle complex aggregation queries', async () => {
      const start = performance.now();
      
      const stats = await prisma.course.groupBy({
        by: ['status'],
        _count: {
          id: true
        },
        _avg: {
          price: true
        }
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(2000); // Meno di 2 secondi
      expect(Array.isArray(stats)).toBe(true);
    });
  });
  
  describe('Index Effectiveness', () => {
    test('should use indexes for foreign key queries', async () => {
      // Query che dovrebbe utilizzare indici FK
      const start = performance.now();
      
      const courses = await prisma.course.findMany({
        where: {
          companyId: {
            not: null
          }
        },
        take: 50
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(500); // Dovrebbe essere molto veloce con indici
      expect(Array.isArray(courses)).toBe(true);
    });
    
    test('should efficiently filter by tenant', async () => {
      const start = performance.now();
      
      const companies = await prisma.company.findMany({
        where: {
          tenantId: 'test-tenant'
        },
        take: 100
      });
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(300); // Molto veloce con indice su tenantId
      expect(Array.isArray(companies)).toBe(true);
    });
  });
});
```

## ✅ Criteri di Completamento

### Criteri Tecnici
- [ ] **Modelli Obsoleti Rimossi**: Tutti i modelli obsoleti identificati sono stati rimossi
- [ ] **@map Ottimizzati**: Rimossi tutti i `@map` superflui dopo standardizzazione naming
- [ ] **@@map Validati**: Verificata corrispondenza tra `@@map` e tabelle database esistenti
- [ ] **Commenti Puliti**: Rimossi commenti obsoleti e codice commentato non necessario
- [ ] **Import Ottimizzati**: Rimossi import non utilizzati (dove sicuro)
- [ ] **Schema Validato**: Schema Prisma valida senza errori
- [ ] **Database Sincronizzato**: Database corrisponde allo schema pulito

### Criteri Funzionali
- [ ] **API Funzionanti**: Tutti gli endpoint API continuano a funzionare
- [ ] **CRUD Operazioni**: Create, Read, Update, Delete funzionano correttamente
- [ ] **Multi-tenant**: Isolamento tenant mantenuto
- [ ] **Soft Delete**: Funzionalità soft delete preservata
- [ ] **Performance**: Performance query mantenute o migliorate
- [ ] **Sicurezza**: Controlli di sicurezza preservati

### Criteri di Qualità
- [ ] **Test Passano**: Tutti i test di validazione passano
- [ ] **Documentazione**: Documentazione aggiornata
- [ ] **Backup Creati**: Backup di sicurezza disponibili
- [ ] **Rollback Plan**: Piano di rollback testato
- [ ] **Code Review**: Codice rivisto e approvato
- [ ] **Performance Baseline**: Metriche performance documentate

## ⚠️ Rischi e Mitigazioni

### Rischi Tecnici

**Rimozione Accidentale Codice Necessario**
- *Rischio*: Rimozione di modelli o codice ancora utilizzato
- *Mitigazione*: Analisi automatica utilizzo + backup completi + test estensivi
- *Piano B*: Rollback immediato da backup

**Rottura Compatibilità Database**
- *Rischio*: Mismatch tra schema e database dopo pulizia
- *Mitigazione*: Validazione mappings + test connessione + migrazione graduale
- *Piano B*: Restore database da backup

**Performance Degradation**
- *Rischio*: Rimozione accidentale di ottimizzazioni
- *Mitigazione*: Test performance + monitoraggio + baseline metrics
- *Piano B*: Rollback selettivo delle modifiche

### Rischi Operativi

**Downtime Applicazione**
- *Rischio*: Interruzione servizio durante pulizia
- *Mitigazione*: Pulizia in ambiente staging + deploy graduale
- *Piano B*: Rollback rapido + comunicazione utenti

**Perdita Dati**
- *Rischio*: Cancellazione accidentale dati importanti
- *Mitigazione*: Backup multipli + test restore + validazione dati
- *Piano B*: Restore selettivo da backup

**Confusione Team**
- *Rischio*: Team confuso da cambiamenti schema
- *Mitigazione*: Documentazione + comunicazione + training
- *Piano B*: Sessioni di supporto aggiuntive

## 📊 Metriche di Successo

### Metriche Quantitative
- **Riduzione Dimensione Schema**: -20% linee di codice
- **Riduzione Modelli**: Rimozione 4-5 modelli obsoleti
- **Ottimizzazione @map**: Rimozione 80%+ `@map` superflui
- **Performance Query**: Mantenimento o miglioramento tempi risposta
- **Copertura Test**: 100% test di validazione passano
- **Riduzione Complessità**: Miglioramento maintainability index

### Metriche Qualitative
- **Leggibilità Schema**: Schema più pulito e comprensibile
- **Manutenibilità**: Più facile manutenzione e modifiche future
- **Documentazione**: Documentazione aggiornata e accurata
- **Confidence Team**: Team più sicuro nel lavorare con schema
- **Onboarding**: Più facile per nuovi sviluppatori
- **Debugging**: Più facile identificare e risolvere problemi

## 🚀 Prossimi Passi

### Immediati (Post Fase 10)
1. **Revisione Finale**: Review completa di tutte le 10 fasi
2. **Test Integrazione**: Test end-to-end completi
3. **Documentazione Finale**: Aggiornamento documentazione completa
4. **Training Team**: Sessioni di formazione su nuovo schema
5. **Deploy Staging**: Deploy completo in ambiente staging

### A Medio Termine
1. **Deploy Produzione**: Migrazione graduale in produzione
2. **Monitoraggio**: Monitoraggio performance e stabilità
3. **Ottimizzazioni**: Fine-tuning basato su metriche reali
4. **Feedback**: Raccolta feedback team e utenti
5. **Iterazioni**: Miglioramenti basati su feedback

### A Lungo Termine
1. **Manutenzione**: Piano di manutenzione schema
2. **Evoluzioni**: Roadmap evoluzioni future
3. **Best Practices**: Definizione best practices team
4. **Automazione**: Automazione controlli qualità
5. **Knowledge Sharing**: Condivisione conoscenze acquisite

## 📝 Note di Implementazione

### Ordine di Implementazione
1. **Analisi e Backup**: Sempre prima fase
2. **Rimozione Modelli**: Dopo analisi utilizzo
3. **Ottimizzazione @map**: Dopo rimozione modelli
4. **Validazione Mappings**: Dopo ottimizzazione
5. **Pulizia Commenti**: Verso la fine
6. **Test e Validazione**: Ultima fase

### Considerazioni Speciali
- **GDPR Compliance**: Mantenere audit trail durante pulizia
- **Multi-tenant**: Preservare isolamento durante tutte le operazioni
- **Performance**: Monitorare performance durante ogni step
- **Rollback**: Testare rollback plan prima di procedere
- **Communication**: Comunicare progress al team

---

## 📋 Metadati Documento

- **Versione**: 1.0
- **Data Creazione**: 2024-12-19
- **Ultima Modifica**: 2024-12-19
- **Autore**: AI Assistant
- **Stato**: Completo
- **Fase Progetto**: 10/10
- **Dipendenze**: Fasi 1-9 completate
- **Tempo Stimato**: 3-5 giorni
- **Priorità**: Alta
- **Complessità**: Media-Alta
```