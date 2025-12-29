const https = require('https');
const http = require('http');

async function testLoginAndDecodeJWT() {
  try {
    console.log('🔐 Step 1: Login...');
    
    // Step 1: Login to get token
    const loginResponse = await fetch('http://localhost:4001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });
    
    const loginText = await loginResponse.text();
    console.log('📊 Login response status:', loginResponse.status);
    console.log('📊 Login response body:', loginText);
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const loginData = JSON.parse(loginText);
    const token = loginData.data?.accessToken;
    const userFromResponse = loginData.data?.user;
    
    if (!token) {
      console.log('❌ No token received');
      return;
    }
    
    console.log('✅ Login successful!');
    console.log('🔑 Token received:', token.substring(0, 20) + '...');
    console.log('👤 User from response:', {
      id: userFromResponse?.id,
      personId: userFromResponse?.personId,
      email: userFromResponse?.email,
      roles: userFromResponse?.roles,
      role: userFromResponse?.role
    });
    
    // Step 2: Decode JWT token to see what's inside
    console.log('\n🔍 Step 2: Decoding JWT token...');
    
    // JWT has 3 parts separated by dots
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.log('❌ Invalid JWT format');
      return;
    }
    
    // Decode the payload (second part)
    const payload = tokenParts[1];
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = Buffer.from(paddedPayload, 'base64').toString('utf8');
    const jwtData = JSON.parse(decodedPayload);
    
    console.log('🔍 JWT Payload:', jwtData);
    console.log('🔍 Person ID in JWT:', jwtData.personId);
    console.log('🔍 Email in JWT:', jwtData.email);
    console.log('🔍 Roles in JWT:', jwtData.roles);
    
    // Step 3: Test permissions endpoint with the correct user ID
    const userIdToUse = jwtData.personId || userFromResponse?.id || userFromResponse?.personId;
    
    if (!userIdToUse) {
      console.log('❌ No user ID found to test permissions');
      return;
    }
    
    console.log('\n🔍 Step 3: Testing permissions with user ID:', userIdToUse);
    
    // Use a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const permissionsResponse = await fetch(`http://localhost:4001/api/v1/auth/permissions/${userIdToUse}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const permissionsText = await permissionsResponse.text();
      console.log('📊 Permissions response status:', permissionsResponse.status);
      console.log('📊 Permissions response body:', permissionsText);
      
      if (permissionsResponse.ok) {
        const permissionsData = JSON.parse(permissionsText);
        console.log('✅ Permissions retrieved successfully!');
        console.log('🎭 User Role:', permissionsData.data?.role || 'Missing');
        console.log('🔑 Permissions Count:', Object.keys(permissionsData.data?.permissions || {}).length);
        
        // Show first 10 permissions
        const permissions = Object.keys(permissionsData.data?.permissions || {});
        console.log('🔑 First 10 permissions:', permissions.slice(0, 10));
        
        // Test specific admin permissions
        const adminPermissions = ['dashboard:view', 'companies:view', 'employees:view', 'courses:view'];
        console.log('\n🔍 Checking specific admin permissions:');
        adminPermissions.forEach(perm => {
          const hasPermission = permissionsData.data?.permissions?.[perm] === true;
          console.log(`  ${perm}: ${hasPermission ? '✅' : '❌'}`);
        });
      } else {
        console.log('❌ Failed to get permissions');
        if (permissionsResponse.status === 403) {
          console.log('🚫 Access denied - user ID mismatch or insufficient permissions');
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('⏰ Permissions request timed out after 10 seconds');
      } else {
        console.error('❌ Error testing permissions:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

testLoginAndDecodeJWT();