/**
 * Script per creare tenant multi-brand
 * Element Formazione + Element Medica
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Creazione tenant multi-brand...\n');

  // 1. Crea tenant Element Formazione
  console.log('📝 Creando tenant Element Formazione...');
  const tenantFormazione = await prisma.tenant.upsert({
    where: { id: 'tenant-id-formazione' },
    update: {
      name: 'Element Formazione',
      slug: 'element-formazione',
      domain: 'elementformazione.it',
      settings: {
        brandId: 'element-formazione',
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
      name: 'Element Formazione',
      slug: 'element-formazione',
      domain: 'elementformazione.it',
      settings: {
        brandId: 'element-formazione',
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

  // 2. Crea tenant Element Medica
  console.log('📝 Creando tenant Element Medica...');
  const tenantMedica = await prisma.tenant.upsert({
    where: { id: 'tenant-id-medica' },
    update: {
      name: 'Element Medica',
      slug: 'element-medica',
      domain: 'elementmedica.it',
      settings: {
        brandId: 'element-medica',
        features: ['medicinaLavoro', 'poliambulatorio', 'prenotazioniOnline'],
        theme: 'medical',
        colors: {
          primary: '#06b6d4',
          secondary: '#22c55e',
          accent: '#f59e0b',
        },
      },
      isActive: true,
    },
    create: {
      id: 'tenant-id-medica',
      name: 'Element Medica',
      slug: 'element-medica',
      domain: 'elementmedica.it',
      settings: {
        brandId: 'element-medica',
        features: ['medicinaLavoro', 'poliambulatorio', 'prenotazioniOnline'],
        theme: 'medical',
        colors: {
          primary: '#06b6d4',
          secondary: '#22c55e',
          accent: '#f59e0b',
        },
      },
      billingPlan: 'enterprise',
      maxUsers: 100,
      maxCompanies: 50,
      isActive: true,
    },
  });
  console.log(`✅ Tenant creato: ${tenantMedica.name} (${tenantMedica.id})\n`);

  // 3. Migra contenuti esistenti a Element Formazione
  console.log('📦 Migrando contenuti esistenti a Element Formazione...');
  
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
  console.log(`   - Tenant Element Formazione: ${tenantFormazione.id}`);
  console.log(`   - Tenant Element Medica: ${tenantMedica.id}`);
  console.log(`   - Pagine migrate: ${migratedPages}`);
  console.log(`   - Corsi migrati: ${migratedCourses}`);
  console.log(`   - Templates migrati: ${migratedTemplates}`);
  console.log('\n✨ Prossimi step:');
  console.log('   1. Testare http://localhost:5173 (Element Formazione)');
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
