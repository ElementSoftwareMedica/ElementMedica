/**
 * Test di connettività tra proxy e server API
 * Verifica se il proxy può raggiungere il server API
 */

import axios from 'axios';
import net from 'net';

const API_HOST = '127.0.0.1';
const API_PORT = 4001;
const API_URL = `http://${API_HOST}:${API_PORT}`;

async function testConnectivity() {
  console.log('🔍 Testing connectivity between proxy and API server...');
  console.log('📍 API Host:', API_HOST);
  console.log('📍 API Port:', API_PORT);
  console.log('📍 API URL:', API_URL);
  console.log('\n' + '='.repeat(50));
  
  // Test 1: TCP Connection
  console.log('\n🔌 Testing TCP connection to API server...');
  try {
    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        console.log('✅ TCP connection successful!');
        socket.destroy();
        resolve();
      });
      
      socket.on('timeout', () => {
        console.log('❌ TCP connection timeout!');
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err) => {
        console.log('❌ TCP connection error:', err.message);
        reject(err);
      });
      
      socket.connect(API_PORT, API_HOST);
    });
  } catch (error) {
    console.log('🚨 TCP connection failed:', error.message);
  }
  
  // Test 2: HTTP Health Check
  console.log('\n🏥 Testing HTTP health endpoint...');
  try {
    const response = await axios.get(`${API_URL}/api/health`, {
      timeout: 5000
    });
    
    console.log('✅ HTTP health check successful!');
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', response.data);
    
  } catch (error) {
    console.log('❌ HTTP health check failed!');
    if (error.response) {
      console.log('📊 Status:', error.response.status);
    } else {
      console.log('🔍 Error:', error.message);
    }
  }
  
  // Test 3: Direct login test
  console.log('\n🔐 Testing direct login endpoint...');
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'Admin123!'
    }, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Direct login successful!');
    console.log('📊 Status:', response.status);
    console.log('📋 Has token:', !!response.data.accessToken);
    
  } catch (error) {
    console.log('❌ Direct login failed!');
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📋 Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('🔍 Error:', error.message);
    }
  }
  
  // Test 4: Test different host formats
  console.log('\n🌐 Testing different host formats...');
  const hosts = ['127.0.0.1', 'localhost'];
  
  for (const host of hosts) {
    try {
      console.log(`\n🔍 Testing ${host}:${API_PORT}...`);
      const response = await axios.get(`http://${host}:${API_PORT}/api/health`, {
        timeout: 3000
      });
      
      console.log(`✅ ${host} works! Status:`, response.status);
      
    } catch (error) {
      console.log(`❌ ${host} failed:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 CONNECTIVITY ANALYSIS:');
  console.log('- If TCP works but HTTP fails → API server issue');
  console.log('- If both TCP and HTTP work → Proxy configuration issue');
  console.log('- If TCP fails → API server not running on expected port');
  console.log('- If localhost works but 127.0.0.1 fails → DNS/host issue');
}

// Run the test
testConnectivity().catch(console.error);