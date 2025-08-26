/**
 * Script per verificare e correggere i permessi dell'admin
 * Questo script analizza e corregge i permessi dell'utente admin nel database
 */

import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Permessi di default per il ruolo ADMIN dall'enum PersonPermission
const ADMIN_DEFAULT_PERMISSIONS = [
  // Gestione ruoli e permessi
  'ROLE_MANAGEMENT',
  'ROLE_CREATE',
  'ROLE_EDIT', 
  'ROLE_DELETE',
  'VIEW_ROLES',
  'CREATE_ROLES',
  'EDIT_ROLES',
  'DELETE_ROLES',
  'ASSIGN_ROLES',
  'REVOKE_ROLES',
  
  // Gestione utenti
  'USER_MANAGEMENT',
  'MANAGE_USERS',
  'VIEW_USERS',
  'CREATE_USERS',
  'EDIT_USERS',
  'DELETE_USERS',
  
  // Gestione persone
  'VIEW_PERSONS',
  'CREATE_PERSONS',
  'EDIT_PERSONS',
  'DELETE_PERSONS',
  
  // Gestione dipendenti
  'VIEW_EMPLOYEES',
  'CREATE_EMPLOYEES',
  'EDIT_EMPLOYEES',
  'DELETE_EMPLOYEES',
  
  // Gestione formatori
  'VIEW_TRAINERS',
  'CREATE_TRAINERS',
  'EDIT_TRAINERS',
  'DELETE_TRAINERS',
  
  // Gestione aziende
  'VIEW_COMPANIES',
  'CREATE_COMPANIES',
  'EDIT_COMPANIES',
  'DELETE_COMPANIES',
  
  // Gestione corsi
  'VIEW_COURSES',
  'CREATE_COURSES',
  'EDIT_COURSES',
  'DELETE_COURSES',
  'MANAGE_ENROLLMENTS',
  
  // Gestione programmazioni
  'VIEW_SCHEDULES',
  'CREATE_SCHEDULES',
  'EDIT_SCHEDULES',
  'DELETE_SCHEDULES',
  
  // Gestione documenti
  'VIEW_DOCUMENTS',
  'CREATE_DOCUMENTS',
  'EDIT_DOCUMENTS',
  'DELETE_DOCUMENTS',
  'DOWNLOAD_DOCUMENTS',
  
  // Gestione preventivi e fatture
  'VIEW_QUOTES',
  'CREATE_QUOTES',
  'EDIT_QUOTES',
  'DELETE_QUOTES',
  'VIEW_INVOICES',
  'CREATE_INVOICES',
  'EDIT_INVOICES',
  'DELETE_INVOICES',
  
  // Gestione tenant
  'TENANT_MANAGEMENT',
  'VIEW_TENANTS',
  'CREATE_TENANTS',
  'EDIT_TENANTS',
  'DELETE_TENANTS',
  
  // Amministrazione
  'ADMIN_PANEL',
  'SYSTEM_SETTINGS',
  'VIEW_ADMINISTRATION',
  'CREATE_ADMINISTRATION',
  'EDIT_ADMINISTRATION',
  'DELETE_ADMINISTRATION',
  
  // GDPR
  'VIEW_GDPR',
  'CREATE_GDPR',
  'EDIT_GDPR',
  'DELETE_GDPR',
  'VIEW_GDPR_DATA',
  'EXPORT_GDPR_DATA',
  'DELETE_GDPR_DATA',
  'MANAGE_CONSENTS',
  
  // Report
  'VIEW_REPORTS',
  'CREATE_REPORTS',
  'EDIT_REPORTS',
  'DELETE_REPORTS',
  'EXPORT_REPORTS',
  
  // Gerarchia
  'VIEW_HIERARCHY',
  'CREATE_HIERARCHY',
  'EDIT_HIERARCHY',
  'DELETE_HIERARCHY',
  'MANAGE_HIERARCHY',
  'HIERARCHY_MANAGEMENT'
];

