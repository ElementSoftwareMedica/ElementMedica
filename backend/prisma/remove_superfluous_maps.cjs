#!/usr/bin/env node

/**
 * Script per rimuovere @map superflui dallo schema Prisma
 * Mantiene solo i @map necessari per compatibilità database
 * 
 * Fase 2: Naming & Convenzioni - Ottimizzazione Schema Prisma
 */

const fs = require('fs');
const path = require('path');

class MapRemover {
  constructor() {
    this.schemaPath = path.join(__dirname, 'schema.prisma');
    this.backupPath = path.join(__dirname, `schema.prisma.backup-map-removal-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    this.changes = [];
  }

  async execute() {
    console.log('🚀 Avvio rimozione @map superflui...');
    
    try {
      // 1. Backup schema corrente
      await this.createBackup();
      
      // 2. Leggi schema
      const schema = fs.readFileSync(this.schemaPath, 'utf8');
      
      // 3. Rimuovi @map superflui
      const cleanedSchema = this.removeSuperFluousMaps(schema);
      
      // 4. Scrivi schema pulito
      fs.writeFileSync(this.schemaPath, cleanedSchema);
      
      // 5. Report
      this.printReport();
      
      console.log('✅ Rimozione @map completata con successo!');
      
    } catch (error) {
      console.error('❌ Errore durante rimozione @map:', error.message);
      await this.rollback();
      throw error;
    }
  }

  async createBackup() {
    console.log('📦 Creazione backup schema...');
    fs.copyFileSync(this.schemaPath, this.backupPath);
    console.log(`✅ Backup creato: ${this.backupPath}`);
  }

  removeSuperFluousMaps(schema) {
    console.log('🧹 Rimozione @map superflui...');
    
    let cleanedSchema = schema;
    
    // Lista dei @map da rimuovere (quelli che mappano camelCase a snake_case)
    const mapsToRemove = [
      // Timestamp standard
      '@map("created_at")',
      '@map("updated_at")',
      '@map("deleted_at")',
      
      // Company fields
      '@map("ragione_sociale")', // ragioneSociale già in camelCase
      
      // Attestato fields
      '@map("partecipante_id")', // personId già in camelCase
      '@map("nome_file")', // fileName già in camelCase
      '@map("url")', // fileUrl già in camelCase
      '@map("data_generazione")', // generatedAt già in camelCase
      
      // RegistroPresenzePartecipante
      '@map("hours")', // ore già in camelCase
      
      // PreventivoPartecipante
      '@map("partecipante_id")', // personId già in camelCase (duplicato ma ok)
      
      // ActivityLog
      '@map("user_id")', // personId già in camelCase
      
      // TestPartecipante
      '@map("stato")', // status già in camelCase
      
      // Tenant fields
      '@map("billing_plan")',
      '@map("max_users")',
      '@map("max_companies")',
      '@map("is_active")',
      
      // EnhancedUserRole
      '@map("user_id")', // personId già in camelCase (duplicato ma ok)
    ];
    
    // Rimuovi ogni @map superfluo
    mapsToRemove.forEach(mapToRemove => {
      const regex = new RegExp(`\\s*${mapToRemove.replace(/[()"]/g, '\\$&')}`, 'g');
      const matches = cleanedSchema.match(regex);
      if (matches) {
        cleanedSchema = cleanedSchema.replace(regex, '');
        this.changes.push({
          type: 'removed',
          map: mapToRemove,
          count: matches.length
        });
      }
    });
    
    // Rimuovi righe vuote multiple
    cleanedSchema = cleanedSchema.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return cleanedSchema;
  }

  printReport() {
    console.log('\n📊 Report Rimozione @map:');
    console.log('=' .repeat(50));
    
    if (this.changes.length === 0) {
      console.log('ℹ️  Nessun @map superfluo trovato.');
      return;
    }
    
    let totalRemoved = 0;
    this.changes.forEach(change => {
      console.log(`✅ Rimosso ${change.count}x: ${change.map}`);
      totalRemoved += change.count;
    });
    
    console.log('=' .repeat(50));
    console.log(`🎯 Totale @map rimossi: ${totalRemoved}`);
    console.log(`📁 Backup disponibile: ${this.backupPath}`);
  }

  async rollback() {
    console.log('🔄 Rollback in corso...');
    if (fs.existsSync(this.backupPath)) {
      fs.copyFileSync(this.backupPath, this.schemaPath);
      console.log('✅ Rollback completato');
    }
  }
}

// Esecuzione
if (require.main === module) {
  const remover = new MapRemover();
  remover.execute()
    .then(() => {
      console.log('\n🎉 Processo completato con successo!');
      console.log('\n📋 Prossimi passi:');
      console.log('1. Eseguire: npx prisma generate');
      console.log('2. Testare il login: node test_login_verification.cjs');
      console.log('3. Verificare che tutto funzioni correttamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Processo fallito:', error.message);
      process.exit(1);
    });
}

module.exports = MapRemover;