const axios = require('axios');

// Frontend URL con proxy Vite
const FRONTEND_URL = 'http://localhost:5173';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

async function testAuthMapping() {
  try {
    console.log('🔍 Test mapping autenticazione Frontend vs Backend');
    console.log('=' .repeat(70));
    
    // 1. Login e analisi risposta
    console.log('\n1️⃣ Login e analisi struttura risposta...');
    const loginResponse = await axios.post(`${FRONTEND_URL}/api/v1/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    console.log('✅ Login successful');
    console.log('📋 Login Response Structure:');
    console.log('   - success:', loginResponse.data.success);
    console.log('   - message:', loginResponse.data.message);
    console.log('   - data.user.id:', loginResponse.data.data?.user?.id);
    console.log('   - data.user.email:', loginResponse.data.data?.user?.email);
    console.log('   - data.user.role:', loginResponse.data.data?.user?.role);
    console.log('   - data.user.roles:', loginResponse.data.data?.user?.roles);
    console.log('   - data.user.firstName:', loginResponse.data.data?.user?.firstName);
    console.log('   - data.user.lastName:', loginResponse.data.data?.user?.lastName);
    console.log('   - data.accessToken exists:', !!loginResponse.data.data?.accessToken);
    console.log('   - permissions in login:', !!loginResponse.data.permissions);
    
    const token = loginResponse.data.data.accessToken;
    
    // 2. Test verify endpoint
    console.log('\n2️⃣ Test verify endpoint...');
    const verifyResponse = await axios.get(`${FRONTEND_URL}/api/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Verify successful');
    console.log('📋 Verify Response Structure:');
    console.log('   - success:', verifyResponse.data.success);
    console.log('   - data.user.id:', verifyResponse.data.data?.user?.id);
    console.log('   - data.user.email:', verifyResponse.data.data?.user?.email);
    console.log('   - data.user.role:', verifyResponse.data.data?.user?.role);
    console.log('   - data.user.roles:', verifyResponse.data.data?.user?.roles);
    console.log('   - data.user.firstName:', verifyResponse.data.data?.user?.firstName);
    console.log('   - data.user.lastName:', verifyResponse.data.data?.user?.lastName);
    console.log('   - data.permissions exists:', !!verifyResponse.data.data?.permissions);
    console.log('   - permissions count:', Object.keys(verifyResponse.data.data?.permissions || {}).length);
    
    // 3. Analisi permessi
    if (verifyResponse.data.data?.permissions) {
      console.log('\n3️⃣ Analisi permessi ricevuti...');
      const permissions = verifyResponse.data.data.permissions;
      const permissionKeys = Object.keys(permissions);
      
      console.log('📊 Permessi totali:', permissionKeys.length);
      console.log('🔍 Permessi companies:');
      const companiesPermissions = permissionKeys.filter(key => key.includes('companies'));
      companiesPermissions.forEach(perm => {
        console.log(`   - ${perm}: ${permissions[perm]}`);
      });
      
      console.log('🔍 Permessi admin/all:');
      const adminPermissions = permissionKeys.filter(key => key.includes('all') || key.includes('admin'));
      adminPermissions.forEach(perm => {
        console.log(`   - ${perm}: ${permissions[perm]}`);
      });
    }
    
    // 4. Simulazione hasPermission
    console.log('\n4️⃣ Simulazione hasPermission logic...');
    const user = verifyResponse.data.data?.user;
    const permissions = verifyResponse.data.data?.permissions || {};
    
    function simulateHasPermission(resource, action) {
      console.log(`\n🔍 Checking permission: ${resource}:${action}`);
      console.log('   User role:', user?.role);
      console.log('   User roles:', user?.roles);
      
      // Check if user has role property (single)
      if (user?.role === 'Admin' || user?.role === 'Administrator') {
        console.log('   ✅ Access granted: user.role is Admin/Administrator');
        return true;
      }
      
      // Check if user has roles array containing admin
      if (user?.roles && Array.isArray(user.roles)) {
        if (user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')) {
          console.log('   ✅ Access granted: user.roles contains ADMIN/SUPER_ADMIN');
          return true;
        }
      }
      
      // Check specific permissions
      const permissionKey = `${resource}:${action}`;
      if (permissions[permissionKey] === true) {
        console.log(`   ✅ Access granted: has ${permissionKey} permission`);
        return true;
      }
      
      console.log('   ❌ Access denied: no matching permission found');
      return false;
    }
    
    // Test companies:read permission
    simulateHasPermission('companies', 'read');
    
    console.log('\n🎯 PROBLEMA IDENTIFICATO:');
    if (user?.roles && !user?.role) {
      console.log('   ❌ Backend restituisce user.roles (array) ma frontend cerca user.role (string)');
    }
    if (!verifyResponse.data.data?.permissions) {
      console.log('   ❌ Verify endpoint non restituisce permissions');
    }
    
  } catch (error) {
    console.error('❌ Error during auth mapping test:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

testAuthMapping();