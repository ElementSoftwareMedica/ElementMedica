import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4003';

async function testRolePermissions() {
  try {
    console.log('🔍 Testing role permissions endpoint...');
    
    // 1. Login to get token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.success || !loginData.data?.accessToken) {
      throw new Error('Login failed');
    }
    
    const token = loginData.data.accessToken;
    console.log('✅ Login successful, token obtained');
    
    // 2. Test GET /api/roles/SUPER_ADMIN/permissions
    console.log('\n2. Testing GET /api/roles/SUPER_ADMIN/permissions...');
    const permissionsResponse = await fetch(`${API_BASE}/api/roles/SUPER_ADMIN/permissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Permissions response status:', permissionsResponse.status);
    
    if (permissionsResponse.status === 500) {
      const errorText = await permissionsResponse.text();
      console.log('❌ Error 500 response:', errorText);
    } else {
      const permissionsData = await permissionsResponse.json();
      console.log('✅ Permissions response:', JSON.stringify(permissionsData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRolePermissions();