const axios = require('axios');

const API_BASE = 'http://localhost:4001/api/v1';

async function testDirectCompaniesAccess() {
  console.log('🧪 Testing direct companies page access after login...');
  
  try {
    // 1. Login
    console.log('\n1. Performing login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, token:', token.substring(0, 20) + '...');
    
    // 2. Verify token immediately
    console.log('\n2. Verifying token immediately after login...');
    const verifyResponse = await axios.get(`${API_BASE}/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Token verification successful');
    console.log('📋 User:', {
      id: verifyResponse.data.user.id,
      email: verifyResponse.data.user.email,
      roles: verifyResponse.data.user.roles
    });
    
    const permissions = verifyResponse.data.permissions;
    console.log('📋 Total permissions:', Object.keys(permissions).length);
    console.log('📋 Companies permissions:', 
      Object.keys(permissions).filter(p => p.includes('companies'))
    );
    
    // 3. Test companies API access
    console.log('\n3. Testing companies API access...');
    const companiesResponse = await axios.get(`${API_BASE}/companies`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Companies API access successful');
    console.log('📋 Companies data:', {
      status: companiesResponse.status,
      dataLength: companiesResponse.data?.data?.length || 0
    });
    
    // 4. Simulate frontend permission check
    console.log('\n4. Simulating frontend permission checks...');
    
    const user = {
      ...verifyResponse.data.user,
      role: verifyResponse.data.user.roles?.includes('SUPER_ADMIN') ? 'Admin' : 
            verifyResponse.data.user.roles?.includes('ADMIN') ? 'Admin' : 
            verifyResponse.data.user.roles?.includes('COMPANY_ADMIN') ? 'Administrator' : 'User'
    };
    
    console.log('👤 Mapped user:', { id: user.id, role: user.role, originalRoles: user.roles });
    
    // Simulate hasPermission function
    const hasPermission = (resource, action) => {
      console.log(`🔐 Checking permission: ${resource}:${action}`);
      
      // Check if user exists
      if (!user) {
        console.log('❌ No user');
        return false;
      }
      
      // Check if admin
      const isAdmin = user?.role === 'Admin' || user?.role === 'Administrator' ||
                     (user?.roles && Array.isArray(user.roles) && 
                      (user.roles.includes('Admin') || user.roles.includes('Administrator') ||
                       user.roles.includes('ADMIN') || user.roles.includes('SUPER_ADMIN')));
      
      if (isAdmin) {
        console.log('✅ User is admin - access granted');
        return true;
      }
      
      // Check specific permission
      const permissionKey = `${resource}:${action}`;
      const hasSpecificPermission = permissions[permissionKey] === true;
      
      console.log(`🔍 Specific permission ${permissionKey}:`, hasSpecificPermission);
      
      // For read actions, check if user has any permission for this resource
      if (!hasSpecificPermission && action === 'read') {
        const resourcePermissions = Object.keys(permissions)
          .filter(key => key.startsWith(resource + ':') && permissions[key] === true);
        
        if (resourcePermissions.length > 0) {
          console.log('✅ User has some permission for', resource, ':', resourcePermissions);
          return true;
        }
      }
      
      return hasSpecificPermission;
    };
    
    // Test permission checks
    const canReadCompanies = hasPermission('companies', 'read');
    console.log('\n🎯 Final permission check result:');
    console.log('   - Can read companies:', canReadCompanies);
    console.log('   - User role:', user.role);
    console.log('   - User roles array:', user.roles);
    console.log('   - Is authenticated:', !!user);
    
    if (canReadCompanies) {
      console.log('\n✅ SUCCESS: User should be able to access companies page');
    } else {
      console.log('\n❌ PROBLEM: User cannot access companies page despite having backend access');
      console.log('\n🔍 Debug info:');
      console.log('   - All permissions:', Object.keys(permissions).filter(p => permissions[p]));
      console.log('   - Companies-related permissions:', Object.keys(permissions).filter(p => p.includes('companies') && permissions[p]));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    process.exit(1);
  }
}

testDirectCompaniesAccess();