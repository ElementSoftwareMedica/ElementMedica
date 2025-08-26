#!/usr/bin/env node

/**
 * 🔍 SCHEMA ANALYSIS SCRIPT
 * Analizza lo schema Prisma attuale per identificare problemi di ottimizzazione
 * 
 * Fase 1: Analisi e Preparazione
 * Data: Dicembre 2024
 */

const fs = require('fs');
const path = require('path');

class SchemaAnalyzer {
  constructor() {
    this.schemaPath = path.join(__dirname, '../prisma/schema.prisma');
    this.results = {
      namingIssues: [],
      missingIndices: [],
      relationIssues: [],
      multiTenantIssues: [],
      enumOpportunities: [],
      performanceIssues: [],
      summary: {}
    };
  }

  async analyze() {
    console.log('🔍 Avvio analisi schema Prisma...');
    
    const schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    
    this.analyzeNamingConventions(schemaContent);
    this.analyzeMissingIndices(schemaContent);
    this.analyzeRelations(schemaContent);
    this.analyzeMultiTenant(schemaContent);
    this.analyzeEnumOpportunities(schemaContent);
    this.analyzePerformanceIssues(schemaContent);
    
    this.generateSummary();
    this.generateReport();
    
    console.log('✅ Analisi completata!');
  }

  analyzeNamingConventions(content) {
    console.log('📝 Analizzando convenzioni di naming...');
    
    // Trova campi snake_case
    const snakeCaseFields = [];
    const fieldRegex = /^\s*(\w+)\s+\w+.*$/gm;
    let match;
    
    while ((match = fieldRegex.exec(content)) !== null) {
      const fieldName = match[1];
      if (fieldName.includes('_') && !fieldName.startsWith('@@') && !fieldName.startsWith('@')) {
        snakeCaseFields.push(fieldName);
      }
    }
    
    // Trova @map superflui
    const superfluousMaps = [];
    const mapRegex = /@map\("([^"]+)"\)/g;
    
    while ((match = mapRegex.exec(content)) !== null) {
      const mappedName = match[1];
      // Se il nome del campo è già uguale al mapping, è superfluo
      superfluousMaps.push(mappedName);
    }
    
