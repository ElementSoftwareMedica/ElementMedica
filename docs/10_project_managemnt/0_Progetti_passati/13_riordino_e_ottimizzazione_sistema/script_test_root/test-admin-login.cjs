const axios = require('axios');

const API_BASE = 'http://localhost:4001/api/v1';

async function testAdminLogin() {
  console.log('🧪 Testing admin login and permissions...');
  
  try {
    // Test login
    console.log('\n1. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    console.log('✅ Login successful');
    console.log('📋 Login response:', {
      hasData: !!loginResponse.data.data,
      hasToken: !!loginResponse.data.data?.accessToken,
      hasUser: !!loginResponse.data.data?.user,
      userRoles: loginResponse.data.data?.user?.roles
    });
    
    const token = loginResponse.data.data.accessToken;
    
    // Test verify endpoint
    console.log('\n2. Testing verify endpoint...');
    const verifyResponse = await axios.get(`${API_BASE}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Verify successful');
    console.log('📋 Verify response:', {
      valid: verifyResponse.data.valid,
      hasUser: !!verifyResponse.data.user,
      hasPermissions: !!verifyResponse.data.permissions,
      permissionsCount: Object.keys(verifyResponse.data.permissions || {}).length,
      companiesPermissions: Object.keys(verifyResponse.data.permissions || {})
        .filter(p => p.includes('companies'))
    });
    
    // Test companies API access
    console.log('\n3. Testing companies API access...');
    const companiesResponse = await axios.get(`${API_BASE}/companies`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Companies API accessible');
    console.log('📋 Companies response:', {
      status: companiesResponse.status,
      hasData: !!companiesResponse.data.data,
      companiesCount: companiesResponse.data.data?.length || 0
    });
    
    console.log('\n🎯 All tests passed! Admin can access companies.');
    
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    process.exit(1);
  }
}

testAdminLogin();