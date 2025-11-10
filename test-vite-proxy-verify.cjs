#!/usr/bin/env node

/**
 * Test Vite Proxy for /auth/verify endpoint
 * Verifica se il proxy Vite inoltra correttamente le richieste al backend
 */

const http = require('http');

console.log('🧪 Test Vite Proxy - /auth/verify endpoint\n');

// Test 1: Direct backend call (4001)
console.log('1️⃣  Testing direct backend (port 4001)...');
testEndpoint('localhost', 4001, '/api/v1/auth/verify', (success) => {
  if (success) {
    console.log('   ✅ Backend responds correctly\n');
    
    // Test 2: Proxy call (4003)
    console.log('2️⃣  Testing proxy server (port 4003)...');
    testEndpoint('localhost', 4003, '/api/v1/auth/verify', (success) => {
      if (success) {
        console.log('   ✅ Proxy responds correctly\n');
        
        // Test 3: Vite proxy call (5173)
        console.log('3️⃣  Testing Vite proxy (port 5173)...');
        testEndpoint('localhost', 5173, '/api/v1/auth/verify', (success) => {
          if (success) {
            console.log('   ✅ Vite proxy works correctly\n');
            console.log('✅ All tests passed! System is healthy.');
          } else {
            console.log('   ❌ Vite proxy FAILED or TIMEOUT\n');
            console.log('⚠️  Problem: Vite proxy not forwarding requests to backend');
            console.log('💡 Solutions:');
            console.log('   - Restart Vite dev server: npm run dev');
            console.log('   - Check vite.config.ts proxy configuration');
            console.log('   - Ensure proxy target is http://localhost:4003');
          }
          process.exit(success ? 0 : 1);
        }, 5000); // Longer timeout for Vite
      } else {
        console.log('   ❌ Proxy server FAILED\n');
        console.log('⚠️  Proxy server (4003) not responding');
        process.exit(1);
      }
    });
  } else {
    console.log('   ❌ Backend FAILED\n');
    console.log('⚠️  Backend (4001) not responding');
    process.exit(1);
  }
});

function testEndpoint(host, port, path, callback, timeout = 2000) {
  const options = {
    hostname: host,
    port: port,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer invalid_token'
    },
    timeout: timeout
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      const success = res.statusCode === 401 || res.statusCode === 200;
      console.log(`   Response: HTTP ${res.statusCode} (${success ? 'OK' : 'ERROR'})`);
      callback(success);
    });
  });

  req.on('error', (err) => {
    console.log(`   Error: ${err.message}`);
    callback(false);
  });

  req.on('timeout', () => {
    console.log(`   Timeout after ${timeout}ms`);
    req.destroy();
    callback(false);
  });

  req.end();
}
