const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Get tenants
    const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true }
    });
    console.log('Tenants:', JSON.stringify(tenants, null, 2));

    // Create a person with MEDICO role in a DIFFERENT tenant (Element Medica)
    const elementMedicaTenant = tenants.find(t => t.name === 'Element Medica');
    if (!elementMedicaTenant) {
        console.log('Element Medica tenant not found');
        return;
    }

    console.log('\nCreating person in Element Medica tenant:', elementMedicaTenant.id);

    // Check if person with this taxCode already exists
    const existing = await prisma.person.findFirst({
        where: { taxCode: 'VRDBNN80A01H501Y' },
        include: { personRoles: true }
    });

    if (existing) {
        console.log('\nPerson already exists:', existing.id, '-', existing.firstName, existing.lastName);
        console.log('Current roles:');
        existing.personRoles.forEach(r => {
            console.log(`  - ${r.roleType} in tenant ${r.tenantId} (active: ${r.isActive})`);
        });
        return existing;
    } else {
        // Create person with MEDICO role in Element Medica
        const person = await prisma.person.create({
            data: {
                firstName: 'Bruno',
                lastName: 'Verdi',
                email: 'bruno.verdi@elementmedica.it',
                taxCode: 'VRDBNN80A01H501Y',
                tenantId: elementMedicaTenant.id,
                status: 'ACTIVE',
                personRoles: {
                    create: {
                        roleType: 'MEDICO',
                        isActive: true,
                        isPrimary: true,
                        tenantId: elementMedicaTenant.id,
                        validFrom: new Date()
                    }
                }
            },
            include: { personRoles: true }
        });
        console.log('\nCreated person:', person.id, '-', person.firstName, person.lastName);
        console.log('In tenant:', person.tenantId);
        console.log('With role:', person.personRoles[0].roleType, 'in tenant:', person.personRoles[0].tenantId);
        return person;
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
