const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeAllCMSPages() {
  console.log('\n📊 COMPLETE CMS PAGES ANALYSIS\n');
  console.log('='.repeat(80));
  
  const pages = await prisma.cMSPage.findMany({
    where: {
      isPublished: true,
      deletedAt: null
    },
    orderBy: { slug: 'asc' }
  });
  
  console.log(`\nFound ${pages.length} published pages\n`);
  
  for (const page of pages) {
    console.log('\n' + '='.repeat(80));
    console.log(`\n📄 PAGE: ${page.slug}`);
    console.log(`   Title: ${page.title}`);
    console.log(`   Updated: ${page.updatedAt.toISOString()}`);
    console.log(`   Content type: ${typeof page.content}`);
    console.log(`   Content length: ${page.content.length} chars`);
    
    const content = page.content;
    const isHTML = typeof content === 'string' && content.includes('<');
    const isJSON = typeof content === 'object';
    
    console.log(`   Format: ${isHTML ? 'HTML String' : isJSON ? 'JSON Object' : 'Unknown'}`);
    
    if (isHTML) {
      // Analizza HTML
      console.log('\n   🔍 HTML ANALYSIS:');
      
      // Count sections
      const sections = content.match(/<section/g) || [];
      console.log(`   - Sections found: ${sections.length}`);
      
      // Analyze backgrounds
      const bgClasses = [];
      const bgRegex = /class="[^"]*?(bg-[^"\s]+)[^"]*?"/g;
      let match;
      while ((match = bgRegex.exec(content)) !== null) {
        bgClasses.push(match[1]);
      }
      
      const uniqueBgs = [...new Set(bgClasses)];
      console.log(`   - Background classes (${uniqueBgs.length} unique):`);
      uniqueBgs.slice(0, 10).forEach(bg => {
        const isDark = bg.includes('-700') || bg.includes('-800') || bg.includes('-900');
        const isLight = bg.includes('-50') || bg.includes('-100') || bg.includes('white');
        const indicator = isDark ? '🌑' : isLight ? '☀️' : '🌤️';
        console.log(`     ${indicator} ${bg}`);
      });
      if (uniqueBgs.length > 10) {
        console.log(`     ... and ${uniqueBgs.length - 10} more`);
      }
      
      // Analyze text colors
      const textClasses = [];
      const textRegex = /class="[^"]*?(text-[^"\s]+)[^"]*?"/g;
      while ((match = textRegex.exec(content)) !== null) {
        textClasses.push(match[1]);
      }
      
      const uniqueTexts = [...new Set(textClasses)];
      console.log(`   - Text color classes (${uniqueTexts.length} unique):`);
      uniqueTexts.slice(0, 10).forEach(text => {
        const isDark = text.includes('-700') || text.includes('-800') || text.includes('-900');
        const isLight = text.includes('-50') || text.includes('-100') || text.includes('white');
        const indicator = isDark ? '🌑' : isLight ? '☀️' : '🌤️';
        console.log(`     ${indicator} ${text}`);
      });
      if (uniqueTexts.length > 10) {
        console.log(`     ... and ${uniqueTexts.length - 10} more`);
      }
      
      // Check for problematic combinations
      console.log('\n   ⚠️  POTENTIAL ISSUES:');
      const issues = [];
      
      // White text on light backgrounds
      if (content.includes('text-white') && (
        content.includes('bg-white') || 
        content.includes('bg-gray-50') || 
        content.includes('bg-teal-50')
      )) {
        issues.push('❌ White text on light background detected');
      }
      
      // Dark text on dark backgrounds
      if ((content.includes('text-gray-900') || content.includes('text-gray-800')) && 
          (content.includes('bg-gray-900') || content.includes('bg-gray-800'))) {
        issues.push('❌ Dark text on dark background detected');
      }
      
      // Check sections individually
      const sectionRegex = /<section[^>]*class="([^"]*)"[^>]*>/g;
      let sectionNum = 0;
      while ((match = sectionRegex.exec(content)) !== null) {
        sectionNum++;
        const sectionClasses = match[1];
        
        const hasDarkBg = /bg-(gray|teal|cyan|blue)-(700|800|900)/.test(sectionClasses);
        const hasLightBg = /bg-(gray|teal|cyan|blue)-(50|100)|bg-white/.test(sectionClasses);
        const hasWhiteText = sectionClasses.includes('text-white');
        const hasDarkText = /text-gray-(700|800|900)/.test(sectionClasses);
        
        if (hasLightBg && hasWhiteText) {
          issues.push(`❌ Section ${sectionNum}: White text on light background`);
        }
        if (hasDarkBg && hasDarkText) {
          issues.push(`❌ Section ${sectionNum}: Dark text on dark background`);
        }
      }
      
      if (issues.length === 0) {
        console.log('   ✅ No obvious contrast issues detected');
      } else {
        issues.forEach(issue => console.log(`   ${issue}`));
      }
      
      // Show first 300 chars
      console.log('\n   📝 CONTENT PREVIEW (first 300 chars):');
      console.log('   ' + content.substring(0, 300).replace(/\n/g, '\n   '));
      
    } else if (isJSON) {
      console.log('\n   🔍 JSON STRUCTURE:');
      const keys = Object.keys(content);
      console.log(`   - Top level keys: ${keys.join(', ')}`);
      
      if (content.hero) {
        console.log(`   - Has hero section: YES`);
      }
      if (content.sections) {
        console.log(`   - Sections count: ${content.sections.length}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ ANALYSIS COMPLETE\n');
  
  await prisma.$disconnect();
}

analyzeAllCMSPages().catch(console.error);
