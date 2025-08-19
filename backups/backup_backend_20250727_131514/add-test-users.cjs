const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function addTestUsers() {
  try {
    console.log('🚀 Aggiunta utenti di test per gerarchia ruoli...');

    // Trova il tenant di default
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('❌ Nessun tenant trovato');
      return;
    }

    // Trova o crea una company di default
    let defaultCompany = await prisma.company.findFirst({
      where: { ragioneSociale: 'Default Company' }
    });

    if (!defaultCompany) {
      // Crea una company di test
    defaultCompany = await prisma.company.create({
      data: {
        ragioneSociale: 'Azienda Test S.r.l.',
        tenantId: tenant.id,
        isActive: true
      }
    });
      console.log('✅ Company di test creata');
    }

    // Password di default hashata
    const defaultPassword = await bcrypt.hash('Password123!', 10);

    // Utenti di test da creare
    const testUsers = [
      {
        firstName: 'Admin',
        lastName: 'Lavoro e Formazione',
        email: 'admin.lavoro@example.com',
        username: 'admin.lavoro',
        roleType: 'ADMIN',
        department: 'Lavoro e Formazione',
        position: 'Admin Lavoro e Formazione'
      },
      {
        firstName: 'Admin',
        lastName: 'Poliambulatorio',
        email: 'admin.poliambulatorio@example.com',
        username: 'admin.poliambulatorio',
        roleType: 'ADMIN',
        department: 'Poliambulatorio',
        position: 'Admin Poliambulatorio'
      },
      {
        firstName: 'Admin',
        lastName: 'Formatori',
        email: 'admin.formatori@example.com',
        username: 'admin.formatori',
        roleType: 'MANAGER',
        department: 'Formazione',
        position: 'Admin Formatori'
      },
      {
        firstName: 'Admin',
        lastName: 'Aziende',
        email: 'admin.aziende@example.com',
        username: 'admin.aziende',
        roleType: 'MANAGER',
        department: 'Aziende',
        position: 'Admin Aziende'
      },
      {
        firstName: 'Marco',
        lastName: 'Formatore',
        email: 'marco.formatore@example.com',
        username: 'marco.formatore',
        roleType: 'TRAINER',
        department: 'Formazione',
        position: 'Formatore Senior'
      },
      {
        firstName: 'Laura',
        lastName: 'Dipendente',
        email: 'laura.dipendente@example.com',
        username: 'laura.dipendente',
        roleType: 'EMPLOYEE',
        department: 'Amministrazione',
        position: 'Impiegata'
      }
    ];

    for (const userData of testUsers) {
      // Verifica se l'utente esiste già
      const existingUser = await prisma.person.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️ Utente ${userData.email} già esistente, salto...`);
        continue;
      }

      // Crea la persona
      const person = await prisma.person.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          username: userData.username,
          password: defaultPassword,
          phone: `+39 ${Math.floor(Math.random() * 900000000) + 100000000}`,
          residenceAddress: `Via ${userData.department} ${Math.floor(Math.random() * 100) + 1}`,
          companyId: defaultCompany.id,
          tenantId: tenant.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Crea PersonRole direttamente con roleType
      await prisma.personRole.create({
        data: {
          personId: person.id,
          roleType: userData.roleType,
          tenantId: tenant.id,
          companyId: defaultCompany.id,
          isActive: true,
          isPrimary: true,
          assignedAt: new Date()
        }
      });

      console.log(`✅ Creato utente: ${person.firstName} ${person.lastName} (${userData.roleType})`);
    }

    console.log('🎉 Utenti di test aggiunti con successo!');
    
    // Mostra statistiche
    const totalPersons = await prisma.person.count();
    const personsByRole = await prisma.personRole.groupBy({
      by: ['roleType'],
      _count: { id: true }
    });

    console.log(`📊 Totale persone nel sistema: ${totalPersons}`);
    console.log('📊 Persone per ruolo:');
    personsByRole.forEach(group => {
      console.log(`   - ${group.roleType || 'N/A'}: ${group._count.id}`);
    });

  } catch (error) {
    console.error('❌ Errore durante l\'aggiunta degli utenti:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestUsers();