// Script per aggiornare la password dell'admin da admin123 a Admin123!

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    console.log('🔐 Aggiornamento password admin...');
    
    // Trova l'admin
    const admin = await prisma.person.findUnique({
      where: {
        email: 'admin@example.com'
      }
    });
    
    if (!admin) {
      console.log('❌ Admin non trovato!');
      return;
    }
    
    console.log('✅ Admin trovato:', admin.email);
    
    // Hash della nuova password
    const newPassword = 'Admin123!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Aggiorna la password
    await prisma.person.update({
      where: {
        id: admin.id
      },
      data: {
        password: hashedPassword
      }
    });
    
    console.log('✅ Password aggiornata con successo!');
    console.log('📧 Email:', admin.email);
    console.log('🔑 Nuova password:', newPassword);
    
    // Test della nuova password
    console.log('\n🧪 Test della nuova password...');
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log('✅ Test password:', isValid ? 'SUCCESSO' : 'FALLITO');
    
  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword();