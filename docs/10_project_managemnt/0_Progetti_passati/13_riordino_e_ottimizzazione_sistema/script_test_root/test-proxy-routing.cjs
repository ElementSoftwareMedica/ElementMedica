const axios = require('axios');

async function testProxyRouting() {
    try {
        console.log('🔍 Testing proxy server routing...');
        
        // Test health endpoint first
        console.log('\n🏥 Testing health endpoint...');
        try {
            const healthRes = await axios.get('http://localhost:4003/health');
            console.log('✅ Health endpoint accessible:', healthRes.status);
        } catch (error) {
            console.log('❌ Health endpoint failed:', error.response?.status || error.message);
        }
        
        // Test auth login endpoint
        console.log('\n🔐 Testing auth login endpoint...');
        try {
            const loginRes = await axios.post('http://localhost:4003/api/v1/auth/login', {
                identifier: 'admin@example.com',
                password: 'Admin123!'
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✅ Login successful via proxy');
            console.log('Status:', loginRes.status);
            console.log('Has accessToken:', !!loginRes.data.accessToken);
            
            const token = loginRes.data.accessToken;
            
            if (token) {
                // Test verify endpoint
                console.log('\n🔍 Testing verify endpoint...');
                try {
                    const verifyRes = await axios.get('http://localhost:4003/api/v1/auth/verify', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    console.log('✅ Verify successful via proxy');
                    console.log('User role:', verifyRes.data.user?.role);
                    console.log('Has permissions:', !!verifyRes.data.permissions);
                    console.log('Companies permission:', verifyRes.data.permissions?.['companies:read']);
                    
                } catch (verifyError) {
                    console.log('❌ Verify failed:', verifyError.response?.status || verifyError.message);
                    if (verifyError.response?.data) {
                        console.log('Verify error data:', JSON.stringify(verifyError.response.data, null, 2));
                    }
                }
                
                // Test companies endpoint
                console.log('\n🏢 Testing companies endpoint...');
                try {
                    const companiesRes = await axios.get('http://localhost:4003/api/companies', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    console.log('✅ Companies endpoint accessible via proxy');
                    console.log('Status:', companiesRes.status);
                    console.log('Companies count:', Array.isArray(companiesRes.data) ? companiesRes.data.length : 'Not an array');
                    
                } catch (companiesError) {
                    console.log('❌ Companies endpoint failed:', companiesError.response?.status || companiesError.message);
                    if (companiesError.response?.data) {
                        console.log('Companies error data:', JSON.stringify(companiesError.response.data, null, 2));
                    }
                }
            }
            
        } catch (loginError) {
            console.log('❌ Login failed:', loginError.response?.status || loginError.message);
            if (loginError.response?.data) {
                console.log('Login error data:', JSON.stringify(loginError.response.data, null, 2));
            }
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

testProxyRouting();