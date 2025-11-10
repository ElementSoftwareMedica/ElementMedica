#!/usr/bin/env node

const http = require('http');

// Login
const loginData = JSON.stringify({
  identifier: 'admin@example.com',
  password: 'Admin123!'
});

const loginOptions = {
  hostname: 'localhost',
  port: 4001,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('🔐 Logging in...');

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('❌ Login failed:', res.statusCode);
      console.error(data);
      process.exit(1);
    }
    
    const response = JSON.parse(data);
    const token = response.tokens.access_token;
    console.log('✅ Login successful');
    
    // Fetch templates
    console.log('\n📋 Fetching templates...');
    
    const templatesOptions = {
      hostname: 'localhost',
      port: 4001,
      path: '/api/v1/templates',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const templatesReq = http.request(templatesOptions, (templatesRes) => {
      let templatesData = '';
      
      templatesRes.on('data', (chunk) => {
        templatesData += chunk;
      });
      
      templatesRes.on('end', () => {
        if (templatesRes.statusCode !== 200) {
          console.error('❌ Templates fetch failed:', templatesRes.statusCode);
          console.error(templatesData);
          process.exit(1);
        }
        
        const templatesResponse = JSON.parse(templatesData);
        console.log('✅ Templates fetched successfully\n');
        console.log(`Total templates: ${templatesResponse.count}`);
        console.log('\nTemplates:');
        templatesResponse.data.forEach((template, i) => {
          console.log(`\n${i + 1}. ${template.name}`);
          console.log(`   ID: ${template.id}`);
          console.log(`   Type: ${template.type}`);
          console.log(`   Google Slides: ${template.googleSlidesId || 'N/A'}`);
          console.log(`   Created: ${new Date(template.createdAt).toLocaleString()}`);
        });
      });
    });
    
    templatesReq.on('error', (err) => {
      console.error('❌ Templates request error:', err.message);
      process.exit(1);
    });
    
    templatesReq.end();
  });
});

loginReq.on('error', (err) => {
  console.error('❌ Login request error:', err.message);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
