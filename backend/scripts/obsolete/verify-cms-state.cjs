const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCurrentState() {
  const pages = await prisma.cMSPage.findMany({
    where: { 
      slug: { 
        in: ['homepage-medica', 'medicina-del-lavoro-medica', 'contatti-medica'] 
      } 
    }
  });
  
  console.log('🔍 CURRENT STATE OF CMS PAGES:\n');
  
  for (const page of pages) {
    const content = String(page.content);
    
    // Find all instances with !text-teal
    const allMatches = [...content.matchAll(/class="([^"]*!text-teal-[0-9]+[^"]*)"/g)];
    
    console.log(`\n📄 ${page.slug}:`);
    console.log(`   Total !text-teal instances: ${allMatches.length}`);
    
    if (allMatches.length > 0) {
      allMatches.forEach((match, i) => {
        const fullClass = match[1];
        const context = content.substring(match.index - 50, match.index + 150);
        const tagMatch = context.match(/<(\w+)[^>]*class="/);
        const tag = tagMatch ? tagMatch[1] : 'unknown';
        
        console.log(`\n   [${i + 1}] <${tag}> element:`);
        console.log(`       Full class string: "${fullClass}"`);
        
        // Check for bg-white
        if (fullClass.includes('bg-white')) {
          console.log(`       ✅ Has bg-white (this should work with new CSS)`);
        }
        
        // Show a snippet of HTML
        const snippet = context.substring(context.indexOf('<'), Math.min(context.length, 100));
        console.log(`       HTML: ${snippet}...`);
      });
    }
  }
  
  await prisma.$disconnect();
  
  console.log('\n\n💡 NEXT STEP:');
  console.log('If !text-teal classes exist in database, the new CSS should work.');
  console.log('Hard refresh the page (Cmd+Shift+R) to clear CSS cache!');
}

verifyCurrentState();
