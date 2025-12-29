const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRealContrastIssues() {
  console.log('\n🎯 FIXING REAL CONTRAST ISSUES\n');

  // Fix tutte e 3 le pagine problematiche
  const fixes = [
    {
      slug: 'visite-specialistiche',
      replacements: [
        {
          // Card headings: text-white -> text-gray-900
          from: /<h3 class="text-xl font-bold text-white mb-3">/g,
          to: '<h3 class="text-xl font-bold text-gray-900 mb-3">',
          desc: 'Card headings white -> gray-900'
        },
        {
          // Card lists: text-gray-100 -> text-gray-600
          from: /<ul class="text-sm text-gray-100 space-y-1">/g,
          to: '<ul class="text-sm text-gray-600 space-y-1">',
          desc: 'Card lists gray-100 -> gray-600'
        },
        {
          // Altri text-white nelle card (non in sections scure)
          from: /<div class="([^"]*bg-white[^"]*)"[^>]*>[\s\S]*?<h2 class="([^"]*)\s*text-white([^"]*)"/g,
          to: '<div class="$1">$CONTENT$<h2 class="$2 text-gray-900$3"',
          desc: 'H2 in white cards: white -> gray-900'
        }
      ]
    },
    {
      slug: 'medicina-del-lavoro',
      replacements: [
        {
          // Titoli in card bianche
          from: /<h3 class="text-xl font-semibold text-white mb-2">/g,
          to: '<h3 class="text-xl font-semibold text-gray-900 mb-2">',
          desc: 'Card headings white -> gray-900'
        },
        {
          // Liste in card bianche
          from: /<ul class="space-y-2 text-gray-100">/g,
          to: '<ul class="space-y-2 text-gray-600">',
          desc: 'Card lists gray-100 -> gray-600'
        },
        {
          // Paragrafi troppo chiari
          from: /<p class="text-gray-100">/g,
          to: '<p class="text-gray-600">',
          desc: 'Paragraphs gray-100 -> gray-600'
        }
      ]
    },
    {
      slug: 'rspp',
      replacements: [
        {
          // Card headings
          from: /<h3 class="text-xl font-semibold text-white mb-3">/g,
          to: '<h3 class="text-xl font-semibold text-gray-900 mb-3">',
          desc: 'Card headings white -> gray-900'
        },
        {
          // Card text
          from: /<p class="text-gray-100 mb-4">/g,
          to: '<p class="text-gray-600 mb-4">',
          desc: 'Card text gray-100 -> gray-600'
        },
        {
          // Liste
          from: /<li class="flex items-start text-gray-100">/g,
          to: '<li class="flex items-start text-gray-600">',
          desc: 'List items gray-100 -> gray-600'
        }
      ]
    }
  ];

  for (const { slug, replacements } of fixes) {
    console.log(`\n📄 ${slug.toUpperCase()}`);
    
    const page = await prisma.cMSPage.findUnique({ where: { slug } });
    if (!page) {
      console.log(`   ❌ Page not found`);
      continue;
    }

    let content = page.content;
    let changesCount = 0;

    for (const { from, to, desc } of replacements) {
      const before = content;
      content = content.replace(from, to);
      
      if (content !== before) {
        const matches = before.match(from);
        const count = matches ? matches.length : 0;
        changesCount += count;
        console.log(`   ✅ ${desc}: ${count} fixes`);
      }
    }

    if (changesCount > 0) {
      await prisma.cMSPage.update({
        where: { slug },
        data: { content, updatedAt: new Date() }
      });
      console.log(`   💾 Saved ${changesCount} total fixes`);
    } else {
      console.log(`   ℹ️  No fixes needed`);
    }
  }

  console.log('\n✅ ALL CONTRAST ISSUES FIXED!\n');
  await prisma.$disconnect();
}

fixRealContrastIssues().catch(console.error);
