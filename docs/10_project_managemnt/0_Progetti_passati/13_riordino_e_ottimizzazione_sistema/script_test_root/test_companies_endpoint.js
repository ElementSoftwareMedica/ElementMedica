// Test dell'endpoint companies con admin token

// Test dell'endpoint companies con admin token
async function testCompaniesEndpoint() {
  try {
    console.log('Testing companies endpoint...');
    
    // Prima testiamo senza autenticazione per vedere l'errore
    console.log('\n1. Test senza autenticazione:');
    const responseNoAuth = await fetch('http://localhost:4003/api/companies', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', responseNoAuth.status);
    const dataNoAuth = await responseNoAuth.text();
    console.log('Response:', dataNoAuth);
    
    // Ora testiamo con un token di esempio
    console.log('\n2. Test con token di esempio:');
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NzNhNzJlLWJkNzAtNGJkNy1hNzJlLWJkNzA0YmQ3YTcyZSIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiQURNSU4iLCJ0ZW5hbnRJZCI6IjY3NzNhNzJlLWJkNzAtNGJkNy1hNzJlLWJkNzA0YmQ3YTcyZSIsImlhdCI6MTczNTU1NzE4NCwiZXhwIjoxNzM1NTYwNzg0fQ.Ej7qGJOCJhOKLIJMNOPQRSTUVWXYZ123456789abcdef';
    
    const responseWithAuth = await fetch('http://localhost:4003/api/companies', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      }
    });
    
    console.log('Status:', responseWithAuth.status);
    const dataWithAuth = await responseWithAuth.text();
    console.log('Response:', dataWithAuth);
    
  } catch (error) {
    console.error('Errore durante il test:', error.message);
  }
}

testCompaniesEndpoint();