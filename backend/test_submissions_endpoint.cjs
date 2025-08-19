const axios = require('axios');

const API_BASE_URL = 'http://localhost:4001';

async function testSubmissionsEndpoint() {
  try {
    console.log('🔐 Login come admin...');
    
    // 1. Login
    const loginResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // 2. Test endpoint senza filtri
    console.log('\n📋 Test endpoint submissions senza filtri...');
    const submissionsResponse = await axios.get(`${API_BASE_URL}/api/v1/submissions/advanced`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Submissions trovate: ${submissionsResponse.data.data.length}`);
    console.log(`📄 Totale: ${submissionsResponse.data.pagination.total}`);
    
    if (submissionsResponse.data.data.length > 0) {
      console.log('\n📝 Prime 3 submissions:');
      submissionsResponse.data.data.slice(0, 3).forEach((submission, index) => {
        console.log(`${index + 1}. ID: ${submission.id.slice(-8)}`);
        console.log(`   Type: ${submission.type}`);
        console.log(`   Source: ${submission.source}`);
        console.log(`   Status: ${submission.status}`);
        console.log(`   Email: ${submission.email || 'N/A'}`);
        console.log('');
      });
    }

    // 3. Test endpoint con filtro type=CONTACT
    console.log('\n📋 Test endpoint submissions con type=CONTACT...');
    const contactSubmissionsResponse = await axios.get(`${API_BASE_URL}/api/v1/submissions/advanced?type=CONTACT`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Submissions CONTACT trovate: ${contactSubmissionsResponse.data.data.length}`);
    console.log(`📄 Totale CONTACT: ${contactSubmissionsResponse.data.pagination.total}`);

    // 4. Test endpoint con filtro source=public_website
    console.log('\n📋 Test endpoint submissions con source=public_website...');
    const publicSubmissionsResponse = await axios.get(`${API_BASE_URL}/api/v1/submissions/advanced?source=public_website`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Submissions public_website trovate: ${publicSubmissionsResponse.data.data.length}`);
    console.log(`📄 Totale public_website: ${publicSubmissionsResponse.data.pagination.total}`);

  } catch (error) {
    console.error('❌ Errore:', error.response?.data || error.message);
  }
}

testSubmissionsEndpoint();