import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixFormazioneReadability() {
  console.log('🎨 Fixing Element Formazione readability issues...\n');

  try {
    // Get medicina-del-lavoro page with cyan classes
    const page = await prisma.cMSPage.findFirst({
      where: { 
        tenantId: 'tenant-id-formazione',
        slug: 'medicina-del-lavoro'
      }
    });

    if (!page || typeof page.content !== 'string') {
      console.log('⏭️ Page not found or not HTML string');
      return;
    }

    console.log(`🔧 Updating ${page.slug}...`);
    let content = page.content;
    const originalLength = content.length;

    // Fix dark backgrounds with better contrast
    // Replace dark cyan backgrounds with lighter versions for better readability
    content = content.replace(/bg-cyan-900\b/g, 'bg-cyan-800');
    content = content.replace(/bg-cyan-800\b/g, 'bg-cyan-700');
    
    // Fix text colors for better contrast
    // Dark text on light backgrounds should be darker
    content = content.replace(/text-cyan-100\b/g, 'text-white');
    content = content.replace(/text-cyan-200\b/g, 'text-cyan-50');
    
    // Ensure headings are highly visible
    content = content.replace(/text-cyan-900\b/g, 'text-cyan-900');
    
    // Fix hover states for better visibility
    content = content.replace(/hover:bg-cyan-900/g, 'hover:bg-cyan-800');
    content = content.replace(/hover:bg-cyan-800/g, 'hover:bg-cyan-700');
    content = content.replace(/hover:text-cyan-100/g, 'hover:text-white');
    
    // Enhance borders for better definition
    content = content.replace(/border-cyan-200\b/g, 'border-cyan-300');
    
    // Fix gradient text for better visibility
    content = content.replace(/from-cyan-900/g, 'from-cyan-800');
    content = content.replace(/to-cyan-800/g, 'to-cyan-700');

    if (content !== page.content) {
      await prisma.cMSPage.update({
        where: { id: page.id },
        data: { content }
      });
      console.log(`   ✅ Updated ${page.slug} - improved contrast and readability`);
    } else {
      console.log(`   ⏭️ No changes needed for ${page.slug}`);
    }

    console.log('\n✅ Element Formazione readability improved!');
    console.log('\n📋 Changes applied:');
    console.log('   - Lightened dark backgrounds (bg-cyan-900 → bg-cyan-800 → bg-cyan-700)');
    console.log('   - Enhanced text contrast (text-cyan-100 → text-white)');
    console.log('   - Improved hover states for better visibility');
    console.log('   - Enhanced borders and gradients');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixFormazioneReadability();
