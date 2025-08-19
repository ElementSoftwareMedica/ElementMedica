const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.person.findUnique({
      where: { email: 'laura.dipendente@example.com' },
      include: { personRoles: true }
    });
    
    if (user) {
      console.log('✅ Utente trovato:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles: user.personRoles.map(r => r.roleType)
      });
    } else {
      console.log('❌ Utente laura.dipendente@example.com NON trovato');
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();