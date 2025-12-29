import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Find the Google template
const googleTemplate = await prisma.templateLink.findFirst({
  where: {
    name: { contains: 'Google' },
    type: 'CERTIFICATE',
    deletedAt: null
  }
});

console.log('\n📋 Template Google trovato:');
console.log(JSON.stringify(googleTemplate, null, 2));

if (googleTemplate && (googleTemplate.googleDocsId || googleTemplate.googleSlidesId)) {
  // Unset all other defaults
  await prisma.templateLink.updateMany({
    where: {
      type: 'CERTIFICATE',
      isDefault: true,
      deletedAt: null
    },
    data: {
      isDefault: false
    }
  });
  
  // Set this as default
  await prisma.templateLink.update({
    where: { id: googleTemplate.id },
    data: { isDefault: true }
  });
  
  console.log('\n✅ Template Google impostato come default per CERTIFICATE');
} else {
  console.log('\n❌ Template Google non trovato o manca Google ID');
}

await prisma.$disconnect();
