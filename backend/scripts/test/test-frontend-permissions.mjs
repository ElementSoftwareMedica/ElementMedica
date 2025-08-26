import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4001/api';

async function testFrontendPermissions() {
  console.log('🧪 === TEST PERMESSI FRONTEND ===\n');
  
  try {
    // 1. Login
    console.log('🔐 Effettuando login...');
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
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
    console.log('✅ Login riuscito');
    console.log('📋 User roles:', loginData.user?.roles);
    
    const token = loginData.tokens?.access_token;
    if (!token) {
      throw new Error('No access token received');
    }
    
    // 2. Verifica token e ottieni permessi
    console.log('\n🔍 Verificando token e ottenendo permessi...');
    const verifyResponse = await fetch(`${API_BASE}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Verify failed: ${verifyResponse.status} ${verifyResponse.statusText}`);
    }
    
    const verifyData = await verifyResponse.json();
    console.log('✅ Token verificato');
    console.log('📋 Permessi ricevuti:', Object.keys(verifyData.permissions || {}).length);
    
    // 3. Analizza permessi specifici per CMS e Forms
    const permissions = verifyData.permissions || {};
    
    console.log('\n🎯 === PERMESSI CMS ===');
    const cmsPermissions = Object.keys(permissions).filter(p => 
      p.includes('CMS') || p.includes('cms') || p.includes('PUBLIC')
    );
    cmsPermissions.forEach(p => {
      console.log(`${permissions[p] ? '✅' : '❌'} ${p}: ${permissions[p]}`);
    });
    
    console.log('\n🎯 === PERMESSI FORM TEMPLATES ===');
    const formTemplatePermissions = Object.keys(permissions).filter(p => 
      p.includes('FORM_TEMPLATE') || p.includes('form_template') || p.includes('TEMPLATE')
    );
    formTemplatePermissions.forEach(p => {
      console.log(`${permissions[p] ? '✅' : '❌'} ${p}: ${permissions[p]}`);
    });
    
    console.log('\n🎯 === PERMESSI FORM SUBMISSIONS ===');
    const formSubmissionPermissions = Object.keys(permissions).filter(p => 
      p.includes('FORM_SUBMISSION') || p.includes('form_submission') || p.includes('SUBMISSION')
    );
    formSubmissionPermissions.forEach(p => {
      console.log(`${permissions[p] ? '✅' : '❌'} ${p}: ${permissions[p]}`);
    });
    
    // 4. Test specifici per i permessi che il frontend controlla
    console.log('\n🧪 === TEST PERMESSI SPECIFICI ===');
    
    const testsToRun = [
      'PUBLIC_CMS:READ',
      'PUBLIC_CMS:UPDATE', 
      'form_templates:read',
      'form_templates:create',
      'form_templates:update',
      'form_templates:delete',
      'form_submissions:read',
      'form_submissions:update',
      'form_submissions:delete',
      'form_submissions:export'
    ];
    
    testsToRun.forEach(test => {
      const hasPermission = permissions[test] === true;
      console.log(`${hasPermission ? '✅' : '❌'} ${test}: ${hasPermission}`);
    });
    
    // 5. Simula la conversione dei permessi come fa il frontend
    console.log('\n🔄 === SIMULAZIONE CONVERSIONE FRONTEND ===');
    
    // Simula hasBackendPermission per alcuni permessi chiave
    const backendTests = [
      { frontend: 'PUBLIC_CMS:READ', backend: ['VIEW_PUBLIC_CMS', 'MANAGE_PUBLIC_CMS', 'VIEW_CMS'] },
      { frontend: 'form_templates:read', backend: ['VIEW_FORM_TEMPLATES', 'MANAGE_FORM_TEMPLATES'] },
      { frontend: 'form_submissions:read', backend: ['VIEW_FORM_SUBMISSIONS', 'MANAGE_FORM_SUBMISSIONS', 'VIEW_SUBMISSIONS'] }
    ];
    
    backendTests.forEach(test => {
      const hasAnyBackendPermission = test.backend.some(bp => permissions[bp] === true);
      console.log(`${hasAnyBackendPermission ? '✅' : '❌'} ${test.frontend} -> ${test.backend.join(' OR ')}: ${hasAnyBackendPermission}`);
    });
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
}

testFrontendPermissions();