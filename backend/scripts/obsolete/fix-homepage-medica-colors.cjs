const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔧 Adding !important to ALL text-teal in homepage-medica...\n');

    const page = await prisma.cMSPage.findFirst({
      where: { slug: 'homepage-medica' }
    });

    if (!page) {
      console.log('❌ Page not found');
      return;
    }

    let content = typeof page.content === 'string' ? page.content : JSON.stringify(page.content);
    let changes = 0;

    // Pattern 1: bg-white text-teal-600 → bg-white !text-teal-600
    const before1 = content;
    content = content.replace(/class="([^"]*)\bbg-white\b([^"]*)\btext-teal-600\b([^"]*)"/g, (match, p1, p2, p3) => {
      if (!match.includes('!text-teal-600')) {
        changes++;
        return `class="${p1}bg-white${p2}!text-teal-600${p3}"`;
      }
      return match;
    });

    // Pattern 2: text-teal-600 bg-white (reversed)
    content = content.replace(/class="([^"]*)\btext-teal-600\b([^"]*)\bbg-white\b([^"]*)"/g, (match, p1, p2, p3) => {
      if (!match.includes('!text-teal-600')) {
        changes++;
        return `class="${p1}!text-teal-600${p2}bg-white${p3}"`;
      }
      return match;
    });

    // Pattern 3: bg-white text-teal-700 → bg-white !text-teal-700
    content = content.replace(/class="([^"]*)\bbg-white\b([^"]*)\btext-teal-700\b([^"]*)"/g, (match, p1, p2, p3) => {
      if (!match.includes('!text-teal-700')) {
        changes++;
        return `class="${p1}bg-white${p2}!text-teal-700${p3}"`;
      }
      return match;
    });

    // Pattern 4: Final CTA buttons with explicit !important
    content = content.replace(
      /href="\/prenota"[^>]*class="([^"]*)bg-white !text-teal-700([^"]*)"/g,
      'href="/prenota" class="$1bg-white !text-teal-700$2"'
    );

    content = content.replace(
      /href="\/contatti"[^>]*class="([^"]*)border-white !text-white([^"]*)"/g,
      'href="/contatti" class="$1border-white !text-white$2"'
    );

    if (changes > 0) {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: { content }
      });
      console.log(`✅ homepage-medica: Fixed ${changes} text color issues`);
    } else {
      console.log('✓ No changes needed');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
