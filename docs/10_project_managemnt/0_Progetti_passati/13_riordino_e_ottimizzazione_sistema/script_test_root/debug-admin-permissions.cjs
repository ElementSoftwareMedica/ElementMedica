const axios = require('axios');

async function debugAdminPermissions() {
  try {
    console.log('🔐 Testing admin login and permissions...');
    
    // Test login
    const loginResponse = await axios.post('http://localhost:4001/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.data.accessToken;
    console.log('🔑 Token received:', token.substring(0, 20) + '...');
    
    // Test verify endpoint
    const verifyResponse = await axios.get('http://localhost:4001/api/v1/auth/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n📋 User info:');
    console.log('- ID:', verifyResponse.data.user.id);
    console.log('- Email:', verifyResponse.data.user.email);
    console.log('- Role:', verifyResponse.data.user.role);
    console.log('- Roles array:', verifyResponse.data.user.roles);
    
    console.log('\n🔐 Permissions received:');
    const permissions = verifyResponse.data.permissions;
    Object.keys(permissions).forEach(key => {
      if (permissions[key]) {
        console.log(`- ${key}: ${permissions[key]}`);
      }
    });
    
    console.log('\n🏢 Company-specific permissions:');
    const companyPermissions = Object.keys(permissions).filter(key => key.startsWith('companies:'));
    if (companyPermissions.length === 0) {
      console.log('❌ NO COMPANY PERMISSIONS FOUND!');
    } else {
      companyPermissions.forEach(perm => {
        console.log(`✅ ${perm}: ${permissions[perm]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugAdminPermissions();