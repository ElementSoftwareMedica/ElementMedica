/**
 * Script per configurare i permessi direttamente nel database
 * Usa pg per evitare problemi con Prisma
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function setupPermissions() {
  try {
    console.log('🚀 Connessione al database...');
    await client.connect();
    
    console.log('📝 Creazione permessi...');
    
    // Inserisci i permessi
    const permissions = [
      { name: 'companies:read', description: 'Read companies' },
      { name: 'companies:write', description: 'Write companies' },
      { name: 'companies:create', description: 'Create companies' },
      { name: 'companies:update', description: 'Update companies' },
      { name: 'companies:delete', description: 'Delete companies' },
      { name: 'users:read', description: 'Read users' },
      { name: 'users:write', description: 'Write users' },
      { name: 'users:create', description: 'Create users' },
      { name: 'users:update', description: 'Update users' },
      { name: 'users:delete', description: 'Delete users' },
      { name: 'employees:read', description: 'Read employees' },
      { name: 'employees:write', description: 'Write employees' },
      { name: 'employees:create', description: 'Create employees' },
      { name: 'employees:update', description: 'Update employees' },
      { name: 'employees:delete', description: 'Delete employees' },
      { name: 'courses:read', description: 'Read courses' },
      { name: 'courses:write', description: 'Write courses' },
      { name: 'courses:create', description: 'Create courses' },
      { name: 'courses:update', description: 'Update courses' },
      { name: 'courses:delete', description: 'Delete courses' },
      { name: 'system:admin', description: 'System administration' },
      { name: 'system:read', description: 'System read access' },
      { name: 'system:write', description: 'System write access' }
    ];
    
    for (const permission of permissions) {
      try {
        await client.query(
          `INSERT INTO "Permission" (id, name, description, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
           ON CONFLICT (name) DO NOTHING`,
          [permission.name, permission.description]
        );
        console.log(`   ✅ Permesso creato: ${permission.name}`);
      } catch (error) {
        console.log(`   ⚠️  Permesso già esistente: ${permission.name}`);
      }
    }
    
    console.log('🔑 Assegnazione permessi ai ruoli ADMIN e SUPER_ADMIN...');
    
    // Assegna permessi al ruolo ADMIN
    await client.query(`
      INSERT INTO "RolePermission" (id, "roleType", "permissionId", "createdAt", "updatedAt")
      SELECT 
        gen_random_uuid(),
        'ADMIN',
        p.id,
        NOW(),
        NOW()
      FROM "Permission" p
      WHERE p.name IN (
        'companies:read', 'companies:write', 'companies:create', 'companies:update', 'companies:delete',
        'users:read', 'users:write', 'users:create', 'users:update', 'users:delete',
        'employees:read', 'employees:write', 'employees:create', 'employees:update', 'employees:delete',
        'courses:read', 'courses:write', 'courses:create', 'courses:update', 'courses:delete',
        'system:admin', 'system:read', 'system:write'
      )
      ON CONFLICT ("roleType", "permissionId") DO NOTHING
    `);
    
    // Assegna permessi al ruolo SUPER_ADMIN
    await client.query(`
      INSERT INTO "RolePermission" (id, "roleType", "permissionId", "createdAt", "updatedAt")
      SELECT 
        gen_random_uuid(),
        'SUPER_ADMIN',
        p.id,
        NOW(),
        NOW()
      FROM "Permission" p
      WHERE p.name IN (
        'companies:read', 'companies:write', 'companies:create', 'companies:update', 'companies:delete',
        'users:read', 'users:write', 'users:create', 'users:update', 'users:delete',
        'employees:read', 'employees:write', 'employees:create', 'employees:update', 'employees:delete',
        'courses:read', 'courses:write', 'courses:create', 'courses:update', 'courses:delete',
        'system:admin', 'system:read', 'system:write'
      )
      ON CONFLICT ("roleType", "permissionId") DO NOTHING
    `);
    
    console.log('📊 Verifica permessi assegnati...');
    
    const result = await client.query(`
      SELECT 
        rp."roleType",
        p.name as permission_name,
        p.description
      FROM "RolePermission" rp
      JOIN "Permission" p ON rp."permissionId" = p.id
      WHERE rp."roleType" IN ('ADMIN', 'SUPER_ADMIN')
      ORDER BY rp."roleType", p.name
    `);
    
    console.log('\n🎉 Permessi configurati con successo!');
    console.log(`\n📋 Riepilogo (${result.rows.length} permessi totali):`);
    
    const adminPermissions = result.rows.filter(row => row.roleType === 'ADMIN');
    const superAdminPermissions = result.rows.filter(row => row.roleType === 'SUPER_ADMIN');
    
    console.log(`   🔑 ADMIN: ${adminPermissions.length} permessi`);
    console.log(`   🔑 SUPER_ADMIN: ${superAdminPermissions.length} permessi`);
    
    console.log('\n✅ L\'utente admin ora ha accesso completo alle companies!');
    
  } catch (error) {
    console.error('❌ Errore durante la configurazione dei permessi:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Esegui lo script
setupPermissions()
  .then(() => {
    console.log('\n✅ Script completato con successo');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fallito:', error);
    process.exit(1);
  });