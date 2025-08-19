import { PrismaClient } from './backend/node_modules/.prisma/client/index.js';

const prisma = new PrismaClient();

// Simula la funzione hasBackendPermission da permissionMapping.ts
function hasBackendPermission(permissionKey, permissions) {
  console.log(`🔍 hasBackendPermission check: ${permissionKey}`);
  console.log('Available permissions:', Object.keys(permissions).filter(key => permissions[key] === true));
  
  // Verifica permesso diretto
  if (permissions[permissionKey] === true) {
    console.log(`✅ Direct match found for: ${permissionKey}`);
    return true;
  }
  
  // Logica specifica per entità
  const [action, entity] = permissionKey.split('_');
  
  if (entity === 'PUBLIC_CMS') {
    const cmsPermissions = [
      'VIEW_PUBLIC_CMS',
      'CREATE_PUBLIC_CMS', 
      'UPDATE_PUBLIC_CMS',
      'DELETE_PUBLIC_CMS'
    ];
    
    for (const perm of cmsPermissions) {
      if (permissions[perm] === true) {
        console.log(`✅ CMS permission found: ${perm}`);
        return true;
      }
    }
  }
  
  if (entity === 'FORM_TEMPLATES') {
    const formTemplatePermissions = [
      'VIEW_FORM_TEMPLATES',
      'CREATE_FORM_TEMPLATES',
      'UPDATE_FORM_TEMPLATES', 
      'DELETE_FORM_TEMPLATES'
    ];
    
    for (const perm of formTemplatePermissions) {
      if (permissions[perm] === true) {
        console.log(`✅ Form template permission found: ${perm}`);
        return true;
      }
    }
  }
  
  if (entity === 'FORM_SUBMISSIONS') {
    const formSubmissionPermissions = [
      'VIEW_FORM_SUBMISSIONS',
      'CREATE_FORM_SUBMISSIONS',
      'UPDATE_FORM_SUBMISSIONS',
      'DELETE_FORM_SUBMISSIONS'
    ];
    
    for (const perm of formSubmissionPermissions) {
      if (permissions[perm] === true) {
        console.log(`✅ Form submission permission found: ${perm}`);
        return true;
      }
    }
  }
  
  console.log(`❌ No matching permission found for: ${permissionKey}`);
  return false;
}

// Simula la funzione hasPermission dell'AuthContext
function simulateHasPermission(resourceOrPermission, action, permissions, user) {
  console.log(`\n🔐 === PERMISSION CHECK START ===`);
  console.log(`Resource/Permission: ${resourceOrPermission}`);
  console.log(`Action: ${action || 'none'}`);
  console.log(`User: ${user?.email} (${user?.globalRole})`);
  
  let permissionToCheck;
  
  if (action) {
    // Formato con due parametri: resource e action
    permissionToCheck = `${resourceOrPermission}:${action}`;
    console.log(`🔐 Checking permission (two params): ${resourceOrPermission}:${action}`);
  } else {
    // Formato con un parametro: permesso diretto
    permissionToCheck = resourceOrPermission;
    console.log(`🔐 Checking permission (single param): ${resourceOrPermission}`);
  }
  
  // Se non c'è utente, nega l'accesso
  if (!user) {
    console.log('❌ Access denied: no user');
    return false;
  }
  
  // Verifica permesso diretto
  if (permissions[permissionToCheck] === true) {
    console.log(`✅ Access granted: user has ${permissionToCheck} permission (direct match)`);
    return true;
  }
  
  // Se abbiamo due parametri, prova anche altri formati
  if (action) {
    // Verifica permesso all:* (permesso universale)
    if (permissions['all:' + action] === true) {
      console.log('✅ Access granted: user has all:' + action + ' permission');
      return true;
    }
    
    // Verifica permesso resource:all (permesso per tutte le azioni sulla risorsa)
    if (permissions[resourceOrPermission + ':all'] === true) {
      console.log('✅ Access granted: user has ' + resourceOrPermission + ':all permission');
      return true;
    }
    
    // Prova anche il formato backend usando hasBackendPermission
    const backendPermissionResult = hasBackendPermission(permissionToCheck, permissions);
    if (backendPermissionResult) {
      console.log(`✅ Access granted: user has ${permissionToCheck} permission (backend format match)`);
      return true;
    }
    
    // Concedi accesso se c'è almeno un permesso con quel resource per azioni 'read'
    if (action === 'read') {
      const resourcePermissions = Object.keys(permissions)
        .filter(key => key.startsWith(resourceOrPermission + ':') && permissions[key] === true);
      
      console.log(`🔍 Found ${resourcePermissions.length} permissions for resource '${resourceOrPermission}':`, resourcePermissions);
      
      if (resourcePermissions.length > 0) {
        console.log('✅ Access granted: user has some permission for ' + resourceOrPermission);
        return true;
      }
    }
  } else {
    // Se è un singolo parametro, prova anche il formato backend
    const backendPermissionResult = hasBackendPermission(permissionToCheck, permissions);
    if (backendPermissionResult) {
      console.log(`✅ Access granted: user has ${permissionToCheck} permission (backend format match)`);
      return true;
    }
  }
  
  console.log(`❌ Permission check result: false for ${permissionToCheck}`);
  console.log(`🔐 === PERMISSION CHECK END ===\n`);
  return false;
}

async function testAuthFlow() {
  try {
    console.log('🚀 Starting auth flow debug test...\n');
    
    // 1. Trova l'utente admin
    const adminUser = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        deletedAt: null
      },
      include: {
        personRoles: {
          include: {
            permissions: true
          }
        }
      }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('👤 Admin user found:', {
      id: adminUser.id,
      email: adminUser.email,
      globalRole: adminUser.globalRole,
      rolesCount: adminUser.personRoles.length
    });
    
    // 2. Raccogli tutti i permessi
    const allPermissions = {};
    
    adminUser.personRoles.forEach(personRole => {
      console.log(`\n📋 Role: ${personRole.roleType} (Active: ${personRole.isActive})`);
      
      personRole.permissions.forEach(permission => {
        if (permission.isGranted && !permission.deletedAt) {
          allPermissions[permission.permission] = true;
          console.log(`  ✓ ${permission.permission}`);
        }
      });
    });
    
    console.log(`\n📊 Total permissions: ${Object.keys(allPermissions).length}`);
    console.log('All permissions:', Object.keys(allPermissions).sort());
    
    // 3. Test specifici per le pagine problematiche
    console.log('\n🧪 === TESTING PAGE ACCESS ===');
    
    // Test PUBLIC_CMS page
    console.log('\n📄 Testing PUBLIC_CMS page access...');
    const cmsReadAccess = simulateHasPermission('PUBLIC_CMS', 'read', allPermissions, adminUser);
    const cmsUpdateAccess = simulateHasPermission('PUBLIC_CMS', 'update', allPermissions, adminUser);
    
    console.log(`PUBLIC_CMS:read = ${cmsReadAccess}`);
    console.log(`PUBLIC_CMS:update = ${cmsUpdateAccess}`);
    
    // Test FORM_TEMPLATES page
    console.log('\n📝 Testing FORM_TEMPLATES page access...');
    const formTemplatesReadAccess = simulateHasPermission('FORM_TEMPLATES', 'read', allPermissions, adminUser);
    const formTemplatesUpdateAccess = simulateHasPermission('FORM_TEMPLATES', 'update', allPermissions, adminUser);
    
    console.log(`FORM_TEMPLATES:read = ${formTemplatesReadAccess}`);
    console.log(`FORM_TEMPLATES:update = ${formTemplatesUpdateAccess}`);
    
    // Test FORM_SUBMISSIONS page
    console.log('\n📋 Testing FORM_SUBMISSIONS page access...');
    const formSubmissionsReadAccess = simulateHasPermission('FORM_SUBMISSIONS', 'read', allPermissions, adminUser);
    const formSubmissionsUpdateAccess = simulateHasPermission('FORM_SUBMISSIONS', 'update', allPermissions, adminUser);
    
    console.log(`FORM_SUBMISSIONS:read = ${formSubmissionsReadAccess}`);
    console.log(`FORM_SUBMISSIONS:update = ${formSubmissionsUpdateAccess}`);
    
    // 4. Test con formati diversi
    console.log('\n🔄 Testing different permission formats...');
    
    // Test formato backend diretto
    const backendCmsTest = simulateHasPermission('VIEW_PUBLIC_CMS', null, allPermissions, adminUser);
    const backendFormTemplatesTest = simulateHasPermission('VIEW_FORM_TEMPLATES', null, allPermissions, adminUser);
    const backendFormSubmissionsTest = simulateHasPermission('VIEW_FORM_SUBMISSIONS', null, allPermissions, adminUser);
    
    console.log(`VIEW_PUBLIC_CMS = ${backendCmsTest}`);
    console.log(`VIEW_FORM_TEMPLATES = ${backendFormTemplatesTest}`);
    console.log(`VIEW_FORM_SUBMISSIONS = ${backendFormSubmissionsTest}`);
    
    // 5. Riassunto finale
    console.log('\n📋 === SUMMARY ===');
    console.log('CMS Access:', { read: cmsReadAccess, update: cmsUpdateAccess });
    console.log('Form Templates Access:', { read: formTemplatesReadAccess, update: formTemplatesUpdateAccess });
    console.log('Form Submissions Access:', { read: formSubmissionsReadAccess, update: formSubmissionsUpdateAccess });
    
    if (!cmsReadAccess || !formTemplatesReadAccess || !formSubmissionsReadAccess) {
      console.log('\n❌ PROBLEM IDENTIFIED: Admin lacks required permissions');
      console.log('Required permissions that might be missing:');
      console.log('- VIEW_PUBLIC_CMS or PUBLIC_CMS:read');
      console.log('- VIEW_FORM_TEMPLATES or FORM_TEMPLATES:read');
      console.log('- VIEW_FORM_SUBMISSIONS or FORM_SUBMISSIONS:read');
    } else {
      console.log('\n✅ All permissions are correctly assigned');
      console.log('The issue might be in the frontend permission checking logic');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthFlow();