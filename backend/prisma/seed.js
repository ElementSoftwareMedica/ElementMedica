/**
 * Database Seed - Essential Data Only
 * 
 * Questo seed crea SOLO i dati essenziali per far funzionare l'applicazione:
 * - Tenant di default (Element Formazione + Element Medica)
 * - Utente admin con tutti i permessi
 * - Ruoli base (ADMIN, USER, EMPLOYEE, etc.)
 * - Azienda e dipendenti di test
 * 
 * I template (CMS, Form, Document) vengono importati da backup separatamente.
 * 
 * @module prisma/seed
 * @version 3.0.0 - E2E Migration (formato permessi resource:action)
 */

import bcrypt from 'bcryptjs';
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

  // Tenant 1: Element Formazione (default)
  let defaultTenant = await prisma.tenant.findUnique({
    where: { slug: 'default-company' }
  });

  if (!defaultTenant) {
    defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Element Formazione',
        slug: 'default-company',
        domain: 'localhost',
        settings: {
          primaryColor: '#2563eb',
          logo: '/logo-formazione.png',
          features: ['courses', 'schedules', 'employees', 'companies', 'preventivi']
        },
        billingPlan: 'enterprise',
        maxUsers: 1000,
        maxCompanies: 100,
        isActive: true
      }
    });
    console.log('  ✅ Element Formazione tenant created');
  } else {
    console.log('  ✅ Element Formazione tenant exists');
  }

  // Tenant 2: Element Medica
  let medicaTenant = await prisma.tenant.findUnique({
    where: { slug: 'element-medica' }
  });

  if (!medicaTenant) {
    medicaTenant = await prisma.tenant.create({
      data: {
        name: 'Element Medica',
        slug: 'element-medica',
        domain: 'medica.localhost',
        settings: {
          primaryColor: '#059669',
          logo: '/logo-medica.png',
          features: ['clinica', 'visite', 'referti', 'medici', 'pazienti']
        },
        billingPlan: 'enterprise',
        maxUsers: 1000,
        maxCompanies: 100,
        isActive: true
      }
    });
    console.log('  ✅ Element Medica tenant created');
  } else {
    console.log('  ✅ Element Medica tenant exists');
  }

  return { defaultTenant, medicaTenant };
}

/**
 * Crea l'utente admin con tutti i permessi
 */
async function seedAdminUser(tenantId) {
  console.log('👤 Seeding admin user...');

  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    console.error('❌ SEED_ADMIN_PASSWORD non configurata!');
    console.log('   Imposta: export SEED_ADMIN_PASSWORD="TuaPasswordSicura"');
    process.exit(1);
  }

  let adminUser = await prisma.person.findUnique({
    where: { email: 'admin@example.com' }
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    adminUser = await prisma.person.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        status: 'ACTIVE',
        globalRole: 'ADMIN',
        tenantId: tenantId,
        gdprConsentDate: new Date(),
        gdprConsentVersion: '1.0',
        personRoles: {
          create: {
            roleType: 'ADMIN',
            tenantId: tenantId,
            isActive: true,
            isPrimary: true
          }
        }
      }
    });
    console.log('  ✅ Admin user created:', adminUser.email);
  } else {
    console.log('  ✅ Admin user exists:', adminUser.email);
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
      console.log(`  ✅ Access granted: ${adminUser.email} -> ${tenant.slug}`);
    } else {
      console.log(`  ✅ Access exists: ${adminUser.email} -> ${tenant.slug}`);
    }
  }
}

/**
 * Crea azienda e dipendenti di test
 */
async function seedTestData(tenantId) {
  console.log('📦 Seeding test data...');

  // Test Company
  let testCompany = await prisma.company.findFirst({
    where: { codiceFiscale: '12345678901', tenantId }
  });

  if (!testCompany) {
    testCompany = await prisma.company.create({
      data: {
        ragioneSociale: 'Test Company S.r.l.',
        codiceFiscale: '12345678901',
        piva: '12345678901',
        mail: 'info@testcompany.com',
        telefono: '+39 123 456 7890',
        sedeAzienda: 'Via Test 123, Milano',
        cap: '20100',
        citta: 'Milano',
        provincia: 'MI',
        personaRiferimento: 'Mario Rossi',
        isActive: true,
        tenantId
      }
    });
    console.log('  ✅ Test company created');
  } else {
    console.log('  ✅ Test company exists');
  }

  // Test Course
  let testCourse = await prisma.course.findUnique({
    where: { code: 'SEC001' }
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

  // Test Employees
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
          email: emp.email,
          username: emp.email.split('@')[0],
          taxCode: emp.taxCode,
          password,
          status: 'ACTIVE',
          globalRole: 'USER',
          tenantId,
          companyId: testCompany.id,
          gdprConsentDate: new Date(),
          gdprConsentVersion: '1.0',
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

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ SEED COMPLETATO                                        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`⏱️  Tempo: ${duration}s`);
    console.log(`📅 Data: ${new Date().toLocaleString('it-IT')}\n`);

    console.log('ℹ️  Per importare i template CMS/Form/Document:');
    console.log('   npm run seed:templates\n');

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
