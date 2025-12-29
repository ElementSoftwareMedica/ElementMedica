import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDefaultTemplates() {
  console.log('\n🧪 Test gestione template predefiniti\n');
  
  // Test 1: Verifica template predefiniti attuali
  console.log('📋 Template predefiniti per tipo:');
  
  const types = ['CERTIFICATE', 'LETTER_OF_ENGAGEMENT', 'ATTENDANCE_REGISTER', 'INVOICE', 'COURSE_PROGRAM'];
  
  for (const type of types) {
    const defaults = await prisma.templateLink.findMany({
      where: {
        type,
        isDefault: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        type: true,
        isDefault: true
      }
    });
    
    console.log(`\n${type}:`);
    if (defaults.length === 0) {
      console.log('  ❌ Nessun template predefinito');
    } else if (defaults.length === 1) {
      console.log(`  ✅ Un solo template predefinito: "${defaults[0].name}"`);
    } else {
      console.log(`  ⚠️  ERRORE: ${defaults.length} template predefiniti trovati!`);
      defaults.forEach(t => console.log(`     - ${t.name} (${t.id})`));
    }
  }
  
  // Test 2: Verifica che i template Google abbiano gli ID estratti
  console.log('\n\n📋 Template con configurazione Google:');
  
  const googleTemplates = await prisma.templateLink.findMany({
    where: {
      googleDocsUrl: { not: null },
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      type: true,
      googleDocsUrl: true,
      googleDocsId: true,
      googleSlidesId: true,
      isDefault: true
    }
  });
  
  if (googleTemplates.length === 0) {
    console.log('❌ Nessun template Google trovato');
  } else {
    googleTemplates.forEach(t => {
      const hasId = t.googleDocsId || t.googleSlidesId;
      const icon = hasId ? '✅' : '⚠️';
      console.log(`${icon} ${t.name} (${t.type}${t.isDefault ? ', DEFAULT' : ''})`);
      if (!hasId) {
        console.log(`   ⚠️  Manca Google ID! URL: ${t.googleDocsUrl}`);
      }
    });
  }
  
  await prisma.$disconnect();
}

testDefaultTemplates();
