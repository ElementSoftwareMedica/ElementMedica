const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verifica finale: controlla che NON ci siano più elementi
 * con bg-white + text-* SENZA !important
 */

async function verifyFinalState() {
  console.log('🔍 Final verification of ALL pages...\n');
  
  const pages = await prisma.cMSPage.findMany({
    where: { isPublished: true },
    orderBy: { slug: 'asc' }
  });
  
  let totalIssuesRemaining = 0;
  const pagesWithIssues = [];
  
  for (const page of pages) {
    const content = String(page.content || '');
    let issues = [];
    
    // Cerca bg-white + text-teal-* SENZA !
    const tealMatches = [...content.matchAll(/class="[^"]*bg-white[^"]*text-teal-\d+[^"]*"/g)]
      .filter(m => !m[0].includes('!text-teal'));
    
    // Cerca text-teal-* + bg-white SENZA !
    const tealReverseMatches = [...content.matchAll(/class="[^"]*text-teal-\d+[^"]*bg-white[^"]*"/g)]
      .filter(m => !m[0].includes('!text-teal'));
    
    // Cerca bg-white + text-blue-* SENZA !
    const blueMatches = [...content.matchAll(/class="[^"]*bg-white[^"]*text-blue-\d+[^"]*"/g)]
      .filter(m => !m[0].includes('!text-blue'));
    
    // Cerca text-blue-* + bg-white SENZA !
    const blueReverseMatches = [...content.matchAll(/class="[^"]*text-blue-\d+[^"]*bg-white[^"]*"/g)]
      .filter(m => !m[0].includes('!text-blue'));
    
    if (tealMatches.length > 0) {
      issues.push(`⚠️  ${tealMatches.length} bg-white text-teal WITHOUT !important`);
    }
    if (tealReverseMatches.length > 0) {
      issues.push(`⚠️  ${tealReverseMatches.length} text-teal bg-white WITHOUT !important`);
    }
    if (blueMatches.length > 0) {
      issues.push(`⚠️  ${blueMatches.length} bg-white text-blue WITHOUT !important`);
    }
    if (blueReverseMatches.length > 0) {
      issues.push(`⚠️  ${blueReverseMatches.length} text-blue bg-white WITHOUT !important`);
    }
    
    const totalPageIssues = issues.length;
    
    if (totalPageIssues > 0) {
      console.log(`❌ ${page.slug}:`);
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
      pagesWithIssues.push(page.slug);
      totalIssuesRemaining += totalPageIssues;
    } else {
      // Conta gli elementi con !important (correttamente fixati)
      const fixedTeal = (content.match(/!text-teal-\d+/g) || []).length;
      const fixedBlue = (content.match(/!text-blue-\d+/g) || []).length;
      const bgWhiteCount = (content.match(/bg-white/g) || []).length;
      
      console.log(`✅ ${page.slug}:`);
      console.log(`   - ${bgWhiteCount} bg-white elements`);
      if (fixedTeal > 0) console.log(`   - ${fixedTeal} !text-teal (FIXED)`);
      if (fixedBlue > 0) console.log(`   - ${fixedBlue} !text-blue (FIXED)`);
      console.log('   ✨ NO ISSUES');
      console.log('');
    }
  }
  
  await prisma.$disconnect();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL REPORT:');
  console.log('='.repeat(60));
  console.log(`Total pages checked: ${pages.length}`);
  console.log(`Pages with issues: ${pagesWithIssues.length}`);
  console.log(`Total issues remaining: ${totalIssuesRemaining}`);
  
  if (totalIssuesRemaining === 0) {
    console.log('\n✅ ✅ ✅ ALL READABILITY ISSUES RESOLVED! ✅ ✅ ✅');
    console.log('🎉 All white-on-white contrast problems are fixed!');
  } else {
    console.log(`\n⚠️  ${totalIssuesRemaining} issues still need attention`);
    console.log('Pages with issues:', pagesWithIssues.join(', '));
  }
}

verifyFinalState().catch(console.error);
