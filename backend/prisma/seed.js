/**
 * Database Seed - Essential Data Only
 * 
 * Questo seed crea SOLO i dati essenziali per far funzionare l'applicazione:
 * - Tenant di default (Element Sicurezza + Element srl / Element Medica)
 * - Utente admin con tutti i permessi
 * - Ruoli base (ADMIN, USER, EMPLOYEE, etc.)
 * - Azienda e dipendenti di test
 * 
 * I template (CMS, Form, Document) vengono importati da backup separatamente.
 * 
 * @module prisma/seed
 * @version 3.0.0 - E2E Migration (formato permessi resource:action)
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { ALL_PERMISSIONS } from '../constants/permissions.js';

const prisma = new PrismaClient();

// ============================================
// SEED FUNCTIONS
// ============================================

/**
 * Crea o recupera i tenant di default
 */
async function seedTenants() {
  console.log('🏢 Seeding tenants...');

  // Tenant 1: Element Sicurezza (default)
  let defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'element-sicurezza' }
  });

  const sicurezzaSettings = {
    logoUrl: '/assets/logos/element-sicurezza-logo.png',
    logoWhiteUrl: '/assets/logos/element-sicurezza-logo-white.png',
    logoCompactUrl: '/assets/logos/element-sicurezza-logo-compact.png',
    branches: {
      FORMAZIONE: {
        name: 'Element Sicurezza',
        logo: '/assets/logos/element-sicurezza-logo.png',
        logoWhite: '/assets/logos/element-sicurezza-logo-white.png',
        logoCompact: '/assets/logos/element-sicurezza-logo-compact.png'
      },
      MEDICA: {
        name: 'Element Medica',
        logo: '/assets/logos/element-medica-logo.png',
        logoWhite: '/assets/logos/element-medica-logo-white.png',
        logoCompact: '/assets/logos/element-medica-logo-compact.png'
      },
      MDL: {
        name: 'Element MDL',
        logo: '/assets/logos/element-sicurezza-logo.png',
        logoWhite: '/assets/logos/element-sicurezza-logo-white.png'
      }
    },
    companyName: 'Element Sicurezza',
    primaryColor: '#2563eb',
    brandColors: { primary: '#2563eb', secondary: '#1e40af' },
    phone: '+39 351 318 1574',
    email: 'info@elementsicurezza.com',
    vatNumber: '12345678901',
    fiscalCode: '12345678901',
    features: ['courses', 'schedules', 'employees', 'companies', 'preventivi']
  };

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Element Sicurezza',
        slug: 'element-sicurezza',
        domain: 'localhost',
        settings: sicurezzaSettings,
        billingPlan: 'enterprise',
        maxUsers: 1000,
        maxCompanies: 100,
        isActive: true
      }
    });
    console.log('  ✅ Element Sicurezza tenant created');
  } else {
    // Aggiorna settings se mancano branches/logoUrl
    const existing = defaultTenant.settings || {};
    if (!existing.branches || !existing.logoUrl) {
      await prisma.tenant.update({
        where: { id: defaultTenant.id },
        data: { settings: { ...existing, ...sicurezzaSettings } }
      });
      console.log('  ✅ Element Sicurezza settings aggiornate (branches/logoUrl)');
    } else {
      console.log('  ✅ Element Sicurezza tenant exists');
    }
  }

  // Tenant 2: Element srl (frontend pubblico Element Medica)
  let medicaTenant = await prisma.tenant.findUnique({
    where: { slug: 'element-medica' }
  });

  if (!medicaTenant) {
    medicaTenant = await prisma.tenant.create({
      data: {
        name: 'Element srl',
        slug: 'element-medica',
        domain: 'medica.localhost',
        settings: {
          logoUrl: '/assets/logos/element-medica-logo.png',
          logoWhiteUrl: '/assets/logos/element-medica-logo-white.png',
          logoCompactUrl: '/assets/logos/element-medica-logo-compact.png',
          logoIconUrl: '/assets/logos/element-medica-icon.png',
          branches: {
            MEDICA: {
              name: 'Element Medica',
              logo: '/assets/logos/element-medica-logo.png',
              logoWhite: '/assets/logos/element-medica-logo-white.png',
              logoCompact: '/assets/logos/element-medica-logo-compact.png'
            },
            FORMAZIONE: {
              name: 'Element Sicurezza',
              logo: '/assets/logos/element-sicurezza-logo.png',
              logoWhite: '/assets/logos/element-sicurezza-logo-white.png',
              logoCompact: '/assets/logos/element-sicurezza-logo-compact.png'
            },
            MDL: {
              name: 'Element MDL',
              logo: '/assets/logos/element-medica-logo.png',
              logoWhite: '/assets/logos/element-medica-logo-white.png'
            }
          },
          brandColors: {
            primary: '#A1C8C1',
            secondary: '#233747',
            accent: '#EDF1EE',
            light: '#F7FAF9'
          },
          companyName: 'Element srl',
          vat: '05580640281',
          phone: '+39 351 318 1574',
          email: 'info@elementmedica.com',
          pec: 'element.srl@pec.it',
          address: 'Via Bracciano 34, 35030 Selvazzano Dentro (PD)',
          sedeLegale: 'Via Piave 4, 35138 Padova',
          features: ['clinica', 'visite', 'referti', 'medici', 'pazienti', 'fatturazione']
        },
        billingPlan: 'enterprise',
        maxUsers: 1000,
        maxCompanies: 100,
        isActive: true
      }
    });
    console.log('  ✅ Element srl tenant created (frontend: Element Medica)');
  } else {
    // Aggiorna settings se mancano branches/logoUrl
    const existing = medicaTenant.settings || {};
    if (!existing.branches || !existing.logoUrl) {
      await prisma.tenant.update({
        where: { id: medicaTenant.id },
        data: {
          settings: {
            ...existing,
            logoUrl: '/assets/logos/element-medica-logo.png',
            logoWhiteUrl: '/assets/logos/element-medica-logo-white.png',
            logoCompactUrl: '/assets/logos/element-medica-logo-compact.png',
            branches: {
              MEDICA: {
                name: 'Element Medica',
                logo: '/assets/logos/element-medica-logo.png',
                logoWhite: '/assets/logos/element-medica-logo-white.png',
                logoCompact: '/assets/logos/element-medica-logo-compact.png'
              },
              FORMAZIONE: {
                name: 'Element Sicurezza',
                logo: '/assets/logos/element-sicurezza-logo.png',
                logoWhite: '/assets/logos/element-sicurezza-logo-white.png',
                logoCompact: '/assets/logos/element-sicurezza-logo-compact.png'
              },
              MDL: {
                name: 'Element MDL',
                logo: '/assets/logos/element-medica-logo.png',
                logoWhite: '/assets/logos/element-medica-logo-white.png'
              }
            }
          }
        }
      });
      console.log('  ✅ Element srl settings aggiornate (branches/logoUrl)');
    } else {
      console.log('  ✅ Element srl tenant exists (frontend: Element Medica)');
    }
  }

  return { defaultTenant, medicaTenant };
}

