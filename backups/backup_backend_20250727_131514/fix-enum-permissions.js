/**
 * Script per risolvere il problema degli enum PersonPermission obsoleti
 * Rimuove i valori enum non più validi dal database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEnumPermissions() {
  console.log('🔧 Avvio riparazione enum PersonPermission...');
  
  try {
    // Valori enum obsoleti da rimuovere
    const obsoletePermissions = [
      'VIEW_ROLES',
      'CREATE_ROLES', 
      'EDIT_ROLES',
      'DELETE_ROLES',
      'MANAGE_USERS',
      'ASSIGN_ROLES',
      'REVOKE_ROLES',
      'VIEW_ADMINISTRATION',
      'VIEW_HIERARCHY',
      'CREATE_HIERARCHY',
      'EDIT_HIERARCHY', 
      'DELETE_HIERARCHY',
      'MANAGE_HIERARCHY',
      'HIERARCHY_MANAGEMENT'
    ];

    console.log('📋 Valori obsoleti da rimuovere:', obsoletePermissions);

    // 1. Rimuovi i permessi obsoleti da CustomRolePermission
    console.log('🗑️  Rimozione permessi obsoleti da CustomRolePermission...');
    
    for (const permission of obsoletePermissions) {
      const result = await prisma.$executeRaw`
        DELETE FROM custom_role_permissions 
        WHERE permission::text = ${permission}
      `;
      console.log(`   ✅ Rimossi ${result} record con permesso ${permission}`);
    }

    // 2. Verifica che non ci siano altri riferimenti
    console.log('🔍 Verifica altri riferimenti...');
    
    const remainingObsolete = await prisma.$queryRaw`
      SELECT DISTINCT permission::text as permission
      FROM custom_role_permissions 
      WHERE permission::text IN (${obsoletePermissions.map(p => `'${p}'`).join(',')})
    `;
    
    if (remainingObsolete.length > 0) {
      console.log('⚠️  Trovati ancora riferimenti obsoleti:', remainingObsolete);
    } else {
      console.log('✅ Nessun riferimento obsoleto trovato');
    }

    console.log('✅ Riparazione completata con successo!');
    console.log('🔄 Ora puoi eseguire: npx prisma db push');
    
  } catch (error) {
    console.error('❌ Errore durante la riparazione:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
fixEnumPermissions()
  .catch((error) => {
    console.error('💥 Script fallito:', error);
    process.exit(1);
  });