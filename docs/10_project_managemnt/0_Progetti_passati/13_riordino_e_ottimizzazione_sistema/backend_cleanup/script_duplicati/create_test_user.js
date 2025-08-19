import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash della password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Crea l'utente
    const person = await prisma.person.create({
      data: {
        email: 'mario.rossi@example.com',
        firstName: 'Mario',
        lastName: 'Rossi',
        password: hashedPassword,
        isActive: true
      }
    });
    
    console.log('Test user created:', {
      id: person.id,
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName
    });
    
    // Crea anche un ruolo per l'utente
    await prisma.personRole.create({
      data: {
        personId: person.id,
        roleType: 'ADMIN'
      }
    });
    
    console.log('Admin role assigned to user');
    
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();