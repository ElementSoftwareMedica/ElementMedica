import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fetch = require('node-fetch');

async function testRealToken() {
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
    
    // Decodifica il payload del token per debug
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('🔍 Token payload:', JSON.stringify(payload, null, 2));

    // 2. Test GET /api/roles (dovrebbe funzionare)
    console.log('\n📋 Testing GET /api/roles...');
    const getRolesResponse = await fetch('http://localhost:3001/api/roles', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`GET /api/roles status: ${getRolesResponse.status}`);
    if (!getRolesResponse.ok) {
      console.error('GET /api/roles failed:', await getRolesResponse.text());
    } else {
      console.log('✅ GET /api/roles successful');
    }

    // 3. Test PUT /api/roles/ADMIN/permissions (problema)
    console.log('\n🔧 Testing PUT /api/roles/ADMIN/permissions...');
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

    if (!putResponse.ok) {
      console.error('❌ PUT request failed');
    } else {
      console.log('✅ PUT request successful');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testRealToken();