const axios = require('axios');

// Frontend URL with Vite proxy
const FRONTEND_API_URL = 'http://localhost:5173';

async function testFrontendAuth() {
  try {
    console.log('🔍 Testing frontend authentication flow...');
    
    // Step 1: Login through frontend proxy
    console.log('\n1. Testing login through frontend proxy...');
    const loginResponse = await axios.post(`${FRONTEND_API_URL}/api/v1/auth/login`, {
      identifier: 'admin@example.com',
      password: 'admin123'
    });
    
    console.log('✅ Frontend login successful');
    console.log('📋 Login response structure:', {
      hasData: !!loginResponse.data.data,
      hasAccessToken: !!loginResponse.data.data?.accessToken,
      tokenLength: loginResponse.data.data?.accessToken?.length
    });
    
    const token = loginResponse.data.data.accessToken;
    if (!token) {
      throw new Error('No access token received from frontend login');
    }
    
    // Step 2: Test verify endpoint through frontend proxy
    console.log('\n2. Testing verify endpoint through frontend proxy...');
    const verifyResponse = await axios.get(`${FRONTEND_API_URL}/api/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Frontend verify endpoint successful');
    console.log('📋 Verify response structure:', {
      valid: verifyResponse.data.valid,
      hasUser: !!verifyResponse.data.user,
      hasPermissions: !!verifyResponse.data.permissions,
      userRole: verifyResponse.data.user?.role,
      userRoles: verifyResponse.data.user?.roles
    });
    
    // Step 3: Check companies permissions
    console.log('\n3. Checking companies permissions through frontend...');
    const permissions = verifyResponse.data.permissions;
    const companiesPermissions = Object.keys(permissions)
      .filter(key => key.startsWith('companies:'))
      .reduce((obj, key) => {
        obj[key] = permissions[key];
        return obj;
      }, {});
    
    console.log('🏢 Companies permissions:', companiesPermissions);
    
    // Step 4: Test hasPermission logic simulation
    console.log('\n4. Simulating frontend hasPermission logic...');
    const user = verifyResponse.data.user;
    
    // Simulate the hasPermission function from AuthContext
    function simulateHasPermission(resource, action) {
      // Admin or Administrator have all permissions
      if (user?.role === 'Admin' || user?.role === 'Administrator') {
        console.log(`  ✅ Access granted: user is ${user.role}`);
        return true;
      }
      
      // Check all:action permission
      if (permissions['all:' + action] === true) {
        console.log(`  ✅ Access granted: user has all:${action} permission`);
        return true;
      }
      
      // Check resource:all permission
      if (permissions[resource + ':all'] === true) {
        console.log(`  ✅ Access granted: user has ${resource}:all permission`);
        return true;
      }
      
      // Check specific permission
      const permissionKey = `${resource}:${action}`;
      const hasSpecificPermission = permissions[permissionKey] === true;
      
      if (hasSpecificPermission) {
        console.log(`  ✅ Access granted: user has ${permissionKey} permission`);
        return true;
      }
      
      // For 'read' actions, check if user has any permission for this resource
      if (!hasSpecificPermission && action === 'read') {
        const hasAnyPermissionForResource = Object.keys(permissions)
          .some(key => key.startsWith(resource + ':') && permissions[key] === true);
        
        if (hasAnyPermissionForResource) {
          console.log(`  ✅ Access granted: user has some permission for ${resource}`);
          return true;
        }
      }
      
      console.log(`  ❌ Access denied: no permission for ${resource}:${action}`);
      return false;
    }
    
    console.log('🔍 Testing hasPermission("companies", "read"):');
    const hasCompaniesRead = simulateHasPermission('companies', 'read');
    
    console.log('\n📊 Final assessment:');
    console.log('  - User role:', user?.role);
    console.log('  - Has companies:read permission:', hasCompaniesRead);
    console.log('  - Should be able to access /companies page:', hasCompaniesRead);
    
    // Step 5: Test companies API through frontend proxy
    console.log('\n5. Testing companies API through frontend proxy...');
    try {
      const companiesResponse = await axios.get(`${FRONTEND_API_URL}/api/v1/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Companies API accessible through frontend proxy');
      console.log('📊 Companies count:', companiesResponse.data.data?.length || 0);
    } catch (apiError) {
      console.log('❌ Companies API failed through frontend proxy:', apiError.response?.status, apiError.response?.data?.message);
    }
    
    console.log('\n🎉 Frontend authentication test completed!');
    
  } catch (error) {
    console.error('❌ Frontend test failed:', error.message);
    if (error.response) {
      console.error('📋 Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
  }
}

testFrontendAuth();