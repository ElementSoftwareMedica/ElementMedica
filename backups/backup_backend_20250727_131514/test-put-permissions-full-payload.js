import axios from 'axios';

const BASE_URL = 'http://localhost:4003';

async function testPutPermissionsFullPayload() {
  try {
    console.log('🧪 Testing PUT permissions with full payload (granted + not granted)...');
    
    // 1. Login per ottenere il token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    // 2. Test con payload completo (alcuni granted, altri no)
    const fullPayload = {
      permissions: [
        {
          permissionId: 'VIEW_COMPANIES',
          granted: true,
          scope: 'global'
        },
        {
          permissionId: 'CREATE_COMPANIES', 
          granted: false,
          scope: 'global'
        },
        {
          permissionId: 'EDIT_COMPANIES',
          granted: true,
          scope: 'tenant',
          tenantIds: ['tenant1']
        },
        {
          permissionId: 'DELETE_COMPANIES',
          granted: false,
          scope: 'global'
        },
        {
          permissionId: 'VIEW_PERSONS',
          granted: true,
          scope: 'global'
        }
      ]
    };
    
    console.log('📤 Sending PUT request with full payload...');
    console.log('Payload:', JSON.stringify(fullPayload, null, 2));
    
    const putResponse = await axios.put(
      `${BASE_URL}/api/roles/ADMIN/permissions`,
      fullPayload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ PUT request successful!');
    console.log('Response status:', putResponse.status);
    console.log('Response data:', JSON.stringify(putResponse.data, null, 2));
    
    // 3. Verifica che i permessi siano stati salvati correttamente
    console.log('🔍 Verifying saved permissions...');
    const getResponse = await axios.get(
      `${BASE_URL}/api/roles/ADMIN/permissions`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('📥 Current permissions after update:');
    console.log(JSON.stringify(getResponse.data, null, 2));
    
    // Verifica che solo i permessi granted siano presenti
    const savedPermissions = getResponse.data.permissions || [];
    const expectedGrantedPermissions = ['VIEW_COMPANIES', 'EDIT_COMPANIES', 'VIEW_PERSONS'];
    const actualGrantedPermissions = savedPermissions.map(p => p.permissionId || p.permission);
    
    console.log('🎯 Expected granted permissions:', expectedGrantedPermissions);
    console.log('🎯 Actual granted permissions:', actualGrantedPermissions);
    
    const allExpectedPresent = expectedGrantedPermissions.every(perm => 
      actualGrantedPermissions.includes(perm)
    );
    
    const noUnexpectedPermissions = !actualGrantedPermissions.includes('CREATE_COMPANIES') && 
                                   !actualGrantedPermissions.includes('DELETE_COMPANIES');
    
    if (allExpectedPresent && noUnexpectedPermissions) {
      console.log('✅ Test PASSED: Permissions saved correctly!');
      console.log('✅ Only granted permissions are present');
      console.log('✅ Non-granted permissions are correctly excluded');
    } else {
      console.log('❌ Test FAILED: Permission mismatch');
      if (!allExpectedPresent) {
        console.log('❌ Missing expected permissions');
      }
      if (!noUnexpectedPermissions) {
        console.log('❌ Unexpected permissions found');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testPutPermissionsFullPayload();