import enhancedRoleService from './services/enhancedRoleService.js';

async function testHasPermissionDirect() {
  try {
    console.log('🔍 Testing hasPermission directly...');
    
    // Usa i dati dell'utente admin dal token precedente
    const personId = '687303d0-3c1b-4da7-a739-656199def09d';
    const tenantId = '8da03054-c3bf-4ea1-b1bf-bab74db5cf98';
    const permission = 'roles.manage';
    
    console.log('📊 Test parameters:');
    console.log('- personId:', personId);
    console.log('- tenantId:', tenantId);
    console.log('- permission:', permission);
    
    const context = {
      tenantId: tenantId,
      companyId: null
    };
    
    console.log('- context:', context);
    console.log('');
    
    // Test diretto del metodo hasPermission
    const result = await enhancedRoleService.hasPermission(personId, permission, context);
    
    console.log('🎯 Result:', result);
    
    if (result) {
      console.log('✅ Permission GRANTED');
    } else {
      console.log('❌ Permission DENIED');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testHasPermissionDirect();