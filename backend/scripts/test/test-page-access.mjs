#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4003';

async function testPageAccess() {
  console.log('🔍 Test di accesso alle pagine problematiche...\n');

  try {
    // 1. Login
    console.log('1️⃣ Effettuo login...');
    const loginResponse = await fetch(`${API_BASE}/api/v1/auth/login`, {
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
    console.log('✅ Login effettuato con successo');
    
    const token = loginData.tokens.access_token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Verifica token
    console.log('\n2️⃣ Verifico token...');
    const verifyResponse = await fetch(`${API_BASE}/api/v1/auth/verify`, {
      headers
    });

    if (!verifyResponse.ok) {
      throw new Error(`Token verification failed: ${verifyResponse.status}`);
    }

    const verifyData = await verifyResponse.json();
    console.log('✅ Token valido');
    console.log(`👤 Utente: ${verifyData.user?.email || verifyData.data?.user?.email || 'N/A'}`);

    // 3. Ottengo permessi (usando endpoint di test)
    console.log('\n3️⃣ Ottengo permessi utente...');
    const permissionsResponse = await fetch(`${API_BASE}/api/v1/auth/test-permissions`);

    if (!permissionsResponse.ok) {
      throw new Error(`Permissions fetch failed: ${permissionsResponse.status}`);
    }

    const permissionsData = await permissionsResponse.json();
    console.log('✅ Permessi ottenuti');
    
    // Analizza permessi specifici
    const permissions = permissionsData.data?.permissions || {};
    console.log(`📊 Totale permessi: ${Object.keys(permissions).length}`);

    // Verifica permessi specifici per le pagine problematiche
    const requiredPermissions = [
      'PUBLIC_CMS:READ',
      'PUBLIC_CMS:UPDATE',
      'form_templates:read',
      'form_templates:create',
      'form_templates:update',
      'form_templates:delete',
      'form_submissions:read',
      'form_submissions:update',
      'form_submissions:delete'
    ];

    console.log('\n4️⃣ Verifico permessi specifici per le pagine problematiche:');
    
    for (const permission of requiredPermissions) {
      const hasPermission = permissions[permission] === true;
      const status = hasPermission ? '✅' : '❌';
      console.log(`${status} ${permission}: ${hasPermission ? 'PRESENTE' : 'MANCANTE'}`);
    }

    // 5. Test API endpoints specifici
    console.log('\n5️⃣ Test API endpoints specifici:');

    // Test CMS endpoint
    try {
      const cmsResponse = await fetch(`${API_BASE}/api/v1/cms/public-content`, {
        headers
      });
      console.log(`📄 CMS Public Content: ${cmsResponse.ok ? '✅ OK' : '❌ FAIL'} (${cmsResponse.status})`);
    } catch (error) {
      console.log(`📄 CMS Public Content: ❌ ERROR - ${error.message}`);
    }

    // Test Form Templates endpoint
    try {
      const formTemplatesResponse = await fetch(`${API_BASE}/api/v1/form-templates`, {
        headers
      });
      console.log(`📋 Form Templates: ${formTemplatesResponse.ok ? '✅ OK' : '❌ FAIL'} (${formTemplatesResponse.status})`);
    } catch (error) {
      console.log(`📋 Form Templates: ❌ ERROR - ${error.message}`);
    }

    // Test Form Submissions endpoint
    try {
      const formSubmissionsResponse = await fetch(`${API_BASE}/api/v1/submissions`, {
        headers
      });
      console.log(`📝 Form Submissions: ${formSubmissionsResponse.ok ? '✅ OK' : '❌ FAIL'} (${formSubmissionsResponse.status})`);
    } catch (error) {
      console.log(`📝 Form Submissions: ❌ ERROR - ${error.message}`);
    }

    console.log('\n🎯 CONCLUSIONI:');
    console.log('- Se tutti i permessi sono presenti e gli endpoint rispondono OK, il problema è nel frontend');
    console.log('- Se mancano permessi, il problema è nella configurazione dei ruoli');
    console.log('- Se gli endpoint falliscono, il problema è nel backend');

  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
}

testPageAccess();