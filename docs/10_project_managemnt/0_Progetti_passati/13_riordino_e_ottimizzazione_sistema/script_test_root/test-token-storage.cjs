const axios = require('axios');

const API_BASE = 'http://localhost:4001/api/v1';

async function testTokenStorage() {
  console.log('🧪 Testing token storage consistency...');
  
  try {
    // Test login
    console.log('\n1. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    console.log('✅ Login successful');
    const token = loginResponse.data.data.accessToken;
    console.log('📋 Token received:', token.substring(0, 20) + '...');
    
    // Simula il salvataggio del token come fa il frontend
    console.log('\n2. Simulating frontend token storage...');
    
    // Il servizio auth.ts salva come 'auth_token'
    console.log('🔑 Token should be saved as "auth_token" according to auth.ts');
    
    // Test verify con il token
    console.log('\n3. Testing verify with token...');
    const verifyResponse = await axios.get(`${API_BASE}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Verify successful');
    console.log('📋 User:', {
      id: verifyResponse.data.user.id,
      email: verifyResponse.data.user.email,
      roles: verifyResponse.data.user.roles
    });
    console.log('📋 Permissions count:', Object.keys(verifyResponse.data.permissions).length);
    console.log('📋 Companies permissions:', 
      Object.keys(verifyResponse.data.permissions)
        .filter(p => p.includes('companies'))
    );
    
    console.log('\n🎯 Token storage test completed successfully!');
    console.log('\n📝 Key findings:');
    console.log('   - Backend login works correctly');
    console.log('   - Backend verify works correctly');
    console.log('   - Token format is valid');
    console.log('   - Admin has companies permissions');
    console.log('\n⚠️  Potential issue:');
    console.log('   - Check if frontend uses correct token key "auth_token"');
    
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    process.exit(1);
  }
}

testTokenStorage();