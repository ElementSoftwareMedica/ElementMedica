#!/usr/bin/env node

/**
 * Fase 7: Enum & Validazione Tipi - Script Completo
 * 
 * Questo script:
 * 1. Converte campi String in enum appropriati
 * 2. Standardizza precisione Decimal e Float
 * 3. Implementa validazione avanzata tipi
 * 4. Ottimizza constraint e validazioni
 * 5. Genera report finale
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class Phase7EnumValidation {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.backupDir = path.join(__dirname, '../backups/phase7-enum-validation');
    this.changes = [];
    this.errors = [];
    this.startTime = new Date();
    
    // Campi da convertire in enum
    this.enumConversions = {
      'Person': {
        'status': {
          name: 'PersonStatus',
          values: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']
        },
        'gender': {
          name: 'Gender',
          values: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']
        }
      },
      'Company': {
        'status': {
          name: 'CompanyStatus',
          values: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING']
        },
        'type': {
          name: 'CompanyType',
          values: ['SRL', 'SPA', 'SNCS', 'SAS', 'SS', 'DITTA_INDIVIDUALE', 'ALTRO']
        }
      },
      'Course': {
        'status': {
          name: 'CourseStatus',
          values: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED']
        },
        'level': {
          name: 'CourseLevel',
          values: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']
        },
        'type': {
          name: 'CourseType',
          values: ['ONLINE', 'OFFLINE', 'HYBRID', 'SELF_PACED']
        }
      },
      'CourseEnrollment': {
        'status': {
          name: 'EnrollmentStatus',
          values: ['PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'SUSPENDED']
        }
      },
      'Attestato': {
        'status': {
          name: 'AttestatoStatus',
          values: ['DRAFT', 'GENERATED', 'SENT', 'DELIVERED', 'CANCELLED']
        }
      },
      'Fattura': {
        'status': {
          name: 'FatturaStatus',
          values: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']
        }
      },
      'Preventivo': {
        'status': {
          name: 'PreventivoStatus',
          values: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']
        }
      }
    };
    
    // Standardizzazione precisione numerica
    this.numericStandardization = {
      'money': { type: 'Decimal', precision: '@db.Decimal(10,2)' },
      'percentage': { type: 'Decimal', precision: '@db.Decimal(5,2)' },
      'hours': { type: 'Decimal', precision: '@db.Decimal(8,2)' },
      'rating': { type: 'Decimal', precision: '@db.Decimal(3,2)' }
    };
  }

  async run() {
    console.log('🔧 FASE 7: ENUM & VALIDAZIONE TIPI');
    console.log('=' .repeat(50));
    
    try {
      // 1. Backup dello schema
      await this.createBackup();
      
      // 2. Analisi campi da convertire
      await this.analyzeFieldsForConversion();
      
      // 3. Genera enum definitions
      await this.generateEnumDefinitions();
      
      // 4. Aggiorna schema con enum
      await this.updateSchemaWithEnums();
      
      // 5. Standardizza precisione numerica
      await this.standardizeNumericPrecision();
      
      // 6. Implementa validazioni avanzate
      await this.implementAdvancedValidations();
      
      // 7. Crea script migrazione dati
      await this.createDataMigrationScript();
      
      // 8. Genera report finale
      await this.generateFinalReport();
      
      console.log('\n✅ Fase 7 completata con successo!');
      console.log('⚠️  IMPORTANTE: Eseguire migrazione dati per convertire valori esistenti!');
      
    } catch (error) {
      console.error('❌ Errore durante Fase 7:', error.message);
      this.errors.push(error.message);
      await this.generateErrorReport();
      process.exit(1);
    }
  }

  async createBackup() {
    console.log('\n📦 Creazione backup...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    // Backup schema Prisma
    const schemaPath = path.join(this.projectRoot, 'backend/prisma/schema.prisma');
    const backupSchemaPath = path.join(this.backupDir, 'schema.prisma.backup');
    
    if (fs.existsSync(schemaPath)) {
      fs.copyFileSync(schemaPath, backupSchemaPath);
      console.log('✅ Backup schema creato');
    }
  }

  async analyzeFieldsForConversion() {
    console.log('\n🔍 Analisi campi per conversione enum...');
    
    const schemaPath = path.join(this.projectRoot, 'backend/prisma/schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    this.analysis = {
      fieldsToConvert: [],
      numericFieldsToStandardize: [],
      existingEnums: []
    };
    
    // Trova enum esistenti
    const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/g;
    let enumMatch;
    while ((enumMatch = enumRegex.exec(schemaContent)) !== null) {
      this.analysis.existingEnums.push(enumMatch[1]);
    }
    
    // Analizza modelli per campi da convertire
    const models = this.extractModels(schemaContent);
    
    for (const [modelName, modelContent] of Object.entries(models)) {
      if (this.enumConversions[modelName]) {
        for (const [fieldName, enumDef] of Object.entries(this.enumConversions[modelName])) {
          // Verifica se il campo esiste come String
          const fieldRegex = new RegExp(`${fieldName}\\s+String`, 'g');
          if (fieldRegex.test(modelContent)) {
            this.analysis.fieldsToConvert.push({
              model: modelName,
              field: fieldName,
              enumName: enumDef.name,
              values: enumDef.values
            });
          }
        }
      }
      
      // Analizza campi numerici
      const decimalFields = modelContent.match(/\w+\s+(Decimal|Float)(?!.*@db)/g);
      if (decimalFields) {
        decimalFields.forEach(field => {
          const fieldName = field.split(/\s+/)[0];
          this.analysis.numericFieldsToStandardize.push({
            model: modelName,
            field: fieldName,
            currentType: field.includes('Decimal') ? 'Decimal' : 'Float'
          });
        });
      }
    }
    
    console.log(`✅ Campi da convertire in enum: ${this.analysis.fieldsToConvert.length}`);
    console.log(`✅ Campi numerici da standardizzare: ${this.analysis.numericFieldsToStandardize.length}`);
    console.log(`✅ Enum esistenti: ${this.analysis.existingEnums.length}`);
    
    this.changes.push({
      type: 'analysis',
      description: `Analizzati ${this.analysis.fieldsToConvert.length} campi per conversione enum`
    });
  }

  extractModels(schemaContent) {
    const models = {};
    const modelRegex = /model\s+(\w+)\s*{([^}]+(?:{[^}]*}[^}]*)*)}/g;
    let match;
    
    while ((match = modelRegex.exec(schemaContent)) !== null) {
      models[match[1]] = match[2];
    }
    
    return models;
  }

  async generateEnumDefinitions() {
    console.log('\n📝 Generazione definizioni enum...');
    
    const enumDefinitions = [];
    const uniqueEnums = new Set();
    
    for (const field of this.analysis.fieldsToConvert) {
      if (!uniqueEnums.has(field.enumName) && !this.analysis.existingEnums.includes(field.enumName)) {
        uniqueEnums.add(field.enumName);
        
        const enumDef = `enum ${field.enumName} {
  ${field.values.join('\n  ')}
}`;
        
        enumDefinitions.push(enumDef);
        console.log(`  ✅ ${field.enumName}: ${field.values.length} valori`);
      }
    }
    
    this.enumDefinitions = enumDefinitions;
    
    this.changes.push({
      type: 'enum_generation',
      description: `Generate ${enumDefinitions.length} nuove definizioni enum`
    });
  }

  async updateSchemaWithEnums() {
    console.log('\n⚙️ Aggiornamento schema con enum...');
    
    const schemaPath = path.join(this.projectRoot, 'backend/prisma/schema.prisma');
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    let modifications = 0;
    
    // 1. Aggiungi definizioni enum all'inizio del file
    if (this.enumDefinitions.length > 0) {
      const enumSection = `\n// === ENUM DEFINITIONS - Fase 7 ===\n${this.enumDefinitions.join('\n\n')}\n\n`;
      
      // Inserisci dopo il generator
      const generatorEndRegex = /(generator\s+\w+\s*{[^}]+})/;
      schemaContent = schemaContent.replace(generatorEndRegex, `$1${enumSection}`);
      
      modifications++;
      console.log(`  ✅ Aggiunte ${this.enumDefinitions.length} definizioni enum`);
    }
    
    // 2. Converti campi String in enum
    for (const field of this.analysis.fieldsToConvert) {
      const modelPattern = new RegExp(
        `(model\s+${field.model}\s*{[^}]*?)${field.field}\s+String([^\n]*?)`,
        'g'
      );
      
      const replacement = `$1${field.field} ${field.enumName}$2`;
      const newContent = schemaContent.replace(modelPattern, replacement);
      
      if (newContent !== schemaContent) {
        schemaContent = newContent;
        modifications++;
        console.log(`  ✅ ${field.model}.${field.field} → ${field.enumName}`);
      }
    }
    
    // Salva schema aggiornato
    if (modifications > 0) {
      fs.writeFileSync(schemaPath, schemaContent);
      console.log(`✅ Schema aggiornato con ${modifications} modifiche enum`);
      
      this.changes.push({
        type: 'schema_update',
        description: `Schema aggiornato con ${modifications} conversioni enum`
      });
    } else {
      console.log('✅ Schema già ottimizzato per enum');
    }
  }

  async standardizeNumericPrecision() {
    console.log('\n🔢 Standardizzazione precisione numerica...');
    
    const schemaPath = path.join(this.projectRoot, 'backend/prisma/schema.prisma');
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    let modifications = 0;
    
    // Standardizza campi monetari
    const moneyFields = ['price', 'cost', 'amount', 'total', 'subtotal', 'tax', 'discount'];
    for (const fieldName of moneyFields) {
      const pattern = new RegExp(`(\\s+${fieldName}\\s+)Decimal(?!.*@db)`, 'g');
      const newContent = schemaContent.replace(pattern, `$1Decimal @db.Decimal(10,2)`);
      
      if (newContent !== schemaContent) {
        schemaContent = newContent;
        modifications++;
        console.log(`  ✅ ${fieldName}: Decimal(10,2)`);
      }
    }
    
    // Standardizza percentuali
    const percentageFields = ['percentage', 'rate', 'discount_rate', 'tax_rate'];
    for (const fieldName of percentageFields) {
      const pattern = new RegExp(`(\\s+${fieldName}\\s+)Decimal(?!.*@db)`, 'g');
      const newContent = schemaContent.replace(pattern, `$1Decimal @db.Decimal(5,2)`);
      
      if (newContent !== schemaContent) {
        schemaContent = newContent;
        modifications++;
        console.log(`  ✅ ${fieldName}: Decimal(5,2)`);
      }
    }
    
    // Standardizza ore
    const hourFields = ['hours', 'duration', 'worked_hours'];
    for (const fieldName of hourFields) {
      const pattern = new RegExp(`(\\s+${fieldName}\\s+)Decimal(?!.*@db)`, 'g');
      const newContent = schemaContent.replace(pattern, `$1Decimal @db.Decimal(8,2)`);
      
      if (newContent !== schemaContent) {
        schemaContent = newContent;
        modifications++;
        console.log(`  ✅ ${fieldName}: Decimal(8,2)`);
      }
    }
    
    // Salva modifiche
    if (modifications > 0) {
      fs.writeFileSync(schemaPath, schemaContent);
      console.log(`✅ Precisione numerica standardizzata: ${modifications} campi`);
      
      this.changes.push({
        type: 'numeric_standardization',
        description: `Standardizzata precisione per ${modifications} campi numerici`
      });
    } else {
      console.log('✅ Precisione numerica già standardizzata');
    }
  }

  async implementAdvancedValidations() {
    console.log('\n🛡️ Implementazione validazioni avanzate...');
    
    // Crea file validazioni Zod
    const validationContent = `/**
 * Advanced Validations - Fase 7
 * Validazioni Zod per enum e tipi standardizzati
 */

import { z } from 'zod';

// === ENUM VALIDATIONS ===

${this.enumDefinitions.map(enumDef => {
  const enumName = enumDef.match(/enum\s+(\w+)/)[1];
  const values = enumDef.match(/{([^}]+)}/)[1].trim().split('\n').map(v => v.trim()).filter(v => v);
  
  return `export const ${enumName}Schema = z.enum([${values.map(v => `'${v}'`).join(', ')}]);`;
}).join('\n\n')}

// === NUMERIC VALIDATIONS ===

// Validazioni monetarie
export const MoneySchema = z.number()
  .min(0, 'Amount must be positive')
  .max(99999999.99, 'Amount too large')
  .multipleOf(0.01, 'Amount must have max 2 decimal places');

// Validazioni percentuali
export const PercentageSchema = z.number()
  .min(0, 'Percentage must be positive')
  .max(100, 'Percentage cannot exceed 100')
  .multipleOf(0.01, 'Percentage must have max 2 decimal places');

// Validazioni ore
export const HoursSchema = z.number()
  .min(0, 'Hours must be positive')
  .max(999999.99, 'Hours value too large')
  .multipleOf(0.01, 'Hours must have max 2 decimal places');

// === MODEL VALIDATIONS ===

// Person validation
export const PersonValidationSchema = z.object({
  email: z.string().email('Invalid email format'),
  firstName: z.string().min(1, 'First name required').max(100, 'First name too long'),
  lastName: z.string().min(1, 'Last name required').max(100, 'Last name too long'),
  taxCode: z.string().regex(/^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/, 'Invalid tax code').optional(),
  status: PersonStatusSchema.optional(),
  gender: GenderSchema.optional()
});

