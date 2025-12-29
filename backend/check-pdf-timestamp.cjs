const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPDFTimestamp() {
  const preventivoId = '2fc18369-97ce-4080-a04f-9ce40b046cc5';
  
  const preventivo = await prisma.preventivo.findUnique({
    where: { id: preventivoId },
    select: {
      id: true,
      numero: true,
      createdAt: true,
      updatedAt: true,
      fileUrl: true,
      dataGenerazione: true
    }
  });
  
  const templateV5 = await prisma.templateLink.findUnique({
    where: { id: '3d7dd126-7507-483c-bb26-51122628ea6e' },
    select: {
      createdAt: true,
      updatedAt: true
    }
  });
  
  console.log('📄 Preventivo:', preventivo.numero);
  console.log('  Created:', preventivo.createdAt);
  console.log('  Updated:', preventivo.updatedAt);
  console.log('  PDF Generated At:', preventivo.dataGenerazione);
  
  console.log('\n📝 Template V5:');
  console.log('  Created:', templateV5.createdAt);
  console.log('  Updated:', templateV5.updatedAt);
  
  console.log('\n⏱️ Timeline Analysis:');
  if (preventivo.dataGenerazione && templateV5.updatedAt) {
    const pdfDate = new Date(preventivo.dataGenerazione);
    const templateDate = new Date(templateV5.updatedAt);
    
    if (pdfDate < templateDate) {
      console.log('❌ PDF generato PRIMA aggiornamento template V5!');
      console.log('   PDF:', pdfDate.toISOString());
      console.log('   Template V5:', templateDate.toISOString());
      console.log('   → Serve RIGENERARE PDF per vedere template V5');
    } else {
      console.log('✅ PDF generato DOPO template V5');
      console.log('   PDF:', pdfDate.toISOString());
      console.log('   Template V5:', templateDate.toISOString());
    }
  } else if (!preventivo.dataGenerazione) {
    console.log('⚠️ PDF non ancora generato per questo preventivo');
  }
  
  await prisma.$disconnect();
}

checkPDFTimestamp().catch(console.error);
