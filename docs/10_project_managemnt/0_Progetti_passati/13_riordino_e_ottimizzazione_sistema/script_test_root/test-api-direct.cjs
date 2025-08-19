const axios = require('axios');

async function testApiDirect() {
    try {
        console.log('🔐 Testing API server directly on port 4001...');
        const loginRes = await axios.post('http://localhost:4001/api/v1/auth/login', {
            identifier: 'admin@example.com',
            password: 'Admin123!'
        });
        
        console.log('✅ Direct API login successful');
        console.log('Response status:', loginRes.status);
        console.log('Response data:', JSON.stringify(loginRes.data, null, 2));
        
        const token = loginRes.data.token || loginRes.data.accessToken;
        
        if (token) {
            console.log('\n🔍 Testing verify endpoint directly...');
            const verifyRes = await axios.get('http://localhost:4001/api/v1/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Direct API verify successful');
            console.log('Verify response:', JSON.stringify(verifyRes.data, null, 2));
        }
        
    } catch (error) {
        console.error('❌ Error occurred:');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error message:', error.message);
        }
    }
}

testApiDirect();