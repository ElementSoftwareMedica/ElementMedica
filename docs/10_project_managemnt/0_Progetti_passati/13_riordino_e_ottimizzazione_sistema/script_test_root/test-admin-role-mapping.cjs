const fetch = require('node-fetch');

async function testAdminRoleMapping() {
    try {
        console.log('🔐 Testing admin role mapping...');
        
        // 1. Login
        const loginResponse = await fetch('http://localhost:4001/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                identifier: 'admin@example.com',
                password: 'Admin123!'
            })
        });
        
        const loginData = await loginResponse.json();
        console.log('✅ Login successful');
        console.log('📋 Full login response:', JSON.stringify(loginData, null, 2));
        
        // Check if we have the expected structure
        if (!loginData.data || !loginData.data.accessToken) {
            throw new Error('No access token in response');
        }
        
        console.log('🔑 Access token received:', loginData.data.accessToken.substring(0, 20) + '...');
        console.log('👤 User from login:', loginData.data.user);
        console.log('🔑 User roles from login:', loginData.data.user.roles);
        
        // 2. Verify token
        const verifyResponse = await fetch('http://localhost:4001/api/v1/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${loginData.data.accessToken}`
            }
        });
        
        const verifyData = await verifyResponse.json();
        console.log('✅ Token verified');
        console.log('👤 User from verify:', verifyData.user);
        console.log('🔑 User roles from verify:', verifyData.user.roles);
        
        // 3. Test role mapping logic
        const user = verifyData.user;
        const mappedUser = {
            ...user,
            role: user.roles?.includes('SUPER_ADMIN') ? 'Admin' : 
                  user.roles?.includes('ADMIN') ? 'Admin' : 
                  user.roles?.includes('COMPANY_ADMIN') ? 'Administrator' : 'User'
        };
        
        console.log('🎯 Mapped user:', mappedUser);
        console.log('🎯 Final role:', mappedUser.role);
        
        // 4. Test admin check logic
        function testIsAdmin(testUser) {
            const isAdmin = testUser?.role === 'Admin' || testUser?.role === 'Administrator' ||
                           (testUser?.roles && Array.isArray(testUser.roles) && 
                            (testUser.roles.includes('Admin') || testUser.roles.includes('Administrator') ||
                             testUser.roles.includes('ADMIN') || testUser.roles.includes('SUPER_ADMIN')));
            
            console.log('🔍 Admin check details:', {
                'role === Admin': testUser?.role === 'Admin',
                'role === Administrator': testUser?.role === 'Administrator',
                'has roles array': testUser?.roles && Array.isArray(testUser.roles),
                'roles includes Admin': testUser?.roles?.includes('Admin'),
                'roles includes Administrator': testUser?.roles?.includes('Administrator'),
                'roles includes ADMIN': testUser?.roles?.includes('ADMIN'),
                'roles includes SUPER_ADMIN': testUser?.roles?.includes('SUPER_ADMIN'),
                'final result': isAdmin
            });
            
            return isAdmin;
        }
        
        const isAdminResult = testIsAdmin(mappedUser);
        console.log('🎯 Is admin result:', isAdminResult);
        
        // 5. Test specific companies permissions
        const companiesPermissions = Object.keys(verifyData.permissions)
            .filter(key => key.includes('companies') && verifyData.permissions[key] === true);
        
        console.log('🏢 Companies permissions:', companiesPermissions);
        
        // 6. Summary
        console.log('\n📋 SUMMARY:');
        console.log('- Backend roles:', user.roles);
        console.log('- Mapped role:', mappedUser.role);
        console.log('- Is admin:', isAdminResult);
        console.log('- Companies permissions count:', companiesPermissions.length);
        console.log('- Should have access:', isAdminResult || companiesPermissions.length > 0);
        
        if (!isAdminResult && companiesPermissions.length === 0) {
            console.log('\n❌ PROBLEM IDENTIFIED: User is not recognized as admin and has no companies permissions!');
        } else {
            console.log('\n✅ User should have access to companies page');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testAdminRoleMapping();