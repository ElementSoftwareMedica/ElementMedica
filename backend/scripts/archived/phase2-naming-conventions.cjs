#!/usr/bin/env node

/**
 * 🔧 FASE 2: NAMING CONVENTIONS
 * Converte automaticamente campi snake_case in camelCase
 * e rimuove @map superflui
 * 
 * Data: Dicembre 2024
 */

const fs = require('fs');
const path = require('path');

class NamingConventionsOptimizer {
  constructor() {
    this.schemaPath = path.join(__dirname, '../prisma/schema.prisma');
    this.backupPath = path.join(__dirname, '../prisma/schema.prisma.backup-phase2');
    this.conversions = new Map();
    this.removedMaps = [];
  }

  async optimize() {
    console.log('🔧 Avvio Fase 2: Naming Conventions...');
    
    // Backup
    this.createBackup();
    
    // Leggi schema
    let schemaContent = fs.readFileSync(this.schemaPath, 'utf8');
    
    // Applica conversioni
    schemaContent = this.convertSnakeCaseToCamelCase(schemaContent);
    schemaContent = this.removeSuperfluousMaps(schemaContent);
    
    // Salva schema aggiornato
    fs.writeFileSync(this.schemaPath, schemaContent);
    
    this.generateReport();
    
    console.log('✅ Fase 2 completata!');
  }

  createBackup() {
    console.log('💾 Creando backup...');
    fs.copyFileSync(this.schemaPath, this.backupPath);
    console.log(`   Backup salvato: ${this.backupPath}`);
  }

  convertSnakeCaseToCamelCase(content) {
    console.log('🐍➡️🐪 Convertendo snake_case in camelCase...');
    
    // Mappa delle conversioni specifiche identificate
    const fieldConversions = {
      // Company
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'codice_ateco': 'codiceAteco',
      'persona_riferimento': 'personaRiferimento',
      'sede_azienda': 'sedeAzienda',
      'subscription_plan': 'subscriptionPlan',
      'is_active': 'isActive',
      
      // Course
      'start_date': 'startDate',
      'end_date': 'endDate',
      'max_participants': 'maxParticipants',
      'delivery_mode': 'deliveryMode',
      
      // Altri campi comuni
      'deleted_at': 'deletedAt',
      'employee_id': 'employeeId',
      'scheduled_course_id': 'scheduledCourseId',
      'partecipante_id': 'partecipanteId',
      'nome_file': 'nomeFile',
      'data_generazione': 'dataGenerazione',
      'numero_progressivo': 'numeroProgressivo',
      'anno_progressivo': 'annoProgressivo',
      'registro_presenze_id': 'registroPresenzeId',
      'preventivo_id': 'preventivoId',
      'test_id': 'testId',
      'data_consegna': 'dataConsegna',
      'tempo_impiegato': 'tempoImpiegato',
      'user_id': 'userId',
      'tenant_id': 'tenantId',
      'role_type': 'roleType',
      'role_scope': 'roleScope',
      'company_id': 'companyId',
      'department_id': 'departmentId',
      'is_active': 'isActive',
      'assigned_by': 'assignedBy',
      'assigned_at': 'assignedAt',
      'expires_at': 'expiresAt',
      'usage_type': 'usageType',
      'usage_value': 'usageValue',
      'usage_limit': 'usageLimit',
      'billing_period': 'billingPeriod',
      'custom_role_id': 'customRoleId',
      'person_role_id': 'personRoleId',
      'allowed_fields': 'allowedFields',
      'billing_plan': 'billingPlan',
      'max_users': 'maxUsers',
      'max_companies': 'maxCompanies',
      'config_key': 'configKey',
      'config_value': 'configValue',
      'config_type': 'configType',
      'is_encrypted': 'isEncrypted',
      'tenant_access': 'tenantAccess',
      'created_by': 'createdBy'
    };
    
    // Applica conversioni
    for (const [snakeCase, camelCase] of Object.entries(fieldConversions)) {
      // Converti definizioni di campo
      const fieldRegex = new RegExp(`^(\\s*)(${snakeCase})(\\s+)`, 'gm');
      content = content.replace(fieldRegex, `$1${camelCase}$3`);
      
      // Converti riferimenti nelle relazioni
      const relationRegex = new RegExp(`(fields:\\s*\\[)(${snakeCase})(\\])`, 'g');
      content = content.replace(relationRegex, `$1${camelCase}$3`);
      
      // Converti riferimenti negli indici
      const indexRegex = new RegExp(`(@@index\\(\\[)([^\\]]*)(${snakeCase})([^\\]]*)(\\])`, 'g');
      content = content.replace(indexRegex, (match, p1, p2, p3, p4, p5) => {
        return `${p1}${p2}${camelCase}${p4}${p5}`;
      });
      
      // Converti riferimenti negli unique
      const uniqueRegex = new RegExp(`(@@unique\\(\\[)([^\\]]*)(${snakeCase})([^\\]]*)(\\])`, 'g');
      content = content.replace(uniqueRegex, (match, p1, p2, p3, p4, p5) => {
        return `${p1}${p2}${camelCase}${p4}${p5}`;
      });
      
      this.conversions.set(snakeCase, camelCase);
    }
    
    console.log(`   Convertiti ${this.conversions.size} campi`);
    return content;
  }

