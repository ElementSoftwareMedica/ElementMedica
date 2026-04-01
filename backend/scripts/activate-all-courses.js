/**
 * activate-all-courses.js
 * Script di migrazione dati: imposta status=ACTIVE e isPublic=true
 * su tutti i corsi del catalogo non eliminati.
 *
 * Uso:
 *   cd backend
 *   node scripts/activate-all-courses.js
 *
 * @project ElementMedica / ElementSicurezza
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Avvio aggiornamento corsi...');

    const result = await prisma.course.updateMany({
        where: { deletedAt: null },
        data: {
            status: 'ACTIVE',
            isPublic: true,
        },
    });

    console.log(`✅ Aggiornati ${result.count} corsi → status=ACTIVE, isPublic=true`);
}

main()
    .catch((err) => {
        console.error('❌ Errore:', err.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
