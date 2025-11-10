const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMarkers() {
  try {
    const template = await prisma.template.findFirst({
      where: { name: { contains: 'Attestato' } },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });

    if (!template || !template.versions[0]) {
      console.log('No template found');
      return;
    }

    const content = template.versions[0].content;
    const markers = content.match(/\{\{[^}]+\}\}/g) || [];
    const uniqueMarkers = [...new Set(markers)];

    console.log('Template:', template.name);
    console.log('Version:', template.versions[0].version);
    console.log('\nMarkers found:', uniqueMarkers.length);
    console.log(JSON.stringify(uniqueMarkers, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarkers();
