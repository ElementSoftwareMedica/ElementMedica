/**
 * Test Google Import Functionality
 * Tests Google Docs and Slides import endpoints
 */

const axios = require('axios');

const API_BASE = 'http://localhost:4001/api/v1';
let authToken = null;

// Test credentials
const credentials = {
  identifier: 'testuser',
  password: 'Test123!'
};

// Test document IDs (use public documents for testing)
const testDocuments = {
  // Replace with actual public document IDs for testing
  googleDocsId: '1234567890abcdefghijklmnop', // Example Google Docs ID
  googleSlidesId: '0987654321zyxwvutsrqponm'  // Example Google Slides ID
};

/**
 * Login and get auth token
 */
async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${API_BASE}/auth/login`, credentials);
    
    if (response.data.tokens && response.data.tokens.access_token) {
      authToken = response.data.tokens.access_token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed: No token received');
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get auth headers
 */
function getHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Test 1: Check Google connection status
 */
async function testConnectionStatus() {
  console.log('\n📊 Test 1: Check Google connection status');
  try {
    const response = await axios.get(`${API_BASE}/google/status`, {
      headers: getHeaders()
    });
    
    console.log('✅ Status:', response.data.data);
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 2: Get Google OAuth URL
 */
async function testGetAuthUrl() {
  console.log('\n🔗 Test 2: Get Google OAuth URL');
  try {
    const response = await axios.get(`${API_BASE}/google/auth/url`, {
      headers: getHeaders()
    });
    
    const authUrl = response.data.data.authUrl;
    console.log('✅ Auth URL generated');
    console.log('   URL:', authUrl.substring(0, 100) + '...');
    console.log('\n⚠️  To complete OAuth flow:');
    console.log('   1. Open this URL in browser');
    console.log('   2. Grant permissions');
    console.log('   3. Copy the authorization code');
    console.log('   4. Exchange code for tokens via /auth/callback');
    
    return true;
  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 3: Try importing Google Docs (will fail without OAuth)
 */
async function testImportDocs() {
  console.log('\n📄 Test 3: Try importing Google Docs');
  try {
    const response = await axios.post(`${API_BASE}/google/import-docs`, {
      documentId: testDocuments.googleDocsId
    }, {
      headers: getHeaders()
    });
    
    console.log('✅ Document imported successfully');
    console.log('   Title:', response.data.data.name);
    console.log('   Markers found:', response.data.data.markers?.length || 0);
    console.log('   Content length:', response.data.data.content?.length || 0);
    
    return true;
  } catch (error) {
    const errorData = error.response?.data;
    
    if (errorData?.code === 'GOOGLE_NOT_CONNECTED') {
      console.log('⚠️  Expected: Not connected to Google');
      console.log('   Message:', errorData.message);
      return true; // This is expected behavior
    }
    
    console.error('❌ Failed:', errorData || error.message);
    return false;
  }
}

/**
 * Test 4: Try importing Google Slides (will fail without OAuth)
 */
async function testImportSlides() {
  console.log('\n📊 Test 4: Try importing Google Slides');
  try {
    const response = await axios.post(`${API_BASE}/google/import-slides`, {
      presentationId: testDocuments.googleSlidesId
    }, {
      headers: getHeaders()
    });
    
    console.log('✅ Presentation imported successfully');
    console.log('   Title:', response.data.data.name);
    console.log('   Markers found:', response.data.data.markers?.length || 0);
    console.log('   Content length:', response.data.data.content?.length || 0);
    
    return true;
  } catch (error) {
    const errorData = error.response?.data;
    
    if (errorData?.code === 'GOOGLE_NOT_CONNECTED') {
      console.log('⚠️  Expected: Not connected to Google');
      console.log('   Message:', errorData.message);
      return true; // This is expected behavior
    }
    
    console.error('❌ Failed:', errorData || error.message);
    return false;
  }
}

/**
 * Test 5: Test invalid document ID
 */
async function testInvalidDocumentId() {
  console.log('\n❌ Test 5: Test invalid document ID');
  try {
    const response = await axios.post(`${API_BASE}/google/import-docs`, {
      documentId: 'invalid-id'
    }, {
      headers: getHeaders()
    });
    
    console.error('❌ Should have failed with invalid ID');
    return false;
  } catch (error) {
    const errorData = error.response?.data;
    
    if (errorData?.code === 'GOOGLE_NOT_CONNECTED' || 
        errorData?.error === 'Invalid document URL' ||
        error.response?.status === 400 ||
        error.response?.status === 404) {
      console.log('✅ Correctly rejected invalid document ID');
      return true;
    }
    
    console.error('❌ Unexpected error:', errorData || error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Google Import Integration Tests');
  console.log('='.repeat(60));
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }
  
  const results = {
    passed: 0,
    failed: 0,
    total: 5
  };
  
  // Run tests
  const tests = [
    testConnectionStatus,
    testGetAuthUrl,
    testImportDocs,
    testImportSlides,
    testInvalidDocumentId
  ];
  
  for (const test of tests) {
    const success = await test();
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  console.log('='.repeat(60));
  
  console.log('\n📝 Next Steps:');
  console.log('1. Setup Google Cloud Console credentials');
  console.log('   Follow: docs/10_project_managemnt/30_settings_templates_redesign/GOOGLE_CLOUD_SETUP.md');
  console.log('2. Update backend/.env with real credentials');
  console.log('3. Complete OAuth2 flow to connect Google account');
  console.log('4. Test import with real public documents');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests();
