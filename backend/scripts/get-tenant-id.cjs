const axios = require('axios');

const API_BASE_URL = 'http://localhost:4001/api';

async function getTenantId() {
  try {
    console.log('🔍 Ricerca tenant ID dal database');
    console.log('============================================================');

    // Login per ottenere il token
    console.log('1. Login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('Risposta completa login:', JSON.stringify(loginResponse.data, null, 2));

    // Il tenantId dovrebbe essere nel token o nella risposta del login
    if (loginResponse.data.user && loginResponse.data.user.tenantId) {
      console.log(`\n✅ TenantId trovato: ${loginResponse.data.user.tenantId}`);
      return loginResponse.data.user.tenantId;
    } else {
      console.log('\n❌ TenantId non trovato nella risposta del login');
      console.log('Dati utente completi:', JSON.stringify(loginResponse.data.user, null, 2));
    }

  } catch (error) {
    console.error('❌ Errore:', error.response?.data || error.message);
  }
}

getTenantId();