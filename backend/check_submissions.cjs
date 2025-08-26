const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubmissions() {
  try {
    const submissions = await prisma.ContactSubmission.findMany({
      take: 5,
      select: { id: true, type: true, status: true, createdAt: true }
    });
    console.log('Submissions trovate:', submissions.length);
    submissions.forEach(s => console.log('ID:', s.id, 'Type:', s.type, 'Status:', s.status));
    
    // Controlla se esiste l'ID specifico
    const specific = await prisma.ContactSubmission.findUnique({
      where: { id: '3f005622-e9b1-437a-a6d5-e77a7680aed2' }
    });
    console.log('Submission specifica trovata:', !!specific);
  } catch (error) {
    console.error('Errore:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubmissions();