// Usa il client Prisma dal backend
const path = require('path');
const backendPath = path.join(__dirname, '../../../backend');
process.chdir(backendPath);

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testDatabaseQueries() {
  console.log('🔍 === TEST DATABASE QUERIES ===\n');

  try {
    const userId = 'bad5b563-b7ba-4ed2-8f23-22ed2ab5f90f';
    
    console.log('📝 Step 1: Testing Person query...');
    const startTime1 = Date.now();
    
    const person = await prisma.person.findUnique({
      where: { id: userId }
    });
    
    const endTime1 = Date.now();
    console.log(`⏱️ Person query completed in ${endTime1 - startTime1}ms`);
    
    if (person) {
      console.log('✅ Person found:');
      console.log('  - ID:', person.id);
      console.log('  - Email:', person.email);
      console.log('  - Username:', person.username);
    } else {
      console.log('❌ Person not found');
      return;
    }

    console.log('\n📝 Step 2: Testing PersonRole query...');
    const startTime2 = Date.now();
    
    const personRoles = await prisma.personRole.findMany({
      where: {
        personId: userId,
        isActive: true
      }
    });
    
    const endTime2 = Date.now();
    console.log(`⏱️ PersonRole query completed in ${endTime2 - startTime2}ms`);
    console.log('🔍 PersonRoles found:', personRoles.length);
    
    if (personRoles.length > 0) {
      console.log('✅ PersonRoles:');
      personRoles.forEach((role, index) => {
        console.log(`  ${index + 1}. Role: ${role.roleType}, Active: ${role.isActive}, Primary: ${role.isPrimary}`);
      });
    } else {
      console.log('❌ No PersonRoles found for user');
      
      // Check if there are any PersonRoles at all
      console.log('\n📝 Step 3: Checking all PersonRoles in database...');
      const allRoles = await prisma.personRole.findMany({
        take: 10
      });
      console.log('🔍 Total PersonRoles in database:', allRoles.length);
      
      if (allRoles.length > 0) {
        console.log('📋 Sample PersonRoles:');
        allRoles.forEach((role, index) => {
          console.log(`  ${index + 1}. PersonID: ${role.personId}, Role: ${role.roleType}, Active: ${role.isActive}`);
        });
      }
    }

    // Test role determination logic
    console.log('\n📝 Step 4: Testing role determination logic...');
    let userRole = 'EMPLOYEE';
    
    if (personRoles.some(pr => pr.roleType === 'SUPER_ADMIN')) {
      userRole = 'SUPER_ADMIN';
    } else if (personRoles.some(pr => pr.roleType === 'ADMIN')) {
      userRole = 'ADMIN';
    } else if (personRoles.some(pr => pr.roleType === 'COMPANY_ADMIN')) {
      userRole = 'COMPANY_ADMIN';
    } else if (personRoles.length > 0) {
      userRole = personRoles[0].roleType;
    }
    
    console.log('🔍 Determined user role:', userRole);
    
    // Test permission mapping
    console.log('\n📝 Step 5: Testing permission mapping...');
    const permissionMap = {};
    
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      permissionMap['companies:read'] = true;
      permissionMap['employees:read'] = true;
      permissionMap['courses:read'] = true;
      permissionMap['gdpr:admin'] = true;
    }
    
    console.log('🔍 Permission map created:', Object.keys(permissionMap).length, 'permissions');
    console.log('🔍 Sample permissions:', Object.keys(permissionMap).slice(0, 4));
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('❌ Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseQueries();