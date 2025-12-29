const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAllChanges() {
  console.log('🔍 Verifying all visite-specialistiche changes...\n');
  
  const page = await prisma.cMSPage.findFirst({
    where: { slug: 'visite-specialistiche' }
  });
  
  if (!page) {
    console.log('❌ Page not found!');
    return;
  }
  
  const content = String(page.content);
  
  const checks = [
    // Contrast fixes
    { name: 'Text-shadow on CTA title', pattern: 'text-shadow:' },
    { name: 'Border-3 button fix', pattern: 'border-3' },
    { name: 'Semi-transparent button bg', pattern: 'bg-teal-700/20' },
    
    // Background enhancements
    { name: 'Hero gradient overlay', pattern: 'from-teal-50 via-blue-50' },
    { name: 'Specialist blur circles', pattern: 'rounded-full blur-3xl' },
    { name: 'Convenzioni dot pattern', pattern: 'radial-gradient' },
    { name: 'FAQ stripe pattern', pattern: 'repeating-linear-gradient' },
    
    // Visual improvements
    { name: 'Icon badges', pattern: 'inline-block bg-teal-100 p-3 rounded-full' },
    { name: 'Gradient underlines', pattern: 'w-24 h-1 bg-gradient-to-r' },
    { name: 'Hero gradient text', pattern: 'text-transparent bg-clip-text' },
    { name: 'Enhanced step numbers', pattern: 'w-20 h-20 bg-gradient-to-br' },
    { name: 'Connecting line steps', pattern: 'bg-gradient-to-r from-teal-200' },
    
    // Interactive effects
    { name: 'Card hover lift', pattern: 'hover:-translate-y-1' },
    { name: 'Button scale effect', pattern: 'hover:scale-105' },
    { name: 'Enhanced shadows', pattern: 'shadow-2xl' },
    { name: 'FAQ hover teal', pattern: 'hover:bg-teal-50' },
    
    // Typography
    { name: 'Font-extrabold headers', pattern: 'font-extrabold' },
    { name: 'Larger section titles', pattern: 'text-4xl font-extrabold' },
    { name: 'Hero 5xl title', pattern: 'text-5xl font-extrabold' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  console.log('📋 Verification Results:\n');
  
  checks.forEach((check, index) => {
    const found = content.includes(check.pattern);
    const icon = found ? '✅' : '❌';
    const status = found ? 'FOUND' : 'MISSING';
    
    console.log(`${icon} ${index + 1}. ${check.name}: ${status}`);
    
    if (found) passed++;
    else failed++;
  });
  
  console.log('\n📊 Summary:');
  console.log(`   Total checks: ${checks.length}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success rate: ${Math.round((passed / checks.length) * 100)}%`);
  
  console.log('\n📏 Page Stats:');
  console.log(`   Content length: ${content.length.toLocaleString()} chars`);
  console.log(`   Sections: ${(content.match(/<section/g) || []).length}`);
  console.log(`   Cards: ${(content.match(/rounded-xl/g) || []).length}`);
  console.log(`   Buttons/Links: ${(content.match(/<a href/g) || []).length}`);
  
  if (passed === checks.length) {
    console.log('\n🎉 ✨ ALL CHECKS PASSED! ✨ 🎉');
    console.log('\n💡 NEXT STEP:');
    console.log('   1. Hard refresh browser: Cmd+Shift+R');
    console.log('   2. Navigate to localhost:5174/visite-specialistiche');
    console.log('   3. Enjoy the professional, elegant design!');
  } else {
    console.log('\n⚠️  Some checks failed - review changes');
  }
  
  await prisma.$disconnect();
}

verifyAllChanges().catch(console.error);
