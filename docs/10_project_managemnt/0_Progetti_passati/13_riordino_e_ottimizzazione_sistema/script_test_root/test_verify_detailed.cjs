const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testVerifyDetailed() {
  console.log('🔍 Test dettagliato endpoint verify...');
  
  try {
    // Step 1: Login
    console.log('\n📧 Step 1: Login per ottenere token...');
    const loginResponse = await axios.post('http://localhost:4001/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    }, {
      timeout: 10000,
      withCredentials: true
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login riuscito!');
      const token = loginResponse.data.data.accessToken;
      console.log('🔑 Token ottenuto:', token.substring(0, 50) + '...');
      
      // Decode token to see payload
      try {
        const decoded = jwt.decode(token, { complete: true });
        console.log('📋 Token header:', JSON.stringify(decoded.header, null, 2));
        console.log('📋 Token payload:', JSON.stringify(decoded.payload, null, 2));
      } catch (decodeError) {
        console.log('❌ Errore decodifica token:', decodeError.message);
      }
      
      // Step 2: Test verify
      console.log('\n📧 Step 2: Test endpoint verify...');
      try {
        const verifyResponse = await axios.get('http://localhost:4001/api/v1/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log('✅ Verify riuscito!');
        console.log('📄 Risposta verify:', JSON.stringify(verifyResponse.data, null, 2));
        
      } catch (verifyError) {
        console.log('❌ Verify fallito!');
        if (verifyError.response) {
          console.log('📄 Status:', verifyError.response.status);
          console.log('📄 Risposta:', JSON.stringify(verifyError.response.data, null, 2));
          console.log('📄 Headers risposta:', JSON.stringify(verifyError.response.headers, null, 2));
        } else {
          console.log('📄 Errore:', verifyError.message);
        }
      }
      
    } else {
      console.log('❌ Login fallito:', loginResponse.data);
    }
    
  } catch (error) {
    console.log('❌ Errore generale:', error.message);
    if (error.response) {
      console.log('📄 Status:', error.response.status);
      console.log('📄 Risposta:', error.response.data);
    }
  }
  
  console.log('\n🎉 Test completato!');
}

testVerifyDetailed();