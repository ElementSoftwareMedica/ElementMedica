const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  try {
    const userTenantId = '3e99024a-5b44-4689-aa7b-651cac4ea256';
    const templateId = '55f7d543-81d4-4c2c-a90a-e7a2d0d67fe1';
    
    console.log('🔧 Updating template tenant...');
    
    const updated = await prisma.templateLink.update({
      where: { id: templateId },
      data: { tenantId: userTenantId },
      select: { id: true, name: true, tenantId: true, isDefault: true }
    });
    
    console.log('✅ Template updated:', updated);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fix();
