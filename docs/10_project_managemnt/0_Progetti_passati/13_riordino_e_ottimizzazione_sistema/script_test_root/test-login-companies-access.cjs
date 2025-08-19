const fetch = require('node-fetch');

// Test completo login e accesso companies
async function testLoginAndCompaniesAccess() {
  console.log('🧪 Test Login e Accesso Companies');
  console.log('=' .repeat(50));
  
  try {
    // 1. Test Login
    console.log('\n1️⃣ Testing login...');
    const loginResponse = await fetch('http://localhost:4001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('📋 Login response:', {
      hasData: !!loginData.data,
      hasAccessToken: !!loginData.data?.accessToken,
      hasUser: !!loginData.data?.user,
      userEmail: loginData.data?.user?.email,
      userRoles: loginData.data?.user?.roles
    });
    
    const token = loginData.data.accessToken;
    
    // 2. Test Verify Token
    console.log('\n2️⃣ Testing verify token...');
    const verifyResponse = await fetch('http://localhost:4003/api/v1/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Verify failed: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifyData = await verifyResponse.json();
    console.log('✅ Verify successful');
    console.log('📋 Verify response:', {
      valid: verifyData.valid,
      hasUser: !!verifyData.user,
      hasPermissions: !!verifyData.permissions,
      permissionsCount: Object.keys(verifyData.permissions || {}).length,
      companiesRead: verifyData.permissions?.['companies:read'],
      companiesWrite: verifyData.permissions?.['companies:write']
    });
    
    // 3. Test Companies API Access
    console.log('\n3️⃣ Testing companies API access...');
    const companiesResponse = await fetch('http://localhost:4003/api/companies', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📋 Companies API response:', {
      status: companiesResponse.status,
      statusText: companiesResponse.statusText,
      ok: companiesResponse.ok
    });
    
    if (companiesResponse.ok) {
      const companiesData = await companiesResponse.json();
      console.log('✅ Companies API accessible');
      console.log('📊 Companies data:', {
        hasData: !!companiesData,
        isArray: Array.isArray(companiesData),
        count: Array.isArray(companiesData) ? companiesData.length : 'N/A'
      });
    } else {
      console.log('❌ Companies API not accessible');
      const errorText = await companiesResponse.text();
      console.log('Error:', errorText);
    }
    
    // 4. Test Frontend Access
    console.log('\n4️⃣ Testing frontend access...');
    const frontendResponse = await fetch('http://localhost:5173/companies', {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log('📋 Frontend response:', {
      status: frontendResponse.status,
      statusText: frontendResponse.statusText,
      ok: frontendResponse.ok
    });
    
    // 5. Analisi Permessi
    console.log('\n5️⃣ Analisi permessi...');
    const permissions = verifyData.permissions || {};
    const user = verifyData.user || {};
    
    console.log('👤 User info:', {
      email: user.email,
      role: user.role,
      roles: user.roles
    });
    
    console.log('🔐 Relevant permissions:');
    Object.keys(permissions)
      .filter(key => key.includes('companies') || key.includes('admin') || key.includes('all'))
      .forEach(key => {
        console.log(`  ${key}: ${permissions[key]}`);
      });
    
    // 6. Simulazione hasPermission logic
    console.log('\n6️⃣ Simulazione hasPermission logic...');
    
    const isAdmin = user?.role === 'Admin' || user?.role === 'Administrator' ||
                   (user?.roles && Array.isArray(user.roles) && 
                    (user.roles.includes('Admin') || user.roles.includes('Administrator') ||
                     user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')));
    
    console.log('🔍 isAdmin check:', isAdmin);
    
    if (isAdmin) {
      console.log('✅ User is admin - should have access to companies');
    } else {
      const hasCompaniesRead = permissions['companies:read'] === true;
      const hasCompaniesAll = permissions['companies:all'] === true;
      const hasAllRead = permissions['all:read'] === true;
      
      console.log('🔍 Permission checks:', {
        'companies:read': hasCompaniesRead,
        'companies:all': hasCompaniesAll,
        'all:read': hasAllRead
      });
      
      if (hasCompaniesRead || hasCompaniesAll || hasAllRead) {
        console.log('✅ User has specific permission for companies');
      } else {
        console.log('❌ User does not have permission for companies');
      }
    }
    
    console.log('\n🏆 Test completato!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Esegui il test
testLoginAndCompaniesAccess();