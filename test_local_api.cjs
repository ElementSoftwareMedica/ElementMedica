const http = require('http');

function apiCall(path, options = {}) {
  return new Promise((resolve, reject) => {
    const data = options.body ? JSON.stringify(options.body) : null;
    const reqOptions = {
      hostname: 'localhost',
      port: 4003,
      path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    if (data) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(reqOptions, (res) => {
      let buffer = '';
      res.on('data', (chunk) => buffer += chunk);
      res.on('end', () => {
        try {
          const body = buffer ? JSON.parse(buffer) : {};
          resolve({ status: res.statusCode, headers: res.headers, body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: buffer });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testLocalAPI() {
  try {
    console.log('🔍 Testing local API...');
    
    // 1. Test login
    const loginResponse = await apiCall('/api/v1/auth/login', {
      method: 'POST',
      body: {
        identifier: 'admin@example.com',
        password: 'Admin123!'
      }
    });
    
    console.log('LOGIN Status:', loginResponse.status);
    if (loginResponse.status !== 200) {
      console.log('LOGIN Error:', loginResponse.body);
      return;
    }
    
    const token = loginResponse.body.tokens?.access_token;
    console.log('✅ Login successful, token:', token ? 'present' : 'missing');
    console.log('Login response structure:', {
      success: loginResponse.body.success,
      hasUser: !!loginResponse.body.user,
      hasTokens: !!loginResponse.body.tokens,
      userId: loginResponse.body.user?.id
    });
    
    if (!token) {
      console.log('❌ No token received');
      return;
    }

    // 2. Test tenant endpoint
    const tenantResponse = await apiCall('/api/tenants/current', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('TENANT Status:', tenantResponse.status);
    console.log('TENANT Response:', tenantResponse.body);
    
    if (tenantResponse.status === 200) {
      console.log('✅ Tenant API working correctly');
    } else {
      console.log('❌ Tenant API failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLocalAPI();