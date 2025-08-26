const axios = require('axios');

async function testAdvancedEndpoint() {
  try {
    console.log('🔍 Testing /api/v1/submissions/advanced endpoint...\n');
    
    // 1. Login to get token
    console.log('1. 🔐 Login...');
    const loginResponse = await axios.post('http://localhost:4001/api/v1/auth/login', {
      identifier: 'admin@example.com',
      password: 'Admin123!'
    });
    
    const { accessToken } = loginResponse.data;
    console.log('✅ Login successful');
    
    // 2. Test endpoint without filters
    console.log('\n2. 📊 Testing /api/v1/submissions/advanced (no filters)...');
    try {
      const response = await axios.get('http://localhost:4003/api/v1/submissions/advanced', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Endpoint successful');
      console.log(`📊 Total submissions: ${response.data.pagination.total}`);
      console.log(`📄 Submissions returned: ${response.data.data.length}`);
      
      // Analizza le submissions per tipo e source
      const submissions = response.data.data;
      const byType = {};
      const bySource = {};
      
      submissions.forEach(sub => {
        byType[sub.type] = (byType[sub.type] || 0) + 1;
        bySource[sub.source] = (bySource[sub.source] || 0) + 1;
      });
      
      console.log('\n📈 Breakdown by type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      
      console.log('\n📈 Breakdown by source:');
      Object.entries(bySource).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });
      
      // Mostra le prime 3 submissions pubbliche se presenti
      const publicSubmissions = submissions.filter(sub => sub.source === 'public_website');
      if (publicSubmissions.length > 0) {
        console.log('\n🌐 Prime 3 submissions pubbliche:');
        publicSubmissions.slice(0, 3).forEach((sub, index) => {
          console.log(`   ${index + 1}. ${sub.name} (${sub.email}) - ${sub.type} - ${sub.createdAt}`);
        });
      } else {
        console.log('\n❌ Nessuna submission pubblica trovata nell\'endpoint');
      }
      
    } catch (error) {
      console.log('❌ Endpoint failed');
      console.log('📊 Status:', error.response?.status);
      console.log('📄 Error:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // 3. Test endpoint with type=CONTACT filter
    console.log('\n3. 📊 Testing /api/v1/submissions/advanced?type=CONTACT...');
    try {
      const response = await axios.get('http://localhost:4003/api/v1/submissions/advanced?type=CONTACT', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Endpoint with type=CONTACT successful');
      console.log(`📊 Total CONTACT submissions: ${response.data.pagination.total}`);
      console.log(`📄 CONTACT submissions returned: ${response.data.data.length}`);
      
      // Analizza le submissions CONTACT per source
      const submissions = response.data.data;
      const bySource = {};
      
      submissions.forEach(sub => {
        bySource[sub.source] = (bySource[sub.source] || 0) + 1;
      });
      
      console.log('\n📈 CONTACT submissions by source:');
      Object.entries(bySource).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });
      
    } catch (error) {
      console.log('❌ Endpoint with type=CONTACT failed');
      console.log('📊 Status:', error.response?.status);
      console.log('📄 Error:', JSON.stringify(error.response?.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdvancedEndpoint();