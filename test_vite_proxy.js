import fetch from 'node-fetch';

async function testViteProxy() {
  console.log('🧪 Testing Vite proxy behavior for tenant API...');
  
  try {
    // 1. Login per ottenere token
    console.log('\n1. 🔐 Performing login...');
    const loginResponse = await fetch('http://localhost:4003/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login result:', { 
      status: loginResponse.status, 
      success: loginData.success,
      hasToken: !!loginData.tokens?.access_token
    });
    
    if (!loginData.success) {
      console.error('❌ Login failed');
      return;
    }
    
    const token = loginData.tokens.access_token;
    const tenantId = loginData.user.tenantId;
    
    // 2. Test chiamata via Vite proxy (come frontend)
    console.log('\n2. 🌐 Testing via Vite proxy (port 5174)...');
    try {
      const viteResponse = await fetch('http://localhost:5174/api/tenants/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Vite proxy result:', {
        status: viteResponse.status,
        url: viteResponse.url,
        headers: Object.fromEntries(viteResponse.headers.entries())
      });
      
      if (viteResponse.ok) {
        const viteData = await viteResponse.json();
        console.log('✅ Vite proxy successful - data received');
      } else {
        const errorText = await viteResponse.text();
        console.error('❌ Vite proxy failed:', viteResponse.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error via Vite proxy:', error.message);
    }
    
    // 3. Test diretto al backend per confronto
    console.log('\n3. 🔧 Testing direct backend (port 4003)...');
    try {
      const directResponse = await fetch('http://localhost:4003/api/tenants/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Direct backend result:', {
        status: directResponse.status,
        url: directResponse.url
      });
      
      if (directResponse.ok) {
        console.log('✅ Direct backend successful');
      } else {
        console.error('❌ Direct backend failed:', directResponse.status);
      }
    } catch (error) {
      console.error('❌ Error calling backend directly:', error.message);
    }
    
    // 4. Test della regola proxy /tenants -> /api/tenants
    console.log('\n4. 🔄 Testing Vite proxy rewrite rule (/tenants -> /api/tenants)...');
    try {
      const rewriteResponse = await fetch('http://localhost:5174/tenants/current', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenantId,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Rewrite rule result:', {
        status: rewriteResponse.status,
        url: rewriteResponse.url
      });
      
      if (rewriteResponse.ok) {
        console.log('✅ Rewrite rule working correctly');
      } else {
        console.error('❌ Rewrite rule failed:', rewriteResponse.status);
      }
    } catch (error) {
      console.error('❌ Error testing rewrite rule:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testViteProxy();