/**
 * Script semplificato per creare l'utente admin
 */

import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        console.log('🚀 Starting admin creation...');
        
        // 1. Crea tenant di default
        console.log('📋 Creating default tenant...');
        let tenant = await prisma.tenant.findFirst({
            where: { slug: 'global' }
        });

        if (!tenant) {
            tenant = await prisma.tenant.create({
                data: {
                    name: 'Global Tenant',
                    slug: 'global',
                    domain: 'global.example.com',
                    settings: {},
                    billingPlan: 'enterprise',
                    maxUsers: 1000,
                    maxCompanies: 100,
                    isActive: true
                }
            });
            console.log('✓ Tenant created');
        } else {
            console.log('✓ Tenant already exists');
        }

        // 2. Crea utente admin
        console.log('👤 Creating admin user...');
        const hashedPassword = await bcrypt.hash('Admin123!', 12);
        
        let adminPerson = await prisma.person.findUnique({
            where: { email: 'admin@example.com' }
        });

        if (!adminPerson) {
            adminPerson = await prisma.person.create({
                data: {
                    firstName: 'Admin',
                    lastName: 'User',
                    email: 'admin@example.com',
                    password: hashedPassword,
                    status: 'ACTIVE',
                    globalRole: 'ADMIN',
                    tenantId: tenant.id,
                    gdprConsentDate: new Date(),
                    gdprConsentVersion: '1.0'
                }
            });
            console.log('✓ Admin user created');
        } else {
            adminPerson = await prisma.person.update({
                where: { id: adminPerson.id },
                data: {
                    password: hashedPassword,
                    globalRole: 'ADMIN',
                    status: 'ACTIVE',
                    tenantId: tenant.id
                }
            });
            console.log('✓ Admin user updated');
        }

        // 3. Crea ruolo admin
        console.log('🏗️ Creating admin role...');
        
        // Rimuovi ruoli esistenti
        await prisma.personRole.deleteMany({
            where: { personId: adminPerson.id }
        });

        const adminRole = await prisma.personRole.create({
            data: {
                personId: adminPerson.id,
                roleType: 'ADMIN',
                level: 2,
                path: '1.2',
                isActive: true,
                isPrimary: true,
                tenantId: tenant.id,
                assignedBy: adminPerson.id
            }
        });
        console.log('✓ Admin role created');

        console.log('✅ Admin setup completed successfully!');
        console.log('Email: admin@example.com');
        console.log('Password: Admin123!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();