    this.results.namingIssues = {
      snakeCaseFields: [...new Set(snakeCaseFields)],
      superfluousMaps: [...new Set(superfluousMaps)],
      count: snakeCaseFields.length + superfluousMaps.length
    };
  }

  analyzeMissingIndices(content) {
    console.log('📊 Analizzando indici mancanti...');
    
    const foreignKeys = [];
    const existingIndices = [];
    
    // Trova foreign keys
    const fkRegex = /(\w+)\s+\w+.*@relation\(fields:\s*\[(\w+)\]/g;
    let match;
    
    while ((match = fkRegex.exec(content)) !== null) {
      foreignKeys.push(match[2]); // campo FK
    }
    
    // Trova indici esistenti
    const indexRegex = /@@index\(\[([^\]]+)\]/g;
    
    while ((match = indexRegex.exec(content)) !== null) {
      existingIndices.push(match[1].replace(/["\s]/g, ''));
    }
    
    const missingIndices = foreignKeys.filter(fk => 
      !existingIndices.some(idx => idx.includes(fk))
    );
    
    this.results.missingIndices = {
      foreignKeys: [...new Set(foreignKeys)],
      existingIndices: [...new Set(existingIndices)],
      missing: [...new Set(missingIndices)],
      count: missingIndices.length
    };
  }

  analyzeRelations(content) {
    console.log('🔗 Analizzando relazioni...');
    
    const relationsWithoutOnDelete = [];
    const relationRegex = /@relation\([^)]*\)/g;
    let match;
    
    while ((match = relationRegex.exec(content)) !== null) {
      const relationDef = match[0];
      if (!relationDef.includes('onDelete')) {
        relationsWithoutOnDelete.push(relationDef);
      }
    }
    
    this.results.relationIssues = {
      withoutOnDelete: relationsWithoutOnDelete,
      count: relationsWithoutOnDelete.length
    };
  }

  analyzeMultiTenant(content) {
    console.log('🏢 Analizzando multi-tenancy...');
    
    const nullableTenantIds = [];
    const tenantIdRegex = /tenantId\s+String\?/g;
    let match;
    
    while ((match = tenantIdRegex.exec(content)) !== null) {
      nullableTenantIds.push('tenantId nullable trovato');
    }
    
    this.results.multiTenantIssues = {
      nullableTenantIds: nullableTenantIds.length,
      count: nullableTenantIds.length
    };
  }

  analyzeEnumOpportunities(content) {
    console.log('📋 Analizzando opportunità enum...');
    
    const stringStatusFields = [];
    const statusRegex = /(\w*status\w*)\s+String[\?]?/gi;
    let match;
    
    while ((match = statusRegex.exec(content)) !== null) {
      stringStatusFields.push(match[1]);
    }
    
    // Cerca altri campi che potrebbero essere enum
    const typeFields = [];
    const typeRegex = /(\w*type\w*|\w*mode\w*)\s+String[\?]?/gi;
    
    while ((match = typeRegex.exec(content)) !== null) {
      typeFields.push(match[1]);
    }
    
    this.results.enumOpportunities = {
      statusFields: [...new Set(stringStatusFields)],
      typeFields: [...new Set(typeFields)],
      count: stringStatusFields.length + typeFields.length
    };
  }

  analyzePerformanceIssues(content) {
    console.log('⚡ Analizzando problemi di performance...');
    
    const decimalWithoutPrecision = [];
    const decimalRegex = /(\w+)\s+Decimal\?/g;
    let match;
    
    while ((match = decimalRegex.exec(content)) !== null) {
      if (!content.includes(`@db.Decimal`)) {
        decimalWithoutPrecision.push(match[1]);
      }
    }
    
    this.results.performanceIssues = {
      decimalWithoutPrecision: [...new Set(decimalWithoutPrecision)],
      count: decimalWithoutPrecision.length
    };
  }

  generateSummary() {
    this.results.summary = {
      totalIssues: 
        this.results.namingIssues.count +
        this.results.missingIndices.count +
        this.results.relationIssues.count +
        this.results.multiTenantIssues.count +
        this.results.enumOpportunities.count +
        this.results.performanceIssues.count,
      
      priorityHigh: this.results.missingIndices.count + this.results.multiTenantIssues.count,
      priorityMedium: this.results.relationIssues.count + this.results.performanceIssues.count,
      priorityLow: this.results.namingIssues.count + this.results.enumOpportunities.count
    };
  }

  generateReport() {
    const report = `
# 📊 REPORT ANALISI SCHEMA PRISMA

**Data Analisi**: ${new Date().toISOString()}
**Schema Path**: ${this.schemaPath}

## 📈 RIEPILOGO GENERALE

- **Problemi Totali**: ${this.results.summary.totalIssues}
- **Priorità Alta**: ${this.results.summary.priorityHigh} (Indici, Multi-tenant)
- **Priorità Media**: ${this.results.summary.priorityMedium} (Relazioni, Performance)
- **Priorità Bassa**: ${this.results.summary.priorityLow} (Naming, Enum)

## 🚨 PROBLEMI PRIORITÀ ALTA

### Indici Mancanti (${this.results.missingIndices.count})
${this.results.missingIndices.missing.map(idx => `- ${idx}`).join('\n')}

### Multi-Tenant Issues (${this.results.multiTenantIssues.count})
- tenantId nullable: ${this.results.multiTenantIssues.nullableTenantIds}

## ⚠️ PROBLEMI PRIORITÀ MEDIA

### Relazioni senza onDelete (${this.results.relationIssues.count})
${this.results.relationIssues.withoutOnDelete.slice(0, 5).map(rel => `- ${rel}`).join('\n')}

### Performance Issues (${this.results.performanceIssues.count})
${this.results.performanceIssues.decimalWithoutPrecision.map(field => `- ${field}: Decimal senza precisione`).join('\n')}

## 📝 PROBLEMI PRIORITÀ BASSA

### Naming Conventions (${this.results.namingIssues.count})
- Campi snake_case: ${this.results.namingIssues.snakeCaseFields.length}
- @map superflui: ${this.results.namingIssues.superfluousMaps.length}

### Opportunità Enum (${this.results.enumOpportunities.count})
- Status fields: ${this.results.enumOpportunities.statusFields.length}
- Type fields: ${this.results.enumOpportunities.typeFields.length}

## 🎯 PROSSIMI PASSI

1. **Fase 2**: Naming & Convenzioni (${this.results.namingIssues.count} issues)
2. **Fase 3**: Indici & Vincoli (${this.results.missingIndices.count} issues)
3. **Fase 4**: Relazioni & onDelete (${this.results.relationIssues.count} issues)
4. **Fase 6**: Multi-tenant & Sicurezza (${this.results.multiTenantIssues.count} issues)
5. **Fase 7**: Enum & Validazione Tipi (${this.results.enumOpportunities.count} issues)

---
*Report generato automaticamente dal Schema Analyzer*
`;

    const reportPath = path.join(__dirname, '../docs/schema-analysis-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📋 Report salvato in: ${reportPath}`);
    console.log(`\n🎯 RIEPILOGO:`);
    console.log(`   Problemi Totali: ${this.results.summary.totalIssues}`);
    console.log(`   Priorità Alta: ${this.results.summary.priorityHigh}`);
    console.log(`   Priorità Media: ${this.results.summary.priorityMedium}`);
    console.log(`   Priorità Bassa: ${this.results.summary.priorityLow}`);
  }
}

// Esecuzione
if (require.main === module) {
  const analyzer = new SchemaAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = SchemaAnalyzer;