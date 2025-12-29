const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    console.log('🔍 Checking for CERTIFICATE templates...');
    
    const templates = await prisma.templateLink.findMany({
      where: {
        type: 'CERTIFICATE',
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        version: true,
        isDefault: true
      }
    });
    
    console.log(`📊 Found ${templates.length} certificate templates:`);
    templates.forEach(t => {
      console.log(`  - ${t.name} (v${t.version}) ${t.isDefault ? '[DEFAULT]' : ''}`);
    });
    
    if (templates.length === 0) {
      console.log('\n❌ NO CERTIFICATE TEMPLATES FOUND!');
      console.log('📝 You need to create a default certificate template.');
    } else if (!templates.some(t => t.isDefault)) {
      console.log('\n⚠️  No default template set!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
