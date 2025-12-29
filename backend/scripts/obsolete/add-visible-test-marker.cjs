const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addVisibleChangesForTesting() {
  console.log('🔧 Adding HIGHLY VISIBLE changes for cache-busting test\n');
  
  // VISITE-SPECIALISTICHE - Add a visible test marker
  const visite = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    let content = String(visite.content);
    
    // Add a VERY visible test banner at the top to confirm the page is loading fresh
    // This will be IMPOSSIBLE to miss
    const testBanner = `
      <!-- ⚠️ TEST MARKER - If you see this, the cache is cleared! ⚠️ -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        ✅ CACHE CLEARED - Changes Applied Successfully! (Updated: ${new Date().toLocaleString('it-IT')})
      </div>
      `;
    
    // Add at the very beginning of content
    if (!content.includes('TEST MARKER')) {
      content = testBanner + content;
    }
    
    // Also make the final CTA button EVEN MORE visible by adding a pulsing effect
    content = content.replace(
      /(<a href="\/contatti" class="inline-block border-2 border-white !text-white px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:!text-teal-700 transition-all duration-300 shadow-lg" style="background: rgba\(255, 255, 255, 0\.15\); backdrop-filter: blur\(10px\);">)/,
      '<a href="/contatti" class="inline-block border-2 border-white !text-white px-8 py-4 rounded-xl font-extrabold hover:bg-white hover:!text-teal-700 transition-all duration-300 shadow-lg" style="background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); animation: pulse 2s infinite;">'
    );
    
    await prisma.cMSPage.update({
      where: { id: visite.id },
      data: { content }
    });
    
    console.log('✅ visite-specialistiche: Added visible test banner + button pulse');
  }
  
  console.log('\n📋 INSTRUCTIONS FOR USER:');
  console.log('   1. Go to: http://localhost:5174/visite-specialistiche');
  console.log('   2. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
  console.log('   3. You MUST see a green banner at the top saying "CACHE CLEARED"');
  console.log('   4. The "Richiedi Informazioni" button should have a white/transparent bg');
  console.log('   5. If you DON\'T see the green banner, try:');
  console.log('      - Open DevTools (F12)');
  console.log('      - Go to Network tab');
  console.log('      - Check "Disable cache"');
  console.log('      - Refresh again');
  
  await prisma.$disconnect();
}

addVisibleChangesForTesting().catch(console.error);
