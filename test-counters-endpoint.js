/**
 * Test script to verify /api/counters endpoint
 */

const fetch = require('node-fetch');

async function testCountersEndpoint() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing /api/counters endpoint...\n');
  
  try {
    // First, login to get a token
    console.log('1. Logging in...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@elementmedica.it',
        password: 'Admin123!'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login successful\n');
    
    // Test counters endpoint
    console.log('2. Calling /api/counters...');
    const countersRes = await fetch(`${baseUrl}/api/counters`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Status: ${countersRes.status} ${countersRes.statusText}`);
    
    if (!countersRes.ok) {
      const errorText = await countersRes.text();
      console.error('❌ Request failed:', errorText);
      return;
    }
    
    const countersData = await countersRes.json();
    console.log('\n✅ Counters data received:');
    console.log(JSON.stringify(countersData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCountersEndpoint();
