const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const persons = await prisma.person.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      }
    });
    
    console.log('Persons in database:');
    console.log(JSON.stringify(persons, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();