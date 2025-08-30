#!/usr/bin/env node

/**
 * Test per verificare la risoluzione del problema di rete
 * Testa la comunicazione tra i server usando 127.0.0.1 invece di localhost
 */

import fetch from 'node-fetch';

const servers = [
  { name: 'API Server', url: 'http://127.0.0.1:4001/health' },
  { name: 'Documents Server', url: 'http://127.0.0.1:4002/health' },
  { name: 'Proxy Server', url: 'http://127.0.0.1:4003/health' }
];

const testServer = async (server) => {
  try {
    console.log(`🔍 Testing ${server.name}...`);
    const response = await fetch(server.url, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      const data = await response.text();
      console.log(`✅ ${server.name} is responding: ${response.status}`);
      return true;
    } else {
      console.log(`❌ ${server.name} returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${server.name} failed: ${error.message}`);
    return false;
  }
};

const testLogin = async () => {
  try {
    console.log('\n🔍 Testing login endpoint...');
    const response = await fetch('http://127.0.0.1:4003/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    console.log(`📊 Login test status: ${response.status}`);
    const data = await response.text();
    console.log(`📊 Login response: ${data.substring(0, 200)}...`);
    return response.status !== 500;
  } catch (error) {
    console.log(`❌ Login test failed: ${error.message}`);
    return false;
  }
};

const runTests = async () => {
  console.log('🚀 Starting network connectivity tests...\n');
  
  const results = [];
  
  // Test each server
  for (const server of servers) {
    const result = await testServer(server);
    results.push({ server: server.name, success: result });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  // Test login
  const loginResult = await testLogin();
  results.push({ server: 'Login Endpoint', success: loginResult });
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let allPassed = true;
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.server}`);
    if (!result.success) allPassed = false;
  });
  
  console.log('\n' + (allPassed ? '🎉 All tests passed! Network issue resolved.' : '⚠️  Some tests failed. Network issue may persist.'));
  
  return allPassed;
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export default runTests;