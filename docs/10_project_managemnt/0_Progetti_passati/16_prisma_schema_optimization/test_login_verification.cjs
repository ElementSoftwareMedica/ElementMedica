const http = require('http');

// Test login con le credenziali standard
const testLogin = () => {
  const postData = JSON.stringify({
    identifier: 'admin@example.com',
    password: 'Admin123!'
  });

  const options = {
    hostname: 'localhost',
    port: 4001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response Body:', data);
      
      try {
        const response = JSON.parse(data);
        if (response.success && response.data && response.data.accessToken) {
          console.log('✅ Login successful - Token received');
          console.log(`User: ${response.data.user.email} (${response.data.user.role})`);
          console.log(`Tenant: ${response.data.user.tenant.name}`);
          testAuthenticatedEndpoint(response.data.accessToken);
        } else {
          console.log('❌ Login failed - No token in response');
          console.log('Response structure:', JSON.stringify(response, null, 2));
        }
      } catch (e) {
        console.log('❌ Login failed - Invalid JSON response');
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
  });

  req.write(postData);
  req.end();
};

// Test endpoint autenticato
const testAuthenticatedEndpoint = (token) => {
  const options = {
    hostname: 'localhost',
    port: 4001,
    path: '/api/persons',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': '1'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`\n--- Testing authenticated endpoint ---`);
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Authenticated endpoint working');
        try {
          const response = JSON.parse(data);
          console.log(`Found ${response.data ? response.data.length : 'unknown'} persons`);
        } catch (e) {
          console.log('Response received but not JSON');
        }
      } else {
        console.log('❌ Authenticated endpoint failed');
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Authenticated request error: ${e.message}`);
  });

  req.end();
};

// Test health endpoint
const testHealth = () => {
  const options = {
    hostname: 'localhost',
    port: 4001,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`--- Health Check ---`);
    console.log(`Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Health Response:', data);
      console.log('\n--- Starting Login Test ---');
      testLogin();
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Health check error: ${e.message}`);
  });

  req.end();
};

console.log('🔍 Testing system functionality...');
testHealth();