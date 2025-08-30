const http = require('http');

function testLogin() {
  console.log('🔍 Testing login with admin@example.com...');
  
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
    console.log('📊 Response Status:', res.statusCode);
    console.log('📊 Response Headers:', res.headers);
    
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📊 Response Body:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ Login successful!');
        try {
          const jsonData = JSON.parse(data);
          console.log('🔑 Token received:', jsonData.token ? 'YES' : 'NO');
          console.log('👤 User data:', jsonData.user ? 'YES' : 'NO');
          if (jsonData.user) {
            console.log('👤 User ID:', jsonData.user.id);
            console.log('👤 User Email:', jsonData.user.email);
            console.log('👤 User Role:', jsonData.user.globalRole);
          }
        } catch (e) {
          console.log('⚠️ Response is not JSON:', e.message);
        }
      } else {
        console.log('❌ Login failed!');
        console.log('❌ Error details:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('💥 Error during login test:', error.message);
  });
  
  req.write(postData);
  req.end();
}

testLogin();