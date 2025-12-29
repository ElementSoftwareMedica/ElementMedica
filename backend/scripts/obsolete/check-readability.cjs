const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const pages = await prisma.cMSPage.findMany({
      where: { isPublished: true },
      select: { slug: true, title: true, content: true }
    });

    console.log('🔍 Checking for readability issues in database pages...\n');

    pages.forEach(page => {
      const content = typeof page.content === 'string' ? page.content : JSON.stringify(page.content);
      
      // Check for same-color combinations (low contrast)
      const sameColorPatterns = [
        { pattern: /bg-white[^"]*\s+[^"]*text-white/g, name: 'bg-white + text-white' },
        { pattern: /text-white[^"]*\s+[^"]*bg-white/g, name: 'text-white + bg-white' },
        { pattern: /bg-teal-50[^"]*\s+[^"]*text-teal-50/g, name: 'bg-teal-50 + text-teal-50' },
        { pattern: /bg-gray-50[^"]*\s+[^"]*text-gray-50/g, name: 'bg-gray-50 + text-gray-50' },
        { pattern: /bg-teal-100[^"]*\s+[^"]*text-teal-100/g, name: 'bg-teal-100 + text-teal-100' },
      ];

      const issues = [];
      sameColorPatterns.forEach(({ pattern, name }) => {
        const matches = content.match(pattern);
        if (matches) {
          issues.push({ name, count: matches.length, examples: matches.slice(0, 2) });
        }
      });

      if (issues.length > 0) {
        console.log(`⚠️  ${page.slug}:`);
        issues.forEach(issue => {
          console.log(`   - ${issue.count}x ${issue.name}`);
          issue.examples.forEach(ex => console.log(`     "${ex.substring(0, 60)}..."`));
        });
        console.log('');
      } else {
        console.log(`✅ ${page.slug}: No readability issues detected`);
      }
    });

    console.log('\n✅ Database readability check complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
