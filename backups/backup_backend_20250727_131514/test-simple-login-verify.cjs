const axios = require('axios');

async function testSimpleLogin() {
  try {
    console.log('🔧 Test: Login semplice e verifica');
    console.log('=' .repeat(60));
    
    // 1. Login
    console.log('\n1️⃣ Login admin...');
    const loginResponse = await axios.post('http://localhost:4001/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!',
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default-company'
      }
    });

    console.log('📋 Login response:', {
      status: loginResponse.status,
      success: loginResponse.data.success,
      hasData: !!loginResponse.data.data,
      dataKeys: loginResponse.data.data ? Object.keys(loginResponse.data.data) : 'no data'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log(`🔑 Token: ${token.substring(0, 30)}...`);

    // 2. Test verify endpoint
    console.log('\n2️⃣ Testing verify endpoint...');
    try {
      const verifyResponse = await axios.get('http://localhost:4001/api/v1/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-company'
        }
      });

      console.log('✅ Verify successful');
      console.log('📋 Verify response:', {
        status: verifyResponse.status,
        valid: verifyResponse.data.valid,
        hasUser: !!verifyResponse.data.user,
        userRole: verifyResponse.data.user?.role,
        userRoles: verifyResponse.data.user?.roles,
        hasPermissions: !!verifyResponse.data.permissions,
        permissionsCount: Object.keys(verifyResponse.data.permissions || {}).length
      });

      // 3. Check persons permissions
      if (verifyResponse.data.permissions) {
        console.log('\n3️⃣ Checking ALL persons permissions...');
        const personsPermissions = [
          'persons:read',
          'persons:view',
          'persons:create',
          'persons:edit',
          'persons:delete',
          'persons:manage',
          'persons:view_employees',
          'persons:view_trainers',
          'VIEW_PERSONS',
          'CREATE_PERSONS',
          'EDIT_PERSONS',
          'DELETE_PERSONS'
        ];

        let grantedCount = 0;
        personsPermissions.forEach(permission => {
          const hasPermission = verifyResponse.data.permissions[permission] === true;
          console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? 'GRANTED' : 'MISSING'}`);
          if (hasPermission) grantedCount++;
        });

        console.log(`\n📊 Summary: ${grantedCount}/${personsPermissions.length} persons permissions granted`);
        
        // 4. Show all permissions for debugging
        console.log('\n4️⃣ All permissions (first 20 for debugging):');
        const allPermissions = Object.keys(verifyResponse.data.permissions).sort();
        allPermissions.slice(0, 20).forEach(permission => {
          console.log(`  ${verifyResponse.data.permissions[permission] ? '✅' : '❌'} ${permission}`);
        });
        console.log(`  ... and ${allPermissions.length - 20} more permissions`);
      }

    } catch (verifyError) {
      console.error('❌ Verify failed:', {
        status: verifyError.response?.status,
        statusText: verifyError.response?.statusText,
        data: verifyError.response?.data,
        message: verifyError.message
      });
    }

  } catch (error) {
    console.error('❌ Error during test:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testSimpleLogin();