#!/usr/bin/env node

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4003';

async function testFormEndpoints() {
  console.log('🔍 Test dettagliato degli endpoint form...\n');

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

    // 2. Test Form Templates endpoint con dettagli
    console.log('\n2️⃣ Test Form Templates endpoint...');
    try {
      const formTemplatesResponse = await fetch(`${API_BASE}/api/v1/form-templates`, {
        headers
      });
      
      console.log(`Status: ${formTemplatesResponse.status}`);
      console.log(`Status Text: ${formTemplatesResponse.statusText}`);
      
      const responseText = await formTemplatesResponse.text();
      console.log(`Response Body: ${responseText}`);
      
      if (!formTemplatesResponse.ok) {
        console.log('❌ Form Templates endpoint failed');
      } else {
        console.log('✅ Form Templates endpoint success');
      }
    } catch (error) {
      console.log(`❌ Form Templates ERROR: ${error.message}`);
    }

    // 3. Test Form Submissions endpoint con dettagli
    console.log('\n3️⃣ Test Form Submissions endpoint...');
    try {
      const formSubmissionsResponse = await fetch(`${API_BASE}/api/v1/submissions`, {
        headers
      });
      
      console.log(`Status: ${formSubmissionsResponse.status}`);
      console.log(`Status Text: ${formSubmissionsResponse.statusText}`);
      
      const responseText = await formSubmissionsResponse.text();
      console.log(`Response Body: ${responseText}`);
      
      if (!formSubmissionsResponse.ok) {
        console.log('❌ Form Submissions endpoint failed');
      } else {
        console.log('✅ Form Submissions endpoint success');
      }
    } catch (error) {
      console.log(`❌ Form Submissions ERROR: ${error.message}`);
    }

    // 4. Test CMS endpoint con dettagli
    console.log('\n4️⃣ Test CMS endpoint...');
    try {
      const cmsResponse = await fetch(`${API_BASE}/api/v1/cms/public-content`, {
        headers
      });
      
      console.log(`Status: ${cmsResponse.status}`);
      console.log(`Status Text: ${cmsResponse.statusText}`);
      
      const responseText = await cmsResponse.text();
      console.log(`Response Body: ${responseText}`);
      
      if (!cmsResponse.ok) {
        console.log('❌ CMS endpoint failed');
      } else {
        console.log('✅ CMS endpoint success');
      }
    } catch (error) {
      console.log(`❌ CMS ERROR: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
  }
}

testFormEndpoints();