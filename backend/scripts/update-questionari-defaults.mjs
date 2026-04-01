#!/usr/bin/env node

/**
 * Update Questionari Templates — Add defaultValue to all campos
 * 
 * Ensures every campo in every active questionario template has a defaultValue set.
 * Uses the named DEFAULTS map for specific known campos, and falls back to
 * type-appropriate "positive/normal" defaults for any unrecognised campo.
 * 
 * Covers ALL active questionario templates, not just MDL ones.
 * 
 * Usage:
 *   cd backend && node scripts/update-questionari-defaults.mjs
 * 
 * @session S65 (extended)
 */

import prisma from '../config/prisma-optimization.js';

// Questionario tipo prefix — mirrors QUESTIONARIO_TYPES in backend service
const QUESTIONARIO_TIPO_PREFIXES = ['QUESTIONARIO_'];
const QUESTIONARIO_TIPO_EXACT = ['ALCOL_SCREENING', 'SCHEDA_SORVEGLIANZA'];

function isQuestionarioTipo(tipo) {
    if (!tipo) return false;
    return QUESTIONARIO_TIPO_PREFIXES.some(p => tipo.startsWith(p)) || QUESTIONARIO_TIPO_EXACT.includes(tipo);
}

/**
 * Returns a type-appropriate default for a campo that has no defaultValue.
 * Returns null if the type is not recognised or a date (skip dates).
 */
function getTypeFallback(campo) {
    if (!campo.type) return null;
    switch (campo.type) {
        case 'text':
        case 'textarea':
            return 'Nella norma';
        case 'boolean':
            return 'false';
        case 'number':
        case 'scale':
            return String(campo.min ?? 0);
        case 'select':
        case 'radio': {
            const opts = campo.options || [];
            const first = opts.find(o => (typeof o === 'string' ? o : o.value) !== '');
            if (!first) return null;
            return typeof first === 'string' ? first : first.value;
        }
        case 'multiselect':
            return '[]';
        case 'date':
            return null; // skip dates — too context-specific
        default:
            return null;
    }
}

// ============================================================================
// DEFAULT VALUES MAP — campo name → defaultValue
// ============================================================================

const DEFAULTS = {
    // ========================================================================
    // MDL-ANAMNESI-01 — Questionario Anamnestico Lavorativo
    // ========================================================================
    // Dati anagrafici supplementari — number and text default values
    'anzianita_lavorativa': '0',

    // Anamnesi familiare — negative defaults (no family history)
    'fam_malattie_cardiovascolari': 'false',
    'fam_diabete': 'false',
    'fam_tumori': 'false',
    'fam_allergopatie': 'false',

    // Anamnesi patologica remota — negative defaults
    'interventi_chirurgici': 'false',
    'ricoveri': 'false',
    'allergie': 'false',
    'farmaci_uso': 'false',

    // Anamnesi patologica prossima — negative defaults
    'patologie_attuali': 'false',
    'disturbi_vista': 'false',
    'disturbi_udito': 'false',
    'disturbi_muscolo_scheletrici': 'false',
    'disturbi_respiratori': 'false',
    'disturbi_cutanei': 'false',
    'disturbi_neurologici': 'false',

    // Stile di vita
    'fumo': 'non_fumatore',
    'fumo_sigarette_die': '0',
    'attivita_fisica': 'moderata',

    // Dichiarazione
    'dichiarazione_veridica': 'true',
    'dichiarazione': 'true',

    // ========================================================================
    // MDL-ALCOL-01 — Questionario Alcol e Sostanze Psicoattive
    // ========================================================================
    'frequenza_bevande': '0',      // Mai
    'unita_giorno': '0',           // 1 o 2
    'binge_drinking': '0',         // Mai
    'sostanze_psicoattive': 'false',
    'terapie_farmacologiche': 'false',

    // ========================================================================
    // MDL-VDT-01 — Questionario Rischio Videoterminali
    // ========================================================================
    'ore_vdt_die': '4',            // Default 4 ore (standard office)
    'tipo_lavoro_vdt': 'ufficio_generico', // Lavoro d'ufficio generico
    'pause_regolari': 'true',      // Sì (positive = good)
    'bruciore_occhi': 'mai',
    'lacrimazione': 'mai',
    'secchezza_oculare': 'mai',
    'visione_offuscata': 'mai',
    'cefalea_visiva': 'mai',
    'occhiali_lenti': 'false',
    'dolore_collo': 'mai',
    'dolore_spalle': 'mai',
    'dolore_schiena': 'mai',
    'dolore_polsi_mani': 'mai',
    'sedia_regolabile': 'true',    // Sì (positive)
    'monitor_altezza': 'true',     // Sì (positive)
    'illuminazione_adeguata': 'true', // Sì (positive)

    // ========================================================================
    // MDL-MMC-01 — Questionario Movimentazione Manuale Carichi
    // ========================================================================
    'ore_mmc_die': '0',                     // Ore/giorno MMC
    'peso_max_sollevato': 'fino_5',         // Fino a 5 kg (lowest)
    'frequenza_sollevamento': 'occasionale', // Occasionale (lowest)
    'posture_incongrue': 'false',
    'dolore_lombare': 'mai',
    'dolore_dorso': 'mai',
    'dolore_cervicale': 'mai',
    'dolore_spalla': 'mai',
    'dolore_gomito': 'mai',
    'dolore_polso_mano': 'mai',
    'dolore_ginocchio': 'mai',
    'assenze_msk': 'false',
    'assenze_giorni': '0',                  // Giorni di assenza

    // ========================================================================
    // MDL-RUMORE-01 — Questionario Rischio Rumore
    // ========================================================================
    'esposizione_rumore_anni': '0',  // Anni di esposizione
    'livello_rumore': 'sotto_80',   // Sotto 80 dB(A)
    'uso_dpi_uditivi': 'sempre',    // Sempre (positive)
    'difficolta_ascolto': 'mai',
    'acufeni': 'mai',
    'ipoacusia_percepita': 'false',
    'volume_tv_alto': 'false',
    'cefalea_rumore': 'mai',
    'irritabilita': 'mai',
    'disturbi_sonno': 'false',
    'hobby_rumorosi': 'false',

    // ========================================================================
    // MDL-STRESS-01 — Questionario Stress Lavoro-Correlato
    // ========================================================================
    'carico_eccessivo': '0',          // Mai / Quasi mai
    'ritmi_elevati': '0',
    'scadenze_irrealistiche': '0',
    'autonomia_decisionale': '0',     // Sempre
    'competenze_adeguate': '0',       // Sempre
    'rapporto_colleghi': '0',         // Sempre
    'rapporto_superiori': '0',        // Sempre
    'supporto_errori': '0',           // Sempre
    'molestie_discriminazioni': 'false',
    'ruolo_chiaro': '0',              // Sempre
    'comunicazione_interna': '0',     // Sempre
    'ansia_lavoro': 'mai',
    'insonnia_lavoro': 'mai',
    'stanchezza_cronica': 'mai',
    'soddisfazione_lavoro': '0',      // Molto soddisfatto
};

