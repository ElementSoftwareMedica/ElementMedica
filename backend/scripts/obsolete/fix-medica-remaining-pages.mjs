import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMedicaRemainingPages() {
  console.log('🎨 Fixing remaining Element Medica pages (diagnostica, contatti, chi-siamo)...\n');

  try {
    // Get the remaining pages with cyan colors
    const pages = await prisma.cMSPage.findMany({
      where: { 
        tenantId: 'tenant-id-medica',
        slug: { in: ['diagnostica', 'contatti-medica', 'chi-siamo-medica'] }
      }
    });

    console.log(`📄 Found ${pages.length} pages to update\n`);

    let updatedCount = 0;

    for (const page of pages) {
      if (typeof page.content !== 'string') {
        console.log(`⏭️ Skipping ${page.slug} - not HTML string`);
        continue;
      }

      console.log(`🔧 Updating ${page.slug}...`);
      let content = page.content;

      // Replace ALL cyan colors with teal (matching the main theme)
      // Backgrounds
      content = content.replace(/bg-cyan-50\b/g, 'bg-teal-50');
      content = content.replace(/bg-cyan-100\b/g, 'bg-teal-100');
      content = content.replace(/bg-cyan-200\b/g, 'bg-teal-200');
      content = content.replace(/bg-cyan-300\b/g, 'bg-teal-300');
      content = content.replace(/bg-cyan-400\b/g, 'bg-teal-400');
      content = content.replace(/bg-cyan-500\b/g, 'bg-teal-500');
      content = content.replace(/bg-cyan-600\b/g, 'bg-teal-600');
      content = content.replace(/bg-cyan-700\b/g, 'bg-teal-700');
      content = content.replace(/bg-cyan-800\b/g, 'bg-teal-800');
      content = content.replace(/bg-cyan-900\b/g, 'bg-teal-900');

      // Text colors
      content = content.replace(/text-cyan-50\b/g, 'text-teal-50');
      content = content.replace(/text-cyan-100\b/g, 'text-teal-100');
      content = content.replace(/text-cyan-200\b/g, 'text-teal-200');
      content = content.replace(/text-cyan-300\b/g, 'text-teal-300');
      content = content.replace(/text-cyan-400\b/g, 'text-teal-400');
      content = content.replace(/text-cyan-500\b/g, 'text-teal-500');
      content = content.replace(/text-cyan-600\b/g, 'text-teal-600');
      content = content.replace(/text-cyan-700\b/g, 'text-teal-700');
      content = content.replace(/text-cyan-800\b/g, 'text-teal-800');
      content = content.replace(/text-cyan-900\b/g, 'text-teal-900');

      // Border colors
      content = content.replace(/border-cyan-50\b/g, 'border-teal-50');
      content = content.replace(/border-cyan-100\b/g, 'border-teal-100');
      content = content.replace(/border-cyan-200\b/g, 'border-teal-200');
      content = content.replace(/border-cyan-300\b/g, 'border-teal-300');
      content = content.replace(/border-cyan-400\b/g, 'border-teal-400');
      content = content.replace(/border-cyan-500\b/g, 'border-teal-500');
      content = content.replace(/border-cyan-600\b/g, 'border-teal-600');
      content = content.replace(/border-cyan-700\b/g, 'border-teal-700');
      content = content.replace(/border-cyan-800\b/g, 'border-teal-800');
      content = content.replace(/border-cyan-900\b/g, 'border-teal-900');

      // Hover states
      content = content.replace(/hover:bg-cyan-50/g, 'hover:bg-teal-50');
      content = content.replace(/hover:bg-cyan-100/g, 'hover:bg-teal-100');
      content = content.replace(/hover:bg-cyan-600/g, 'hover:bg-teal-600');
      content = content.replace(/hover:bg-cyan-700/g, 'hover:bg-teal-700');
      content = content.replace(/hover:bg-cyan-800/g, 'hover:bg-teal-800');
      content = content.replace(/hover:text-cyan-600/g, 'hover:text-teal-600');
      content = content.replace(/hover:text-cyan-700/g, 'hover:text-teal-700');
      content = content.replace(/hover:border-cyan-400/g, 'hover:border-teal-400');

      // Gradients
      content = content.replace(/from-cyan-50/g, 'from-teal-50');
      content = content.replace(/from-cyan-100/g, 'from-teal-100');
      content = content.replace(/from-cyan-600/g, 'from-teal-600');
      content = content.replace(/from-cyan-700/g, 'from-teal-700');
      content = content.replace(/to-cyan-50/g, 'to-teal-50');
      content = content.replace(/to-cyan-100/g, 'to-teal-100');
      content = content.replace(/to-cyan-700/g, 'to-teal-700');
      content = content.replace(/to-cyan-800/g, 'to-blue-800');
      content = content.replace(/via-cyan-700/g, 'via-teal-700');

      // Ring colors (focus states)
      content = content.replace(/ring-cyan-400/g, 'ring-teal-400');
      content = content.replace(/ring-cyan-500/g, 'ring-teal-500');

      // Enhance design with better rounded corners and shadows
      content = content.replace(/rounded-lg\b/g, 'rounded-2xl');
      content = content.replace(/shadow-md\b/g, 'shadow-lg');
      
      // Add smooth transitions where missing
      if (!content.includes('transition-all')) {
        content = content.replace(/class="([^"]*hover:[^"]*)"/g, 'class="$1 transition-all duration-300"');
      }

      if (content !== page.content) {
        await prisma.cMSPage.update({
          where: { id: page.id },
          data: { content }
        });
        console.log(`   ✅ Updated ${page.slug} - cyan → teal conversion complete`);
        updatedCount++;
      } else {
        console.log(`   ⏭️ No changes needed for ${page.slug}`);
      }
    }

    console.log(`\n✅ Updated ${updatedCount} pages successfully!`);
    console.log('\n📋 Changes applied:');
    console.log('   - All cyan colors → teal colors (professional medical theme)');
    console.log('   - Enhanced rounded corners (rounded-lg → rounded-2xl)');
    console.log('   - Improved shadows (shadow-md → shadow-lg)');
    console.log('   - Added smooth transitions on interactive elements');
    console.log('   - Consistent with other Element Medica pages');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMedicaRemainingPages();
