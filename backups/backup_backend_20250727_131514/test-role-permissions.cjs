const axios = require('axios');

async function testRolePermissionsEndpoint() {
  try {
    console.log('🔍 Testing role permissions endpoint...');
    
    // Prima faccio login per ottenere il token
    const loginResponse = await axios.post('http://localhost:4003/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    if (!loginResponse.data.success) {
      console.error('❌ Login failed');
      return;
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, got token');
    
    // Ora testo l'endpoint dei permessi del ruolo con caratteri speciali
    const roleType = 'AMMINISTRATORE_FORMAZIONE_%26_LAVORO';
    console.log(`🔍 Testing permissions for role: ${roleType}`);
    
    const response = await axios.get(`http://localhost:4003/api/roles/${roleType}/permissions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Role permissions request successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Role permissions request failed!');
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request setup error:', error.message);
    }
    
    console.error('Full error:', error);
  }
}

testRolePermissionsEndpoint();