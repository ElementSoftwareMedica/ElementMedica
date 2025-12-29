const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkState() {
  try {
    const page = await prisma.cMSPage.findFirst({
      where: { slug: 'homepage-medica' }
    });
    
    if (!page) {
      console.log('❌ Page not found!');
      return;
    }
    
    const content = String(page.content);
    console.log('📄 homepage-medica found!\n');
    console.log('Content length:', content.length, 'chars\n');
    
    // Search for the problematic button
    const buttonPattern = /<a[^>]*bg-white[^>]*!text-teal[^>]*>/g;
    const buttons = content.match(buttonPattern) || [];
    
    console.log(`Found ${buttons.length} buttons with bg-white + !text-teal\n`);
    
    buttons.forEach((btn, i) => {
      console.log(`Button ${i + 1}:`);
      console.log(btn);
      console.log('');
    });
    
    // Check if text is readable
    if (buttons.length > 0) {
      console.log('✅ Classes exist in database - CSS should work after hard refresh!');
    } else {
      console.log('⚠️  No buttons found - may need to check the pattern');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkState();
