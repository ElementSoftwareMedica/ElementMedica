const axios = require('axios');

async function testPersonsPermissionsFix() {
  try {
    console.log('🔧 Test: Verifica fix permessi persons');
    console.log('=' .repeat(60));
    
    // 1. Login
    console.log('\n1️⃣ Login admin...');
    const loginResponse = await axios.post('http://localhost:4001/api/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    console.log('📋 Login response structure:', {
      success: loginResponse.data.success,
      hasData: !!loginResponse.data.data,
      dataKeys: loginResponse.data.data ? Object.keys(loginResponse.data.data) : 'no data',
      token: loginResponse.data.data?.token ? 'present' : 'missing'
    });

    const token = loginResponse.data.data?.accessToken || loginResponse.data.data?.token || loginResponse.data.token;
    if (!token) {
      throw new Error('No token received from login');
    }
    
    console.log('✅ Login successful');

    // 2. Verify token and get permissions
    console.log('\n2️⃣ Verifying token and getting permissions...');
    console.log(`🔑 Using token: ${token.substring(0, 20)}...`);
    
    const verifyResponse = await axios.get('http://localhost:4001/api/v1/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-id': 'default-company'
      }
    });

    if (!verifyResponse.data.success) {
      throw new Error('Token verification failed');
    }

    const permissions = verifyResponse.data.data.permissions;
    console.log('✅ Token verified successfully');
    console.log(`📊 Total permissions: ${Object.keys(permissions).length}`);

    // 3. Check specific persons permissions
    console.log('\n3️⃣ Checking persons permissions...');
    const personsPermissions = [
      'persons:view',
      'persons:read',
      'persons:create',
      'persons:edit',
      'persons:delete',
      'persons:manage',
      'persons:view_employees',
      'persons:view_trainers'
    ];

    let allPersonsPermissionsGranted = true;
    personsPermissions.forEach(permission => {
      const hasPermission = permissions[permission] === true;
      console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? 'GRANTED' : 'MISSING'}`);
      if (!hasPermission) allPersonsPermissionsGranted = false;
    });

    // 4. Summary
    console.log('\n4️⃣ Summary...');
    if (allPersonsPermissionsGranted) {
      console.log('🎉 SUCCESS: All persons permissions are now correctly granted!');
    } else {
      console.log('❌ FAILURE: Some persons permissions are still missing');
    }

    // 5. Show all permissions for debugging
    console.log('\n5️⃣ All permissions (for debugging):');
    Object.keys(permissions).sort().forEach(permission => {
      console.log(`  ${permissions[permission] ? '✅' : '❌'} ${permission}`);
    });

  } catch (error) {
    console.error('❌ Error during test:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testPersonsPermissionsFix();