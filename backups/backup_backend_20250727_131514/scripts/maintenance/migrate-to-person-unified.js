const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * Script di migrazione per popolare il database con l'entità Person unificata
 * Rispetta i principi GDPR e crea dati di esempio per testare il sistema
 */

async function createSampleData() {
  console.log('🚀 Inizio migrazione verso entità Person unificata...');
  
  try {
    // 1. Crea un tenant di esempio
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'demo-company' },
      update: {},
      create: {
        id: 'tenant-demo-001',
        name: 'Demo Company',
        slug: 'demo-company',
        domain: 'demo.training-platform.com',
        settings: {
          gdpr: {
            enabled: true,
            dataRetentionYears: 7,
            consentRequired: true
          },
          features: {
            multiRole: true,
            advancedPermissions: true
          }
        },
        billingPlan: 'premium',
        maxUsers: 100,
        maxCompanies: 5,
        isActive: true
      }
    });
    console.log('✅ Tenant creato:', tenant.name);

    // 2. Crea una company di esempio
    const company = await prisma.company.upsert({
      where: { slug: 'acme-corp' },
      update: {},
      create: {
        id: 'company-demo-001',
        ragioneSociale: 'ACME Corporation S.r.l.',
        slug: 'acme-corp',
        codice_fiscale: '12345678901',
        piva: '12345678901',
        mail: 'info@acme-corp.com',
        telefono: '+39 02 1234567',
        sede_azienda: 'Via Roma 123, 20100 Milano',
        cap: '20100',
        citta: 'Milano',
        provincia: 'MI',
        tenantId: tenant.id,
        is_active: true
      }
    });
    console.log('✅ Company creata:', company.ragioneSociale);

    // 3. Hash password per gli utenti
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const currentDate = new Date();
    const gdprConsentDate = new Date();
    const dataRetentionDate = new Date();
    dataRetentionDate.setFullYear(dataRetentionDate.getFullYear() + 7); // 7 anni di retention

    // 4. Crea persone con ruoli diversi
    const personsData = [
      {
        // Super Admin
        id: 'person-admin-001',
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@acme-corp.com',
        phone: '+39 333 1234567',
        username: 'mario.rossi',
        password: hashedPassword,
        isActive: true,
        status: 'ACTIVE',
        tenantId: tenant.id,
        companyId: company.id,
        gdprConsentDate,
        gdprConsentVersion: '1.0',
        dataRetentionUntil: dataRetentionDate,
        roles: ['SUPER_ADMIN', 'COMPANY_ADMIN']
      },
      {
        // HR Manager
        id: 'person-hr-001',
        firstName: 'Laura',
        lastName: 'Bianchi',
        email: 'laura.bianchi@acme-corp.com',
        phone: '+39 333 2345678',
        username: 'laura.bianchi',
        password: hashedPassword,
        isActive: true,
        status: 'ACTIVE',
        title: 'HR Manager',
        hiredDate: new Date('2023-01-15'),
        tenantId: tenant.id,
        companyId: company.id,
        gdprConsentDate,
        gdprConsentVersion: '1.0',
        dataRetentionUntil: dataRetentionDate,
        roles: ['HR_MANAGER', 'EMPLOYEE']
      },
      {
        // Dipendente
        id: 'person-emp-001',
        firstName: 'Giuseppe',
        lastName: 'Verdi',
        email: 'giuseppe.verdi@acme-corp.com',
        phone: '+39 333 3456789',
        isActive: true,
        status: 'ACTIVE',
        title: 'Operaio Specializzato',
        hiredDate: new Date('2023-03-01'),
        birthDate: new Date('1985-05-15'),
        taxCode: 'VRDGPP85E15F205X',
        residenceAddress: 'Via Garibaldi 45',
        residenceCity: 'Milano',
        postalCode: '20121',
        province: 'MI',
        tenantId: tenant.id,
        companyId: company.id,
        gdprConsentDate,
        gdprConsentVersion: '1.0',
        dataRetentionUntil: dataRetentionDate,
        roles: ['EMPLOYEE']
      },
      {
        // Formatore Interno
        id: 'person-trainer-001',
        firstName: 'Anna',
        lastName: 'Ferrari',
        email: 'anna.ferrari@acme-corp.com',
        phone: '+39 333 4567890',
        username: 'anna.ferrari',
        password: hashedPassword,
        isActive: true,
        status: 'ACTIVE',
        title: 'Senior Trainer',
        hiredDate: new Date('2022-09-01'),
        hourlyRate: 45.00,
        certifications: ['ISO 45001', 'Formatore Sicurezza', 'First Aid'],
        specialties: ['Sicurezza sul Lavoro', 'Primo Soccorso', 'Antincendio'],
        tenantId: tenant.id,
        companyId: company.id,
        gdprConsentDate,
        gdprConsentVersion: '1.0',
        dataRetentionUntil: dataRetentionDate,
        roles: ['TRAINER', 'EMPLOYEE']
      },
      {
        // Formatore Esterno
        id: 'person-trainer-002',
        firstName: 'Marco',
        lastName: 'Colombo',
        email: 'marco.colombo@freelance.com',
        phone: '+39 333 5678901',
        username: 'marco.colombo',
        password: hashedPassword,
        isActive: true,
        status: 'ACTIVE',
        hourlyRate: 60.00,
        vatNumber: '12345678901',
        iban: 'IT60 X054 2811 1010 0000 0123 456',
        certifications: ['Formatore Qualificato', 'Esperto Sicurezza'],
        specialties: ['Formazione Manageriale', 'Leadership', 'Team Building'],
        tenantId: tenant.id,
        gdprConsentDate,
        gdprConsentVersion: '1.0',
        dataRetentionUntil: dataRetentionDate,
        roles: ['EXTERNAL_TRAINER']
      },
      {
        // Manager
        id: 'person-manager-001',
        firstName: 'Francesca',
        lastName: 'Romano',
        email: 'francesca.romano@acme-corp.com',
        phone: '+39 333 6789012',
        username: 'francesca.romano',
        password: hashedPassword,
        isActive: true,
        status: 'ACTIVE',
        title: 'Production Manager',
        hiredDate: new Date('2021-06-01'),
        tenantId: tenant.id,
        companyId: company.id,
        gdprConsentDate,
        gdprConsentVersion: '1.0',
        dataRetentionUntil: dataRetentionDate,
        roles: ['MANAGER', 'EMPLOYEE']
      }
    ];

    // 5. Crea le persone e i loro ruoli
    for (const personData of personsData) {
      const { roles, ...personFields } = personData;
      
      console.log(`📝 Creando persona: ${personFields.firstName} ${personFields.lastName}`);
      
      const person = await prisma.person.create({
        data: personFields
      });

      // Crea i ruoli per ogni persona
      for (const roleType of roles) {
        await prisma.personRole.create({
          data: {
            personId: person.id,
            roleType: roleType,
            isActive: true,
            isPrimary: roles.indexOf(roleType) === 0, // Il primo ruolo è primario
            assignedAt: currentDate,
            validFrom: currentDate,
            companyId: person.companyId,
            tenantId: person.tenantId
          }
        });
        console.log(`  ✅ Ruolo assegnato: ${roleType}`);
      }
    }

    // 6. Crea un corso di esempio
    const course = await prisma.course.create({
      data: {
        id: 'course-safety-001',
        title: 'Corso di Sicurezza sul Lavoro - Base',
        category: 'Sicurezza',
        description: 'Corso base sulla sicurezza nei luoghi di lavoro secondo D.Lgs. 81/08',
        duration: '8 ore',
        status: 'ACTIVE',
        code: 'SAFE-001',
        contents: 'Normativa, rischi, prevenzione, DPI, emergenze',
        maxPeople: 15,
        pricePerPerson: 150.00,
        validityYears: 5,
        tenantId: tenant.id
      }
    });
    console.log('✅ Corso creato:', course.title);

    // 7. Crea una programmazione del corso
    const schedule = await prisma.courseSchedule.create({
      data: {
        id: 'schedule-001',
        courseId: course.id,
        start_date: new Date('2024-02-15T09:00:00Z'),
        end_date: new Date('2024-02-15T17:00:00Z'),
        location: 'Aula Formazione - Sede Milano',
        max_participants: 15,
        status: 'SCHEDULED',
        companyId: company.id,
        trainerId: 'person-trainer-001', // Anna Ferrari
        delivery_mode: 'IN_PERSON',
        notes: 'Corso obbligatorio per tutti i nuovi assunti'
      }
    });
    console.log('✅ Programmazione corso creata');

    console.log('\n🎉 Migrazione completata con successo!');
    console.log('\n📊 Riepilogo dati creati:');
    console.log(`- 1 Tenant: ${tenant.name}`);
    console.log(`- 1 Company: ${company.ragioneSociale}`);
    console.log(`- ${personsData.length} Persone con ruoli diversi`);
    console.log(`- 1 Corso: ${course.title}`);
    console.log(`- 1 Programmazione corso`);
    
    console.log('\n🔐 Credenziali di accesso:');
    console.log('Super Admin: mario.rossi / Password123!');
    console.log('HR Manager: laura.bianchi / Password123!');
    console.log('Trainer: anna.ferrari / Password123!');
    console.log('External Trainer: marco.colombo / Password123!');
    console.log('Manager: francesca.romano / Password123!');
    
    console.log('\n✅ Tutti i dati rispettano i principi GDPR:');
    console.log('- Consenso esplicito registrato');
    console.log('- Data retention impostata a 7 anni');
    console.log('- Versione consenso tracciata');
    console.log('- Dati minimizzati e necessari');

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    throw error;
  }
}

async function main() {
  try {
    await createSampleData();
  } catch (error) {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createSampleData };