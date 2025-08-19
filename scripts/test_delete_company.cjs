const http = require('http');

// Configurazione base
const BASE_URL = 'localhost';
const PORT = 4001; // Utilizziamo direttamente l'API server per aggirare il problema del proxy
const LOGIN_CREDENTIALS = {
  identifier: 'admin@example.com',
  password: 'Admin123!'
};

// Funzione per fare richieste HTTP
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Making request to: ${options.method} ${options.hostname}:${options.port}${options.path}`);
    if (data) {
      console.log(`📤 Request data:`, JSON.stringify(data, null, 2));
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log(`📥 Response status: ${res.statusCode}`);
        console.log(`📥 Response headers:`, res.headers);
        console.log(`📥 Response body:`, body);
        
        try {
          const parsedBody = body ? JSON.parse(body) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ Request error:`, err);
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDeleteCompany() {
  try {
    console.log('🔐 Step 1: Login...');
    
    // Login con endpoint corretto
    const loginOptions = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const loginResponse = await makeRequest(loginOptions, LOGIN_CREDENTIALS);

    console.log('Login response status:', loginResponse.statusCode);
    console.log('Login response data:', loginResponse.body);

    if (loginResponse.statusCode !== 200) {
      console.error('❌ Login failed:', loginResponse.statusCode, loginResponse.body);
      return;
    }

    const token = loginResponse.body?.tokens?.access_token;
    if (!token) {
      console.error('❌ No token received');
      console.error('Response structure:', JSON.stringify(loginResponse.body, null, 2));
      return;
    }

    console.log('✅ Login successful, token received');

    // Verifica dettagli utente
    console.log('\n🔍 Step 2: Verifying user details...');
    const userOptions = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/v1/auth/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const userResponse = await makeRequest(userOptions);
    console.log('User details status:', userResponse.statusCode);
    console.log('User details:', userResponse.body);

    // Recupera lista aziende
    console.log('\n📋 Step 3: Getting companies list...');
    const companiesOptions = {
      hostname: BASE_URL,
      port: PORT,
      path: '/api/v1/companies',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const companiesResponse = await makeRequest(companiesOptions);
    console.log('Companies response status:', companiesResponse.statusCode);
    console.log('Companies count:', companiesResponse.body?.length || 0);

    if (companiesResponse.statusCode !== 200) {
      console.error('❌ Failed to get companies:', companiesResponse.statusCode, companiesResponse.body);
      return;
    }

    const companies = companiesResponse.body;
    if (!companies || companies.length === 0) {
      console.log('ℹ️ No companies found to delete');
      return;
    }

    const firstCompany = companies[0];
    console.log('First company:', { id: firstCompany.id, name: firstCompany.name });

    // Tenta di cancellare la prima azienda
    console.log(`\n🗑️ Step 4: Attempting to delete company ${firstCompany.id}...`);
    const deleteOptions = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api/v1/companies/${firstCompany.id}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const deleteResponse = await makeRequest(deleteOptions);
    console.log('Delete response status:', deleteResponse.statusCode);
    console.log('Delete response data:', deleteResponse.body);

    // Analizza il risultato
    switch (deleteResponse.statusCode) {
      case 200:
        console.log('✅ Company deleted successfully');
        break;
      case 400:
        console.log('⚠️ Bad request - possibly validation error');
        break;
      case 403:
        console.log('🚫 Forbidden - user does not have permission to delete this company');
        break;
      case 404:
        console.log('❌ Not Found - company does not exist or endpoint not found');
        break;
      default:
        console.log(`❓ Unexpected status: ${deleteResponse.statusCode}`);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
  }
}

testDeleteCompany();