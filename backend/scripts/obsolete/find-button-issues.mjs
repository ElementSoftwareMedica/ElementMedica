import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findProblematicButtons() {
  console.log('🔍 Finding ACTUAL problematic buttons\n');
  console.log('═'.repeat(70));

  // Check both sites
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

  for (const page of allPages) {
    if (typeof page.content !== 'string') continue;
    
    const brand = page.tenantId === 'tenant-id-medica' ? '🏥' : '📘';
    let foundIssues = false;
    
    // Pattern: bg-teal + text-teal (low contrast)
    const tealBgTealText = page.content.match(/<[^>]*class="[^"]*bg-teal-\d+[^"]*text-teal-[^"]*"/g);
    
    // Pattern: bg-cyan + text-cyan (low contrast)
    const cyanBgCyanText = page.content.match(/<[^>]*class="[^"]*bg-cyan-\d+[^"]*text-cyan-[^"]*"/g);
    
    // Pattern: bg-white + text-white (invisible)
    const whiteBgWhiteText = page.content.match(/<[^>]*class="[^"]*bg-white[^"]*text-white[^"]*"/g);
    
    if (tealBgTealText && tealBgTealText.length > 0) {
      if (!foundIssues) {
        console.log(`\n${brand} ${page.slug}`);
        console.log('─'.repeat(70));
        foundIssues = true;
      }
      console.log(`⚠️ Found ${tealBgTealText.length} bg-teal + text-teal combinations:`);
      tealBgTealText.slice(0, 2).forEach(match => {
        console.log(`   ${match.substring(0, 100)}...`);
      });
    }
    
    if (cyanBgCyanText && cyanBgCyanText.length > 0) {
      if (!foundIssues) {
        console.log(`\n${brand} ${page.slug}`);
        console.log('─'.repeat(70));
        foundIssues = true;
      }
      console.log(`⚠️ Found ${cyanBgCyanText.length} bg-cyan + text-cyan combinations:`);
      cyanBgCyanText.slice(0, 2).forEach(match => {
        console.log(`   ${match.substring(0, 100)}...`);
      });
    }
    
    if (whiteBgWhiteText && whiteBgWhiteText.length > 0) {
      if (!foundIssues) {
        console.log(`\n${brand} ${page.slug}`);
        console.log('─'.repeat(70));
        foundIssues = true;
      }
      console.log(`⚠️ Found ${whiteBgWhiteText.length} bg-white + text-white combinations:`);
      whiteBgWhiteText.slice(0, 2).forEach(match => {
        console.log(`   ${match.substring(0, 100)}...`);
      });
    }
  }

  await prisma.$disconnect();
}

findProblematicButtons();
