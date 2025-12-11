/**
 * Script per popolare le certificazioni dei trainers nel database
 * Esegui con: node scripts/populate-trainer-certifications.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Popolamento certificazioni trainers...\n');

  try {
    // Recupera tutti i trainers (persons)
    const trainers = await prisma.person.findMany({
      where: {
        deletedAt: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        certifications: true
      }
    });

    console.log(`✓ Trovati ${trainers.length} trainers\n`);

    // Certificazioni comuni da assegnare
    const commonCertifications = [
      'Antincendio',
      'Primo Soccorso',
      'Sicurezza Generale',
      'Sicurezza Specifica'
    ];

    // Aggiorna ogni trainer con certificazioni base
    for (const trainer of trainers) {
      const currentCerts = trainer.certifications || [];
      
      // Se già ha certificazioni, salta
      if (currentCerts.length > 0) {
        console.log(`⏭️  ${trainer.firstName} ${trainer.lastName} - già ha ${currentCerts.length} certificazioni`);
        continue;
      }

      // Assegna certificazioni base
      await prisma.person.update({
        where: { id: trainer.id },
        data: {
          certifications: commonCertifications
        }
      });

      console.log(`✓ ${trainer.firstName} ${trainer.lastName} - aggiunte ${commonCertifications.length} certificazioni`);
    }

    console.log('\n✅ Popolamento completato!');
    console.log('\nCertificazioni assegnate:');
    commonCertifications.forEach(cert => console.log(`  - ${cert}`));

  } catch (error) {
    console.error('❌ Errore durante il popolamento:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
