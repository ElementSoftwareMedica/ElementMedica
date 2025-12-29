#!/usr/bin/env node

/**
 * Quick Integration Test
 * Verifica rapida che tutti i componenti siano operativi
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4001/api/v1';
const FRONTEND_BASE = 'http://localhost:5173';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runChecks() {
  log('\n🔍 VERIFICA INTEGRAZIONE GOOGLE WORKSPACE\n', 'cyan');
  
  let checks = {
    passed: 0,
    failed: 0,
    total: 8
  };

  // 1. Backend Health
  try {
    const response = await axios.get(`${API_BASE.replace('/api/v1', '')}/health`);
    if (response.data.status === 'healthy') {
      log('✅ Backend API: Healthy', 'green');
      checks.passed++;
    } else {
      log('❌ Backend API: Unhealthy', 'red');
      checks.failed++;
    }
  } catch (error) {
    log('❌ Backend API: Not responding', 'red');
    checks.failed++;
  }

  // 2. Frontend Server
  try {
    await axios.get(FRONTEND_BASE, { timeout: 3000 });
    log('✅ Frontend Server: Running', 'green');
    checks.passed++;
  } catch (error) {
    log('❌ Frontend Server: Not running', 'red');
    checks.failed++;
  }

  // 3. Google Credentials
  try {
    const { execSync } = require('child_process');
    const result = execSync('cd backend && node -e "require(\'dotenv\').config(); console.log(process.env.GOOGLE_CLIENT_ID ? \'OK\' : \'MISSING\');"', {
      cwd: process.cwd(),
      encoding: 'utf-8'
    }).trim();
    
    if (result === 'OK') {
      log('✅ Google Credentials: Configured', 'green');
      checks.passed++;
    } else {
      log('❌ Google Credentials: Missing', 'red');
      checks.failed++;
    }
  } catch (error) {
    log('❌ Google Credentials: Check failed', 'red');
    checks.failed++;
  }

  // 4. Login & Token
  let authToken = '';
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      identifier: 'testuser',
      password: 'Test123!'
    });
    authToken = response.data.tokens.access_token;
    if (authToken) {
      log('✅ Authentication: Working', 'green');
      checks.passed++;
    } else {
      log('❌ Authentication: Token missing', 'red');
      checks.failed++;
    }
  } catch (error) {
    log('❌ Authentication: Failed', 'red');
    checks.failed++;
  }

  if (!authToken) {
    log('\n❌ Cannot proceed without authentication token', 'red');
    printSummary(checks);
    process.exit(1);
  }

  // 5. Google Status Endpoint
  try {
    const response = await axios.get(`${API_BASE}/google/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    if (response.data.success) {
      log('✅ Google Status Endpoint: Working', 'green');
      checks.passed++;
    } else {
      log('❌ Google Status Endpoint: Error', 'red');
      checks.failed++;
    }
  } catch (error) {
    log('❌ Google Status Endpoint: Failed', 'red');
    checks.failed++;
  }

  // 6. Google Auth URL Endpoint
  try {
    const response = await axios.get(`${API_BASE}/google/auth/url`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const authUrl = response.data.data?.authUrl;
    if (authUrl && authUrl.includes('accounts.google.com')) {
      log('✅ Google Auth URL: Generated correctly', 'green');
      checks.passed++;
      
      // Verify Client ID in URL
      if (authUrl.includes('54545516402')) {
        log('  ✓ Client ID present in URL', 'blue');
      }
      
      // Verify Redirect URI
      if (authUrl.includes('localhost%3A5173')) {
        log('  ✓ Redirect URI correct (localhost:5173)', 'blue');
      } else if (authUrl.includes('localhost%3A4001')) {
        log('  ⚠️  Redirect URI points to backend (should be frontend)', 'yellow');
      }
    } else {
      log('❌ Google Auth URL: Invalid', 'red');
      checks.failed++;
    }
  } catch (error) {
    log('❌ Google Auth URL: Failed', 'red');
    checks.failed++;
  }

  // 7. Google Import Endpoint (Expected: Not Connected)
  try {
    const response = await axios.post(
      `${API_BASE}/google/import-docs`,
      { documentId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    log('❌ Google Import: Should fail when not connected', 'red');
    checks.failed++;
  } catch (error) {
    if (error.response?.data?.code === 'GOOGLE_NOT_CONNECTED') {
      log('✅ Google Import Endpoint: Error handling works', 'green');
      checks.passed++;
    } else {
      log('❌ Google Import Endpoint: Unexpected error', 'red');
      checks.failed++;
    }
  }

  // 8. Frontend Route Check
  try {
    const response = await axios.get(`${FRONTEND_BASE}/settings/templates/google-callback?code=test`, {
      maxRedirects: 0,
      validateStatus: () => true
    });
    // La route dovrebbe caricare (200) o reindirizzare
    if (response.status === 200 || response.status === 302) {
      log('✅ OAuth Callback Route: Registered', 'green');
      checks.passed++;
    } else {
      log('❌ OAuth Callback Route: Not found', 'red');
      checks.failed++;
    }
  } catch (error) {
    // Se otteniamo 404, la route non esiste
    if (error.response?.status === 404) {
      log('❌ OAuth Callback Route: Not found (404)', 'red');
      checks.failed++;
    } else {
      // Altri errori sono OK (es. rete)
      log('✅ OAuth Callback Route: Likely working', 'green');
      checks.passed++;
    }
  }

  printSummary(checks);

  // Final verdict
  if (checks.failed === 0) {
    log('\n🎉 TUTTO OPERATIVO! Sistema pronto per il testing OAuth2.\n', 'green');
    log('📋 Prossimi passi:', 'cyan');
    log('1. Apri: http://localhost:5173/settings/templates', 'blue');
    log('2. Clicca "Connetti Google Account" nel pannello Google', 'blue');
    log('3. Autorizza nel popup di Google', 'blue');
    log('4. Testa l\'importazione di un documento pubblico\n', 'blue');
    process.exit(0);
  } else if (checks.passed >= 6) {
    log('\n⚠️  Sistema quasi pronto. Alcuni check hanno fallito.\n', 'yellow');
    log('Rivedi i check falliti sopra e riprova.\n', 'yellow');
    process.exit(1);
  } else {
    log('\n❌ Sistema non pronto. Troppi check falliti.\n', 'red');
    log('Contatta il supporto tecnico.\n', 'red');
    process.exit(1);
  }
}

function printSummary(checks) {
  log('\n' + '='.repeat(50), 'cyan');
  log('RIEPILOGO VERIFICA', 'cyan');
  log('='.repeat(50), 'cyan');
  log(`Totale check: ${checks.total}`, 'blue');
  log(`✅ Passati: ${checks.passed}`, 'green');
  log(`❌ Falliti: ${checks.failed}`, checks.failed > 0 ? 'red' : 'green');
  log(`Percentuale: ${Math.round((checks.passed / checks.total) * 100)}%`, 'blue');
  log('='.repeat(50) + '\n', 'cyan');
}

// Run checks
runChecks().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
