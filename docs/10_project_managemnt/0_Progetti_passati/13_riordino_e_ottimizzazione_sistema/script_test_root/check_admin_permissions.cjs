const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminPermissions() {
  try {
    console.log('Checking admin permissions...');
    
    // Find admin user
    const adminUser = await prisma.person.findUnique({
      where: {
        email: 'admin@example.com'
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          },
          include: {
            permissions: {
              where: {
                isGranted: true
              }
            }
          }
        }
      }
    });

    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }

    console.log(`Found admin user: ${adminUser.email}`);
    console.log(`Active roles: ${adminUser.personRoles.length}`);

    // Check for companies permissions
    const companiesPermissions = [];
    adminUser.personRoles.forEach(role => {
      console.log(`Role: ${role.roleType}`);
      role.permissions.forEach(perm => {
        if (perm.permission.includes('COMPANIES')) {
          companiesPermissions.push(perm.permission);
        }
      });
    });

    console.log('Companies-related permissions:');
    if (companiesPermissions.length > 0) {
      companiesPermissions.forEach(perm => {
        console.log(`- ${perm}`);
      });
    } else {
      console.log('No companies permissions found');
    }

    // Check specifically for VIEW_COMPANIES
    const hasViewCompanies = companiesPermissions.includes('VIEW_COMPANIES');
    console.log(`\nHas VIEW_COMPANIES permission: ${hasViewCompanies}`);

  } catch (error) {
    console.error('Error checking permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminPermissions();