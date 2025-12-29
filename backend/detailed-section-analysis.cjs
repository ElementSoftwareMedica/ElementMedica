const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function detailedAnalysis() {
  const slugs = ['visite-specialistiche', 'medicina-del-lavoro', 'rspp'];
  
  for (const slug of slugs) {
    console.log('\n' + '='.repeat(80));
    console.log(`\n📄 DETAILED ANALYSIS: ${slug}\n`);
    
    const page = await prisma.cMSPage.findUnique({ where: { slug } });
    if (!page) continue;
    
    const content = page.content;
    
    // Extract all sections with their full context
    const sectionRegex = /<section[^>]*?class="([^"]*)"[^>]*?>([\s\S]*?)<\/section>/g;
    let match;
    let sectionNum = 0;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      sectionNum++;
      const classes = match[1];
      const sectionContent = match[2];
      
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`SECTION ${sectionNum}:`);
      console.log(`Classes: ${classes.substring(0, 100)}${classes.length > 100 ? '...' : ''}`);
      
      // Analyze background
      const bgMatch = classes.match(/bg-([a-z]+-)?([a-z]+)(-\d+)?/g);
      const hasDarkBg = /bg-(gray|teal|cyan|blue|green)-(700|800|900)/.test(classes);
      const hasLightBg = /bg-(gray|teal|cyan|blue|white)(-50|-100)?|bg-white/.test(classes);
      const hasMediumBg = /bg-(gray|teal|cyan|blue)-(400|500|600)/.test(classes);
      
      console.log(`Background: ${bgMatch ? bgMatch.join(', ') : 'none'}`);
      console.log(`  - Dark BG: ${hasDarkBg ? '🌑 YES' : '❌ NO'}`);
      console.log(`  - Medium BG: ${hasMediumBg ? '🌤️ YES' : '❌ NO'}`);
      console.log(`  - Light BG: ${hasLightBg ? '☀️ YES' : '❌ NO'}`);
      
      // Analyze text colors in this section
      const textMatch = classes.match(/text-([a-z]+-)?([a-z]+)(-\d+)?/g);
      const hasWhiteText = /text-white/.test(classes);
      const hasDarkText = /text-(gray|black)-(700|800|900)/.test(classes);
      const hasLightText = /text-(gray|white)(-50|-100)?/.test(classes);
      
      console.log(`Text: ${textMatch ? textMatch.join(', ') : 'none'}`);
      console.log(`  - White text: ${hasWhiteText ? '☀️ YES' : '❌ NO'}`);
      console.log(`  - Dark text: ${hasDarkText ? '🌑 YES' : '❌ NO'}`);
      console.log(`  - Light text: ${hasLightText ? '☀️ YES' : '❌ NO'}`);
      
      // Check for contrast issues
      const issues = [];
      if (hasLightBg && hasWhiteText) {
        issues.push('❌ CRITICAL: White text on light background');
      }
      if (hasDarkBg && hasDarkText) {
        issues.push('❌ CRITICAL: Dark text on dark background');
      }
      if (hasLightBg && hasLightText) {
        issues.push('⚠️  WARNING: Light text on light background');
      }
      
      // Check h1, h2, h3 tags in this section
      const headings = sectionContent.match(/<h[1-3][^>]*?class="([^"]*)"[^>]*?>/g) || [];
      if (headings.length > 0) {
        console.log(`\nHeadings (${headings.length}):`);
        headings.slice(0, 3).forEach(h => {
          const hClasses = h.match(/class="([^"]*)"/)?.[1] || '';
          const hText = hClasses.match(/text-[a-z]+-\d+|text-white|text-black/g) || ['inherit'];
          console.log(`  - ${hText.join(', ')}`);
        });
      }
      
      if (issues.length > 0) {
        console.log(`\n🚨 ISSUES:`);
        issues.forEach(issue => console.log(`   ${issue}`));
      } else {
        console.log(`\n✅ No contrast issues in this section`);
      }
      
      // Show snippet
      const snippet = sectionContent.substring(0, 200).replace(/\s+/g, ' ').trim();
      console.log(`\nContent snippet: ${snippet}...`);
    }
    
    // Also check divs with section-like classes
    const divRegex = /<div[^>]*?class="([^"]*(?:py-\d+|section|hero)[^"]*)"[^>]*?>/g;
    let divNum = 0;
    
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`\nDIV-BASED SECTIONS:\n`);
    
    while ((match = divRegex.exec(content)) !== null && divNum < 5) {
      divNum++;
      const classes = match[1];
      
      if (classes.includes('py-') && classes.includes('bg-')) {
        console.log(`\nDIV ${divNum}:`);
        console.log(`Classes: ${classes.substring(0, 120)}...`);
        
        const hasDarkBg = /bg-(gray|teal|cyan|blue)-(700|800|900)/.test(classes);
        const hasLightBg = /bg-(gray|teal|cyan|blue|white)-50|bg-white/.test(classes);
        const hasWhiteText = /text-white/.test(classes);
        const hasDarkText = /text-gray-(700|800|900)/.test(classes);
        
        if ((hasLightBg && hasWhiteText) || (hasDarkBg && hasDarkText)) {
          console.log(`❌ CONTRAST ISSUE DETECTED!`);
        }
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ DETAILED ANALYSIS COMPLETE\n');
  
  await prisma.$disconnect();
}

detailedAnalysis().catch(console.error);
