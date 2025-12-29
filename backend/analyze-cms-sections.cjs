const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzePages() {
  const pages = ['visite-specialistiche', 'medicina-del-lavoro', 'rspp'];
  
  for (const slug of pages) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ANALYZING: ${slug}`);
    console.log('='.repeat(60));
    
    const page = await prisma.cMSPage.findUnique({ where: { slug } });
    if (!page) {
      console.log('❌ Page not found!');
      continue;
    }
    
    console.log(`Length: ${page.content.length} chars`);
    console.log(`Updated: ${page.updatedAt}`);
    
    // Extract all <section> tags with their classes
    const sectionRegex = /<section[^>]*class="([^"]*)"[^>]*>/g;
    const sections = [];
    let match;
    let index = 0;
    
    while ((match = sectionRegex.exec(page.content)) !== null) {
      index++;
      sections.push({
        index,
        position: match.index,
        classes: match[1],
        fullTag: match[0].substring(0, 150)
      });
    }
    
    console.log(`\nFound ${sections.length} <section> tags:\n`);
    sections.forEach(s => {
      const bgClass = s.classes.match(/bg-[\w-]+/g) || ['NO BG'];
      const textClass = s.classes.match(/text-[\w-/]+/g) || ['NO TEXT'];
      console.log(`  ${s.index}. Pos ${s.position}`);
      console.log(`     BG: ${bgClass.join(', ')}`);
      console.log(`     TEXT: ${textClass.join(', ')}`);
      console.log(`     Classes: ${s.classes.substring(0, 80)}...`);
    });
    
    // Check for problematic patterns
    console.log('\n🔍 PROBLEMATIC PATTERNS:');
    const problems = [];
    
    // White on white
    if (page.content.includes('bg-white') && page.content.includes('text-white')) {
      problems.push('⚠️  Has both bg-white and text-white');
    }
    
    // Light backgrounds
    const lightBgs = page.content.match(/bg-(gray|teal|cyan|blue)-50/g);
    if (lightBgs) {
      problems.push(`⚠️  Has ${lightBgs.length} light backgrounds: ${[...new Set(lightBgs)].join(', ')}`);
    }
    
    // Check for buttons with poor contrast
    const buttonMatches = page.content.match(/<a[^>]*class="[^"]*bg-white[^"]*text-teal[^"]*"[^>]*>/g);
    if (buttonMatches) {
      problems.push(`⚠️  Has ${buttonMatches.length} buttons with bg-white text-teal`);
    }
    
    if (problems.length === 0) {
      console.log('   ✅ No obvious problems detected');
    } else {
      problems.forEach(p => console.log(`   ${p}`));
    }
  }
  
  await prisma.$disconnect();
}

analyzePages().catch(console.error);
