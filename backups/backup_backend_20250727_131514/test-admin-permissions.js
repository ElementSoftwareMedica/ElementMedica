import { PrismaClient } from '@prisma/client';
import { RBACService } from './middleware/rbac.js';
import logger from './utils/logger.js';

const prisma = new PrismaClient();

async function testAdminPermissions() {
    try {
        console.log('🔍 Testing admin permissions...\n');
        
        // Find admin user
        const admin = await prisma.person.findUnique({
            where: { email: 'admin@example.com' },
            include: {
                personRoles: {
                    where: { isActive: true },
                    include: {
                        permissions: {
                            where: { isGranted: true }
                        }
                    }
                }
            }
        });

        if (!admin) {
            console.log('❌ Admin user not found');
            return;
        }

        console.log(`✅ Found admin user: ${admin.email} (ID: ${admin.id})`);
        console.log(`📋 Active roles: ${admin.personRoles.length}`);

        // Show all permissions from database
        const allPermissions = admin.personRoles.flatMap(pr => pr.permissions.map(p => p.permission));
        console.log(`\n📊 Database permissions (${allPermissions.length}):`);
        allPermissions.forEach(permission => {
            console.log(`   - ${permission}`);
        });

        // Test RBAC mapping
        console.log('\n🔄 Testing RBAC permission mapping...');
        const mappedPermissions = await RBACService.getPersonPermissions(admin.id);
        
        console.log(`\n📋 Mapped permissions (${Object.keys(mappedPermissions).length}):`);
        Object.keys(mappedPermissions).forEach(permission => {
            console.log(`   - ${permission}: ${mappedPermissions[permission]}`);
        });

        // Test specific permissions needed for employees and trainers
        console.log('\n🧪 Testing specific permissions...');
        
        const testPermissions = [
            'read:employees',
            'create:employees', 
            'edit:employees',
            'delete:employees',
            'read:trainers',
            'create:trainers',
            'edit:trainers', 
            'delete:trainers',
            'companies:read',
            'courses:read',
            'persons:read',
            'persons:view_employees',
            'persons:view_trainers'
        ];

        for (const permission of testPermissions) {
            const hasPermission = await RBACService.hasPermission(admin.id, permission);
            console.log(`   - ${permission}: ${hasPermission ? '✅' : '❌'}`);
        }

        console.log('\n🎯 Summary:');
        const hasEmployeesRead = await RBACService.hasPermission(admin.id, 'read:employees');
        const hasTrainersRead = await RBACService.hasPermission(admin.id, 'read:trainers');
        const hasCompaniesRead = await RBACService.hasPermission(admin.id, 'companies:read');
        const hasCoursesRead = await RBACService.hasPermission(admin.id, 'courses:read');

        console.log(`   - Can access employees: ${hasEmployeesRead ? '✅' : '❌'}`);
        console.log(`   - Can access trainers: ${hasTrainersRead ? '✅' : '❌'}`);
        console.log(`   - Can access companies: ${hasCompaniesRead ? '✅' : '❌'}`);
        console.log(`   - Can access courses: ${hasCoursesRead ? '✅' : '❌'}`);

        if (!hasEmployeesRead || !hasTrainersRead) {
            console.log('\n⚠️  Missing permissions detected! Running fix...');
            
            // Check if admin has the backend permissions
            const hasViewEmployees = allPermissions.includes('VIEW_EMPLOYEES');
            const hasViewTrainers = allPermissions.includes('VIEW_TRAINERS');
            const hasViewPersons = allPermissions.includes('VIEW_PERSONS');
            
            console.log(`\n🔍 Backend permissions check:`);
            console.log(`   - VIEW_EMPLOYEES: ${hasViewEmployees ? '✅' : '❌'}`);
            console.log(`   - VIEW_TRAINERS: ${hasViewTrainers ? '✅' : '❌'}`);
            console.log(`   - VIEW_PERSONS: ${hasViewPersons ? '✅' : '❌'}`);
            
            if (!hasViewEmployees || !hasViewTrainers || !hasViewPersons) {
                console.log('\n❌ Backend permissions missing! Please run fix-admin-permissions.js');
            } else {
                console.log('\n🤔 Backend permissions exist but mapping failed. Check RBAC mapping logic.');
            }
        } else {
            console.log('\n🎉 All permissions are correctly configured!');
        }
        
    } catch (error) {
        console.error('❌ Error testing admin permissions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testAdminPermissions();