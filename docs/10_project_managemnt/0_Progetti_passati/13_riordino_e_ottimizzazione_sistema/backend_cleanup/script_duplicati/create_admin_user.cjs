/**
 * Script per creare l'utente admin@example.com con password Admin123!
 * e assegnare ruoli amministrativi appropriati
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

console.log('🔧 CREAZIONE UTENTE ADMIN');
console.log('============================================================');
console.log('');
console.log('🎯 OBIETTIVO: Creare admin@example.com con password Admin123!');
console.log('');

async function createAdminUser() {
  try {
    console.log('1. 🔍 Verifica se admin@example.com esiste già...');
    
    const existingAdmin = await prisma.person.findFirst({
      where: {
        OR: [
          { email: 'admin@example.com' },
          { username: 'admin@example.com' }
        ]
      }
    });
    
    if (existingAdmin) {
      console.log('   ⚠️  admin@example.com esiste già!');
      console.log(`      📧 Email: ${existingAdmin.email}`);
      console.log(`      👤 Username: ${existingAdmin.username}`);
      console.log(`      🆔 ID: ${existingAdmin.id}`);
      console.log('');
      console.log('   🔄 Aggiorno password e ruoli...');
      
      // Hash della nuova password
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      
      // Aggiorna l'utente esistente
      const updatedUser = await prisma.person.update({
        where: { id: existingAdmin.id },
        data: {
          password: hashedPassword,
          status: 'ACTIVE',
          lastLogin: null
        }
      });
      
      console.log('   ✅ Password aggiornata!');
      
      // Verifica e aggiorna ruoli
      await updateAdminRoles(existingAdmin.id);
      
    } else {
      console.log('   ✅ admin@example.com non esiste, procedo con la creazione');
      console.log('');
      
      console.log('2. 🔐 Generazione hash password Admin123!...');
      const hashedPassword = await bcrypt.hash('Admin123!', 12);
      console.log('   ✅ Hash password generato');
      console.log('');
      
      console.log('3. 🏢 Ricerca company di default...');
      const defaultCompany = await prisma.company.findFirst({
        where: {
          isActive: true
        }
      });
      
      if (!defaultCompany) {
        throw new Error('Nessuna company attiva trovata nel database');
      }
      
      console.log(`   ✅ Company trovata: ${defaultCompany.name} (ID: ${defaultCompany.id})`);
      console.log('');
      
      console.log('4. 🏠 Ricerca tenant di default...');
      const defaultTenant = await prisma.tenant.findFirst({
        where: {
          isActive: true
        }
      });
      
      if (!defaultTenant) {
        throw new Error('Nessun tenant attivo trovato nel database');
      }
      
      console.log(`   ✅ Tenant trovato: ${defaultTenant.name} (ID: ${defaultTenant.id})`);
      console.log('');
      
      console.log('5. 👤 Creazione utente admin@example.com...');
      
      const newAdmin = await prisma.person.create({
        data: {
          email: 'admin@example.com',
          username: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'System',
          password: hashedPassword,
          status: 'ACTIVE',
          companyId: defaultCompany.id,
          tenantId: defaultTenant.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log('   ✅ Utente creato!');
      console.log(`      🆔 ID: ${newAdmin.id}`);
      console.log(`      📧 Email: ${newAdmin.email}`);
      console.log(`      👤 Username: ${newAdmin.username}`);
      console.log(`      🏷️  Nome: ${newAdmin.firstName} ${newAdmin.lastName}`);
      console.log('');
      
      // Assegna ruoli admin
      await updateAdminRoles(newAdmin.id);
    }
    
    console.log('');
    console.log('🎉 OPERAZIONE COMPLETATA!');
    console.log('');
    console.log('📋 CREDENZIALI ADMIN:');
    console.log('   📧 Email: admin@example.com');
    console.log('   🔑 Password: Admin123!');
    console.log('   🔗 Endpoint: http://localhost:4001/api/v1/auth/login');
    console.log('');
    
  } catch (error) {
    console.error('❌ Errore durante la creazione dell\'utente admin:', error);
    throw error;
  }
}

async function updateAdminRoles(personId) {
  try {
    console.log('6. 🔑 Gestione ruoli amministrativi...');
    
    // Disattiva tutti i ruoli esistenti
    await prisma.personRole.updateMany({
      where: {
        personId: personId
      },
      data: {
        isActive: false
      }
    });
    
    console.log('   ✅ Ruoli esistenti disattivati');
    
    // Crea ruoli admin
    const adminRoles = [
      {
        personId: personId,
        roleType: 'SUPER_ADMIN',
        isActive: true,
        isPrimary: true,
        assignedAt: new Date()
      },
      {
        personId: personId,
        roleType: 'ADMIN',
        isActive: true,
        isPrimary: false,
        assignedAt: new Date()
      },
      {
        personId: personId,
        roleType: 'COMPANY_ADMIN',
        isActive: true,
        isPrimary: false,
        assignedAt: new Date()
      }
    ];
    
    for (const role of adminRoles) {
      // Verifica se il ruolo esiste già
      const existingRole = await prisma.personRole.findFirst({
        where: {
          personId: personId,
          roleType: role.roleType
        }
      });
      
      if (existingRole) {
        // Aggiorna il ruolo esistente
        await prisma.personRole.update({
          where: { id: existingRole.id },
          data: {
            isActive: true,
            isPrimary: role.isPrimary,
            assignedAt: new Date()
          }
        });
        console.log(`   ✅ Ruolo ${role.roleType} aggiornato`);
      } else {
        // Crea nuovo ruolo
        await prisma.personRole.create({
          data: role
        });
        console.log(`   ✅ Ruolo ${role.roleType} creato`);
      }
    }
    
    console.log('');
    console.log('   🔑 Ruoli assegnati:');
    console.log('      - SUPER_ADMIN (primario)');
    console.log('      - ADMIN');
    console.log('      - COMPANY_ADMIN');
    
  } catch (error) {
    console.error('❌ Errore durante l\'assegnazione dei ruoli:', error);
    throw error;
  }
}

// Esegui lo script
createAdminUser()
  .then(() => {
    console.log('✅ Script completato con successo');
  })
  .catch((error) => {
    console.error('❌ Script fallito:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });