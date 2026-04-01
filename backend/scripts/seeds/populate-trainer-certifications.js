/**
 * Script per popolare le certificazioni dei trainers nel database
 * Esegui con: node scripts/populate-trainer-certifications.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Popolamento certificazioni trainers...\n');

  try {
    // P48: certifications is on PersonTenantProfile, not Person
    const trainerProfiles = await prisma.personTenantProfile.findMany({
      where: {
        deletedAt: null
      },
      select: {
        id: true,
        certifications: true,
        person: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log(`✓ Trovati ${trainerProfiles.length} profili trainer\n`);

    // Certificazioni comuni da assegnare
    const commonCertifications = [
      'Antincendio',
      'Primo Soccorso',
      'Sicurezza Generale',
      'Sicurezza Specifica'
    ];

    // Aggiorna ogni profilo trainer con certificazioni base
    for (const profile of trainerProfiles) {
      const currentCerts = profile.certifications || [];

      // Se già ha certificazioni, salta
      if (currentCerts.length > 0) {
        console.log(`⏭️  ${profile.person.firstName} ${profile.person.lastName} - già ha ${currentCerts.length} certificazioni`);
        continue;
      }

      // Assegna certificazioni base
      await prisma.personTenantProfile.update({
        where: { id: profile.id },
        data: {
          certifications: commonCertifications
        }
      });

      console.log(`✓ ${profile.person.firstName} ${profile.person.lastName} - aggiunte ${commonCertifications.length} certificazioni`);
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