/**
 * Crea l'utente admin con tutti i permessi
 * 
 * PROGETTO 48: Person ora contiene solo dati globali.
 * email, status, etc. sono in PersonTenantProfile.
 */
async function seedAdminUser(tenantId) {
  console.log('👤 Seeding admin user...');

  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    console.error('❌ SEED_ADMIN_PASSWORD non configurata!');
    console.log('   Imposta: export SEED_ADMIN_PASSWORD="TuaPasswordSicura"');
    process.exit(1);
  }

  // Cerca per username (campo globale in Person)
  let adminUser = await prisma.person.findUnique({
    where: { username: 'admin' },
    include: { tenantProfiles: true }
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    adminUser = await prisma.person.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        password: hashedPassword,
        gdprConsentDate: new Date(),
        gdprConsentVersion: '1.0',
        // P49: Person è globale, tenantId è in PersonTenantProfile
        tenantProfiles: {
          create: {
            tenantId: tenantId,
            email: 'admin@example.com',
            status: 'ACTIVE',
            isActive: true,
            isPrimary: true,
            title: 'System Administrator'
          }
        },
        personRoles: {
          create: {
            roleType: 'SUPER_ADMIN',
            tenantId: tenantId,
            isActive: true,
            isPrimary: true
          }
        }
      },
      include: { tenantProfiles: true }
    });
    console.log('  ✅ Admin user created:', adminUser.username);
  } else {
    console.log('  ✅ Admin user exists:', adminUser.username);
  }

  return adminUser;
}

