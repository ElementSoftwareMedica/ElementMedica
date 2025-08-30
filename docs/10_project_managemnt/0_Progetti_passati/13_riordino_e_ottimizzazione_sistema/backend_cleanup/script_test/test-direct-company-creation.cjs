const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDirectCompanyCreation() {
  try {
    console.log('🧪 Test creazione diretta company (bypass middleware)...');
    
    // Test creazione diretta tramite Prisma
    const testCompany = {
      ragione_sociale: `Test Direct Company ${Date.now()}`
    };
    
    console.log('📝 Creazione company diretta tramite Prisma...');
    const company = await prisma.company.create({ 
      data: {
        ...testCompany,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    console.log(`✅ Company creata con successo: ID ${company.id}`);
    console.log(`   Ragione sociale: ${company.ragione_sociale}`);
    console.log(`   Created at: ${company.created_at}`);
    
    // Cleanup - elimina la company di test
    await prisma.company.update({
      where: { id: company.id },
      data: { deletedAt: new Date() }
    });
    
    console.log('🧹 Company di test eliminata (soft delete)');
    
    console.log('\n🎉 Test completato con successo!');
    
  } catch (error) {
    console.log(`❌ Errore durante il test: ${error.message}`);
    console.log('Stack trace:', error.stack);
    
    if (error.code) {
      console.log(`Codice errore Prisma: ${error.code}`);
    }
    
    if (error.meta) {
      console.log('Meta informazioni:', error.meta);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui il test
testDirectCompanyCreation();