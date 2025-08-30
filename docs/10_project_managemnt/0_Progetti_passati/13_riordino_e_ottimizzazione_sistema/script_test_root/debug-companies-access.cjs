const axios = require('axios');
const fs = require('fs');

// Configurazione
const BASE_URL = 'http://localhost:4001';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';

async function debugCompaniesAccess() {
  try {
    console.log('🔍 Debug accesso pagina Companies');
    console.log('=' .repeat(50));
    
    // 1. Login admin
    console.log('\n1. Login admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
        console.log('Response keys:', Object.keys(loginResponse.data));
        if (loginResponse.data.data) {
            console.log('Data keys:', Object.keys(loginResponse.data.data));
        }
        console.log('AccessToken at root:', !!loginResponse.data.accessToken);
        console.log('AccessToken in data:', !!loginResponse.data.data?.accessToken);
      
      const user = loginResponse.data.data?.user || loginResponse.data.user;
      // Extract token correctly from the response structure
      const token = loginResponse.data.accessToken || loginResponse.data.data?.accessToken;
      
      console.log('User ID:', user?.id || 'N/A');
      console.log('User Role:', user?.roles?.[0]?.name || 'No role');
      console.log('🔑 Token found:', !!token);
      console.log('🔑 Token value:', token ? 'Present' : 'Missing');
      
      const userId = user?.id;
      
      // 2. Verifica token
      console.log('\n2. Verifica token...');
      console.log('Token:', token?.substring(0, 50) + '...');
      
      const verifyResponse = await axios.get(`${BASE_URL}/api/v1/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (token) {
        console.log('✅ Token found and verification would succeed');
      } else {
        console.log('❌ No token found in login response');
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Esegui il debug
debugCompaniesAccess();