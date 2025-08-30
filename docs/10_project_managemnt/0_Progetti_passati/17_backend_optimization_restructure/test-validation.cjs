#!/usr/bin/env node
/**
 * Script di Validazione Funzionale - Fase 6
 * Test completo delle funzionalità dopo il refactoring
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configurazione test
const CONFIG = {
  API_BASE: 'http://localhost:4001',
  PROXY_BASE: 'http://localhost:4003',
  TEST_CREDENTIALS: {
    email: 'admin@example.com',
    password: 'Admin123!'
  },
  TIMEOUT: 5000
};

// Colori per output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Risultati test
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

/**
 * Utility per logging colorato
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  const symbol = status ? '✅' : '❌';
  const color = status ? 'green' : 'red';
  log(`${symbol} ${name}`, color);
  if (details) {
    log(`   ${details}`, 'yellow');
  }
  
  testResults.total++;
  if (status) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.details.push({ name, status, details });
}

/**
 * Test connettività server
 */
async function testServerConnectivity() {
  log('\n🔌 Test Connettività Server', 'bold');
  
  try {
    // Test API Server
    const apiResponse = await axios.get(`${CONFIG.API_BASE}/health`, {
      timeout: CONFIG.TIMEOUT
    });
    logTest('API Server (4001)', apiResponse.status === 200, `Status: ${apiResponse.status}`);
  } catch (error) {
    logTest('API Server (4001)', false, `Errore: ${error.message}`);
  }
  
  try {
    // Test Proxy Server
    const proxyResponse = await axios.get(`${CONFIG.PROXY_BASE}/health`, {
      timeout: CONFIG.TIMEOUT
    });
    logTest('Proxy Server (4003)', proxyResponse.status === 200, `Status: ${proxyResponse.status}`);
  } catch (error) {
    logTest('Proxy Server (4003)', false, `Errore: ${error.message}`);
  }
}

/**
 * Test autenticazione
 */
async function testAuthentication() {
  log('\n🔐 Test Autenticazione', 'bold');
  
  try {
    const startTime = performance.now();
    const response = await axios.post(`${CONFIG.PROXY_BASE}/api/auth/login`, CONFIG.TEST_CREDENTIALS, {
      timeout: CONFIG.TIMEOUT
    });
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);
    
    const success = response.status === 200 && response.data.token;
    logTest('Login con credenziali test', success, `Response time: ${responseTime}ms`);
    
    if (success) {
      // Test token validity
      const token = response.data.token;
      try {
        const profileResponse = await axios.get(`${CONFIG.PROXY_BASE}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: CONFIG.TIMEOUT
        });
        logTest('Validazione token JWT', profileResponse.status === 200, 'Token valido');
        return token;
      } catch (error) {
        logTest('Validazione token JWT', false, `Errore: ${error.message}`);
      }
    }
  } catch (error) {
    logTest('Login con credenziali test', false, `Errore: ${error.message}`);
  }
  
  return null;
}

/**
 * Test health check esteso
 */
async function testHealthCheck() {
  log('\n🏥 Test Health Check', 'bold');
  
  try {
    const response = await axios.get(`${CONFIG.API_BASE}/healthz`, {
      timeout: CONFIG.TIMEOUT
    });
    
    const hasDatabase = response.data.dependencies && response.data.dependencies.database;
    const hasSystem = response.data.system;
    
    logTest('Health check endpoint', response.status === 200, `Status: ${response.status}`);
    logTest('Database connectivity', hasDatabase, hasDatabase ? 'Database OK' : 'Database non rilevato');
    logTest('System metrics', hasSystem, hasSystem ? 'Metriche sistema presenti' : 'Metriche mancanti');
  } catch (error) {
    logTest('Health check endpoint', false, `Errore: ${error.message}`);
  }
}

/**
 * Test rate limiting
 */
async function testRateLimiting() {
  log('\n⚡ Test Rate Limiting', 'bold');
  
  try {
    const requests = [];
    const endpoint = `${CONFIG.PROXY_BASE}/api/auth/profile`;
    
    // Invia 20 richieste rapide
    for (let i = 0; i < 20; i++) {
      requests.push(
        axios.get(endpoint, {
          timeout: CONFIG.TIMEOUT,
          validateStatus: () => true // Accetta tutti i status code
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    logTest('Rate limiting attivo', rateLimitedResponses.length > 0, 
      `${rateLimitedResponses.length}/20 richieste bloccate`);
  } catch (error) {
    logTest('Rate limiting attivo', false, `Errore: ${error.message}`);
  }
}

/**
 * Test API versioning
 */
async function testAPIVersioning() {
  log('\n📋 Test API Versioning', 'bold');
  
  try {
    // Test versione v1
    const v1Response = await axios.get(`${CONFIG.PROXY_BASE}/api/v1/health`, {
      headers: { 'X-API-Version': 'v1' },
      timeout: CONFIG.TIMEOUT,
      validateStatus: () => true
    });
    
    // Test versione v2
    const v2Response = await axios.get(`${CONFIG.PROXY_BASE}/api/v2/health`, {
      headers: { 'X-API-Version': 'v2' },
      timeout: CONFIG.TIMEOUT,
      validateStatus: () => true
    });
    
    logTest('API v1 endpoint', v1Response.status < 500, `Status: ${v1Response.status}`);
    logTest('API v2 endpoint', v2Response.status < 500, `Status: ${v2Response.status}`);
  } catch (error) {
    logTest('API versioning', false, `Errore: ${error.message}`);
  }
}

/**
 * Test security headers
 */
async function testSecurityHeaders() {
  log('\n🛡️ Test Security Headers', 'bold');
  
  try {
    const response = await axios.get(`${CONFIG.PROXY_BASE}/health`, {
      timeout: CONFIG.TIMEOUT
    });
    
    const headers = response.headers;
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy'
    ];
    
    securityHeaders.forEach(header => {
      const present = headers[header] !== undefined;
      logTest(`Header ${header}`, present, present ? headers[header] : 'Mancante');
    });
  } catch (error) {
    logTest('Security headers', false, `Errore: ${error.message}`);
  }
}

/**
 * Test performance
 */
async function testPerformance() {
  log('\n🚀 Test Performance', 'bold');
  
  const performanceTests = [
    { name: 'Health check', endpoint: `${CONFIG.API_BASE}/health` },
    { name: 'Proxy health', endpoint: `${CONFIG.PROXY_BASE}/health` }
  ];
  
  for (const test of performanceTests) {
    try {
      const times = [];
      
      // Esegui 5 richieste per calcolare la media
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();
        await axios.get(test.endpoint, { timeout: CONFIG.TIMEOUT });
        const endTime = performance.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const success = avgTime < 200; // Target: < 200ms
      
      logTest(`${test.name} response time`, success, `${avgTime}ms (target: <200ms)`);
    } catch (error) {
      logTest(`${test.name} response time`, false, `Errore: ${error.message}`);
    }
  }
}

/**
 * Esegui tutti i test
 */
async function runAllTests() {
  log('🧪 FASE 6 - VALIDAZIONE FUNZIONALE', 'bold');
  log('=====================================', 'blue');
  
  await testServerConnectivity();
  await testAuthentication();
  await testHealthCheck();
  await testRateLimiting();
  await testAPIVersioning();
  await testSecurityHeaders();
  await testPerformance();
  
  // Riepilogo finale
  log('\n📊 RIEPILOGO RISULTATI', 'bold');
  log('======================', 'blue');
  
  const successRate = Math.round((testResults.passed / testResults.total) * 100);
  const color = successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red';
  
  log(`✅ Test passati: ${testResults.passed}/${testResults.total}`, 'green');
  log(`❌ Test falliti: ${testResults.failed}/${testResults.total}`, 'red');
  log(`📈 Tasso di successo: ${successRate}%`, color);
  
  if (testResults.failed > 0) {
    log('\n❌ Test falliti:', 'red');
    testResults.details
      .filter(t => !t.status)
      .forEach(t => log(`   - ${t.name}: ${t.details}`, 'red'));
  }
  
  log('\n🎯 STATO FASE 6:', 'bold');
  if (successRate >= 90) {
    log('✅ FASE 6 COMPLETATA CON SUCCESSO', 'green');
  } else if (successRate >= 70) {
    log('⚠️  FASE 6 COMPLETATA CON AVVERTIMENTI', 'yellow');
  } else {
    log('❌ FASE 6 RICHIEDE INTERVENTI', 'red');
  }
}

// Esegui i test se chiamato direttamente
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 Errore critico: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };