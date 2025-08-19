const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('🔍 Verifica utente admin@example.com nel database');
    console.log('=' .repeat(60));
    
    // Trova l'utente admin
    const admin = await prisma.person.findFirst({
      where: {
        email: 'admin@example.com',
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
      
      // Cerca nella tabella User come fallback
      const userAdmin = await prisma.user.findFirst({
        where: {
          email: 'admin@example.com'
        }
      });
      
      if (userAdmin) {
        console.log('✅ Trovato nella tabella User:', userAdmin);
      } else {
        console.log('❌ Non trovato nemmeno nella tabella User');
      }
      return;
    }
    
    console.log('✅ Utente admin trovato:');
    console.log('📧 Email:', admin.email);
    console.log('👤 Nome:', admin.firstName, admin.lastName);
    console.log('🆔 ID:', admin.id);
    console.log('🏢 Company ID:', admin.companyId);
    console.log('🏛️ Tenant ID:', admin.tenantId);
    console.log('📊 Status:', admin.status);
    console.log('🔑 Ha password:', !!admin.password);
    
    // Verifica password
    if (admin.password) {
      try {
        const passwordMatch = await bcrypt.compare('Admin123!', admin.password);
        console.log('🔐 Password corretta:', passwordMatch);
      } catch (err) {
        console.log('❌ Errore verifica password:', err.message);
      }
    }
    
    console.log('\n🔑 RUOLI ASSEGNATI:');
    console.log('Numero totale ruoli:', admin.personRoles.length);
    
    if (admin.personRoles.length === 0) {
      console.log('❌ NESSUN RUOLO ASSEGNATO!');
      console.log('\n🚨 PROBLEMA IDENTIFICATO: L\'utente admin non ha ruoli!');
      console.log('💡 SOLUZIONE: Assegnare ruolo ADMIN o SUPER_ADMIN');
    } else {
      admin.personRoles.forEach((role, index) => {
        console.log(`\n--- Ruolo ${index + 1} ---`);
        console.log('🏷️ Tipo:', role.roleType);
        console.log('✅ Attivo:', role.isActive);
        console.log('🏢 Company ID:', role.companyId);
        console.log('🏛️ Tenant ID:', role.tenantId);
        console.log('📅 Creato:', role.createdAt);
      });
      
      // Verifica ruoli attivi
      const activeRoles = admin.personRoles
        .filter(role => role.isActive)
        .map(role => role.roleType);
        
      console.log('\n🎯 RUOLI ATTIVI:', activeRoles);
      
      if (activeRoles.length === 0) {
        console.log('❌ NESSUN RUOLO ATTIVO!');
        console.log('💡 SOLUZIONE: Attivare almeno un ruolo ADMIN/SUPER_ADMIN');
      } else if (!activeRoles.includes('ADMIN') && !activeRoles.includes('SUPER_ADMIN')) {
        console.log('⚠️ NESSUN RUOLO ADMIN ATTIVO!');
        console.log('💡 SOLUZIONE: Assegnare ruolo ADMIN o SUPER_ADMIN');
      } else {
        console.log('✅ Ruoli admin presenti e attivi');
      }
    }
    
  } catch (error) {
    console.error('❌ Errore durante la verifica:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();