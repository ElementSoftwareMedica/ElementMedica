const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔍 Testing login with admin@example.com...');
    
    const response = await fetch('http://localhost:4001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    const data = await response.text();
    console.log('📊 Response Body:', data);
    
    if (response.ok) {
      console.log('✅ Login successful!');
      try {
        const jsonData = JSON.parse(data);
        console.log('🔑 Token received:', jsonData.token ? 'YES' : 'NO');
        console.log('👤 User data:', jsonData.user ? 'YES' : 'NO');
      } catch (e) {
        console.log('⚠️ Response is not JSON');
      }
    } else {
      console.log('❌ Login failed!');
    }
    
  } catch (error) {
    console.error('💥 Error during login test:', error.message);
  }
}

testLogin();