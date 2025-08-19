import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestData() {
  console.log('🌱 Creating test data for multi-site functionality...');

  try {
    // Get the default tenant
    const defaultTenant = await prisma.tenant.findFirst({
      where: { slug: 'default-company' }
    });

    if (!defaultTenant) {
      console.error('❌ Default tenant not found');
      return;
    }

    // Create test companies with multiple sites
    console.log('📊 Creating test companies...');

    // Company 1: TechCorp S.r.l. with 3 sites
    const techCorp = await prisma.company.create({
      data: {
        ragioneSociale: 'TechCorp S.r.l.',
        codiceFiscale: '12345678901',
        piva: '12345678901',
        mail: 'info@techcorp.com',
        telefono: '+39 02 1234567',
        sedeAzienda: 'Via Milano 123, Milano',
        cap: '20100',
        citta: 'Milano',
        provincia: 'MI',
        personaRiferimento: 'Marco Rossi',
        codiceAteco: '62.01.00',
        sdi: 'ABCDEFG',
        pec: 'techcorp@pec.it',
        iban: 'IT60X0542811101000000123456',
        isActive: true,
        tenantId: defaultTenant.id
      }
    });

    // Create sites for TechCorp
    const techCorpSites = await Promise.all([
      // Sede principale Milano
      prisma.companySite.create({
        data: {
          companyId: techCorp.id,
          siteName: 'Sede Principale Milano',
          citta: 'Milano',
          indirizzo: 'Via Milano 123',
          cap: '20100',
          provincia: 'MI',
          personaRiferimento: 'Marco Rossi',
          telefono: '+39 02 1234567',
          mail: 'milano@techcorp.com',
          dvr: 'DVR-MILANO-2024',
          tenantId: defaultTenant.id
        }
      }),
      // Filiale Roma
      prisma.companySite.create({
        data: {
          companyId: techCorp.id,
          siteName: 'Filiale Roma',
          citta: 'Roma',
          indirizzo: 'Via Roma 456',
          cap: '00100',
          provincia: 'RM',
          personaRiferimento: 'Giulia Bianchi',
          telefono: '+39 06 7654321',
          mail: 'roma@techcorp.com',
          dvr: 'DVR-ROMA-2024',
          tenantId: defaultTenant.id
        }
      }),
      // Stabilimento Torino
      prisma.companySite.create({
        data: {
          companyId: techCorp.id,
          siteName: 'Stabilimento Torino',
          citta: 'Torino',
          indirizzo: 'Via Torino 789',
          cap: '10100',
          provincia: 'TO',
          personaRiferimento: 'Andrea Verdi',
          telefono: '+39 011 9876543',
          mail: 'torino@techcorp.com',
          dvr: 'DVR-TORINO-2024',
          tenantId: defaultTenant.id
        }
      })
    ]);

    console.log('✅ TechCorp sites created:', techCorpSites.length);

    // Company 2: GreenEnergy S.p.A. with 2 sites
    const greenEnergy = await prisma.company.create({
      data: {
        ragioneSociale: 'GreenEnergy S.p.A.',
        codiceFiscale: '98765432109',
        piva: '98765432109',
        mail: 'info@greenenergy.com',
        telefono: '+39 051 1111111',
        sedeAzienda: 'Via Bologna 100, Bologna',
        cap: '40100',
        citta: 'Bologna',
        provincia: 'BO',
        personaRiferimento: 'Laura Neri',
        codiceAteco: '35.11.00',
        sdi: 'HIJKLMN',
        pec: 'greenenergy@pec.it',
        iban: 'IT60X0542811101000000654321',
        isActive: true,
        tenantId: defaultTenant.id
      }
    });

    // Create sites for GreenEnergy
    const greenEnergySites = await Promise.all([
      // Sede Bologna
      prisma.companySite.create({
        data: {
          companyId: greenEnergy.id,
          siteName: 'Sede Bologna',
          citta: 'Bologna',
          indirizzo: 'Via Bologna 100',
          cap: '40100',
          provincia: 'BO',
          personaRiferimento: 'Laura Neri',
          telefono: '+39 051 1111111',
          mail: 'bologna@greenenergy.com',
          dvr: 'DVR-BOLOGNA-2024',
          tenantId: defaultTenant.id
        }
      }),
      // Impianto Firenze
      prisma.companySite.create({
        data: {
          companyId: greenEnergy.id,
          siteName: 'Impianto Firenze',
          citta: 'Firenze',
          indirizzo: 'Via Firenze 200',
          cap: '50100',
          provincia: 'FI',
          personaRiferimento: 'Roberto Gialli',
          telefono: '+39 055 2222222',
          mail: 'firenze@greenenergy.com',
          dvr: 'DVR-FIRENZE-2024',
          tenantId: defaultTenant.id
        }
      })
    ]);

    console.log('✅ GreenEnergy sites created:', greenEnergySites.length);

    // Create test persons for different sites
    console.log('👥 Creating test persons...');

    const hashedPassword = await bcrypt.hash('Test123!', 10);

    // RSPP for TechCorp Milano
    const rsppMilano = await prisma.person.create({
      data: {
        firstName: 'Mario',
        lastName: 'Sicurezza',
        email: 'mario.sicurezza@techcorp.com',
        username: 'mario.sicurezza',
        password: hashedPassword,
        status: 'ACTIVE',
        globalRole: 'EMPLOYEE',
        companyId: techCorp.id,
        siteId: techCorpSites[0].id, // Milano
        tenantId: defaultTenant.id,
        gdprConsentDate: new Date(),
        gdprConsentVersion: '1.0',
        title: 'RSPP',
        phone: '+39 333 1111111'
      }
    });

    // Medico Competente for TechCorp Milano
    const medicoMilano = await prisma.person.create({
      data: {
        firstName: 'Dott.ssa Anna',
        lastName: 'Medici',
        email: 'anna.medici@techcorp.com',
        username: 'anna.medici',
        password: hashedPassword,
        status: 'ACTIVE',
        globalRole: 'EMPLOYEE',
        companyId: techCorp.id,
        siteId: techCorpSites[0].id, // Milano
        tenantId: defaultTenant.id,
        gdprConsentDate: new Date(),
        gdprConsentVersion: '1.0',
        title: 'Medico Competente',
        phone: '+39 333 2222222'
      }
    });

    // Update Milano site with RSPP and Medico Competente
    await prisma.companySite.update({
      where: { id: techCorpSites[0].id },
      data: {
        rsppId: rsppMilano.id,
        medicoCompetenteId: medicoMilano.id
      }
    });

    // Create some employees for different sites
    const employees = await Promise.all([
      // Employee Milano
      prisma.person.create({
        data: {
          firstName: 'Luca',
          lastName: 'Sviluppatore',
          email: 'luca.sviluppatore@techcorp.com',
          username: 'luca.sviluppatore',
          password: hashedPassword,
          status: 'ACTIVE',
          globalRole: 'EMPLOYEE',
          companyId: techCorp.id,
          siteId: techCorpSites[0].id, // Milano
          tenantId: defaultTenant.id,
          gdprConsentDate: new Date(),
          gdprConsentVersion: '1.0',
          title: 'Sviluppatore Senior',
          phone: '+39 333 3333333'
        }
      }),
      // Employee Roma
      prisma.person.create({
        data: {
          firstName: 'Sara',
          lastName: 'Marketing',
          email: 'sara.marketing@techcorp.com',
          username: 'sara.marketing',
          password: hashedPassword,
          status: 'ACTIVE',
          globalRole: 'EMPLOYEE',
          companyId: techCorp.id,
          siteId: techCorpSites[1].id, // Roma
          tenantId: defaultTenant.id,
          gdprConsentDate: new Date(),
          gdprConsentVersion: '1.0',
          title: 'Marketing Manager',
          phone: '+39 333 4444444'
        }
      }),
      // Employee Torino
      prisma.person.create({
        data: {
          firstName: 'Paolo',
          lastName: 'Produzione',
          email: 'paolo.produzione@techcorp.com',
          username: 'paolo.produzione',
          password: hashedPassword,
          status: 'ACTIVE',
          globalRole: 'EMPLOYEE',
          companyId: techCorp.id,
          siteId: techCorpSites[2].id, // Torino
          tenantId: defaultTenant.id,
          gdprConsentDate: new Date(),
          gdprConsentVersion: '1.0',
          title: 'Operatore di Produzione',
          phone: '+39 333 5555555'
        }
      })
    ]);

    console.log('✅ Test employees created:', employees.length);

    // Create some reparti for sites
    console.log('🏢 Creating reparti...');

    const reparti = await Promise.all([
      // Reparti Milano
      prisma.reparto.create({
        data: {
          nome: 'Sviluppo Software',
          descrizione: 'Reparto sviluppo applicazioni',
          codice: 'DEV-MI',
          siteId: techCorpSites[0].id,
          responsabileId: employees[0].id, // Luca
          tenantId: defaultTenant.id
        }
      }),
      prisma.reparto.create({
        data: {
          nome: 'Amministrazione',
          descrizione: 'Reparto amministrativo',
          codice: 'ADM-MI',
          siteId: techCorpSites[0].id,
          tenantId: defaultTenant.id
        }
      }),
      // Reparto Roma
      prisma.reparto.create({
        data: {
          nome: 'Marketing',
          descrizione: 'Reparto marketing e comunicazione',
          codice: 'MKT-RM',
          siteId: techCorpSites[1].id,
          responsabileId: employees[1].id, // Sara
          tenantId: defaultTenant.id
        }
      }),
      // Reparto Torino
      prisma.reparto.create({
        data: {
          nome: 'Produzione',
          descrizione: 'Reparto produzione industriale',
          codice: 'PROD-TO',
          siteId: techCorpSites[2].id,
          responsabileId: employees[2].id, // Paolo
          tenantId: defaultTenant.id
        }
      })
    ]);

    console.log('✅ Reparti created:', reparti.length);

    // Assign employees to reparti
    await Promise.all([
      prisma.person.update({
        where: { id: employees[0].id },
        data: { repartoId: reparti[0].id } // Luca -> Sviluppo Software
      }),
      prisma.person.update({
        where: { id: employees[1].id },
        data: { repartoId: reparti[2].id } // Sara -> Marketing
      }),
      prisma.person.update({
        where: { id: employees[2].id },
        data: { repartoId: reparti[3].id } // Paolo -> Produzione
      })
    ]);

    // Create some DVR records
    console.log('📋 Creating DVR records...');

    const dvrs = await Promise.all([
      prisma.dVR.create({
        data: {
          siteId: techCorpSites[0].id, // Milano
          effettuatoDa: 'Mario Sicurezza',
          dataEsecuzione: new Date('2024-01-15'),
          dataScadenza: new Date('2025-01-15'),
          rischiRilevati: 'Rischi ergonomici postazioni VDT, rischi elettrici',
          note: 'DVR aggiornato secondo D.Lgs. 81/08',
          tenantId: defaultTenant.id
        }
      }),
      prisma.dVR.create({
        data: {
          siteId: techCorpSites[1].id, // Roma
          effettuatoDa: 'Consulente Esterno',
          dataEsecuzione: new Date('2024-02-10'),
          dataScadenza: new Date('2025-02-10'),
          rischiRilevati: 'Rischi da stress lavoro-correlato',
          note: 'Prima valutazione per nuova sede',
          tenantId: defaultTenant.id
        }
      })
    ]);

    console.log('✅ DVR records created:', dvrs.length);

    // Create some sopralluoghi
    console.log('🔍 Creating sopralluoghi...');

    const sopralluoghi = await Promise.all([
      prisma.sopralluogo.create({
        data: {
          siteId: techCorpSites[0].id, // Milano
          esecutoreId: rsppMilano.id,
          dataEsecuzione: new Date('2024-03-15'),
          dataProssimoSopralluogo: new Date('2024-09-15'),
          valutazione: 'Situazione generale buona, da migliorare illuminazione area break',
          esito: 'POSITIVO',
          note: 'Raccomandazioni implementate',
          tenantId: defaultTenant.id
        }
      }),
      prisma.sopralluogo.create({
        data: {
          siteId: techCorpSites[0].id, // Milano
          esecutoreId: medicoMilano.id,
          dataEsecuzione: new Date('2024-04-20'),
          dataProssimoSopralluogo: new Date('2024-10-20'),
          valutazione: 'Controllo sanitario postazioni di lavoro completato',
          esito: 'CONFORME',
          note: 'Visite mediche programmate',
          tenantId: defaultTenant.id
        }
      })
    ]);

    console.log('✅ Sopralluoghi created:', sopralluoghi.length);

    console.log('🎉 Test data creation completed successfully!');
    console.log(`
📊 Summary:
- Companies: 2
- Sites: ${techCorpSites.length + greenEnergySites.length}
- Persons: ${employees.length + 2} (including RSPP and Medico)
- Reparti: ${reparti.length}
- DVR: ${dvrs.length}
- Sopralluoghi: ${sopralluoghi.length}
    `);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();