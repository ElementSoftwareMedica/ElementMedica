const axios = require('axios');

async function testVerifyEndpoint() {
    try {
        console.log('🔐 Testing login...');
        const loginRes = await axios.post('http://localhost:4003/api/v1/auth/login', {
            identifier: 'admin@example.com',
            password: 'Admin123!'
        });
        
        console.log('✅ Login successful');
        console.log('Login response:', JSON.stringify(loginRes.data, null, 2));
        
        const token = loginRes.data.token || loginRes.data.accessToken;
        
        if (!token) {
            throw new Error('No token found in login response');
        }
        
        console.log('Token preview:', token.substring(0, 50) + '...');
        
        console.log('\n🔍 Testing verify endpoint...');
        const verifyRes = await axios.get('http://localhost:4003/api/v1/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Verify successful');
        console.log('User data:', JSON.stringify(verifyRes.data, null, 2));
        
    } catch (error) {
        console.error('❌ Error occurred:');
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error message:', error.message);
        }
        
        console.error('Full error:', error);
    }
}

testVerifyEndpoint();