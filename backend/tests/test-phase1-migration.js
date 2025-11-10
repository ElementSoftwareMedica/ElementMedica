/**
 * Test Database Migration - Phase 1
 * 
 * Verifica che i nuovi modelli siano accessibili
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMigration() {
  console.log('🔍 Testing Phase 1 Database Migration...\n');

  try {
    // Test 1: TemplateLink count
    const templateCount = await prisma.templateLink.count();
    console.log('✅ TemplateLink model accessible:', templateCount, 'records');

    // Test 2: TemplateVersion count (nuovo modello)
    const versionCount = await prisma.templateVersion.count();
    console.log('✅ TemplateVersion model accessible:', versionCount, 'records');

    // Test 3: GeneratedDocument count (nuovo modello)
    const docCount = await prisma.generatedDocument.count();
    console.log('✅ GeneratedDocument model accessible:', docCount, 'records');

    // Test 4: Attestato con nuovi campi
    const attestatoSample = await prisma.attestato.findFirst({
      select: {
        id: true,
        templateId: true,
        templateVersion: true,
        markers: true,
        generatedBy: true,
        fileSize: true,
      },
    });
    console.log('✅ Attestato enhanced fields accessible:', attestatoSample ? 'Yes' : 'No records yet');

    // Test 5: LetteraIncarico con nuovi campi
    const letteraSample = await prisma.letteraIncarico.findFirst({
      select: {
        id: true,
        templateId: true,
        templateVersion: true,
        markers: true,
      },
    });
    console.log('✅ LetteraIncarico enhanced fields accessible:', letteraSample ? 'Yes' : 'No records yet');

    // Test 6: RegistroPresenze con nuovi campi
    const registroSample = await prisma.registroPresenze.findFirst({
      select: {
        id: true,
        templateId: true,
        templateVersion: true,
      },
    });
    console.log('✅ RegistroPresenze enhanced fields accessible:', registroSample ? 'Yes' : 'No records yet');

    // Test 7: Enum types disponibili
    console.log('\n✅ Enums available in Prisma Client:');
    console.log('  - TemplateType:', Object.keys(prisma.templateType || {}).length > 0 ? 'Available' : 'Check schema');
    console.log('  - TemplateFormat:', Object.keys(prisma.templateFormat || {}).length > 0 ? 'Available' : 'Check schema');
    console.log('  - DocumentStatus:', Object.keys(prisma.documentStatus || {}).length > 0 ? 'Available' : 'Check schema');

    console.log('\n🎉 Phase 1 Database Migration: SUCCESS');
    console.log('   All models accessible and enhanced fields working!\n');

  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testMigration();
