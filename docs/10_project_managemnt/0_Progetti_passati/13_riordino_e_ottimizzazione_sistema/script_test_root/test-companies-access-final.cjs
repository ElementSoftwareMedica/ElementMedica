const axios = require('axios');

const API_BASE = 'http://localhost:4001';

async function testCompaniesAccess() {
  console.log('🔐 Testing complete companies access flow...');
  
  try {
    // 1. Login
    console.log('\n1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      identifier: 'admin@example.com',
      password: 'admin123'
    });
    
    const { accessToken } = loginResponse.data.data;
    console.log('✅ Login successful, token obtained');
    
    // 2. Verify token
    console.log('\n2️⃣ Verifying token...');
    const verifyResponse = await axios.get(`${API_BASE}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const permissionsData = verifyResponse.data.permissions || verifyResponse.data.data?.permissions || {};
    console.log('📋 Full verify response:', JSON.stringify(verifyResponse.data, null, 2));
    
    // Convert permissions to array if it's an object
    let permissions = [];
    if (Array.isArray(permissionsData)) {
      permissions = permissionsData;
    } else if (typeof permissionsData === 'object' && permissionsData !== null) {
      permissions = Object.keys(permissionsData);
    }
    
    console.log(`✅ Token verified, ${permissions.length} permissions loaded`);
    console.log('📋 Sample permissions:', permissions.slice(0, 10));
    
    // 3. Check companies permission
    const hasCompaniesRead = permissions.includes('companies:read');
    console.log(`\n3️⃣ Companies read permission: ${hasCompaniesRead ? '✅ YES' : '❌ NO'}`);
    
    if (!hasCompaniesRead) {
      console.log('❌ User does not have companies:read permission');
      console.log('📋 Available permissions:', permissions);
      return;
    }
    
    // 4. Access companies endpoint
    console.log('\n4️⃣ Accessing companies endpoint...');
    const companiesResponse = await axios.get(`${API_BASE}/api/v1/companies`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    console.log('✅ Companies endpoint accessible!');
    console.log(`📊 Found ${companiesResponse.data.length} companies`);
    
    // 5. Test frontend route protection simulation
    console.log('\n5️⃣ Frontend route protection simulation...');
    
    // Simula la logica di ProtectedRoute
    const isAuthenticated = !!accessToken;
    const hasPermission = (resource, action) => {
      return permissions.includes(`${resource}:${action}`);
    };
    
    const canAccessCompanies = isAuthenticated && hasPermission('companies', 'read');
    
    console.log(`🔐 Authenticated: ${isAuthenticated ? '✅' : '❌'}`);
    console.log(`🔑 Has companies:read: ${hasPermission('companies', 'read') ? '✅' : '❌'}`);
    console.log(`🚪 Can access /companies route: ${canAccessCompanies ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🎉 All tests passed! Companies page should be accessible.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCompaniesAccess();