#!/usr/bin/env node

/**
 * Test Login Script
 * Verifica funzionalità login dopo ottimizzazione backend
 */

const https = require('https');
const http = require('http');

const testLogin = async () => {
  console.log('🔍 Testing login functionality...');
  
  const postData = JSON.stringify({
    identifier: 'admin@example.com',
    password: 'Admin123!'
  });
  
  const options = {
    hostname: 'localhost',
    port: 4001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 Status Code: ${res.statusCode}`);
        console.log(`📋 Headers:`, res.headers);
        
        try {
          const response = JSON.parse(data);
          console.log(`✅ Response:`, response);
          
          if (res.statusCode === 200 && response.token) {
            console.log('🎉 Login test PASSED!');
            resolve(true);
          } else {
            console.log('❌ Login test FAILED!');
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Invalid JSON response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
};

const testHealthCheck = async () => {
  console.log('\n🔍 Testing health check...');
  
  const options = {
    hostname: 'localhost',
    port: 4001,
    path: '/healthz',
    method: 'GET'
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 Health Check Status: ${res.statusCode}`);
        
        try {
          const response = JSON.parse(data);
          console.log(`✅ Health Response:`, response);
          
          if (res.statusCode === 200) {
            console.log('🎉 Health check PASSED!');
            resolve(true);
          } else {
            console.log('❌ Health check FAILED!');
            resolve(false);
          }
        } catch (error) {
          console.log('❌ Invalid JSON response:', data);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Health check error:', error.message);
      resolve(false);
    });
    
    req.end();
  });
};

const main = async () => {
  console.log('🚀 Starting Backend Optimization Tests\n');
  
  const loginResult = await testLogin();
  const healthResult = await testHealthCheck();
  
  console.log('\n📋 Test Summary:');
  console.log(`- Login Test: ${loginResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`- Health Check: ${healthResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (loginResult && healthResult) {
    console.log('\n🎉 All tests PASSED! Backend optimization successful.');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests FAILED! Check server configuration.');
    process.exit(1);
  }
};

main().catch(console.error);