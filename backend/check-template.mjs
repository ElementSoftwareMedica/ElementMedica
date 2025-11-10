import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const t = await prisma.templateLink.findFirst({
  where: { name: { contains: 'Attestato Google' }, deletedAt: null },
  select: { name: true, type: true, googleDocsUrl: true, googleDocsId: true, googleSlidesId: true, isDefault: true }
});
console.log(JSON.stringify(t, null, 2));
await prisma.$disconnect();
