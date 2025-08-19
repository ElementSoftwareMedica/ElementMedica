const axios = require('axios');

async function testPermissions() {
  try {
    console.log('🔐 Testing login and permission mapping...');
    
    // Test login
    const loginResponse = await axios.post('http://localhost:4001/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      const token = loginResponse.data.data.accessToken;
      
      // Test token verification
      const verifyResponse = await axios.get('http://localhost:4001/api/v1/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (verifyResponse.data.success) {
        console.log('✅ Token verification successful');
        const permissions = verifyResponse.data.data.permissions;
        
        console.log('\n📋 Received permissions:');
        Object.keys(permissions).forEach(permission => {
          if (permissions[permission]) {
            console.log(`  ✓ ${permission}`);
          }
        });
        
        // Check specific company permissions
        const companyPermissions = [
          'companies:read',
          'companies:create', 
          'companies:edit',
          'companies:delete'
        ];
        
        console.log('\n🏢 Company permissions check:');
        companyPermissions.forEach(perm => {
          if (permissions[perm]) {
            console.log(`  ✅ ${perm}: GRANTED`);
          } else {
            console.log(`  ❌ ${perm}: MISSING`);
          }
        });
        
      } else {
        console.error('❌ Token verification failed:', verifyResponse.data);
      }
    } else {
      console.error('❌ Login failed:', loginResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testPermissions();