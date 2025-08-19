const axios = require('axios');

async function testCompaniesAPI() {
  try {
    console.log('🔍 Testing companies API...');
    
    // First, login to get a valid token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:4001/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'admin123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    
    // Test companies API
    console.log('2. Testing companies API...');
    const companiesResponse = await axios.get('http://localhost:4001/api/v1/companies', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Companies API Response:');
    console.log('Status:', companiesResponse.status);
    console.log('Data type:', typeof companiesResponse.data);
    console.log('Is array:', Array.isArray(companiesResponse.data));
    console.log('Data length:', companiesResponse.data?.length || 'N/A');
    console.log('First item:', companiesResponse.data?.[0] || 'No items');
    
    if (Array.isArray(companiesResponse.data) && companiesResponse.data.length > 0) {
      console.log('✅ API returns valid array with data');
      console.log('Sample company fields:', Object.keys(companiesResponse.data[0]));
    } else {
      console.log('⚠️ API returns empty array or invalid data');
    }
    
  } catch (error) {
    console.error('❌ Error testing companies API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testCompaniesAPI();