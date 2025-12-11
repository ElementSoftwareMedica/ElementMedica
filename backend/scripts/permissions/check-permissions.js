const prisma = new PrismaClient();

async function checkPermissions() {
  try {
    console.log('🔍 Checking permissions in database...');
    
    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log(`\n📊 Found ${permissions.length} permissions in database:`);
    permissions.forEach((perm, index) => {
      console.log(`${index + 1}. ${perm.name}`);
    });
    
    // Controlla quali permessi sono nella lista VALID_PERSON_PERMISSIONS
    const VALID_PERSON_PERMISSIONS = [
      'VIEW_COMPANIES', 'CREATE_COMPANIES', 'EDIT_COMPANIES', 'DELETE_COMPANIES',
      'VIEW_EMPLOYEES', 'CREATE_EMPLOYEES', 'EDIT_EMPLOYEES', 'DELETE_EMPLOYEES',
      'VIEW_TRAINERS', 'CREATE_TRAINERS', 'EDIT_TRAINERS', 'DELETE_TRAINERS',
      'VIEW_USERS', 'CREATE_USERS', 'EDIT_USERS', 'DELETE_USERS',
      'VIEW_COURSES', 'CREATE_COURSES', 'EDIT_COURSES', 'DELETE_COURSES',
      'MANAGE_ENROLLMENTS', 'VIEW_DOCUMENTS', 'CREATE_DOCUMENTS', 'EDIT_DOCUMENTS', 'DELETE_DOCUMENTS',
      'DOWNLOAD_DOCUMENTS', 'ADMIN_PANEL', 'SYSTEM_SETTINGS', 'USER_MANAGEMENT',
      'ROLE_MANAGEMENT', 'TENANT_MANAGEMENT', 'VIEW_GDPR_DATA', 'EXPORT_GDPR_DATA',
      'DELETE_GDPR_DATA', 'MANAGE_CONSENTS', 'VIEW_REPORTS', 'CREATE_REPORTS', 'EXPORT_REPORTS'
    ];
    
    console.log('\n🔍 Checking which permissions are NOT in VALID_PERSON_PERMISSIONS:');
    const missingFromValid = permissions.filter(perm => !VALID_PERSON_PERMISSIONS.includes(perm.name));
    
    if (missingFromValid.length > 0) {
      console.log(`\n❌ Found ${missingFromValid.length} permissions NOT in VALID_PERSON_PERMISSIONS:`);
      missingFromValid.forEach((perm, index) => {
        console.log(`${index + 1}. ${perm.name}`);
      });
    } else {
      console.log('\n✅ All permissions in database are in VALID_PERSON_PERMISSIONS');
    }
    
    console.log('\n🔍 Checking which VALID_PERSON_PERMISSIONS are NOT in database:');
    const missingFromDb = VALID_PERSON_PERMISSIONS.filter(validPerm => 
      !permissions.some(dbPerm => dbPerm.name === validPerm)
    );
    
    if (missingFromDb.length > 0) {
      console.log(`\n❌ Found ${missingFromDb.length} VALID_PERSON_PERMISSIONS NOT in database:`);
      missingFromDb.forEach((perm, index) => {
        console.log(`${index + 1}. ${perm}`);
      });
    } else {
      console.log('\n✅ All VALID_PERSON_PERMISSIONS are in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermissions();