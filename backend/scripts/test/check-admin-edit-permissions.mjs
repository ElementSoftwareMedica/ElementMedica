import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminPermissions() {
  try {
    // Trova l'admin
    const admin = await prisma.person.findFirst({
      where: { email: 'admin@example.com' },
      include: {
        personRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    if (!admin) {
      console.log('❌ Admin not found');
      return;
    }
    
    console.log('🔍 Admin permissions analysis:');
    console.log('==============================');
    
    // Raccogli tutti i permessi
    const allPermissions = new Set();
    admin.personRoles.forEach(personRole => {
      personRole.role.rolePermissions.forEach(rp => {
        if (rp.isGranted && !rp.deletedAt) {
          allPermissions.add(rp.permission.name);
        }
      });
    });
    
    const permissionsArray = Array.from(allPermissions).sort();
    
    // Filtra permessi CMS, FORM_TEMPLATES e FORM_SUBMISSIONS
    const cmsPermissions = permissionsArray.filter(p => 
      p.includes('CMS') || p.includes('PUBLIC')
    );
    const formTemplatePermissions = permissionsArray.filter(p => 
      p.includes('FORM_TEMPLATE')
    );
    const formSubmissionPermissions = permissionsArray.filter(p => 
      p.includes('FORM_SUBMISSION') || p.includes('SUBMISSION')
    );
    
    console.log('📋 CMS Permissions:');
    cmsPermissions.forEach(p => console.log('  ✅', p));
    
    console.log('\n📋 Form Template Permissions:');
    formTemplatePermissions.forEach(p => console.log('  ✅', p));
    
    console.log('\n📋 Form Submission Permissions:');
    formSubmissionPermissions.forEach(p => console.log('  ✅', p));
    
    // Verifica permessi EDIT mancanti
    console.log('\n🔍 Missing EDIT permissions:');
    const missingPermissions = [];
    
    if (!allPermissions.has('EDIT_PUBLIC_CMS')) {
      missingPermissions.push('EDIT_PUBLIC_CMS');
    }
    if (!allPermissions.has('EDIT_FORM_TEMPLATES')) {
      missingPermissions.push('EDIT_FORM_TEMPLATES');
    }
    if (!allPermissions.has('EDIT_FORM_SUBMISSIONS')) {
      missingPermissions.push('EDIT_FORM_SUBMISSIONS');
    }
    
    if (missingPermissions.length > 0) {
      console.log('❌ Missing permissions:');
      missingPermissions.forEach(p => console.log('  -', p));
      
      // Verifica se questi permessi esistono nel database
      console.log('\n🔍 Checking if missing permissions exist in database:');
      for (const permName of missingPermissions) {
        const permission = await prisma.permission.findFirst({
          where: { name: permName }
        });
        if (permission) {
          console.log(`  ✅ ${permName} exists in database (ID: ${permission.id})`);
        } else {
          console.log(`  ❌ ${permName} does NOT exist in database`);
        }
      }
    } else {
      console.log('✅ All EDIT permissions are present');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminPermissions();