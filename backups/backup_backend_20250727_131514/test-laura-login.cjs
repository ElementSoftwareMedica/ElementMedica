const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function testLogin() {
  try {
    const user = await prisma.person.findUnique({
      where: { email: 'laura.dipendente@example.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        password: true,
        tenantId: true,
        companyId: true,
        personRoles: {
          select: {
            roleType: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Utente non trovato');
      return;
    }
    
    console.log('✅ Utente trovato:', {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      tenantId: user.tenantId,
      companyId: user.companyId,
      roles: user.personRoles.map(r => r.roleType)
    });
    
    if (!user.password) {
      console.log('❌ PROBLEMA: L\'utente non ha una password impostata!');
      return;
    }
    
    // Test della password
    const testPassword = 'Password123!';
    console.log(`🔍 Testing password: "${testPassword}"`);
    
    const isValidPassword = await bcrypt.compare(testPassword, user.password);
    
    if (isValidPassword) {
      console.log('✅ Password corretta!');
    } else {
      console.log('❌ Password NON corretta!');
      
      // Proviamo anche altre possibili password
      const possiblePasswords = ['password123', 'Password123', 'laura123', 'dipendente123'];
      
      for (const pwd of possiblePasswords) {
        const isValid = await bcrypt.compare(pwd, user.password);
        if (isValid) {
          console.log(`✅ Password corretta trovata: "${pwd}"`);
          return;
        }
      }
      
      console.log('❌ Nessuna delle password testate è corretta');
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();