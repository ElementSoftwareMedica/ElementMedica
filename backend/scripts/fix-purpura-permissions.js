/**
 * One-time script to add Purpura to Element Sicurezza tenant
 * Run: node scripts/fix-purpura-permissions.js
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const personId = '1d4dd4fb-96bd-4c54-9257-924a812c86e4';
    const sicurezzaTenantId = '939a5fd8-1b2e-4357-9900-24fa5921a63e';

    // Check if profile already exists
    const existing = await prisma.personTenantProfile.findFirst({
        where: { personId, tenantId: sicurezzaTenantId, deletedAt: null }
    });
    if (existing) {
        console.log('Profile already exists:', existing.id);
        await prisma.$disconnect();
        return;
    }

    // Get existing profile for reference (email, phone)
    const medicaProfile = await prisma.personTenantProfile.findFirst({
        where: { personId, deletedAt: null }
    });

    // Create profile for Element Sicurezza
    const profile = await prisma.personTenantProfile.create({
        data: {
            personId,
            tenantId: sicurezzaTenantId,
            email: medicaProfile?.email || null,
            phone: medicaProfile?.phone || null,
            status: 'ACTIVE',
            isActive: true,
            isPrimary: false
        }
    });
    console.log('Created PersonTenantProfile:', profile.id);

    // Create TENANT_ADMIN role
    const adminRole = await prisma.personRole.create({
        data: {
            personId,
            tenantId: sicurezzaTenantId,
            roleType: 'TENANT_ADMIN',
            isActive: true,
            isPrimary: true
        }
    });
    console.log('Created PersonRole TENANT_ADMIN:', adminRole.id);

    // Create MEDICO role (same as on Element srl)
    const medicoRole = await prisma.personRole.create({
        data: {
            personId,
            tenantId: sicurezzaTenantId,
            roleType: 'MEDICO',
            isActive: true,
            isPrimary: false
        }
    });
    console.log('Created PersonRole MEDICO:', medicoRole.id);

    console.log('Done! Purpura now has TENANT_ADMIN + MEDICO on Element Sicurezza');
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
