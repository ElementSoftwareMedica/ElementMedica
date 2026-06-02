import prisma from '../config/prisma-optimization.js';

const person = await prisma.person.findFirst({
    where: { OR: [{ username: { contains: 'davide', mode: 'insensitive' } }, { firstName: { contains: 'davide', mode: 'insensitive' } }] },
    include: {
        personRoles: { where: { deletedAt: null, isActive: true }, select: { roleType: true, tenantId: true, customRoleId: true } },
        tenantProfiles: { where: { deletedAt: null }, select: { tenantId: true, status: true, isPrimary: true, email: true } }
    }
});
console.log('Person:', JSON.stringify(person, null, 2));

// Check what permission tenants:read requires on the tenants route
await prisma.$disconnect();
