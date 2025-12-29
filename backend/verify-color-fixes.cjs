const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           ✅ VERIFICA FINALE CORREZIONI COLORI                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  // 1. Verify visite-specialistiche
  const visite = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (visite) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  VISITE-SPECIALISTICHE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check "Prenota" section
    const hasDirectBg = visite.content.includes('py-16 bg-gradient-to-r from-teal-800');
    const noAbsoluteBg = !visite.content.includes('<div class="absolute inset-0 bg-gradient-to-r from-teal-900');
    const hasWhiteText = visite.content.includes('text-white relative overflow-hidden');
    
    console.log('📍 Sezione "Prenota la Tua Visita":');
    console.log(`  ${hasDirectBg ? '✅' : '❌'} Background scuro diretto sulla section`);
    console.log(`  ${noAbsoluteBg ? '✅' : '❌'} Rimosso background absolute (che non funzionava)`);
    console.log(`  ${hasWhiteText ? '✅' : '❌'} Testo bianco su sfondo scuro`);
    
    // Check button
    const buttonMatch = visite.content.match(/📞 Richiedi Informazioni.*?background: rgba\(255, 255, 255, (0\.\d+)\)/);
    const buttonOpacity = buttonMatch ? parseFloat(buttonMatch[1]) : 0;
    
    console.log('\n📍 Pulsante "Richiedi Informazioni":');
    console.log(`  ${buttonOpacity >= 0.25 ? '✅' : '❌'} Opacità background: ${buttonOpacity} (target: ≥0.25)`);
    console.log(`  Visibilità: ${buttonOpacity >= 0.25 ? '✅ Migliorata' : '⚠️ Potrebbe essere troppo trasparente'}`);
    
    console.log('');
  }
  
  // 2. Verify medicina-del-lavoro-medica
  const medicina = await prisma.cMSPage.findUnique({
    where: { slug: 'medicina-del-lavoro-medica' }
  });
  
  if (medicina) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  MEDICINA-DEL-LAVORO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check hero section
    const hasDarkHero = medicina.content.includes('from-teal-700 via-cyan-800 to-blue-800');
    const hasWhiteText = medicina.content.includes('py-16 md:py-20 text-white');
    const lightHeroGone = !medicina.content.includes('from-teal-50/30 via-white to-blue-50/30');
    
    console.log('📍 Hero Section:');
    console.log(`  ${hasDarkHero ? '✅' : '❌'} Background scuro (from-teal-700 via-cyan-800)`);
    console.log(`  ${hasWhiteText ? '✅' : '❌'} Testo bianco per contrasto`);
    console.log(`  ${lightHeroGone ? '✅' : '❌'} Sfondo chiaro rimosso`);
    
    // Check stats color
    const hasTealStats = medicina.content.includes('text-teal-300');
    const oldStatsGone = !medicina.content.includes('from-teal-600 to-blue-600 bg-clip-text text-transparent');
    
    console.log('\n📍 Statistiche e Badge:');
    console.log(`  ${hasTealStats ? '✅' : '❌'} Stats con text-teal-300 (visibile su dark)`);
    console.log(`  ${oldStatsGone ? '✅' : '❌'} Gradient text rimosso`);
    
    // Check CTA section
    const hasDarkCTA = medicina.content.includes('from-cyan-800 via-blue-800 to-cyan-900');
    const hasDarkBadges = medicina.content.includes('bg-cyan-900');
    
    console.log('\n📍 CTA Section:');
    console.log(`  ${hasDarkCTA ? '✅' : '❌'} Background più scuro (from-cyan-800)`);
    console.log(`  ${hasDarkBadges ? '✅' : '❌'} Badge scuri (bg-cyan-900)`);
    
    console.log('');
  }
  
  // 3. Verify rspp
  const rspp = await prisma.cMSPage.findUnique({
    where: { slug: 'rspp' }
  });
  
  if (rspp) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  RSPP');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Check service cards section
    const hasDarkerServiceBg = rspp.content.includes('from-gray-100 via-teal-50 to-blue-50');
    const lightServiceBgGone = !rspp.content.includes('from-gray-50 via-teal-50/30 to-blue-50/30');
    
    console.log('📍 Sezione Servizi:');
    console.log(`  ${hasDarkerServiceBg ? '✅' : '❌'} Background più scuro (from-gray-100)`);
    console.log(`  ${lightServiceBgGone ? '✅' : '❌'} Background troppo chiaro rimosso`);
    
    // Check card borders
    const hasStrongBorders = rspp.content.includes('border-2 border-gray-300');
    const strongShadows = rspp.content.includes('shadow-xl hover:shadow-2xl');
    
    console.log('\n📍 Card Design:');
    console.log(`  ${hasStrongBorders ? '✅' : '❌'} Border più forti (border-2 border-gray-300)`);
    console.log(`  ${strongShadows ? '✅' : '❌'} Ombre potenziate (shadow-xl)`);
    
    // Check FAQ section
    const hasDarkerFAQBg = rspp.content.includes('from-gray-100 via-blue-100/50 to-teal-100/50');
    
    console.log('\n📍 Sezione FAQ:');
    console.log(`  ${hasDarkerFAQBg ? '✅' : '❌'} Background migliorato (from-gray-100)`);
    
    console.log('');
  }
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    📋 RIEPILOGO MODIFICHE                     ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('🎨 CAMBIAMENTI PRINCIPALI:\n');
  
  console.log('1️⃣  VISITE-SPECIALISTICHE:');
  console.log('   • Sezione "Prenota": background scuro DIRETTO sulla section');
  console.log('   • Colori: from-teal-800 via-blue-800 to-teal-800');
  console.log('   • Testo: bianco su sfondo scuro (ottimo contrasto)');
  console.log('   • Pulsante: opacità aumentata a 0.25 per maggiore visibilità\n');
  
  console.log('2️⃣  MEDICINA-DEL-LAVORO:');
  console.log('   • Hero: DA chiaro (teal-50/white) A scuro (teal-700/cyan-800)');
  console.log('   • Testo hero: tutto bianco per contrasto');
  console.log('   • Stats: text-teal-300 (visibile su dark)');
  console.log('   • CTA: background più scuro (cyan-800/blue-800)\n');
  
  console.log('3️⃣  RSPP:');
  console.log('   • Servizi section: background più scuro (gray-100)');
  console.log('   • Card: border-2 border-gray-300 (più visibili)');
  console.log('   • Shadows: shadow-xl (maggiore profondità)');
  console.log('   • FAQ section: background ottimizzato\n');
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                  🔄 COME VEDERE LE MODIFICHE                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  console.log('1. Apri il browser');
  console.log('2. Premi Cmd+Shift+R (Mac) o Ctrl+Shift+R (Windows)');
  console.log('3. Verifica:');
  console.log('   • http://localhost:5174/visite-specialistiche');
  console.log('     → Sezione "Prenota" con sfondo scuro visibile');
  console.log('     → Pulsante "Richiedi Informazioni" più visibile');
  console.log('');
  console.log('   • http://localhost:5173/medicina-del-lavoro');
  console.log('     → Hero section con sfondo SCURO (non più bianco)');
  console.log('     → Tutto il testo bianco ben visibile');
  console.log('');
  console.log('   • http://localhost:5173/rspp');
  console.log('     → Card con bordi più spessi e visibili');
  console.log('     → Sezioni con contrasto migliorato');
  console.log('\n✨ Tutte le modifiche sono state salvate nel database!\n');
  
  await prisma.$disconnect();
}

main().catch(console.error);
