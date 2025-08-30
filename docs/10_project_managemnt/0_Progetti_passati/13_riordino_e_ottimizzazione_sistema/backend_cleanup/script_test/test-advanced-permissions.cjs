const { PrismaClient } = require('@prisma/client');

// Importa il servizio usando dynamic import
let AdvancedPermissionService;

async function loadService() {
  const module = await import('./services/advanced-permission.js');
  AdvancedPermissionService = module.default;
}

const prisma = new PrismaClient();

async function testAdvancedPermissions() {
  try {
    console.log('🧪 Test sistema permessi avanzati...');
    
    // Carica il servizio
    await loadService();
    const advancedPermissionService = new AdvancedPermissionService();
    
    console.log('✅ Servizio permessi avanzati caricato');
    
    // Trova l'admin user
    const adminPerson = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        deletedAt: null
      },
      include: {
        personRoles: {
          where: {
            isActive: true
          },
          include: {
            advancedPermissions: true
          }
        }
      }
    });
    
    if (!adminPerson) {
      console.error('❌ Admin user non trovato');
      return;
    }
    
    console.log('✅ Admin user trovato:', adminPerson.email);
    console.log('📋 Ruoli attivi:', adminPerson.personRoles.length);
    
    // Test permessi companies
    const testCases = [
      { resource: 'companies', action: 'read', description: 'Lettura companies' },
      { resource: 'companies', action: 'create', description: 'Creazione companies' },
      { resource: 'companies', action: 'update', description: 'Modifica companies' },
      { resource: 'companies', action: 'delete', description: 'Eliminazione companies' },
      { resource: 'employees', action: 'read', description: 'Lettura employees' },
      { resource: 'employees', action: 'create', description: 'Creazione employees' },
      { resource: 'employees', action: 'update', description: 'Modifica employees' },
      { resource: 'employees', action: 'delete', description: 'Eliminazione employees' },
      { resource: 'documents', action: 'read', description: 'Lettura documenti (non configurato)' }
    ];
    
    console.log('\n🔍 Test permessi:');
    
    for (const testCase of testCases) {
      try {
        const hasPermission = await advancedPermissionService.checkPermission(
          adminPerson.id,
          testCase.resource,
          testCase.action
        );
        
        const status = hasPermission ? '✅' : '❌';
        console.log(`${status} ${testCase.description}: ${hasPermission ? 'CONSENTITO' : 'NEGATO'}`);
        
        if (hasPermission && testCase.resource === 'companies') {
          // Test filtro campi per companies
          const testData = {
            id: 'test-id',
            ragione_sociale: 'Test Company',
            codice_fiscale: '12345678901',
            partita_iva: '12345678901',
            indirizzo: 'Via Test 123',
            telefono: '1234567890',
            email: 'test@company.com',
            password: 'secret123', // Campo che non dovrebbe essere visibile
            internal_notes: 'Note interne', // Campo che non dovrebbe essere visibile
            created_at: new Date(),
            updated_at: new Date()
          };
          
          const filteredData = await advancedPermissionService.filterAllowedFields(
            adminPerson.id,
            testCase.resource,
            testCase.action,
            testData
          );
          
          console.log(`   📋 Campi consentiti per ${testCase.action}:`, Object.keys(filteredData));
        }
        
      } catch (error) {
        console.log(`❌ ${testCase.description}: ERRORE - ${error.message}`);
      }
    }
    
    // Test scope e condizioni
    console.log('\n🎯 Test scope e condizioni:');
    
    // Simula un utente con scope limitato
    const mockUser = {
      id: adminPerson.id,
      companyId: 'test-company-id'
    };
    
    const scopeTest = await advancedPermissionService.checkScope(
      'global',
      mockUser,
      { companyId: 'different-company-id' }
    );
    
    console.log('✅ Test scope global:', scopeTest ? 'CONSENTITO' : 'NEGATO');
    
    // Test permessi avanzati dell'utente
    console.log('\n📊 Permessi avanzati configurati:');
    const userPermissions = await advancedPermissionService.getPersonAdvancedPermissions(adminPerson.id);
    
    userPermissions.forEach(permission => {
      console.log(`   • ${permission.resource}:${permission.action} (${permission.scope})`);
      if (permission.allowedFields) {
        console.log(`     Campi: ${permission.allowedFields.join(', ')}`);
      }
    });
    
    console.log('\n🎉 Test completato con successo!');
    
  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdvancedPermissions();