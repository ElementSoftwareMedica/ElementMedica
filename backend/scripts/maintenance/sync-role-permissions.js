import { EnhancedRoleService } from './services/enhancedRoleService.js';

const prisma = new PrismaClient();

// Mapping da formato entity.action a ACTION_ENTITY
const permissionMapping = {
  // User Management
  'users.create': 'CREATE_USERS',
  'users.read': 'VIEW_USERS',
  'users.update': 'UPDATE_USERS',
  'users.delete': 'DELETE_USERS',
  'users.manage_roles': 'MANAGE_USER_ROLES',
  
  // Role Management
  'roles.create': 'CREATE_ROLES',
  'roles.read': 'VIEW_ROLES',
  'roles.update': 'UPDATE_ROLES',
  'roles.delete': 'DELETE_ROLES',
  'roles.manage': 'ROLE_MANAGEMENT',
  
  // Company Management
  'companies.create': 'CREATE_COMPANIES',
  'companies.read': 'VIEW_COMPANIES',
  'companies.update': 'UPDATE_COMPANIES',
  'companies.delete': 'DELETE_COMPANIES',
  'companies.manage_settings': 'MANAGE_COMPANY_SETTINGS',
  
  // Course Management
  'courses.create': 'CREATE_COURSES',
  'courses.read': 'VIEW_COURSES',
  'courses.update': 'UPDATE_COURSES',
  'courses.delete': 'DELETE_COURSES',
  'courses.assign': 'ASSIGN_COURSES',
  
  // Training Management
  'training.create': 'CREATE_TRAINING',
  'training.read': 'VIEW_TRAINING',
  'training.update': 'UPDATE_TRAINING',
  'training.delete': 'DELETE_TRAINING',
  'training.conduct': 'CONDUCT_TRAINING',
  
  // Reports and Analytics
  'reports.view': 'VIEW_REPORTS',
  'reports.export': 'EXPORT_REPORTS',
  'analytics.view': 'VIEW_ANALYTICS',
  
  // System Administration
  'system.settings': 'MANAGE_SYSTEM_SETTINGS',
  'system.billing': 'MANAGE_BILLING',
  'system.audit': 'VIEW_AUDIT_LOGS',
  'system.backup': 'MANAGE_BACKUPS'
};

async function syncPermissions() {
  console.log('🔄 Sincronizzazione permessi in corso...');
  
  try {
    // 1. Ottieni tutti i permessi dal enhancedRoleService
    const allServicePermissions = Object.keys(EnhancedRoleService.PERMISSIONS);
    console.log(`📋 Trovati ${allServicePermissions.length} permessi nel servizio`);
    
    // 2. Verifica e crea i permessi mancanti nel database
    for (const servicePermission of allServicePermissions) {
      const dbPermissionId = permissionMapping[servicePermission];
      if (!dbPermissionId) {
        console.warn(`⚠️  Mapping mancante per il permesso: ${servicePermission}`);
        continue;
      }
      
      // Verifica se il permesso esiste già nel database
      const existingPermission = await prisma.permission.findUnique({
        where: { id: dbPermissionId }
      });
      
      if (!existingPermission) {
        // Crea il permesso nel database
        const description = EnhancedRoleService.PERMISSIONS[servicePermission];
        const [resource, action] = servicePermission.split('.');
        
        await prisma.permission.create({
          data: {
            id: dbPermissionId,
            name: dbPermissionId,
            description: description,
            resource: resource,
            action: action
          }
        });
        console.log(`✅ Creato permesso: ${dbPermissionId}`);
      }
    }
    
    // 3. Assegna i permessi di default ai ruoli esistenti
    const roleTypes = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
    
    for (const roleType of roleTypes) {
      console.log(`\n🔧 Configurazione permessi per ruolo: ${roleType}`);
      
      // Ottieni i permessi di default dal servizio
      const defaultPermissions = EnhancedRoleService.getDefaultPermissions(roleType);
      console.log(`📝 Permessi di default per ${roleType}: ${defaultPermissions.length}`);
      
      // Trova tutti i PersonRole di questo tipo
      const personRoles = await prisma.personRole.findMany({
        where: {
          roleType: roleType,
          isActive: true,
          deletedAt: null
        }
      });
      
      console.log(`👥 Trovati ${personRoles.length} PersonRole di tipo ${roleType}`);
      
      // Per ogni PersonRole, assegna i permessi di default
      for (const personRole of personRoles) {
        // Rimuovi i permessi esistenti per questo ruolo
        await prisma.rolePermission.deleteMany({
          where: {
            personRoleId: personRole.id
          }
        });
        
        // Aggiungi i nuovi permessi di default
        for (const servicePermission of defaultPermissions) {
          const dbPermissionId = permissionMapping[servicePermission];
          if (dbPermissionId) {
            await prisma.rolePermission.create({
              data: {
                personRoleId: personRole.id,
                permissionId: dbPermissionId,
                isGranted: true,
                scope: 'all'
              }
            });
          }
        }
        
        console.log(`✅ Assegnati ${defaultPermissions.length} permessi al PersonRole ${personRole.id} (${roleType})`);
      }
    }
    
    console.log('\n🎉 Sincronizzazione completata con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
    throw error;
  }
}

function getPermissionCategory(servicePermission) {
  if (servicePermission.startsWith('users.')) return 'User Management';
  if (servicePermission.startsWith('roles.')) return 'Role Management';
  if (servicePermission.startsWith('companies.')) return 'Company Management';
  if (servicePermission.startsWith('courses.')) return 'Course Management';
  if (servicePermission.startsWith('training.')) return 'Training Management';
  if (servicePermission.startsWith('reports.') || servicePermission.startsWith('analytics.')) return 'Reports & Analytics';
  if (servicePermission.startsWith('system.')) return 'System Administration';
  return 'General';
}

async function main() {
  try {
    await syncPermissions();
    
    // Verifica finale
    console.log('\n📊 Verifica finale:');
    const totalPermissions = await prisma.permission.count();
    const totalRolePermissions = await prisma.rolePermission.count();
    
    console.log(`📋 Permessi totali nel database: ${totalPermissions}`);
    console.log(`🔗 Assegnazioni ruolo-permesso totali: ${totalRolePermissions}`);
    
    // Mostra i permessi per ruolo
    const roleTypes = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EMPLOYEE'];
    for (const roleType of roleTypes) {
      const personRoles = await prisma.personRole.findMany({
        where: { roleType, isActive: true, deletedAt: null },
        include: {
          rolePermissions: {
            where: { isGranted: true },
            include: { permission: true }
          }
        }
      });
      
      if (personRoles.length > 0) {
        const permissionCount = personRoles[0].rolePermissions.length;
        console.log(`👤 ${roleType}: ${permissionCount} permessi assegnati`);
      }
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();