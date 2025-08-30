const axios = require('axios');

// Frontend URL con proxy Vite
const FRONTEND_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

async function testFrontendCompanies() {
  try {
    console.log('🔍 Test accesso Companies via Frontend Proxy');
    console.log('=' .repeat(60));
    
    // 1. Login via frontend proxy
    console.log('\n1️⃣ Login via frontend proxy...');
    const loginResponse = await axios.post(`${FRONTEND_URL}/api/v1/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    console.log('✅ Login successful');
    console.log('📋 Full login response:', JSON.stringify(loginResponse.data, null, 2));
    console.log('📋 User info:', {
      email: loginResponse.data.data?.user?.email,
      role: loginResponse.data.data?.user?.role,
      permissions: loginResponse.data.data?.user?.permissions?.length || 0
    });
    
    const token = loginResponse.data.data.accessToken;
    
    // 2. Test accesso companies via proxy
    console.log('\n2️⃣ Test accesso companies via proxy...');
    const companiesResponse = await axios.get(`${FRONTEND_URL}/api/v1/companies`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Companies API access successful via proxy');
    console.log('📊 Companies data:', {
      count: companiesResponse.data.data?.length || 0,
      hasData: !!companiesResponse.data.data
    });
    
    // 3. Test verify endpoint via proxy
    console.log('\n3️⃣ Test verify endpoint via proxy...');
    const verifyResponse = await axios.get(`${FRONTEND_URL}/api/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Verify endpoint successful via proxy');
    console.log('🔐 Verify data:', {
      isValid: verifyResponse.data.success,
      role: verifyResponse.data.data?.user?.role,
      permissions: verifyResponse.data.data?.user?.permissions?.length || 0
    });
    
    console.log('\n🎯 RISULTATO: Frontend proxy funziona correttamente!');
    
  } catch (error) {
    console.error('❌ Error during frontend test:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

testFrontendCompanies();