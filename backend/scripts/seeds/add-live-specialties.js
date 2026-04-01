/**
 * Add liveSpecialties key to medica-visite-specialistiche CMS page
 * This enables the LiveSpecialtiesSection component to render real-time
 * specialties data from the booking API.
 */
import prisma from '../../config/prisma-optimization.js';

async function addLiveSpecialties() {
    console.log('🔄 Adding liveSpecialties to Visite Specialistiche page...\n');

    try {
        const page = await prisma.cMSPage.findFirst({
            where: { slug: 'medica-visite-specialistiche' }
        });

        if (!page) {
            console.log('❌ Page not found');
            return;
        }

        const existingContent = page.content || {};
        const updatedContent = {
            ...existingContent,
            liveSpecialties: {
                badge: 'Disponibilità in Tempo Reale',
                title: 'Le Nostre Specialità Mediche',
                subtitle: 'Scopri le prestazioni disponibili, i nostri medici specialisti e prenota direttamente online con conferma immediata.'
            }
        };

        await prisma.cMSPage.update({
            where: { id: page.id },
            data: {
                content: updatedContent,
                updatedAt: new Date()
            }
        });

        console.log('✅ liveSpecialties key added to medica-visite-specialistiche');
        console.log('   The LiveSpecialtiesSection will now render with real-time booking data.');
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

addLiveSpecialties();
