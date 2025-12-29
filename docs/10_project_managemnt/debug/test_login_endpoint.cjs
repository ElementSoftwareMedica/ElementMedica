const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('🔍 Testing login endpoint...');
    
    const response = await fetch('http://localhost:4001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📊 Response body:', responseText);
    
    if (response.ok) {
      const responseData = JSON.parse(responseText);
      const data = responseData.data || responseData; // Handle both structures
      console.log('✅ Login successful!');
      console.log('🔑 Token:', data.accessToken ? 'Present' : 'Missing');
      console.log('👤 User ID:', data.user?.id || 'Missing');
      console.log('🎭 User Role:', data.user?.role || 'Missing');
      console.log('🎭 User Roles Array:', data.user?.roles || 'Missing');
      
      if (data.accessToken && data.user?.id) {
        console.log('\n🔍 Testing permissions endpoint...');
        await testPermissions(data.accessToken, data.user.id);
      }
    } else {
      console.log('❌ Login failed!');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

async function testPermissions(token, userId) {
  try {
    console.log('\n🔍 Testing permissions endpoint...');
    console.log('🔍 Using token:', token.substring(0, 20) + '...');
    console.log('🔍 For userId:', userId);
    
    const response = await fetch('http://localhost:4001/api/v1/auth/permissions/' + userId, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await response.text();
    console.log('📊 Permissions response status:', response.status);
    console.log('📊 Permissions response body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Permissions retrieved successfully!');
      console.log('🎭 User Role:', data.data?.role || 'Missing');
      console.log('🔑 Permissions Count:', Object.keys(data.data?.permissions || {}).length);
      console.log('🔑 Sample Permissions:', Object.keys(data.data?.permissions || {}).slice(0, 10));
      
      // Test specific permissions that should be available for ADMIN
      const adminPermissions = ['dashboard:view', 'companies:view', 'employees:view', 'courses:view'];
      console.log('\n🔍 Checking specific admin permissions:');
      adminPermissions.forEach(perm => {
        const hasPermission = data.data?.permissions?.[perm] === true;
        console.log(`  ${perm}: ${hasPermission ? '✅' : '❌'}`);
      });
    } else {
      console.log('❌ Failed to get permissions');
      if (response.status === 403) {
        console.log('🚫 Access denied - possible user ID mismatch');
      }
    }
  } catch (error) {
    console.error('❌ Error testing permissions:', error.message);
  }
}

testLogin();