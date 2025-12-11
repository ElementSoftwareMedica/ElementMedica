import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function testPermissionsEndpoint() {
  try {
    console.log('🔍 Testing permissions endpoint...');
    
    // 1. Prima otteniamo un token di autenticazione
    console.log('📝 Step 1: Getting authentication token...');
    const loginResponse = await fetch('http://localhost:4001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'default-company'
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
    const token = loginData.token;
    console.log('✅ Authentication successful');
    
    // 2. Testiamo il GET per vedere i permessi attuali
    console.log('\n📝 Step 2: Getting current ADMIN permissions...');
    const getResponse = await fetch('http://localhost:4001/api/roles/ADMIN/permissions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-id': 'default-company'
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const currentPermissions = await getResponse.json();
    console.log('✅ Current permissions:', JSON.stringify(currentPermissions, null, 2));
    
    // 3. Testiamo il PUT con un payload semplice
    console.log('\n📝 Step 3: Testing PUT with simple payload...');
    const testPayload = {
      permissions: [
        {
          permissionId: 'VIEW_COMPANIES',
          granted: true,
          scope: 'all',
          tenantIds: [],
          fieldRestrictions: []
        },
        {
          permissionId: 'CREATE_COMPANIES',
          granted: true,
          scope: 'all',
          tenantIds: [],
          fieldRestrictions: []
        }
      ]
    };
    
    console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));
    
    const putResponse = await fetch('http://localhost:4001/api/roles/ADMIN/permissions', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-tenant-id': 'default-company'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log(`📥 Response status: ${putResponse.status} ${putResponse.statusText}`);
    
    const putResult = await putResponse.text();
    console.log('📥 Response body:', putResult);
    
    if (!putResponse.ok) {
      console.error('❌ PUT request failed');
      
      // Proviamo a capire cosa c'è di sbagliato nel payload
      console.log('\n🔍 Analyzing payload issues...');
      
      // Verifichiamo se i permissionId esistono nella tabella Permission
      const permissions = await prisma.permission.findMany();
      console.log('📋 Available permissions in database:');
      permissions.forEach(p => {
        console.log(`  - ${p.id}: ${p.name}`);
      });
      
      // Verifichiamo se i PersonRole esistono
      const personRoles = await prisma.personRole.findMany({
        where: { roleType: 'ADMIN' },
        include: { person: true }
      });
      console.log('\n👥 PersonRoles for ADMIN:');
      personRoles.forEach(pr => {
        console.log(`  - PersonRole ID: ${pr.id}, Person: ${pr.person.email}`);
      });
      
    } else {
      console.log('✅ PUT request successful');
      
      // Verifichiamo i permessi dopo l'aggiornamento
      console.log('\n📝 Step 4: Verifying updated permissions...');
      const verifyResponse = await fetch('http://localhost:4001/api/roles/ADMIN/permissions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': 'default-company'
        }
      });
      
      if (verifyResponse.ok) {
        const updatedPermissions = await verifyResponse.json();
        console.log('✅ Updated permissions:', JSON.stringify(updatedPermissions, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui il test se questo file viene eseguito direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testPermissionsEndpoint();
}

export { testPermissionsEndpoint };