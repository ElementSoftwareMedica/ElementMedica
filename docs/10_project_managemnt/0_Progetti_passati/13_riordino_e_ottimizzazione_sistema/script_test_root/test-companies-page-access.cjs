const axios = require('axios');

// Configurazione
const API_URL = 'http://localhost:4001';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin123!';

async function testCompaniesPageAccess() {
  try {
    console.log('🔍 Test accesso pagina companies con utente admin');
    console.log('=' .repeat(70));
    
    // 1. Login
    console.log('\n1️⃣ Login utente admin...');
    const loginResponse = await axios.post(`${API_URL}/api/v1/auth/login`, {
      identifier: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login fallito');
    }
    
    const { accessToken, user } = loginResponse.data.data;
    console.log('✅ Login successful');
    console.log('📋 User info:', {
      id: user.id,
      email: user.email,
      roles: user.roles
    });
    
    // 2. Verifica token e permessi
    console.log('\n2️⃣ Verifica token e permessi...');
    const verifyResponse = await axios.get(`${API_URL}/api/v1/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!verifyResponse.data.valid) {
      throw new Error('Token non valido');
    }
    
    const { permissions } = verifyResponse.data;
    console.log('✅ Token valido');
    console.log('📋 Permessi totali:', Object.keys(permissions).length);
    
    // 3. Verifica permessi companies specifici
    console.log('\n3️⃣ Verifica permessi companies...');
    const companiesPermissions = {
      'companies:read': permissions['companies:read'],
      'companies:create': permissions['companies:create'],
      'companies:update': permissions['companies:update'],
      'companies:delete': permissions['companies:delete']
    };
    
    console.log('📋 Permessi companies:', companiesPermissions);
    
    // 4. Simula controllo hasPermission del frontend
    console.log('\n4️⃣ Simula controllo hasPermission frontend...');
    
    function simulateHasPermission(resource, action) {
      console.log(`\n🔍 Checking permission: ${resource}:${action}`);
      console.log('   User roles:', user.roles);
      
      // Simula la logica di AuthContext.hasPermission
      // Admin o Administrator hanno sempre tutti i permessi
      const userRole = user.roles?.includes('SUPER_ADMIN') ? 'Admin' : 
                      user.roles?.includes('ADMIN') ? 'Admin' : 
                      user.roles?.includes('COMPANY_ADMIN') ? 'Administrator' : 'User';
      
      console.log('   Mapped role:', userRole);
      
      if (userRole === 'Admin' || userRole === 'Administrator') {
        console.log('  ✅ Access granted: user is Admin/Administrator');
        return true;
      }
      
      // Verifica permesso all:* (permesso universale)
      if (permissions['all:' + action] === true) {
        console.log('  ✅ Access granted: user has all:' + action + ' permission');
        return true;
      }
      
      // Verifica permesso resource:all (permesso per tutte le azioni sulla risorsa)
      if (permissions[resource + ':all'] === true) {
        console.log('  ✅ Access granted: user has ' + resource + ':all permission');
        return true;
      }
      
      // Verifica dei permessi specifici
      const permissionKey = `${resource}:${action}`;
      const hasSpecificPermission = permissions[permissionKey] === true;
      
      console.log(`  ${hasSpecificPermission ? '✅' : '❌'} Permission check result:`, hasSpecificPermission);
      return hasSpecificPermission;
    }
    
    // Test del controllo permessi per companies:read
    const hasReadPermission = simulateHasPermission('companies', 'read');
    
    console.log('\n📊 Risultato finale:');
    console.log('  - Login:', '✅');
    console.log('  - Token valido:', '✅');
    console.log('  - Permessi companies:read:', hasReadPermission ? '✅' : '❌');
    console.log('  - Accesso pagina companies:', hasReadPermission ? '✅ CONSENTITO' : '❌ NEGATO');
    
    if (!hasReadPermission) {
      console.log('\n🚨 PROBLEMA IDENTIFICATO:');
      console.log('   L\'utente admin non ha il permesso companies:read');
      console.log('   Questo spiega perché viene reindirizzato al login');
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testCompaniesPageAccess();