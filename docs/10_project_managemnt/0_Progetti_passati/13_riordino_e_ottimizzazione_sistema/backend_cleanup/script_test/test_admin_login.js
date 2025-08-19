/**
 * Test script to verify admin login functionality
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:4001';

async function testAdminLogin() {
    try {
        console.log('🔐 Testing admin login...');
        
        const loginData = {
            identifier: 'admin@example.com',
            password: 'admin123',
            rememberMe: false
        };
        
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Login successful!');
            console.log('Full response:', JSON.stringify(result, null, 2));
            
            if (result.user) {
                console.log('User info:', {
                    id: result.user.id,
                    email: result.user.email,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName,
                    roles: result.user.roles,
                    permissions: result.user.permissions?.length || 0
                });
            }
            
            if (result.token || result.accessToken) {
                console.log('Token present:', !!(result.token || result.accessToken));
            }
        } else {
            const error = await response.json();
            console.log('❌ Login failed!');
            console.log('Error:', error);
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Run the test
testAdminLogin();