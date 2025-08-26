import { PrismaClient } from './backend/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

// Simula la funzione convertBackendToFrontendPermissions
function convertBackendToFrontendPermissions(backendPermissions) {
  const frontendPermissions = {};
  
  // Mantieni i permessi backend originali
  Object.keys(backendPermissions).forEach(key => {
    if (backendPermissions[key] === true) {
      frontendPermissions[key] = true;
    }
  });
  
  // Aggiungi le mappature frontend
  Object.keys(backendPermissions).forEach(backendKey => {
    if (backendPermissions[backendKey] === true) {
      // Permessi PUBLIC_CMS specifici
      if (backendKey === 'VIEW_PUBLIC_CMS') {
        frontendPermissions['PUBLIC_CMS:READ'] = true;
        frontendPermissions['PUBLIC_CMS:read'] = true;
      }
      else if (backendKey === 'EDIT_PUBLIC_CMS') {
        frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
        frontendPermissions['PUBLIC_CMS:update'] = true;
      }
      else if (backendKey === 'MANAGE_PUBLIC_CMS') {
        frontendPermissions['PUBLIC_CMS:READ'] = true;
        frontendPermissions['PUBLIC_CMS:read'] = true;
        frontendPermissions['PUBLIC_CMS:CREATE'] = true;
        frontendPermissions['PUBLIC_CMS:create'] = true;
        frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
        frontendPermissions['PUBLIC_CMS:update'] = true;
        frontendPermissions['PUBLIC_CMS:DELETE'] = true;
        frontendPermissions['PUBLIC_CMS:delete'] = true;
      }
      // Casi speciali per permessi FORM_TEMPLATES
      else if (backendKey === 'VIEW_FORM_TEMPLATES') {
        frontendPermissions['form_templates:read'] = true;
        frontendPermissions['form_templates:view'] = true;
      }
      else if (backendKey === 'MANAGE_FORM_TEMPLATES') {
        frontendPermissions['form_templates:read'] = true;
        frontendPermissions['form_templates:view'] = true;
        frontendPermissions['form_templates:create'] = true;
        frontendPermissions['form_templates:edit'] = true;
        frontendPermissions['form_templates:update'] = true;
        frontendPermissions['form_templates:delete'] = true;
      }
      // Casi speciali per permessi FORM_SUBMISSIONS
      else if (backendKey === 'VIEW_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:read'] = true;
        frontendPermissions['form_submissions:view'] = true;
      }
      else if (backendKey === 'MANAGE_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:read'] = true;
        frontendPermissions['form_submissions:view'] = true;
        frontendPermissions['form_submissions:create'] = true;
        frontendPermissions['form_submissions:edit'] = true;
        frontendPermissions['form_submissions:update'] = true;
        frontendPermissions['form_submissions:delete'] = true;
      }
      else if (backendKey === 'EXPORT_FORM_SUBMISSIONS') {
        frontendPermissions['form_submissions:export'] = true;
      }
    }
  });
  
  return frontendPermissions;
}

// Simula la funzione hasBackendPermission
function hasBackendPermission(frontendPermission, backendPermissions) {
  // Gestione speciale per permessi PUBLIC_CMS
  if (frontendPermission === 'PUBLIC_CMS:READ' || frontendPermission === 'PUBLIC_CMS:read') {
    return backendPermissions['VIEW_CMS'] === true || 
           backendPermissions['VIEW_PUBLIC_CMS'] === true ||
           backendPermissions['MANAGE_PUBLIC_CONTENT'] === true ||
           backendPermissions['READ_PUBLIC_CONTENT'] === true;
  }
  
  if (frontendPermission === 'PUBLIC_CMS:UPDATE' || frontendPermission === 'PUBLIC_CMS:update') {
    return backendPermissions['EDIT_CMS'] === true || 
           backendPermissions['EDIT_PUBLIC_CMS'] === true ||
           backendPermissions['MANAGE_PUBLIC_CONTENT'] === true;
  }

  // Gestione speciale per permessi FORM_TEMPLATES
  if (frontendPermission === 'form_templates:read' || frontendPermission === 'form_templates:view') {
    return backendPermissions['VIEW_FORM_TEMPLATES'] === true || 
           backendPermissions['MANAGE_FORM_TEMPLATES'] === true;
  }

  // Gestione speciale per permessi FORM_SUBMISSIONS
  if (frontendPermission === 'form_submissions:read' || frontendPermission === 'form_submissions:view') {
    return backendPermissions['VIEW_FORM_SUBMISSIONS'] === true ||
           backendPermissions['MANAGE_FORM_SUBMISSIONS'] === true;
  }
  
  return false;
}

async function testAdminPermissions() {
  try {
    console.log('🔍 Testing Admin Permissions...');
    console.log('================================');

    // 1. Trova l'admin
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' }
    });

    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }

    console.log('✅ Admin found:', admin.email);

    // 2. Trova il ruolo ADMIN
    const adminRole = await prisma.personRole.findFirst({
      where: { 
        personId: admin.id,
        roleType: 'ADMIN'
      },
      include: {
        permissions: true
      }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found');
      return;
    }

    console.log('✅ Admin role found with', adminRole.permissions.length, 'permissions');

    // 3. Estrai i permessi backend
    const backendPermissions = {};
    adminRole.permissions.forEach(rp => {
      if (rp.isGranted) {
        backendPermissions[rp.permission] = true;
      }
    });

    console.log('\n📋 Backend Permissions:');
    const grantedBackendPermissions = Object.keys(backendPermissions).filter(key => backendPermissions[key] === true);
    console.log('   Count:', grantedBackendPermissions.length);
    
    // Filtra solo i permessi CMS e Forms
    const cmsAndFormPermissions = grantedBackendPermissions.filter(p => 
      p.includes('CMS') || p.includes('FORM') || p.includes('SUBMISSION')
    );
    console.log('   CMS & Form permissions:', cmsAndFormPermissions);

    // 4. Converti in permessi frontend
    const frontendPermissions = convertBackendToFrontendPermissions(backendPermissions);
    
    console.log('\n🔄 Frontend Permissions (converted):');
    const grantedFrontendPermissions = Object.keys(frontendPermissions).filter(key => frontendPermissions[key] === true);
    console.log('   Count:', grantedFrontendPermissions.length);
    
    // Filtra solo i permessi CMS e Forms
    const frontendCmsAndFormPermissions = grantedFrontendPermissions.filter(p => 
      p.includes('PUBLIC_CMS') || p.includes('form_templates') || p.includes('form_submissions')
    );
    console.log('   CMS & Form permissions:', frontendCmsAndFormPermissions);

    // 5. Test specifici per le pagine problematiche
    console.log('\n🧪 Testing Specific Page Permissions:');
    console.log('=====================================');

    // Test PublicCMSPage
    const cmsReadTest = frontendPermissions['PUBLIC_CMS:READ'] === true;
    const cmsUpdateTest = frontendPermissions['PUBLIC_CMS:UPDATE'] === true;
    const cmsBackendReadTest = hasBackendPermission('PUBLIC_CMS:READ', backendPermissions);
    const cmsBackendUpdateTest = hasBackendPermission('PUBLIC_CMS:UPDATE', backendPermissions);
    
    console.log('📄 PublicCMSPage:');
    console.log('   PUBLIC_CMS:READ (frontend):', cmsReadTest);
    console.log('   PUBLIC_CMS:UPDATE (frontend):', cmsUpdateTest);
    console.log('   PUBLIC_CMS:READ (backend check):', cmsBackendReadTest);
    console.log('   PUBLIC_CMS:UPDATE (backend check):', cmsBackendUpdateTest);

    // Test FormTemplatesPage
    const formTemplatesReadTest = frontendPermissions['form_templates:read'] === true;
    const formTemplatesUpdateTest = frontendPermissions['form_templates:update'] === true;
    const formTemplatesBackendReadTest = hasBackendPermission('form_templates:read', backendPermissions);
    
    console.log('\n📄 FormTemplatesPage:');
    console.log('   form_templates:read (frontend):', formTemplatesReadTest);
    console.log('   form_templates:update (frontend):', formTemplatesUpdateTest);
    console.log('   form_templates:read (backend check):', formTemplatesBackendReadTest);

    // Test FormSubmissionsPage
    const formSubmissionsReadTest = frontendPermissions['form_submissions:read'] === true;
    const formSubmissionsUpdateTest = frontendPermissions['form_submissions:update'] === true;
    const formSubmissionsBackendReadTest = hasBackendPermission('form_submissions:read', backendPermissions);
    
    console.log('\n📄 FormSubmissionsPage:');
    console.log('   form_submissions:read (frontend):', formSubmissionsReadTest);
    console.log('   form_submissions:update (frontend):', formSubmissionsUpdateTest);
    console.log('   form_submissions:read (backend check):', formSubmissionsBackendReadTest);

    // 6. Verifica permessi specifici nel backend
    console.log('\n🔍 Backend Permission Details:');
    console.log('==============================');
    
    const requiredPermissions = [
      'VIEW_PUBLIC_CMS',
      'EDIT_PUBLIC_CMS', 
      'MANAGE_PUBLIC_CMS',
      'VIEW_FORM_TEMPLATES',
      'MANAGE_FORM_TEMPLATES',
      'VIEW_FORM_SUBMISSIONS',
      'MANAGE_FORM_SUBMISSIONS'
    ];
    
    requiredPermissions.forEach(perm => {
      const hasIt = backendPermissions[perm] === true;
      console.log(`   ${perm}: ${hasIt ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Error testing admin permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminPermissions();