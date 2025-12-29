const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const page = await prisma.cMSPage.findFirst({ where: { slug: 'visite-specialistiche' } });
  const content = String(page.content);
  
  // Find the button area
  const buttonIdx = content.indexOf('Richiedi Informazioni');
  const snippet = content.substring(buttonIdx - 300, buttonIdx + 100);
  
  console.log('=== CURRENT BUTTON HTML IN DATABASE ===\n');
  console.log(snippet);
  console.log('\n');
  
  // Check for key indicators
  console.log('Checks:');
  console.log('  • Has border-2:', content.includes('border-2 border-white'));
  console.log('  • Has backdrop-filter inline:', content.includes('backdrop-filter: blur(10px)'));
  console.log('  • Has OLD border-3:', content.includes('border-3'));
  console.log('  • Has OLD bg-teal-700/20:', content.includes('bg-teal-700/20'));
  
  console.log('\n=== PAGE METADATA ===');
  console.log('  • Page ID:', page.id);
  console.log('  • Updated At:', page.updatedAt);
  console.log('  • Content Length:', content.length);
  
  await prisma.$disconnect();
})();
