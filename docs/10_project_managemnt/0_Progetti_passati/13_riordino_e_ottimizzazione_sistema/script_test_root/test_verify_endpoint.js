// Test script per verificare l'endpoint /api/v1/auth/verify
// Prima fa login per ottenere un token valido, poi testa verify

async function testVerifyEndpoint() {
  try {
    console.log('🧪 Test endpoint verify...');
    
    // Step 1: Login per ottenere token
    console.log('📧 Step 1: Login per ottenere token...');
    const loginResponse = await fetch('http://localhost:4001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'Admin123!'
      })
    });
    
    const loginResult = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login fallito!');
      console.log('📄 Risposta:', loginResult);
      return;
    }
    
    const token = loginResult.data?.accessToken;
    if (!token) {
      console.log('❌ Token non ricevuto dal login!');
      console.log('📄 Risposta login:', loginResult);
      return;
    }
    
    console.log('✅ Login riuscito, token ottenuto!');
    console.log('🔑 Token:', token.substring(0, 20) + '...');
    
    // Step 2: Test endpoint verify
    console.log('\n📧 Step 2: Test endpoint verify...');
    const verifyResponse = await fetch('http://localhost:4001/api/v1/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    const verifyResult = await verifyResponse.json();
    
    if (verifyResponse.ok) {
      console.log('✅ Verify riuscito!');
      console.log('👤 Utente verificato:', verifyResult.user?.email || 'N/A');
      console.log('🎯 Ruoli:', verifyResult.user?.roles || []);
      console.log('🔐 Token valido:', verifyResult.valid ? 'Sì' : 'No');
    } else {
      console.log('❌ Verify fallito!');
      console.log('📄 Risposta:', verifyResult);
      console.log('🔢 Status:', verifyResponse.status);
    }
    
  } catch (error) {
    console.error('💥 Errore durante il test:', error.message);
  }
}

// Esegui il test
console.log('🚀 Avvio test endpoint verify...');
testVerifyEndpoint()
  .then(() => {
    console.log('\n🎉 Test completato!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test fallito:', error);
    process.exit(1);
  });