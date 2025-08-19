/**
 * Test semplice per l'endpoint hierarchy/current-user
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4001';

async function testCurrentUserHierarchy() {
  console.log('🧪 Test Endpoint hierarchy/current-user');
  console.log('=' .repeat(50));

  try {
    // 1. Login
    console.log('\n1️⃣ Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });

    const token = loginResponse.data.data?.accessToken;
    console.log('✅ Login successful');

    // 2. Test endpoint
    console.log('\n2️⃣ Test endpoint hierarchy/current-user...');
    const response = await axios.get(`${BASE_URL}/api/roles/hierarchy/current-user`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✅ Endpoint response received');
    console.log('📋 Response data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Errore:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testCurrentUserHierarchy();