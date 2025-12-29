const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findReadabilityIssues() {
  const pages = await prisma.cMSPage.findMany({
    where: { isPublished: true }
  });
  
  console.log('🔍 Analyzing all bg-white elements with text classes WITHOUT !important...\n');
  
  let totalIssues = 0;
  const issuesByPage = {};
  
  for (const page of pages) {
    const content = String(page.content || '');
    const issues = [];
    
    // Pattern 1: bg-white text-teal-* (senza !important)
    const pattern1 = /class="[^"]*bg-white[^"]*text-teal-[0-9]+[^"]*"/g;
    let match;
    while ((match = pattern1.exec(content)) !== null) {
      if (!match[0].includes('!text-teal')) {
        issues.push({
          type: 'bg-white + text-teal',
          class: match[0],
          position: match.index
        });
      }
    }
    
    // Pattern 2: text-teal-* bg-white (ordine inverso, senza !important)
    const pattern2 = /class="[^"]*text-teal-[0-9]+[^"]*bg-white[^"]*"/g;
    while ((match = pattern2.exec(content)) !== null) {
      if (!match[0].includes('!text-teal')) {
        issues.push({
          type: 'text-teal + bg-white',
          class: match[0],
          position: match.index
        });
      }
    }
    
    // Pattern 3: bg-white text-blue-* (senza !important)
    const pattern3 = /class="[^"]*bg-white[^"]*text-blue-[0-9]+[^"]*"/g;
    while ((match = pattern3.exec(content)) !== null) {
      if (!match[0].includes('!text-blue')) {
        issues.push({
          type: 'bg-white + text-blue',
          class: match[0],
          position: match.index
        });
      }
    }
    
    // Pattern 4: text-blue-* bg-white (senza !important)
    const pattern4 = /class="[^"]*text-blue-[0-9]+[^"]*bg-white[^"]*"/g;
    while ((match = pattern4.exec(content)) !== null) {
      if (!match[0].includes('!text-blue')) {
        issues.push({
          type: 'text-blue + bg-white',
          class: match[0],
          position: match.index
        });
      }
    }
    
    if (issues.length > 0) {
      issuesByPage[page.slug] = issues;
      totalIssues += issues.length;
      
      console.log(`📄 ${page.slug}: ${issues.length} elementi con problemi di leggibilità`);
      
      issues.forEach((issue, i) => {
        const before = content.substring(Math.max(0, issue.position - 50), issue.position);
        const after = content.substring(issue.position + issue.class.length, Math.min(content.length, issue.position + issue.class.length + 100));
        
        console.log(`   [${i+1}] ${issue.type}:`);
        console.log(`       ${issue.class}`);
        
        // Estrai il tag e il contenuto per capire cosa è
        const tagMatch = content.substring(issue.position - 10, issue.position + issue.class.length + 200).match(/<(\w+)[^>]*>([^<]*)</);
        if (tagMatch) {
          console.log(`       Tag: <${tagMatch[1]}>, Text: "${tagMatch[2].substring(0, 50)}..."`);
        }
        console.log('');
      });
    }
  }
  
  console.log(`\n✅ Total pages with issues: ${Object.keys(issuesByPage).length}`);
  console.log(`⚠️  Total elements with readability issues: ${totalIssues}\n`);
  
  if (totalIssues > 0) {
    console.log('📋 Summary by page:');
    Object.entries(issuesByPage).forEach(([slug, issues]) => {
      console.log(`   ${slug}: ${issues.length} issues`);
    });
  }
  
  await prisma.$disconnect();
}

findReadabilityIssues().catch(console.error);
