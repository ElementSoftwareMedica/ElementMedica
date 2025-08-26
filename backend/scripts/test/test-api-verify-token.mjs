import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('🔐 Testing Login API...');
    console.log('======================');

    // 1. Login
    const loginResponse = await fetch('http://localhost:4001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('   User:', loginData.user?.email);
    console.log('   Token present:', !!loginData.token);

    // 2. Verify token
    console.log('\n🔍 Testing Token Verification...');
    const verifyResponse = await fetch('http://localhost:4001/api/v1/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json',
      }
    });

    if (!verifyResponse.ok) {
      console.log('❌ Token verification failed:', verifyResponse.status, verifyResponse.statusText);
      return;
    }

    const verifyData = await verifyResponse.json();
    console.log('✅ Token verification successful');
    console.log('   Valid:', verifyData.valid);
    console.log('   User:', verifyData.user?.email);
    console.log('   Permissions count:', Object.keys(verifyData.permissions || {}).length);

    // 3. Analizza i permessi
    console.log('\n📋 Permissions Analysis:');
    console.log('========================');
    
    const permissions = verifyData.permissions || {};
    const grantedPermissions = Object.keys(permissions).filter(key => permissions[key] === true);
    console.log('   Total granted permissions:', grantedPermissions.length);
    
    // Filtra permessi CMS e Forms
    const cmsAndFormPermissions = grantedPermissions.filter(p => 
      p.includes('CMS') || p.includes('FORM') || p.includes('SUBMISSION') || 
      p.includes('form_templates') || p.includes('form_submissions') || p.includes('PUBLIC_CMS')
    );
    console.log('   CMS & Form permissions:', cmsAndFormPermissions.length);
    console.log('   CMS & Form permissions list:', cmsAndFormPermissions);

    // 4. Test permessi specifici
    console.log('\n🧪 Testing Specific Permissions:');
    console.log('=================================');
    
    const testPermissions = [
      'PUBLIC_CMS:READ',
      'PUBLIC_CMS:UPDATE',
      'form_templates:read',
      'form_templates:update',
      'form_submissions:read',
      'form_submissions:update'
    ];
    
    testPermissions.forEach(perm => {
      const hasIt = permissions[perm] === true;
      console.log(`   ${perm}: ${hasIt ? '✅' : '❌'}`);
    });

    // 5. Simula la conversione frontend
    console.log('\n🔄 Frontend Conversion Simulation:');
    console.log('===================================');
    
    // Simula convertBackendToFrontendPermissions
    const frontendPermissions = {};
    
    // Mantieni i permessi backend originali
    Object.keys(permissions).forEach(key => {
      if (permissions[key] === true) {
        frontendPermissions[key] = true;
      }
    });
    
    // Aggiungi le mappature frontend per CMS
    if (permissions['MANAGE_PUBLIC_CMS'] === true) {
      frontendPermissions['PUBLIC_CMS:READ'] = true;
      frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
    }
    if (permissions['VIEW_PUBLIC_CMS'] === true) {
      frontendPermissions['PUBLIC_CMS:READ'] = true;
    }
    if (permissions['EDIT_PUBLIC_CMS'] === true) {
      frontendPermissions['PUBLIC_CMS:UPDATE'] = true;
    }
    
    // Aggiungi le mappature frontend per Form Templates
    if (permissions['MANAGE_FORM_TEMPLATES'] === true) {
      frontendPermissions['form_templates:read'] = true;
      frontendPermissions['form_templates:update'] = true;
    }
    if (permissions['VIEW_FORM_TEMPLATES'] === true) {
      frontendPermissions['form_templates:read'] = true;
    }
    
    // Aggiungi le mappature frontend per Form Submissions
    if (permissions['MANAGE_FORM_SUBMISSIONS'] === true) {
      frontendPermissions['form_submissions:read'] = true;
      frontendPermissions['form_submissions:update'] = true;
    }
    if (permissions['VIEW_FORM_SUBMISSIONS'] === true) {
      frontendPermissions['form_submissions:read'] = true;
    }
    
    console.log('   After conversion:');
    testPermissions.forEach(perm => {
      const hasIt = frontendPermissions[perm] === true;
      console.log(`   ${perm}: ${hasIt ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testLogin();