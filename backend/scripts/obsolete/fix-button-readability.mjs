import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllButtonReadability() {
  console.log('🎨 Fixing ALL button readability issues...\n');
  console.log('═'.repeat(70));

  let totalFixed = 0;

  try {
    // Fix Element Medica
    console.log('\n🏥 ELEMENT MEDICA');
    console.log('─'.repeat(70));
    
    const medicaPages = await prisma.cMSPage.findMany({
      where: { tenantId: 'tenant-id-medica', isPublished: true }
    });

    for (const page of medicaPages) {
      if (typeof page.content !== 'string') continue;

      let content = page.content;
      const original = content;
      let pageChanges = 0;

      // Fix 1: bg-teal-50 with text-teal-700 → text-teal-900 (darker for better contrast on light bg)
      const beforeFix1 = content;
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-teal-50)([^"]*)(text-teal-700)([^"]*")/g,
        '$1$2$3text-teal-900$5'
      );
      if (content !== beforeFix1) pageChanges++;

      // Fix 2: bg-teal-100 with text-teal-600 → text-teal-900
      const beforeFix2 = content;
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-teal-100)([^"]*)(text-teal-[567]00)([^"]*")/g,
        '$1$2$3text-teal-900$5'
      );
      if (content !== beforeFix2) pageChanges++;

      // Fix 3: bg-teal-600+ with text-teal-* → text-white (dark bg needs white text)
      const beforeFix3 = content;
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-teal-(?:600|700|800|900))([^"]*)(text-teal-\d+)([^"]*")/g,
        '$1$2$3text-white$5'
      );
      if (content !== beforeFix3) pageChanges++;

      // Fix 4: bg-white with text-white → text-teal-700
      const beforeFix4 = content;
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-white)([^"]*)(text-white)([^"]*")/g,
        '$1$2$3text-teal-700$5'
      );
      if (content !== beforeFix4) pageChanges++;

      // Fix 5: Hover states - hover:bg-teal-50 with hover:text-teal-600 → hover:text-teal-900
      const beforeFix5 = content;
      content = content.replace(
        /(hover:bg-teal-(?:50|100))([^"]*)(hover:text-teal-[567]00)/g,
        '$1$2hover:text-teal-900'
      );
      if (content !== beforeFix5) pageChanges++;

      // Fix 6: Hover states - hover:bg-teal-700+ with hover:text-teal → hover:text-white
      const beforeFix6 = content;
      content = content.replace(
        /(hover:bg-teal-(?:700|800|900))([^"]*)(hover:text-teal-\d+)/g,
        '$1$2hover:text-white'
      );
      if (content !== beforeFix6) pageChanges++;

      if (content !== original) {
        await prisma.cMSPage.update({
          where: { id: page.id },
          data: { content }
        });
        console.log(`   ✅ Fixed ${page.slug} (${pageChanges} pattern fixes)`);
        totalFixed++;
      }
    }

    // Fix Element Formazione
    console.log('\n📘 ELEMENT FORMAZIONE');
    console.log('─'.repeat(70));
    
    const formazionePages = await prisma.cMSPage.findMany({
      where: { tenantId: 'tenant-id-formazione', isPublished: true }
    });

    for (const page of formazionePages) {
      if (typeof page.content !== 'string') continue;

      let content = page.content;
      const original = content;
      let pageChanges = 0;

      // Fix 1: bg-cyan-50 with text-cyan-700 → text-cyan-900
      const beforeFix1 = content;
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-cyan-50)([^"]*)(text-cyan-700)([^"]*")/g,
        '$1$2$3text-cyan-900$5'
      );
      if (content !== beforeFix1) pageChanges++;

      // Fix 2: bg-cyan-100 with text-cyan-600 → text-cyan-900
      const beforeFix2 = content;
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-cyan-100)([^"]*)(text-cyan-[567]00)([^"]*")/g,
        '$1$2$3text-cyan-900$5'
      );
      if (content !== beforeFix2) pageChanges++;

      // Fix 3: bg-cyan-600+ with text-cyan-* → text-white
      const beforeFix3 = content;
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-cyan-(?:600|700|800|900))([^"]*)(text-cyan-\d+)([^"]*")/g,
        '$1$2$3text-white$5'
      );
      if (content !== beforeFix3) pageChanges++;

      // Fix 4: bg-white with text-white → text-cyan-800
      const beforeFix4 = content;
      content = content.replace(
        /(<[^>]*class="[^"]*)(bg-white)([^"]*)(text-white)([^"]*")/g,
        '$1$2$3text-cyan-800$5'
      );
      if (content !== beforeFix4) pageChanges++;

      // Fix 5: Hover states - hover:bg-cyan-50 with hover:text-cyan-600 → hover:text-cyan-900
      const beforeFix5 = content;
      content = content.replace(
        /(hover:bg-cyan-(?:50|100))([^"]*)(hover:text-cyan-[567]00)/g,
        '$1$2hover:text-cyan-900'
      );
      if (content !== beforeFix5) pageChanges++;

      // Fix 6: Hover states - hover:bg-cyan-700+ with hover:text-cyan → hover:text-white
      const beforeFix6 = content;
      content = content.replace(
        /(hover:bg-cyan-(?:700|800|900))([^"]*)(hover:text-cyan-\d+)/g,
        '$1$2hover:text-white'
      );
      if (content !== beforeFix6) pageChanges++;

      if (content !== original) {
        await prisma.cMSPage.update({
          where: { id: page.id },
          data: { content }
        });
        console.log(`   ✅ Fixed ${page.slug} (${pageChanges} pattern fixes)`);
        totalFixed++;
      }
    }

    console.log('\n═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('─'.repeat(70));
    console.log(`✅ Fixed ${totalFixed} pages with button readability issues`);
    console.log('\n📋 Fixes applied:');
    console.log('   🏥 Element Medica (Teal):');
    console.log('      - Light bg (teal-50/100) → Darker text (teal-900)');
    console.log('      - Dark bg (teal-600+) → White text');
    console.log('      - White bg + white text → teal-700 text');
    console.log('   📘 Element Formazione (Cyan):');
    console.log('      - Light bg (cyan-50/100) → Darker text (cyan-900)');
    console.log('      - Dark bg (cyan-600+) → White text');
    console.log('      - White bg + white text → cyan-800 text');
    console.log('   ✨ All hover states corrected');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixAllButtonReadability();