/**
 * Assegna tutti i permessi all'admin
 */
async function seedAdminPermissions(adminUser) {
  console.log('🔐 Assigning admin permissions...');

  const adminRole = await prisma.personRole.findFirst({
    where: {
      personId: adminUser.id,
      roleType: 'ADMIN',
      deletedAt: null
    }
  });

  if (!adminRole) {
    console.log('  ⚠️  Admin role not found, skipping permissions');
    return;
  }

  let added = 0;
  let existing = 0;
  let errors = 0;

  for (const permission of ALL_PERMISSIONS) {
    try {
      const existingPerm = await prisma.rolePermission.findUnique({
        where: {
          personRoleId_permission: {
            personRoleId: adminRole.id,
            permission: permission
          }
        }
      });

      if (!existingPerm) {
        await prisma.rolePermission.create({
          data: {
            id: crypto.randomUUID(),
            personRoleId: adminRole.id,
            permission: permission,
            isGranted: true,
            grantedBy: adminUser.id
          }
        });
        added++;
      } else if (!existingPerm.isGranted || existingPerm.deletedAt) {
        await prisma.rolePermission.update({
          where: { id: existingPerm.id },
          data: { isGranted: true, deletedAt: null }
        });
        added++;
      } else {
        existing++;
      }
    } catch (error) {
      errors++;
      if (errors <= 5) {
        console.log(`  ⚠️ Error for ${permission}: ${error.message}`);
      }
    }
  }

  if (errors > 5) {
    console.log(`  ⚠️ ... and ${errors - 5} more errors`);
  }

  console.log(`  ✅ Permissions: ${added} added, ${existing} existing, ${errors} errors (total: ${ALL_PERMISSIONS.length})`);
}

/**
 * Crea cross-tenant access per admin su tutti i tenant
 */
async function seedPersonTenantAccess(adminUser, tenants) {
  console.log('🔗 Setting up cross-tenant access...');

  for (const tenant of tenants) {
    if (tenant.id === adminUser.tenantId) continue;

    const existing = await prisma.personTenantAccess.findUnique({
      where: {
        personId_tenantId: {
          personId: adminUser.id,
          tenantId: tenant.id
        }
      }
    });

    if (!existing) {
      await prisma.personTenantAccess.create({
        data: {
          personId: adminUser.id,
          tenantId: tenant.id,
          accessLevel: 'ADMIN',
          isActive: true,
          grantedBy: adminUser.id
        }
      });
      console.log(`  ✅ Access granted: ${adminUser.username} -> ${tenant.slug}`);
    } else {
      console.log(`  ✅ Access exists: ${adminUser.username} -> ${tenant.slug}`);
    }
  }
}

/**
 * Crea azienda e dipendenti di test
 */