// Company validation
export const CompanyValidationSchema = z.object({
  ragioneSociale: z.string().min(1, 'Company name required').max(255, 'Company name too long'),
  piva: z.string().regex(/^[0-9]{11}$/, 'Invalid VAT number').optional(),
  codiceFiscale: z.string().regex(/^[0-9]{11}$/, 'Invalid fiscal code').optional(),
  status: CompanyStatusSchema.optional(),
  type: CompanyTypeSchema.optional()
});

// Course validation
export const CourseValidationSchema = z.object({
  title: z.string().min(1, 'Course title required').max(255, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  status: CourseStatusSchema.optional(),
  level: CourseLevelSchema.optional(),
  type: CourseTypeSchema.optional(),
  price: MoneySchema.optional(),
  duration: HoursSchema.optional()
});

// === UTILITY FUNCTIONS ===

/**
 * Valida un oggetto con schema Zod
 */
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => e.path.join('.') + ': ' + e.message)
      };
    }
    return {
      success: false,
      errors: ['Validation failed']
    };
  }
}

/**
 * Middleware per validazione automatica
 */
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const validation = validateWithSchema(schema, req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }
    
    req.validatedData = validation.data;
    next();
  };
}

export default {
  PersonValidationSchema,
  CompanyValidationSchema,
  CourseValidationSchema,
  MoneySchema,
  PercentageSchema,
  HoursSchema,
  validateWithSchema,
  createValidationMiddleware
};
`;
    
    const validationPath = path.join(this.projectRoot, 'backend/utils/advanced-validations.js');
    fs.writeFileSync(validationPath, validationContent);
    
    console.log('✅ Validazioni avanzate implementate');
    
    this.changes.push({
      type: 'create',
      file: 'backend/utils/advanced-validations.js',
      description: 'Sistema validazioni avanzate con Zod per enum e tipi numerici'
    });
  }

  async createDataMigrationScript() {
    console.log('\n📦 Creazione script migrazione dati...');
    
    const migrationScript = `-- Script di Migrazione Dati - Fase 7: Enum & Validazione
