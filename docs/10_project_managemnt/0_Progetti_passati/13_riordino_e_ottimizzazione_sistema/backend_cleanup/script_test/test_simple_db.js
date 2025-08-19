import { JWTService } from './auth/jwt.js';

// Client Prisma semplice senza middleware
const simplePrisma = new PrismaClient();

async function testSimpleDB() {
    try {
        console.log('🔍 Testing simple database connection...');
        
        // Test connessione base
        console.log('📡 Testing basic connection...');
        const connectionTest = await simplePrisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Connection test:', connectionTest);
        
        // Test accesso diretto alla tabella persons
        console.log('🔍 Testing direct persons table access...');
        const personQuery = await simplePrisma.$queryRaw`
            SELECT id, email, username, "isActive", "deletedAt", password
            FROM persons 
            WHERE email = 'mario.rossi@acme-corp.com'
        `;
        console.log('📊 Person query result:', personQuery);
        
        if (personQuery.length > 0) {
            const person = personQuery[0];
            console.log('👤 Person found:', {
                id: person.id,
                email: person.email,
                username: person.username,
                isActive: person.status === 'ACTIVE',
                deletedAt: person.deletedAt,
                hasPassword: !!person.password
            });
            
            // Test JWT generation e verification
            console.log('🔍 Testing JWT with found user...');
            const testPayload = {
                userId: person.id,
                personId: person.id,
                email: person.email,
                username: person.username
            };
            
            const startJWT = Date.now();
            const token = JWTService.generateAccessToken(testPayload);
            const endJWT = Date.now();
            console.log('✅ JWT generated in', endJWT - startJWT, 'ms');
            
            const startVerify = Date.now();
            const decoded = JWTService.verifyAccessToken(token);
            const endVerify = Date.now();
            console.log('✅ JWT verified in', endVerify - startVerify, 'ms');
            console.log('📄 Decoded payload:', decoded);
            
            // Test query con user ID dal token
            console.log('🔍 Testing query with token user ID...');
            const startUserQuery = Date.now();
            const userFromToken = await simplePrisma.$queryRaw`
                SELECT id, email, username, "isActive", "deletedAt"
                FROM persons 
                WHERE id = ${decoded.userId || decoded.personId}
            `;
            const endUserQuery = Date.now();
            console.log('✅ User query completed in', endUserQuery - startUserQuery, 'ms');
            console.log('👤 User from token:', userFromToken);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('📋 Stack trace:', error.stack);
    } finally {
        await simplePrisma.$disconnect();
    }
}

testSimpleDB();