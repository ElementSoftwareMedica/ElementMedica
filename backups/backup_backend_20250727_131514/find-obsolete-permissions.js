/**
 * Script per trovare e rimuovere tutti i riferimenti ai valori enum obsoleti
 * Controlla tutte le tabelle che potrebbero contenere PersonPermission
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAndFixObsoletePermissions() {
  console.log('🔍 Ricerca completa dei valori enum obsoleti...');
  
  try {
    const obsoletePermissions = [
      'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
      'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES', 'VIEW_ADMINISTRATION',
      'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY',
      'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT'
    ];

    // 1. Controlla custom_role_permissions
    console.log('📋 Controllo custom_role_permissions...');
    const customRolePerms = await prisma.$queryRaw`
      SELECT id, permission::text as permission, "customRoleId"
      FROM custom_role_permissions 
      WHERE permission::text = ANY(${obsoletePermissions})
    `;
    console.log(`   Trovati ${customRolePerms.length} record in custom_role_permissions`);
    
    if (customRolePerms.length > 0) {
      console.log('   Dettagli:', customRolePerms);
      
      // Rimuovi i record
      for (const perm of customRolePerms) {
        await prisma.$executeRaw`
          DELETE FROM custom_role_permissions 
          WHERE id = ${perm.id}
        `;
        console.log(`   ✅ Rimosso record ${perm.id} con permesso ${perm.permission}`);
      }
    }

    // 2. Controlla se ci sono altre tabelle con enum PersonPermission
    console.log('📋 Controllo altre possibili tabelle...');
    
    // Cerca in tutte le tabelle che potrebbero avere colonne con enum PersonPermission
    const tables = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE udt_name = 'person_permissions'
      OR udt_name = 'person_permissions_new'
    `;
    
    console.log('   Tabelle con enum PersonPermission:', tables);
    
    // 3. Controlla se ci sono valori di default problematici
    console.log('📋 Controllo valori di default...');
    const defaults = await prisma.$queryRaw`
      SELECT table_name, column_name, column_default
      FROM information_schema.columns 
      WHERE column_default IS NOT NULL 
      AND (udt_name = 'person_permissions' OR udt_name = 'person_permissions_new')
    `;
    
    console.log('   Valori di default:', defaults);

    // 4. Controlla se ci sono constraint che utilizzano questi valori
    console.log('📋 Controllo constraint...');
    const constraints = await prisma.$queryRaw`
      SELECT constraint_name, table_name, check_clause
      FROM information_schema.check_constraints 
      WHERE check_clause LIKE '%person_permissions%'
    `;
    
    console.log('   Constraint trovati:', constraints);

    console.log('✅ Analisi completata!');
    
  } catch (error) {
    console.error('❌ Errore durante l\'analisi:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
findAndFixObsoletePermissions()
  .catch((error) => {
    console.error('💥 Script fallito:', error);
    process.exit(1);
  });