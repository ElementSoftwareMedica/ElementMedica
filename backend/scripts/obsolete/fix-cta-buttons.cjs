const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔧 Fixing CTA button readability - forcing text color with !important...\n');

    const pagesToFix = ['prenota', 'chi-siamo-medica', 'diagnostica'];
    
    for (const slug of pagesToFix) {
      const page = await prisma.cMSPage.findFirst({
        where: { slug, isPublished: true }
      });

      if (!page) {
        console.log(`⚠️  ${slug}: Not found`);
        continue;
      }

      let content = typeof page.content === 'string' ? page.content : JSON.stringify(page.content);
      let changes = 0;

      // Pattern 1: bg-white text-teal-900 → add text-teal-900 with higher specificity
      // Replace with inline style to override inheritance
      const oldPattern1 = /class="([^"]*bg-white[^"]*text-teal-900[^"]*)"/g;
      const newReplacement1 = (match, classes) => {
        // Add a utility class that forces the color
        if (!classes.includes('!text-teal-900')) {
          changes++;
          return `class="${classes.replace('text-teal-900', '!text-teal-900')}"`;
        }
        return match;
      };
      content = content.replace(oldPattern1, newReplacement1);

      // Pattern 2: bg-white text-teal-800 (if any)
      const oldPattern2 = /class="([^"]*bg-white[^"]*text-teal-800[^"]*)"/g;
      const newReplacement2 = (match, classes) => {
        if (!classes.includes('!text-teal-800')) {
          changes++;
          return `class="${classes.replace('text-teal-800', '!text-teal-800')}"`;
        }
        return match;
      };
      content = content.replace(oldPattern2, newReplacement2);

      if (changes > 0) {
        await prisma.cMSPage.update({
          where: { id: page.id },
          data: { content }
        });
        console.log(`✅ ${slug}: Fixed ${changes} button text colors`);
      } else {
        console.log(`✓  ${slug}: No changes needed`);
      }
    }

    console.log('\n✅ CTA button readability fix complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
