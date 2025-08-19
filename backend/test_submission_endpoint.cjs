const axios = require('axios');

async function testSubmissionEndpoint() {
  try {
    // 1. Login per ottenere il token
    console.log('1. Login...');
    const loginResponse = await axios.post('http://localhost:4003/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.tokens.access_token;
    
    if (!token) {
      console.error('❌ Token non presente nella risposta');
      console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
      return;
    }
    
    console.log('✅ Login successful, token ottenuto');
    console.log('Token length:', token.length);
    console.log('Token starts with:', token.substring(0, 20) + '...');
    
    // 2. Test endpoint submission specifica
    console.log('\n2. Test endpoint submission specifica...');
    const submissionResponse = await axios.get(
      'http://localhost:4003/api/v1/submissions/advanced/3f005622-e9b1-437a-a6d5-e77a7680aed2',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Submission endpoint successful');
    console.log('Status:', submissionResponse.status);
    console.log('Data:', JSON.stringify(submissionResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Errore:', error.response?.status, error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSubmissionEndpoint();