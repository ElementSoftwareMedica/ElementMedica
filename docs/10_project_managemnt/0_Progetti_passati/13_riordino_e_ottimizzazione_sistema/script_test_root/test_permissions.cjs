const axios = require('axios');

const API_BASE = 'http://localhost:4001';

async function testPermissions() {
  try {
    console.log('🔐 Testing login and permissions...');
    
    // 1. Login
    console.log('\n1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/api/v1/auth/login`, {
      identifier: 'admin@example.com',
      password: 'admin123'
    });
    
    console.log('Login successful!');
    const token = loginResponse.data.data.accessToken;
    console.log('Token received:', token.substring(0, 20) + '...');
    
    // 2. Verify token and get permissions
    console.log('\n2. Verifying token and getting permissions...');
    const verifyResponse = await axios.get(`${API_BASE}/api/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n✅ Token verification successful!');
    console.log('User role:', verifyResponse.data.user.role);
    console.log('User roles:', verifyResponse.data.user.roles);
    
    console.log('\n📋 Permissions received:');
    const permissions = verifyResponse.data.permissions;
    Object.keys(permissions).forEach(key => {
      if (permissions[key]) {
        console.log(`  ✓ ${key}`);
      }
    });
    
    // 3. Check specific companies permissions
    console.log('\n🏢 Companies permissions check:');
    console.log(`  companies:read: ${permissions['companies:read'] ? '✅' : '❌'}`);
    console.log(`  companies:create: ${permissions['companies:create'] ? '✅' : '❌'}`);
    console.log(`  companies:edit: ${permissions['companies:edit'] ? '✅' : '❌'}`);
    console.log(`  companies:delete: ${permissions['companies:delete'] ? '✅' : '❌'}`);
    
    if (permissions['companies:read']) {
      console.log('\n🎉 SUCCESS: Admin has companies:read permission!');
    } else {
      console.log('\n❌ PROBLEM: Admin does not have companies:read permission!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPermissions();