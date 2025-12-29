const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepAnalyzeCSS() {
  const pages = await prisma.cMSPage.findMany({
    where: { slug: { in: ['homepage-medica', 'medicina-del-lavoro-medica'] } }
  });
  
  console.log('🔍 DEEP CSS ANALYSIS - Why !important is not working\n');
  
  for (const page of pages) {
    const content = String(page.content);
    console.log(`\n📄 ${page.slug}:`);
    
    // Pattern 1: Find all !text-teal elements
    const importantMatches = [...content.matchAll(/class="([^"]*!text-teal-[0-9]+[^"]*)"/g)];
    console.log(`✅ Found ${importantMatches.length} elements with !text-teal`);
    
    importantMatches.forEach((m, i) => {
      const fullClass = m[1];
      const index = m.index;
      
      // Get surrounding HTML context
      const before = content.substring(Math.max(0, index - 300), index);
      const after = content.substring(index, Math.min(content.length, index + 300));
      
      // Find the tag
      const tagMatch = after.match(/<(\w+)[^>]*>/);
      const tag = tagMatch ? tagMatch[1] : 'unknown';
      
      console.log(`\n  [${i+1}] <${tag}> element:`);
      console.log(`      Full classes: ${fullClass}`);
      
      // Check for parent with text-white
      const parentMatches = before.match(/<div[^>]*class="([^"]*text-white[^"]*)"/g);
      if (parentMatches && parentMatches.length > 0) {
        console.log(`      ⚠️  FOUND ${parentMatches.length} parent DIVs with text-white!`);
        console.log(`      Last parent: ${parentMatches[parentMatches.length - 1]}`);
      }
      
      // Check if it's an <a> tag (link specificity issue)
      if (tag === 'a') {
        console.log(`      🔗 This is a LINK - CSS specificity might be an issue!`);
      }
    });
  }
  
  await prisma.$disconnect();
  
  console.log('\n\n💡 DIAGNOSIS:');
  console.log('The !important might not work because:');
  console.log('1. The CSS selector .cms-html-content .\\!text-teal-900 might not match');
  console.log('2. The backslash escape might not work in all browsers');
  console.log('3. Links (<a>) have higher specificity with color inheritance');
  console.log('\n🔧 SOLUTION: Need stronger CSS selectors!');
}

deepAnalyzeCSS();
