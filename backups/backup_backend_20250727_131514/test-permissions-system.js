import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4003';

async function testPermissionsSystem() {
  console.log('🧪 Testing Permissions System...\n');

  try {
    // 1. Login
    console.log('1. 🔐 Testing login...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    const token = loginData.data?.accessToken;
    if (!token) {
      throw new Error('No access token received');
    }
    console.log(`📝 Token received (length: ${token.length})\n`);

    // 2. Test GET permissions for ADMIN role
    console.log('2. 📋 Testing GET permissions for ADMIN role...');
    const getResponse = await fetch(`${API_BASE}/api/roles/ADMIN/permissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`GET Response Status: ${getResponse.status}`);
    
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.log(`❌ GET Error: ${errorText}`);
      throw new Error(`GET failed: ${getResponse.status}`);
    }

    const getPermissionsData = await getResponse.json();
    console.log('✅ GET permissions successful');
    console.log('📊 Permissions data structure:', JSON.stringify(getPermissionsData, null, 2));
    console.log('');

    // 3. Test GET permissions for USER role
    console.log('3. 📋 Testing GET permissions for USER role...');
    const getUserResponse = await fetch(`${API_BASE}/api/roles/USER/permissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (getUserResponse.ok) {
      const getUserPermissionsData = await getUserResponse.json();
      console.log('✅ GET USER permissions successful');
      console.log('📊 USER Permissions data:', JSON.stringify(getUserPermissionsData, null, 2));
    } else {
      console.log(`⚠️ GET USER permissions failed: ${getUserResponse.status}`);
    }
    console.log('');

    // 4. Test PUT permissions (modify ADMIN permissions)
    console.log('4. 💾 Testing PUT permissions for ADMIN role...');
    
    // Prepare test permissions data
    const testPermissions = [
      {
        permissionId: 'users_read',
        granted: true,
        scope: 'global'
      },
      {
        permissionId: 'users_create',
        granted: true,
        scope: 'tenant'
      },
      {
        permissionId: 'roles_manage',
        granted: true,
        scope: 'global'
      },
      {
        permissionId: 'documents_read',
        granted: false,
        scope: 'tenant'
      }
    ];

    const putResponse = await fetch(`${API_BASE}/api/roles/ADMIN/permissions`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        permissions: testPermissions
      })
    });

    console.log(`PUT Response Status: ${putResponse.status}`);
    
    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      console.log(`❌ PUT Error: ${errorText}`);
      console.log('PUT Response Headers:', Object.fromEntries(putResponse.headers.entries()));
    } else {
      const putData = await putResponse.json();
      console.log('✅ PUT permissions successful');
      console.log('📊 PUT response:', JSON.stringify(putData, null, 2));
    }
    console.log('');

    // 5. Verify permissions were saved (GET again)
    console.log('5. 🔍 Verifying permissions were saved...');
    const verifyResponse = await fetch(`${API_BASE}/api/roles/ADMIN/permissions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log('✅ Verification GET successful');
      console.log('📊 Saved permissions:', JSON.stringify(verifyData, null, 2));
      
      // Check if permissions match what we saved
      const savedPermissions = verifyData.data?.permissions || verifyData.permissions || [];
      console.log(`📈 Found ${savedPermissions.length} saved permissions`);
      
      // Compare with what we sent
      const grantedSent = testPermissions.filter(p => p.granted).length;
      const grantedSaved = savedPermissions.filter(p => p.granted).length;
      
      console.log(`📊 Comparison: Sent ${grantedSent} granted permissions, Found ${grantedSaved} granted permissions`);
      
      if (grantedSent === grantedSaved) {
        console.log('✅ Permissions correctly saved and retrieved!');
      } else {
        console.log('⚠️ Mismatch in saved permissions count');
      }
    } else {
      console.log(`❌ Verification failed: ${verifyResponse.status}`);
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPermissionsSystem();