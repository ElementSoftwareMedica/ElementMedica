import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllButtonContrast() {
  console.log('🎨 Fixing button contrast issues on ALL pages...\n');
  console.log('═'.repeat(70));

  try {
    // Fix Element Medica pages
    console.log('\n🏥 ELEMENT MEDICA - Fixing button contrast');
    console.log('─'.repeat(70));
    
    const medicaPages = await prisma.cMSPage.findMany({
      where: { tenantId: 'tenant-id-medica', isPublished: true }
    });

    let medicaUpdated = 0;

    for (const page of medicaPages) {
      if (typeof page.content !== 'string') continue;

      let content = page.content;
      const originalContent = content;

      // Strategy for Element Medica (Teal theme):
      // 1. White bg buttons should have teal-600/700/900 text → Keep as is (already good contrast)
      // 2. Teal bg buttons with teal text → Change text to white
      // 3. White bg with white text → Change text to teal-700

      // Fix: bg-white with text-white → text-teal-700
      content = content.replace(
        /(<[^>]*class="[^"]*\b)(bg-white)([^"]*\b)(text-white)([^"]*")/g,
        '$1$2$3text-teal-700$5'
      );

      // Fix: bg-teal-* with text-teal-* → text-white
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-teal-[5-9]00)([^"]*)(text-teal-\d+)/g,
        '$1$2$3text-white'
      );

      // Fix: bg-teal-600 or higher with any teal text → ensure white text
      content = content.replace(
        /(<[^>]*class="[^"]*\b)(bg-teal-(?:600|700|800|900))(\b[^"]*\b)(text-teal-[1-5]00)(\b[^"]*")/g,
        '$1$2$3text-white$5'
      );

      // Ensure hover states are also correct
      // hover:bg-white should have hover:text-teal-700 or darker
      content = content.replace(
        /(hover:bg-white)([^"]*)(hover:text-white)/g,
        '$1$2hover:text-teal-800'
      );

      // hover:bg-teal-* (dark) should have hover:text-white
      content = content.replace(
        /(hover:bg-teal-(?:600|700|800|900))([^"]*)(hover:text-teal-)/g,
        '$1$2hover:text-white'
      );

      if (content !== originalContent) {
        await prisma.cMSPage.update({
          where: { id: page.id },
          data: { content }
        });
        console.log(`   ✅ Fixed ${page.slug}`);
        medicaUpdated++;
      }
    }

    // Fix Element Formazione pages
    console.log('\n📘 ELEMENT FORMAZIONE - Fixing button contrast');
    console.log('─'.repeat(70));
    
    const formazionePages = await prisma.cMSPage.findMany({
      where: { tenantId: 'tenant-id-formazione', isPublished: true }
    });

    let formazioneUpdated = 0;

    for (const page of formazionePages) {
      if (typeof page.content !== 'string') continue;

      let content = page.content;
      const originalContent = content;

      // Strategy for Element Formazione (Cyan theme):
      // 1. White bg buttons should have cyan-700/800/900 text → Keep as is (good contrast)
      // 2. Cyan bg buttons with cyan text → Change text to white
      // 3. White bg with white text → Change text to cyan-800

      // Fix: bg-white with text-white → text-cyan-800
      content = content.replace(
        /(<[^>]*class="[^"]*\b)(bg-white)([^"]*\b)(text-white)([^"]*")/g,
        '$1$2$3text-cyan-800$5'
      );

      // Fix: bg-cyan-* (dark) with text-cyan-* → text-white
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-cyan-[5-9]00)([^"]*)(text-cyan-\d+)/g,
        '$1$2$3text-white'
      );

      // Fix: bg-cyan-600 or higher with light cyan text → ensure white text
      content = content.replace(
        /(<[^>]*class="[^"]*\b)(bg-cyan-(?:600|700|800|900))(\b[^"]*\b)(text-cyan-[1-5]00)(\b[^"]*")/g,
        '$1$2$3text-white$5'
      );

      // Ensure hover states are correct
      content = content.replace(
        /(hover:bg-white)([^"]*)(hover:text-white)/g,
        '$1$2hover:text-cyan-900'
      );

      content = content.replace(
        /(hover:bg-cyan-(?:600|700|800|900))([^"]*)(hover:text-cyan-)/g,
        '$1$2hover:text-white'
      );

      if (content !== originalContent) {
        await prisma.cMSPage.update({
          where: { id: page.id },
          data: { content }
        });
        console.log(`   ✅ Fixed ${page.slug}`);
        formazioneUpdated++;
      }
    }

    console.log('\n═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('─'.repeat(70));
    console.log(`🏥 Element Medica: ${medicaUpdated} pages updated`);
    console.log(`📘 Element Formazione: ${formazioneUpdated} pages updated`);
    console.log('\n✅ All button contrast issues fixed!');
    console.log('\n📋 Changes applied:');
    console.log('   - White bg + white text → colored text (teal-700/cyan-800)');
    console.log('   - Dark bg + same color text → white text');
    console.log('   - Hover states corrected for readability');
    console.log('   - Brand colors respected (teal for Medica, cyan for Formazione)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixAllButtonContrast();
