const axios = require('axios');
const jwt = require('jsonwebtoken');

async function debugJWTToken() {
  try {
    console.log('🔍 Testing login and JWT token...');
    
    // Test login
    const loginResponse = await axios.post('http://localhost:4001/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    console.log('✅ Login successful');
    console.log('Response status:', loginResponse.status);
    
    const response = loginResponse.data;
    console.log('\n📋 Response keys:', Object.keys(response));
    
    const data = response.data;
    console.log('📋 Data keys:', Object.keys(data));
    
    const token = data.accessToken;
    const user = data.user;
    
    if (user) {
      console.log('\n📋 User info:');
      console.log('- ID:', user.id);
      console.log('- Email:', user.email);
      console.log('- Roles:', user.roles);
    }
    
    if (!token) {
      console.log('❌ No token found');
      return;
    }
    
    // Decode JWT token
    console.log('\n🔐 JWT Token Analysis:');
    const decoded = jwt.decode(token, { complete: true });
    
    if (decoded) {
      console.log('Header:', JSON.stringify(decoded.header, null, 2));
      console.log('Payload:', JSON.stringify(decoded.payload, null, 2));
      
      // Check permissions in token
      const permissions = decoded.payload.permissions || [];
      console.log('\n🔑 Permissions in token:');
      permissions.forEach(perm => {
        console.log(`- ${perm}`);
      });
      
      const hasCompaniesRead = permissions.includes('companies:read') || 
                              permissions.includes('VIEW_COMPANIES') ||
                              permissions.includes('all:read') ||
                              permissions.includes('companies:all');
      
      console.log('\n📊 Companies access check:');
      console.log('- Has companies:read:', permissions.includes('companies:read'));
      console.log('- Has VIEW_COMPANIES:', permissions.includes('VIEW_COMPANIES'));
      console.log('- Has all:read:', permissions.includes('all:read'));
      console.log('- Has companies:all:', permissions.includes('companies:all'));
      console.log('- Overall companies access:', hasCompaniesRead);
      
    } else {
      console.log('❌ Could not decode JWT token');
    }
    
    // Test companies endpoint with token
    console.log('\n🏢 Testing companies endpoint...');
    try {
      const companiesResponse = await axios.get('http://localhost:4001/api/v1/companies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Companies endpoint accessible');
      console.log('Companies count:', companiesResponse.data.length || 0);
    } catch (error) {
      console.log('❌ Companies endpoint error:', error.response?.status, error.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('- Message:', error.message);
    console.error('- Status:', error.response?.status);
    console.error('- Response data:', error.response?.data);
    console.error('- Full error:', error);
  }
}

debugJWTToken();