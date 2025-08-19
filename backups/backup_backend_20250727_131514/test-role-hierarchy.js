import { PrismaClient } from '@prisma/client';
import RoleHierarchyService from './services/roleHierarchyService.js';

const prisma = new PrismaClient();

async function testRoleHierarchy() {
  console.log('🧪 Test della gerarchia dei ruoli personalizzati...\n');

  try {
    // Usa tenant e utente esistenti
    const tenantId = '2808a873-e95d-4846-aec1-298a145ba886';
    const createdBy = '0575335b-a36e-4e22-8dc5-388ad74f9329';

    // 0. Cleanup iniziale
    console.log('0. Cleanup iniziale...');
    const existingRole = await prisma.customRole.findFirst({
      where: {
        name: 'Test Project Manager',
        tenantId: tenantId
      }
    });

    if (existingRole) {
      await prisma.customRolePermission.deleteMany({
        where: { customRoleId: existingRole.id }
      });
      
      await prisma.customRole.delete({
        where: { id: existingRole.id }
      });
      
      // Rimuovi dalla gerarchia statica se presente
      delete RoleHierarchyService.ROLE_HIERARCHY['TEST_PROJECT_MANAGER'];
      
      console.log('✅ Cleanup iniziale completato');
    } else {
      console.log('✅ Nessun cleanup necessario');
    }
    console.log('');

    // 1. Test gerarchia iniziale
    console.log('1. Gerarchia iniziale:');
    const initialHierarchy = await RoleHierarchyService.getRoleHierarchy(tenantId);
    console.log('Ruoli trovati:', Object.keys(initialHierarchy));
    console.log('Ruoli personalizzati:', Object.keys(initialHierarchy).filter(key => initialHierarchy[key].isCustomRole));
    console.log('');

    // 2. Crea un ruolo personalizzato
    console.log('2. Creazione ruolo personalizzato...');
    const newRoleData = {
      roleType: 'TEST_PROJECT_MANAGER',
      name: 'Test Project Manager',
      description: 'Gestisce progetti di test',
      parentRoleType: 'MANAGER',
      permissions: ['VIEW_COURSES', 'EDIT_COURSES', 'VIEW_DOCUMENTS'],
      tenantId: tenantId,
      createdBy: createdBy
    };

    await RoleHierarchyService.addRoleToHierarchy(
      newRoleData.roleType,
      newRoleData.name,
      newRoleData.description,
      newRoleData.parentRoleType,
      newRoleData.permissions,
      newRoleData.tenantId,
      newRoleData.createdBy
    );
    console.log('✅ Ruolo personalizzato creato');
    console.log('');

    // 3. Verifica gerarchia aggiornata
    console.log('3. Gerarchia dopo creazione:');
    const updatedHierarchy = await RoleHierarchyService.getRoleHierarchy(tenantId);
    console.log('Ruoli trovati:', Object.keys(updatedHierarchy));
    console.log('Ruoli personalizzati:', Object.keys(updatedHierarchy).filter(key => updatedHierarchy[key].isCustomRole));
    
    const testProjectManager = updatedHierarchy['TEST_PROJECT_MANAGER'];
    if (testProjectManager) {
      console.log('Dettagli TEST_PROJECT_MANAGER:');
      console.log('  - Nome:', testProjectManager.name);
      console.log('  - Descrizione:', testProjectManager.description);
      console.log('  - È personalizzato:', testProjectManager.isCustomRole);
      console.log('  - ID personalizzato:', testProjectManager.customRoleId);
      console.log('  - Permessi:', testProjectManager.permissions);
    } else {
      console.log('❌ TEST_PROJECT_MANAGER non trovato nella gerarchia');
    }
    console.log('');

    // 4. Test gerarchia senza tenantId
    console.log('4. Gerarchia senza tenantId (solo ruoli statici):');
    const staticHierarchy = await RoleHierarchyService.getRoleHierarchy();
    console.log('Ruoli statici:', Object.keys(staticHierarchy));
    console.log('Ruoli personalizzati:', Object.keys(staticHierarchy).filter(key => staticHierarchy[key].isCustomRole));
    console.log('');

    // 5. Test verifica permessi
    console.log('5. Test verifica permessi:');
    const canManagerAssignTestPM = RoleHierarchyService.canAssignToRole('MANAGER', 'TEST_PROJECT_MANAGER');
    console.log('MANAGER può assegnare TEST_PROJECT_MANAGER:', canManagerAssignTestPM);
    
    const canEmployeeAssignTestPM = RoleHierarchyService.canAssignToRole('EMPLOYEE', 'TEST_PROJECT_MANAGER');
    console.log('EMPLOYEE può assegnare TEST_PROJECT_MANAGER:', canEmployeeAssignTestPM);
    console.log('');

    // 6. Cleanup
    console.log('6. Cleanup...');
    const customRole = await prisma.customRole.findFirst({
      where: {
        name: 'Test Project Manager',
        tenantId: tenantId
      }
    });

    if (customRole) {
      await prisma.customRolePermission.deleteMany({
        where: { customRoleId: customRole.id }
      });
      
      await prisma.customRole.delete({
        where: { id: customRole.id }
      });
      
      // Rimuovi dalla gerarchia statica
      delete RoleHierarchyService.ROLE_HIERARCHY['TEST_PROJECT_MANAGER'];
      
      console.log('✅ Cleanup completato');
    }

    console.log('\n🎉 Test completato con successo!');

  } catch (error) {
    console.error('❌ Errore durante il test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRoleHierarchy();