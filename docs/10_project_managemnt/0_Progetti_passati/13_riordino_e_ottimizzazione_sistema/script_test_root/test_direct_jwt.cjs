// Test JWT verification directly without going through the middleware
const axios = require('axios');

async function testDirectJWT() {
  console.log('🔍 Testing JWT verification directly...');
  
  try {
    // Step 1: Login to get token
    console.log('\n📝 Step 1: Performing login...');
    const loginResponse = await axios.post('http://localhost:4001/api/v1/auth/login', {
      email: 'mario.rossi@acme-corp.com',
      password: 'Password123!'
    }, {
      timeout: 5000,
      withCredentials: true
    });
    
    console.log('✅ Login successful');
    
    // Extract token from cookie
    const cookies = loginResponse.headers['set-cookie'];
    const accessTokenCookie = cookies?.find(cookie => cookie.startsWith('accessToken='));
    
    if (!accessTokenCookie) {
      console.error('❌ No access token cookie found');
      return;
    }
    
    const accessToken = accessTokenCookie.split('=')[1].split(';')[0];
    console.log(`🔑 Access token extracted, length: ${accessToken.length}`);
    
    // Step 2: Test JWT verification directly using the backend JWT service
    console.log('\n📝 Step 2: Testing direct JWT verification...');
    
    const { JWTService } = await import('./backend/auth/jwt.js');
    
    const startTime = Date.now();
    try {
      const decoded = JWTService.verifyAccessToken(accessToken);
      const verifyTime = Date.now() - startTime;
      console.log(`✅ JWT verification successful in ${verifyTime}ms`);
      console.log('👤 Decoded payload:', {
        userId: decoded.userId,
        email: decoded.email,
        audience: decoded.aud,
        issuer: decoded.iss,
        expiry: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (jwtError) {
      const verifyTime = Date.now() - startTime;
      console.error(`❌ JWT verification failed after ${verifyTime}ms:`, jwtError.message);
      return;
    }
    
    // Step 3: Test database query directly
    console.log('\n📝 Step 3: Testing database query directly...');
    
    const { createOptimizedPrismaClient } = await import('./backend/config/prisma-optimization.js');
    const prisma = createOptimizedPrismaClient();
    
    const dbStartTime = Date.now();
    try {
      const decoded = JWTService.verifyAccessToken(accessToken);
      
      const person = await prisma.person.findUnique({
        where: { id: decoded.userId || decoded.personId }
      });
      
      const dbTime = Date.now() - dbStartTime;
      console.log(`✅ Database query successful in ${dbTime}ms`);
      
      if (person) {
        console.log(`👤 Found person: ${person.email}`);
      } else {
        console.log('❌ Person not found');
      }
      
    } catch (dbError) {
      const dbTime = Date.now() - dbStartTime;
      console.error(`❌ Database query failed after ${dbTime}ms:`, dbError.message);
    } finally {
      await prisma.$disconnect();
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timed out');
    }
  }
}

// Run the test
testDirectJWT();