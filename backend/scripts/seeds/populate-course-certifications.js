/**
 * Script per popolare le certificazioni richieste dai corsi
 * Esegui con: node scripts/populate-course-certifications.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mappa categorie corsi -> certificazioni richieste
const courseCertificationsMap = {
  'antincendio': ['Antincendio'],
  'primo soccorso': ['Primo Soccorso'],
  'sicurezza': ['Sicurezza Generale', 'Sicurezza Specifica'],
  'prevenzione incendio': ['Antincendio'],
  'gestione emergenza': ['Antincendio', 'Primo Soccorso'],
  'rspp': ['Sicurezza Generale'],
  'aspp': ['Sicurezza Generale'],
  'preposto': ['Sicurezza Generale'],
  'rls': ['Sicurezza Generale']
};

function inferCertifications(title) {
  const normalizedTitle = title.toLowerCase();
  const certs = new Set();

  for (const [keyword, certifications] of Object.entries(courseCertificationsMap)) {
    if (normalizedTitle.includes(keyword)) {
      certifications.forEach(cert => certs.add(cert));
    }
  }

  // Se non ci sono match specifici, usa certificazioni generiche
  if (certs.size === 0) {
    return ['Sicurezza Generale'];
  }

  return Array.from(certs);
}

async function main() {
  console.log('🔧 Popolamento certificazioni corsi...\n');

  try {
    // Recupera tutti i corsi senza certificazioni
    const courses = await prisma.course.findMany({
      where: {
        deletedAt: null,
        OR: [
          { certifications: null },
          { certifications: '' }
        ]
      },
      select: {
        id: true,
        title: true,
        category: true,
        certifications: true
      }
    });

    console.log(`✓ Trovati ${courses.length} corsi senza certificazioni\n`);

    let updated = 0;

    for (const course of courses) {
      const inferredCerts = inferCertifications(course.title);
      const certsString = inferredCerts.join(', ');

      await prisma.course.update({
        where: { id: course.id },
        data: {
          certifications: certsString
        }
      });

      console.log(`✓ ${course.title.substring(0, 60)}... -> [${certsString}]`);
      updated++;
    }

    console.log(`\n✅ Aggiornati ${updated} corsi!`);

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
