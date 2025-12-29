const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyVisiteUpdate() {
  console.log('🔍 Verifying visite-specialistiche update...\n');
  
  const page = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (!page) {
    console.log('❌ Page not found!');
    return;
  }
  
  const content = String(page.content);
  
  // Check for new sections
  const checks = [
    { name: 'I Nostri Specialisti', pattern: 'I Nostri Specialisti' },
    { name: 'Come Prenotare', pattern: 'Come Prenotare una Visita' },
    { name: 'Convenzioni e Tariffe', pattern: 'Convenzioni e Tariffe' },
    { name: 'FAQ Section', pattern: 'Domande Frequenti' },
    { name: 'Final CTA', pattern: 'Prenota Subito la Tua Visita Specialistica' },
    { name: 'CTA has gradient', pattern: 'bg-gradient-to-r from-teal-900 to-blue-900' },
    { name: 'Dr. Carlo Marini', pattern: 'Dr. Carlo Marini' },
    { name: 'Dr.ssa Laura Rossi', pattern: 'Dr.ssa Laura Rossi' },
    { name: 'Dr. Marco Bianchi', pattern: 'Dr. Marco Bianchi' },
    { name: '!text-teal buttons', pattern: '!text-teal' },
    { name: '!text-white buttons', pattern: '!text-white' }
  ];
  
  let allGood = true;
  
  checks.forEach(check => {
    const found = content.includes(check.pattern);
    const icon = found ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
    if (!found) allGood = false;
  });
  
  console.log('\n📊 Stats:');
  console.log(`   Content length: ${content.length} chars`);
  console.log(`   Sections found: ${checks.filter(c => content.includes(c.pattern)).length}/${checks.length}`);
  
  if (allGood) {
    console.log('\n🎉 ✅ ✅ ✅ ALL CHECKS PASSED! ✅ ✅ ✅');
    console.log('\n💡 NEXT STEP:');
    console.log('   1. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)');
    console.log('   2. Navigate to localhost:5174/visite-specialistiche');
    console.log('   3. Verify CTA section has teal/blue gradient (NOT white)');
    console.log('   4. Scroll down to see all 6 new sections');
  } else {
    console.log('\n⚠️  Some checks failed - review content');
  }
  
  await prisma.$disconnect();
}

verifyVisiteUpdate().catch(console.error);
