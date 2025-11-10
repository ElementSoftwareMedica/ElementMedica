import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const template = await prisma.templateLink.findFirst({
  where: { 
    type: 'CERTIFICATE',
    isDefault: true,
    deletedAt: null 
  },
  select: {
    id: true,
    name: true,
    type: true,
    googleDocsUrl: true,
    googleDocsId: true,
    googleSlidesId: true,
    isDefault: true
  }
});

console.log('\n📋 Template CERTIFICATE di default:');
console.log(JSON.stringify(template, null, 2));

if (template) {
  if (template.googleDocsId || template.googleSlidesId) {
    console.log('\n✅ Template ha Google ID estratto');
  } else if (template.googleDocsUrl) {
    console.log('\n⚠️  Template ha URL ma manca Google ID - ripeti migrazione');
  } else {
    console.log('\n❌ Template non ha configurazione Google');
  }
}

await prisma.$disconnect();
