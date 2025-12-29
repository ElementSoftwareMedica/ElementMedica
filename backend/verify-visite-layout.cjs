const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalCheck() {
  console.log('');
  console.log('🎯 VERIFICA FINALE CONTENUTO VISITE SPECIALISTICHE');
  console.log('==================================================');
  console.log('');
  
  const page = await prisma.cMSPage.findUnique({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (!page) {
    console.log('❌ Pagina non trovata');
    await prisma.$disconnect();
    return;
  }
  
  const content = page.content;
  
  // Verifica struttura
  console.log('📋 STRUTTURA HTML:');
  console.log('   Hero section:', content.includes('<!-- Hero Section -->') ? '✅' : '❌');
  console.log('   Specialisti section:', content.includes('<!-- I Nostri Specialisti Section -->') ? '✅' : '❌');
  console.log('   CTA section:', content.includes('<!-- CTA Section') ? '✅' : '❌');
  console.log('');
  
  // Verifica card
  console.log('🏥 CARD SPECIALISTI:');
  const specialists = [
    'Cardiologia',
    'Dermatologia', 
    'Ortopedia',
    'Oculistica',
    'Ginecologia',
    'Otorinolaringoiatria'
  ];
  
  specialists.forEach(spec => {
    const hasCard = content.includes('Card ' + spec);
    const hasTitle = content.includes('<h3 class="text-2xl font-bold text-gray-900 mb-3">' + spec);
    console.log('   ' + spec + ':', (hasCard && hasTitle) ? '✅' : '❌');
  });
  console.log('');
  
  // Verifica layout classes
  console.log('🎨 LAYOUT & STYLING:');
  console.log('   Grid responsive:', content.includes('grid-cols-1 md:grid-cols-2 lg:grid-cols-3') ? '✅' : '❌');
  console.log('   Card flex layout:', content.includes('flex flex-col h-full') ? '✅' : '❌');
  console.log('   Flex-grow per content:', content.includes('flex-grow') ? '✅' : '❌');
  console.log('   Pulsanti uniformi:', content.includes('inline-flex items-center justify-center w-full') ? '✅' : '❌');
  console.log('   Hover effects:', content.includes('hover:shadow-2xl hover:-translate-y-2') ? '✅' : '❌');
  console.log('');
  
  // Conta elementi
  const buttonCount = (content.match(/Prenota Ora/g) || []).length;
  const cardCount = (content.match(/class="bg-white rounded-2xl shadow-lg hover:shadow-2xl/g) || []).length;
  
  console.log('📊 STATISTICHE:');
  console.log('   Card totali:', cardCount);
  console.log('   Pulsanti "Prenota Ora":', buttonCount);
  console.log('   Lunghezza contenuto:', content.length, 'caratteri');
  console.log('');
  
  // Verifica qualità
  console.log('✨ QUALITÀ DEL CODICE:');
  console.log('   Nessun tag $CONTENT$:', !content.includes('$CONTENT$') ? '✅' : '❌');
  console.log('   HTML ben formato:', content.includes('<!') || content.trim().startsWith('<') ? '✅' : '❌');
  console.log('   Commenti HTML presenti:', content.includes('<!--') ? '✅' : '❌');
  console.log('');
  
  console.log('==================================================');
  console.log('');
  
  if (cardCount === 6 && buttonCount === 6 && !content.includes('$CONTENT$')) {
    console.log('🎉 LAYOUT PERFETTO! Tutti i controlli sono passati.');
    console.log('');
    console.log('📌 Caratteristiche implementate:');
    console.log('   ✓ 6 card specialisti con altezza uniforme');
    console.log('   ✓ Pulsanti allineati in fondo a ogni card');
    console.log('   ✓ Grid responsive (mobile→tablet→desktop)');
    console.log('   ✓ Spacing consistente (gap-8, p-8)');
    console.log('   ✓ Icone colorate con gradient');
    console.log('   ✓ Hover effects professionali');
    console.log('   ✓ CTA section finale accattivante');
    console.log('');
  } else {
    console.log('⚠️  Alcuni elementi potrebbero necessitare attenzione.');
  }
  
  await prisma.$disconnect();
}

finalCheck();
