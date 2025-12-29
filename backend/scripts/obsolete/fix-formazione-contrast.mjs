import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFormazioneContrast() {
  console.log('🔧 Fixing Element Formazione medicina-del-lavoro text contrast...\n');

  const page = await prisma.cMSPage.findFirst({
    where: {
      slug: 'medicina-del-lavoro',
      tenantId: 'tenant-id-formazione'
    }
  });

  if (!page) {
    console.error('❌ Page not found!');
    process.exit(1);
  }

  let content = page.content;

  // Fix 1: Hero background - più leggibile con gradiente più chiaro
  content = content.replace(
    /from-cyan-900 via-blue-900 to-cyan-800/g,
    'from-cyan-700 via-blue-700 to-cyan-600'
  );

  // Fix 2: Text colors - miglior contrasto
  content = content.replace(/text-cyan-100/g, 'text-white');
  content = content.replace(/text-cyan-200/g, 'text-cyan-50');
  
  // Fix 3: Border colors
  content = content.replace(/border-cyan-700/g, 'border-cyan-500');

  // Fix 4: Stats numbers - più visibili
  content = content.replace(/text-cyan-300/g, 'text-cyan-100');

  // Fix 5: Card backgrounds - migliore contrasto
  content = content.replace(
    /from-cyan-50 to-blue-50/g,
    'from-cyan-50 to-blue-100'
  );

  // Fix 6: Hover effects più evidenti
  content = content.replace(
    /hover:border-cyan-400/g,
    'hover:border-cyan-500 hover:shadow-xl'
  );

  // Fix 7: Button colors più visibili
  content = content.replace(
    /from-cyan-500 to-blue-600/g,
    'from-cyan-600 to-blue-700'
  );

  // Update nel database
  await prisma.cMSPage.update({
    where: { id: page.id },
    data: { content }
  });

  console.log('✅ Element Formazione medicina-del-lavoro contrast fixed!');
  console.log('📊 Improvements:');
  console.log('   - Hero background: from-cyan-700 via-blue-700 to-cyan-600 (più leggero)');
  console.log('   - Text colors: text-white instead of text-cyan-100 (100% contrasto)');
  console.log('   - Stats: text-cyan-100 instead of text-cyan-300 (più visibili)');
  console.log('   - Cards: enhanced hover effects with better shadows');
  console.log('   - Buttons: darker gradients for better visibility');

  await prisma.$disconnect();
}

fixFormazioneContrast();
