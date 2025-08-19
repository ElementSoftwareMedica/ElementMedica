import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');
const fs = require('fs');

async function testWithLogging() {
  try {
    console.log('🔐 Starting login...');
    
    // 1. Login per ottenere il token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'matteo.michielon@gmail.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    console.log('✅ Login successful');

    // 2. Aspetta un momento per permettere ai log del server di essere scritti
    console.log('⏳ Waiting 2 seconds before PUT request...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Test PUT /api/roles/ADMIN/permissions (problema)
    console.log('🔧 Testing PUT /api/roles/ADMIN/permissions...');
    const putResponse = await fetch('http://localhost:3001/api/roles/ADMIN/permissions', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        permissions: ['users.read', 'users.write', 'roles.manage']
      })
    });

    console.log(`PUT /api/roles/ADMIN/permissions status: ${putResponse.status}`);
    const putResponseText = await putResponse.text();
    console.log('PUT response:', putResponseText);

    // 4. Aspetta un momento per permettere ai log del server di essere scritti
    console.log('⏳ Waiting 2 seconds for server logs...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Test completed. Check server logs for debug information.');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testWithLogging();