const { Client } = require('pg');
require('dotenv').config();

async function checkTableStructure() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔍 === VERIFICA STRUTTURA TABELLE ===\n');

    // Verifica struttura tabella persons
    console.log('👤 STRUTTURA TABELLA persons:');
    const personsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'persons' 
      ORDER BY ordinal_position
    `);
    
    if (personsStructure.rows.length > 0) {
      console.log('✅ Colonne trovate:');
      personsStructure.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
      });
    } else {
      console.log('❌ Tabella persons non trovata');
    }

    // Verifica struttura tabella person_roles
    console.log('\n🎭 STRUTTURA TABELLA person_roles:');
    const rolesStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'person_roles' 
      ORDER BY ordinal_position
    `);
    
    if (rolesStructure.rows.length > 0) {
      console.log('✅ Colonne trovate:');
      rolesStructure.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
      });
    } else {
      console.log('❌ Tabella person_roles non trovata');
    }

    // Verifica struttura tabella tenants
    console.log('\n🏢 STRUTTURA TABELLA tenants:');
    const tenantsStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      ORDER BY ordinal_position
    `);
    
    if (tenantsStructure.rows.length > 0) {
      console.log('✅ Colonne trovate:');
      tenantsStructure.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
      });
    } else {
      console.log('❌ Tabella tenants non trovata');
    }

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  } finally {
    await client.end();
    console.log('\n✅ Verifica completata');
  }
}

checkTableStructure();