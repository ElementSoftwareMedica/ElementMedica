const prisma = new PrismaClient();

(async () => {
  try {
    console.log('Checking admin user roles...');
    
    const person = await prisma.person.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        roles: true
      }
    });
    
    console.log('Person found:', !!person);
    if (person) {
      console.log('Person ID:', person.id);
      console.log('Person email:', person.email);
      console.log('Person roles (via include):', person.roles);
    }
    
    const roles = await prisma.personRole.findMany({
      where: {
        personId: person?.id
      }
    });
    
    console.log('PersonRole records:', roles);
    
    // Check if SUPER_ADMIN role exists
    const superAdminRoles = roles.filter(r => r.roleType === 'SUPER_ADMIN');
    console.log('SUPER_ADMIN roles:', superAdminRoles);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
})();