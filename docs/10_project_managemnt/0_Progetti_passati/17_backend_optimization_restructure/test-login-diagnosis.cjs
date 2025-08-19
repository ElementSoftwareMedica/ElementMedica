#!/usr/bin/env node

/**
 * Test di Diagnosi Login 401
 * Analizza il problema del login che restituisce 401 Unauthorized
 */

const http = require('http');
const https = require('https');

console.log('🔍 DIAGNOSI LOGIN 401 - Inizio Test');
console.log('=' .repeat(50));

// Credenziali di test
const credentials = {
  identifier: 'admin@example.com',
  password: 'Admin123!'
};

// Funzione per fare richieste HTTP
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(5000); // 5 secondi timeout

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test 1: Health Check API Server
async function testApiHealth() {
  console.log('\n1️⃣ Test Health Check API Server (porta 4001)');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4001,
      path: '/healthz',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Body: ${response.body.substring(0, 200)}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

// Test 2: Login API Server Diretto
async function testApiLogin() {
  console.log('\n2️⃣ Test Login API Server Diretto (porta 4001)');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, credentials);
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Body: ${response.body.substring(0, 300)}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

// Test 3: Health Check Proxy Server
async function testProxyHealth() {
  console.log('\n3️⃣ Test Health Check Proxy Server (porta 4003)');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4003,
      path: '/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Body: ${response.body.substring(0, 200)}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

// Test 4: Login tramite Proxy
async function testProxyLogin() {
  console.log('\n4️⃣ Test Login tramite Proxy (porta 4003)');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4003,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
        'User-Agent': 'Mozilla/5.0 (Test)'
      }
    }, credentials);
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`);
    console.log(`   Body: ${response.body}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

// Test 5: Verifica Connessione Database
async function testDatabaseConnection() {
  console.log('\n5️⃣ Test Connessione Database');
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 4001,
      path: '/api/health/database',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Body: ${response.body.substring(0, 200)}`);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`   ❌ Errore: ${error.message}`);
    return false;
  }
}

// Esecuzione test
async function runDiagnosis() {
  const results = {
    apiHealth: await testApiHealth(),
    apiLogin: await testApiLogin(),
    proxyHealth: await testProxyHealth(),
    proxyLogin: await testProxyLogin(),
    database: await testDatabaseConnection()
  };

  console.log('\n' + '=' .repeat(50));
  console.log('📊 RISULTATI DIAGNOSI');
  console.log('=' .repeat(50));
  console.log(`API Health Check:     ${results.apiHealth ? '✅' : '❌'}`);
  console.log(`API Login Diretto:    ${results.apiLogin ? '✅' : '❌'}`);
  console.log(`Proxy Health Check:   ${results.proxyHealth ? '✅' : '❌'}`);
  console.log(`Proxy Login:          ${results.proxyLogin ? '✅' : '❌'}`);
  console.log(`Database Connection:  ${results.database ? '✅' : '❌'}`);

  console.log('\n🔍 ANALISI:');
  if (!results.apiHealth) {
    console.log('❌ API Server non risponde al health check - Server bloccato');
  }
  if (!results.apiLogin && results.apiHealth) {
    console.log('❌ API Server risponde ma login fallisce - Problema autenticazione');
  }
  if (!results.proxyLogin && results.proxyHealth) {
    console.log('❌ Proxy funziona ma login fallisce - Problema routing o API');
  }
  if (results.proxyLogin) {
    console.log('✅ Login tramite proxy funziona - Problema risolto');
  }

  console.log('\n🎯 RACCOMANDAZIONI:');
  if (!results.apiHealth) {
    console.log('1. Verificare se il middleware di performance blocca le richieste');
    console.log('2. Controllare i log dell\'API server per errori');
    console.log('3. Considerare il riavvio dell\'API server');
  }
  if (!results.database) {
    console.log('1. Verificare connessione PostgreSQL');
    console.log('2. Controllare variabili ambiente DATABASE_URL');
  }
}

// Avvio diagnosi
runDiagnosis().catch(console.error);