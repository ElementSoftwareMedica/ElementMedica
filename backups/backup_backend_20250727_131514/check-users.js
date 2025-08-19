/**
 * Script per verificare gli utenti esistenti nel database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('🔍 Verifica utenti esistenti...');
  
  try {
    const persons = await prisma.person.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        deletedAt: true
      },
      take: 5
    });
    
    console.log('📋 Persone trovate:', persons.length);
    persons.forEach(person => {
      console.log(`   - ID: ${person.id}, Nome: ${person.firstName} ${person.lastName}, Email: ${person.email}`);
    });
    
    // Usa il primo utente non cancellato
    const activeUser = persons.find(p => !p.deletedAt);
    if (activeUser) {
      console.log(`✅ Usando utente esistente: ${activeUser.id}`);
      return activeUser.id;
    }
    
    console.log('⚠️ Nessun utente valido trovato');
    return null;
    
  } catch (error) {
    console.error('❌ Errore nella verifica utenti:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui la verifica
checkUsers()
  .then(userId => {
    if (userId) {
      console.log(`\n🎯 User ID da usare per i test: ${userId}`);
    }
  })
  .catch((error) => {
    console.error('💥 Errore:', error);
    process.exit(1);
  });