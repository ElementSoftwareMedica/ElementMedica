/**
 * Script per verificare i dati nel database usando pg direttamente
 */

const { Client } = require('pg');
require('dotenv').config();

async function checkDatabaseData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/training_platform?schema=public"
  });

  try {
    await client.connect();
    console.log('🔍 === VERIFICA DATI DATABASE ===\n');

    // 1. Verifica utenti (persons)
    console.log('👤 UTENTI (persons):');
    const personsResult = await client.query(`
      SELECT id, email, "firstName", "lastName", status, "createdAt"
      FROM persons 
      WHERE "deletedAt" IS NULL 
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    console.log(`   Totale utenti attivi: ${personsResult.rows.length}`);
    personsResult.rows.forEach(person => {
      console.log(`   - ${person.email} (${person.firstName} ${person.lastName}) - Status: ${person.status}`);
    });

    // 2. Verifica ruoli (person_roles)
    console.log('\n🎭 RUOLI (person_roles):');
    const rolesResult = await client.query(`
      SELECT pr."roleType", pr."isActive", p.email, p."firstName", p."lastName"
      FROM person_roles pr
      JOIN persons p ON pr."personId" = p.id
      WHERE pr."isActive" = true AND p."deletedAt" IS NULL
      ORDER BY pr."roleType", p.email
    `);

    console.log(`   Totale ruoli attivi: ${rolesResult.rows.length}`);
    const roleStats = {};
    rolesResult.rows.forEach(role => {
      if (!roleStats[role.roleType]) {
        roleStats[role.roleType] = 0;
      }
      roleStats[role.roleType]++;
    });

    Object.entries(roleStats).forEach(([roleType, count]) => {
      console.log(`   - ${roleType}: ${count} utenti`);
    });

    // 3. Verifica utente admin specifico
    console.log('\n👑 UTENTE ADMIN (admin@example.com):');
    const adminResult = await client.query(`
      SELECT p.*, 
             array_agg(pr."roleType") FILTER (WHERE pr."isActive" = true) as roles
      FROM persons p
      LEFT JOIN person_roles pr ON p.id = pr."personId"
      WHERE p.email = 'admin@example.com' AND p."deletedAt" IS NULL
      GROUP BY p.id
    `);

    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log(`   ✅ Admin trovato: ${admin.firstName} ${admin.lastName}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Ruoli: ${admin.roles && Array.isArray(admin.roles) ? admin.roles.join(', ') : admin.roles || 'Nessun ruolo'}`);
      console.log(`   Status: ${admin.status}`);
      console.log(`   Global Role: ${admin.globalRole || 'Non definito'}`);
    } else {
      console.log('   ❌ Admin non trovato');
    }

    // 4. Verifica tenant
    console.log('\n🏢 TENANT:');
    const tenantsResult = await client.query(`
      SELECT id, name, created_at
      FROM tenants 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `);

    console.log(`   Totale tenant attivi: ${tenantsResult.rows.length}`);
    tenantsResult.rows.forEach(tenant => {
      console.log(`   - ${tenant.name} - ID: ${tenant.id}`);
    });

    // 5. Verifica struttura tabelle importanti
    console.log('\n📊 VERIFICA TABELLE:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`   Totale tabelle: ${tablesResult.rows.length}`);
    const importantTables = ['persons', 'person_roles', 'tenants', 'companies'];
    importantTables.forEach(tableName => {
      const exists = tablesResult.rows.some(row => row.table_name === tableName);
      console.log(`   - ${tableName}: ${exists ? '✅' : '❌'}`);
    });

    console.log('\n✅ Verifica completata');

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  } finally {
    await client.end();
  }
}

checkDatabaseData();