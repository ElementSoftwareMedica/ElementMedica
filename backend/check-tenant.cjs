const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Get admin user
    const user = await prisma.person.findFirst({
      where: { email: 'admin@example.com' },
      select: { id: true, email: true, tenantId: true }
    });
    
    console.log('👤 User:', user);
    
    // Get templates
    const templates = await prisma.templateLink.findMany({
      where: { type: 'CERTIFICATE', deletedAt: null },
      select: { id: true, name: true, tenantId: true, isDefault: true }
    });
    
    console.log('📄 Templates:', templates);
    
    // Check match
    const userTenant = user?.tenantId;
    const matchingTemplate = templates.find(t => t.tenantId === userTenant && t.isDefault);
    
    if (matchingTemplate) {
      console.log('\n✅ Matching template found:', matchingTemplate.name);
    } else {
      console.log('\n❌ NO matching template for user tenant:', userTenant);
      console.log('Template tenants:', templates.map(t => t.tenantId));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
