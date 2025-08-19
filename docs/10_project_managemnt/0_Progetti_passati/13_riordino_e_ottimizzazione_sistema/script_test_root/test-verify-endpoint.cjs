const axios = require('axios');

const BASE_URL = 'http://localhost:4001';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';

async function testVerifyEndpoint() {
  try {
    console.log('🔍 Test endpoint verify...');
    console.log('============================================================');
    
    // 1. Login
    console.log('\n1. Login admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful');
    console.log('🔑 Token length:', token.length);
    
    // 2. Test verify endpoint
    console.log('\n2. Test verify endpoint...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Verify successful');
    console.log('📋 User info:');
    console.log('  - ID:', verifyResponse.data.user.id);
    console.log('  - Email:', verifyResponse.data.user.email);
    console.log('  - Role:', verifyResponse.data.user.role);
    console.log('  - Roles array:', verifyResponse.data.user.roles);
    
    console.log('\n🔑 Permissions:');
    const permissions = verifyResponse.data.permissions;
    const companyPermissions = Object.keys(permissions)
      .filter(key => key.startsWith('companies:'))
      .sort();
    
    if (companyPermissions.length > 0) {
      console.log('✅ Company permissions found:');
      companyPermissions.forEach(perm => {
        console.log(`  - ${perm}: ${permissions[perm]}`);
      });
    } else {
      console.log('❌ No company permissions found');
    }
    
    console.log('\n📊 All permissions:');
    Object.keys(permissions).sort().forEach(perm => {
      console.log(`  - ${perm}: ${permissions[perm]}`);
    });
    
    // 3. Test hasPermission logic
    console.log('\n3. Test hasPermission logic:');
    const user = verifyResponse.data.user;
    
    function testHasPermission(resource, action) {
      console.log(`\n🔍 Testing hasPermission('${resource}', '${action}'):`);
      
      // Admin check
      if (user?.role === 'Admin' || user?.role === 'Administrator') {
        console.log('  ✅ Access granted: user is Admin/Administrator');
        return true;
      }
      
      // Specific permission check
      const permissionKey = `${resource}:${action}`;
      const hasSpecificPermission = permissions[permissionKey] === true;
      console.log(`  - Checking ${permissionKey}: ${hasSpecificPermission}`);
      
      if (hasSpecificPermission) {
        console.log('  ✅ Access granted: specific permission');
        return true;
      }
      
      // Fallback for read actions
      if (action === 'read') {
        const hasAnyPermissionForResource = Object.keys(permissions)
          .some(key => key.startsWith(resource + ':') && permissions[key] === true);
        
        if (hasAnyPermissionForResource) {
          console.log('  ✅ Access granted: has some permission for resource');
          return true;
        }
      }
      
      console.log('  ❌ Access denied');
      return false;
    }
    
    testHasPermission('companies', 'read');
    testHasPermission('companies', 'create');
    testHasPermission('companies', 'edit');
    testHasPermission('companies', 'delete');
    
  } catch (error) {
    console.error('🚨 Errore:', error.message);
    if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testVerifyEndpoint();