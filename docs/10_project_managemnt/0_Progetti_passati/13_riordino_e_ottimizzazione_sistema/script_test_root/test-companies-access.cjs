const axios = require('axios');

// Configurazione
const BASE_URL = 'http://localhost:4001';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';

async function testCompaniesAccess() {
  try {
    console.log('🔍 Test accesso Companies');
    console.log('=' .repeat(40));
    
    // 1. Login admin
    console.log('\n1. Login admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      
      const user = loginResponse.data.data?.user;
      const token = loginResponse.data.data?.accessToken;
      
      console.log('User ID:', user?.id);
      console.log('User Email:', user?.email);
      console.log('User Roles:', user?.roles || []);
      console.log('Token present:', !!token);
      
      if (!token) {
        console.log('❌ No token found');
        return;
      }
      
      // 2. Test accesso API companies
      console.log('\n2. Test API /companies...');
      try {
        const companiesResponse = await axios.get(`${BASE_URL}/companies`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('✅ API /companies accessible');
        console.log('Response status:', companiesResponse.status);
        console.log('Companies found:', companiesResponse.data?.length || 0);
        
        if (companiesResponse.data?.length > 0) {
          console.log('First company:', companiesResponse.data[0].ragione_sociale || companiesResponse.data[0].name);
        }
        
      } catch (apiError) {
        console.log('❌ API /companies error:');
        console.log('Status:', apiError.response?.status);
        console.log('Message:', apiError.response?.data?.message || apiError.message);
        console.log('Error details:', apiError.response?.data);
      }
      
      // 3. Verifica token e permessi
      console.log('\n3. Verifica permessi...');
      console.log('Token before verification:', token ? 'present' : 'undefined');
      console.log('Token length:', token ? token.length : 'N/A');
      
      try {
        const verifyResponse = await axios.get(`${BASE_URL}/api/v1/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Token verified successfully');
        console.log('User roles:', JSON.stringify(verifyResponse.data?.user?.roles || []));
        
        // Controlla permessi mappati per companies
        const permissions = verifyResponse.data?.permissions || {};
        const companyPermissions = Object.keys(permissions).filter(p => 
          p.includes('companies')
        );
        console.log('Company-related permissions:', companyPermissions.length);
        
        if (companyPermissions.length > 0) {
          console.log('Company permissions:', companyPermissions);
          console.log('Permission values:', companyPermissions.map(p => `${p}: ${permissions[p]}`));
        } else {
          console.log('❌ No company permissions found');
          console.log('All permissions:', Object.keys(permissions));
        }
        
      } catch (verifyError) {
        console.log('❌ Token verification failed');
        console.log('Token value:', token);
        console.log('Verify error status:', verifyError.response?.status);
        console.log('Verify error message:', verifyError.response?.data?.message || verifyError.message);
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Esegui il test
testCompaniesAccess();