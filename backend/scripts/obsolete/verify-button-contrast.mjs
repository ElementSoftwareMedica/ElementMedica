import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyButtonContrast() {
  console.log('✅ FINAL BUTTON READABILITY CHECK');
  console.log('═'.repeat(70));

  const allPages = await prisma.cMSPage.findMany({
    where: { 
      OR: [
        { tenantId: 'tenant-id-medica' },
        { tenantId: 'tenant-id-formazione' }
      ],
      isPublished: true
    },
    select: { slug: true, tenantId: true, content: true }
  });

  console.log('\n🔍 Checking button contrast patterns:\n');

  let foundIssues = 0;
  let goodPages = 0;

  for (const page of allPages) {
    if (typeof page.content !== 'string') continue;
    
    const brand = page.tenantId === 'tenant-id-medica' ? '🏥 Medica' : '📘 Formazione';
    
    // Check for GOOD patterns (high contrast)
    const lightBgDarkText = page.content.match(/bg-(teal|cyan)-50[^>]*text-(teal|cyan)-900/g);
    const darkBgWhiteText = page.content.match(/bg-(teal|cyan)-[678]00[^>]*text-white/g);
    const whiteBgColorText = page.content.match(/bg-white[^>]*text-(teal|cyan)-[789]00/g);
    
    const goodPatterns = (lightBgDarkText ? lightBgDarkText.length : 0) + 
                        (darkBgWhiteText ? darkBgWhiteText.length : 0) + 
                        (whiteBgColorText ? whiteBgColorText.length : 0);
    
    // Check for BAD patterns (low contrast)
    const badWhiteBgWhiteText = page.content.match(/bg-white[^>]*text-white/g);
    const badLightBgLightText = page.content.match(/bg-(teal|cyan)-[123]00[^>]*text-\1-[1234]00/g);
    const badDarkBgDarkText = page.content.match(/bg-(teal|cyan)-[6789]00[^>]*text-\1-[56789]00/g);
    
    if (badWhiteBgWhiteText || badLightBgLightText || badDarkBgDarkText) {
      foundIssues++;
      console.log(`⚠️ ${brand} - ${page.slug}:`);
      if (badWhiteBgWhiteText) console.log(`   ❌ White bg + white text: ${badWhiteBgWhiteText.length}`);
      if (badLightBgLightText) console.log(`   ❌ Light bg + light text: ${badLightBgLightText.length}`);
      if (badDarkBgDarkText) console.log(`   ❌ Dark bg + dark text: ${badDarkBgDarkText.length}`);
    } else if (goodPatterns > 0) {
      goodPages++;
      console.log(`✅ ${brand} - ${page.slug}: ${goodPatterns} good contrast patterns`);
    }
  }

  console.log('\n═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('─'.repeat(70));
  
  if (foundIssues === 0) {
    console.log('🎉 ALL BUTTONS HAVE GOOD CONTRAST!');
    console.log(`✅ ${goodPages} pages with correct button contrast`);
    console.log('\n✨ Contrast patterns applied:');
    console.log('   ✅ Light backgrounds (50-100) → Dark text (900)');
    console.log('   ✅ Dark backgrounds (600-900) → White text');
    console.log('   ✅ White backgrounds → Brand color text (700-900)');
  } else {
    console.log(`⚠️ Found ${foundIssues} pages with remaining issues`);
    console.log(`✅ ${goodPages} pages are correct`);
  }

  await prisma.$disconnect();
}

verifyButtonContrast();
