const axios = require('axios');

async function testCurrentUserHierarchy() {
  console.log('🧪 Test endpoint /hierarchy/current-user');
  console.log('=' .repeat(50));

  try {
    // 1. Login come admin
    console.log('📝 Step 1: Login come admin...');
    const loginResponse = await axios.post('http://localhost:4003/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });

    if (loginResponse.status !== 200) {
      console.error('❌ Login fallito:', loginResponse.status, loginResponse.data);
      return;
    }

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login riuscito, token ottenuto');

    // 2. Test endpoint hierarchy/current-user
    console.log('\n📝 Step 2: Test endpoint /hierarchy/current-user...');
    const hierarchyResponse = await axios.get('http://localhost:4003/api/roles/hierarchy/current-user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Risposta ricevuta:', hierarchyResponse.status);
    console.log('📊 Dati gerarchia utente corrente:');
    console.log(JSON.stringify(hierarchyResponse.data, null, 2));

    // 3. Analisi dettagliata dei permessi
    const data = hierarchyResponse.data.data;
    console.log('\n🔍 Analisi dettagliata:');
    console.log('👤 User ID:', data.userId);
    console.log('🎭 User Roles:', data.userRoles);
    console.log('👑 Highest Role:', data.highestRole);
    console.log('📊 User Level:', data.userLevel);
    console.log('🎯 Assignable Roles Count:', data.assignableRoles?.length || 0);
    console.log('🔑 Assignable Permissions Count:', data.assignablePermissions?.length || 0);
    
    console.log('\n🔑 Permessi chiave per i pulsanti:');
    console.log('- CREATE_ROLES:', data.assignablePermissions?.includes('CREATE_ROLES'));
    console.log('- EDIT_ROLES:', data.assignablePermissions?.includes('EDIT_ROLES'));
    console.log('- DELETE_ROLES:', data.assignablePermissions?.includes('DELETE_ROLES'));
    console.log('- EDIT_HIERARCHY:', data.assignablePermissions?.includes('EDIT_HIERARCHY'));
    console.log('- ALL_PERMISSIONS:', data.assignablePermissions?.includes('ALL_PERMISSIONS'));

    if (data.assignablePermissions?.length > 0) {
      console.log('\n📋 Primi 20 permessi disponibili:');
      data.assignablePermissions.slice(0, 20).forEach((perm, index) => {
        console.log(`  ${index + 1}. ${perm}`);
      });
    }

  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📄 Response:', error.response.data);
    }
  }
}

testCurrentUserHierarchy();