const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdminRoles() {
  try {
    console.log('🔍 Verifica ruoli utente admin@example.com');
    console.log('=' .repeat(60));
    
    // 1. Trova l'utente admin
    const adminUser = await prisma.person.findUnique({
      where: { email: 'admin@example.com' },
      include: {
        personRoles: {
          include: {
            company: true,
            tenant: true
          }
        },
        company: true,
        tenant: true
      }
    });
    
    if (!adminUser) {
      console.log('❌ Utente admin@example.com NON TROVATO!');
      return;
    }
    
    console.log('✅ Utente admin trovato:');
    console.log('📧 Email:', adminUser.email);
    console.log('👤 Nome:', adminUser.firstName, adminUser.lastName);
    console.log('🆔 ID:', adminUser.id);
    console.log('🏢 Company ID:', adminUser.companyId);
    console.log('🏛️ Tenant ID:', adminUser.tenantId);
    console.log('📊 Status:', adminUser.status);
    console.log('🗑️ Deleted At:', adminUser.deletedAt);
    
    console.log('\n🔑 RUOLI ASSEGNATI:');
    console.log('Numero totale ruoli:', adminUser.personRoles.length);
    
    if (adminUser.personRoles.length === 0) {
      console.log('❌ NESSUN RUOLO ASSEGNATO!');
      console.log('\n🚨 PROBLEMA IDENTIFICATO: L\'utente admin non ha ruoli assegnati!');
      console.log('💡 SOLUZIONE: Assegnare ruolo ADMIN o SUPER_ADMIN');
    } else {
      adminUser.personRoles.forEach((role, index) => {
        console.log(`\n--- Ruolo ${index + 1} ---`);
        console.log('🏷️ Tipo Ruolo:', role.roleType);
        console.log('✅ Attivo:', role.isActive);
        console.log('🏢 Company ID:', role.companyId);
        console.log('🏛️ Tenant ID:', role.tenantId);
        console.log('📅 Creato:', role.createdAt);
        console.log('🔧 Permessi:', role.permissions);
        
        if (role.company) {
          console.log('🏢 Company:', role.company.name);
        }
        if (role.tenant) {
          console.log('🏛️ Tenant:', role.tenant.name);
        }
      });
      
      // Verifica ruoli attivi
      const activeRoles = adminUser.personRoles
        .filter(role => role.isActive)
        .map(role => role.roleType);
        
      console.log('\n🎯 RUOLI ATTIVI:', activeRoles);
      
      const hasAdminRole = activeRoles.includes('ADMIN') || activeRoles.includes('SUPER_ADMIN');
      
      if (hasAdminRole) {
        console.log('✅ L\'utente HA ruoli amministrativi!');
      } else {
        console.log('❌ L\'utente NON HA ruoli amministrativi!');
        console.log('🚨 PROBLEMA: Ruoli presenti ma non ADMIN/SUPER_ADMIN');
        console.log('💡 SOLUZIONE: Modificare il ruolo esistente o aggiungerne uno nuovo');
      }
    }
    
    // 3. Verifica mapping ruoli per frontend
    console.log('\n🔄 SIMULAZIONE MAPPING FRONTEND:');
    const roles = adminUser.personRoles
      .filter(pr => pr.isActive)
      .map(pr => pr.roleType);
      
    let mappedRole = 'User';
    if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
      mappedRole = 'Admin';
    } else if (roles.includes('COMPANY_ADMIN')) {
      mappedRole = 'Administrator';
    }
    
    console.log('📋 Ruoli estratti:', roles);
    console.log('🎭 Ruolo mappato per frontend:', mappedRole);
    
    if (mappedRole === 'User') {
      console.log('\n🚨 PROBLEMA CONFERMATO!');
      console.log('Il sistema mappa l\'utente come "User" invece di "Admin"');
      console.log('Questo spiega perché il menu laterale è vuoto.');
    }
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminRoles();