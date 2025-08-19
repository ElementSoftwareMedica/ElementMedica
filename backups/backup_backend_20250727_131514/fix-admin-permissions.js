const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAdminPermissions() {
    try {
        console.log('🔍 Checking admin user permissions...');
        
        // Find admin user
        const admin = await prisma.person.findUnique({
            where: { email: 'admin@example.com' },
            include: {
                personRoles: {
                    where: { isActive: true },
                    include: {
                        permissions: true,
                        customRole: {
                            include: {
                                permissions: true
                            }
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
        console.log(`📋 Current roles: ${admin.personRoles.length}`);

        // Check if admin has SUPER_ADMIN role
        const superAdminRole = admin.personRoles.find(pr => pr.roleType === 'SUPER_ADMIN');
        
        if (!superAdminRole) {
            console.log('⚠️  Admin does not have SUPER_ADMIN role. Creating one...');
            
            // Create SUPER_ADMIN role for admin
            const newRole = await prisma.personRole.create({
                data: {
                    personId: admin.id,
                    roleType: 'SUPER_ADMIN',
                    isActive: true,
                    isPrimary: true,
                    companyId: admin.companyId,
                    tenantId: admin.tenantId,
                    permissions: {
                        create: [
                            // Permessi per Persons (entità unificata)
                            { permission: 'VIEW_PERSONS', isGranted: true },
                            { permission: 'CREATE_PERSONS', isGranted: true },
                            { permission: 'EDIT_PERSONS', isGranted: true },
                            { permission: 'DELETE_PERSONS', isGranted: true },
                            // Permessi per Employees
                            { permission: 'VIEW_EMPLOYEES', isGranted: true },
                            { permission: 'CREATE_EMPLOYEES', isGranted: true },
                            { permission: 'EDIT_EMPLOYEES', isGranted: true },
                            { permission: 'DELETE_EMPLOYEES', isGranted: true },
                            // Permessi per Trainers
                            { permission: 'VIEW_TRAINERS', isGranted: true },
                            { permission: 'CREATE_TRAINERS', isGranted: true },
                            { permission: 'EDIT_TRAINERS', isGranted: true },
                            { permission: 'DELETE_TRAINERS', isGranted: true },
                            // Permessi per Companies
                            { permission: 'VIEW_COMPANIES', isGranted: true },
                            { permission: 'CREATE_COMPANIES', isGranted: true },
                            { permission: 'EDIT_COMPANIES', isGranted: true },
                            { permission: 'DELETE_COMPANIES', isGranted: true },
                            // Permessi per Courses
                            { permission: 'VIEW_COURSES', isGranted: true },
                            { permission: 'CREATE_COURSES', isGranted: true },
                            { permission: 'EDIT_COURSES', isGranted: true },
                            { permission: 'DELETE_COURSES', isGranted: true },
                            // Permessi per Users
                            { permission: 'VIEW_USERS', isGranted: true },
                            { permission: 'CREATE_USERS', isGranted: true },
                            { permission: 'EDIT_USERS', isGranted: true },
                            { permission: 'DELETE_USERS', isGranted: true },
                            // Permessi amministrativi
                            { permission: 'ADMIN_PANEL', isGranted: true },
                            { permission: 'SYSTEM_SETTINGS', isGranted: true },
                            { permission: 'USER_MANAGEMENT', isGranted: true },
                            { permission: 'ROLE_MANAGEMENT', isGranted: true },
                            { permission: 'TENANT_MANAGEMENT', isGranted: true }
                        ]
                    }
                },
                include: {
                    permissions: true
                }
            });
            
            console.log(`✅ Created SUPER_ADMIN role with ${newRole.permissions.length} permissions`);
        } else {
            console.log('✅ Admin already has SUPER_ADMIN role');
            
            // Check if the role has the necessary permissions
            const requiredPermissions = [
                'VIEW_PERSONS', 'CREATE_PERSONS', 'EDIT_PERSONS', 'DELETE_PERSONS',
                'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
                'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
                'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
                'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
                'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT'
            ];
            
            const existingPermissions = superAdminRole.permissions.map(p => p.permission);
            const missingPermissions = requiredPermissions.filter(p => !existingPermissions.includes(p));
            
            if (missingPermissions.length > 0) {
                console.log(`⚠️  Missing permissions: ${missingPermissions.join(', ')}`);
                console.log('🔧 Adding missing permissions...');
                
                for (const permission of missingPermissions) {
                    await prisma.personRolePermission.create({
                        data: {
                            personRoleId: superAdminRole.id,
                            permission: permission,
                            isGranted: true,
                            grantedBy: admin.id
                        }
                    });
                }
                
                console.log(`✅ Added ${missingPermissions.length} missing permissions`);
            } else {
                console.log('✅ All required permissions are present');
            }
        }

        // Verify final permissions
        const updatedAdmin = await prisma.person.findUnique({
            where: { id: admin.id },
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

        const allPermissions = updatedAdmin.personRoles.flatMap(pr => pr.permissions.map(p => p.permission));
        console.log(`\n📊 Final permissions count: ${allPermissions.length}`);
        console.log('🔑 Key permissions:');
        console.log(`   - VIEW_PERSONS: ${allPermissions.includes('VIEW_PERSONS') ? '✅' : '❌'}`);
        console.log(`   - VIEW_EMPLOYEES: ${allPermissions.includes('VIEW_EMPLOYEES') ? '✅' : '❌'}`);
        console.log(`   - VIEW_TRAINERS: ${allPermissions.includes('VIEW_TRAINERS') ? '✅' : '❌'}`);
        console.log(`   - VIEW_COURSES: ${allPermissions.includes('VIEW_COURSES') ? '✅' : '❌'}`);
        console.log(`   - CREATE_EMPLOYEES: ${allPermissions.includes('CREATE_EMPLOYEES') ? '✅' : '❌'}`);
        console.log(`   - CREATE_TRAINERS: ${allPermissions.includes('CREATE_TRAINERS') ? '✅' : '❌'}`);
        console.log(`   - ADMIN_PANEL: ${allPermissions.includes('ADMIN_PANEL') ? '✅' : '❌'}`);
        console.log(`   - VIEW_COMPANIES: ${allPermissions.includes('VIEW_COMPANIES') ? '✅' : '❌'}`);

        console.log('\n🎉 Admin permissions have been fixed!');
        
    } catch (error) {
        console.error('❌ Error fixing admin permissions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAdminPermissions();