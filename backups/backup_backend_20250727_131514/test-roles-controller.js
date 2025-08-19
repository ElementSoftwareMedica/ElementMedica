#!/usr/bin/env node

/**
 * Test completo per il controller dei ruoli
 * Verifica tutti gli endpoint implementati
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:4003';
const API_URL = `${BASE_URL}/api`;

// Credenziali di test standard
const TEST_CREDENTIALS = {
  identifier: 'admin@example.com',
  password: 'Admin123!'
};

let authToken = '';

/**
 * Effettua il login e ottiene il token JWT
 */
async function login() {
  try {
    console.log('🔐 Effettuando login...');
    
    const response = await axios.post(`${API_URL}/auth/login`, TEST_CREDENTIALS, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Estrai il token dalla risposta
    if (response.data?.success && response.data?.data?.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✅ Login effettuato con successo');
      console.log(`   Token ricevuto: ${authToken.substring(0, 50)}...`);
      return true;
    } else {
      console.log('❌ Nessun token ricevuto dal login');
      return false;
    }
  } catch (error) {
    console.error('❌ Errore durante il login:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Effettua una richiesta autenticata
 */
async function authenticatedRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

/**
 * Test degli endpoint dei ruoli
 */
async function testRolesEndpoints() {
  console.log('\n📋 Testing Roles Endpoints...\n');

  // Test 1: GET /api/roles - Ottenere tutti i ruoli
  console.log('1️⃣ Test GET /api/roles');
  const rolesResult = await authenticatedRequest('GET', '/roles');
  if (rolesResult.success) {
    console.log('✅ Ruoli ottenuti con successo');
    console.log(`   Numero ruoli: ${rolesResult.data?.length || 0}`);
  } else {
    console.log('❌ Errore nel recupero ruoli:', rolesResult.error);
  }

  // Test 2: GET /api/roles/hierarchy - Ottenere la gerarchia dei ruoli
  console.log('\n2️⃣ Test GET /api/roles/hierarchy');
  const hierarchyResult = await authenticatedRequest('GET', '/roles/hierarchy');
  if (hierarchyResult.success) {
    console.log('✅ Gerarchia ruoli ottenuta con successo');
    console.log('   Struttura gerarchia:', JSON.stringify(hierarchyResult.data, null, 2));
  } else {
    console.log('❌ Errore nel recupero gerarchia:', hierarchyResult.error);
  }

  // Test 3: GET /api/roles/assignable - Ottenere ruoli assegnabili
  console.log('\n3️⃣ Test GET /api/roles/assignable');
  const assignableResult = await authenticatedRequest('GET', '/roles/assignable');
  if (assignableResult.success) {
    console.log('✅ Ruoli assegnabili ottenuti con successo');
    console.log(`   Numero ruoli assegnabili: ${assignableResult.data?.length || 0}`);
  } else {
    console.log('❌ Errore nel recupero ruoli assegnabili:', assignableResult.error);
  }

  // Test 4: POST /api/roles - Creare un nuovo ruolo
  console.log('\n4️⃣ Test POST /api/roles');
  const newRole = {
    name: 'TEST_ROLE',
    description: 'Ruolo di test creato automaticamente',
    level: 50,
    parentId: null,
    permissions: ['READ_USERS']
  };
  
  const createResult = await authenticatedRequest('POST', '/roles', newRole);
  if (createResult.success) {
    console.log('✅ Nuovo ruolo creato con successo');
    console.log('   ID ruolo:', createResult.data?.id);
    
    // Test 5: PUT /api/roles/:id - Aggiornare il ruolo creato
    if (createResult.data?.id) {
      console.log('\n5️⃣ Test PUT /api/roles/:id');
      const updateData = {
        description: 'Ruolo di test aggiornato',
        permissions: ['READ_USERS', 'WRITE_USERS']
      };
      
      const updateResult = await authenticatedRequest('PUT', `/roles/${createResult.data.id}`, updateData);
      if (updateResult.success) {
        console.log('✅ Ruolo aggiornato con successo');
      } else {
        console.log('❌ Errore nell\'aggiornamento ruolo:', updateResult.error);
      }

      // Test 6: DELETE /api/roles/:id - Eliminare il ruolo creato
      console.log('\n6️⃣ Test DELETE /api/roles/:id');
      const deleteResult = await authenticatedRequest('DELETE', `/roles/${createResult.data.id}`);
      if (deleteResult.success) {
        console.log('✅ Ruolo eliminato con successo');
      } else {
        console.log('❌ Errore nell\'eliminazione ruolo:', deleteResult.error);
      }
    }
  } else {
    console.log('❌ Errore nella creazione ruolo:', createResult.error);
  }

  // Test 7: POST /api/roles/assign - Assegnare un ruolo
  console.log('\n7️⃣ Test POST /api/roles/assign');
  const assignData = {
    personId: 1, // Assumendo che esista una persona con ID 1
    roleType: 'EMPLOYEE'
  };
  
  const assignResult = await authenticatedRequest('POST', '/roles/assign', assignData);
  if (assignResult.success) {
    console.log('✅ Ruolo assegnato con successo');
  } else {
    console.log('❌ Errore nell\'assegnazione ruolo:', assignResult.error);
  }

  // Test 8: POST /api/roles/move - Spostare un ruolo nella gerarchia
  console.log('\n8️⃣ Test POST /api/roles/move');
  const moveData = {
    roleId: 1, // Assumendo che esista un ruolo con ID 1
    newParentId: null,
    newLevel: 60
  };
  
  const moveResult = await authenticatedRequest('POST', '/roles/move', moveData);
  if (moveResult.success) {
    console.log('✅ Ruolo spostato con successo');
  } else {
    console.log('❌ Errore nello spostamento ruolo:', moveResult.error);
  }

  // Test 9: GET /api/roles/:id/permissions - Ottenere permessi di un ruolo
  console.log('\n9️⃣ Test GET /api/roles/:id/permissions');
  const permissionsResult = await authenticatedRequest('GET', '/roles/1/permissions');
  if (permissionsResult.success) {
    console.log('✅ Permessi ruolo ottenuti con successo');
    console.log(`   Numero permessi: ${permissionsResult.data?.length || 0}`);
  } else {
    console.log('❌ Errore nel recupero permessi:', permissionsResult.error);
  }

  // Test 10: PUT /api/roles/:id/permissions - Aggiornare permessi di un ruolo
  console.log('\n🔟 Test PUT /api/roles/:id/permissions');
  const updatePermissionsData = {
    permissions: ['READ_USERS', 'WRITE_USERS', 'DELETE_USERS']
  };
  
  const updatePermissionsResult = await authenticatedRequest('PUT', '/roles/1/permissions', updatePermissionsData);
  if (updatePermissionsResult.success) {
    console.log('✅ Permessi ruolo aggiornati con successo');
  } else {
    console.log('❌ Errore nell\'aggiornamento permessi:', updatePermissionsResult.error);
  }
}

/**
 * Funzione principale
 */
async function main() {
  console.log('🚀 Avvio test completo controller ruoli\n');
  
  // Verifica che i server siano attivi
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server proxy attivo');
  } catch (error) {
    console.error('❌ Server proxy non raggiungibile:', error.message);
    process.exit(1);
  }

  // Effettua il login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('❌ Login fallito, impossibile continuare i test');
    process.exit(1);
  }

  // Esegui i test degli endpoint
  await testRolesEndpoints();

  console.log('\n🎉 Test completati!');
}

// Esegui i test
main().catch(error => {
  console.error('❌ Errore durante l\'esecuzione dei test:', error);
  process.exit(1);
});