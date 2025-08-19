const axios = require('axios');

// Test del login con le credenziali corrette
async function testLogin() {
  try {
    console.log('🔐 Testing login with admin credentials...');
    
    const response = await axios.post('http://localhost:4001/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('📋 Response structure:', {
      success: response.data.success,
      message: response.data.message,
      hasData: !!response.data.data,
      hasDirectAccessToken: !!response.data.accessToken,
      hasNestedAccessToken: !!response.data.data?.accessToken,
      hasDirectUser: !!response.data.user,
      hasNestedUser: !!response.data.data?.user
    });
    
    // Mostra la struttura completa per debug
    console.log('🔍 Full response keys:', Object.keys(response.data));
    
    if (response.data.data) {
      console.log('🔍 Nested data keys:', Object.keys(response.data.data));
    }
    
    // Test del token se presente
    const token = response.data.accessToken || response.data.data?.accessToken;
    if (token) {
      console.log('🎯 Token found:', token.substring(0, 20) + '...');
      
      // Test di verifica del token
      console.log('\n🔄 Testing token verification...');
      const verifyResponse = await axios.get('http://localhost:4001/api/v1/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Token verification successful!');
      console.log('📋 Verify response:', {
        valid: verifyResponse.data.valid,
        hasUser: !!verifyResponse.data.user,
        hasPermissions: !!verifyResponse.data.permissions,
        permissionsCount: Object.keys(verifyResponse.data.permissions || {}).length
      });
      
      // Mostra alcuni permessi per debug
      if (verifyResponse.data.permissions) {
        const permissions = Object.keys(verifyResponse.data.permissions)
          .filter(key => verifyResponse.data.permissions[key] === true)
          .slice(0, 10); // Primi 10 permessi
        console.log('🔑 Sample permissions:', permissions);
      }
    } else {
      console.log('❌ No token found in response!');
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

testLogin();