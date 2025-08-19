const axios = require('axios');

async function testLoginAndPermissions() {
  try {
    console.log('🔐 Testing login and permissions...\n');

    // 1. Login
    console.log('1️⃣ Attempting login...');
    const loginResponse = await axios.post('http://localhost:4001/api/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });

    if (loginResponse.data.success) {
      console.log('✅ LOGIN_SUCCESS');
      const token = loginResponse.data.data.accessToken;
      console.log('🔑 Token received:', token.substring(0, 20) + '...');

      // 2. Verify token and get permissions
      console.log('\n2️⃣ Verifying token and getting permissions...');
      const verifyResponse = await axios.get('http://localhost:4001/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (verifyResponse.data.valid) {
        console.log('✅ TOKEN_VALID');
        console.log('👤 User:', {
          id: verifyResponse.data.user.id,
          email: verifyResponse.data.user.email,
          roles: verifyResponse.data.user.roles
        });

        const permissions = verifyResponse.data.permissions;
        console.log('\n🔐 Raw Backend Permissions:');
        Object.keys(permissions).forEach(key => {
          if (permissions[key] === true) {
            console.log(`  ✅ ${key}`);
          }
        });

        // 3. Test specific permissions
        console.log('\n3️⃣ Testing specific permission mappings:');
        
        const permissionsToTest = [
          'persons:read',
          'employees:read', 
          'trainers:read',
          'VIEW_PERSONS',
          'VIEW_EMPLOYEES',
          'VIEW_TRAINERS'
        ];

        permissionsToTest.forEach(permission => {
          const hasPermission = permissions[permission] === true;
          console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission ? 'GRANTED' : 'MISSING'}`);
        });

        // 4. Test API endpoints
        console.log('\n4️⃣ Testing API endpoints access...');
        
        const endpoints = [
          { name: 'Persons API', url: 'http://localhost:4001/api/v1/persons' },
          { name: 'Companies API', url: 'http://localhost:4001/api/v1/companies' },
          { name: 'Courses API', url: 'http://localhost:4001/api/v1/courses' }
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(endpoint.url, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            console.log(`  ✅ ${endpoint.name}: Status ${response.status}`);
          } catch (error) {
            console.log(`  ❌ ${endpoint.name}: Status ${error.response?.status || 'ERROR'} - ${error.response?.data?.message || error.message}`);
          }
        }

      } else {
        console.log('❌ TOKEN_INVALID');
      }

    } else {
      console.log('❌ LOGIN_FAILED:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testLoginAndPermissions();