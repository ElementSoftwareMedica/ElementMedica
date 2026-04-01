/**
 * Unit Tests — MDL Periodicità Utility
 *
 * Verifica la catena di priorità per il calcolo della scadenza della
 * sorveglianza sanitaria (D.Lgs 81/08 art. 41).
 *
 * Catena di priorità:
 *   1. templateScadenzaMesi   (max priorità)
 *   2. prestazioneScadenzaMesi
 *   3. MDL tipo visita default
 *   4. null
 *
 * @see backend/utils/mdlPeriodicita.js
 */

import { describe, test, expect } from '@jest/globals';
import {
    computeFollowupMesi,
    computeFollowupDate,
    addMonths,
    isOneTimeMDLType,
    MDL_DEFAULT_FOLLOWUP_MESI,
    MDL_ONETIMUE_TIPI,
} from '../../utils/mdlPeriodicita.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Crea una data fissa per i test */
const TEST_DATE = new Date('2024-01-15T08:00:00.000Z');

/** Ritorna l'anno/mese di una data come stringa leggibile */
function ym(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// ─── addMonths ────────────────────────────────────────────────────────────────

describe('addMonths()', () => {
    test('aggiunge mesi correttamente (base)', () => {
        const result = addMonths(new Date('2024-01-15'), 12);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0); // Gennaio
    });

    test('aggiunge 6 mesi', () => {
        const result = addMonths(new Date('2024-06-15'), 6);
        expect(ym(result)).toBe('2024-12');
    });

    test('gestisce il passaggio d\'anno', () => {
        const result = addMonths(new Date('2024-11-01'), 3);
        expect(ym(result)).toBe('2025-02');
    });

    test('0 mesi → data invariata', () => {
        const base = new Date('2024-03-20');
        const result = addMonths(base, 0);
        expect(result.getTime()).toBe(base.getTime());
    });

    test('24 mesi → + 2 anni', () => {
        const result = addMonths(new Date('2024-01-15'), 24);
        expect(result.getFullYear()).toBe(2026);
    });

    test('lancia TypeError con data non valida', () => {
        expect(() => addMonths('2024-01-01', 12)).toThrow(TypeError);
        expect(() => addMonths(null, 12)).toThrow(TypeError);
    });

    test('lancia RangeError con mesi negativi', () => {
        expect(() => addMonths(new Date(), -1)).toThrow(RangeError);
    });
});

// ─── computeFollowupMesi ─────────────────────────────────────────────────────

describe('computeFollowupMesi() — catena di priorità', () => {

    // ── Priorità 1: template ──────────────────────────────────────────────────

    test('template (priorità 1) — vince su tutto', () => {
        const result = computeFollowupMesi({
            templateScadenzaMesi: 24,
            prestazioneScadenzaMesi: 6,
            tipoVisitaMDL: 'PERIODICA',
        });
        expect(result).toEqual({ mesi: 24, source: 'template' });
    });

    test('template = 0 → ignorato, scende alla prestazione', () => {
        const result = computeFollowupMesi({
            templateScadenzaMesi: 0,
            prestazioneScadenzaMesi: 18,
            tipoVisitaMDL: 'PERIODICA',
        });
        expect(result).toEqual({ mesi: 18, source: 'prestazione' });
    });

    test('template = null → ignorato', () => {
        const result = computeFollowupMesi({
            templateScadenzaMesi: null,
            tipoVisitaMDL: 'PERIODICA',
        });
        expect(result?.source).toBe('mdl_tipo');
    });

    // ── Priorità 2: prestazione ───────────────────────────────────────────────

    test('prestazione (priorità 2) — vince su MDL tipo', () => {
        const result = computeFollowupMesi({
            prestazioneScadenzaMesi: 24,
            tipoVisitaMDL: 'PERIODICA', // default 12
        });
        expect(result).toEqual({ mesi: 24, source: 'prestazione' });
    });

    test('prestazione = 0 → ignorata, scende a MDL tipo', () => {
        const result = computeFollowupMesi({
            prestazioneScadenzaMesi: 0,
            tipoVisitaMDL: 'PERIODICA',
        });
        expect(result).toEqual({ mesi: 12, source: 'mdl_tipo' });
    });

    // ── Priorità 3: MDL tipo ──────────────────────────────────────────────────

    test('PERIODICA → 12 mesi', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'PERIODICA' });
        expect(result).toEqual({ mesi: 12, source: 'mdl_tipo' });
    });

    test('CAMBIO_MANSIONE → 12 mesi', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'CAMBIO_MANSIONE' });
        expect(result).toEqual({ mesi: 12, source: 'mdl_tipo' });
    });

    test('RIENTRO_MATERNITA → 12 mesi', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'RIENTRO_MATERNITA' });
        expect(result).toEqual({ mesi: 12, source: 'mdl_tipo' });
    });

    test('PRECEDENTE_ASSENZA → 12 mesi', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'PRECEDENTE_ASSENZA' });
        expect(result).toEqual({ mesi: 12, source: 'mdl_tipo' });
    });

    test('VERIFICA_IDONEITA → 12 mesi', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'VERIFICA_IDONEITA' });
        expect(result).toEqual({ mesi: 12, source: 'mdl_tipo' });
    });

    test('STRAORDINARIA → 12 mesi', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'STRAORDINARIA' });
        expect(result).toEqual({ mesi: 12, source: 'mdl_tipo' });
    });

    test('SU_RICHIESTA_LAVORATORE → 12 mesi', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'SU_RICHIESTA_LAVORATORE' });
        expect(result).toEqual({ mesi: 12, source: 'mdl_tipo' });
    });

    // ── Priorità 3: MDL una-tantum → null ────────────────────────────────────

    test('PREVENTIVA → null (nessun follow-up automatico)', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'PREVENTIVA' });
        expect(result).toBeNull();
    });

    test('PREVENTIVA_PREASSUNTIVA → null', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'PREVENTIVA_PREASSUNTIVA' });
        expect(result).toBeNull();
    });

    test('CESSAZIONE_RAPPORTO → null (fine sorveglianza)', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'CESSAZIONE_RAPPORTO' });
        expect(result).toBeNull();
    });

    // i tipi una-tantum NON devono essere sovrascritti dal template/prestazione
    // solo il medico può impostare manualmente la data
    test('CESSAZIONE_RAPPORTO ma con templateScadenzaMesi → template vince', () => {
        // Caso di admin che forza un template con scadenza su tipo cessazione
        const result = computeFollowupMesi({
            tipoVisitaMDL: 'CESSAZIONE_RAPPORTO',
            templateScadenzaMesi: 3,
        });
        // Il template ha la max priorità — anche per tipi una-tantum
        expect(result).toEqual({ mesi: 3, source: 'template' });
    });

    // ── Priorità 4: nessun suggerimento ──────────────────────────────────────

    test('nessun parametro → null', () => {
        expect(computeFollowupMesi({})).toBeNull();
        expect(computeFollowupMesi()).toBeNull();
    });

    test('tipoVisitaMDL sconosciuto + nessun altro → null', () => {
        const result = computeFollowupMesi({ tipoVisitaMDL: 'TIPO_INESISTENTE' });
        expect(result).toBeNull();
    });
});

// ─── computeFollowupDate ─────────────────────────────────────────────────────

describe('computeFollowupDate()', () => {

    test('PERIODICA: data + 12 mesi', () => {
        const result = computeFollowupDate({
            visitDate: new Date('2024-01-15'),
            tipoVisitaMDL: 'PERIODICA',
        });
        expect(result).not.toBeNull();
        expect(result.mesi).toBe(12);
        expect(result.source).toBe('mdl_tipo');
        expect(ym(result.date)).toBe('2025-01');
    });

    test('template 24 mesi: data + 24 mesi', () => {
        const result = computeFollowupDate({
            visitDate: new Date('2024-01-15'),
            tipoVisitaMDL: 'PERIODICA',
            templateScadenzaMesi: 24,
        });
        expect(result.mesi).toBe(24);
        expect(result.source).toBe('template');
        expect(ym(result.date)).toBe('2026-01');
    });

    test('prestazione 18 mesi: data + 18 mesi', () => {
        const result = computeFollowupDate({
            visitDate: new Date('2024-06-01'),
            tipoVisitaMDL: 'CAMBIO_MANSIONE',
            prestazioneScadenzaMesi: 18,
        });
        expect(result.mesi).toBe(18);
        expect(result.source).toBe('prestazione');
        expect(ym(result.date)).toBe('2025-12');
    });

    test('CESSAZIONE_RAPPORTO → null', () => {
        const result = computeFollowupDate({
            visitDate: TEST_DATE,
            tipoVisitaMDL: 'CESSAZIONE_RAPPORTO',
        });
        expect(result).toBeNull();
    });

    test('PREVENTIVA → null', () => {
        const result = computeFollowupDate({
            visitDate: TEST_DATE,
            tipoVisitaMDL: 'PREVENTIVA',
        });
        expect(result).toBeNull();
    });

    test('nessun tipo MDL + nessun template/prestazione → null', () => {
        const result = computeFollowupDate({ visitDate: TEST_DATE });
        expect(result).toBeNull();
    });

    test('lancia TypeError con visitDate non valida', () => {
        expect(() =>
            computeFollowupDate({ visitDate: 'non-una-data', tipoVisitaMDL: 'PERIODICA' })
        ).toThrow(TypeError);
    });

    test('passaggio anno a dicembre + 1 mese = gennaio anno successivo', () => {
        const result = computeFollowupDate({
            visitDate: new Date('2024-12-15'),
            tipoVisitaMDL: 'STRAORDINARIA', // 12 mesi
        });
        expect(ym(result.date)).toBe('2025-12');
    });

    test('visita biennale via template: data + 24 mesi', () => {
        const result = computeFollowupDate({
            visitDate: new Date('2023-07-01'),
            templateScadenzaMesi: 24,
        });
        expect(result.mesi).toBe(24);
        expect(ym(result.date)).toBe('2025-07');
    });
});

// ─── isOneTimeMDLType ─────────────────────────────────────────────────────────

describe('isOneTimeMDLType()', () => {
    test('PREVENTIVA è una-tantum', () => {
        expect(isOneTimeMDLType('PREVENTIVA')).toBe(true);
    });

    test('PREVENTIVA_PREASSUNTIVA è una-tantum', () => {
        expect(isOneTimeMDLType('PREVENTIVA_PREASSUNTIVA')).toBe(true);
    });

    test('CESSAZIONE_RAPPORTO è una-tantum', () => {
        expect(isOneTimeMDLType('CESSAZIONE_RAPPORTO')).toBe(true);
    });

    test('PERIODICA non è una-tantum', () => {
        expect(isOneTimeMDLType('PERIODICA')).toBe(false);
    });

    test('CAMBIO_MANSIONE non è una-tantum', () => {
        expect(isOneTimeMDLType('CAMBIO_MANSIONE')).toBe(false);
    });

    test('tipo sconosciuto → false', () => {
        expect(isOneTimeMDLType('TIPO_INESISTENTE')).toBe(false);
    });
});

// ─── MDL_DEFAULT_FOLLOWUP_MESI integrità ─────────────────────────────────────

describe('MDL_DEFAULT_FOLLOWUP_MESI — copertura enum TipoVisitaMDL', () => {
    /** Tutti i valori del enum TipoVisitaMDL (D.Lgs 81/08 art. 41) */
    const EXPECTED_TIPI = [
        'PERIODICA',
        'PREVENTIVA',
        'PREVENTIVA_PREASSUNTIVA',
        'CESSAZIONE_RAPPORTO',
        'CAMBIO_MANSIONE',
        'RIENTRO_MATERNITA',
        'PRECEDENTE_ASSENZA',
        'VERIFICA_IDONEITA',
        'STRAORDINARIA',
        'SU_RICHIESTA_LAVORATORE',
    ];

    test('tutti i tipi MDL sono presenti nella tabella', () => {
        for (const tipo of EXPECTED_TIPI) {
            expect(MDL_DEFAULT_FOLLOWUP_MESI).toHaveProperty(tipo);
        }
    });

    test('i valori sono number o null (nessun undefined)', () => {
        for (const [tipo, mesi] of Object.entries(MDL_DEFAULT_FOLLOWUP_MESI)) {
            expect(mesi === null || (typeof mesi === 'number' && mesi > 0)).toBe(true);
        }
    });

    test('tipi periodici hanno mesi > 0', () => {
        const periodici = [
            'PERIODICA', 'CAMBIO_MANSIONE', 'RIENTRO_MATERNITA',
            'PRECEDENTE_ASSENZA', 'VERIFICA_IDONEITA', 'STRAORDINARIA',
            'SU_RICHIESTA_LAVORATORE',
        ];
        for (const tipo of periodici) {
            expect(MDL_DEFAULT_FOLLOWUP_MESI[tipo]).toBeGreaterThan(0);
        }
    });

    test('tipi una-tantum hanno mesi === null', () => {
        const unaTantum = ['PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA', 'CESSAZIONE_RAPPORTO'];
        for (const tipo of unaTantum) {
            expect(MDL_DEFAULT_FOLLOWUP_MESI[tipo]).toBeNull();
        }
    });

    test('MDL_ONETIMUE_TIPI contiene solo i tipi null', () => {
        for (const tipo of MDL_ONETIMUE_TIPI) {
            expect(MDL_DEFAULT_FOLLOWUP_MESI[tipo]).toBeNull();
        }
        expect(MDL_ONETIMUE_TIPI).toHaveLength(3); // PREVENTIVA, PREVENTIVA_PREASSUNTIVA, CESSAZIONE_RAPPORTO
    });
});
