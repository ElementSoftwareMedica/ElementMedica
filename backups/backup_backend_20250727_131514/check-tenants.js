/**
 * Script per verificare i tenant esistenti nel database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenants() {
  console.log('🔍 Verifica tenant esistenti...');
  
  try {
    // Verifica se esiste la tabella tenants
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        deletedAt: true
      },
      take: 5
    });
    
    console.log('📋 Tenant trovati:', tenants.length);
    tenants.forEach(tenant => {
      console.log(`   - ID: ${tenant.id}, Nome: ${tenant.name}, Attivo: ${tenant.isActive}`);
    });
    
    // Se non ci sono tenant, creiamo un tenant di test
    if (tenants.length === 0) {
      console.log('\n🆕 Creazione tenant di test...');
      const testTenant = await prisma.tenant.create({
        data: {
          id: 'test-tenant-id',
          name: 'Test Tenant',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Tenant di test creato:', testTenant.id);
      return testTenant.id;
    }
    
    // Usa il primo tenant attivo
    const activeTenant = tenants.find(t => t.isActive && !t.deletedAt);
    if (activeTenant) {
      console.log(`✅ Usando tenant esistente: ${activeTenant.id}`);
      return activeTenant.id;
    }
    
    console.log('⚠️ Nessun tenant attivo trovato');
    return null;
    
  } catch (error) {
    console.error('❌ Errore nella verifica tenant:', error.message);
    
    // Se la tabella tenant non esiste, proviamo a creare un tenant semplice
    if (error.code === 'P2021') {
      console.log('📝 Tabella tenant non trovata, uso tenant fittizio');
      return 'default-tenant';
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui la verifica
checkTenants()
  .then(tenantId => {
    if (tenantId) {
      console.log(`\n🎯 Tenant ID da usare per i test: ${tenantId}`);
    }
  })
  .catch((error) => {
    console.error('💥 Errore:', error);
    process.exit(1);
  });