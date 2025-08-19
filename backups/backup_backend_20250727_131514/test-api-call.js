import fetch from 'node-fetch';

async function testRolePermissionsAPI() {
  try {
    console.log('🔍 Testing role permissions API...');
    
    // 1. Login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://localhost:4003/api/auth/login', {
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
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful, token obtained');
    console.log('📋 Full login response:', JSON.stringify(loginData, null, 2));
    console.log('📋 Login response summary:', {
      hasToken: !!loginData.data?.accessToken,
      hasUser: !!loginData.data?.user,
      userId: loginData.data?.user?.id,
      userEmail: loginData.data?.user?.email,
      userRoles: loginData.data?.user?.roles,
      userCompanyId: loginData.data?.user?.companyId
    });
    
    const token = loginData.data?.accessToken;
    
    if (!token) {
      throw new Error('No token received from login');
    }
    
    // 2. Test GET current permissions with detailed headers
    console.log('\n📋 Getting current permissions...');
    console.log('🔍 Request details:');
    console.log('   - URL: http://localhost:4003/api/roles/ADMIN/permissions');
    console.log('   - Headers: Authorization, Content-Type');
    console.log('   - Token length:', token.length);
    
    const getResponse = await fetch('http://localhost:4003/api/roles/ADMIN/permissions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📤 GET Response status:', getResponse.status);
    console.log('📤 GET Response headers:', Object.fromEntries(getResponse.headers.entries()));
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.log('❌ GET Response body:', errorText);
      throw new Error(`GET failed: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const currentPermissions = await getResponse.json();
    console.log('✅ Current permissions retrieved:', currentPermissions.length || 'N/A');
    
    // 3. Test PUT with simple permission
    console.log('\n🔄 Testing PUT with ROLE_MANAGEMENT permission...');
    const testPermissions = [
      {
        permissionId: "ROLE_MANAGEMENT",
        granted: true
      }
    ];
    
    console.log('📤 PUT Request body:', JSON.stringify(testPermissions, null, 2));
    
    const putResponse = await fetch('http://localhost:4003/api/roles/ADMIN/permissions', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPermissions)
    });
    
    console.log('📤 PUT Response status:', putResponse.status);
    console.log('📤 PUT Response headers:', Object.fromEntries(putResponse.headers.entries()));
    
    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      console.log('❌ PUT Response body:', errorText);
      throw new Error(`PUT failed: ${putResponse.status} ${putResponse.statusText}`);
    }
    
    const putResult = await putResponse.json();
    console.log('✅ PUT successful:', putResult);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testRolePermissionsAPI();