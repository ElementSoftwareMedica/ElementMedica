import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePages() {
  try {
    // Element Medica - medicina-del-lavoro-medica
    const medicaPage = await prisma.cMSPage.findFirst({
      where: { slug: 'medicina-del-lavoro-medica' }
    });
    
    // Element Formazione - medicina-del-lavoro
    const formazionePage = await prisma.cMSPage.findFirst({
      where: { slug: 'medicina-del-lavoro', tenantId: 'tenant-id-formazione' }
    });
    
    console.log('📄 ELEMENT MEDICA - medicina-del-lavoro-medica');
    console.log('   Length:', medicaPage?.content?.length || 0);
    console.log('   Has bg-gradient:', medicaPage?.content?.includes('bg-gradient') || false);
    console.log('   Sample:', medicaPage?.content?.substring(0, 300));
    
    console.log('\n📄 ELEMENT FORMAZIONE - medicina-del-lavoro');
    console.log('   Length:', formazionePage?.content?.length || 0);
    console.log('   Has bg-gradient:', formazionePage?.content?.includes('bg-gradient') || false);
    
    // Cerca problemi di contrasto comuni
    const contratoProblems = [
      'text-cyan-100',
      'text-cyan-200',
      'text-blue-900',
      'from-cyan-900 via-blue-900'
    ];
    
    console.log('\n🔍 Problemi di contrasto Element Formazione:');
    contratoProblems.forEach(problem => {
      if (formazionePage?.content?.includes(problem)) {
        console.log('   ⚠️ Found:', problem);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePages();
