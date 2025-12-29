#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4001';

async function testRolesEndpoint() {
  try {
    console.log('🧪 Testing roles endpoint...');

    // 1. Login per ottenere il token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });

    console.log(`Login response status: ${loginResponse.status}`);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log(`❌ Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
      console.log(`Error response:`, errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('Login data:', JSON.stringify(loginData, null, 2));
    
    const token = loginData.data?.accessToken || loginData.token || loginData.accessToken;
    
    if (!token) {
      console.log('❌ No token found in login response');
      return;
    }
    
    console.log('Token found:', token.substring(0, 20) + '...');

    // 2. Test dell'endpoint PUT /api/roles/ADMIN/permissions
    console.log('2. Testing PUT /api/roles/ADMIN/permissions...');
    
    const testPermissions = [
      'users.read',
      'users.create',
      'users.update',
      'roles.read',
      'roles.manage'
    ];

    const updateResponse = await fetch(`${API_BASE}/api/roles/ADMIN/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        permissions: testPermissions
      })
    });

    console.log(`Response status: ${updateResponse.status}`);
    console.log(`Response headers:`, Object.fromEntries(updateResponse.headers.entries()));

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log(`❌ Request failed: ${updateResponse.status} ${updateResponse.statusText}`);
      console.log(`Error response:`, errorText);
      return;
    }

    const updateData = await updateResponse.json();
    console.log('✅ PUT request successful!');
    console.log('Response data:', updateData);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testRolesEndpoint();