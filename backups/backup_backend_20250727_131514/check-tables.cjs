/**
 * Script per verificare le tabelle esistenti nel database
 */

const { Client } = require('pg');
require('dotenv').config();

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/training_platform?schema=public"
  });

  try {
    await client.connect();
    console.log('🔍 === VERIFICA TABELLE DATABASE ===\n');

    // Verifica tutte le tabelle
    const tablesResult = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`📊 Totale tabelle: ${tablesResult.rows.length}\n`);
    
    if (tablesResult.rows.length === 0) {
      console.log('❌ NESSUNA TABELLA TROVATA - Il database potrebbe essere vuoto!');
    } else {
      console.log('📋 TABELLE ESISTENTI:');
      tablesResult.rows.forEach(table => {
        console.log(`   - ${table.table_name} (${table.table_type})`);
      });
    }

    // Verifica tabelle specifiche che dovrebbero esistere
    console.log('\n🔍 VERIFICA TABELLE CRITICHE:');
    const criticalTables = ['Person', 'PersonRole', 'Tenant', 'Company', 'Course'];
    
    for (const tableName of criticalTables) {
      const exists = tablesResult.rows.some(row => row.table_name === tableName);
      console.log(`   - ${tableName}: ${exists ? '✅ Esiste' : '❌ NON ESISTE'}`);
    }

    // Verifica schema Prisma
    console.log('\n🔧 VERIFICA MIGRAZIONI PRISMA:');
    const migrationsResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = '_prisma_migrations'
    `);

    if (migrationsResult.rows.length > 0) {
      console.log('✅ Tabella _prisma_migrations trovata');
      
      const migrationsData = await client.query(`
        SELECT migration_name, finished_at, applied_steps_count
        FROM _prisma_migrations 
        ORDER BY finished_at DESC
        LIMIT 5
      `);
      
      console.log('📋 Ultime 5 migrazioni:');
      migrationsData.rows.forEach(migration => {
        console.log(`   - ${migration.migration_name} (${migration.applied_steps_count} steps) - ${migration.finished_at}`);
      });
    } else {
      console.log('❌ Tabella _prisma_migrations NON trovata - Prisma non inizializzato!');
    }

    console.log('\n✅ Verifica completata');

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();