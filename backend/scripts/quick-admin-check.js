/**
 * Script semplice per verificare i permessi dell'admin
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function quickCheck() {
  try {
    // Trova l'admin
    const admin = await prisma.person.findUnique({
      where: { email: 'admin@example.com' },
      select: {
        id: true,
        email: true,
        roles: {
          where: { isActive: true },
          select: {
            id: true,
            roleType: true,
            permissions: {
              where: { isGranted: true },
              select: { permission: true }
            }
          }
        }
      }
    });
    
    if (!admin) {
      console.log('Admin not found');
      return;
    }
    
    console.log('Admin found:', admin.email);
    console.log('Roles:', admin.roles.length);
    
    const adminRole = admin.roles.find(r => r.roleType === 'ADMIN');
    if (adminRole) {
      console.log('Admin role permissions:', adminRole.permissions.length);
      console.log('Has ROLE_MANAGEMENT:', adminRole.permissions.some(p => p.permission === 'ROLE_MANAGEMENT'));
      console.log('Has VIEW_ROLES:', adminRole.permissions.some(p => p.permission === 'VIEW_ROLES'));
    } else {
      console.log('No ADMIN role found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();