#!/usr/bin/env node

import fetch from 'node-fetch';

async function testVerifyPermissions() {
  try {
    console.log('🔍 Testing verify endpoint with corrected permissions...\n');
    
    // 1. Login to get token
    console.log('📝 Step 1: Logging in...');
    const loginResponse = await fetch('http://localhost:4001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default-company'
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    console.log('✅ Login successful, token obtained');
    
    // 2. Test verify endpoint
    console.log('\n📝 Step 2: Testing verify endpoint...');
    const verifyResponse = await fetch('http://localhost:4001/api/v1/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Verify failed: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifyData = await verifyResponse.json();
    console.log('✅ Verify endpoint successful');
    
    // 3. Check permissions
    console.log('\n📋 Step 3: Checking permissions...');
    console.log('User:', {
      id: verifyData.user.id,
      email: verifyData.user.email,
      role: verifyData.user.role,
      roles: verifyData.user.roles
    });
    
    console.log('\n🔐 Permissions analysis:');
    const permissions = verifyData.permissions;
    const totalPermissions = Object.keys(permissions).length;
    console.log(`Total permissions: ${totalPermissions}`);
    
    // Check specific permissions we need
    const criticalPermissions = [
      'VIEW_USERS',
      'users:read',
      'CREATE_USERS', 
      'users:create',
      'EDIT_USERS',
      'users:edit',
      'DELETE_USERS',
      'users:delete',
      'VIEW_COMPANIES',
      'companies:read',
      'ROLE_MANAGEMENT',
      'roles:read'
    ];
    
    console.log('\n🎯 Critical permissions check:');
    criticalPermissions.forEach(perm => {
      const hasPermission = permissions[perm] === true;
      console.log(`  ${hasPermission ? '✅' : '❌'} ${perm}: ${hasPermission}`);
    });
    
    // Check if VIEW_USERS is present (this was the main issue)
    if (permissions['VIEW_USERS'] === true) {
      console.log('\n🎉 SUCCESS: VIEW_USERS permission is now present!');
      console.log('🎉 SUCCESS: The UsersTab should now work correctly!');
    } else {
      console.log('\n❌ ISSUE: VIEW_USERS permission is still missing');
    }
    
    // Show all permissions for debugging
    console.log('\n📋 All permissions:');
    Object.keys(permissions)
      .sort()
      .forEach(perm => {
        if (permissions[perm] === true) {
          console.log(`  - ${perm}: true`);
        }
      });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testVerifyPermissions();