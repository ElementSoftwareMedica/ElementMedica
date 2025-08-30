const axios = require('axios');

// Test login con credenziali standard
async function testLogin() {
  try {
    console.log('🔐 Testing login with standard credentials...');
    
    const response = await axios.post('http://localhost:4001/api/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login successful!');
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Test token validity
    if (response.data.token) {
      console.log('\n🔍 Testing token validity...');
      const tokenTest = await axios.get('http://localhost:4001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${response.data.token}`
        }
      });
      
      console.log('✅ Token is valid!');
      console.log('User data:', JSON.stringify(tokenTest.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🚨 Server connection refused - check if API server is running on port 4001');
    }
  }
}

testLogin();