async function main() {
  try {
    console.log('🔍 Iniziando verifica e correzione permessi admin...\n');

    // 1. Trova l'utente admin
  console.log('🔍 Ricerca utente admin...');
  const adminUser = await prisma.person.findFirst({
    where: {
      email: 'admin@example.com'
    },
    include: {
      personRoles: {
        where: {
          isActive: true,
          deletedAt: null
        },
        include: {
          permissions: true,
          advancedPermissions: true
        }
      }
    }
  });

    if (!adminUser) {
      console.log('❌ Utente admin non trovato!');
      return;
    }

    console.log(`✅ Utente admin trovato: ${adminUser.email} (ID: ${adminUser.id})`);
    console.log(`   Tenant ID: ${adminUser.tenantId}`);
    console.log(`   Ruoli attivi: ${adminUser.personRoles.length}`);

    // 2. Verifica i ruoli dell'admin
    console.log('\n2. Analisi ruoli admin...');
    let adminRole = adminUser.personRoles.find(role => role.roleType === 'ADMIN');
    
    if (!adminRole) {
      console.log('⚠️  Ruolo ADMIN non trovato, creazione in corso...');
      
      // Crea il ruolo ADMIN per l'utente
      adminRole = await prisma.personRole.create({
        data: {
          personId: adminUser.id,
          roleType: 'ADMIN',
          tenantId: adminUser.tenantId,
          isActive: true,
          assignedAt: new Date(),
          assignedBy: adminUser.id // Auto-assegnato
        },
        include: {
          permissions: true,
          advancedPermissions: true
        }
      });
      
      console.log(`✅ Ruolo ADMIN creato (ID: ${adminRole.id})`);
    } else {
      console.log(`✅ Ruolo ADMIN esistente (ID: ${adminRole.id})`);
    }

    // 3. Verifica i permessi del ruolo ADMIN
    console.log('\n3. Analisi permessi ruolo ADMIN...');
    const currentPermissions = adminRole.permissions || [];
    const currentAdvancedPermissions = adminRole.advancedPermissions || [];
    
    console.log(`   Permessi base attuali: ${currentPermissions.length}`);
    console.log(`   Permessi avanzati attuali: ${currentAdvancedPermissions.length}`);

    // Crea una mappa dei permessi attuali
    const currentPermissionsMap = new Map();
    currentPermissions.forEach(perm => {
      currentPermissionsMap.set(perm.permission, perm.isGranted);
    });

    // 4. Verifica e aggiorna i permessi mancanti
    console.log('\n4. Verifica permessi di default per ADMIN...');
    const missingPermissions = [];
    const incorrectPermissions = [];

    for (const permission of ADMIN_DEFAULT_PERMISSIONS) {
      if (!currentPermissionsMap.has(permission)) {
        missingPermissions.push(permission);
      } else if (!currentPermissionsMap.get(permission)) {
        incorrectPermissions.push(permission);
      }
    }

    console.log(`   Permessi mancanti: ${missingPermissions.length}`);
    console.log(`   Permessi non granted: ${incorrectPermissions.length}`);

    if (missingPermissions.length > 0) {
      console.log('\n   Permessi mancanti:');
      missingPermissions.forEach(perm => console.log(`   - ${perm}`));
    }

    if (incorrectPermissions.length > 0) {
      console.log('\n   Permessi non granted:');
      incorrectPermissions.forEach(perm => console.log(`   - ${perm}`));
    }

    // 5. Correzione permessi
    if (missingPermissions.length > 0 || incorrectPermissions.length > 0) {
      console.log('\n5. Correzione permessi in corso...');
      
      await prisma.$transaction(async (tx) => {
        // Aggiungi permessi mancanti
        if (missingPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: missingPermissions.map(permission => ({
              personRoleId: adminRole.id,
              permission: permission,
              isGranted: true,
              grantedAt: new Date(),
              grantedBy: adminUser.id
            }))
          });
          console.log(`   ✅ Aggiunti ${missingPermissions.length} permessi mancanti`);
        }

        // Correggi permessi non granted
        if (incorrectPermissions.length > 0) {
          for (const permission of incorrectPermissions) {
            await tx.rolePermission.updateMany({
              where: {
                personRoleId: adminRole.id,
                permission: permission
              },
              data: {
                isGranted: true,
                grantedAt: new Date(),
                grantedBy: adminUser.id
              }
            });
          }
          console.log(`   ✅ Corretti ${incorrectPermissions.length} permessi non granted`);
        }
      });
    } else {
      console.log('\n5. ✅ Tutti i permessi sono già corretti!');
    }

    // 6. Verifica finale
    console.log('\n6. Verifica finale...');
    const updatedAdminRole = await prisma.personRole.findUnique({
      where: { id: adminRole.id },
      include: {
        permissions: true,
        advancedPermissions: true
      }
    });

    const finalPermissions = updatedAdminRole.permissions || [];
    const grantedPermissions = finalPermissions.filter(perm => perm.isGranted);
    
    console.log(`   Permessi totali: ${finalPermissions.length}`);
    console.log(`   Permessi granted: ${grantedPermissions.length}`);
    
    // Verifica specificamente ROLE_MANAGEMENT
    const roleManagementPerm = grantedPermissions.find(perm => perm.permission === 'ROLE_MANAGEMENT');
    if (roleManagementPerm) {
      console.log(`   ✅ ROLE_MANAGEMENT: GRANTED`);
    } else {
      console.log(`   ❌ ROLE_MANAGEMENT: NON TROVATO O NON GRANTED`);
    }

    // 7. Test di login simulato
    console.log('\n7. Test di verifica password...');
    const passwordMatch = await bcrypt.compare('Admin123!', adminUser.password);
    console.log(`   Password corretta: ${passwordMatch ? '✅' : '❌'}`);

    console.log('\n🎉 Verifica e correzione completata!');
    console.log('\nRiepilogo:');
    console.log(`- Utente: ${adminUser.email}`);
    console.log(`- Ruolo ADMIN: ${adminRole ? '✅' : '❌'}`);
    console.log(`- Permessi granted: ${grantedPermissions.length}/${ADMIN_DEFAULT_PERMISSIONS.length}`);
    console.log(`- ROLE_MANAGEMENT: ${roleManagementPerm ? '✅' : '❌'}`);
    console.log(`- Password: ${passwordMatch ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('🎉 Script completato con successo!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
  });