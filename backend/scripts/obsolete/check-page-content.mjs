import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPageContent() {
  try {
    const page = await prisma.cMSPage.findFirst({
      where: { slug: 'medicina-del-lavoro-medica' }
    });
    
    if (!page) {
      console.log('❌ Page not found');
      return;
    }
    
    console.log('📄 Page found:', page.title);
    console.log('📋 Content type:', typeof page.content);
    
    if (page.content) {
      console.log('🔑 Content keys:', Object.keys(page.content));
      console.log('\n📝 Full content structure:');
      console.log(JSON.stringify(page.content, null, 2).substring(0, 1000));
    } else {
      console.log('❌ Content is null');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkPageContent();
