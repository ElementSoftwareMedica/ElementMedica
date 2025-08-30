// Test login admin e ottenimento token

async function testAdminLogin() {
  try {
    console.log('Testing admin login...');
    
    // Credenziali admin
    const credentials = {
  identifier: 'admin@example.com',
  password: 'admin123'
};
    
    console.log('\n1. Tentativo login con:', credentials.identifier);
    
    const loginResponse = await fetch('http://localhost:4001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    console.log('Login Status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('Login Response:', loginData);
    
    if (loginResponse.ok) {
      const parsedData = JSON.parse(loginData);
      const token = parsedData.token || parsedData.accessToken;
      
      if (token) {
        console.log('\n2. Token ottenuto, testing companies endpoint...');
        
        const companiesResponse = await fetch('http://localhost:4001/companies', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Companies Status:', companiesResponse.status);
        const companiesData = await companiesResponse.text();
        console.log('Companies Response:', companiesData);
      } else {
        console.log('❌ Nessun token trovato nella risposta');
      }
    } else {
      console.log('❌ Login fallito');
    }
    
  } catch (error) {
    console.error('Errore durante il test:', error.message);
  }
}

testAdminLogin();