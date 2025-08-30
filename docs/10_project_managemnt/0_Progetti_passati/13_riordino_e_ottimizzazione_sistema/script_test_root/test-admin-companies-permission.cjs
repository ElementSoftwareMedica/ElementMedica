const axios = require('axios');

// Configurazione
const BASE_URL = 'http://localhost:4001';
const ADMIN_CREDENTIALS = {
  identifier: 'admin@example.com',
  password: 'Admin123!'
};

async function testAdminCompaniesPermission() {
  try {
    console.log('🔍 Test permessi admin per companies...');
    
    // 1. Login admin
    console.log('\n1. Login admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, ADMIN_CREDENTIALS);
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    console.log('✅ Login successful');
    console.log('Login response structure:', JSON.stringify(loginResponse.data, null, 2));
    
    // Prova diverse posizioni per il token
    const token = loginResponse.data.token || 
                  loginResponse.data.data?.token || 
                  loginResponse.data.accessToken || 
                  loginResponse.data.data?.accessToken;
    
    console.log('Token found:', !!token);
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    if (!token) {
      console.log('❌ No token found in login response');
      return;
    }
    
    // 2. Verifica token e permessi
    console.log('\n2. Verifica permessi via /verify...');
    const verifyResponse = await axios.get(`${BASE_URL}/api/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (verifyResponse.status !== 200) {
      throw new Error(`Verify failed: ${verifyResponse.status}`);
    }
    
    const userData = verifyResponse.data;
    console.log('✅ Verify successful');
    console.log('Verify response structure:', JSON.stringify(userData, null, 2));
    console.log('User ID:', userData.user?.id);
    console.log('User email:', userData.user?.email);
    console.log('User roles:', userData.user?.roles);
    console.log('Permissions type:', typeof userData.permissions);
    console.log('Permissions value:', userData.permissions);
    console.log('Total permissions:', Array.isArray(userData.permissions) ? userData.permissions.length : 'Not an array');
    
    // 3. Analizza permessi companies specifici
    console.log('\n3. Analisi permessi companies...');
    const permissions = userData.permissions || {};
    
    // Trova tutti i permessi companies
    const companiesPermissions = Object.keys(permissions).filter(p => 
      p.includes('companies') || p.includes('COMPANIES')
    );
    
    console.log('Companies permissions found:', companiesPermissions);
    
    // Verifica permessi specifici
    const requiredPermissions = [
      'companies:read',
      'companies:create', 
      'companies:edit',
      'companies:delete',
      'companies:manage'
    ];
    
    console.log('\n4. Verifica permessi richiesti...');
    requiredPermissions.forEach(permission => {
      const hasPermission = permissions[permission] === true;
      console.log(`${hasPermission ? '✅' : '❌'} ${permission}: ${hasPermission}`);
    });
    
    // 5. Test accesso API companies
    console.log('\n5. Test accesso API companies...');
    try {
      const companiesResponse = await axios.get(`${BASE_URL}/api/v1/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Companies API accessible');
      console.log('Companies count:', companiesResponse.data?.length || 0);
    } catch (apiError) {
      console.log('❌ Companies API error:', apiError.response?.status, apiError.response?.data?.message);
    }
    
    // 6. Verifica permessi nel formato database
    console.log('\n6. Verifica permessi database format...');
    const dbPermissions = Object.keys(permissions).filter(p => 
      p.includes('VIEW_COMPANIES') || 
      p.includes('CREATE_COMPANIES') ||
      p.includes('EDIT_COMPANIES') ||
      p.includes('DELETE_COMPANIES')
    );
    
    console.log('Database format permissions:', dbPermissions);
    
    // 7. Verifica ruolo admin
    console.log('\n7. Verifica ruolo admin...');
    const isAdmin = userData.user?.roles?.includes('ADMIN') || userData.user?.roles?.includes('Admin');
    const isSuperAdmin = userData.user?.roles?.includes('SUPER_ADMIN') || userData.user?.roles?.includes('Super Admin');
    
    console.log('Is Admin:', isAdmin);
    console.log('Is Super Admin:', isSuperAdmin);
    
    // 8. Test frontend verify endpoint
    console.log('\n8. Test frontend verify endpoint...');
    try {
      const frontendVerifyResponse = await axios.get(`${BASE_URL}/api/v1/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Frontend verify accessible');
      const frontendPermissions = frontendVerifyResponse.data.permissions || {};
      console.log('Frontend permissions count:', Object.keys(frontendPermissions).length);
      
      // Verifica se companies:read è presente
      const hasCompaniesRead = frontendPermissions['companies:read'] === true;
      console.log('Has companies:read permission:', hasCompaniesRead);
      
    } catch (frontendError) {
      console.log('❌ Frontend verify error:', frontendError.response?.status, frontendError.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Esegui il test
testAdminCompaniesPermission();