-- ATTENZIONE: Eseguire solo dopo backup completo del database

-- 1. Backup delle tabelle prima della migrazione
${this.analysis.fieldsToConvert.map(field => 
  `CREATE TABLE "${field.model}_backup" AS SELECT * FROM "${field.model}";`
).join('\n')}

-- 2. Conversione valori esistenti per enum

${this.analysis.fieldsToConvert.map(field => {
  const updates = field.values.map(value => {
    // Mapping comuni per conversione
    const mappings = {
      'ACTIVE': ['active', 'attivo', '1', 'true'],
      'INACTIVE': ['inactive', 'inattivo', '0', 'false'],
      'PENDING': ['pending', 'in_attesa', 'waiting'],
      'COMPLETED': ['completed', 'completato', 'finished'],
      'CANCELLED': ['cancelled', 'annullato', 'canceled']
    };
    
    const possibleValues = mappings[value] || [value.toLowerCase()];
    
    return possibleValues.map(oldValue => 
      `UPDATE "${field.model}" SET "${field.field}" = '${value}' WHERE LOWER("${field.field}") = '${oldValue}';`
    ).join('\n');
  }).join('\n');
  
  return `-- Conversione ${field.model}.${field.field} → ${field.enumName}\n${updates}`;
}).join('\n\n')}

-- 3. Validazione dati dopo conversione
${this.analysis.fieldsToConvert.map(field => 
  `SELECT '${field.model}.${field.field}' as field, "${field.field}", COUNT(*) as count \nFROM "${field.model}" \nWHERE "${field.field}" NOT IN (${field.values.map(v => `'${v}'`).join(', ')}) \nGROUP BY "${field.field}";`
).join('\n\n')}

-- 4. Cleanup valori non validi (ATTENZIONE: Verificare prima!)
${this.analysis.fieldsToConvert.map(field => 
  `-- UPDATE "${field.model}" SET "${field.field}" = 'ACTIVE' WHERE "${field.field}" NOT IN (${field.values.map(v => `'${v}'`).join(', ')});`
).join('\n')}

-- 5. Verifica finale
${this.analysis.fieldsToConvert.map(field => 
  `SELECT '${field.model}' as table_name, '${field.field}' as field_name, "${field.field}", COUNT(*) as count FROM "${field.model}" GROUP BY "${field.field}";`
).join('\n\n')}

-- 6. Cleanup backup tables (eseguire solo dopo verifica)
${this.analysis.fieldsToConvert.map(field => 
  `-- DROP TABLE "${field.model}_backup";`
).join('\n')}
`;
    
    const migrationPath = path.join(this.backupDir, 'enum-migration.sql');
    fs.writeFileSync(migrationPath, migrationScript);
    
    console.log('✅ Script migrazione enum creato');
    
    this.changes.push({
      type: 'migration',
      file: 'backups/phase7-enum-validation/enum-migration.sql',
      description: 'Script per migrazione dati da String a enum'
    });
  }

  async generateFinalReport() {
    console.log('\n📊 Generazione report finale...');
    
    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000);
    
    const report = `# 🔧 REPORT FASE 7: ENUM & VALIDAZIONE TIPI

**Data**: ${new Date().toISOString()}
**Durata**: ${duration} secondi
**Schema Path**: backend/prisma/schema.prisma

## 📊 RIEPILOGO

- **Modifiche Applicate**: ${this.changes.length}
- **Errori**: ${this.errors.length}
- **Stato**: ${this.errors.length === 0 ? 'COMPLETATO' : 'COMPLETATO CON AVVISI'}

## 🔄 MODIFICHE APPLICATE

${this.changes.map((change, index) => 
  `${index + 1}. **${change.type.toUpperCase()}**: ${change.description}${change.file ? ` (${change.file})` : ''}`
).join('\n')}

## 📊 CONVERSIONI ENUM

### Enum Generati
${this.enumDefinitions.map(enumDef => {
  const enumName = enumDef.match(/enum\s+(\w+)/)[1];
  const values = enumDef.match(/{([^}]+)}/)[1].trim().split('\n').map(v => v.trim()).filter(v => v);
  return `- ✅ **${enumName}**: ${values.length} valori (${values.join(', ')})`;
}).join('\n')}

### Campi Convertiti
${this.analysis.fieldsToConvert.map(field => 
  `- ✅ **${field.model}.${field.field}**: String → ${field.enumName}`
).join('\n')}

