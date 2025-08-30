/**
 * Test di Login dopo Ottimizzazione Schema Prisma
 * Verifica che il login funzioni correttamente con il client Prisma ottimizzato
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:4001/api';
const TEST_CREDENTIALS = {
  identifier: 'admin@example.com',
  password: 'Admin123!'
};

/**
 * Test del login
 */
async function testLogin() {
  console.log('🔐 Testing login with optimized Prisma client...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_CREDENTIALS)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login successful!');
      console.log('📋 Response data:', {
        success: data.success,
        personId: data.person?.id,
        email: data.person?.email,
        roles: data.person?.personRoles?.map(pr => pr.roleType),
        hasAccessToken: !!data.accessToken,
        hasRefreshToken: !!data.refreshToken
      });
      
      // Test di verifica token
      if (data.accessToken) {
        await testTokenVerification(data.accessToken);
      }
      
      return true;
    } else {
      console.log('❌ Login failed:', data);
      return false;
    }
  } catch (error) {
    console.error('🚨 Login test error:', error.message);
    return false;
  }
}

/**
 * Test di verifica del token
 */
async function testTokenVerification(token) {
  console.log('🔍 Testing token verification...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token verification successful!');
      console.log('👤 User data:', {
        personId: data.personId,
        email: data.email,
        roles: data.roles
      });
    } else {
      console.log('❌ Token verification failed:', await response.text());
    }
  } catch (error) {
    console.error('🚨 Token verification error:', error.message);
  }
}

/**
 * Test di connessione al database
 */
async function testDatabaseConnection() {
  console.log('🗄️ Testing database connection...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/health/db`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Database connection successful!');
      console.log('📊 DB Status:', data);
    } else {
      console.log('❌ Database connection failed:', await response.text());
    }
  } catch (error) {
    console.error('🚨 Database connection error:', error.message);
  }
}

/**
 * Esegue tutti i test
 */
async function runAllTests() {
  console.log('🚀 Starting Prisma optimization tests...');
  console.log('=' .repeat(50));
  
  // Test connessione database
  await testDatabaseConnection();
  console.log('');
  
  // Test login
  const loginSuccess = await testLogin();
  console.log('');
  
  console.log('=' .repeat(50));
  console.log(loginSuccess ? '✅ All tests completed successfully!' : '❌ Some tests failed!');
  
  return loginSuccess;
}

// Esegui i test se il file viene chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { testLogin, testTokenVerification, testDatabaseConnection, runAllTests };