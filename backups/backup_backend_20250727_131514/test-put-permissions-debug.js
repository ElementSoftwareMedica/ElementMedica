import fetch from 'node-fetch';

async function testPutPermissionsDebug() {
  console.log('🔍 Testing PUT permissions endpoint with debug...');
  
  try {
    // 1. Login per ottenere il token
    console.log('\n🔐 Step 1: Login...');
    const loginResponse = await fetch('http://localhost:4003/api/auth/login', {
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
    const token = loginData.data?.accessToken;
    
    if (!token) {
      throw new Error('No token received from login');
    }
    
    console.log('✅ Login successful, token obtained');

    // 2. Test PUT con payload minimo
    console.log('\n🔧 Step 2: Testing PUT with minimal payload...');
    
    const minimalPayload = {
      permissions: [
        {
          permissionId: "VIEW_COMPANIES",
          granted: true,
          scope: "global"
        }
      ]
    };

    console.log('📋 Payload:', JSON.stringify(minimalPayload, null, 2));

    const putResponse = await fetch('http://localhost:4003/api/roles/ADMIN/permissions', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(minimalPayload)
    });

    console.log(`📊 Response status: ${putResponse.status} ${putResponse.statusText}`);
    console.log('📊 Response headers:', Object.fromEntries(putResponse.headers.entries()));

    const responseText = await putResponse.text();
    console.log('📊 Response body (raw):', responseText);

    if (!putResponse.ok) {
      console.error('❌ PUT request failed');
      
      // Prova a parsare come JSON se possibile
      try {
        const errorData = JSON.parse(responseText);
        console.error('❌ Error data:', JSON.stringify(errorData, null, 2));
      } catch (parseError) {
        console.error('❌ Could not parse error response as JSON');
      }
      
      return;
    }

    // Se arriviamo qui, la richiesta è riuscita
    try {
      const responseData = JSON.parse(responseText);
      console.log('✅ PUT successful:', JSON.stringify(responseData, null, 2));
    } catch (parseError) {
      console.log('✅ PUT successful but response is not JSON:', responseText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Stack trace:', error.stack);
  }
}

// Esegui il test
testPutPermissionsDebug();