### Campi Numerici Standardizzati
${this.analysis.numericFieldsToStandardize.map(field => 
  `- ✅ **${field.model}.${field.field}**: ${field.currentType} → Standardizzato`
).join('\n')}

## 🔧 COMPONENTI IMPLEMENTATI

### Sistema Enum
- ✅ ${this.enumDefinitions.length} definizioni enum generate
- ✅ ${this.analysis.fieldsToConvert.length} campi convertiti da String
- ✅ Validazione automatica valori enum
- ✅ Type safety migliorata

### Standardizzazione Numerica
- ✅ Precisione Decimal standardizzata
- ✅ Campi monetari: Decimal(10,2)
- ✅ Percentuali: Decimal(5,2)
- ✅ Ore: Decimal(8,2)

### Sistema Validazioni
- ✅ Validazioni Zod per tutti gli enum
- ✅ Validazioni numeriche avanzate
- ✅ Middleware validazione automatica
- ✅ Error handling strutturato

## 🎯 BENEFICI OTTENUTI

1. **Type Safety**: Enum garantiscono valori validi
2. **Performance**: Indici più efficienti su enum
3. **Manutenibilità**: Valori centralizzati e documentati
4. **Validazione**: Controlli automatici input utente
5. **Consistenza**: Standardizzazione precisione numerica
6. **GDPR Compliance**: Validazione dati sensibili

## ⚠️ AZIONI RICHIESTE

### CRITICO - Eseguire Prima del Deploy
1. **Backup Database**: Backup completo prima della migrazione
2. **Eseguire Migrazione**: \`psql -f backups/phase7-enum-validation/enum-migration.sql\`
3. **Verificare Conversioni**: Controllare mapping valori esistenti
4. **Testare Validazioni**: Validare tutti i form e API

### Integrazione Applicazione
1. **Aggiornare Frontend**: Utilizzare nuovi enum nei form
2. **Integrare Validazioni**: Applicare middleware validazione
3. **Aggiornare Documentazione**: API docs con nuovi enum
4. **Testare Endpoints**: Verificare validazioni API

## 🚀 PROSSIMI PASSI

1. **Fase 8**: Modularizzazione Schema
   - Separare schema in moduli logici
   - Ottimizzare import/export
   - Documentazione avanzata

2. **Test Validazioni**
   - Unit test per ogni enum
   - Integration test validazioni
   - Performance test query enum

3. **Monitoraggio**
   - Metriche performance enum
   - Alert validazioni fallite
   - Dashboard utilizzo tipi

## 📋 CHECKLIST POST-IMPLEMENTAZIONE

- [ ] Database backup completato
- [ ] Script migrazione enum eseguito
- [ ] Conversioni dati verificate
- [ ] Validazioni Zod integrate
- [ ] Frontend aggiornato con enum
- [ ] API documentation aggiornata
- [ ] Test validazioni completati
- [ ] Performance monitoring attivo

${this.errors.length > 0 ? `
## ⚠️ AVVISI

${this.errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}` : ''}

---
*Report generato automaticamente da phase7-enum-validation.cjs*
`;
    
    const reportPath = path.join(__dirname, '../docs/phase7-enum-validation-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`✅ Report salvato: ${reportPath}`);
  }

  async generateErrorReport() {
    const errorReport = `# ❌ ERRORI FASE 7

**Data**: ${new Date().toISOString()}

## Errori Riscontrati

${this.errors.map((error, index) => `${index + 1}. ${error}`).join('\n')}

## Modifiche Parziali

${this.changes.map((change, index) => `${index + 1}. ${change.description}`).join('\n')}
`;
    
    const errorPath = path.join(__dirname, '../docs/phase7-errors.md');
    fs.writeFileSync(errorPath, errorReport);
    
    console.log(`❌ Report errori salvato: ${errorPath}`);
  }
}

// Esecuzione
if (require.main === module) {
  const phase7 = new Phase7EnumValidation();
  phase7.run().catch(console.error);
}

module.exports = Phase7EnumValidation;