const axios = require('axios');

// Configurazione
const BACKEND_URL = 'http://localhost:4001';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

async function debugAdminCompaniesAccess() {
  console.log('🔍 DEBUG: Accesso Admin alle Companies');
  console.log('=' .repeat(50));
  
  try {
    // 1. Test Login Admin
    console.log('\n1️⃣ Test Login Admin...');
    const loginResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    console.log('✅ Login successful');
    console.log('📋 Response structure:', {
      hasData: !!loginResponse.data.data,
      hasAccessToken: !!loginResponse.data.data?.accessToken,
      hasUser: !!loginResponse.data.data?.user,
      userRole: loginResponse.data.data?.user?.role
    });
    
    const accessToken = loginResponse.data.data.accessToken;
    const user = loginResponse.data.data.user;
    
    if (!accessToken) {
      throw new Error('❌ No access token received');
    }
    
    console.log('🔑 Token received (first 20 chars):', accessToken.substring(0, 20) + '...');
    console.log('👤 User info:', {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });
    
    // 2. Test Token Verification
    console.log('\n2️⃣ Test Token Verification...');
    const verifyResponse = await axios.get(`${BACKEND_URL}/api/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Token verification successful');
    console.log('📋 Verify response structure:', {
      hasUser: !!verifyResponse.data.user,
      hasPermissions: !!verifyResponse.data.permissions,
      permissionsCount: Object.keys(verifyResponse.data.permissions || {}).length
    });
    
    const permissions = verifyResponse.data.permissions;
    console.log('🔐 User permissions:');
    Object.entries(permissions).forEach(([key, value]) => {
      if (key.includes('companies') || key.includes('COMPANIES')) {
        console.log(`  - ${key}: ${value}`);
      }
    });
    
    // 3. Test hasPermission Logic
    console.log('\n3️⃣ Test hasPermission Logic...');
    const userRole = verifyResponse.data.user.role;
    
    function testHasPermission(resource, action) {
      console.log(`\n🔍 Testing permission: ${resource}:${action}`);
      
      // Admin o Administrator hanno sempre tutti i permessi
      if (userRole === 'Admin' || userRole === 'Administrator') {
        console.log('✅ Access granted: user is Admin/Administrator');
        return true;
      }
      
      // Verifica permesso all:* (permesso universale)
      if (permissions['all:' + action] === true) {
        console.log('✅ Access granted: user has all:' + action + ' permission');
        return true;
      }
      
      // Verifica permesso resource:all (permesso per tutte le azioni sulla risorsa)
      if (permissions[resource + ':all'] === true) {
        console.log('✅ Access granted: user has ' + resource + ':all permission');
        return true;
      }
      
      // Verifica dei permessi specifici
      const permissionKey = `${resource}:${action}`;
      const hasSpecificPermission = permissions[permissionKey] === true;
      
      // Concedi accesso se c'è almeno un permesso con quel resource
      if (!hasSpecificPermission && action === 'read') {
        // For 'read' actions, check if the user has any permission for this resource
        const hasAnyPermissionForResource = Object.keys(permissions)
          .some(key => key.startsWith(resource + ':') && permissions[key] === true);
        
        if (hasAnyPermissionForResource) {
          console.log('✅ Access granted: user has some permission for ' + resource);
          return true;
        }
      }
      
      console.log('❌ Permission denied:', hasSpecificPermission);
      return hasSpecificPermission;
    }
    
    // Test vari permessi companies
    const permissionTests = [
      ['companies', 'read'],
      ['companies', 'create'],
      ['companies', 'edit'],
      ['companies', 'delete']
    ];
    
    permissionTests.forEach(([resource, action]) => {
      testHasPermission(resource, action);
    });
    
    // 4. Test API Companies Access
    console.log('\n4️⃣ Test API Companies Access...');
    try {
      const companiesResponse = await axios.get(`${BACKEND_URL}/api/v1/companies`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      console.log('✅ Companies API access successful');
      console.log('📊 Companies data:', {
        count: companiesResponse.data?.length || 0,
        hasData: !!companiesResponse.data
      });
      
      if (companiesResponse.data && companiesResponse.data.length > 0) {
        console.log('📋 First company sample:', {
          id: companiesResponse.data[0].id,
          ragione_sociale: companiesResponse.data[0].ragione_sociale
        });
      }
      
    } catch (apiError) {
      console.error('❌ Companies API access failed:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data
      });
    }
    
    // 5. Test Frontend Permission Check Simulation
    console.log('\n5️⃣ Frontend Permission Check Simulation...');
    
    // Simula il controllo che fa il template GDPR
    const resourceName = 'companies'; // config.entity.name.toLowerCase()
    const hasReadPermission = testHasPermission(resourceName, 'read');
    
    console.log(`\n🎯 RISULTATO FINALE:`);
    console.log(`   Resource: ${resourceName}`);
    console.log(`   Action: read`);
    console.log(`   User Role: ${userRole}`);
    console.log(`   Has Permission: ${hasReadPermission}`);
    
    if (hasReadPermission) {
      console.log('✅ L\'admin DOVREBBE avere accesso alla pagina companies');
    } else {
      console.log('❌ L\'admin NON ha accesso alla pagina companies');
      console.log('🔍 Possibili cause:');
      console.log('   - Problema nel controllo dei permessi');
      console.log('   - Token non valido o scaduto');
      console.log('   - Configurazione permessi errata');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

// Esegui il debug
debugAdminCompaniesAccess();