const axios = require('axios');

const BASE_URL = 'http://localhost:5000'; // Backend diretto
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

async function testCompaniesFrontend() {
  try {
    console.log('🔍 Test accesso Companies via Frontend');
    console.log('============================================================');
    
    // 1. Login via frontend
    console.log('\n1. Login via frontend proxy...');
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
    
    // 2. Test verify endpoint via frontend
    console.log('\n2. Test verify endpoint via frontend...');
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
    
    // 3. Test hasPermission logic (simula frontend)
    console.log('\n3. Test hasPermission logic (simula frontend):');
    const user = verifyResponse.data.user;
    
    function testHasPermission(resource, action) {
      console.log(`\n🔍 Testing hasPermission('${resource}', '${action}'):`);
      
      // Admin check (come nel frontend AuthContext)
      if (user?.role === 'Admin' || user?.role === 'Administrator') {
        console.log('  ✅ Access granted: user is Admin/Administrator');
        return true;
      }
      
      // Universal permissions check
      if (permissions[`all:${action}`] === true) {
        console.log(`  ✅ Access granted: has all:${action}`);
        return true;
      }
      
      if (permissions[`${resource}:all`] === true) {
        console.log(`  ✅ Access granted: has ${resource}:all`);
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
    
    const hasCompaniesRead = testHasPermission('companies', 'read');
    testHasPermission('companies', 'create');
    testHasPermission('companies', 'edit');
    testHasPermission('companies', 'delete');
    
    // 4. Test companies endpoint via frontend
    console.log('\n4. Test companies endpoint via frontend...');
    try {
      const companiesResponse = await axios.get(`${BASE_URL}/api/v1/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Companies API accessible via frontend');
      console.log('📊 Companies count:', companiesResponse.data.data?.length || 0);
    } catch (apiError) {
      console.log('❌ Companies API failed via frontend:', apiError.response?.status, apiError.response?.data?.message);
    }
    
    // 5. Conclusioni
    console.log('\n5. 📋 Conclusioni:');
    console.log('  - Login frontend:', '✅');
    console.log('  - Verify frontend:', '✅');
    console.log('  - User role:', user?.role);
    console.log('  - hasPermission(companies, read):', hasCompaniesRead ? '✅' : '❌');
    console.log('  - Company permissions count:', companyPermissions.length);
    
    if (user?.role === 'Admin' && !hasCompaniesRead) {
      console.log('\n🚨 PROBLEMA IDENTIFICATO:');
      console.log('  - Admin dovrebbe avere accesso automatico');
      console.log('  - hasPermission fallisce per Admin');
      console.log('  - Possibile problema nel frontend AuthContext');
    }
    
  } catch (error) {
    console.error('🚨 Errore:', error.message);
    if (error.response) {
      console.error('📋 Response status:', error.response.status);
      console.error('📋 Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCompaniesFrontend();