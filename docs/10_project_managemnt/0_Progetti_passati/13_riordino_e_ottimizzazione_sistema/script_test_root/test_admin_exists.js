import { createOptimizedPrismaClient } from './backend/config/prisma-optimization.js';

const prisma = createOptimizedPrismaClient();

async function testAdminExists() {
    try {
        console.log('Testing admin user existence...');
        
        // Find admin user
        const admin = await prisma.person.findFirst({
            where: {
                OR: [
                    { email: 'admin@example.com' },
                    { username: 'admin@example.com' }
                ],
                deletedAt: null
            },
            include: {
                personRoles: {
                    where: { isActive: true },
                    include: {
                        permissions: true
                    }
                },
                company: true
            }
        });
        
        if (admin) {
            console.log('✅ Admin user found:');
            console.log('   ID:', admin.id);
            console.log('   Email:', admin.email);
            console.log('   Username:', admin.username);
            console.log('   Status:', admin.status);
            console.log('   Roles:', admin.personRoles.length);
            console.log('   Has password:', !!admin.password);
            
            // Check roles and permissions
            admin.personRoles.forEach(pr => {
                console.log(`   Role: ${pr.roleType} (${pr.permissions.length} permissions)`);
                pr.permissions.forEach(perm => {
                    console.log(`     - ${perm.permission}: ${perm.isGranted ? 'GRANTED' : 'DENIED'}`);
                });
            });
        } else {
            console.log('❌ Admin user not found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testAdminExists();