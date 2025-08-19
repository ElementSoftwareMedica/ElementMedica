const http = require('http');

function testLogin(email, password) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      identifier: email,
      password: password
    });

    const options = {
      hostname: 'localhost',
      port: 4003,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve({ status: res.statusCode, data: data });
      });
    });

    req.on('error', (e) => {
      console.error(`Errore: ${e.message}`);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Test login laura.dipendente@example.com con password123...');
  await testLogin('laura.dipendente@example.com', 'password123');
  
  console.log('\n🔍 Test login laura.dipendente@example.com con Password123!...');
  await testLogin('laura.dipendente@example.com', 'Password123!');
}

runTests();