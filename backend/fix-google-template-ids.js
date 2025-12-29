import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixGoogleTemplateIds() {
  try {
    // Find templates with googleDocsUrl but missing IDs
    const templates = await prisma.templateLink.findMany({
      where: {
        deletedAt: null,
        googleDocsUrl: { not: null },
        OR: [
          { googleDocsId: null },
          { googleSlidesId: null }
        ]
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

    console.log(`\n📊 Found ${templates.length} templates with Google URLs needing ID extraction\n`);

    for (const template of templates) {
      console.log(`Processing: [${template.id}] ${template.name}`);
      console.log(`  Type: ${template.type}, Default: ${template.isDefault}`);
      console.log(`  URL: ${template.googleDocsUrl}`);

      // Extract IDs from URL
      const docsMatch = template.googleDocsUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      const slidesMatch = template.googleDocsUrl.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);

      let googleDocsId = null;
      let googleSlidesId = null;

      if (docsMatch) {
        googleDocsId = docsMatch[1];
        console.log(`  ✅ Extracted Google Docs ID: ${googleDocsId}`);
      } else if (slidesMatch) {
        googleSlidesId = slidesMatch[1];
        console.log(`  ✅ Extracted Google Slides ID: ${googleSlidesId}`);
      } else {
        console.log(`  ⚠️  Could not extract ID from URL`);
        continue;
      }

      // Update the template
      await prisma.templateLink.update({
        where: { id: template.id },
        data: {
          googleDocsId,
          googleSlidesId
        }
      });

      console.log(`  ✅ Updated template with extracted ID\n`);
    }

    console.log(`\n✅ Migration complete! Updated ${templates.length} templates.\n`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixGoogleTemplateIds();
