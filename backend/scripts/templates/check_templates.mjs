import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const templates = await prisma.templateLink.findMany({
  where: { type: 'CERTIFICATE', deletedAt: null },
  select: { id: true, name: true, content: true },
  take: 3
});

for (const t of templates) {
  console.log('=== Template:', t.name, '===');
  console.log('ID:', t.id);
  console.log('Content length:', t.content?.length);
  
  if (t.content?.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(t.content);
      console.log('__slideEditor:', parsed.__slideEditor);
      console.log('elements:', parsed.elements?.length);
      console.log('orientation:', parsed.orientation);
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  } else {
    console.log('Content preview:', t.content?.substring(0, 100));
  }
  console.log('');
}

await prisma.$disconnect();
