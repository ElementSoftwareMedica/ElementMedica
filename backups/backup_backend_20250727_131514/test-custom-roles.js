/**
 * Test del sistema di creazione ruoli personalizzati
 * Testa direttamente il servizio senza avviare il server completo
 */

import { PrismaClient } from '@prisma/client';
import roleHierarchyService from './services/roleHierarchyService.js';

const prisma = new PrismaClient();

async function testCustomRoleCreation() {
  console.log('🧪 Test creazione ruoli personalizzati...');
  
  try {
    // 1. Test della gerarchia esistente
    console.log('\n📋 1. Test gerarchia esistente...');
    const tenantId = '2808a873-e95d-4846-aec1-298a145ba886'; // Tenant esistente
    const hierarchy = await roleHierarchyService.getRoleHierarchy(tenantId);
    console.log('   Gerarchia ottenuta:', Object.keys(hierarchy).length, 'ruoli');
    
    // 2. Test creazione nuovo ruolo personalizzato
    console.log('\n🆕 2. Test creazione nuovo ruolo...');
    const newRoleData = {
      name: 'Test Manager',
      description: 'Ruolo di test per manager',
      parentRoleType: 'MANAGER',
      permissions: ['VIEW_EMPLOYEES', 'EDIT_EMPLOYEES'],
      tenantId: tenantId,
      createdBy: '0575335b-a36e-4e22-8dc5-388ad74f9329' // Utente esistente
    };
    
    // Genera roleType come fa l'endpoint
    const roleType = newRoleData.name.toUpperCase().replace(/\s+/g, '_');
    console.log('   RoleType generato:', roleType);
    
    // Verifica se il ruolo esiste già
    const existingRole = await prisma.customRole.findFirst({
      where: {
        name: newRoleData.name,
        tenantId: newRoleData.tenantId,
        deletedAt: null
      }
    });
    
    if (existingRole) {
      console.log('   ⚠️  Ruolo già esistente, lo rimuovo per il test...');
      await prisma.customRole.update({
        where: { id: existingRole.id },
        data: { deletedAt: new Date() }
      });
    }
    
    // Crea il ruolo personalizzato
    const result = await roleHierarchyService.addRoleToHierarchy(
      roleType,
      newRoleData.name,
      newRoleData.description,
      newRoleData.parentRoleType,
      newRoleData.permissions,
      newRoleData.tenantId,
      newRoleData.createdBy
    );
    
    console.log('   ✅ Ruolo creato:', result);
    
    // 3. Verifica che il ruolo sia stato salvato nel database
    console.log('\n🔍 3. Verifica salvataggio nel database...');
    const savedRole = await prisma.customRole.findFirst({
      where: {
        name: newRoleData.name,
        tenantId: newRoleData.tenantId,
        deletedAt: null
      },
      include: {
        permissions: true
      }
    });
    
    if (savedRole) {
      console.log('   ✅ Ruolo trovato nel database:');
      console.log('      ID:', savedRole.id);
      console.log('      Nome:', savedRole.name);
      console.log('      Descrizione:', savedRole.description);
      console.log('      Permessi:', savedRole.permissions.length);
    } else {
      console.log('   ❌ Ruolo NON trovato nel database!');
    }
    
    // 4. Test gerarchia aggiornata
    console.log('\n🔄 4. Test gerarchia aggiornata...');
    const updatedHierarchy = await roleHierarchyService.getRoleHierarchy(newRoleData.tenantId);
    
    if (updatedHierarchy[roleType]) {
      console.log('   ✅ Ruolo presente nella gerarchia:');
      console.log('      Nome:', updatedHierarchy[roleType].name);
      console.log('      Descrizione:', updatedHierarchy[roleType].description);
      console.log('      È personalizzato:', updatedHierarchy[roleType].isCustomRole);
      console.log('      Custom Role ID:', updatedHierarchy[roleType].customRoleId);
    } else {
      console.log('   ❌ Ruolo NON presente nella gerarchia aggiornata!');
    }
    
    // 5. Cleanup
    console.log('\n🧹 5. Cleanup...');
    if (savedRole) {
      await prisma.customRole.update({
        where: { id: savedRole.id },
        data: { deletedAt: new Date() }
      });
      console.log('   ✅ Ruolo di test rimosso');
    }
    
    console.log('\n✅ Test completato con successo!');
    
  } catch (error) {
    console.error('\n❌ Errore durante il test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui il test
testCustomRoleCreation()
  .catch((error) => {
    console.error('💥 Test fallito:', error);
    process.exit(1);
  });