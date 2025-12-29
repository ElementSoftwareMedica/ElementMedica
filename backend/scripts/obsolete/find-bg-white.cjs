const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

(async () => {
  try {
    const page = await prisma.cMSPage.findFirst({
      where: { slug: 'homepage-medica' }
    });

    if (!page) {
      console.log('Page not found');
      return;
    }

    const content = typeof page.content === 'string' ? page.content : JSON.stringify(page.content);
    
    // Find all bg-white instances with context
    const regex = /class="[^"]*bg-white[^"]*"/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(content.length, match.index + match[0].length + 50);
      matches.push({
        full: match[0],
        context: content.substring(start, end)
      });
    }

    console.log(`Found ${matches.length} bg-white instances:\n`);
    matches.forEach((m, i) => {
      console.log(`${i + 1}. ${m.full}`);
      console.log(`   Context: ...${m.context}...`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
