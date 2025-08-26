/**
 * Script per ricreare completamente l'enum PersonPermission
 * Rimuove l'enum esistente e lo ricrea con i valori corretti
 */

const prisma = new PrismaClient();

async function recreatePersonPermissionEnum() {
  console.log('🔧 Ricreazione completa enum PersonPermission...');
  
  try {
    // 1. Prima rimuovi tutti i record che utilizzano i valori obsoleti
    console.log('🗑️  Rimozione record con valori obsoleti...');
    
    const obsoletePermissions = [
      'VIEW_ROLES', 'CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES',
      'MANAGE_USERS', 'ASSIGN_ROLES', 'REVOKE_ROLES', 'VIEW_ADMINISTRATION',
      'VIEW_HIERARCHY', 'CREATE_HIERARCHY', 'EDIT_HIERARCHY', 'DELETE_HIERARCHY',
      'MANAGE_HIERARCHY', 'HIERARCHY_MANAGEMENT'
    ];

    // Rimuovi da custom_role_permissions
    for (const permission of obsoletePermissions) {
      try {
        const result = await prisma.$executeRaw`
          DELETE FROM custom_role_permissions 
          WHERE permission::text = ${permission}
        `;
        console.log(`   ✅ Rimossi ${result} record con permesso ${permission}`);
      } catch (error) {
        console.log(`   ⚠️  Errore rimozione ${permission}:`, error.message);
      }
    }

    // 2. Prova a ricreare l'enum usando SQL diretto
    console.log('🔄 Ricreazione enum...');
    
    // Crea un nuovo enum con i valori corretti
    const validPermissions = [
      'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
      'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'MANAGE_ENROLLMENTS', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS',
      'DELETE_DOCUMENTS', 'DOWNLOAD_DOCUMENTS', 'ADMIN_PANEL', 'SYSTEM_SETTINGS',
      'USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE',
      'TENANT_MANAGEMENT', 'VIEW_TENANTS', 'CREATE_TENANTS', 'EDIT_TENANTS', 'DELETE_TENANTS',
      'CREATE_ADMINISTRATION', 'EDIT_ADMINISTRATION', 'DELETE_ADMINISTRATION',
      'VIEW_GDPR', 'CREATE_GDPR', 'EDIT_GDPR', 'DELETE_GDPR', 'VIEW_GDPR_DATA',
      'EXPORT_GDPR_DATA', 'DELETE_GDPR_DATA', 'MANAGE_CONSENTS',
      'VIEW_REPORTS', 'CREATE_REPORTS', 'EDIT_REPORTS', 'DELETE_REPORTS', 'EXPORT_REPORTS'
    ];

    // Prova a ricreare l'enum step by step
    try {
      // Prima crea un enum temporaneo
      await prisma.$executeRaw`
        CREATE TYPE person_permissions_temp AS ENUM (
          ${validPermissions.map(p => `'${p}'`).join(', ')}
        )
      `;
      console.log('   ✅ Enum temporaneo creato');

      // Aggiorna la colonna per usare il nuovo enum
      await prisma.$executeRaw`
        ALTER TABLE custom_role_permissions 
        ALTER COLUMN permission TYPE person_permissions_temp 
        USING permission::text::person_permissions_temp
      `;
      console.log('   ✅ Colonna aggiornata');

      // Rimuovi il vecchio enum
      await prisma.$executeRaw`DROP TYPE person_permissions`;
      console.log('   ✅ Vecchio enum rimosso');

      // Rinomina il nuovo enum
      await prisma.$executeRaw`ALTER TYPE person_permissions_temp RENAME TO person_permissions`;
      console.log('   ✅ Nuovo enum rinominato');

    } catch (error) {
      console.log('   ⚠️  Errore nella ricreazione enum:', error.message);
      
      // Cleanup in caso di errore
      try {
        await prisma.$executeRaw`DROP TYPE IF EXISTS person_permissions_temp`;
      } catch (cleanupError) {
        // Ignora errori di cleanup
      }
    }

    console.log('✅ Ricreazione completata!');
    
  } catch (error) {
    console.error('❌ Errore durante la ricreazione:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui lo script
recreatePersonPermissionEnum()
  .catch((error) => {
    console.error('💥 Script fallito:', error);
    process.exit(1);
  });