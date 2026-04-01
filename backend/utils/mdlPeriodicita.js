/**
 * MDL Periodicità Utility
 *
 * Helpers per il calcolo della scadenza della sorveglianza sanitaria
 * secondo il D.Lgs 81/08 art. 41.
 *
 * Catena di priorità per il suggerimento della data del prossimo controllo:
 *   1. templateScadenzaMesi   — impostato nel template visita (massima priorità)
 *   2. prestazioneScadenzaMesi — impostato nel catalogo prestazione
 *   3. MDL tipo visita default — tabella basata sul tipo (PERIODICA → 12 mesi, ecc.)
 *   4. null                   — nessun suggerimento automatico
 *
 * @module utils/mdlPeriodicita
 */

// ─── costanti ────────────────────────────────────────────────────────────────

/**
 * Mesi di follow-up di default per tipo visita MDL (D.Lgs 81/08 art. 41).
 * Il MC può sempre sovrascrivere la data.
 * null = nessun follow-up standard (visita una-tantum o a discrezione MC).
 *
 * @type {Record<string, number|null>}
 */
export const MDL_DEFAULT_FOLLOWUP_MESI = {
    PERIODICA: 12,   // periodicità standard
    CAMBIO_MANSIONE: 12,   // nuova mansione → rivalutazione annuale
    RIENTRO_MATERNITA: 12,   // rientro da maternità/paternità
    PRECEDENTE_ASSENZA: 12,   // rientro da lunga assenza
    VERIFICA_IDONEITA: 12,   // verifica idoneità
    STRAORDINARIA: 12,   // a discrezione MC → sugg. annuale
    SU_RICHIESTA_LAVORATORE: 12,   // su richiesta lavoratore
    PREVENTIVA: null, // pre-lavoro: una-tantum
    PREVENTIVA_PREASSUNTIVA: null, // pre-assunzione: una-tantum
    CESSAZIONE_RAPPORTO: null, // fine rapporto: nessun follow-up
};

/**
 * Tipi di visita MDL considerati "una-tantum" (senza follow-up periodico
 * automatico secondo il D.Lgs 81/08).
 */
export const MDL_ONETIMUE_TIPI = Object.entries(MDL_DEFAULT_FOLLOWUP_MESI)
    .filter(([, mesi]) => mesi === null)
    .map(([tipo]) => tipo);

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Aggiunge `mesi` mesi interi a una data.
 *
 * @param {Date} date  Data di partenza
 * @param {number} mesi  Numero di mesi da aggiungere (intero positivo)
 * @returns {Date}
 */
export function addMonths(date, mesi) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new TypeError('addMonths: date deve essere un oggetto Date valido');
    }
    if (!Number.isInteger(mesi) || mesi < 0) {
        throw new RangeError('addMonths: mesi deve essere un intero >= 0');
    }
    const result = new Date(date);
    result.setMonth(result.getMonth() + mesi);
    return result;
}

// ─── core API ────────────────────────────────────────────────────────────────

/**
 * Risolve il numero di mesi per il prossimo controllo secondo la catena di
 * priorità MDL.
 *
 * @param {object} params
 * @param {string|null|undefined} params.tipoVisitaMDL        Enum TipoVisitaMDL
 * @param {number|null|undefined} params.prestazioneScadenzaMesi  Campo `scadenzaDefaultMesi` nel catalogo
 * @param {number|null|undefined} params.templateScadenzaMesi     Campo `defaultScadenzaMesi` nel template
 * @returns {{ mesi: number, source: string }|null}
 *   null se nessuna regola suggerisce una data (medico imposta manualmente).
 *
 * @example
 * computeFollowupMesi({ tipoVisitaMDL: 'PERIODICA' })
 * // → { mesi: 12, source: 'mdl_tipo' }
 *
 * computeFollowupMesi({ tipoVisitaMDL: 'PERIODICA', templateScadenzaMesi: 24 })
 * // → { mesi: 24, source: 'template' }
 *
 * computeFollowupMesi({ tipoVisitaMDL: 'CESSAZIONE_RAPPORTO' })
 * // → null
 */
export function computeFollowupMesi({
    tipoVisitaMDL,
    prestazioneScadenzaMesi,
    templateScadenzaMesi,
} = {}) {
    // 1. Template (massima priorità)
    if (templateScadenzaMesi != null && templateScadenzaMesi > 0) {
        return { mesi: templateScadenzaMesi, source: 'template' };
    }

    // 2. Catalogo prestazione
    if (prestazioneScadenzaMesi != null && prestazioneScadenzaMesi > 0) {
        return { mesi: prestazioneScadenzaMesi, source: 'prestazione' };
    }

    // 3. MDL tipo visita default
    if (tipoVisitaMDL) {
        const mdlMesi = MDL_DEFAULT_FOLLOWUP_MESI[tipoVisitaMDL] ?? null;
        if (mdlMesi !== null) {
            return { mesi: mdlMesi, source: 'mdl_tipo' };
        }
        // Tipo MDL noto ma senza follow-up automatico (PREVENTIVA, CESSAZIONE_RAPPORTO, ecc.)
        if (tipoVisitaMDL in MDL_DEFAULT_FOLLOWUP_MESI) {
            return null;
        }
    }

    // 4. Nessun suggerimento
    return null;
}

/**
 * Calcola la data suggerita del prossimo controllo.
 *
 * @param {object} params
 * @param {Date}   params.visitDate                Data della visita corrente
 * @param {string|null|undefined} params.tipoVisitaMDL
 * @param {number|null|undefined} params.prestazioneScadenzaMesi
 * @param {number|null|undefined} params.templateScadenzaMesi
 * @returns {{ date: Date, mesi: number, source: string }|null}
 */
export function computeFollowupDate({
    visitDate,
    tipoVisitaMDL,
    prestazioneScadenzaMesi,
    templateScadenzaMesi,
} = {}) {
    if (!(visitDate instanceof Date) || isNaN(visitDate.getTime())) {
        throw new TypeError('computeFollowupDate: visitDate deve essere un oggetto Date valido');
    }
    const result = computeFollowupMesi({ tipoVisitaMDL, prestazioneScadenzaMesi, templateScadenzaMesi });
    if (!result) return null;
    return { date: addMonths(visitDate, result.mesi), mesi: result.mesi, source: result.source };
}

/**
 * Verifica se un tipo visita MDL è "una-tantum" (senza follow-up periodico
 * automatico).
 *
 * @param {string} tipoVisitaMDL
 * @returns {boolean}
 */
export function isOneTimeMDLType(tipoVisitaMDL) {
    return tipoVisitaMDL in MDL_DEFAULT_FOLLOWUP_MESI &&
        MDL_DEFAULT_FOLLOWUP_MESI[tipoVisitaMDL] === null;
}
