import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateAllMedicaPages() {
  console.log('🎨 Updating ALL Element Medica pages with premium teal/blue design...\n');

  // Get all Element Medica pages
  const pages = await prisma.cMSPage.findMany({
    where: { 
      tenantId: 'tenant-id-medica',
      isPublished: true
    }
  });

  console.log(`📄 Found ${pages.length} pages to update\n`);

  let updatedCount = 0;

  for (const page of pages) {
    if (typeof page.content !== 'string') {
      console.log(`⏭️  Skipping ${page.slug} (not HTML string)`);
      continue;
    }

    console.log(`🔧 Updating ${page.slug}...`);
    
    let content = page.content;
    let hasChanges = false;

    // ============================================================================
    // COLOR REPLACEMENTS - medical-* → teal-*/blue-*
    // ============================================================================
    
    // Hero backgrounds
    if (content.includes('from-medical-600 via-medical-700 to-medical-800')) {
      content = content.replace(/from-medical-600 via-medical-700 to-medical-800/g, 'from-teal-600 via-teal-700 to-blue-800');
      hasChanges = true;
    }
    
    if (content.includes('from-medical-50 via-white to-medical-50')) {
      content = content.replace(/from-medical-50 via-white to-medical-50/g, 'from-teal-50/30 via-white to-blue-50/30');
      hasChanges = true;
    }

    // Background colors
    content = content.replace(/bg-medical-50\b/g, 'bg-teal-50');
    content = content.replace(/bg-medical-100\b/g, 'bg-teal-100');
    content = content.replace(/bg-medical-500\b/g, 'bg-teal-500');
    content = content.replace(/bg-medical-600\b/g, 'bg-teal-600');
    content = content.replace(/bg-medical-700\b/g, 'bg-teal-700');
    content = content.replace(/bg-medical-800\b/g, 'bg-teal-800');
    content = content.replace(/bg-medical-900\b/g, 'bg-teal-900');

    // Text colors
    content = content.replace(/text-medical-50\b/g, 'text-teal-50');
    content = content.replace(/text-medical-100\b/g, 'text-teal-100');
    content = content.replace(/text-medical-200\b/g, 'text-teal-200');
    content = content.replace(/text-medical-300\b/g, 'text-teal-300');
    content = content.replace(/text-medical-400\b/g, 'text-teal-400');
    content = content.replace(/text-medical-500\b/g, 'text-teal-500');
    content = content.replace(/text-medical-600\b/g, 'text-teal-600');
    content = content.replace(/text-medical-700\b/g, 'text-teal-700');
    content = content.replace(/text-medical-800\b/g, 'text-teal-800');

    // Border colors
    content = content.replace(/border-medical-50\b/g, 'border-teal-50');
    content = content.replace(/border-medical-100\b/g, 'border-teal-100');
    content = content.replace(/border-medical-200\b/g, 'border-teal-200');
    content = content.replace(/border-medical-300\b/g, 'border-teal-300');
    content = content.replace(/border-medical-400\b/g, 'border-teal-400');
    content = content.replace(/border-medical-500\b/g, 'border-teal-500');
    content = content.replace(/border-medical-600\b/g, 'border-teal-600');
    content = content.replace(/border-medical-700\b/g, 'border-teal-700');

    // Hover states
    content = content.replace(/hover:bg-medical-50\b/g, 'hover:bg-teal-50');
    content = content.replace(/hover:bg-medical-100\b/g, 'hover:bg-teal-100');
    content = content.replace(/hover:bg-medical-600\b/g, 'hover:bg-teal-600');
    content = content.replace(/hover:bg-medical-700\b/g, 'hover:bg-teal-700');
    content = content.replace(/hover:bg-medical-800\b/g, 'hover:bg-teal-800');
    content = content.replace(/hover:bg-medical-900\b/g, 'hover:bg-teal-900');

    content = content.replace(/hover:text-medical-600\b/g, 'hover:text-teal-600');
    content = content.replace(/hover:text-medical-700\b/g, 'hover:text-teal-700');

    content = content.replace(/hover:border-medical-400\b/g, 'hover:border-teal-400');
    content = content.replace(/hover:border-medical-500\b/g, 'hover:border-teal-500');
    content = content.replace(/hover:border-medical-600\b/g, 'hover:border-teal-600');

    // Ring colors (focus states)
    content = content.replace(/ring-medical-400\b/g, 'ring-teal-400');
    content = content.replace(/focus:ring-medical-400\b/g, 'focus:ring-teal-400');

    // Gradients
    content = content.replace(/from-medical-500\b/g, 'from-teal-500');
    content = content.replace(/from-medical-600\b/g, 'from-teal-600');
    content = content.replace(/from-medical-700\b/g, 'from-teal-700');
    content = content.replace(/to-medical-600\b/g, 'to-blue-600');
    content = content.replace(/to-medical-700\b/g, 'to-blue-700');
    content = content.replace(/to-medical-800\b/g, 'to-blue-800');

    // ============================================================================
    // PREMIUM DESIGN ENHANCEMENTS
    // ============================================================================

    // Make shadows softer and more elegant
    content = content.replace(/shadow-2xl/g, 'shadow-xl');
    content = content.replace(/shadow-xl(?! hover)/g, 'shadow-lg');
    
    // Add gradient text for titles with teal-600
    content = content.replace(
      /<span class="text-teal-600">([^<]+)<\/span>/g,
      '<span class="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">$1</span>'
    );

    // Improve button styling
    content = content.replace(
      /class="([^"]*?)bg-teal-600([^"]*?)rounded-lg([^"]*?)"/g,
      'class="$1bg-gradient-to-r from-teal-600 to-teal-700$2rounded-xl$3"'
    );

    // Improve card rounded corners
    content = content.replace(/rounded-2xl/g, 'rounded-3xl');

    // Add subtle background gradients to sections
    content = content.replace(/py-20 bg-white/g, 'py-24 bg-gradient-to-b from-white to-gray-50/30');
    content = content.replace(/py-16 bg-white/g, 'py-20 bg-gradient-to-b from-white to-gray-50/30');

    if (hasChanges || content !== page.content) {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: { content }
      });
      updatedCount++;
      console.log(`   ✅ Updated ${page.slug}`);
    } else {
      console.log(`   ⏭️  No changes needed for ${page.slug}`);
    }
  }

  console.log(`\n✅ Updated ${updatedCount} pages successfully!`);
  console.log('\n🎨 Applied changes:');
  console.log('   - All medical-* colors → teal-* (professional medical blue-green)');
  console.log('   - Gradients enhanced with blue accents');
  console.log('   - Shadows softened (shadow-lg → shadow-xl on hover)');
  console.log('   - Buttons with gradient effects (from-teal-600 to-teal-700)');
  console.log('   - Rounded corners increased (rounded-2xl → rounded-3xl)');
  console.log('   - Gradient text for premium feel');
  console.log('   - Section backgrounds with subtle gradients');

  await prisma.$disconnect();
}

updateAllMedicaPages();
