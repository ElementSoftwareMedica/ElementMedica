#!/usr/bin/env node

/**
 * Test Google OAuth2 Integration
 * Tests the complete OAuth2 flow and import functionality with real credentials
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4001/api/v1';
let authToken = '';

// ANSI colors
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

function logTest(testName) {
  console.log(`\n${'='.repeat(60)}`);
  log(`TEST: ${testName}`, 'cyan');
  console.log('='.repeat(60));
}

async function login() {
  logTest('Login con testuser');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'testuser@test.com',
      password: 'Test123!'
    });
    
    authToken = response.data.token;
    log('✅ Login successful', 'green');
    log(`Token: ${authToken.substring(0, 20)}...`, 'blue');
    return true;
  } catch (error) {
    log('❌ Login failed', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function checkConnection() {
  logTest('Check Google Connection Status');
  try {
    const response = await axios.get(`${API_BASE}/google/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log('✅ Status check successful', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    log('❌ Status check failed', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function getAuthUrl() {
  logTest('Get Google OAuth2 Authorization URL');
  try {
    const response = await axios.get(`${API_BASE}/google/auth/url`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log('✅ Auth URL generated', 'green');
    log('\n📋 Copy this URL and paste it in your browser:', 'yellow');
    log(response.data.url, 'blue');
    log('\nAfter authorizing, you will be redirected to:', 'yellow');
    log('http://localhost:5173/settings/templates/google-callback', 'blue');
    log('\nThe callback page will exchange the code for tokens automatically.', 'yellow');
    
    return response.data.url;
  } catch (error) {
    log('❌ Failed to get auth URL', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function waitForConnection() {
  log('\n⏳ Waiting for you to complete OAuth2 authorization...', 'yellow');
  log('Press any key after you have authorized in the browser...', 'cyan');
  
  return new Promise((resolve) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    });
  });
}

async function testImportDocs(documentId) {
  logTest(`Import Google Docs: ${documentId}`);
  try {
    const response = await axios.post(
      `${API_BASE}/google/import-docs`,
      { documentId },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    log('✅ Document imported successfully', 'green');
    log(`\nTemplate Name: ${response.data.name}`, 'blue');
    log(`Content Length: ${response.data.content.length} characters`, 'blue');
    log(`Markers Found: ${response.data.markers.length}`, 'blue');
    
    if (response.data.markers.length > 0) {
      log('\nMarkers:', 'yellow');
      response.data.markers.forEach(marker => {
        console.log(`  - {{${marker.name}}}`);
      });
    }
    
    log('\nContent Preview (first 200 chars):', 'yellow');
    console.log(response.data.content.substring(0, 200) + '...');
    
    return response.data;
  } catch (error) {
    log('❌ Import failed', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function testImportSlides(presentationId) {
  logTest(`Import Google Slides: ${presentationId}`);
  try {
    const response = await axios.post(
      `${API_BASE}/google/import-slides`,
      { presentationId },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    log('✅ Presentation imported successfully', 'green');
    log(`\nTemplate Name: ${response.data.name}`, 'blue');
    log(`Content Length: ${response.data.content.length} characters`, 'blue');
    log(`Markers Found: ${response.data.markers.length}`, 'blue');
    
    if (response.data.markers.length > 0) {
      log('\nMarkers:', 'yellow');
      response.data.markers.forEach(marker => {
        console.log(`  - {{${marker.name}}}`);
      });
    }
    
    // Count slides
    const slideMatches = response.data.content.match(/data-slide-number/g);
    const slideCount = slideMatches ? slideMatches.length : 0;
    log(`\nSlides Count: ${slideCount}`, 'blue');
    
    log('\nContent Preview (first 200 chars):', 'yellow');
    console.log(response.data.content.substring(0, 200) + '...');
    
    return response.data;
  } catch (error) {
    log('❌ Import failed', 'red');
    console.error(error.response?.data || error.message);
    return null;
  }
}

async function testDisconnect() {
  logTest('Disconnect Google Account');
  try {
    const response = await axios.delete(`${API_BASE}/google/disconnect`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log('✅ Disconnected successfully', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Disconnect failed', 'red');
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  log('\n🚀 Starting Google OAuth2 E2E Tests\n', 'cyan');
  
  let passed = 0;
  let failed = 0;

  // Step 1: Login
  if (!await login()) {
    log('\n❌ Cannot proceed without login', 'red');
    process.exit(1);
  }
  passed++;

  // Step 2: Check initial connection status
  const initialStatus = await checkConnection();
  if (initialStatus) {
    passed++;
    if (initialStatus.connected) {
      log('\n⚠️  Already connected to Google', 'yellow');
      log('Proceeding with import tests...', 'cyan');
    }
  } else {
    failed++;
  }

  // Step 3: Get auth URL (if not connected)
  if (!initialStatus?.connected) {
    const authUrl = await getAuthUrl();
    if (authUrl) {
      passed++;
      
      // Wait for user to authorize
      await waitForConnection();
      
      // Check connection status again
      log('\n🔄 Checking connection status after authorization...', 'cyan');
      const newStatus = await checkConnection();
      if (newStatus?.connected) {
        log('✅ Successfully connected to Google!', 'green');
        passed++;
      } else {
        log('❌ Still not connected. Authorization may have failed.', 'red');
        failed++;
      }
    } else {
      failed++;
    }
  }

  // Step 4: Test importing a public Google Doc
  log('\n📝 Testing Google Docs Import', 'cyan');
  log('You can use any public Google Doc URL or ID', 'yellow');
  log('Example: https://docs.google.com/document/d/YOUR_DOC_ID/edit', 'blue');
  
  // Ask for document ID
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const documentId = await new Promise((resolve) => {
    readline.question('\nEnter Google Doc URL or ID (or press Enter to skip): ', (answer) => {
      readline.close();
      resolve(answer.trim());
    });
  });

  if (documentId) {
    const docResult = await testImportDocs(documentId);
    if (docResult) passed++;
    else failed++;
  } else {
    log('⏭️  Skipping Docs import test', 'yellow');
  }

  // Step 5: Test importing a public Google Slides
  log('\n📊 Testing Google Slides Import', 'cyan');
  log('You can use any public Google Slides URL or ID', 'yellow');
  log('Example: https://docs.google.com/presentation/d/YOUR_PRESENTATION_ID/edit', 'blue');
  
  const readline2 = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const presentationId = await new Promise((resolve) => {
    readline2.question('\nEnter Google Slides URL or ID (or press Enter to skip): ', (answer) => {
      readline2.close();
      resolve(answer.trim());
    });
  });

  if (presentationId) {
    const slidesResult = await testImportSlides(presentationId);
    if (slidesResult) passed++;
    else failed++;
  } else {
    log('⏭️  Skipping Slides import test', 'yellow');
  }

  // Step 6: Test disconnect
  const readline3 = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const shouldDisconnect = await new Promise((resolve) => {
    readline3.question('\nDisconnect Google account? (y/N): ', (answer) => {
      readline3.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });

  if (shouldDisconnect) {
    if (await testDisconnect()) passed++;
    else failed++;
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`✅ Passed: ${passed}`, 'green');
  log(`❌ Failed: ${failed}`, 'red');
  log('='.repeat(60) + '\n', 'cyan');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
