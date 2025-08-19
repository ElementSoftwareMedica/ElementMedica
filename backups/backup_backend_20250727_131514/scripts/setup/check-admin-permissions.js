import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminPermissions() {
  try {
    console.log('🔍 Verifica ruoli e permessi admin@example.com');
    console.log('=' .repeat(60));
    
    // Find admin user
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
        status: 'ACTIVE',
        deletedAt: null
      },
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
    
    if (!admin) {
      console.log('❌ Utente admin@example.com NON TROVATO!');
      return;
    }
    
    console.log('✅ Utente admin trovato:');
    console.log('📧 Email:', admin.email);
    console.log('👤 Nome:', admin.firstName, admin.lastName);
    console.log('🆔 ID:', admin.id);
    console.log('🏢 Company ID:', admin.companyId);
    console.log('🏛️ Tenant ID:', admin.tenantId);
    console.log('📊 Status:', admin.status);
    
    console.log('\n🔑 TUTTI I RUOLI (attivi e non):');
    console.log('Numero totale ruoli:', admin.personRoles.length);
    
    if (admin.personRoles.length === 0) {
      console.log('❌ NESSUN RUOLO ASSEGNATO!');
      console.log('\n🚨 PROBLEMA IDENTIFICATO: L\'utente admin non ha ruoli!');
      console.log('💡 SOLUZIONE: Assegnare ruolo ADMIN o SUPER_ADMIN');
      return;
    }
    
    admin.personRoles.forEach((role, index) => {
      console.log(`\n--- Ruolo ${index + 1} ---`);
      console.log('🏷️ Tipo:', role.roleType);
      console.log('✅ Attivo:', role.isActive);
      console.log('🏢 Company ID:', role.companyId);
      console.log('🏛️ Tenant ID:', role.tenantId);
      console.log('📅 Creato:', role.createdAt);
      console.log('🔧 Permessi:', role.permissions);
    });
    
    // Verifica ruoli attivi
    const activeRoles = admin.personRoles
      .filter(role => role.isActive)
      .map(role => role.roleType);
      
    console.log('\n🎯 RUOLI ATTIVI:', activeRoles);
    
    const hasAdminRole = activeRoles.includes('ADMIN') || activeRoles.includes('SUPER_ADMIN');
    
    console.log('\n🔄 SIMULAZIONE MAPPING FRONTEND:');
    let mappedRole = 'User';
    if (activeRoles.includes('SUPER_ADMIN') || activeRoles.includes('ADMIN')) {
      mappedRole = 'Admin';
    } else if (activeRoles.includes('COMPANY_ADMIN')) {
      mappedRole = 'Administrator';
    }
    
    console.log('📋 Ruoli estratti:', activeRoles);
    console.log('🎭 Ruolo mappato per frontend:', mappedRole);
    
    if (mappedRole === 'User') {
      console.log('\n🚨 PROBLEMA CONFERMATO!');
      console.log('Il sistema mappa l\'utente come "User" invece di "Admin"');
      console.log('Questo spiega perché il menu laterale è vuoto.');
      console.log('\n💡 SOLUZIONI POSSIBILI:');
      if (activeRoles.length === 0) {
        console.log('1. Attivare i ruoli esistenti');
        console.log('2. Assegnare nuovo ruolo ADMIN/SUPER_ADMIN');
      } else {
        console.log('1. Modificare il ruolo esistente in ADMIN/SUPER_ADMIN');
        console.log('2. Aggiungere ruolo ADMIN/SUPER_ADMIN');
      }
    } else {
      console.log('\n✅ Mapping corretto! Il problema potrebbe essere altrove.');
    }
    
  } catch (error) {
    console.error('❌ Error checking admin permissions:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminPermissions();