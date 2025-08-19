#!/usr/bin/env node

/**
 * Test per verificare il login dell'utente admin
 * Testa le credenziali dell'utente admin nel database
 */

import fetch from 'node-fetch';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const testAdminCredentials = async () => {
  try {
    console.log('🔍 Checking admin user in database...');
    
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        globalRole: true,
        isActive: true
      }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found in database');
      return false;
    }
    
    console.log('✅ Admin user found:', {
      id: admin.id,
      email: admin.email,
      username: admin.username,
      globalRole: admin.globalRole,
      isActive: admin.isActive,
      hasPassword: !!admin.password
    });
    
    // Test common admin passwords
    const testPasswords = ['admin', 'admin123', 'password', 'test123', '123456'];
    
    for (const password of testPasswords) {
      try {
        const isValid = await bcrypt.compare(password, admin.password);
        if (isValid) {
          console.log(`✅ Found valid password: ${password}`);
          return { email: admin.email, password };
        }
      } catch (error) {
        console.log(`⚠️  Error testing password '${password}': ${error.message}`);
      }
    }
    
    console.log('❌ No valid password found among common passwords');
    return false;
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return false;
  }
};

const testLoginEndpoint = async (credentials) => {
  if (!credentials) {
    console.log('⚠️  Skipping login test - no valid credentials found');
    return false;
  }
  
  try {
    console.log('\n🔍 Testing login endpoint with found credentials...');
    
    const response = await fetch('http://127.0.0.1:4003/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify(credentials)
    });
    
    console.log(`📊 Login response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login successful!');
      console.log('📊 Response data:', {
        hasToken: !!data.token,
        hasUser: !!data.user,
        userRole: data.user?.globalRole
      });
      return true;
    } else {
      const errorData = await response.text();
      console.log('❌ Login failed:', errorData);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Login test failed: ${error.message}`);
    return false;
  }
};

const runAdminTest = async () => {
  console.log('🚀 Starting admin login test...\n');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    const credentials = await testAdminCredentials();
    const loginSuccess = await testLoginEndpoint(credentials);
    
    await prisma.$disconnect();
    console.log('\n✅ Database disconnected');
    
    console.log('\n📊 Admin Test Results:');
    console.log('======================');
    console.log(`Database User: ${credentials ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`Login Test: ${loginSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (credentials && loginSuccess) {
      console.log('\n🎉 Admin login is working correctly!');
      console.log(`📧 Email: ${credentials.email}`);
      console.log(`🔑 Password: ${credentials.password}`);
    } else {
      console.log('\n⚠️  Admin login needs to be fixed.');
    }
    
    return loginSuccess;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    await prisma.$disconnect();
    return false;
  }
};

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAdminTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export default runAdminTest;