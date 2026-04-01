/**
 * Script per aggiornare le prestazioni MDL esistenti con la branca "Medicina del Lavoro"
 * 
 * P44 Phase 3: Tutte le prestazioni di tipo MDL devono avere "Medicina del Lavoro" 
 * nel campo brancheSpecialistiche per apparire nel dropdown tariffari-aziende.
 * 
 * @module scripts/update-prestazioni-mdl-branche
 */

import { PrismaClient } from '@prisma/client';
import { CATALOGO_PRESTAZIONI_MDL } from '../services/clinical/RischioPrestazioneService.js';

const prisma = new PrismaClient();

// Tipi di prestazione tipicamente MDL che devono avere la branca
const TIPI_MDL = [
    'VISITA_MEDICINA_LAVORO',
    'ESAME_STRUMENTALE',
    'ESAME_LABORATORIO',
    'VACCINAZIONE',
    'CERTIFICAZIONE',
    'CONSULENZA'
];

async function updatePrestazioniMDL() {
    console.log('='.repeat(60));
    console.log('P44 - Aggiornamento brancheSpecialistiche prestazioni MDL');
    console.log('='.repeat(60));

    const results = {
        updated: 0,
        alreadyOk: 0,
        skipped: 0,
        errors: []
    };

    try {
        // 1. Ottieni tutte le prestazioni che potrebbero essere MDL
        const prestazioni = await prisma.prestazione.findMany({
            where: {
                deletedAt: null,
                OR: [
                    // Prestazioni con codice nel catalogo
                    { codice: { in: Object.keys(CATALOGO_PRESTAZIONI_MDL) } },
                    // Prestazioni con tipo MDL
                    { tipo: { in: TIPI_MDL } }
                ]
            }
        });

        console.log(`\nTrovate ${prestazioni.length} prestazioni da verificare`);
        console.log('-'.repeat(60));

        for (const p of prestazioni) {
            const hasMLBranca = (p.brancheSpecialistiche || []).some(b =>
                b.toLowerCase().includes('medicina del lavoro') ||
                b.toLowerCase() === 'mdl'
            );

            if (hasMLBranca) {
                results.alreadyOk++;
                console.log(`✅ OK: ${p.codice} - ${p.nome} (già ha branca MDL)`);
                continue;
            }

            // Determina le branche da catalogo o default
            let branche = ['Medicina del Lavoro'];

            if (CATALOGO_PRESTAZIONI_MDL[p.codice]) {
                branche = CATALOGO_PRESTAZIONI_MDL[p.codice].brancheSpecialistiche || branche;
            }

            // Merge con branche esistenti (senza duplicati)
            const existingBranche = p.brancheSpecialistiche || [];
            const mergedBranche = [...new Set([...branche, ...existingBranche])];

            try {
                await prisma.prestazione.update({
                    where: { id: p.id },
                    data: { brancheSpecialistiche: mergedBranche }
                });
                results.updated++;
                console.log(`🔄 Aggiornata: ${p.codice} - ${p.nome}`);
                console.log(`   Branche: ${mergedBranche.join(', ')}`);
            } catch (error) {
                results.errors.push(`Errore su ${p.codice}: ${error.message}`);
                console.log(`❌ Errore: ${p.codice} - ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('RIEPILOGO');
        console.log('='.repeat(60));
        console.log(`Già corrette:  ${results.alreadyOk}`);
        console.log(`Aggiornate:    ${results.updated}`);
        console.log(`Errori:        ${results.errors.length}`);

        if (results.errors.length > 0) {
            console.log('\nERRORI:');
            results.errors.forEach(e => console.log(`  - ${e}`));
        }

        return results;

    } catch (error) {
        console.error('Errore critico:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Esegui se chiamato direttamente
updatePrestazioniMDL()
    .then(results => {
        console.log('\nScript completato con successo');
        process.exit(0);
    })
    .catch(error => {
        console.error('Script fallito:', error);
        process.exit(1);
    });