  removeSuperfluousMaps(content) {
    console.log('🗑️ Rimuovendo @map superflui...');
    
    // Trova e rimuovi @map dove il nome del campo corrisponde al mapping
    const lines = content.split('\n');
    const updatedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Cerca pattern: fieldName Type @map("field_name")
      const mapMatch = line.match(/^(\s*)(\w+)(\s+\w+.*?)(@map\("([^"]+)"\))(.*?)$/); 
      
      if (mapMatch) {
        const fieldName = mapMatch[2];
        const mappedName = mapMatch[5];
        
        // Se il campo è stato convertito e ora corrisponde al mapping originale, rimuovi @map
        if (this.conversions.has(mappedName) && this.conversions.get(mappedName) === fieldName) {
          // Rimuovi @map
          const newLine = `${mapMatch[1]}${mapMatch[2]}${mapMatch[3]}${mapMatch[6]}`;
          updatedLines.push(newLine);
          this.removedMaps.push(`${fieldName} (era @map("${mappedName}"))`);
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    }
    
    console.log(`   Rimossi ${this.removedMaps.length} @map superflui`);
    return updatedLines.join('\n');
  }

  generateReport() {
    const report = `
# 📋 REPORT FASE 2: NAMING CONVENTIONS

**Data**: ${new Date().toISOString()}
**Schema**: ${this.schemaPath}
**Backup**: ${this.backupPath}

## ✅ CONVERSIONI APPLICATE

### Campi Convertiti (${this.conversions.size})
${Array.from(this.conversions.entries()).map(([old, new_]) => `- \`${old}\` → \`${new_}\``).join('\n')}

### @map Rimossi (${this.removedMaps.length})
${this.removedMaps.map(map => `- ${map}`).join('\n')}

## 🎯 RISULTATI

- **Campi convertiti**: ${this.conversions.size}
- **@map rimossi**: ${this.removedMaps.length}
- **Problemi risolti**: ${this.conversions.size + this.removedMaps.length}

## 📋 PROSSIMI PASSI

1. ✅ **Fase 2 completata**: Naming conventions standardizzate
2. 🔄 **Prossima fase**: Fase 3 - Indici & Vincoli
3. 🧪 **Testing**: Verificare che tutte le query funzionino
4. 🗄️ **Migrazione**: Aggiornare database se necessario

---
*Report generato automaticamente - Fase 2 Optimizer*
`;

    const reportPath = path.join(__dirname, '../docs/phase2-naming-report.md');
    fs.writeFileSync(reportPath, report);
    
    console.log(`\n📋 Report salvato in: ${reportPath}`);
    console.log(`\n🎯 RISULTATI FASE 2:`);
    console.log(`   Campi convertiti: ${this.conversions.size}`);
    console.log(`   @map rimossi: ${this.removedMaps.length}`);
    console.log(`   Problemi risolti: ${this.conversions.size + this.removedMaps.length}`);
  }
}

// Esecuzione
if (require.main === module) {
  const optimizer = new NamingConventionsOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = NamingConventionsOptimizer;