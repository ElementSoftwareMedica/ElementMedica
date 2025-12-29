const https = require('https');
const http = require('http');

// Configurazione per ignorare certificati SSL self-signed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const API_BASE_URL = 'http://localhost:4001';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      timeout: 15000,
      ...options
    };

    const req = http.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testDetailedFlow() {
  console.log('🔍 === ANALISI DETTAGLIATA FLUSSO PERMESSI ===\n');

  try {
    // Step 1: Test login
    console.log('📝 Step 1: Testing login...');
    const loginResponse = await makeRequest(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });

    console.log('🔍 Login Status:', loginResponse.status);
    if (loginResponse.status !== 200) {
      console.error('❌ Login failed:', loginResponse.data);
      return;
    }

    const { accessToken, user } = loginResponse.data.data;
    console.log('✅ Login successful!');
    console.log('👤 User ID:', user.id);
    console.log('👤 User roles:', user.roles);
    console.log('🔑 Token length:', accessToken.length);

    // Step 2: Test health endpoint
    console.log('\n📝 Step 2: Testing health endpoint...');
    const healthResponse = await makeRequest(`${API_BASE_URL}/health`);
    console.log('🔍 Health Status:', healthResponse.status);
    console.log('🔍 Health Data:', healthResponse.data);

    // Step 3: Test permissions endpoint with timeout
    console.log('\n📝 Step 3: Testing permissions endpoint...');
    console.log('🔍 URL:', `${API_BASE_URL}/api/v1/auth/permissions/${user.id}`);
    
    const startTime = Date.now();
    try {
      const permissionsResponse = await makeRequest(`${API_BASE_URL}/api/v1/auth/permissions/${user.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      const endTime = Date.now();
      console.log(`⏱️ Permissions request completed in ${endTime - startTime}ms`);
      console.log('🔍 Permissions Status:', permissionsResponse.status);
      console.log('🔍 Permissions Data:', JSON.stringify(permissionsResponse.data, null, 2));
      
      if (permissionsResponse.status === 200) {
        const { role, permissions } = permissionsResponse.data.data;
        console.log('✅ Permissions retrieved successfully!');
        console.log('👤 User Role:', role);
        console.log('🔐 Permissions Count:', Object.keys(permissions).length);
        console.log('🔐 Sample Permissions:', Object.keys(permissions).slice(0, 5));
      } else {
        console.error('❌ Permissions request failed:', permissionsResponse.data);
      }
    } catch (error) {
      const endTime = Date.now();
      console.error(`⏰ Permissions request timed out after ${endTime - startTime}ms`);
      console.error('❌ Error:', error.message);
    }

    // Step 4: Test a simple authenticated endpoint
    console.log('\n📝 Step 4: Testing simple authenticated endpoint...');
    try {
      const testResponse = await makeRequest(`${API_BASE_URL}/api/v1/auth/test-debug`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('🔍 Test endpoint Status:', testResponse.status);
      console.log('🔍 Test endpoint Data:', testResponse.data);
    } catch (error) {
      console.error('❌ Test endpoint error:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDetailedFlow();