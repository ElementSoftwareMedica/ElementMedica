/**
 * Script per creare tenant multi-brand
 * Element Sicurezza + Element srl (frontend pubblico: Element Medica)
 *
 * PALETTE COLORI UFFICIALE (da archivio loghi):
 *   primary:   #A1C8C1  (Teal/Salvia)
 *   secondary: #233747  (Navy)
 *   accent:    #EDF1EE  (Nebbia - Element Medica) / #E9BA49 (Ambra - Sicurezza)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creazione tenant multi-brand...\n');

  // 1. Crea tenant Element Sicurezza
  console.log('📝 Creando tenant Element Sicurezza...');
  const tenantFormazione = await prisma.tenant.upsert({
    where: { id: 'tenant-id-formazione' },
    update: {
      name: 'Element Sicurezza',
      slug: 'element-sicurezza',
      domain: 'elementsicurezza.com',
      settings: {
        brandId: 'element-sicurezza',
        features: ['medicinaLavoro', 'corsiFormazione', 'rspp'],
        theme: 'formazione',
        colors: {
          primary: '#0891b2',
          secondary: '#64748b',
          accent: '#22c55e',
        },
      },
      isActive: true,
    },
    create: {
      id: 'tenant-id-formazione',
      name: 'Element Sicurezza',
      slug: 'element-sicurezza',
      domain: 'elementsicurezza.com',
      settings: {
        brandId: 'element-sicurezza',
        features: ['medicinaLavoro', 'corsiFormazione', 'rspp'],
        theme: 'formazione',
        colors: {
          primary: '#0891b2',
          secondary: '#64748b',
          accent: '#22c55e',
        },
      },
      billingPlan: 'enterprise',
      maxUsers: 100,
      maxCompanies: 50,
      isActive: true,
    },
  });
  console.log(`✅ Tenant creato: ${tenantFormazione.name} (${tenantFormazione.id})\n`);

  // 2. Crea tenant Element srl (frontend pubblico: Element Medica)
  console.log('📝 Creando tenant Element srl (Element Medica)...');
  const tenantMedica = await prisma.tenant.upsert({
    where: { id: 'tenant-id-medica' },
    update: {
      name: 'Element srl',
      slug: 'element-medica',
      domain: 'elementmedica.com',
      settings: {
        brandId: 'element-medica',
        features: ['medicinaLavoro', 'poliambulatorio', 'prenotazioniOnline', 'fatturazione'],
        theme: 'medical',
        // Colori verificati dai loghi originali
        logoUrl: '/assets/logos/element-medica-logo.png',
        logoWhiteUrl: '/assets/logos/element-medica-logo-white.png',
        brandColors: {
          primary: '#A1C8C1',
          secondary: '#233747',
          accent: '#EDF1EE',
          light: '#F7FAF9',
        },
        companyName: 'Element srl',
        vat: '05580640281',
        pec: 'element.srl@pec.it',
      },
      isActive: true,
    },
    create: {
      id: 'tenant-id-medica',
      name: 'Element srl',
      slug: 'element-medica',
      domain: 'elementmedica.com',
      settings: {
        brandId: 'element-medica',
        features: ['medicinaLavoro', 'poliambulatorio', 'prenotazioniOnline', 'fatturazione'],
        theme: 'medical',
        logoUrl: '/assets/logos/element-medica-logo.png',
        logoWhiteUrl: '/assets/logos/element-medica-logo-white.png',
        brandColors: {
          primary: '#A1C8C1',
          secondary: '#233747',
          accent: '#EDF1EE',
          light: '#F7FAF9',
        },
        companyName: 'Element srl',
        vat: '05580640281',
        pec: 'element.srl@pec.it',
      },
      billingPlan: 'enterprise',
      maxUsers: 100,
      maxCompanies: 50,
      isActive: true,
    },
  });
  console.log(`✅ Tenant creato: ${tenantMedica.name} (frontend: Element Medica) (${tenantMedica.id})\n`);

  // 3. Migra contenuti esistenti a Element Sicurezza
  console.log('📦 Migrando contenuti esistenti a Element Sicurezza...');

  let migratedPages = 0;
  let migratedCourses = 0;
  let migratedTemplates = 0;

  // Trova tenant ID attuale delle pagine
  const existingPage = await prisma.cMSPage.findFirst({
    select: { tenantId: true },
  });

  if (existingPage && existingPage.tenantId !== tenantFormazione.id) {
    const oldTenantId = existingPage.tenantId;
    console.log(`   - Rilevato tenant esistente: ${oldTenantId}`);
    console.log(`   - Migrazione a nuovo tenant: ${tenantFormazione.id}`);

    // Migra pagine CMS
    try {
      const pagesCount = await prisma.cMSPage.count({ where: { tenantId: oldTenantId } });
      console.log(`   - Pagine CMS da migrare: ${pagesCount}`);

      const updatedPages = await prisma.cMSPage.updateMany({
        where: { tenantId: oldTenantId },
        data: { tenantId: tenantFormazione.id },
      });
      migratedPages = updatedPages.count;
      console.log(`   ✅ ${updatedPages.count} pagine CMS migrate`);
    } catch (e) {
      console.log(`   ⚠️  Errore migrazione pagine: ${e.message}`);
    }

    // Migra corsi
    try {
      const coursesCount = await prisma.course.count({ where: { tenantId: oldTenantId } });
      console.log(`   - Corsi da migrare: ${coursesCount}`);

      const updatedCourses = await prisma.course.updateMany({
        where: { tenantId: oldTenantId },
        data: { tenantId: tenantFormazione.id },
      });
      migratedCourses = updatedCourses.count;
      console.log(`   ✅ ${updatedCourses.count} corsi migrati`);
    } catch (e) {
      console.log(`   ⚠️  Errore migrazione corsi: ${e.message}`);
    }

    // Migra form templates
    try {
      const templatesCount = await prisma.formTemplate.count({ where: { tenantId: oldTenantId } });
      console.log(`   - Form templates da migrare: ${templatesCount}`);

      const updatedTemplates = await prisma.formTemplate.updateMany({
        where: { tenantId: oldTenantId },
        data: { tenantId: tenantFormazione.id },
      });
      migratedTemplates = updatedTemplates.count;
      console.log(`   ✅ ${updatedTemplates.count} form templates migrati`);
    } catch (e) {
      console.log(`   ⚠️  Errore migrazione templates: ${e.message}`);
    }

    // Disattiva vecchio tenant invece di eliminarlo (può avere altre relazioni)
    await prisma.tenant.update({
      where: { id: oldTenantId },
      data: { isActive: false, name: 'OLD - To be deleted' },
    });
    console.log(`   ✅ Vecchio tenant disattivato (può essere eliminato manualmente se necessario)\n`);
  } else {
    console.log(`   ✅ Contenuti già assegnati al tenant corretto\n`);
  }

  console.log('🎉 Setup tenant completato!');
  console.log('\n📊 Riepilogo:');
  console.log(`   - Tenant Element Sicurezza: ${tenantFormazione.id}`);
  console.log(`   - Tenant Element Medica: ${tenantMedica.id}`);
  console.log(`   - Pagine migrate: ${migratedPages}`);
  console.log(`   - Corsi migrati: ${migratedCourses}`);
  console.log(`   - Templates migrati: ${migratedTemplates}`);
  console.log('\n✨ Prossimi step:');
  console.log('   1. Testare http://localhost:5173 (Element Sicurezza)');
  console.log('   2. Testare http://localhost:5174 (Element Medica - VUOTO)');
  console.log('   3. Creare pagine CMS per Element Medica');
}

main()
  .catch((e) => {
    console.error('❌ Errore durante la creazione tenant:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
