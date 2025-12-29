const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔧 Final fix for ALL white text on white background issues...\n');

    const pages = await prisma.cMSPage.findMany({
      where: { isPublished: true }
    });

    let totalFixed = 0;

    for (const page of pages) {
      let content = typeof page.content === 'string' ? page.content : JSON.stringify(page.content);
      let changes = 0;
      const originalContent = content;

      // Pattern 1: bg-white text-teal-900 → force with !important
      content = content.replace(/class="([^"]*)\bbg-white\b([^"]*)\btext-teal-900\b([^"]*)"/g, (match, before, middle, after) => {
        if (!match.includes('!text-teal-900')) {
          changes++;
          return `class="${before}bg-white${middle}!text-teal-900${after}"`;
        }
        return match;
      });

      // Pattern 2: text-teal-900 bg-white (reversed order)
      content = content.replace(/class="([^"]*)\btext-teal-900\b([^"]*)\bbg-white\b([^"]*)"/g, (match, before, middle, after) => {
        if (!match.includes('!text-teal-900')) {
          changes++;
          return `class="${before}!text-teal-900${middle}bg-white${after}"`;
        }
        return match;
      });

      // Pattern 3: bg-white text-teal-800
      content = content.replace(/class="([^"]*)\bbg-white\b([^"]*)\btext-teal-800\b([^"]*)"/g, (match, before, middle, after) => {
        if (!match.includes('!text-teal-800')) {
          changes++;
          return `class="${before}bg-white${middle}!text-teal-800${after}"`;
        }
        return match;
      });

      // Pattern 4: text-teal-800 bg-white (reversed)
      content = content.replace(/class="([^"]*)\btext-teal-800\b([^"]*)\bbg-white\b([^"]*)"/g, (match, before, middle, after) => {
        if (!match.includes('!text-teal-800')) {
          changes++;
          return `class="${before}!text-teal-800${middle}bg-white${after}"`;
        }
        return match;
      });

      if (changes > 0 && content !== originalContent) {
        await prisma.cMSPage.update({
          where: { id: page.id },
          data: { content }
        });
        console.log(`✅ ${page.slug}: Fixed ${changes} white-on-white issues`);
        totalFixed += changes;
      }
    }

    if (totalFixed === 0) {
      console.log('✓ No white-on-white issues found!');
    } else {
      console.log(`\n✅ Total fixed: ${totalFixed} elements across all pages`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
