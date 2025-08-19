const axios = require('axios');

async function testLoginEndpoint() {
  try {
    console.log('🔍 Testing login endpoint for laura.dipendente@example.com...');
    
    const response = await axios.post('http://localhost:4003/api/v1/auth/login', {
      identifier: 'laura.dipendente@example.com',
      password: 'Password123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Login failed!');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }
    
    console.error('Full error:', error);
  }
}

testLoginEndpoint();