// ============================================================================
// UPDATE LOGIC
// ============================================================================

async function main() {
    console.log('📋 Update Questionari Templates — Aggiunta defaultValue ai campi\n');

    try {
        // Find ALL active questionario templates across all tenants
        const allTemplates = await prisma.documentoTemplate.findMany({
            where: {
                deletedAt: null,
                isActive: true,
            },
            select: {
                id: true,
                codice: true,
                tipo: true,
                campi: true,
                tenantId: true
            }
        });

        // Filter to only questionario-type templates
        const templates = allTemplates.filter(t => isQuestionarioTipo(t.tipo));

        if (templates.length === 0) {
            console.log('⚠️  Nessun questionario template trovato');
            return;
        }

        console.log(`   Trovati ${templates.length} questionario template da controllare\n`);

        let totalUpdated = 0;
        let totalFieldsUpdated = 0;

        for (const template of templates) {
            const campi = template.campi;
            if (!Array.isArray(campi)) {
                console.log(`   ⚠️  ${template.codice || template.id} (${template.tenantId.substring(0, 8)}) — campi non è un array, skip`);
                continue;
            }

            let fieldsUpdated = 0;
            const updatedCampi = campi.map(campo => {
                // Skip campos that already have a valid defaultValue
                if (campo.defaultValue != null && campo.defaultValue !== '') {
                    return campo;
                }

                // 1) Try named DEFAULTS map
                const namedDefault = DEFAULTS[campo.name];
                if (namedDefault !== undefined) {
                    fieldsUpdated++;
                    return { ...campo, defaultValue: namedDefault };
                }

                // 2) Fall back to type-appropriate default
                const fallback = getTypeFallback(campo);
                if (fallback !== null) {
                    fieldsUpdated++;
                    return { ...campo, defaultValue: fallback };
                }

                return campo;
            });

            if (fieldsUpdated > 0) {
                await prisma.documentoTemplate.update({
                    where: { id: template.id },
                    data: { campi: updatedCampi }
                });
                console.log(`   ✅ ${template.codice || template.id} [${template.tipo}] (${template.tenantId.substring(0, 8)}) — ${fieldsUpdated} campi aggiornati`);
                totalUpdated++;
                totalFieldsUpdated += fieldsUpdated;
            } else {
                console.log(`   ⏭️  ${template.codice || template.id} [${template.tipo}] (${template.tenantId.substring(0, 8)}) — già aggiornato`);
            }
        }

        console.log(`\n✅ Completato!`);
        console.log(`   Template aggiornati: ${totalUpdated}/${templates.length}`);
        console.log(`   Campi con defaultValue: ${totalFieldsUpdated}`);

    } catch (error) {
        console.error('❌ Errore:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
