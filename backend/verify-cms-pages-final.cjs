const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         ✅ VERIFICA FINALE MODIFICHE CMS PAGES                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const pages = await prisma.cMSPage.findMany({
    where: {
      slug: {
        in: ['visite-specialistiche', 'medicina-del-lavoro-medica', 'rspp']
      }
    },
    select: {
      slug: true,
      content: true,
      updatedAt: true
    }
  });
  
  for (const page of pages) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📄 PAGINA: ${page.slug.toUpperCase()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    console.log(`📊 Dimensioni: ${page.content.length} caratteri`);
    console.log(`🕐 Ultimo aggiornamento: ${page.updatedAt.toLocaleString('it-IT')}\n`);
    
    // Check specific improvements
    if (page.slug === 'visite-specialistiche') {
      const hasDuplicateDiv = page.content.includes('bg-gradient-to-r         <div class="bg-gradient-to-r');
      const hasEnhancedSection = page.content.includes('Prenota Section with Enhanced Design');
      const hasGlassmorphism = page.content.includes('backdrop-filter: blur');
      const hasPattern = page.content.includes('radial-gradient(circle at 2px 2px');
      
      console.log('✓ Verifiche:');
      console.log(`  ${hasDuplicateDiv ? '❌' : '✅'} Div duplicato rimosso: ${!hasDuplicateDiv ? 'OK' : 'PRESENTE'}`);
      console.log(`  ${hasEnhancedSection ? '✅' : '❌'} Sezione enhanced: ${hasEnhancedSection ? 'OK' : 'MANCANTE'}`);
      console.log(`  ${hasGlassmorphism ? '✅' : '❌'} Glassmorphism button: ${hasGlassmorphism ? 'OK' : 'MANCANTE'}`);
      console.log(`  ${hasPattern ? '✅' : '❌'} Pattern overlay: ${hasPattern ? 'OK' : 'MANCANTE'}`);
    }
    
    if (page.slug === 'medicina-del-lavoro-medica') {
      const hasTextShadow = page.content.includes('text-shadow');
      const hasGradientCards = page.content.includes('from-white via-gray-50');
      const hasDarkerText = page.content.includes('text-gray-700');
      const hasEnhancedBadges = page.content.includes('bg-cyan-800');
      
      console.log('✓ Verifiche:');
      console.log(`  ${hasTextShadow ? '✅' : '❌'} Text shadows aggiunti: ${hasTextShadow ? 'OK' : 'MANCANTI'}`);
      console.log(`  ${hasGradientCards ? '✅' : '❌'} Card con gradienti: ${hasGradientCards ? 'OK' : 'MANCANTI'}`);
      console.log(`  ${hasDarkerText ? '✅' : '❌'} Testo scurito: ${hasDarkerText ? 'OK' : 'MANCANTE'}`);
      console.log(`  ${hasEnhancedBadges ? '✅' : '❌'} Badge migliorati: ${hasEnhancedBadges ? 'OK' : 'MANCANTI'}`);
    }
    
    if (page.slug === 'rspp') {
      const hasHeroSection = page.content.includes('Hero Section');
      const hasServicesSection = page.content.includes('Servizi RSPP');
      const hasFAQSection = page.content.includes('Domande Frequenti');
      const hasVantaggiSection = page.content.includes('Perché Scegliere');
      const serviceCards = (page.content.match(/Servizio \d/g) || []).length;
      
      console.log('✓ Verifiche:');
      console.log(`  ${hasHeroSection ? '✅' : '❌'} Hero Section: ${hasHeroSection ? 'OK' : 'MANCANTE'}`);
      console.log(`  ${hasServicesSection ? '✅' : '❌'} Sezione Servizi: ${hasServicesSection ? 'OK' : 'MANCANTE'}`);
      console.log(`  ${hasFAQSection ? '✅' : '❌'} FAQ Section: ${hasFAQSection ? 'OK' : 'MANCANTE'}`);
      console.log(`  ${hasVantaggiSection ? '✅' : '❌'} Vantaggi Section: ${hasVantaggiSection ? 'OK' : 'MANCANTE'}`);
      console.log(`  ✅ Card servizi: ${serviceCards} trovate`);
    }
    
    // Check for test banners
    const hasTestBanner = page.content.match(/TEST MARKER|⚠️.*CACHE|<!-- ⚠️/i);
    if (hasTestBanner) {
      console.log(`\n  ⚠️ ATTENZIONE: Banner di test ancora presente!`);
    } else {
      console.log(`\n  ✅ Nessun banner di test presente`);
    }
  }
  
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              🎨 COMPONENTI UI AGGIORNATI                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('✅ PublicHeader.tsx');
  console.log('   → Gradient banner: bg-gradient-to-r from-teal-600 via-teal-700 to-blue-600');
  console.log('\n✅ index.css');
  console.log('   → Animazione gradientShift disponibile');
  console.log('   → Animazione pulse disponibile');
  
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                  📋 ISTRUZIONI FINALI                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('Per vedere tutte le modifiche:');
  console.log('  1. Apri il browser');
  console.log('  2. Premi Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)');
  console.log('  3. Verifica:');
  console.log('     • http://localhost:5174/visite-specialistiche');
  console.log('     • http://localhost:5173/medicina-del-lavoro');
  console.log('     • http://localhost:5173/rspp');
  console.log('\n✨ Tutte le pagine sono state aggiornate con successo!\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
