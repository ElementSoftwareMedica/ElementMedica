import { EnhancedRoleService } from '../services/enhancedRoleService.js';

const prisma = new PrismaClient();

// Mapping tra formato entity.action e PersonPermission enum
const PERMISSION_MAPPING = {
  'users.create': 'CREATE_USERS',
  'users.read': 'VIEW_USERS',
  'users.update': 'EDIT_USERS',
  'users.delete': 'DELETE_USERS',
  'companies.create': 'CREATE_COMPANIES',
  'companies.read': 'VIEW_COMPANIES',
  'companies.update': 'EDIT_COMPANIES',
  'companies.delete': 'DELETE_COMPANIES',
  'employees.create': 'CREATE_EMPLOYEES',
  'employees.read': 'VIEW_EMPLOYEES',
  'employees.update': 'EDIT_EMPLOYEES',
  'employees.delete': 'DELETE_EMPLOYEES',
  'trainers.create': 'CREATE_TRAINERS',
  'trainers.read': 'VIEW_TRAINERS',
  'trainers.update': 'EDIT_TRAINERS',
  'trainers.delete': 'DELETE_TRAINERS',
  'courses.create': 'CREATE_COURSES',
  'courses.read': 'VIEW_COURSES',
  'courses.update': 'EDIT_COURSES',
  'courses.delete': 'DELETE_COURSES',
  'enrollments.manage': 'MANAGE_ENROLLMENTS',
  'documents.create': 'CREATE_DOCUMENTS',
  'documents.update': 'EDIT_DOCUMENTS',
  'documents.delete': 'DELETE_DOCUMENTS',
  'documents.download': 'DOWNLOAD_DOCUMENTS',
  'admin.panel': 'ADMIN_PANEL',
  'system.settings': 'SYSTEM_SETTINGS',
  'users.manage': 'USER_MANAGEMENT',
  'roles.manage': 'ROLE_MANAGEMENT',
  'tenants.manage': 'TENANT_MANAGEMENT',
  'gdpr.view': 'VIEW_GDPR_DATA',
  'gdpr.export': 'EXPORT_GDPR_DATA',
  'gdpr.delete': 'DELETE_GDPR_DATA',
  'consents.manage': 'MANAGE_CONSENTS',
  'reports.view': 'VIEW_REPORTS',
  'reports.create': 'CREATE_REPORTS',
  'reports.export': 'EXPORT_REPORTS'
};

// Tutti i permessi disponibili dall'enum
const ALL_PERMISSIONS = [
  'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
  'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
  'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
  'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
  'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
  'MANAGE_ENROLLMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
  'DOWNLOAD_DOCUMENTS', 'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT',
  'ROLE_MANAGEMENT', 'TENANT_MANAGEMENT', 'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA',
  'DELETE_GDPR_DATA', 'MANAGE_CONSENTS', 'VIEW_REPORTS', 'CREATE_REPORTS', 'EXPORT_REPORTS'
];

async function getDefaultPermissionsForRole(roleType) {
  const defaultPermissions = EnhancedRoleService.getDefaultPermissions(roleType);

  // Converte da formato entity.action a PersonPermission enum
  const enumPermissions = defaultPermissions
    .map(perm => PERMISSION_MAPPING[perm])
    .filter(perm => perm && ALL_PERMISSIONS.includes(perm));

  return enumPermissions;
}

async function fixRolePermissions() {
  console.log('🔧 Iniziando correzione permessi ruoli...\n');

  try {
    // 1. Verifica PersonRole esistenti
    // P48: Include tenantProfiles per email
    const personRoles = await prisma.personRole.findMany({
      where: {
        deletedAt: null,
        isActive: true
      },
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            tenantProfiles: {
              where: { deletedAt: null, isActive: true },
              select: { email: true, isPrimary: true }
            }
          }
        }
      }
    });

    console.log(`📋 Trovati ${personRoles.length} PersonRole attivi:`);
    personRoles.forEach(pr => {
      const profile = pr.person?.tenantProfiles?.find(p => p.isPrimary) || pr.person?.tenantProfiles?.[0] || {};
      const email = profile.email || 'N/A';
      console.log(`  - ${email}: ${pr.roleType} (ID: ${pr.id})`);
    });
    console.log();

    // 2. Verifica RolePermission esistenti
    const existingRolePermissions = await prisma.rolePermission.findMany({
      where: { deletedAt: null }
    });

    console.log(`📋 RolePermission esistenti: ${existingRolePermissions.length}`);
    existingRolePermissions.forEach(rp => {
      console.log(`  - PersonRole ${rp.personRoleId}: ${rp.permission} (granted: ${rp.isGranted})`);
    });
    console.log();

    // 3. Per ogni PersonRole, assegna i permessi di default
    for (const personRole of personRoles) {
      const roleProfile = personRole.person?.tenantProfiles?.find(p => p.isPrimary) || personRole.person?.tenantProfiles?.[0] || {};
      const roleEmail = roleProfile.email || 'N/A';
      console.log(`🔄 Processando ${roleEmail} - ${personRole.roleType}...`);

      const defaultPermissions = await getDefaultPermissionsForRole(personRole.roleType);
      console.log(`  📝 Permessi di default: ${defaultPermissions.length}`);

      if (defaultPermissions.length === 0) {
        console.log(`  ⚠️  Nessun permesso di default per ${personRole.roleType}`);
        continue;
      }

      // Verifica permessi già esistenti per questo PersonRole
      const existingPermissions = await prisma.rolePermission.findMany({
        where: {
          personRoleId: personRole.id,
          deletedAt: null
        }
      });

      const existingPermissionNames = existingPermissions.map(ep => ep.permission);
      console.log(`  📋 Permessi esistenti: ${existingPermissionNames.length}`);

      // Aggiungi permessi mancanti
      let addedCount = 0;
      for (const permission of defaultPermissions) {
        if (!existingPermissionNames.includes(permission)) {
          await prisma.rolePermission.create({
            data: {
              personRoleId: personRole.id,
              permission: permission,
              isGranted: true,
              grantedAt: new Date(),
              grantedBy: personRole.assignedBy || personRole.person.id
            }
          });
          addedCount++;
          console.log(`    ✅ Aggiunto: ${permission}`);
        } else {
          console.log(`    ⏭️  Già presente: ${permission}`);
        }
      }

      console.log(`  ✅ Aggiunti ${addedCount} nuovi permessi\n`);
    }

    // 4. Verifica finale
    console.log('📊 Verifica finale...');
    const finalRolePermissions = await prisma.rolePermission.findMany({
      where: { deletedAt: null }
    });

    console.log(`✅ Totale RolePermission dopo correzione: ${finalRolePermissions.length}`);

    // Raggruppa per PersonRole
    const permissionsByRole = {};
    for (const rp of finalRolePermissions) {
      if (!permissionsByRole[rp.personRoleId]) {
        permissionsByRole[rp.personRoleId] = [];
      }
      permissionsByRole[rp.personRoleId].push(rp.permission);
    }

    console.log('\n📋 Riepilogo permessi per ruolo:');
    for (const personRole of personRoles) {
      const permissions = permissionsByRole[personRole.id] || [];
      const personRoleProfile = personRole.person?.tenantProfiles?.find(p => p.isPrimary) || personRole.person?.tenantProfiles?.[0] || {};
      const personRoleEmail = personRoleProfile.email || 'N/A';
      console.log(`  ${personRoleEmail} (${personRole.roleType}): ${permissions.length} permessi`);
    }

  } catch (error) {
    console.error('❌ Errore durante la correzione:', error);
    throw error;
  }
}

async function main() {
  try {
    await fixRolePermissions();
    console.log('\n🎉 Correzione completata con successo!');
  } catch (error) {
    console.error('💥 Errore fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui sempre quando il file viene chiamato direttamente
main();

export { fixRolePermissions };