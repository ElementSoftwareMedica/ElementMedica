/**
 * Debug script per verificare i permessi dell'admin sulla risorsa companies
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4001';
const LOGIN_ENDPOINT = '/api/v1/auth/login';
const VERIFY_ENDPOINT = '/api/v1/auth/verify';
const COMPANIES_ENDPOINT = '/api/v1/companies';

// Credenziali admin
const ADMIN_CREDENTIALS = {
  identifier: 'admin@example.com',
  password: 'Admin123!'
};

async function debugCompaniesPermissions() {
  try {
    console.log('🔍 Debug permessi companies per admin...');
    
    // 1. Login
    console.log('\n1. Effettuo login...');
    const loginResponse = await axios.post(`${BASE_URL}${LOGIN_ENDPOINT}`, ADMIN_CREDENTIALS);
    
    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = loginResponse.data;
    console.log('✅ Login successful');
    console.log('Login response data:', loginData);
    
    const token = loginData.data?.accessToken || loginData.token || loginData.accessToken;
    const user = loginData.data?.user || loginData.user;
    
    console.log('Token:', token ? token.substring(0, 20) + '...' : 'Not found');
    console.log('User data:', user ? {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions ? Object.keys(user.permissions).length + ' permissions' : 'No permissions'
    } : 'User not found in response');
    
    // 2. Verifica token e ottieni dati completi utente
    console.log('\n2. Verifico token e ottengo dati completi...');
    const verifyResponse = await axios.get(`${BASE_URL}${VERIFY_ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const fullUser = verifyResponse.data.user;
    console.log('✅ Token verified');
    console.log('Full user data:', {
      id: fullUser.id,
      email: fullUser.email,
      roles: fullUser.roles,
      permissions: fullUser.permissions
    });
    
    // 3. Analizza permessi specifici per companies
    console.log('\n3. Analisi permessi per companies...');
    
    const permissions = fullUser.permissions || {};
    const roles = fullUser.roles || [];
    
    console.log('Ruoli utente:', roles);
    console.log('Permessi utente:', permissions);
    
    // Verifica se è admin
    const isAdmin = roles.some(role => 
      ['Admin', 'Administrator', 'ADMIN', 'SUPER_ADMIN'].includes(role)
    );
    console.log('È admin?', isAdmin);
    
    // Verifica permessi specifici per companies
    const companiesPermissions = {
      'companies:read': permissions['companies:read'],
      'companies:create': permissions['companies:create'],
      'companies:update': permissions['companies:update'],
      'companies:delete': permissions['companies:delete'],
      'companies:all': permissions['companies:all'],
      'all:read': permissions['all:read'],
      'all:action': permissions['all:action']
    };
    
    console.log('Permessi companies specifici:', companiesPermissions);
    
    // Simula la logica hasPermission per companies:read
    console.log('\n4. Simulazione logica hasPermission...');
    
    const resource = 'companies';
    const action = 'read';
    
    // Logica dal AuthContext
    let hasPermission = false;
    
    // 1. Verifica se è admin
    if (isAdmin) {
      hasPermission = true;
      console.log('✅ Accesso garantito: utente è admin');
    }
    
    // 2. Verifica permesso specifico
    else if (permissions[`${resource}:${action}`]) {
      hasPermission = true;
      console.log('✅ Accesso garantito: permesso specifico', `${resource}:${action}`);
    }
    
    // 3. Verifica permesso universale
    else if (permissions[`all:${action}`]) {
      hasPermission = true;
      console.log('✅ Accesso garantito: permesso universale', `all:${action}`);
    }
    
    // 4. Verifica permesso risorsa completa
    else if (permissions[`${resource}:all`]) {
      hasPermission = true;
      console.log('✅ Accesso garantito: permesso risorsa completa', `${resource}:all`);
    }
    
    // 5. Verifica se ha almeno un permesso per la risorsa (per azione read)
    else if (action === 'read') {
      const hasAnyResourcePermission = Object.keys(permissions).some(perm => 
        perm.startsWith(`${resource}:`)
      );
      if (hasAnyResourcePermission) {
        hasPermission = true;
        console.log('✅ Accesso garantito: ha almeno un permesso per la risorsa');
      }
    }
    
    if (!hasPermission) {
      console.log('❌ Accesso negato: nessun permesso trovato');
    }
    
    console.log('\nRisultato finale hasPermission:', hasPermission);
    
    // 5. Test accesso API companies
    console.log('\n5. Test accesso API companies...');
    try {
      const companiesResponse = await axios.get(`${BASE_URL}${COMPANIES_ENDPOINT}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ API companies accessibile');
      console.log('Response status:', companiesResponse.status);
      console.log('Companies count:', companiesResponse.data?.data?.length || 0);
    } catch (apiError) {
      console.log('❌ Errore accesso API companies:', apiError.response?.status, apiError.response?.data?.message);
    }
    
  } catch (error) {
    console.error('❌ Errore durante il debug:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Esegui il debug
debugCompaniesPermissions();