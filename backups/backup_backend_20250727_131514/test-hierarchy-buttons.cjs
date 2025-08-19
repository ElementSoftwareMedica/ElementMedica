/**
 * Test per verificare il problema dei pulsanti disabilitati nella visualizzazione ad albero
 * Simula il flusso completo: login → gerarchia utente → verifica permessi
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4001';

async function testHierarchyButtons() {
  console.log('🧪 Test Pulsanti Disabilitati - Visualizzazione ad Albero');
  console.log('=' .repeat(60));

  try {
    // 1. Login come admin
    console.log('\n1️⃣ Login come admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });

    console.log('📋 Risposta login:', JSON.stringify(loginResponse.data, null, 2));
    const token = loginResponse.data.data?.accessToken || loginResponse.data.accessToken || loginResponse.data.token;
    if (!token) {
      throw new Error('Token non trovato nella risposta di login');
    }
    console.log('✅ Login successful, token ricevuto');

    // 2. Ottieni gerarchia utente corrente
    console.log('\n2️⃣ Caricamento gerarchia utente corrente...');
    const userHierarchyResponse = await axios.get(`${BASE_URL}/api/roles/hierarchy/current-user`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const currentUserHierarchy = userHierarchyResponse.data.data;
    console.log('✅ Gerarchia utente caricata');
    console.log('📊 Dati utente:');
    console.log(`   - Ruolo più alto: ${currentUserHierarchy.highestRole}`);
    console.log(`   - Livello: ${currentUserHierarchy.userLevel}`);
    console.log(`   - Ruoli assegnabili: ${currentUserHierarchy.assignableRoles?.length || 0}`);
    console.log(`   - Permessi assegnabili: ${currentUserHierarchy.assignablePermissions?.length || 0}`);
    
    // Debug: mostra i ruoli assegnabili
    if (currentUserHierarchy.assignableRoles) {
      console.log('🔍 Ruoli assegnabili:');
      currentUserHierarchy.assignableRoles.forEach(role => {
        console.log(`   - ${typeof role === 'object' ? role.type || role.name || JSON.stringify(role) : role}`);
      });
    }

    // 3. Verifica permessi specifici per i pulsanti
    console.log('\n3️⃣ Verifica permessi per i pulsanti...');
    const requiredPermissions = ['CREATE_ROLES', 'EDIT_ROLES', 'DELETE_ROLES', 'EDIT_HIERARCHY'];
    const userPermissions = currentUserHierarchy.assignablePermissions || [];
    
    console.log('🔍 Controllo permessi:');
    requiredPermissions.forEach(permission => {
      const hasPermission = userPermissions.includes(permission) || 
                           currentUserHierarchy.assignablePermissions?.includes('ALL_PERMISSIONS') ||
                           currentUserHierarchy.highestRole === 'SUPER_ADMIN';
      console.log(`   - ${permission}: ${hasPermission ? '✅' : '❌'}`);
    });

    // 4. Ottieni gerarchia completa dei ruoli
    console.log('\n4️⃣ Caricamento gerarchia completa...');
    const hierarchyResponse = await axios.get(`${BASE_URL}/api/roles/hierarchy`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const hierarchy = hierarchyResponse.data.data.hierarchy;
    console.log('✅ Gerarchia completa caricata');
    console.log(`📊 Ruoli totali: ${Object.keys(hierarchy).length}`);

    // 5. Simula la logica di abilitazione dei pulsanti per ogni ruolo
    console.log('\n5️⃣ Simulazione logica pulsanti per ogni ruolo...');
    
    const canEditRole = (roleType) => {
      // Logica da HierarchyTreeView.tsx
      if (currentUserHierarchy.assignablePermissions?.includes('ALL_PERMISSIONS') || 
          currentUserHierarchy.highestRole === 'SUPER_ADMIN') {
        return true;
      }
      // I ruoli assegnabili potrebbero essere oggetti con proprietà type/name
      return currentUserHierarchy.assignableRoles?.some(role => {
        const roleTypeToCheck = typeof role === 'object' ? (role.type || role.name) : role;
        return roleTypeToCheck === roleType;
      }) || false;
    };

    const hasPermission = (permission) => {
      // Logica da HierarchyTreeView.tsx
      if (currentUserHierarchy.assignablePermissions?.includes('ALL_PERMISSIONS') || 
          currentUserHierarchy.highestRole === 'SUPER_ADMIN') {
        return true;
      }
      return currentUserHierarchy.assignablePermissions?.includes(permission) || false;
    };

    console.log('🔧 Stato pulsanti per ogni ruolo:');
    Object.entries(hierarchy).forEach(([roleType, roleData]) => {
      const canCreate = hasPermission('CREATE_ROLES');
      const canEdit = canEditRole(roleType) && hasPermission('EDIT_ROLES');
      const canDelete = canEditRole(roleType) && hasPermission('DELETE_ROLES');
      
      console.log(`   📝 ${roleType}:`);
      console.log(`      - Crea sotto-ruolo: ${canCreate ? '✅' : '❌'}`);
      console.log(`      - Modifica: ${canEdit ? '✅' : '❌'}`);
      console.log(`      - Elimina: ${canDelete ? '✅' : '❌'}`);
    });

    // 6. Verifica se ci sono problemi specifici
    console.log('\n6️⃣ Diagnosi problemi...');
    
    const issues = [];
    
    if (!currentUserHierarchy.assignablePermissions?.includes('CREATE_ROLES')) {
      issues.push('❌ Manca il permesso CREATE_ROLES');
    }
    
    if (!currentUserHierarchy.assignablePermissions?.includes('EDIT_ROLES')) {
      issues.push('❌ Manca il permesso EDIT_ROLES');
    }
    
    if (!currentUserHierarchy.assignablePermissions?.includes('DELETE_ROLES')) {
      issues.push('❌ Manca il permesso DELETE_ROLES');
    }
    
    if (!currentUserHierarchy.assignableRoles || currentUserHierarchy.assignableRoles.length === 0) {
      issues.push('❌ Nessun ruolo assegnabile');
    }

    if (issues.length > 0) {
      console.log('🚨 Problemi identificati:');
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log('✅ Nessun problema identificato nei permessi');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('📋 RIEPILOGO:');
    console.log(`   - Utente: ${currentUserHierarchy.userId}`);
    console.log(`   - Ruolo: ${currentUserHierarchy.highestRole}`);
    console.log(`   - Livello: ${currentUserHierarchy.level}`);
    console.log(`   - Permessi totali: ${currentUserHierarchy.assignablePermissions?.length || 0}`);
    console.log(`   - Ruoli assegnabili: ${currentUserHierarchy.assignableRoles?.length || 0}`);
    console.log(`   - Problemi: ${issues.length}`);

  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Esegui il test
testHierarchyButtons();