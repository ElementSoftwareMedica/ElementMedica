import prisma from "../config/prisma-optimization.js";

const roleCount = await prisma.personRole.count({ where: { deletedAt: null } });
const permCount = await prisma.personPermission.count({ where: { deletedAt: null } });
const roleTypes = await prisma.personRole.groupBy({ by: ['roleType'], where: { deletedAt: null }, _count: { id: true } });
const tenantFeatures = await prisma.tenantFeature.groupBy({ by: ['featureKey', 'isEnabled'], _count: { id: true } });
const tenantsWithFeatures = await prisma.tenantFeature.groupBy({ by: ['tenantId'], _count: { id: true } });

console.log(`PersonRoles (active): ${roleCount}`);
console.log(`PersonPermissions (active): ${permCount}`);
console.log('Roles by type:', JSON.stringify(roleTypes, null, 2));
console.log('TenantFeatures distribution:', JSON.stringify(tenantFeatures, null, 2));
console.log('Tenants with feature count:', JSON.stringify(tenantsWithFeatures, null, 2));

// Roles that should have permissions but don't
const shouldHavePerms = ['ADMIN', 'MEDICO', 'INFERMIERE', 'RECEPTIONIST', 'RSPP', 'ASPP', 'MEDICO_COMPETENTE', 'HR_MANAGER', 'MANAGER'];
const rolesWithNoPerms = await prisma.personRole.findMany({
    where: { deletedAt: null, roleType: { in: shouldHavePerms }, permissions: { none: {} } },
    select: { id: true, roleType: true, tenantId: true },
    take: 20
});
console.log(`\nRoles (${shouldHavePerms.join(',')}) missing permissions: ${rolesWithNoPerms.length}`);
if (rolesWithNoPerms.length > 0) console.log(JSON.stringify(rolesWithNoPerms.slice(0, 5), null, 2));

// Sample a role with permissions to verify structure
const sampleRole = await prisma.personRole.findFirst({
    where: { deletedAt: null, roleType: 'ADMIN', permissions: { some: {} } },
    include: { permissions: { take: 5, orderBy: { resource: 'asc' } } }
});
if (sampleRole) {
    console.log('\nSample ADMIN role permissions (first 5):');
    console.log(JSON.stringify(sampleRole.permissions.map(p => `${p.resource}:${p.action}`), null, 2));
}

await prisma.$disconnect();
