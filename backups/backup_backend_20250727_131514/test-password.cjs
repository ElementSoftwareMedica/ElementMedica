const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function testLogin() {
  try {
    // Test con password123 (quella che l'utente ha provato)
    console.log('🔍 Test login con password123...');
    const user1 = await prisma.person.findUnique({
      where: { email: 'laura.dipendente@example.com' }
    });
    
    if (user1) {
      const isValid1 = await bcrypt.compare('password123', user1.password);
      console.log('Password123 valida:', isValid1);
    }

    // Test con Password123! (quella corretta dal seeding)
    console.log('🔍 Test login con Password123!...');
    if (user1) {
      const isValid2 = await bcrypt.compare('Password123!', user1.password);
      console.log('Password123! valida:', isValid2);
    }

    // Mostra hash della password per debug
    console.log('Hash password nel DB:', user1?.password?.substring(0, 20) + '...');

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();