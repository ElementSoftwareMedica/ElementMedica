/**
 * Script per testare automaticamente il comportamento del frontend
 * Per eseguirlo manualmente, aprire il browser su localhost:5174 e incollare nel console:
 * 
 * fetch('/api/tenants/current', { 
 *   headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } 
 * }).then(r => r.json()).then(console.log)
 */

// Utility function per fare login programmatico
function testFrontendLogin() {
  return fetch('http://localhost:4003/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      identifier: 'admin@example.com',
      password: 'Admin123!'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success && data.tokens) {
      // Simula il comportamento del frontend impostando localStorage
      localStorage.setItem('token', data.tokens.access_token);
      localStorage.setItem('tenantId', data.user.tenantId);
      
      console.log('✅ Login simulato con successo:', {
        userId: data.user.id,
        role: data.user.role,
        tenantId: data.user.tenantId
      });
      
      // Ora testa la chiamata tenant
      return testTenantCall();
    } else {
      throw new Error('Login fallito');
    }
  });
}

// Test chiamata tenant usando Axios client del frontend
function testTenantCall() {
  // Prova prima con URL relativo come fa il frontend
  return fetch('/api/tenants/current', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'X-Tenant-ID': localStorage.getItem('tenantId'),
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('🔍 Tenant API Response:', {
      status: response.status,
      ok: response.ok,
      url: response.url
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  })
  .then(data => {
    console.log('✅ Tenant data ricevuto:', data);
    return data;
  })
  .catch(error => {
    console.error('❌ Errore chiamata tenant:', error);
    
    // Prova con URL completo come fallback
    console.log('🔄 Tentativo con URL completo...');
    return fetch('http://localhost:4003/api/tenants/current', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'X-Tenant-ID': localStorage.getItem('tenantId'),
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('🔍 Tenant API Response (URL completo):', {
        status: response.status,
        ok: response.ok,
        url: response.url
      });
      return response.json();
    })
    .then(data => {
      console.log('✅ Tenant data ricevuto (URL completo):', data);
      return data;
    });
  });
}

// Esporta le funzioni per uso nel browser
if (typeof window !== 'undefined') {
  window.testFrontendLogin = testFrontendLogin;
  window.testTenantCall = testTenantCall;
  
  console.log('🧪 Frontend test utilities loaded. Run:');
  console.log('- testFrontendLogin() per simulare login');
  console.log('- testTenantCall() per testare chiamata tenant');
}