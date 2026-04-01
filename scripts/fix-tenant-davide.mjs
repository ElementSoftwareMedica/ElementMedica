import prisma from '../backend/config/prisma-optimization.js';
import { randomUUID as uuidv4 } from 'crypto';

// 1. Rinomina il tenant 939a5fd8 (altra azienda, non branch di Element srl)
const renamedTenant = await prisma.tenant.update({
    where: { id: '939a5fd8-1b2e-4357-9900-24fa5921a63e' },
    data: {
        name: 'Azienda Cliente Sicurezza',
        slug: 'cliente-sicurezza-a',
        domain: null
    }
});
console.log('Renamed tenant:', renamedTenant.name, renamedTenant.slug);

// 2. Controlla davide.denuzzo
const davide = await prisma.person.findFirst({
    where: { username: 'davide.denuzzo', deletedAt: null },
    include: {
        personRoles: { where: { isActive: true, deletedAt: null } },
        tenantProfiles: { where: { deletedAt: null } }
    }
});
console.log('davide.denuzzo id:', davide.id);
console.log('current roles:', JSON.stringify(davide.personRoles.map(r => ({ role: r.roleType, tenant: r.tenantId }))));
console.log('current profiles:', JSON.stringify(davide.tenantProfiles.map(p => ({ tenant: p.tenantId, primary: p.isPrimary }))));

// 3. Aggiungi TENANT_ADMIN role per davide su Element srl (6a8e68d7)
const elementSrlId = '6a8e68d7-1958-44d8-af50-2121f638db5c';
const existingTenantAdmin = davide.personRoles.find(r => r.roleType === 'TENANT_ADMIN' && r.tenantId === elementSrlId);
if (!existingTenantAdmin) {
    const newRole = await prisma.personRole.create({
        data: {
            id: uuidv4(),
            personId: davide.id,
            tenantId: elementSrlId,
            roleType: 'TENANT_ADMIN',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    console.log('CREATED TENANT_ADMIN role for davide.denuzzo on Element srl:', newRole.id);
} else {
    console.log('TENANT_ADMIN role already exists for davide.denuzzo');
}

// 4. Add PersonTenantAccess for davide on Element srl if not already existing
const existingAccess = await prisma.personTenantAccess.findFirst({
    where: { personId: davide.id, tenantId: elementSrlId, deletedAt: null }
});
if (!existingAccess) {
    const access = await prisma.personTenantAccess.create({
        data: {
            id: uuidv4(),
            personId: davide.id,
            tenantId: elementSrlId,
            accessLevel: 'FULL',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    console.log('CREATED PersonTenantAccess for davide.denuzzo on Element srl:', access.id);
} else {
    console.log('PersonTenantAccess already exists for davide.denuzzo on Element srl');
}

await prisma.$disconnect();