async function seedTestData(tenantId) {
  console.log('📦 Seeding test data...');

  // P49: Company è globale, il link a tenant è in CompanyTenantProfile
  // Cerco per codiceFiscale (campo globale)
  let testCompany = await prisma.company.findFirst({
    where: { codiceFiscale: '12345678901' },
    include: { tenantProfiles: true }
  });

  let companyTenantProfile;

  if (!testCompany) {
    // Crea Company globale + CompanyTenantProfile
    testCompany = await prisma.company.create({
      data: {
        ragioneSociale: 'Test Company S.r.l.',
        codiceFiscale: '12345678901',
        piva: '12345678901',
        sedeLegaleIndirizzo: 'Via Test 123',
        sedeLegaleCitta: 'Milano',
        sedeLegaleCap: '20100',
        sedeLegaleProvincia: 'MI',
        sedeLegaleNazione: 'IT',
        // P49: Email e dati per-tenant vanno in CompanyTenantProfile
        tenantProfiles: {
          create: {
            tenantId,
            emailGenerale: 'info@testcompany.com',
            telefonoGenerale: '+39 123 456 7890',
            // referenteId va impostato dopo creazione persona se necessario
            tipoContratto: 'Cliente',
            status: 'ACTIVE',
            isActive: true
          }
        }
      },
      include: { tenantProfiles: true }
    });
    companyTenantProfile = testCompany.tenantProfiles[0];
    console.log('  ✅ Test company created');
  } else {
    // Verifica se esiste già il profilo per questo tenant
    companyTenantProfile = testCompany.tenantProfiles.find(p => p.tenantId === tenantId);
    if (!companyTenantProfile) {
      companyTenantProfile = await prisma.companyTenantProfile.create({
        data: {
          companyId: testCompany.id,
          tenantId,
          emailGenerale: 'info@testcompany.com',
          telefonoGenerale: '+39 123 456 7890',
          tipoContratto: 'Cliente',
          status: 'ACTIVE',
          isActive: true
        }
      });
      console.log('  ✅ Test company profile created for tenant');
    } else {
      console.log('  ✅ Test company exists');
    }
  }

  // Test Course - usa compound unique (tenantId_code)
  let testCourse = await prisma.course.findUnique({
    where: { tenantId_code: { tenantId, code: 'SEC001' } }
  });

  if (!testCourse) {
    testCourse = await prisma.course.create({
      data: {
        title: 'Corso di Sicurezza sul Lavoro',
        category: 'Sicurezza',
        description: 'Corso base sulla sicurezza nei luoghi di lavoro',
        duration: '8 ore',
        status: 'ACTIVE',
        code: 'SEC001',
        maxPeople: 20,
        pricePerPerson: 150.00,
        validityYears: 5,
        tenantId
      }
    });
    console.log('  ✅ Test course created');
  } else {
    console.log('  ✅ Test course exists');
  }

  // Test Employees (P49: Person globale, dati tenant in PersonTenantProfile)
  const employees = [
    { firstName: 'Mario', lastName: 'Rossi', taxCode: 'RSSMRA80A01H501Z', email: 'mario.rossi@testcompany.com' },
    { firstName: 'Giulia', lastName: 'Bianchi', taxCode: 'BNCGLI85B15F205X', email: 'giulia.bianchi@testcompany.com' },
    { firstName: 'Luca', lastName: 'Verdi', taxCode: 'VRDLCU90C20L219Y', email: 'luca.verdi@testcompany.com' }
  ];

  for (const emp of employees) {
    const existing = await prisma.person.findUnique({
      where: { taxCode: emp.taxCode }
    });

    if (!existing) {
      const password = await bcrypt.hash(crypto.randomBytes(18).toString('base64url'), 12);
      await prisma.person.create({
        data: {
          firstName: emp.firstName,
          lastName: emp.lastName,
          username: emp.email.split('@')[0],
          taxCode: emp.taxCode,
          password,
          gdprConsentDate: new Date(),
          gdprConsentVersion: '1.0',
          // P49: email e status vanno in tenantProfiles
          tenantProfiles: {
            create: {
              tenantId,
              email: emp.email,
              status: 'ACTIVE',
              isActive: true,
              isPrimary: true,
              companyTenantProfileId: companyTenantProfile.id
            }
          },
          personRoles: {
            create: {
              roleType: 'EMPLOYEE',
              tenantId,
              isActive: true,
              isPrimary: true
            }
          }
        }
      });
      console.log(`  ✅ Employee created: ${emp.firstName} ${emp.lastName}`);
    } else {
      console.log(`  ✅ Employee exists: ${emp.firstName} ${emp.lastName}`);
    }
  }
}

// ============================================
// SEED TARIFFARIO TEMPLATE MDL
// ============================================

/**
 * Crea un tariffario template base per il tenant specificato.
 * Viene eseguito per ogni tenant in modo idempotente (upsert via codice).
 * Il template copre tutte le tipologie di voce MDL previste dal D.Lgs 81/08.
 */
async function seedTariffarioTemplate(tenantId) {
  const CODICE = 'TEMPLATE-MDL-BASE';

  const existing = await prisma.tariffarioAziendale.findFirst({
    where: { tenantId, codice: CODICE, deletedAt: null }
  });

  if (existing) {
    console.log(`  ⏭  Tariffario template già presente per tenant ${tenantId}`);
    return existing;
  }

  // Helper: aggiunge tenantId a ogni voce (Prisma non lo eredita dal parent)
  const withTenant = (items) => items.map(v => ({ ...v, tenantId }));

  const tariffario = await prisma.tariffarioAziendale.create({
    data: {
      codice: CODICE,
      nome: 'Tariffario Base Medicina del Lavoro',
      descrizione: 'Template standard voci MDL — personalizzabile per ogni azienda. Conforme D.Lgs 81/08.',
      attivo: true,
      tenantId,
      voci: {
        create: withTenant([
          // ── VISITE MDL (per categoria, art. 41) ──────────────────────────
          {
            tipo: 'PRESTAZIONE', nome: 'Visita Medica del Lavoro – Preventiva',
            categoriaVisita: 'PREVENTIVA', prezzoBase: 60.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_ESECUZIONE'
          },
          {
            tipo: 'PRESTAZIONE', nome: 'Visita Medica del Lavoro – Prima Visita',
            categoriaVisita: 'PRIMA_VISITA', prezzoBase: 60.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_ESECUZIONE'
          },
          {
            tipo: 'PRESTAZIONE', nome: 'Visita Medica del Lavoro – Periodica',
            categoriaVisita: 'PERIODICA', prezzoBase: 50.00, ivaAliquota: 22,
            frequenza: 'SECONDO_SORVEGLIANZA', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_ESECUZIONE'
          },
          {
            tipo: 'PRESTAZIONE', nome: 'Visita Medica del Lavoro – Dopo Assenza',
            categoriaVisita: 'DOPO_ASSENZA', prezzoBase: 55.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_ESECUZIONE'
          },
          {
            tipo: 'PRESTAZIONE', nome: 'Visita Medica del Lavoro – Straordinaria',
            categoriaVisita: 'STRAORDINARIA', prezzoBase: 65.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_ESECUZIONE'
          },
          // ── CONSULENZE (oraria MC/RSPP) ───────────────────────────────────
          {
            tipo: 'CONSULENZA', nome: 'Consulenza Medico Competente (per ora)',
            prezzoBase: 120.00, ivaAliquota: 22, durataMinimaMinuti: 30,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_CONFERMA'
          },
          {
            tipo: 'CONSULENZA', nome: 'Consulenza RSPP (per ora)',
            prezzoBase: 100.00, ivaAliquota: 22, durataMinimaMinuti: 30,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_CONFERMA'
          },
          // ── SOPRALLUOGHI ──────────────────────────────────────────────────
          {
            tipo: 'SOPRALLUOGO_MC', nome: 'Sopralluogo Medico Competente',
            prezzoBase: 150.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_CONFERMA'
          },
          {
            tipo: 'SOPRALLUOGO_RSPP', nome: 'Sopralluogo RSPP',
            prezzoBase: 150.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_CONFERMA'
          },
          // ── NOMINE ────────────────────────────────────────────────────────
          {
            tipo: 'NOMINA_MC', nome: 'Nomina Medico Competente (annuale)',
            prezzoBase: 250.00, ivaAliquota: 22,
            frequenza: 'ANNUALE', unitaCalcolo: 'FLAT', modalitaAttivazione: 'AUTOMATICA'
          },
          {
            tipo: 'NOMINA_RSPP', nome: 'Nomina RSPP (annuale)',
            prezzoBase: 250.00, ivaAliquota: 22,
            frequenza: 'ANNUALE', unitaCalcolo: 'FLAT', modalitaAttivazione: 'AUTOMATICA'
          },
          // ── DVR ───────────────────────────────────────────────────────────
          {
            tipo: 'DVR_NUOVO', nome: 'Nuovo DVR – Prima redazione',
            descrizione: 'Prima redazione del Documento di Valutazione dei Rischi (Art. 17 D.Lgs 81/08)',
            prezzoBase: 500.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_CONFERMA'
          },
          {
            tipo: 'DVR_AGGIORNAMENTO_CON_MODIFICHE', nome: 'Aggiornamento DVR (con modifiche)',
            descrizione: 'Revisione DVR con variazioni sostanziali ai rischi o alle misure preventive',
            prezzoBase: 300.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_CONFERMA'
          },
          {
            tipo: 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE', nome: 'Aggiornamento DVR (conferma annuale)',
            descrizione: 'Revisione annuale di conferma DVR senza variazioni sostanziali',
            prezzoBase: 200.00, ivaAliquota: 22,
            frequenza: 'ANNUALE', unitaCalcolo: 'FLAT', modalitaAttivazione: 'SU_CONFERMA'
          },
          // ── SPESE FISSE ───────────────────────────────────────────────────
          {
            tipo: 'SPESA_FISSA', nome: 'Gestione Cartella Sanitaria',
            descrizione: 'Apertura e tenuta cartella sanitaria e di rischio per lavoratore',
            prezzoBase: 30.00, ivaAliquota: 22,
            frequenza: 'UNA_TANTUM', unitaCalcolo: 'PER_DIPENDENTE', modalitaAttivazione: 'AUTOMATICA'
          },
          {
            tipo: 'SPESA_RICORRENTE', nome: 'Contributo Gestione Protocollo Sanitario',
            descrizione: 'Quota annuale per aggiornamento e gestione del protocollo sanitario aziendale',
            prezzoBase: 50.00, ivaAliquota: 22,
            frequenza: 'ANNUALE', unitaCalcolo: 'FLAT', modalitaAttivazione: 'AUTOMATICA'
          }
        ])  // end withTenant
      }
    }
  });

  console.log(`  ✅ Tariffario template creato: "${tariffario.nome}" (${tariffario.codice})`);
  return tariffario;
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║   DATABASE SEED - Essential Data Only                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();

  try {
    // 1. Tenants
    const { defaultTenant, medicaTenant } = await seedTenants();

    // 2. Admin User
    const adminUser = await seedAdminUser(defaultTenant.id);

    // 3. Admin Permissions
    await seedAdminPermissions(adminUser);

    // 4. Cross-Tenant Access
    await seedPersonTenantAccess(adminUser, [defaultTenant, medicaTenant]);

    // 5. Test Data
    await seedTestData(defaultTenant.id);

    // 6. Tariffario Template MDL (per ogni tenant)
    console.log('\n📋 Creazione tariffario template MDL...');
    await seedTariffarioTemplate(defaultTenant.id);
    await seedTariffarioTemplate(medicaTenant.id);

    // 7. Template Documenti Predefiniti (per ogni tenant)
    console.log('\n📄 Creazione template documenti predefiniti...');
    const { DefaultTemplateService } = await import('../services/templates/DefaultTemplateService.js');
    const res1 = await DefaultTemplateService.createDefaultTemplates(defaultTenant.id);
    console.log(`  ✅ Element Sicurezza: ${res1.created} creati, ${res1.skipped} già presenti`);
    const res2 = await DefaultTemplateService.createDefaultTemplates(medicaTenant.id);
    console.log(`  ✅ Element Medica: ${res2.created} creati, ${res2.skipped} già presenti`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ SEED COMPLETATO                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`⏱️  Tempo: ${duration}s`);
    console.log(`📅 Data: ${new Date().toLocaleString('it-IT')}\n`);

  } catch (error) {
    console.error('\n❌ SEED FAILED:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
