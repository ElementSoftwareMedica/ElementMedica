const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserPassword() {
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
        personRoles: {
          select: {
            roleType: true
          }
        }
      }
    });
    
    if (user) {
      console.log('✅ Utente trovato:', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0,
        roles: user.personRoles.map(r => r.roleType)
      });
      
      if (!user.password) {
        console.log('❌ PROBLEMA: L\'utente non ha una password impostata!');
      } else {
        console.log('✅ L\'utente ha una password impostata');
      }
    } else {
      console.log('❌ Utente laura.dipendente@example.com NON trovato');
    }
  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPassword();