import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTemplate() {
  try {
    const template = await prisma.templateLink.findFirst({
      where: { 
        type: 'PREVENTIVO',
        isActive: true 
      }
    });
    
    if (!template) {
      console.log('❌ No PREVENTIVO template found');
      return;
    }
    
    console.log('Template ID:', template.id);
    console.log('Has content:', !!template.content);
    console.log('Content length:', template.content?.length || 0);
    
    if (!template.content) {
      console.log('❌ Template has NO content!');
    } else {
      console.log('✅ Template has content');
      console.log('First 200 chars:', template.content.substring(0, 200));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplate();
