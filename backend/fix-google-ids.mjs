import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.templateLink.findMany({
    where: {
      deletedAt: null,
      googleDocsUrl: { not: null }
    }
  });

  console.log(`Found ${templates.length} templates with Google URLs`);

  for (const t of templates) {
    const docsMatch = t.googleDocsUrl?.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    const slidesMatch = t.googleDocsUrl?.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);

    if (docsMatch || slidesMatch) {
      await prisma.templateLink.update({
        where: { id: t.id },
        data: {
          googleDocsId: docsMatch ? docsMatch[1] : null,
          googleSlidesId: slidesMatch ? slidesMatch[1] : null
        }
      });
      console.log(`Updated ${t.name}: ${docsMatch ? 'Docs' : 'Slides'} ID extracted`);
    }
  }

  await prisma.$disconnect();
}

main();
