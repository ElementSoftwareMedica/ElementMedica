/**
 * MovimentoContabileGenerator
 *
 * Genera automaticamente la coppia ENTRATA (ricavo aziendale) + USCITA (compenso
 * professionista) per ogni attività MDL fatturabile:
 *   • Visita Medica del Lavoro completata
 *   • Sopralluogo MC / RSPP eseguito
 *   • Nomina MC / RSPP creata
 *   • Consulenza MDL
 *   • Voci periodiche (spese fisse/ricorrenti del tariffario aziendale)
 *
 * Gerarchia prezzo ENTRATA (regola fallback):
 *   1. VoceTariffario.prezzoBase  (tariffario aziendale collgato all'azienda)
 *   2. Prestazione.prezzoBase     (prezzo standard catalogo)
 *   3. → missingData warning (richiede intervento utente)
 *
 * Gerarchia compenso USCITA (regola fallback):
 *   1. VoceTariffario.compensoProfessionista*  (accordo commerciale cliente — priorità assoluta)
 *   2. TariffarioMedico                        (regola generale per medico)
 *   3. ListinoPrezzo                           (per medico+prestazione specifica)
 *   4. MedicoAbilitato.compenso*               (per abilitazione prestazione del medico)
 *   5. → missingData warning (richiede intervento utente)
 *
 * Design:
 *   - IDEMPOTENTE: controlla sempre l'esistenza prima di creare
 *   - Non blocca il flusso principale (catch interno + logger.warn)
 *   - Ritorna sempre { movimenti, warnings } per notify il frontend
 *
 * @module services/management/MovimentoContabileGenerator
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';

// ──────────────────────────────────────────────────────────────────────────────
// Tipi interni
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} GenerationWarning
 * @property {'MISSING_TARIFFARIO'|'MISSING_VOCE'|'MISSING_COMPENSO'|'MISSING_PREZZO'} type
 * @property {string} message   - Messaggio utente-friendly
 * @property {string} [solutionUrl] - URL pagina configurazione
 * @property {string} [field]   - Campo economico mancante
 */

/**
 * @typedef {Object} GenerationResult
 * @property {Object[]} movimenti  - Movimenti creati
 * @property {GenerationWarning[]} warnings - Warning da mostrare all'utente
 */

// ──────────────────────────────────────────────────────────────────────────────
// Helpers finanziari
// ──────────────────────────────────────────────────────────────────────────────

/** Calcola importi netto/iva/lordo */
function calcolaImporti(importoNetto, aliquotaIva = 22) {
    const netto = parseFloat(importoNetto.toFixed(2));
    const iva = parseFloat((netto * aliquotaIva / 100).toFixed(2));
    const lordo = parseFloat((netto + iva).toFixed(2));
    return { importoNetto: netto, importoIva: iva, importoLordo: lordo };
}

/**
 * Calcola compenso professionista dato tipo e valore.
 * @param {string} tipo   - TipoCompensoMedico enum
 * @param {number} valore - Percentuale o importo fisso
 * @param {number} min    - Floor (MINIMO_MASSIMO)
 * @param {number} max    - Ceiling (MINIMO_MASSIMO)
 * @param {number} base   - Importo di riferimento (per PERCENTUALE)
 */
function calcolaCompenso(tipo, valore, min, max, base) {
    let compenso;
    if (tipo === 'FISSO') {
        compenso = parseFloat(valore);
    } else {
        // PERCENTUALE o MINIMO_MASSIMO
        compenso = parseFloat((base * parseFloat(valore) / 100).toFixed(2));
        if (tipo === 'MINIMO_MASSIMO') {
            if (min != null) compenso = Math.max(compenso, parseFloat(min));
            if (max != null) compenso = Math.min(compenso, parseFloat(max));
        }
    }
    return parseFloat(compenso.toFixed(2));
}

// ──────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Trova il TariffarioAziendale attivo + le sue voci per una CompanyTenantProfile.
 */
async function getTariffario(companyTenantProfileId, tenantId, referenceDate = new Date()) {
    const baseWhere = {
        companyTenantProfileId,
        tenantId,
        attivo: true,
        deletedAt: null,
    };
    const assoc = await prisma.tariffarioCompanyAssociation.findFirst({
        where: {
            ...baseWhere,
            validoDa: { lte: referenceDate },
            OR: [{ validoA: null }, { validoA: { gte: referenceDate } }],
        },
        include: {
            tariffario: {
                include: { voci: { where: { attivo: true } } },
            },
        },
        orderBy: { validoDa: 'desc' },
    });
    if (assoc) return assoc;

    return prisma.tariffarioCompanyAssociation.findFirst({
        where: baseWhere,
        include: {
            tariffario: {
                include: { voci: { where: { attivo: true } } },
            },
        },
        orderBy: { validoDa: 'desc' },
    }); // assoc.tariffario.voci
}

/**
 * Cerca la VoceTariffario per tipo (SOPRALLUOGO_MC, NOMINA_RSPP, ecc.) nel
 * tariffario associato all'azienda. Ritorna anche l'assoc per validoDa.
 */
async function getVocePerTipo(companyTenantProfileId, tenantId, tipoVoce, referenceDate = new Date()) {
    const assoc = await getTariffario(companyTenantProfileId, tenantId, referenceDate);
    const voce = assoc?.tariffario?.voci?.find(v => v.tipo === tipoVoce) || null;
    return { assoc, voce };
}

/**
 * Cerca la VoceTariffario per prestazioneId (per le visite MDL).
 * Ordine di priorità:
 *  1. Voce con prestazioneId + categoriaVisita === tipoVisitaMDL (prezzo specifico per tipo visita)
 *  2. Voce con prestazioneId senza categoriaVisita (prezzo generico per la prestazione)
 *  3. Voce generica PRESTAZIONE senza prestazioneId (fallback)
 * @param {string} tipoVisitaMDL - opzionale, es. 'PREVENTIVA' | 'PERIODICA' | ecc.
 */
async function getVocePerPrestazione(companyTenantProfileId, tenantId, prestazioneId, tipoVisitaMDL = null, referenceDate = new Date()) {
    const assoc = await getTariffario(companyTenantProfileId, tenantId, referenceDate);
    if (!assoc) return { assoc: null, voce: null };
    const voci = assoc.tariffario?.voci || [];
    const prestazioneVoci = voci.filter(v => v.tipo === 'PRESTAZIONE');
    const voce =
        (tipoVisitaMDL && prestazioneId
            ? prestazioneVoci.find(v => v.prestazioneId === prestazioneId && v.categoriaVisita === tipoVisitaMDL)
            : null)
        || (tipoVisitaMDL
            ? prestazioneVoci.find(v => !v.prestazioneId && v.categoriaVisita === tipoVisitaMDL)
            : null)
        || (prestazioneId
            ? prestazioneVoci.find(v => v.prestazioneId === prestazioneId && !v.categoriaVisita)
            : null)
        || (prestazioneId
            ? prestazioneVoci.find(v => v.prestazioneId === prestazioneId)
            : null)
        || prestazioneVoci.find(v => !v.prestazioneId && !v.categoriaVisita)
        || null;
    return { assoc, voce };
}

/**
 * Trova la CompanyTenantProfile associata al paziente (dipendente).
 * Cerca il PersonTenantProfile che ha companyTenantProfileId.
 */
async function getCompanyDipendente(personId, tenantId) {
    const profile = await prisma.personTenantProfile.findFirst({
        where: {
            person: { id: personId },
            tenantId,
            deletedAt: null,
            isActive: true,
            companyTenantProfileId: { not: null },
        },
        select: { companyTenantProfileId: true },
        orderBy: { createdAt: 'desc' },
    });
    return profile?.companyTenantProfileId || null;
}

/**
 * Recupera nome lavoratore e ragione sociale azienda per arricchire le descrizioni dei movimenti.
 * Esegue le due query in parallelo per efficienza.
 * @returns {Promise<{nomePaziente: string|null, nomeAzienda: string|null}>}
 */
async function getInfoPersonaAzienda(pazienteId, companyTenantProfileId, tenantId) {
    const [persona, companyProfile] = await Promise.all([
        pazienteId ? prisma.person.findFirst({
            where: { id: pazienteId },
            select: { firstName: true, lastName: true },
        }) : Promise.resolve(null),
        companyTenantProfileId ? prisma.companyTenantProfile.findFirst({
            where: { id: companyTenantProfileId, tenantId, deletedAt: null },
            select: { company: { select: { ragioneSociale: true } } },
        }) : Promise.resolve(null),
    ]);
    const nomePaziente = persona ? `${persona.firstName || ''} ${persona.lastName || ''}`.trim() || null : null;
    const nomeAzienda = companyProfile?.company?.ragioneSociale ?? null;
    return { nomePaziente, nomeAzienda };
}

/**
 * Cerca il compenso del professionista seguendo la gerarchia di priorità.
 * Ritorna { compensoNetto, tipo, fonte } oppure null se non trovato.
 *
 * PRIORITÀ:
 *  1. VoceTariffario.compensoProfessionista* — voce del tariffario aziendale (accordo commerciale cliente)
 *  2. TariffarioMedico                       — compenso generale per medico (da medici/:id "Regole Generali")
 *  3. ListinoPrezzo                          — compenso specifico per medico+prestazione (da medici/:id "Compensi per Prestazione")
 *  4. MedicoAbilitato                        — compenso per prestazione specifica nelle abilitazioni medico
 */
async function getCompensoProfessionista(voce, medicoId, prestazioneId, importoBase, tenantId) {
    // Livello 1 (priorità assoluta): VoceTariffario.compensoProfessionista
    // L'accordo commerciale con il cliente determina quanto pagare il medico per quella voce.
    if (voce?.compensoProfessionistaTipo && voce?.compensoProfessionistaValore != null) {
        const netto = calcolaCompenso(
            voce.compensoProfessionistaTipo,
            voce.compensoProfessionistaValore,
            voce.compensoProfessionistaMinimo,
            voce.compensoProfessionistaMassimo,
            importoBase
        );
        return { compensoNetto: netto, tipo: voce.compensoProfessionistaTipo, fonte: 'VOCE_TARIFFARIO' };
    }

    // Per i livelli successivi è necessario il medicoId
    if (!medicoId) return null;

    // Livello 2: TariffarioMedico — compenso generale definito in medici/:id (regole generali)
    const tariffario = await prisma.tariffarioMedico.findFirst({
        where: { medicoId, tenantId, attivo: true, deletedAt: null },
        orderBy: { validoDa: 'desc' },
    });
    if (tariffario) {
        const netto = calcolaCompenso(
            tariffario.compensoMedicoTipo,
            tariffario.compensoMedicoValore,
            tariffario.compensoMedicoMinimo,
            tariffario.compensoMedicoMassimo,
            importoBase
        );
        return { compensoNetto: netto, tipo: tariffario.compensoMedicoTipo, fonte: 'TARIFFARIO_MEDICO' };
    }

    // Livello 3 (fallback prestazione): ListinoPrezzo per medico+prestazione
    if (prestazioneId) {
        const listino = await prisma.listinoPrezzo.findFirst({
            where: {
                medicoId,
                prestazioneId,
                attivo: true,
                tenantId,
                deletedAt: null,
                compensoMedicoValore: { not: null },
                compensoMedicoTipo: { not: null },
            },
            orderBy: [{ priorita: 'desc' }, { validoDa: 'desc' }],
        });
        if (listino && listino.compensoMedicoTipo && listino.compensoMedicoValore != null) {
            const netto = calcolaCompenso(
                listino.compensoMedicoTipo,
                listino.compensoMedicoValore,
                listino.compensoMedicoMinimo,
                listino.compensoMedicoMassimo,
                importoBase
            );
            return { compensoNetto: netto, tipo: listino.compensoMedicoTipo, fonte: 'LISTINO_MEDICO' };
        }
    }

    // Livello 4 (fallback prestazione): MedicoAbilitato per prestazione specifica
    if (prestazioneId) {
        const abilitato = await prisma.medicoAbilitato.findFirst({
            where: { medicoId, prestazioneId, attivo: true, tenantId },
        });
        if (abilitato) {
            const netto = calcolaCompenso(
                abilitato.compensoTipo,
                abilitato.compensoValore,
                abilitato.compensoMinimo,
                abilitato.compensoMassimo,
                importoBase
            );
            return { compensoNetto: netto, tipo: abilitato.compensoTipo, fonte: 'MEDICO_ABILITATO' };
        }
    }

    return null;
}

/** Crea il record MovimentoContabile USCITA (compenso professionista) */
async function creaMovimentoUscita(opts) {
    const {
        tipo, tipoSoggetto = 'MEDICO', personId,
        companyTenantProfileId, visitaId, sopralluogoId, nominaRuoloId, consulenzaId, dvrId,
        appuntamentoId, appPrestazioneId,
        voceTariffarioId, compensoNetto, compensoTipo, compensoValore, importoRiferimento,
        dataEsecuzione, descrizione, tenantId, createdBy,
        stato: statoParam, // Permette di propagare lo stesso stato del ENTRATA (BOZZA, DA_FATTURARE)
        branchType: branchTypeParam,
    } = opts;

    const { importoNetto, importoIva, importoLordo } = calcolaImporti(compensoNetto, 0); // Compenso no IVA di default

    return prisma.movimentoContabile.create({
        data: {
            direzione: 'USCITA',
            tipo,
            stato: statoParam || 'BOZZA',
            tipoSoggetto,
            personId: personId || null,
            companyTenantProfileId: companyTenantProfileId || null,
            visitaId: visitaId || null,
            sopralluogoId: sopralluogoId || null,
            nominaRuoloId: nominaRuoloId || null,
            consulenzaId: consulenzaId || null,
            dvrId: dvrId || null,
            appuntamentoId: appuntamentoId || null,
            appPrestazioneId: appPrestazioneId || null,
            importoNetto,
            importoIva,
            importoLordo,
            aliquotaIva: 0,
            ritenutaAcconto: null,
            compensoTipo: compensoTipo || null,
            compensoValore: compensoValore ?? null,
            importoRiferimento: importoRiferimento || null,
            voceTariffarioId: voceTariffarioId || null,
            dataEsecuzione,
            descrizione,
            branchType: branchTypeParam || 'MEDICA',
            tenantId,
            createdBy,
        },
    });
}

/**
 * Determina lo stato del movimento in base alla data di esecuzione.
 * - Data passata o presente → 'DA_FATTURARE' (attività eseguita, pronta per fatturazione)
 * - Data futura              → 'BOZZA' (attività programmata, non ancora eseguita)
 *
 * @param {Date|string|null} dataEsecuzione
 * @returns {'DA_FATTURARE'|'BOZZA'}
 */
function _statoPerData(dataEsecuzione) {
    if (!dataEsecuzione) return 'BOZZA';
    return new Date(dataEsecuzione) <= new Date() ? 'DA_FATTURARE' : 'BOZZA';
}

/**
 * Soft-deletes all BOZZA movements matching a source filter and marks them ANNULLATO.
 * Returns the count of movements invalidated.
 * Called before re-generating to ensure fresh calculation reflects updated event data.
 *
 * @param {Object}  sourceFilter - Prisma where clause fragment (e.g. { sopralluogoId })
 * @param {string}  tenantId
 * @param {string}  [updatedBy]  - personId che ha scatenato l'azione
 * @returns {Promise<number>}
 */
async function _invalidaMovimentiBozza(sourceFilter, tenantId, updatedBy) {
    const movimenti = await prisma.movimentoContabile.findMany({
        where: { ...sourceFilter, tenantId, deletedAt: null, stato: 'BOZZA' },
        select: { id: true, movimentoCollegatoId: true },
    });
    if (!movimenti.length) return 0;

    // Raccoglie anche gli ID dei movimenti collegati (coppia ENTRATA/USCITA)
    const ids = new Set(movimenti.map(m => m.id));
    for (const m of movimenti) {
        if (m.movimentoCollegatoId) ids.add(m.movimentoCollegatoId);
    }
    // Verifica che anche i collegati siano in BOZZA prima di annullarli
    const collegati = await prisma.movimentoContabile.findMany({
        where: { id: { in: [...ids] }, stato: 'BOZZA', deletedAt: null },
        select: { id: true },
    });
    const idsDaAnnullare = collegati.map(m => m.id);
    if (!idsDaAnnullare.length) return 0;

    await prisma.movimentoContabile.updateMany({
        where: { id: { in: idsDaAnnullare } },
        data: {
            stato: 'ANNULLATO',
            deletedAt: new Date(),
            updatedBy: updatedBy || null,
            note: 'Annullato automaticamente per rigenerazione a seguito di modifica sorgente',
        },
    });
    return idsDaAnnullare.length;
}

/**
 * Controlla se esiste già un movimento per questa combinazione di chiave sorgente.
 */
async function esisteMovimento(where) {
    // Esclude ANNULLATO: un movimento invalidato non conta come "esistente" per l'idempotenza
    return prisma.movimentoContabile.findFirst({ where: { ...where, deletedAt: null, stato: { not: 'ANNULLATO' } } });
}

async function aggiornaMovimentoSeBozza(movimento, data) {
    if (!movimento || !['BOZZA', 'DA_FATTURARE'].includes(movimento.stato)) return movimento;
    const changed = Object.entries(data).some(([key, value]) => {
        if (value === undefined) return false;
        const current = movimento[key];
        if (typeof value === 'number') return Number(current) !== value;
        return current !== value;
    });
    if (!changed) return movimento;
    return prisma.movimentoContabile.update({
        where: { id: movimento.id },
        data: {
            ...data,
            updatedAt: new Date(),
        },
    });
}

async function resolvePrestazioneSource({ visitaId, appPrestazioneId, appuntamentoId, tenantId }) {
    if (appPrestazioneId) {
        const appPrestazione = await prisma.appuntamentoPrestazione.findFirst({
            where: { id: appPrestazioneId, tenantId, deletedAt: null },
            include: {
                appuntamento: true,
                prestazione: true,
            },
        });
        if (!appPrestazione) return null;
        return {
            visita: null,
            appPrestazione,
            appuntamento: appPrestazione.appuntamento,
            prestazione: appPrestazione.prestazione,
            visitaId: null,
            appPrestazioneId: appPrestazione.id,
            appuntamentoId: appPrestazione.appuntamentoId,
            medicoId: appPrestazione.medicoRefertanteId || appPrestazione.appuntamento?.medicoId || null,
            pazienteId: appPrestazione.appuntamento?.pazienteId || null,
            tipoVisitaMDL: appPrestazione.appuntamento?.tipoVisitaMDL || null,
            dataEsecuzione: appPrestazione.dataEsecuzione || appPrestazione.appuntamento?.dataOra || new Date(),
        };
    }

    if (visitaId) {
        const visita = await prisma.visita.findFirst({
            where: { id: visitaId, tenantId, deletedAt: null },
            include: {
                appuntamento: true,
                prestazione: true,
                appPrestazione: { include: { prestazione: true } },
            },
        });
        if (!visita) return null;
        return {
            visita,
            appPrestazione: visita.appPrestazione || null,
            appuntamento: visita.appuntamento || null,
            prestazione: visita.prestazione || visita.appPrestazione?.prestazione || null,
            visitaId: visita.id,
            appPrestazioneId: visita.appPrestazioneId || null,
            appuntamentoId: visita.appuntamentoId || visita.appPrestazione?.appuntamentoId || null,
            medicoId: visita.medicoRefertanteId || visita.medicoId || visita.appPrestazione?.medicoRefertanteId || visita.appuntamento?.medicoId || null,
            pazienteId: visita.pazienteId || visita.appuntamento?.pazienteId || null,
            tipoVisitaMDL: visita.tipoVisitaMDL || visita.appuntamento?.tipoVisitaMDL || null,
            dataEsecuzione: visita.dataInizio || visita.appuntamento?.dataOra || new Date(),
        };
    }

    if (appuntamentoId) {
        const appuntamento = await prisma.appuntamento.findFirst({
            where: { id: appuntamentoId, tenantId, deletedAt: null },
            include: { prestazione: true, visita: true },
        });
        if (!appuntamento) return null;
        return {
            visita: appuntamento.visita || null,
            appPrestazione: null,
            appuntamento,
            prestazione: appuntamento.prestazione || null,
            visitaId: appuntamento.visita?.id || null,
            appPrestazioneId: null,
            appuntamentoId: appuntamento.id,
            medicoId: appuntamento.medicoId || null,
            pazienteId: appuntamento.pazienteId || null,
            tipoVisitaMDL: appuntamento.tipoVisitaMDL || null,
            dataEsecuzione: appuntamento.dataOra || new Date(),
        };
    }

    return null;
}

async function syncBozzaFatturaAppuntamento(appuntamentoId, tenantId) {
    if (!appuntamentoId) return;
    const fattura = await prisma.fatturaElettronica.findFirst({
        where: {
            tenantId,
            deletedAt: null,
            stato: 'BOZZA',
            OR: [
                { note: `AUTO_ACCETTAZIONE:${appuntamentoId}` },
                { movimentiContabili: { some: { appuntamentoId, tenantId, deletedAt: null } } },
            ],
        },
        include: { linee: { orderBy: { numeroLinea: 'asc' } } },
        orderBy: { updatedAt: 'desc' },
    });
    if (!fattura?.linee?.length) return;

    const entrate = await prisma.movimentoContabile.findMany({
        where: {
            tenantId,
            deletedAt: null,
            appuntamentoId,
            direzione: 'ENTRATA',
            stato: { notIn: ['ANNULLATO', 'STORNATO'] },
            note: { not: { contains: 'SENZA_FATTURA' } },
        },
        select: { id: true, importoNetto: true },
    });
    if (!entrate.length) return;

    const totaleNetto = entrate.reduce((sum, mov) => sum + Number(mov.importoNetto || 0), 0);
    if (totaleNetto <= 0) return;

    const [primaLinea] = fattura.linee;
    const aliquota = Number(primaLinea.aliquotaIva || 0);
    const importoIva = Number((totaleNetto * aliquota / 100).toFixed(2));
    const totale = Number((totaleNetto + importoIva + Number(fattura.importoBollo || 0)).toFixed(2));

    await prisma.$transaction([
        prisma.fatturaElettronicaLinea.update({
            where: { id: primaLinea.id },
            data: {
                prezzoUnitario: totaleNetto,
                prezzoTotale: totaleNetto,
            },
        }),
        prisma.fatturaElettronica.update({
            where: { id: fattura.id },
            data: {
                imponibile: totaleNetto,
                importoIva,
                totale,
            },
        }),
        prisma.movimentoContabile.updateMany({
            where: { id: { in: entrate.map(m => m.id) }, fatturaElettronicaId: null },
            data: { fatturaElettronicaId: fattura.id },
        }),
    ]);
}

async function generaNumeroPagamentoSenzaFattura(tenantId) {
    const anno = new Date().getFullYear();
    const prefix = `SF-${anno}/`;
    const docs = await prisma.fatturaElettronica.findMany({
        where: {
            tenantId,
            numero: { startsWith: prefix },
        },
        select: { numero: true },
    });
    const latestProgressivo = docs.reduce((max, doc) => {
        const progressivo = Number(String(doc.numero || '').replace(prefix, '')) || 0;
        return Math.max(max, progressivo);
    }, 0);
    return `${prefix}${String(latestProgressivo + 1).padStart(3, '0')}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper scadenze periodiche
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Calcola le date di scadenza elapse a partire da `anchorDate`.
 * La prima scadenza coincide con `anchorDate` stessa (non con anchorDate + periodo).
 *
 * @param {Date} anchorDate  Data di ancora (nomina MC o validoDa)
 * @param {string} frequenza  FrequenzaTariffario enum
 * @returns {Date[]} Array di date elapse (inclusa anchorDate se <= oggi)
 */
function calcolaScadenzeElapsed(anchorDate, frequenza) {
    const today = new Date();
    const anchor = new Date(anchorDate);

    // UNA_TANTUM: una sola scadenza alla data di ancora
    if (frequenza === 'UNA_TANTUM') {
        return anchor <= today ? [anchor] : [];
    }

    const mesiMap = { MENSILE: 1, TRIMESTRALE: 3, SEMESTRALE: 6, ANNUALE: 12 };
    const mesi = mesiMap[frequenza];
    if (!mesi) return [];

    const scadenze = [];
    let candidate = new Date(anchor);
    // La prima scadenza è l'anchor stessa; le successive si ottengono aggiungendo il periodo
    while (candidate <= today) {
        scadenze.push(new Date(candidate));
        candidate = new Date(candidate);
        candidate.setMonth(candidate.getMonth() + mesi);
    }
    return scadenze;
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────────────────────────

const MovimentoContabileGenerator = {

    // ─── 1. VISITA MDL ──────────────────────────────────────────────────────

    /**
     * Genera ENTRATA (azienda) + USCITA (medico) quando una Visita MDL è completata.
     *
     * @param {Object} visita  - Record Visita con pazienteId, medicoId, prestazioneId, tipoVisitaMDL
     * @param {string} tenantId
     * @param {string} createdBy - personId utente
     * @returns {Promise<GenerationResult>}
     */
    async generaPerVisitaMDL(visita, tenantId, createdBy) {
        /** @type {GenerationResult} */
        const result = { movimenti: [], warnings: [] };
        try {
            // È una visita MDL solo se tipoVisitaMDL è impostato
            if (!visita.tipoVisitaMDL) return result;

            // Trova azienda del dipendente
            // Priorità:
            //  1. Azienda fissata sull'appuntamento della visita (fotografia contrattuale della prenotazione)
            //  2. PersonTenantProfile.companyTenantProfileId attivo (fallback per dati storici)
            let companyTenantProfileId = visita._appuntamentoCompanyId || visita.appuntamento?.companyTenantProfileId || null;
            if (!companyTenantProfileId) {
                companyTenantProfileId = await getCompanyDipendente(visita.pazienteId, tenantId);
            } else {
                logger.info(
                    { visitaId: visita.id, companyTenantProfileId },
                    'generaPerVisitaMDL: usato companyTenantProfileId da appuntamento'
                );
            }
            if (!companyTenantProfileId) {
                result.warnings.push({
                    type: 'MISSING_TARIFFARIO',
                    message: `Il dipendente non è associato a nessuna azienda nel tenant. Collega il dipendente all'azienda prima di generare il movimento contabile.`,
                    solutionUrl: `/persons/${visita.pazienteId}`,
                });
                return result;
            }

            // Cerca VoceTariffario per questa prestazione — priorità: specifico per tipo visita MDL
            const referenceDate = visita.dataOra ? new Date(visita.dataOra) : new Date();
            const { assoc, voce } = await getVocePerPrestazione(companyTenantProfileId, tenantId, visita.prestazioneId, visita.tipoVisitaMDL, referenceDate);

            // Prezzo ENTRATA (fallback chain)
            let importoNettoEntrata = voce ? parseFloat(voce.prezzoBase) : 0;
            let prezzoFonte = 'VOCE_TARIFFARIO';

            if (!importoNettoEntrata || importoNettoEntrata === 0) {
                // Fallback: campi per-tipo su Prestazione oppure prezzoBase
                const prest = await prisma.prestazione.findFirst({
                    where: { id: visita.prestazioneId, tenantId, deletedAt: null },
                    select: { prezzoBase: true, prezzoPrimaVisita: true, prezzoControllo: true, nome: true },
                });
                if (prest) {
                    // Usa il prezzo specifico per tipo visita MDL se disponibile
                    const tipoVisitaMDL = visita.tipoVisitaMDL;
                    let prezzoPerTipo = null;
                    if (tipoVisitaMDL === 'PREVENTIVA' || tipoVisitaMDL === 'PREVENTIVA_PREASSUNTIVA') {
                        prezzoPerTipo = prest.prezzoPrimaVisita ? parseFloat(prest.prezzoPrimaVisita) : null;
                    } else if (tipoVisitaMDL === 'PERIODICA') {
                        prezzoPerTipo = prest.prezzoControllo ? parseFloat(prest.prezzoControllo) : null;
                    }
                    const fallbackPrezzo = prezzoPerTipo || (prest.prezzoBase ? parseFloat(prest.prezzoBase) : 0);
                    if (fallbackPrezzo > 0) {
                        importoNettoEntrata = fallbackPrezzo;
                        prezzoFonte = prezzoPerTipo ? 'PRESTAZIONE_PER_TIPO' : 'PRESTAZIONE_STANDARD';
                        result.warnings.push({
                            type: 'MISSING_VOCE',
                            message: `Nessuna voce tariffario per "${prest.nome}" (${tipoVisitaMDL?.replace(/_/g, ' ')}). Usato prezzo ${prezzoFonte === 'PRESTAZIONE_PER_TIPO' ? 'per tipo visita' : 'standard'} (€${fallbackPrezzo}). Configura il tariffario aziendale per un valore accurato.`,
                            solutionUrl: `/tariffari-aziendali`,
                            field: 'importoNetto',
                        });
                    } else {
                        result.warnings.push({
                            type: 'MISSING_PREZZO',
                            message: `Nessun prezzo disponibile per questa prestazione MDL. Il movimento è stato creato con importo €0. Aggiorna il tariffario aziendale oppure il prezzo base della prestazione.`,
                            solutionUrl: `/tariffari-aziendali`,
                            field: 'importoNetto',
                        });
                    }
                } else {
                    result.warnings.push({
                        type: 'MISSING_PREZZO',
                        message: `Nessun prezzo disponibile per questa prestazione MDL. Il movimento è stato creato con importo €0. Aggiorna il tariffario aziendale oppure il prezzo base della prestazione.`,
                        solutionUrl: `/tariffari-aziendali`,
                        field: 'importoNetto',
                    });
                }
            }

            if (!assoc) {
                result.warnings.push({
                    type: 'MISSING_TARIFFARIO',
                    message: `Nessun tariffario aziendale attivo per questa azienda. Associa un tariffario per avere il calcolo automatico dei prezzi.`,
                    solutionUrl: `/tariffari-aziendali`,
                });
            }

            // Prestazioni mediche di medicina del lavoro: esenti IVA (Art. 10 n.18 DPR 633/72 - D.Lgs 81/08 Art.41)
            const aliquotaIva = voce ? parseFloat(voce.ivaAliquota) : 0;
            const { importoNetto, importoIva, importoLordo } = calcolaImporti(importoNettoEntrata, aliquotaIva);

            // Idempotenza: cerca solo movimenti VISITA_MDL per evitare che movimenti
            // di altro tipo (es. PRESTAZIONE_CLINICA da questionari) blocchino la creazione.
            const existingEntrata = await esisteMovimento({ visitaId: visita.id, direzione: 'ENTRATA', tipo: 'VISITA_MDL', tenantId });
            const existingUscita = await esisteMovimento({ visitaId: visita.id, direzione: 'USCITA', tipo: 'VISITA_MDL', tenantId });
            if (existingEntrata && existingUscita) {
                const compenso = await getCompensoProfessionista(
                    voce, visita.medicoId, visita.prestazioneId, importoNetto, tenantId
                );
                const entrataAggiornata = await aggiornaMovimentoSeBozza(existingEntrata, {
                    companyTenantProfileId,
                    voceTariffarioId: voce?.id || null,
                    importoNetto,
                    importoIva,
                    importoLordo,
                    aliquotaIva,
                    dataEsecuzione: visita.dataOra,
                    stato: 'DA_FATTURARE',
                });
                const uscitaAggiornata = compenso
                    ? await aggiornaMovimentoSeBozza(existingUscita, {
                        personId: visita.medicoId,
                        companyTenantProfileId,
                        voceTariffarioId: voce?.id || null,
                        importoNetto: compenso.compensoNetto,
                        importoIva: 0,
                        importoLordo: compenso.compensoNetto,
                        compensoTipo: compenso.tipo,
                        importoRiferimento: importoNetto,
                        dataEsecuzione: visita.dataOra,
                        stato: 'DA_FATTURARE',
                    })
                    : existingUscita;
                result.movimenti.push(entrataAggiornata, uscitaAggiornata);
                return result;
            }

            // Arricchisce descrizione con nome paziente + azienda
            const { nomePaziente, nomeAzienda } = await getInfoPersonaAzienda(
                visita.pazienteId, companyTenantProfileId, tenantId
            ).catch(() => ({ nomePaziente: null, nomeAzienda: null }));
            const tipoVisitaLabel = visita.tipoVisitaMDL?.toLowerCase().replace(/_/g, ' ') || 'MDL';
            const infoSuffix = [nomePaziente, nomeAzienda].filter(Boolean).join(' | ');

            // Visita raggiunge questo punto solo se COMPLETATA → DA_FATTURARE
            const statoVisita = 'DA_FATTURARE';

            let movEntrata = existingEntrata || null;
            if (!existingEntrata) {
                // ENTRATA
                // Collega anche appuntamentoId (se disponibile) in modo che il movimento
                // sia incluso nell'aggregazione _prezzoTotaleMovimenti nel calendario.
                movEntrata = await prisma.movimentoContabile.create({
                    data: {
                        direzione: 'ENTRATA',
                        tipo: 'VISITA_MDL',
                        stato: statoVisita,
                        tipoSoggetto: 'AZIENDA',
                        companyTenantProfileId,
                        visitaId: visita.id,
                        appuntamentoId: visita.appuntamentoId || null,
                        voceTariffarioId: voce?.id || null,
                        importoNetto,
                        importoIva,
                        importoLordo,
                        aliquotaIva,
                        dataEsecuzione: visita.dataOra,
                        descrizione: `Visita MDL – ${tipoVisitaLabel}${infoSuffix ? ` | ${infoSuffix}` : ''} [fonte: ${prezzoFonte}]`,
                        branchType: 'MEDICA',
                        tenantId,
                        createdBy,
                    },
                });
                result.movimenti.push(movEntrata);
                logger.info({ id: movEntrata.id, visitaId: visita.id }, 'MovimentoContabile ENTRATA creato per Visita MDL');
            }

            // USCITA — compenso medico (creata se ancora mancante)
            if (!existingUscita) {
                const compenso = await getCompensoProfessionista(
                    voce, visita.medicoId, visita.prestazioneId, importoNetto, tenantId
                );
                if (compenso) {
                    const movUscita = await creaMovimentoUscita({
                        tipo: 'VISITA_MDL',
                        tipoSoggetto: 'MEDICO',
                        personId: visita.medicoId,
                        companyTenantProfileId,
                        visitaId: visita.id,
                        voceTariffarioId: voce?.id || null,
                        compensoNetto: compenso.compensoNetto,
                        compensoTipo: compenso.tipo,
                        importoRiferimento: importoNetto,
                        dataEsecuzione: visita.dataOra,
                        descrizione: `Compenso visita MDL – ${tipoVisitaLabel}${infoSuffix ? ` | ${infoSuffix}` : ''} [fonte: ${compenso.fonte}]`,
                        stato: statoVisita,
                        tenantId,
                        createdBy,
                    });
                    if (movEntrata) {
                        await prisma.movimentoContabile.update({
                            where: { id: movEntrata.id, deletedAt: null },
                            data: { movimentoCollegatoId: movUscita.id },
                        });
                    }

                    result.movimenti.push(movUscita);
                    logger.info({ id: movUscita.id, visitaId: visita.id }, 'MovimentoContabile USCITA creato per Visita MDL');
                } else {
                    result.warnings.push({
                        type: 'MISSING_COMPENSO',
                        message: `Nessun compenso definito per il medico su questa prestazione. Configura il compenso nel Tariffario Medico o nelle Abilitazioni Medico.`,
                        solutionUrl: `/tariffario-medico`,
                        field: 'compenso',
                    });
                }
            } // end if (!existingUscita)
        } catch (err) {
            logger.error({ error: err.message, visitaId: visita?.id }, 'Errore generaPerVisitaMDL');
        }
        return result;
    },

    // ─── 1b. VISITA CLINICA PRIVATA ─────────────────────────────────────────

    /**
     * Genera ENTRATA + USCITA per una visita clinica privata (non MDL, senza appuntamento).
     * Chiamato su completamento o su rigenera-movimenti per visite walk-in.
     *
     * @param {Object} visita - { id, prestazioneId, pazienteId, medicoId, dataOra, appuntamentoId, tipoVisitaMDL }
     * @param {string} tenantId
     * @param {string} createdBy
     * @returns {Promise<GenerationResult>}
     */
    async generaPerVisita(visita, tenantId, createdBy) {
        /** @type {GenerationResult} */
        const result = { movimenti: [], warnings: [] };
        try {
            // Solo visite private (tipoVisitaMDL assente) e senza appuntamento
            if (visita.tipoVisitaMDL) return result;
            if (!visita.pazienteId) return result;

            // Idempotenza
            const existingEntrata = await esisteMovimento({ visitaId: visita.id, direzione: 'ENTRATA', tipo: 'VISITA_MEDICA', tenantId });
            const existingUscita = await esisteMovimento({ visitaId: visita.id, direzione: 'USCITA', tipo: 'VISITA_MEDICA', tenantId });
            if (existingEntrata && existingUscita) {
                result.movimenti.push(existingEntrata, existingUscita);
                return result;
            }

            // Ottieni prestazione per prezzo e IVA
            let importoNettoEntrata = 0;
            let aliquotaIva = 0; // Prestazioni sanitarie esenti IVA (Art. 10 n.18 DPR 633/72)
            let prestNome = 'Visita medica';

            if (visita.prestazioneId) {
                const prest = await prisma.prestazione.findFirst({
                    where: { id: visita.prestazioneId, tenantId, deletedAt: null },
                    select: { prezzoBase: true, prezzoPrimaVisita: true, prezzoControllo: true, nome: true, ivaAliquota: true },
                });
                if (prest) {
                    prestNome = prest.nome || 'Visita medica';
                    const prezzoChoice = visita.isPrimaVisita
                        ? (prest.prezzoPrimaVisita ? parseFloat(prest.prezzoPrimaVisita) : null)
                        : null;
                    importoNettoEntrata = prezzoChoice
                        ?? (prest.prezzoBase ? parseFloat(prest.prezzoBase) : 0);
                    aliquotaIva = prest.ivaAliquota ? parseFloat(prest.ivaAliquota) : 0;
                }
            }

            if (!importoNettoEntrata) {
                result.warnings.push({
                    type: 'MISSING_PREZZO',
                    message: `Nessun prezzo disponibile per la prestazione "${prestNome}". Movimento creato con importo €0. Aggiorna il prezzo base della prestazione.`,
                    solutionUrl: `/prestazioni`,
                    field: 'importoNetto',
                });
            }

            const { importoNetto, importoIva, importoLordo } = calcolaImporti(importoNettoEntrata, aliquotaIva);
            const { nomePaziente } = await getInfoPersonaAzienda(visita.pazienteId, null, tenantId)
                .catch(() => ({ nomePaziente: null }));

            const statoVisita = 'DA_FATTURARE';

            let movEntrata = existingEntrata || null;
            if (!existingEntrata) {
                movEntrata = await prisma.movimentoContabile.create({
                    data: {
                        direzione: 'ENTRATA',
                        tipo: 'VISITA_MEDICA',
                        stato: statoVisita,
                        tipoSoggetto: 'PAZIENTE',
                        personId: visita.pazienteId,
                        visitaId: visita.id,
                        appuntamentoId: visita.appuntamentoId || null,
                        importoNetto,
                        importoIva,
                        importoLordo,
                        aliquotaIva,
                        dataEsecuzione: visita.dataOra,
                        descrizione: `${prestNome}${nomePaziente ? ` – ${nomePaziente}` : ''}`,
                        branchType: 'MEDICA',
                        tenantId,
                        createdBy,
                    },
                });
                result.movimenti.push(movEntrata);
                logger.info({ id: movEntrata.id, visitaId: visita.id }, 'MovimentoContabile ENTRATA creato per Visita clinica privata');
            }

            // USCITA — compenso medico
            if (!existingUscita && visita.medicoId) {
                const compenso = await getCompensoProfessionista(null, visita.medicoId, visita.prestazioneId, importoNetto, tenantId);
                if (compenso) {
                    const movUscita = await creaMovimentoUscita({
                        tipo: 'VISITA_MEDICA',
                        tipoSoggetto: 'MEDICO',
                        personId: visita.medicoId,
                        visitaId: visita.id,
                        appuntamentoId: visita.appuntamentoId || null,
                        compensoNetto: compenso.compensoNetto,
                        compensoTipo: compenso.tipo,
                        importoRiferimento: importoNetto,
                        dataEsecuzione: visita.dataOra,
                        descrizione: `Compenso visita – ${prestNome}${nomePaziente ? ` | ${nomePaziente}` : ''} [${compenso.fonte}]`,
                        stato: statoVisita,
                        tenantId,
                        createdBy,
                    });
                    if (movEntrata) {
                        await prisma.movimentoContabile.update({
                            where: { id: movEntrata.id, deletedAt: null },
                            data: { movimentoCollegatoId: movUscita.id },
                        });
                    }
                    result.movimenti.push(movUscita);
                    logger.info({ id: movUscita.id, visitaId: visita.id }, 'MovimentoContabile USCITA creato per Visita clinica privata');
                } else {
                    result.warnings.push({
                        type: 'MISSING_COMPENSO',
                        message: `Nessun compenso definito per il medico su questa prestazione. Configura il compenso nel Tariffario Medico o nelle Abilitazioni Medico.`,
                        solutionUrl: `/tariffario-medico`,
                        field: 'compenso',
                    });
                }
            }
        } catch (err) {
            logger.error({ error: err.message, visitaId: visita?.id }, 'Errore generaPerVisita');
        }
        return result;
    },

    /**
     * Aggiorna i movimenti contabili di una visita clinica privata dopo modifiche.
     * - Q9: Se esiste un movimento già collegato a una fattura (fatturaElettronicaId),
     *   NON modifica nulla (preserva stato FATTURATO).
     * - Altrimenti: annulla BOZZA + DA_FATTURARE senza fattura e rigenera.
     *
     * @param {Object} visita
     * @param {string} tenantId
     * @param {string} updatedBy
     * @returns {Promise<GenerationResult>}
     */
    async aggiornaPerVisita(visita, tenantId, updatedBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            // Solo visite private
            if (visita.tipoVisitaMDL) return result;

            // Q9: Preserva movimenti già collegati a una fattura (non toccare FATTURATO)
            const movimentoFatturato = await prisma.movimentoContabile.findFirst({
                where: {
                    visitaId: visita.id,
                    tenantId,
                    deletedAt: null,
                    fatturaElettronicaId: { not: null },
                },
                select: { id: true },
            });

            if (movimentoFatturato) {
                logger.info({ visitaId: visita.id }, 'aggiornaPerVisita: movimenti già fatturati, skip rigenerazione');
                return result;
            }

            // Annulla movimenti BOZZA + DA_FATTURARE senza fattura per questa visita
            await prisma.movimentoContabile.updateMany({
                where: {
                    visitaId: visita.id,
                    tenantId,
                    deletedAt: null,
                    stato: { in: ['BOZZA', 'DA_FATTURARE'] },
                    fatturaElettronicaId: null,
                },
                data: {
                    stato: 'ANNULLATO',
                    deletedAt: new Date(),
                    updatedBy: updatedBy || null,
                    note: 'Annullato automaticamente per aggiornamento dati visita',
                },
            });

            if (visita.stato === 'COMPLETATA') {
                const generated = await this.generaPerVisita(visita, tenantId, updatedBy);
                result.movimenti.push(...generated.movimenti);
                result.warnings.push(...generated.warnings);
            }
        } catch (err) {
            logger.error({ error: err.message, visitaId: visita?.id }, 'Errore aggiornaPerVisita');
        }
        return result;
    },

    // ─── 2. SOPRALLUOGO ─────────────────────────────────────────────────────

    /**
     * Genera ENTRATA + USCITA per un sopralluogo eseguito.
     * Stato PROGRAMMATO → skippato.
     *
     * @param {Object} sopralluogo
     * @param {string} tenantId
     * @param {string} createdBy
     * @returns {Promise<GenerationResult>}
     */
    async generaPerSopralluogo(sopralluogo, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            // PROGRAMMATO → BOZZA (attività non ancora eseguita)
            // Qualsiasi altro esito → DA_FATTURARE (attività eseguita, da fatturare)
            const esitoStato = (sopralluogo.esito || '').split('|')[0];
            const statoProgrammato = !esitoStato || esitoStato === 'PROGRAMMATO';
            const stato = statoProgrammato ? 'BOZZA' : 'DA_FATTURARE';

            const existing = await esisteMovimento({ sopralluogoId: sopralluogo.id, direzione: 'ENTRATA', tenantId });
            if (existing) { result.movimenti.push(existing); return result; }

            // Recupera companyTenantProfileId via site
            const site = await prisma.companySite.findFirst({
                where: { id: sopralluogo.siteId, tenantId, deletedAt: null },
                select: { companyTenantProfileId: true },
            });
            if (!site?.companyTenantProfileId) return result;
            const companyTenantProfileId = site.companyTenantProfileId;

            const isRspp = (sopralluogo.valutazione || '').startsWith('RSPP');
            const tipoVoce = isRspp ? 'SOPRALLUOGO_RSPP' : 'SOPRALLUOGO_MC';

            const { voce } = await getVocePerTipo(companyTenantProfileId, tenantId, tipoVoce);

            let prezzoNetto = voce ? parseFloat(voce.prezzoBase) : 0;
            if (!prezzoNetto) {
                result.warnings.push({
                    type: 'MISSING_VOCE',
                    message: `Nessun prezzo per voce "${tipoVoce}" nel tariffario aziendale. Il movimento è stato creato con €0. Aggiorna il tariffario aziendale.`,
                    solutionUrl: `/tariffari-aziendali`,
                    field: 'importoNetto',
                });
            }

            const aliquotaIva = voce ? parseFloat(voce.ivaAliquota) : 22;
            const { importoNetto, importoIva, importoLordo } = calcolaImporti(prezzoNetto, aliquotaIva);

            // ENTRATA
            const movEntrata = await prisma.movimentoContabile.create({
                data: {
                    direzione: 'ENTRATA',
                    tipo: tipoVoce,
                    stato,
                    tipoSoggetto: 'AZIENDA',
                    companyTenantProfileId,
                    sopralluogoId: sopralluogo.id,
                    siteId: sopralluogo.siteId || null,
                    voceTariffarioId: voce?.id || null,
                    importoNetto,
                    importoIva,
                    importoLordo,
                    aliquotaIva,
                    dataEsecuzione: sopralluogo.dataEsecuzione,
                    descrizione: `Sopralluogo ${isRspp ? 'RSPP' : 'MC'}${statoProgrammato ? ' (programmato)' : ''} – ${(esitoStato || 'programmato').toLowerCase().replace(/_/g, ' ')}`,
                    branchType: 'MEDICA',
                    tenantId,
                    createdBy,
                },
            });
            result.movimenti.push(movEntrata);

            // USCITA — compenso esecutore
            const esecutoreId = sopralluogo.esecutoreId;
            if (esecutoreId) {
                const compenso = await getCompensoProfessionista(voce, esecutoreId, null, importoNetto, tenantId);
                if (compenso) {
                    const movUscita = await creaMovimentoUscita({
                        tipo: tipoVoce,
                        tipoSoggetto: isRspp ? 'RSPP' : 'MEDICO',
                        personId: esecutoreId,
                        companyTenantProfileId,
                        sopralluogoId: sopralluogo.id,
                        voceTariffarioId: voce?.id || null,
                        compensoNetto: compenso.compensoNetto,
                        compensoTipo: compenso.tipo,
                        importoRiferimento: importoNetto,
                        dataEsecuzione: sopralluogo.dataEsecuzione,
                        descrizione: `Compenso sopralluogo ${isRspp ? 'RSPP' : 'MC'} [${compenso.fonte}]`,
                        stato,
                        tenantId,
                        createdBy,
                    });
                    await prisma.movimentoContabile.update({
                        where: { id: movEntrata.id, deletedAt: null },
                        data: { movimentoCollegatoId: movUscita.id },
                    });
                    result.movimenti.push(movUscita);
                } else {
                    result.warnings.push({
                        type: 'MISSING_COMPENSO',
                        message: `Nessun compenso definito per l'esecutore del sopralluogo. Configura il Tariffario Medico dell'esecutore.`,
                        solutionUrl: `/tariffario-medico`,
                    });
                }
            }

            logger.info({ entrataId: movEntrata.id, sopralluogoId: sopralluogo.id }, 'Movimenti sopralluogo generati');
        } catch (err) {
            logger.error({ error: err.message, sopralluogoId: sopralluogo?.id }, 'Errore generaPerSopralluogo');
        }
        return result;
    },

    // ─── 3. NOMINA RUOLO ────────────────────────────────────────────────────

    /**
     * Genera ENTRATA + USCITA per una nomina MC/RSPP.
     *
     * @param {Object} nomina - Record NominaRuolo
     * @param {string} tenantId
     * @param {string} createdBy
     * @returns {Promise<GenerationResult>}
     */
    async generaPerNomina(nomina, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            const existing = await esisteMovimento({ nominaRuoloId: nomina.id, direzione: 'ENTRATA', tenantId });
            if (existing) { result.movimenti.push(existing); return result; }

            // Recupera nome persona nominata (difensivo: potrebbe non essere inclusa nel record)
            let personNome = '';
            if (nomina.person?.firstName || nomina.person?.lastName) {
                personNome = `${nomina.person.firstName || ''} ${nomina.person.lastName || ''}`.trim();
            } else if (nomina.personId) {
                const p = await prisma.person.findFirst({ where: { id: nomina.personId, deletedAt: null }, select: { firstName: true, lastName: true } });
                personNome = p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : '';
            }

            // Determina companyTenantProfileId (da nomina o da site)
            let companyTenantProfileId = nomina.companyTenantProfileId;
            if (!companyTenantProfileId && nomina.siteId) {
                const site = await prisma.companySite.findFirst({
                    where: { id: nomina.siteId, deletedAt: null },
                    select: { companyTenantProfileId: true },
                });
                companyTenantProfileId = site?.companyTenantProfileId || null;
            }
            if (!companyTenantProfileId) return result;

            const isRspp = ['RSPP', 'ASPP'].includes(nomina.tipoRuolo);
            const tipoVoce = isRspp ? 'NOMINA_RSPP' : 'NOMINA_MC';

            // Dedup annuale: max 1 movimento per anno per company+tipoRuolo+tenantId
            const annoRiferimento = nomina.dataInizio ? new Date(nomina.dataInizio).getFullYear() : new Date().getFullYear();
            const inizioAnno = new Date(annoRiferimento, 0, 1);
            const fineAnno = new Date(annoRiferimento, 11, 31, 23, 59, 59);
            const existingYearly = await prisma.movimentoContabile.findFirst({
                where: {
                    companyTenantProfileId,
                    tipo: tipoVoce,
                    direzione: 'ENTRATA',
                    tenantId,
                    deletedAt: null,
                    stato: { not: 'ANNULLATO' },
                    dataEsecuzione: { gte: inizioAnno, lte: fineAnno },
                },
            });
            if (existingYearly) {
                logger.info({ existingId: existingYearly.id, tipoVoce, anno: annoRiferimento, companyTenantProfileId },
                    'Movimento nomina annuale già presente — skip generazione duplicata');
                result.movimenti.push(existingYearly);
                result.warnings.push({
                    type: 'YEARLY_DEDUP',
                    message: `Esiste già un movimento ${tipoVoce} per quest'anno (${annoRiferimento}). Il nuovo movimento non è stato generato.`,
                });
                return result;
            }

            const { voce } = await getVocePerTipo(companyTenantProfileId, tenantId, tipoVoce);

            let prezzoNetto = voce ? parseFloat(voce.prezzoBase) : 0;
            if (!prezzoNetto) {
                result.warnings.push({
                    type: 'MISSING_VOCE',
                    message: `Nessun prezzo per voce "${tipoVoce}" nel tariffario aziendale. Aggiorna il tariffario aziendale.`,
                    solutionUrl: `/tariffari-aziendali`,
                    field: 'importoNetto',
                });
            }

            const aliquotaIva = voce ? parseFloat(voce.ivaAliquota) : 22;
            const { importoNetto, importoIva, importoLordo } = calcolaImporti(prezzoNetto, aliquotaIva);

            // Nomina → sempre DA_FATTURARE (indipendente dalla data di inizio)
            const statoNomina = 'DA_FATTURARE';

            // ENTRATA
            const movEntrata = await prisma.movimentoContabile.create({
                data: {
                    direzione: 'ENTRATA',
                    tipo: tipoVoce,
                    stato: statoNomina,
                    tipoSoggetto: 'AZIENDA',
                    companyTenantProfileId,
                    nominaRuoloId: nomina.id,
                    voceTariffarioId: voce?.id || null,
                    importoNetto,
                    importoIva,
                    importoLordo,
                    aliquotaIva,
                    dataEsecuzione: nomina.dataInizio,
                    descrizione: personNome
                        ? `Nomina ${nomina.tipoRuolo.replace(/_/g, ' ')} – ${personNome}`
                        : `Nomina ${nomina.tipoRuolo.replace(/_/g, ' ')}`,
                    branchType: 'MEDICA',
                    tenantId,
                    createdBy,
                },
            });
            result.movimenti.push(movEntrata);

            // USCITA — compenso persona nominata / professionista (sempre creata, anche a 0 se tariffario non configurato)
            const compenso = await getCompensoProfessionista(voce, nomina.personId, null, importoNetto, tenantId);
            const tipoSoggetto = isRspp ? 'RSPP' : 'MEDICO';
            const movUscita = await creaMovimentoUscita({
                tipo: tipoVoce,
                tipoSoggetto,
                personId: nomina.personId,
                companyTenantProfileId,
                nominaRuoloId: nomina.id,
                voceTariffarioId: voce?.id || null,
                compensoNetto: compenso?.compensoNetto ?? 0,
                compensoTipo: compenso?.tipo || 'FISSO',
                importoRiferimento: importoNetto,
                dataEsecuzione: nomina.dataInizio,
                descrizione: compenso
                    ? `Compenso nomina ${nomina.tipoRuolo?.replace(/_/g, ' ')}${personNome ? ` – ${personNome}` : ''} [${compenso.fonte}]`
                    : `Compenso nomina ${nomina.tipoRuolo?.replace(/_/g, ' ')}${personNome ? ` – ${personNome}` : ''} [da definire]`,
                stato: statoNomina,
                tenantId,
                createdBy,
            });
            await prisma.movimentoContabile.update({
                where: { id: movEntrata.id, deletedAt: null },
                data: { movimentoCollegatoId: movUscita.id },
            });
            result.movimenti.push(movUscita);
            if (!compenso) {
                result.warnings.push({
                    type: 'MISSING_COMPENSO',
                    message: `Movimento passivo creato a €0 — nessun compenso definito per il professionista nominato. Configura il Tariffario Medico.`,
                    solutionUrl: `/tariffario-medico`,
                });
            }

            logger.info({ entrataId: movEntrata.id, nominaId: nomina.id }, 'Movimenti nomina generati');
        } catch (err) {
            logger.error({ error: err.message, nominaId: nomina?.id }, 'Errore generaPerNomina');
        }
        return result;
    },

    // ─── 4. CONSULENZA MDL ──────────────────────────────────────────────────

    /**
     * Genera ENTRATA + USCITA per una consulenza MDL.
     *
     * @param {Object} consulenza - Record ConsulenzaMDL
     * @param {string} tenantId
     * @param {string} createdBy
     * @returns {Promise<GenerationResult>}
     */
    async generaPerConsulenza(consulenza, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            // Idempotenza: usa consulenzaId FK (il campo descrizione era fragile)
            const existing = await esisteMovimento({ consulenzaId: consulenza.id, direzione: 'ENTRATA', tenantId });
            if (existing) { result.movimenti.push(existing); return result; }

            const { voce } = await getVocePerTipo(consulenza.companyTenantProfileId, tenantId, 'CONSULENZA');

            // Importo: da consulenza (se esplicitato) oppure da tariffario (prezzo orario × durata)
            const durataOre = (consulenza.durataMinuti || 0) / 60;
            let prezzoNetto = consulenza.importo ? parseFloat(consulenza.importo) : 0;
            if (!prezzoNetto && voce) {
                prezzoNetto = parseFloat((parseFloat(voce.prezzoBase) * durataOre).toFixed(2));
            }
            if (!prezzoNetto) {
                result.warnings.push({
                    type: 'MISSING_PREZZO',
                    message: `Nessun importo definito per la consulenza MDL. Il movimento è stato creato con €0. Aggiorna il tariffario aziendale (voce CONSULENZA) oppure specifica l'importo direttamente sulla consulenza.`,
                    solutionUrl: `/tariffari-aziendali`,
                    field: 'importoNetto',
                });
            }

            const aliquotaIva = voce ? parseFloat(voce.ivaAliquota) : 22;
            const { importoNetto, importoIva, importoLordo } = calcolaImporti(prezzoNetto, aliquotaIva);

            // Consulenza viene loggata dopo l'esecuzione → sempre DA_FATTURARE
            const statoConsulenza = 'DA_FATTURARE';

            // ENTRATA
            const movEntrata = await prisma.movimentoContabile.create({
                data: {
                    direzione: 'ENTRATA',
                    tipo: 'CONSULENZA',
                    stato: statoConsulenza,
                    tipoSoggetto: 'AZIENDA',
                    consulenzaId: consulenza.id,
                    companyTenantProfileId: consulenza.companyTenantProfileId,
                    siteId: consulenza.siteId || null,
                    voceTariffarioId: voce?.id || null,
                    importoNetto,
                    importoIva,
                    importoLordo,
                    aliquotaIva,
                    dataEsecuzione: consulenza.data,
                    descrizione: `Consulenza MDL – ${consulenza.oggetto} (${consulenza.durataMinuti} min)`,
                    branchType: 'MEDICA',
                    tenantId,
                    createdBy,
                },
            });
            result.movimenti.push(movEntrata);

            // USCITA — compenso professionista
            if (consulenza.professionistaId) {
                const compenso = await getCompensoProfessionista(voce, consulenza.professionistaId, null, importoNetto, tenantId);
                if (compenso) {
                    const movUscita = await creaMovimentoUscita({
                        tipo: 'CONSULENZA',
                        tipoSoggetto: 'MEDICO',
                        personId: consulenza.professionistaId,
                        companyTenantProfileId: consulenza.companyTenantProfileId,
                        consulenzaId: consulenza.id,
                        voceTariffarioId: voce?.id || null,
                        compensoNetto: compenso.compensoNetto,
                        compensoTipo: compenso.tipo,
                        importoRiferimento: importoNetto,
                        dataEsecuzione: consulenza.data,
                        descrizione: `Compenso consulenza MDL [${compenso.fonte}]`,
                        stato: statoConsulenza,
                        tenantId,
                        createdBy,
                    });
                    await prisma.movimentoContabile.update({
                        where: { id: movEntrata.id, deletedAt: null },
                        data: { movimentoCollegatoId: movUscita.id },
                    });
                    result.movimenti.push(movUscita);
                }
            }

            logger.info({ entrataId: movEntrata.id, consulenzaId: consulenza.id }, 'Movimenti consulenza generati');
        } catch (err) {
            logger.error({ error: err.message, consulenzaId: consulenza?.id }, 'Errore generaPerConsulenza');
        }
        return result;
    },

    // ─── 4b. DVR ────────────────────────────────────────────────────────────

    /**
     * Genera ENTRATA (azienda) + USCITA (esecutore) quando un DVR viene creato.
     *
     * Mapping TipoDVR → TipoVoceTariffario / TipoAttivitaMovimento:
     *   NUOVO                          → DVR_NUOVO
     *   AGGIORNAMENTO_CON_MODIFICHE    → DVR_AGGIORNAMENTO_CON_MODIFICHE
     *   AGGIORNAMENTO_SENZA_MODIFICHE  → DVR_AGGIORNAMENTO_SENZA_MODIFICHE
     *
     * @param {Object} dvr   - Record DVR con siteId, tipoDVR, dataEsecuzione, effettuatoDa
     * @param {string} tenantId
     * @param {string} createdBy - personId utente
     * @returns {Promise<GenerationResult>}
     */
    async generaPerDVR(dvr, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            // Recupera companyTenantProfileId via site
            const site = await prisma.companySite.findFirst({
                where: { id: dvr.siteId, tenantId, deletedAt: null },
                select: { companyTenantProfileId: true },
            });
            if (!site?.companyTenantProfileId) return result;
            const companyTenantProfileId = site.companyTenantProfileId;

            // Mappa TipoDVR → tipo voce tariffario
            const tipoDvrMap = {
                'NUOVO': 'DVR_NUOVO',
                'AGGIORNAMENTO_CON_MODIFICHE': 'DVR_AGGIORNAMENTO_CON_MODIFICHE',
                'AGGIORNAMENTO_SENZA_MODIFICHE': 'DVR_AGGIORNAMENTO_SENZA_MODIFICHE',
            };
            const tipoVoce = tipoDvrMap[dvr.tipoDVR] || 'DVR_NUOVO';

            const { voce } = await getVocePerTipo(companyTenantProfileId, tenantId, tipoVoce);

            let prezzoNetto = voce ? parseFloat(voce.prezzoBase) : 0;
            if (!prezzoNetto) {
                result.warnings.push({
                    type: 'MISSING_VOCE',
                    message: `Nessun prezzo per voce "${tipoVoce}" nel tariffario aziendale. Il movimento è stato creato con €0. Aggiorna il tariffario aziendale.`,
                    solutionUrl: `/tariffari-aziendali`,
                    field: 'importoNetto',
                });
            }

            const aliquotaIva = voce ? parseFloat(voce.ivaAliquota) : 22;
            const { importoNetto, importoIva, importoLordo } = calcolaImporti(prezzoNetto, aliquotaIva);

            const stato = _statoPerData(dvr.dataEsecuzione);

            const tipoDvrLabels = {
                'DVR_NUOVO': 'Nuovo',
                'DVR_AGGIORNAMENTO_CON_MODIFICHE': 'Aggiornamento con modifiche',
                'DVR_AGGIORNAMENTO_SENZA_MODIFICHE': 'Aggiornamento senza modifiche',
            };

            // ENTRATA — idempotente: se già esiste non la ricrea
            let movEntrata = await esisteMovimento({ dvrId: dvr.id, direzione: 'ENTRATA', tenantId });
            if (!movEntrata) {
                movEntrata = await prisma.movimentoContabile.create({
                    data: {
                        direzione: 'ENTRATA',
                        tipo: tipoVoce,
                        stato,
                        tipoSoggetto: 'AZIENDA',
                        companyTenantProfileId,
                        dvrId: dvr.id,
                        siteId: dvr.siteId || null,
                        voceTariffarioId: voce?.id || null,
                        importoNetto,
                        importoIva,
                        importoLordo,
                        aliquotaIva,
                        dataEsecuzione: dvr.dataEsecuzione,
                        descrizione: `DVR ${tipoDvrLabels[tipoVoce] || tipoVoce} – ${dvr.effettuatoDa || 'N/A'}`,
                        branchType: 'MEDICA',
                        tenantId,
                        createdBy,
                    },
                });
            }
            result.movimenti.push(movEntrata);

            // USCITA — idempotente: se già esiste non la ricrea
            const existingUscita = await esisteMovimento({ dvrId: dvr.id, direzione: 'USCITA', tenantId });
            if (existingUscita) {
                result.movimenti.push(existingUscita);
                return result;
            }

            // USCITA — compenso esecutore DVR
            // Priorità: 1) firmaRsppId (RSPP che ha firmato)
            //           2) RSPP nominato per il sito
            //           3) Ricerca per nome da effettuatoDa (fallback)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            let esecutoreId = dvr.firmaRsppId || null;
            if (!esecutoreId && dvr.siteId) {
                const nominaRspp = await prisma.nominaRuolo.findFirst({
                    where: { siteId: dvr.siteId, tenantId, tipoRuolo: 'RSPP', stato: 'ATTIVA', deletedAt: null },
                    select: { personId: true },
                    orderBy: { dataInizio: 'desc' },
                });
                esecutoreId = nominaRspp?.personId || null;
            }
            // Fallback 3: cerca persona per nome da effettuatoDa (es. "Dott. Chiodega Gabriel")
            if (!esecutoreId && dvr.effettuatoDa) {
                const nomeClean = dvr.effettuatoDa.replace(/^(Dott\.?\s*ssa|Dott\.|Dr\.?)\s+/i, '').trim();
                const parts = nomeClean.split(/\s+/).filter(Boolean);
                if (parts.length >= 2) {
                    // Person è entità globale (P48) — scoping via tenantProfiles
                    const matchedPersons = await prisma.person.findMany({
                        where: {
                            deletedAt: null,
                            tenantProfiles: { some: { tenantId, deletedAt: null, isActive: true } },
                            OR: [
                                { firstName: { contains: parts[parts.length - 1], mode: 'insensitive' }, lastName: { contains: parts[0], mode: 'insensitive' } },
                                { firstName: { contains: parts[0], mode: 'insensitive' }, lastName: { contains: parts[parts.length - 1], mode: 'insensitive' } },
                            ],
                        },
                        select: { id: true },
                        take: 2,
                    });
                    if (matchedPersons.length === 1) {
                        esecutoreId = matchedPersons[0].id;
                        logger.info({ dvrId: dvr.id, effettuatoDa: dvr.effettuatoDa, personId: esecutoreId }, 'Esecutore DVR trovato per nome (fallback 3)');
                    } else if (matchedPersons.length > 1) {
                        logger.warn({ dvrId: dvr.id, effettuatoDa: dvr.effettuatoDa, matchCount: matchedPersons.length }, 'Fallback 3: match ambiguo per nome, USCITA non generata');
                    }
                }
            }
            if (esecutoreId && uuidRegex.test(esecutoreId)) {
                const compenso = await getCompensoProfessionista(voce, esecutoreId, null, importoNetto, tenantId);
                if (compenso) {
                    const movUscita = await creaMovimentoUscita({
                        tipo: tipoVoce,
                        tipoSoggetto: 'RSPP',
                        personId: esecutoreId,
                        companyTenantProfileId,
                        dvrId: dvr.id,
                        voceTariffarioId: voce?.id || null,
                        compensoNetto: compenso.compensoNetto,
                        compensoTipo: compenso.tipo,
                        importoRiferimento: importoNetto,
                        dataEsecuzione: dvr.dataEsecuzione,
                        descrizione: `Compenso DVR ${tipoDvrLabels[tipoVoce] || tipoVoce} [${compenso.fonte}]`,
                        stato,
                        tenantId,
                        createdBy,
                    });
                    await prisma.movimentoContabile.update({
                        where: { id: movEntrata.id, deletedAt: null },
                        data: { movimentoCollegatoId: movUscita.id },
                    });
                    result.movimenti.push(movUscita);
                } else {
                    result.warnings.push({
                        type: 'MISSING_COMPENSO',
                        message: `Nessun compenso definito per l'esecutore del DVR. Configura il Tariffario Medico dell'esecutore.`,
                        solutionUrl: `/tariffario-medico`,
                    });
                }
            }

            logger.info({ entrataId: movEntrata.id, dvrId: dvr.id, tipo: tipoVoce }, 'Movimenti DVR generati');
        } catch (err) {
            logger.error({ error: err.message, dvrId: dvr?.id }, 'Errore generaPerDVR');
        }
        return result;
    },

    // ─── 5. VOCI PERIODICHE ─────────────────────────────────────────────────

    /**
     * Genera ENTRATA per le voci periodiche (spese fisse/ricorrenti) maturate
     * dall'inizio dell'associazione al tariffario e non ancora create.
     * Calcola il moltiplicatore in base a unitaCalcolo (FLAT, PER_DIPENDENTE, PER_SEDE).
     *
     * @param {string} companyTenantProfileId
     * @param {string} tenantId
     * @param {string} createdBy
     * @returns {Promise<GenerationResult>}
     */
    async generaPeriodiciFissi(companyTenantProfileId, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            const assoc = await getTariffario(companyTenantProfileId, tenantId);
            if (!assoc) {
                result.warnings.push({
                    type: 'MISSING_TARIFFARIO',
                    message: `Nessun tariffario aziendale attivo per questa azienda. Associa un tariffario per gestire spese periodiche.`,
                    solutionUrl: `/tariffari-aziendali`,
                });
                return result;
            }

            // Includi anche UNA_TANTUM: spese da fatturare una volta alla data di attivazione
            const FREQUENZE_PERIODICHE = ['UNA_TANTUM', 'MENSILE', 'TRIMESTRALE', 'SEMESTRALE', 'ANNUALE'];
            const voci = (assoc.tariffario?.voci || []).filter(v =>
                ['SPESA_FISSA', 'SPESA_RICORRENTE'].includes(v.tipo) &&
                FREQUENZE_PERIODICHE.includes(v.frequenza)
            );

            if (voci.length === 0) {
                return result; // Nessuna voce periodica configurata
            }

            // Cerca la data di nomina MC attiva: è l'ancora per il ciclo di fatturazione
            const nominaMC = await prisma.nominaRuolo.findFirst({
                where: {
                    companyTenantProfileId,
                    tenantId,
                    tipoRuolo: 'MEDICO_COMPETENTE',
                    stato: 'ATTIVA',
                    deletedAt: null,
                },
                orderBy: { dataInizio: 'asc' },
                select: { dataInizio: true },
            });

            // Ancora di billing: nomina MC > validoDa associazione
            const anchorDate = nominaMC?.dataInizio ?? assoc.validoDa;

            // Conta dipendenti e sedi per moltiplicatore
            const [nDipendenti, nSedi] = await Promise.all([
                prisma.personTenantProfile.count({
                    where: { companyTenantProfileId, tenantId, deletedAt: null },
                }),
                prisma.companySite.count({
                    where: { companyTenantProfileId, tenantId, deletedAt: null },
                }),
            ]);

            for (const voce of voci) {
                const scadenze = calcolaScadenzeElapsed(anchorDate, voce.frequenza);
                for (const scadenza of scadenze) {
                    // Finestra di idempotenza: ±45 giorni per periodicità mensile, ±90 per annuale
                    const mesiMap = { MENSILE: 1, TRIMESTRALE: 3, SEMESTRALE: 6, ANNUALE: 12 };
                    const mesiFinestra = voce.frequenza === 'UNA_TANTUM' ? 1 : (mesiMap[voce.frequenza] ?? 1);
                    const giorniFinestra = Math.floor(mesiFinestra * 30 / 2);
                    const periodoStart = new Date(scadenza);
                    periodoStart.setDate(periodoStart.getDate() - giorniFinestra);
                    const periodoEnd = new Date(scadenza);
                    periodoEnd.setDate(periodoEnd.getDate() + giorniFinestra);

                    const existingP = await prisma.movimentoContabile.findFirst({
                        where: {
                            voceTariffarioId: voce.id,
                            companyTenantProfileId,
                            tenantId,
                            deletedAt: null,
                            dataEsecuzione: { gte: periodoStart, lte: periodoEnd },
                        },
                    });
                    if (existingP) continue;

                    // Moltiplicatore
                    let molt = 1;
                    if (voce.unitaCalcolo === 'PER_DIPENDENTE') molt = Math.max(nDipendenti, 1);
                    else if (voce.unitaCalcolo === 'PER_SEDE') molt = Math.max(nSedi, 1);

                    const prezzoBase = parseFloat(voce.prezzoBase);
                    const aliquotaIva = parseFloat(voce.ivaAliquota || 22);
                    const { importoNetto, importoIva, importoLordo } = calcolaImporti(prezzoBase * molt, aliquotaIva);

                    // Descrizione arricchita con periodo
                    const annoScadenza = scadenza.getFullYear();
                    const meseScadenza = scadenza.toLocaleString('it-IT', { month: 'long' });
                    let periodoLabel = '';
                    if (voce.frequenza === 'UNA_TANTUM') {
                        periodoLabel = `${meseScadenza} ${annoScadenza}`;
                    } else if (voce.frequenza === 'ANNUALE') {
                        periodoLabel = `Anno ${annoScadenza}`;
                    } else {
                        periodoLabel = `${meseScadenza} ${annoScadenza}`;
                    }

                    // AUTOMATICA → DA_FATTURARE (CONFERMATO); SU_CONFERMA → BOZZA
                    const stato = voce.modalitaAttivazione === 'SU_CONFERMA' ? 'BOZZA' : 'CONFERMATO';

                    const mov = await prisma.movimentoContabile.create({
                        data: {
                            direzione: 'ENTRATA',
                            tipo: voce.tipo === 'SPESA_FISSA' ? 'SPESA_FISSA' : 'SPESA_RICORRENTE',
                            stato,
                            tipoSoggetto: 'AZIENDA',
                            companyTenantProfileId,
                            voceTariffarioId: voce.id,
                            importoNetto,
                            importoIva,
                            importoLordo,
                            aliquotaIva,
                            dataEsecuzione: scadenza,
                            descrizione: `${voce.nome || voce.tipo} – ${periodoLabel}${molt > 1 ? ` × ${molt}` : ''}`,
                            note: voce.frequenza === 'UNA_TANTUM'
                                ? 'Spesa una tantum'
                                : `Spesa ${voce.frequenza.toLowerCase()} – ancora: ${new Date(anchorDate).toLocaleDateString('it-IT')}`,
                            branchType: 'MEDICA',
                            tenantId,
                            createdBy,
                        },
                    });
                    result.movimenti.push(mov);
                }
            }

            logger.info({ companyTenantProfileId, creati: result.movimenti.length }, 'Movimenti periodici generati');
        } catch (err) {
            logger.error({ error: err.message, companyTenantProfileId }, 'Errore generaPeriodiciFissi');
        }
        return result;
    },

    // ─── 6. SCAN ORFANI (per generate-movements endpoint) ───────────────────

    /**
     * Scansiona eventi senza MovimentoContabile e li genera.
     * Usato dal POST /api/v1/companies/:id/generate-movements.
     *
     * Ottimizzazioni:
     *  - Pre-carica tariffario una sola volta per evitare N query ripetute
     *  - Processa ogni tipo di attività in parallelo (Promise.allSettled)
     *  - Limite 50 orfani per tipo per evitare timeout su primo avvio
     *
     * @param {string} companyTenantProfileId
     * @param {string} tenantId
     * @param {string} createdBy
     * @returns {Promise<GenerationResult>}
     */
    async generaTutti(companyTenantProfileId, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };

        try {
            // ── Pre-carica il tariffario una volta (riusato da tutti i sotto-generatori) ──
            // Il tariffario è immutabile durante questa operazione → cache sicura
            const assoc = await getTariffario(companyTenantProfileId, tenantId);
            if (!assoc) {
                result.warnings.push({
                    type: 'MISSING_TARIFFARIO',
                    message: 'Nessun tariffario aziendale attivo per questa azienda. Associa un tariffario per gestire la fatturazione automatica.',
                    solutionUrl: '/tariffari-aziendali',
                });
                // Continua comunque con le altre entità
            }

            const LIMIT = 50; // max orfani per tipo per singola chiamata

            // ── 1. Voci periodiche ─────────────────────────────────────────────────────
            const periodici = await this.generaPeriodiciFissi(companyTenantProfileId, tenantId, createdBy);
            result.movimenti.push(...periodici.movimenti);
            result.warnings.push(...periodici.warnings);

            // ── Recupera siti dell'azienda ──────────────────────────────────────────────
            const sites = await prisma.companySite.findMany({
                where: { companyTenantProfileId, tenantId, deletedAt: null },
                select: { id: true },
            });
            const siteIds = sites.map(s => s.id);

            // ── 2. Sopralluogi orfani ──────────────────────────────────────────────────
            if (siteIds.length > 0) {
                const sopralluogiAll = await prisma.sopralluogo.findMany({
                    where: {
                        tenantId,
                        deletedAt: null,
                        siteId: { in: siteIds },
                        esito: { not: null },
                        movimentiContabili: { none: {} },
                    },
                    take: LIMIT * 3,
                });
                // Escludi sopralluogi con esito PROGRAMMATO (split su '|' per match con logica generator)
                const sopralluogiOrfani = sopralluogiAll
                    .filter(s => s.esito && s.esito.split('|')[0] !== 'PROGRAMMATO')
                    .slice(0, LIMIT);

                const sResults = await Promise.allSettled(
                    sopralluogiOrfani.map(s => this.generaPerSopralluogo(s, tenantId, createdBy))
                );
                for (const r of sResults) {
                    if (r.status === 'fulfilled') {
                        result.movimenti.push(...r.value.movimenti);
                        result.warnings.push(...r.value.warnings);
                    }
                }
            }

            // ── 3. Nomine orfane ───────────────────────────────────────────────────────
            const nomineOrfane = await prisma.nominaRuolo.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    companyTenantProfileId,
                    tipoRuolo: { in: ['MEDICO_COMPETENTE', 'RSPP', 'ASPP'] },
                    movimentiContabili: { none: {} },
                },
                take: LIMIT,
            });

            const nResults = await Promise.allSettled(
                nomineOrfane.map(n => this.generaPerNomina(n, tenantId, createdBy))
            );
            for (const r of nResults) {
                if (r.status === 'fulfilled') {
                    result.movimenti.push(...r.value.movimenti);
                    result.warnings.push(...r.value.warnings);
                }
            }

            // ── 4. Consulenze orfane ───────────────────────────────────────────────────
            const consulenzeOrfane = await prisma.consulenzaMDL.findMany({
                where: {
                    companyTenantProfileId,
                    tenantId,
                    deletedAt: null,
                    stato: { notIn: ['ANNULLATA'] },
                },
                take: LIMIT,
                orderBy: { data: 'desc' },
            });

            // Per consulenza non c'è FK diretto → check via contiene l'id in descrizione
            const existingDescriptions = new Set(
                (await prisma.movimentoContabile.findMany({
                    where: { tenantId, deletedAt: null, tipo: 'CONSULENZA', companyTenantProfileId },
                    select: { descrizione: true },
                })).map(m => m.descrizione || '')
            );

            const consulenzeNuove = consulenzeOrfane.filter(
                c => ![...existingDescriptions].some(d => d.includes(c.id))
            );

            const cResults = await Promise.allSettled(
                consulenzeNuove.map(c => this.generaPerConsulenza(c, tenantId, createdBy))
            );
            for (const r of cResults) {
                if (r.status === 'fulfilled') {
                    result.movimenti.push(...r.value.movimenti);
                    result.warnings.push(...r.value.warnings);
                }
            }

            // ── 4b. DVR orfani ────────────────────────────────────────────────────────
            if (siteIds.length > 0) {
                const dvrOrfani = await prisma.dVR.findMany({
                    where: {
                        tenantId,
                        deletedAt: null,
                        siteId: { in: siteIds },
                        movimentiContabili: { none: {} },
                    },
                    take: LIMIT,
                });

                const dResults = await Promise.allSettled(
                    dvrOrfani.map(d => this.generaPerDVR(d, tenantId, createdBy))
                );
                for (const r of dResults) {
                    if (r.status === 'fulfilled') {
                        result.movimenti.push(...r.value.movimenti);
                        result.warnings.push(...r.value.warnings);
                    }
                }
            }

            // ── 5. Visite MDL orfane ──────────────────────────────────────────────────
            //   Prima trova le person che lavorano per questa azienda
            const personIds = await prisma.personTenantProfile.findMany({
                where: { companyTenantProfileId, tenantId, deletedAt: null },
                select: { personId: true },
            }).then(ps => ps.map(p => p.personId));

            if (personIds.length > 0) {
                const visiteOrfane = await prisma.visita.findMany({
                    where: {
                        tenantId,
                        deletedAt: null,
                        stato: 'COMPLETATA',
                        tipoVisitaMDL: { not: null },
                        pazienteId: { in: personIds },
                        movimentiContabili: { none: {} },
                    },
                    take: LIMIT,
                    orderBy: { dataOra: 'desc' },
                });

                const vResults = await Promise.allSettled(
                    visiteOrfane.map(v => this.generaPerVisitaMDL(v, tenantId, createdBy))
                );
                for (const r of vResults) {
                    if (r.status === 'fulfilled') {
                        result.movimenti.push(...r.value.movimenti);
                        result.warnings.push(...r.value.warnings);
                    }
                }
            }

            // De-duplica warning per tipo per non spammare l'utente
            const seenWarningTypes = new Set();
            result.warnings = result.warnings.filter(w => {
                const key = `${w.type}:${w.field || ''}`;
                if (seenWarningTypes.has(key)) return false;
                seenWarningTypes.add(key);
                return true;
            });

        } catch (err) {
            logger.error({ error: err.message, companyTenantProfileId }, 'Errore generaTutti');
        }

        return result;
    },

    // ─── LIFECYCLE: UPDATE / DELETE CASCADE ─────────────────────────────────

    /**
     * Annulla tutti i movimenti contabili legati a una sorgente eliminata.
     *
     * Comportamento per stato:
     *   BOZZA       → soft delete (deletedAt) + ANNULLATO
     *   CONFERMATO  → ANNULLATO
     *   FATTURATO/PAGATO → ANNULLATO + warning in log (le registrazioni finanziarie
     *                      potrebbero necessitare di storno manuale)
     *
     * Gestisce anche il movimento collegato (coppia ENTRATA ↔ USCITA).
     *
     * @param {Object} sourceFilter - Prisma where fragment: { sopralluogoId } | { nominaRuoloId } | ecc.
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<{annullati: number, warnings: GenerationWarning[]}>}
     */
    async annullaMovimentiSorgente(sourceFilter, tenantId, updatedBy) {
        const result = { annullati: 0, warnings: [] };
        try {
            const movimenti = await prisma.movimentoContabile.findMany({
                where: { ...sourceFilter, tenantId, deletedAt: null },
                select: { id: true, stato: true, direzione: true, movimentoCollegatoId: true },
            });
            if (!movimenti.length) return result;

            // Raccoglie tutti gli ID inclusi movimenti collegati (coppia ENTRATA/USCITA)
            const ids = new Set(movimenti.map(m => m.id));
            for (const m of movimenti) {
                if (m.movimentoCollegatoId) ids.add(m.movimentoCollegatoId);
            }

            // Warn per movimenti già fatturati/pagati
            const critici = movimenti.filter(m => ['FATTURATO', 'PAGATO'].includes(m.stato));
            if (critici.length) {
                logger.warn(
                    { ids: critici.map(m => m.id), sourceFilter, tenantId },
                    'Annullamento movimenti già FATTURATO/PAGATO: verificare manualmente le registrazioni contabili'
                );
                result.warnings.push({
                    type: 'MOVEMENT_ALREADY_INVOICED',
                    message: `${critici.length} movimento/i erano già in stato FATTURATO o PAGATO. Verificare manualmente le registrazioni contabili prima di procedere.`,
                });
            }

            const now = new Date();
            await prisma.movimentoContabile.updateMany({
                where: { id: { in: [...ids] }, deletedAt: null },
                data: {
                    stato: 'ANNULLATO',
                    deletedAt: now,
                    updatedBy: updatedBy || null,
                    note: 'Annullato automaticamente per eliminazione evento sorgente',
                },
            });

            result.annullati = ids.size;
            logger.info({ count: ids.size, sourceFilter, tenantId }, 'Movimenti contabili annullati per eliminazione sorgente');
        } catch (err) {
            logger.error({ error: err.message, sourceFilter }, 'Errore annullaMovimentiSorgente');
        }
        return result;
    },

    /**
     * Aggiorna i movimenti BOZZA di un sopralluogo modificato.
     * Invalida i movimenti esistenti in BOZZA e rigenera con i dati aggiornati.
     * Movimenti in stati CONFERMATO/FATTURATO/PAGATO non vengono toccati.
     *
     * @param {Object} sopralluogo - Record aggiornato
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<GenerationResult>}
     */
    async aggiornaPerSopralluogo(sopralluogo, tenantId, updatedBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            const invalidati = await _invalidaMovimentiBozza({ sopralluogoId: sopralluogo.id }, tenantId, updatedBy);
            if (invalidati > 0) {
                logger.info({ sopralluogoId: sopralluogo.id, invalidati, tenantId }, 'Movimenti BOZZA sopralluogo invalidati per rigenerazione');
            }
            const generated = await this.generaPerSopralluogo(sopralluogo, tenantId, updatedBy);
            result.movimenti.push(...generated.movimenti);
            result.warnings.push(...generated.warnings);
        } catch (err) {
            logger.error({ error: err.message, sopralluogoId: sopralluogo?.id }, 'Errore aggiornaPerSopralluogo');
        }
        return result;
    },

    /**
     * Aggiorna i movimenti BOZZA di una nomina modificata.
     *
     * @param {Object} nomina - Record aggiornato
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<GenerationResult>}
     */
    async aggiornaPerNomina(nomina, tenantId, updatedBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            const invalidati = await _invalidaMovimentiBozza({ nominaRuoloId: nomina.id }, tenantId, updatedBy);
            if (invalidati > 0) {
                logger.info({ nominaId: nomina.id, invalidati, tenantId }, 'Movimenti BOZZA nomina invalidati per rigenerazione');
            }
            const generated = await this.generaPerNomina(nomina, tenantId, updatedBy);
            result.movimenti.push(...generated.movimenti);
            result.warnings.push(...generated.warnings);
        } catch (err) {
            logger.error({ error: err.message, nominaId: nomina?.id }, 'Errore aggiornaPerNomina');
        }
        return result;
    },

    /**
     * Aggiorna i movimenti BOZZA di una consulenza MDL modificata.
     *
     * @param {Object} consulenza - Record aggiornato
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<GenerationResult>}
     */
    async aggiornaPerConsulenza(consulenza, tenantId, updatedBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            const invalidati = await _invalidaMovimentiBozza({ consulenzaId: consulenza.id }, tenantId, updatedBy);
            if (invalidati > 0) {
                logger.info({ consulenzaId: consulenza.id, invalidati, tenantId }, 'Movimenti BOZZA consulenza invalidati per rigenerazione');
            }
            const generated = await this.generaPerConsulenza(consulenza, tenantId, updatedBy);
            result.movimenti.push(...generated.movimenti);
            result.warnings.push(...generated.warnings);
        } catch (err) {
            logger.error({ error: err.message, consulenzaId: consulenza?.id }, 'Errore aggiornaPerConsulenza');
        }
        return result;
    },

    /**
     * Aggiorna i movimenti BOZZA di un DVR modificato.
     *
     * @param {Object} dvr - Record aggiornato
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<GenerationResult>}
     */
    async aggiornaPerDVR(dvr, tenantId, updatedBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            const invalidati = await _invalidaMovimentiBozza({ dvrId: dvr.id }, tenantId, updatedBy);
            if (invalidati > 0) {
                logger.info({ dvrId: dvr.id, invalidati, tenantId }, 'Movimenti BOZZA DVR invalidati per rigenerazione');
            }
            const generated = await this.generaPerDVR(dvr, tenantId, updatedBy);
            result.movimenti.push(...generated.movimenti);
            result.warnings.push(...generated.warnings);
        } catch (err) {
            logger.error({ error: err.message, dvrId: dvr?.id }, 'Errore aggiornaPerDVR');
        }
        return result;
    },

    /**
     * Aggiorna i movimenti BOZZA di una visita MDL modificata.
     * Usato quando la prestazione, il medico o la data vengono cambiati.
     *
     * @param {Object} visita - Record aggiornato con pazienteId, medicoId, prestazioneId, tipoVisitaMDL
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<GenerationResult>}
     */
    async aggiornaPerVisitaMDL(visita, tenantId, updatedBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            const invalidati = await _invalidaMovimentiBozza({ visitaId: visita.id }, tenantId, updatedBy);
            if (invalidati > 0) {
                logger.info({ visitaId: visita.id, invalidati, tenantId }, 'Movimenti BOZZA visita invalidati per rigenerazione');
            }
            // P70: invalida solo i BOZZA di prenotazione (appPrestazioneId null) — NON quelli degli accertamenti
            if (visita.appuntamentoId) {
                const invalidatiApp = await _invalidaMovimentiBozza(
                    { appuntamentoId: visita.appuntamentoId, appPrestazioneId: null },
                    tenantId, updatedBy
                );
                if (invalidatiApp > 0) {
                    logger.info({ visitaId: visita.id, appuntamentoId: visita.appuntamentoId, invalidatiApp }, 'Movimenti BOZZA appuntamento MDL invalidati per rigenerazione');
                }
            }
            // Rigenera solo se la visita è completata (stesso comportamento di generaPerVisitaMDL)
            if (visita.stato === 'COMPLETATA' || visita.tipoVisitaMDL) {
                const generated = await this.generaPerVisitaMDL(visita, tenantId, updatedBy);
                result.movimenti.push(...generated.movimenti);
                result.warnings.push(...generated.warnings);
                // P70: genera USCITA mancante per accertamenti (appPrestazioneId set)
                // poi promuove tutti i BOZZA → DA_FATTURARE
                if (visita.appuntamentoId) {
                    const accertamenti = await prisma.appuntamentoPrestazione.findMany({
                        where: { appuntamentoId: visita.appuntamentoId, tenantId, deletedAt: null },
                        include: {
                            appuntamento: {
                                select: { id: true, dataOra: true, medicoId: true, pazienteId: true, companyTenantProfileId: true },
                            },
                            prestazione: {
                                select: { id: true, nome: true, tipo: true, prezzoBase: true, ivaAliquota: true },
                            },
                        },
                    });
                    for (const appPrest of accertamenti) {
                        await this.generaPerAppuntamentoPrestazione(appPrest, tenantId, updatedBy);
                    }
                    await this.finalizzaMovimentiAppuntamento(visita.appuntamentoId, tenantId, updatedBy);
                }
            }
        } catch (err) {
            logger.error({ error: err.message, visitaId: visita?.id }, 'Errore aggiornaPerVisitaMDL');
        }
        return result;
    },

    /**
     * Annulla i movimenti contabili (BOZZA o DA_FATTURARE) collegati a una
     * AppuntamentoPrestazione che viene eliminata dall'utente durante la visita.
     * Movimenti già PAGATO/EMESSO/CONFERMATO non vengono toccati (consolidati).
     *
     * @param {string} appPrestazioneId
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<{annullati: number}>}
     */
    async annullaPerAppuntamentoPrestazione(appPrestazioneId, tenantId, updatedBy) {
        const result = { annullati: 0 };
        try {
            const movimenti = await prisma.movimentoContabile.findMany({
                where: {
                    appPrestazioneId,
                    tenantId,
                    deletedAt: null,
                    stato: { in: ['BOZZA', 'DA_FATTURARE'] },
                },
                select: { id: true },
            });

            if (!movimenti.length) return result;

            const now = new Date();
            for (const mov of movimenti) {
                await prisma.movimentoContabile.update({
                    where: { id: mov.id },
                    data: { stato: 'ANNULLATO', deletedAt: now, updatedBy: updatedBy || null },
                });
                result.annullati++;
            }

            logger.info(
                { appPrestazioneId, annullati: result.annullati },
                'Movimenti contabili annullati per prestazione eliminata'
            );
        } catch (err) {
            logger.error({ error: err.message, appPrestazioneId }, 'Errore annullaPerAppuntamentoPrestazione');
            throw err;
        }
        return result;
    },

    /**
     * Promo movimenti PREVENTIVO → DA_FATTURARE al completamento di un corso.
     * Chiamato quando lo schedule viene completato (hasAttestati = true / status = COMPLETED).
     *
     * Logica:
     *  1. Per ogni preventivo ACCETTATO legato allo schedule → promuove PREVENTIVO → DA_FATTURARE.
     *  2. Per ogni ScheduleCompany senza preventivo accettato → crea direttamente un
     *     movimento DA_FATTURARE usando il tariffario aziendale (voce SPESA_FISSA/PRESTAZIONE del corso).
     *  3. Idempotente: non crea duplicati se il movimento DA_FATTURARE esiste già.
     *
     * @param {Object} schedule - Record CourseSchedule con almeno id, courseId, tenantId, endDate
     * @param {string} tenantId
     * @param {string} [createdBy]
     * @returns {Promise<GenerationResult>}
     */
    async generaPerScheduleCompletato(schedule, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            // Step 1: Promuovi preventivi ACCETTATI → DA_FATTURARE
            const preventiviAccettati = await prisma.preventivo.findMany({
                where: { scheduledCourseId: schedule.id, stato: 'ACCETTATO', tenantId, deletedAt: null },
                select: { id: true, companyTenantProfileId: true },
            });

            for (const prev of preventiviAccettati) {
                const updated = await prisma.movimentoContabile.updateMany({
                    where: {
                        preventivoId: prev.id,
                        tenantId,
                        deletedAt: null,
                        stato: 'PREVENTIVO',
                    },
                    data: { stato: 'DA_FATTURARE', updatedBy: createdBy || null },
                });
                if (updated.count > 0) {
                    logger.info({ preventivoId: prev.id, scheduleId: schedule.id, updated: updated.count }, 'Movimenti preventivo promossi DA_FATTURARE (schedule completato)');
                }
            }
            const prevCompanyIds = new Set(preventiviAccettati.map(p => p.companyTenantProfileId).filter(Boolean));

            // Step 2: CompanySchedule senza preventivo accettato → genera DA_FATTURARE diretto
            const companies = await prisma.scheduleCompany.findMany({
                where: { scheduleId: schedule.id, tenantId, deletedAt: null },
                select: { companyTenantProfileId: true },
            });

            for (const { companyTenantProfileId } of companies) {
                if (prevCompanyIds.has(companyTenantProfileId)) continue; // già gestita via preventivo

                // Idempotenza: esiste già un DA_FATTURARE per questo schedule+company?
                const existing = await prisma.movimentoContabile.findFirst({
                    where: {
                        courseScheduleId: schedule.id,
                        companyTenantProfileId,
                        tenantId,
                        deletedAt: null,
                        stato: 'DA_FATTURARE',
                    },
                    select: { id: true },
                });
                if (existing) { continue; }

                // Tenta di trovare una voce tariffario (PRESTAZIONE/SPESA_FISSA) per il corso
                const { voce } = await getVocePerTipo(companyTenantProfileId, tenantId, 'PRESTAZIONE').catch(() => ({ voce: null }));
                const prezzoNetto = voce ? parseFloat(voce.prezzoBase) : 0;
                const aliquotaIva = voce ? parseFloat(voce.ivaAliquota) : 22;
                const { importoNetto, importoIva, importoLordo } = calcolaImporti(prezzoNetto, aliquotaIva);

                if (!prezzoNetto) {
                    result.warnings.push({
                        type: 'MISSING_VOCE',
                        message: `Nessun prezzo PRESTAZIONE nel tariffario per l'azienda ${companyTenantProfileId}. Movimento a €0.`,
                        solutionUrl: '/tariffari-aziendali',
                        field: 'importoNetto',
                    });
                }

                const mov = await prisma.movimentoContabile.create({
                    data: {
                        direzione: 'ENTRATA',
                        tipo: 'PRESTAZIONE',
                        stato: 'DA_FATTURARE',
                        tipoSoggetto: 'AZIENDA',
                        companyTenantProfileId,
                        courseScheduleId: schedule.id,
                        voceTariffarioId: voce?.id || null,
                        importoNetto,
                        importoIva,
                        importoLordo,
                        aliquotaIva,
                        dataEsecuzione: schedule.endDate || new Date(),
                        descrizione: `Corso completato – schedule #${schedule.id.slice(0, 8)}`,
                        branchType: schedule.branchType || 'FORMAZIONE',
                        tenantId,
                        createdBy,
                    },
                });
                result.movimenti.push(mov);
                logger.info({ movId: mov.id, companyTenantProfileId, scheduleId: schedule.id }, 'Movimento DA_FATTURARE generato per completamento schedule');
            }
        } catch (err) {
            logger.error({ error: err.message, scheduleId: schedule?.id }, 'Errore generaPerScheduleCompletato');
        }
        return result;
    },

    // ─── PREVENTIVO ─────────────────────────────────────────────────────────

    /**
     * Genera il movimento ENTRATA per un preventivo.
     * Stato: PREVENTIVO (non ancora accettato) → DA_FATTURARE (se ACCETTATO).
     * Non genera nulla per stati RIFIUTATO / ANNULLATO / SCADUTO.
     *
     * @param {Object} preventivo - Record preventivo con id, stato, importo/prezzoTotale
     * @param {string} tenantId
     * @param {string} [createdBy]
     * @returns {Promise<GenerationResult>}
     */
    async generaPerPreventivo(preventivo, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            // Non generare per stati negativi
            if (['RIFIUTATO', 'ANNULLATO', 'SCADUTO'].includes(preventivo.stato)) return result;

            // Idempotenza
            const existing = await esisteMovimento({ preventivoId: preventivo.id, direzione: 'ENTRATA', tenantId });
            if (existing) { result.movimenti.push(existing); return result; }

            const importoNetto = parseFloat(preventivo.imponibile ?? preventivo.prezzoTotale ?? preventivo.importo ?? 0);
            const aliquotaIva = parseFloat(preventivo.aliquotaIva ?? 22);
            const { importoIva, importoLordo } = calcolaImporti(importoNetto, aliquotaIva);

            const stato = preventivo.stato === 'ACCETTATO' ? 'DA_FATTURARE' : 'PREVENTIVO';

            const movEntrata = await prisma.movimentoContabile.create({
                data: {
                    direzione: 'ENTRATA',
                    tipo: 'SPESA_FISSA',
                    stato,
                    tipoSoggetto: preventivo.companyTenantProfileId ? 'AZIENDA' : 'PAZIENTE',
                    companyTenantProfileId: preventivo.companyTenantProfileId || null,
                    personId: preventivo.personaId || null,
                    preventivoId: preventivo.id,
                    importoNetto,
                    importoIva,
                    importoLordo,
                    aliquotaIva,
                    dataEsecuzione: preventivo.dataEmissione || preventivo.createdAt,
                    descrizione: `Preventivo #${preventivo.numero ?? preventivo.id.slice(0, 8)} – ${preventivo.titoloServizio ?? preventivo.oggetto ?? ''}`.trim(),
                    branchType: 'MEDICA',
                    tenantId,
                    createdBy,
                },
            });
            result.movimenti.push(movEntrata);

            logger.info({ entrataId: movEntrata.id, preventivoId: preventivo.id, stato }, 'Movimento preventivo generato');
        } catch (err) {
            logger.error({ error: err.message, preventivoId: preventivo?.id }, 'Errore generaPerPreventivo');
        }
        return result;
    },

    // ─── COMPENSO FORMATORE ─────────────────────────────────────────────────

    /**
     * Genera movimento USCITA per il compenso formatore alla generazione di una
     * Lettera di Incarico. Il compenso (totalCompensation) è calcolato dalla route
     * come: (hourlyRate * totalHours) + expenses.
     *
     * Idempotente: una sola USCITA COMPENSO_FORMATORE per (courseScheduleId + trainerId).
     * Se la lettera viene rigenerata con un compenso diverso, il movimento viene aggiornato.
     *
     * @param {string} scheduleId       - ID del CourseSchedule (ScheduledCourse)
     * @param {string} trainerId        - ID Person del formatore
     * @param {number} totalCompensation - Importo netto da corrispondere al formatore
     * @param {string} tenantId
     * @param {string} [createdBy]
     * @returns {Promise<GenerationResult>}
     */
    async generaPerLetteraIncarico(scheduleId, trainerId, totalCompensation, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            if (!totalCompensation || totalCompensation <= 0) {
                result.warnings.push({
                    type: 'MISSING_PREZZO',
                    message: 'Compenso formatore pari a €0: nessun movimento USCITA generato.',
                    field: 'totalCompensation',
                });
                return result;
            }

            const { importoNetto, importoIva, importoLordo } = calcolaImporti(totalCompensation, 0); // Formatori: no IVA di default

            // Idempotenza: esiste già USCITA COMPENSO_FORMATORE per questo schedule+formatore?
            const existing = await prisma.movimentoContabile.findFirst({
                where: {
                    courseScheduleId: scheduleId,
                    personId: trainerId,
                    tipo: 'COMPENSO_FORMATORE',
                    direzione: 'USCITA',
                    tenantId,
                    deletedAt: null,
                },
                select: { id: true, importoNetto: true },
            });

            if (existing) {
                // Aggiorna solo se il compenso è cambiato (nuova generazione lettera)
                if (Math.abs(parseFloat(existing.importoNetto) - importoNetto) < 0.01) {
                    result.movimenti.push(existing);
                    return result;
                }
                const updated = await prisma.movimentoContabile.update({
                    where: { id: existing.id, deletedAt: null },
                    data: { importoNetto, importoIva, importoLordo, updatedBy: createdBy || null },
                });
                result.movimenti.push(updated);
                logger.info({ id: updated.id, scheduleId, trainerId, totalCompensation }, 'Movimento COMPENSO_FORMATORE aggiornato');
                return result;
            }

            // Recupera info schedule per descrizione
            const schedule = await prisma.scheduledCourse.findFirst({
                where: { id: scheduleId, tenantId, deletedAt: null },
                select: { startDate: true, endDate: true, course: { select: { title: true } } },
            }).catch(() => null);

            const dataEsecuzione = schedule?.endDate || schedule?.startDate || new Date();
            const courseTitle = schedule?.course?.title || scheduleId.slice(0, 8);
            const stato = _statoPerData(dataEsecuzione);

            const movUscita = await prisma.movimentoContabile.create({
                data: {
                    direzione: 'USCITA',
                    tipo: 'COMPENSO_FORMATORE',
                    stato,
                    tipoSoggetto: 'FORMATORE',
                    personId: trainerId,
                    courseScheduleId: scheduleId,
                    importoNetto,
                    importoIva,
                    importoLordo,
                    aliquotaIva: 0, // Formatori: ritenuta d'acconto, no IVA
                    dataEsecuzione,
                    descrizione: `Compenso formatore – ${courseTitle}`,
                    branchType: 'FORMAZIONE',
                    tenantId,
                    createdBy,
                },
            });
            result.movimenti.push(movUscita);
            logger.info({ id: movUscita.id, scheduleId, trainerId, totalCompensation, stato }, 'Movimento USCITA COMPENSO_FORMATORE creato');
        } catch (err) {
            logger.error({ error: err.message, scheduleId, trainerId }, 'Errore generaPerLetteraIncarico');
        }
        return result;
    },

    // ─── PRESTAZIONE MEDICA (NON-MDL) ───────────────────────────────────────

    /**
     * Genera ENTRATA (paziente/azienda) + USCITA (medico refertante) per una
     * prestazione clinica NON legata alla Medicina del Lavoro.
     *
     * Viene chiamata quando un AppuntamentoPrestazione raggiunge stato REFERTATA/COMPLETATA.
     * Salta automaticamente le prestazioni di tipo VISITA_MEDICINA_LAVORO (gestite da generaPerVisitaMDL).
     *
     * Idempotente: controlla appPrestazioneId + direzione=ENTRATA prima di creare.
     *
     * @param {Object} appPrestazione - AppuntamentoPrestazione con relazioni preloaded:
     *   appuntamento (con pazienteId, medicoId, dataOra, companyTenantProfileId),
     *   prestazione (con tipo, prezzoBase, nome)
     * @param {string} tenantId
     * @param {string} [createdBy]
     * @returns {Promise<GenerationResult>}
     */
    async generaPerAppuntamentoPrestazione(appPrestazione, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            const { appuntamento, prestazione } = appPrestazione;

            // Salta MDL — gestita da generaPerVisitaMDL
            if (prestazione?.tipo === 'VISITA_MEDICINA_LAVORO') return result;

            // Idempotenza — controlla separatamente ENTRATA e USCITA:
            // se ENTRATA esiste ma USCITA manca (es. movimenti pre-P70), crea solo l'USCITA
            const existingEntrata = await esisteMovimento({ appPrestazioneId: appPrestazione.id, direzione: 'ENTRATA', tenantId });
            const existingUscita = await esisteMovimento({ appPrestazioneId: appPrestazione.id, direzione: 'USCITA', tenantId });
            if (existingEntrata && existingUscita) {
                result.movimenti.push(existingEntrata, existingUscita);
                await syncBozzaFatturaAppuntamento(appPrestazione.appuntamentoId, tenantId).catch(err =>
                    logger.warn({ error: err.message, appPrestazioneId: appPrestazione.id }, 'Sync bozza fattura appuntamento fallita')
                );
                return result;
            }
            const soloUscita = Boolean(existingEntrata && !existingUscita);
            if (soloUscita) {
                result.movimenti.push(existingEntrata);
            }

            // --- Prezzo ENTRATA ---
            // Il tariffario aziendale si usa solo per appuntamenti MDL. Lo stesso
            // paziente può essere anche un privato: in quel caso resta il prezzo base.
            const companyId = appuntamento?.companyTenantProfileId
                || await getCompanyDipendente(appuntamento?.pazienteId, tenantId).catch(() => null);
            const isMDLAppuntamento = !!(appuntamento?.tipoVisitaMDL);

            let importoNettoEntrata = 0;
            let voceTariffario = null;
            let prezzoFonte = 'NESSUNO';

            if (companyId && isMDLAppuntamento) {
                const { voce } = await getVocePerPrestazione(companyId, tenantId, appPrestazione.prestazioneId).catch(() => ({ voce: null }));
                if (voce && parseFloat(voce.prezzoBase) > 0) {
                    importoNettoEntrata = parseFloat(voce.prezzoBase);
                    voceTariffario = voce;
                    prezzoFonte = 'VOCE_TARIFFARIO';
                }
            }

            if (!importoNettoEntrata && prestazione?.prezzoBase) {
                importoNettoEntrata = parseFloat(prestazione.prezzoBase);
                prezzoFonte = 'PRESTAZIONE_STANDARD';
                if (isMDLAppuntamento) {
                    result.warnings.push({
                        type: 'MISSING_VOCE',
                        message: `Nessuna voce tariffario per "${prestazione.nome}". Usato prezzo base €${importoNettoEntrata}. Configura il tariffario aziendale per un valore accurato.`,
                        solutionUrl: '/tariffari-aziendali',
                        field: 'importoNetto',
                    });
                }
            }

            if (!importoNettoEntrata) {
                result.warnings.push({
                    type: 'MISSING_PREZZO',
                    message: `Nessun prezzo disponibile per la prestazione "${prestazione?.nome}". Movimento creato con importo €0.`,
                    solutionUrl: '/tariffari-aziendali',
                    field: 'importoNetto',
                });
            }

            // Prestazioni sanitarie cliniche: esenti IVA di default (Art. 10 n.18 DPR 633/72)
            const aliquotaIva = voceTariffario ? parseFloat(voceTariffario.ivaAliquota) : 0;
            // Quando soloUscita=true (ENTRATA pre-esistente), usa il suo importoNetto come base compenso
            const importoNettoEffettivo = soloUscita
                ? Number(existingEntrata.importoNetto)
                : importoNettoEntrata;
            const { importoNetto, importoIva, importoLordo } = calcolaImporti(importoNettoEffettivo, aliquotaIva);
            const dataEsecuzione = appPrestazione.dataEsecuzione || appuntamento?.dataOra || new Date();

            // Arricchisce descrizione con nome paziente + azienda (come generaPerVisitaMDL)
            const { nomePaziente, nomeAzienda } = await getInfoPersonaAzienda(
                appuntamento?.pazienteId || null, companyId || null, tenantId
            ).catch(() => ({ nomePaziente: null, nomeAzienda: null }));
            const infoSuffix = [nomePaziente, nomeAzienda].filter(Boolean).join(' | ');

            // ENTRATA — verso paziente o azienda pagante
            // P70: BOZZA durante la visita, DA_FATTURARE al completamento via finalizzaMovimentiAppuntamento
            // Skippata se ENTRATA pre-esistente (soloUscita=true)
            let movEntrata = existingEntrata || null;
            if (!soloUscita) {
                // Solo per appuntamenti MDL le prestazioni aggiunte sono a carico azienda.
                // Le visite private di un dipendente restano a carico paziente.
                const tipoSoggettoEntrata = (companyId && isMDLAppuntamento) ? 'AZIENDA' : 'PAZIENTE';
                movEntrata = await prisma.movimentoContabile.create({
                    data: {
                        direzione: 'ENTRATA',
                        tipo: 'PRESTAZIONE_CLINICA',
                        stato: 'BOZZA',
                        tipoSoggetto: tipoSoggettoEntrata,
                        personId: tipoSoggettoEntrata === 'PAZIENTE' ? (appuntamento?.pazienteId || null) : null,
                        companyTenantProfileId: tipoSoggettoEntrata === 'AZIENDA' ? (companyId || null) : null,
                        appuntamentoId: appPrestazione.appuntamentoId,
                        appPrestazioneId: appPrestazione.id,
                        voceTariffarioId: voceTariffario?.id || null,
                        importoNetto,
                        importoIva,
                        importoLordo,
                        aliquotaIva,
                        dataEsecuzione,
                        descrizione: `${prestazione?.nome || 'Prestazione clinica'}${infoSuffix ? ` | ${infoSuffix}` : ''} [fonte: ${prezzoFonte}]`,
                        branchType: 'MEDICA',
                        tenantId,
                        createdBy,
                    },
                });
                result.movimenti.push(movEntrata);
                logger.info({ id: movEntrata.id, appPrestazioneId: appPrestazione.id }, 'ENTRATA creata per AppuntamentoPrestazione');
            }

            // USCITA — compenso medico refertante
            const medicoId = appPrestazione.medicoRefertanteId || appuntamento?.medicoId;
            if (medicoId) {
                let compensoNetto = 0;
                let compensoTipo = null;

                // Livello 0: compensoMedicoCalcolato (già calcolato su AppuntamentoPrestazione)
                if (appPrestazione.compensoMedicoCalcolato && parseFloat(appPrestazione.compensoMedicoCalcolato) > 0) {
                    compensoNetto = parseFloat(appPrestazione.compensoMedicoCalcolato);
                    compensoTipo = 'FISSO';
                } else {
                    // Fallback: TariffarioMedico / MedicoAbilitato
                    const compenso = await getCompensoProfessionista(
                        voceTariffario, medicoId, appPrestazione.prestazioneId, importoNetto, tenantId
                    );
                    if (compenso) {
                        compensoNetto = compenso.compensoNetto;
                        compensoTipo = compenso.tipo;
                    }
                }

                if (compensoNetto > 0) {
                    const movUscita = await creaMovimentoUscita({
                        tipo: 'PRESTAZIONE_CLINICA',
                        tipoSoggetto: 'MEDICO',
                        personId: medicoId,
                        companyTenantProfileId: companyId || null,
                        appuntamentoId: appPrestazione.appuntamentoId,
                        appPrestazioneId: appPrestazione.id,
                        voceTariffarioId: voceTariffario?.id || null,
                        compensoNetto,
                        compensoTipo,
                        importoRiferimento: importoNetto,
                        dataEsecuzione,
                        descrizione: `Compenso medico – ${prestazione?.nome || 'Prestazione clinica'}${nomePaziente ? ` | ${nomePaziente}` : ''}`,
                        stato: 'BOZZA',
                        tenantId,
                        createdBy,
                    });
                    await prisma.movimentoContabile.update({
                        where: { id: movEntrata.id, deletedAt: null },
                        data: { movimentoCollegatoId: movUscita.id },
                    });
                    result.movimenti.push(movUscita);
                    logger.info({ id: movUscita.id, medicoId, appPrestazioneId: appPrestazione.id }, 'USCITA BOZZA creata per compenso medico AppuntamentoPrestazione');
                } else {
                    result.warnings.push({
                        type: 'MISSING_COMPENSO',
                        message: `Nessun compenso definito per il medico su "${prestazione?.nome}". Configura il Tariffario Medico o le Abilitazioni Medico.`,
                        solutionUrl: '/tariffario-medico',
                        field: 'compenso',
                    });
                }
            }
            await syncBozzaFatturaAppuntamento(appPrestazione.appuntamentoId, tenantId).catch(err =>
                logger.warn({ error: err.message, appPrestazioneId: appPrestazione.id }, 'Sync bozza fattura appuntamento fallita')
            );
        } catch (err) {
            logger.error({ error: err.message, appPrestazioneId: appPrestazione?.id }, 'Errore generaPerAppuntamentoPrestazione');
        }
        return result;
    },

    // ─── P70 — APPUNTAMENTO MDL ────────────────────────────────────────────

    /**
     * P70 — Genera BOZZA ENTRATA (azienda) + BOZZA USCITA (medico) quando si
     * fissa un appuntamento MDL (PREVENTIVA, PERIODICA).
     * Viene invalidato e rigenerato come DA_FATTURARE da aggiornaPerVisitaMDL
     * al termine della visita.
     *
     * @param {Object} appuntamento - { id, pazienteId, medicoId, prestazioneId, tipoVisitaMDL, dataOra, companyTenantProfileId }
     * @param {string} tenantId
     * @param {string} [createdBy]
     * @returns {Promise<GenerationResult>}
     */
    async generaPerAppuntamentoMDL(appuntamento, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            if (!appuntamento.tipoVisitaMDL) return result;

            // Idempotenza — evita doppioni se chiamato più volte.
            // IMPORTANT: controlla ENTRAMBI i movimenti: la route sorveglianza-sanitaria/programma
            // crea l'ENTRATA direttamente (senza USCITA). Se usciamo appena troviamo ENTRATA,
            // il compenso medico (USCITA) non viene mai creato.
            // CRITICAL: filtra appPrestazioneId: null per escludere i movimenti degli accertamenti
            // (che hanno appPrestazioneId != null) — altrimenti l'idempotenza si attiva
            // trovando un accertamento e non crea il movimento principale MDL.
            const existingEntrata = await esisteMovimento({
                appuntamentoId: appuntamento.id,
                appPrestazioneId: null,
                direzione: 'ENTRATA',
                tenantId,
            });
            const existingUscita = await esisteMovimento({
                appuntamentoId: appuntamento.id,
                appPrestazioneId: null,
                direzione: 'USCITA',
                tenantId,
            });
            if (existingEntrata && existingUscita) {
                // Entrambi i movimenti già esistono — nulla da fare
                result.movimenti.push(existingEntrata, existingUscita);
                return result;
            }
            if (existingEntrata && !existingUscita) {
                // ENTRATA già creata (es. da sorveglianza-sanitaria/programma), crea solo l'USCITA per il medico
                const cpId = existingEntrata.companyTenantProfileId
                    || appuntamento.companyTenantProfileId
                    || await getCompanyDipendente(appuntamento.pazienteId, tenantId).catch(() => null);
                let importoNettoEsistente = Number(existingEntrata.importoNetto) || 0;
                if (importoNettoEsistente > 0 && cpId) {
                    const { voce: voceRef } = await getVocePerPrestazione(
                        cpId, tenantId, appuntamento.prestazioneId, appuntamento.tipoVisitaMDL
                    ).catch(() => ({ voce: null }));
                    const tariffarioNetto = Number(voceRef?.prezzoBase || 0);
                    if (tariffarioNetto > 0 && Math.abs(tariffarioNetto - importoNettoEsistente) >= 0.01) {
                        const aliquotaIvaRef = Number(voceRef?.ivaAliquota ?? existingEntrata.aliquotaIva ?? 22);
                        const importiRef = calcolaImporti(tariffarioNetto, aliquotaIvaRef);
                        const updatedEntrata = await aggiornaMovimentoSeBozza(existingEntrata, {
                            voceTariffarioId: voceRef.id,
                            importoNetto: importiRef.importoNetto,
                            importoIva: importiRef.importoIva,
                            importoLordo: importiRef.importoLordo,
                            aliquotaIva: aliquotaIvaRef,
                            note: [
                                existingEntrata.note,
                                'Importo riallineato automaticamente al tariffario aziendale vigente',
                            ].filter(Boolean).join('\n'),
                        });
                        importoNettoEsistente = Number(updatedEntrata?.importoNetto || tariffarioNetto);
                        result.movimenti.push(updatedEntrata || existingEntrata);
                    } else {
                        result.movimenti.push(existingEntrata);
                    }
                    const compensoRef = await getCompensoProfessionista(
                        voceRef, appuntamento.medicoId, appuntamento.prestazioneId, importoNettoEsistente, tenantId
                    );
                    if (compensoRef) {
                        const movUscita = await creaMovimentoUscita({
                            tipo: 'VISITA_MDL',
                            tipoSoggetto: 'MEDICO',
                            personId: appuntamento.medicoId,
                            companyTenantProfileId: cpId,
                            appuntamentoId: appuntamento.id,
                            voceTariffarioId: voceRef?.id || existingEntrata.voceTariffarioId || null,
                            compensoNetto: compensoRef.compensoNetto,
                            compensoTipo: compensoRef.tipo,
                            importoRiferimento: importoNettoEsistente,
                            dataEsecuzione: appuntamento.dataOra,
                            descrizione: `[BOZZA] Compenso visita MDL – medico [fonte: ${compensoRef.fonte}]`,
                            stato: 'BOZZA',
                            tenantId,
                            createdBy,
                        });
                        await prisma.movimentoContabile.update({
                            where: { id: existingEntrata.id, deletedAt: null },
                            data: { movimentoCollegatoId: movUscita.id },
                        });
                        result.movimenti.push(movUscita);
                        logger.info({ id: movUscita.id, appuntamentoId: appuntamento.id }, 'MovimentoContabile BOZZA USCITA creato per Appuntamento MDL (ENTRATA già esistente)');
                    }
                } else {
                    result.movimenti.push(existingEntrata);
                }
                return result;
            }

            // Trova azienda del dipendente
            let companyTenantProfileId = appuntamento.companyTenantProfileId
                || await getCompanyDipendente(appuntamento.pazienteId, tenantId).catch(() => null);

            if (!companyTenantProfileId) {
                result.warnings.push({
                    type: 'MISSING_TARIFFARIO',
                    message: `Il dipendente non è associato a nessuna azienda nel tenant. Il movimento contabile verrà creato al termine della visita.`,
                    solutionUrl: `/persons/${appuntamento.pazienteId}`,
                });
                return result;
            }

            // Cerca VoceTariffario per questa prestazione
            const { assoc, voce } = await getVocePerPrestazione(
                companyTenantProfileId, tenantId, appuntamento.prestazioneId, appuntamento.tipoVisitaMDL
            ).catch(() => ({ assoc: null, voce: null }));

            let importoNettoEntrata = voce ? parseFloat(voce.prezzoBase) : 0;
            let prezzoFonte = 'VOCE_TARIFFARIO';

            if (!importoNettoEntrata) {
                const prest = await prisma.prestazione.findFirst({
                    where: { id: appuntamento.prestazioneId, tenantId, deletedAt: null },
                    select: { prezzoBase: true, prezzoPrimaVisita: true, prezzoControllo: true, nome: true },
                });
                if (prest) {
                    const tipoVisitaMDL = appuntamento.tipoVisitaMDL;
                    let prezzoPerTipo = null;
                    if (['PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA'].includes(tipoVisitaMDL)) {
                        prezzoPerTipo = prest.prezzoPrimaVisita ? parseFloat(prest.prezzoPrimaVisita) : null;
                    } else if (tipoVisitaMDL === 'PERIODICA') {
                        prezzoPerTipo = prest.prezzoControllo ? parseFloat(prest.prezzoControllo) : null;
                    }
                    const fallbackPrezzo = prezzoPerTipo || (prest.prezzoBase ? parseFloat(prest.prezzoBase) : 0);
                    if (fallbackPrezzo > 0) {
                        importoNettoEntrata = fallbackPrezzo;
                        prezzoFonte = prezzoPerTipo ? 'PRESTAZIONE_PER_TIPO' : 'PRESTAZIONE_STANDARD';
                        result.warnings.push({
                            type: 'MISSING_VOCE',
                            message: `Nessuna voce tariffario per questa visita MDL. Usato prezzo ${prezzoFonte === 'PRESTAZIONE_PER_TIPO' ? 'per tipo visita' : 'standard'} (€${fallbackPrezzo}). Configura il tariffario aziendale per un valore accurato.`,
                            solutionUrl: `/tariffari-aziendali`,
                            field: 'importoNetto',
                        });
                    }
                }
            }

            if (!assoc) {
                result.warnings.push({
                    type: 'MISSING_TARIFFARIO',
                    message: `Nessun tariffario aziendale attivo. Associa un tariffario per avere il calcolo automatico dei prezzi.`,
                    solutionUrl: `/tariffari-aziendali`,
                });
            }

            const aliquotaIva = voce ? parseFloat(voce.ivaAliquota) : 22;
            const { importoNetto, importoIva, importoLordo } = calcolaImporti(importoNettoEntrata, aliquotaIva);

            // Arricchisce descrizione con nome paziente + azienda
            const { nomePaziente: pazNome, nomeAzienda: aziNome } = await getInfoPersonaAzienda(
                appuntamento.pazienteId, companyTenantProfileId, tenantId
            ).catch(() => ({ nomePaziente: null, nomeAzienda: null }));
            const tipoLabel = appuntamento.tipoVisitaMDL?.toLowerCase().replace(/_/g, ' ') || 'MDL';
            const infoTag = [pazNome, aziNome].filter(Boolean).join(' | ');

            // BOZZA — appuntamento programmato, non ancora eseguito
            const movEntrata = await prisma.movimentoContabile.create({
                data: {
                    direzione: 'ENTRATA',
                    tipo: 'VISITA_MDL',
                    stato: 'BOZZA',
                    tipoSoggetto: 'AZIENDA',
                    companyTenantProfileId,
                    appuntamentoId: appuntamento.id,
                    voceTariffarioId: voce?.id || null,
                    importoNetto,
                    importoIva,
                    importoLordo,
                    aliquotaIva,
                    dataEsecuzione: appuntamento.dataOra,
                    descrizione: `[BOZZA] Visita MDL – ${tipoLabel}${infoTag ? ` | ${infoTag}` : ''} [fonte: ${prezzoFonte}]`,
                    branchType: 'MEDICA',
                    tenantId,
                    createdBy,
                },
            });
            result.movimenti.push(movEntrata);
            logger.info({ id: movEntrata.id, appuntamentoId: appuntamento.id }, 'MovimentoContabile BOZZA ENTRATA creato per Appuntamento MDL');

            // USCITA — compenso medico (BOZZA)
            const compenso = await getCompensoProfessionista(
                voce, appuntamento.medicoId, appuntamento.prestazioneId, importoNetto, tenantId
            );
            if (compenso) {
                const movUscita = await creaMovimentoUscita({
                    tipo: 'VISITA_MDL',
                    tipoSoggetto: 'MEDICO',
                    personId: appuntamento.medicoId,
                    companyTenantProfileId,
                    appuntamentoId: appuntamento.id,
                    voceTariffarioId: voce?.id || null,
                    compensoNetto: compenso.compensoNetto,
                    compensoTipo: compenso.tipo,
                    importoRiferimento: importoNetto,
                    dataEsecuzione: appuntamento.dataOra,
                    descrizione: `[BOZZA] Compenso visita MDL – ${tipoLabel}${infoTag ? ` | ${infoTag}` : ''} [fonte: ${compenso.fonte}]`,
                    stato: 'BOZZA',
                    tenantId,
                    createdBy,
                });
                await prisma.movimentoContabile.update({
                    where: { id: movEntrata.id, deletedAt: null },
                    data: { movimentoCollegatoId: movUscita.id },
                });
                result.movimenti.push(movUscita);
                logger.info({ id: movUscita.id, appuntamentoId: appuntamento.id }, 'MovimentoContabile BOZZA USCITA creato per Appuntamento MDL');
            } else {
                result.warnings.push({
                    type: 'MISSING_COMPENSO',
                    message: `Nessun compenso definito per il medico. Il compenso verrà calcolato al termine della visita.`,
                    solutionUrl: `/tariffario-medico`,
                    field: 'compenso',
                });
            }
        } catch (err) {
            logger.error({ error: err.message, appuntamentoId: appuntamento?.id }, 'Errore generaPerAppuntamentoMDL');
        }
        return result;
    },

    // ─── P70 — ACCETTAZIONE NON-MDL ────────────────────────────────────────

    /**
     * P70 — Genera BOZZA ENTRATA (paziente o azienda) + BOZZA USCITA (medico)
     * quando si accetta un paziente NON-MDL (transizione a IN_ATTESA).
     * Verrà finalizzato a DA_FATTURARE al termine della visita.
     *
     * @param {Object} appuntamento - { id, pazienteId, medicoId, prestazioneId, dataOra, companyTenantProfileId? }
     * @param {string} tenantId
     * @param {string} [createdBy]
     * @returns {Promise<GenerationResult>}
     */
    async generaPerAccettazionePaziente(appuntamento, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        try {
            // Idempotenza — se esiste già un movimento entrata su questo appuntamento, skip
            const existing = await esisteMovimento({
                appuntamentoId: appuntamento.id,
                direzione: 'ENTRATA',
                tenantId,
            });
            if (existing) {
                result.movimenti.push(existing);
                return result;
            }

            // Determina pagante: azienda (se dipendente associato) o paziente
            const companyId = appuntamento.companyTenantProfileId
                || await getCompanyDipendente(appuntamento.pazienteId, tenantId).catch(() => null);

            // Cerca prezzo dalla prestazione principale
            let importoNettoEntrata = 0;
            let voceTariffario = null;
            let prezzoFonte = 'NESSUNO';

            if (appuntamento.prestazioneId) {
                if (companyId) {
                    const { voce } = await getVocePerPrestazione(companyId, tenantId, appuntamento.prestazioneId).catch(() => ({ voce: null }));
                    if (voce && parseFloat(voce.prezzoBase) > 0) {
                        importoNettoEntrata = parseFloat(voce.prezzoBase);
                        voceTariffario = voce;
                        prezzoFonte = 'VOCE_TARIFFARIO';
                    }
                }
                if (!importoNettoEntrata) {
                    const prest = await prisma.prestazione.findFirst({
                        where: { id: appuntamento.prestazioneId, tenantId, deletedAt: null },
                        select: { prezzoBase: true, nome: true },
                    });
                    if (prest?.prezzoBase) {
                        importoNettoEntrata = parseFloat(prest.prezzoBase);
                        prezzoFonte = 'PRESTAZIONE_STANDARD';
                        result.warnings.push({
                            type: 'MISSING_VOCE',
                            message: `Nessuna voce tariffario per "${prest.nome}". Usato prezzo base €${importoNettoEntrata}.`,
                            solutionUrl: '/tariffari-aziendali',
                            field: 'importoNetto',
                        });
                    }
                }
            }

            if (!importoNettoEntrata) {
                result.warnings.push({
                    type: 'MISSING_PREZZO',
                    message: `Nessun prezzo disponibile per questa prestazione. Movimento BOZZA creato con importo €0.`,
                    solutionUrl: '/tariffari-aziendali',
                    field: 'importoNetto',
                });
            }

            const aliquotaIva = voceTariffario ? parseFloat(voceTariffario.ivaAliquota) : 22;
            const { importoNetto, importoIva, importoLordo } = calcolaImporti(importoNettoEntrata, aliquotaIva);
            // Solo per appuntamenti MDL (tipoVisitaMDL valorizzato) le prestazioni vanno
            // a carico dell'azienda. Per prestazioni non-MDL l'importo è sempre a carico del paziente.
            const isMDLAppuntamento = !!(appuntamento?.tipoVisitaMDL);
            const tipoSoggettoEntrata = (companyId && isMDLAppuntamento) ? 'AZIENDA' : 'PAZIENTE';

            const movEntrata = await prisma.movimentoContabile.create({
                data: {
                    direzione: 'ENTRATA',
                    tipo: 'PRESTAZIONE_CLINICA',
                    stato: 'BOZZA',
                    tipoSoggetto: tipoSoggettoEntrata,
                    personId: tipoSoggettoEntrata === 'PAZIENTE' ? (appuntamento.pazienteId || null) : null,
                    companyTenantProfileId: companyId || null,
                    appuntamentoId: appuntamento.id,
                    voceTariffarioId: voceTariffario?.id || null,
                    importoNetto,
                    importoIva,
                    importoLordo,
                    aliquotaIva,
                    dataEsecuzione: appuntamento.dataOra,
                    descrizione: `[BOZZA] Accettazione paziente – prestazione clinica [fonte: ${prezzoFonte}]`,
                    branchType: 'MEDICA',
                    tenantId,
                    createdBy,
                },
            });
            result.movimenti.push(movEntrata);
            logger.info({ id: movEntrata.id, appuntamentoId: appuntamento.id }, 'MovimentoContabile BOZZA ENTRATA creato per accettazione paziente');

            // USCITA — compenso medico (BOZZA)
            if (appuntamento.medicoId) {
                const compenso = await getCompensoProfessionista(
                    voceTariffario, appuntamento.medicoId, appuntamento.prestazioneId, importoNetto, tenantId
                );
                if (compenso?.compensoNetto > 0) {
                    const movUscita = await creaMovimentoUscita({
                        tipo: 'PRESTAZIONE_CLINICA',
                        tipoSoggetto: 'MEDICO',
                        personId: appuntamento.medicoId,
                        companyTenantProfileId: companyId || null,
                        appuntamentoId: appuntamento.id,
                        voceTariffarioId: voceTariffario?.id || null,
                        compensoNetto: compenso.compensoNetto,
                        compensoTipo: compenso.tipo,
                        importoRiferimento: importoNetto,
                        dataEsecuzione: appuntamento.dataOra,
                        descrizione: `[BOZZA] Compenso medico – accettazione paziente`,
                        stato: 'BOZZA',
                        tenantId,
                        createdBy,
                    });
                    await prisma.movimentoContabile.update({
                        where: { id: movEntrata.id, deletedAt: null },
                        data: { movimentoCollegatoId: movUscita.id },
                    });
                    result.movimenti.push(movUscita);
                    logger.info({ id: movUscita.id, appuntamentoId: appuntamento.id }, 'MovimentoContabile BOZZA USCITA creato per accettazione paziente');
                } else {
                    result.warnings.push({
                        type: 'MISSING_COMPENSO',
                        message: `Nessun compenso definito per il medico. Configura il Tariffario Medico o le Abilitazioni Medico.`,
                        solutionUrl: '/tariffario-medico',
                        field: 'compenso',
                    });
                }
            }
        } catch (err) {
            logger.error({ error: err.message, appuntamentoId: appuntamento?.id }, 'Errore generaPerAccettazionePaziente');
        }
        return result;
    },

    /**
     * Registra una prestazione incassata senza emissione fattura.
     * Crea/aggiorna in modo idempotente:
     * - ENTRATA PAGATO con nota "SENZA_FATTURA", separabile nei conteggi
     * - USCITA DA_FATTURARE per il compenso del medico
     */
    async generaPagamentoSenzaFattura(params, tenantId, createdBy) {
        const result = { movimenti: [], warnings: [] };
        const source = await resolvePrestazioneSource({ ...params, tenantId });
        if (!source) {
            result.warnings.push({
                type: 'MISSING_PREZZO',
                message: 'Prestazione o visita non trovata per il pagamento senza fattura.',
                field: 'source',
            });
            return result;
        }

        const companyId = source.appuntamento?.companyTenantProfileId
            || await getCompanyDipendente(source.pazienteId, tenantId).catch(() => null);
        const prestazioneId = source.prestazione?.id || source.appPrestazione?.prestazioneId || source.visita?.prestazioneId || null;
        const { voce: voceTariffario } = companyId && prestazioneId
            ? await getVocePerPrestazione(companyId, tenantId, prestazioneId, source.tipoVisitaMDL).catch(() => ({ voce: null }))
            : { voce: null };

        const sourceWhere = {
            tenantId,
            deletedAt: null,
            stato: { not: 'ANNULLATO' },
            ...(source.visitaId ? { visitaId: source.visitaId } : {}),
            ...(source.appPrestazioneId ? { appPrestazioneId: source.appPrestazioneId } : {}),
            ...(!source.visitaId && !source.appPrestazioneId && source.appuntamentoId ? { appuntamentoId: source.appuntamentoId, appPrestazioneId: null } : {}),
        };

        const existingEntrata = await prisma.movimentoContabile.findFirst({
            where: {
                ...sourceWhere,
                direzione: 'ENTRATA',
                OR: [
                    { fatturaElettronicaId: null },
                    ...(params.bozzaFatturaId ? [{ fatturaElettronicaId: params.bozzaFatturaId }] : []),
                ],
            },
            orderBy: { updatedAt: 'desc' },
        });

        const prezzoInput = Number(params.importoRiferimento ?? 0);
        const prezzoDaMovimento = existingEntrata ? Number(existingEntrata.importoNetto || 0) : 0;
        const prezzoDaVoce = voceTariffario ? Number(voceTariffario.prezzoBase || 0) : 0;
        const prezzoDaPrestazione = Number(source.prestazione?.prezzoBase || 0);
        const importoNetto = prezzoInput > 0
            ? prezzoInput
            : (prezzoDaMovimento || prezzoDaVoce || prezzoDaPrestazione || 0);
        const isMedicalAesthetic = /estetic/i.test(source.prestazione?.nome || '');
        const aliquotaIva = isMedicalAesthetic ? 22 : 0;
        const importi = calcolaImporti(importoNetto, aliquotaIva);
        const tipoMovimento = source.tipoVisitaMDL ? 'VISITA_MDL' : 'PRESTAZIONE_CLINICA';
        const tipoSoggettoEntrata = source.tipoVisitaMDL && companyId ? 'AZIENDA' : 'PAZIENTE';
        const descrizioneBase = params.descrizione
            || source.prestazione?.nome
            || (source.tipoVisitaMDL ? 'Visita medica del lavoro' : 'Prestazione clinica');
        const contextNote = source.appuntamentoId ? `AUTO_ACCETTAZIONE:${source.appuntamentoId}` : null;
        const senzaFatturaNote = contextNote
            ? `${contextNote}\nSENZA_FATTURA - incasso registrato senza emissione fattura`
            : 'SENZA_FATTURA - incasso registrato senza emissione fattura';

        let movEntrata = existingEntrata;
        if (movEntrata) {
            movEntrata = await prisma.movimentoContabile.update({
                where: { id: movEntrata.id },
                data: {
                    stato: 'PAGATO',
                    metodoPagamento: params.metodoPagamento || movEntrata.metodoPagamento || null,
                    dataPagamento: new Date(),
                    importoNetto: importi.importoNetto,
                    importoIva: importi.importoIva,
                    importoLordo: importi.importoLordo,
                    aliquotaIva,
                    fatturaElettronicaId: null,
                    note: senzaFatturaNote,
                    updatedBy: createdBy || null,
                },
            });
        } else {
            movEntrata = await prisma.movimentoContabile.create({
                data: {
                    direzione: 'ENTRATA',
                    tipo: tipoMovimento,
                    stato: 'PAGATO',
                    tipoSoggetto: tipoSoggettoEntrata,
                    personId: tipoSoggettoEntrata === 'PAZIENTE' ? (source.pazienteId || null) : null,
                    companyTenantProfileId: tipoSoggettoEntrata === 'AZIENDA' ? (companyId || null) : null,
                    visitaId: source.visitaId || null,
                    appuntamentoId: source.appuntamentoId || null,
                    appPrestazioneId: source.appPrestazioneId || null,
                    voceTariffarioId: voceTariffario?.id || null,
                    importoNetto: importi.importoNetto,
                    importoIva: importi.importoIva,
                    importoLordo: importi.importoLordo,
                    aliquotaIva,
                    dataEsecuzione: source.dataEsecuzione,
                    dataPagamento: new Date(),
                    metodoPagamento: params.metodoPagamento || null,
                    descrizione: `${descrizioneBase} - incasso senza fattura`,
                    note: senzaFatturaNote,
                    branchType: 'MEDICA',
                    tenantId,
                    createdBy,
                },
            });
        }

        const bozzaFattura = params.bozzaFatturaId
            ? await prisma.fatturaElettronica.findFirst({
                where: { id: params.bozzaFatturaId, tenantId, deletedAt: null },
                include: { linee: { orderBy: { numeroLinea: 'asc' } } },
            })
            : null;
        const fatturaSenzaFattura = bozzaFattura || (contextNote
            ? await prisma.fatturaElettronica.findFirst({
                where: {
                    tenantId,
                    deletedAt: null,
                    note: { contains: contextNote },
                    stato: 'PAGATA',
                    numero: { startsWith: `SF-${new Date().getFullYear()}/` },
                },
                include: { linee: { orderBy: { numeroLinea: 'asc' } } },
            })
            : null);
        if (fatturaSenzaFattura) {
            const linea = fatturaSenzaFattura.linee?.[0] || null;
            const alreadyInternalNumber = String(fatturaSenzaFattura.numero || '').startsWith(`SF-${new Date().getFullYear()}/`);
            let dataFattura = null;
            let lastUniqueError = null;

            for (let attempt = 0; attempt < 5; attempt += 1) {
                const numero = alreadyInternalNumber
                    ? fatturaSenzaFattura.numero
                    : await generaNumeroPagamentoSenzaFattura(tenantId);
                dataFattura = {
                    numero,
                    stato: 'PAGATA',
                    // Documento interno: resta fuori dal ciclo SDI/Acube, quindi non usa
                    // stati di trasmissione reali che potrebbero farlo rientrare nei polling.
                    acubeStatus: 'BOZZA',
                    dataEmissione: new Date(),
                    imponibile: importi.importoNetto,
                    importoIva: importi.importoIva,
                    totale: importi.importoLordo,
                    aliquotaIva,
                    note: senzaFatturaNote,
                    modalitaPagamento: params.metodoPagamento || fatturaSenzaFattura.modalitaPagamento || null,
                    sistemaTsFlagOpp: 1,
                    updatedAt: new Date(),
                };
                try {
                    await prisma.$transaction([
                        prisma.fatturaElettronica.update({
                            where: { id: fatturaSenzaFattura.id },
                            data: dataFattura,
                        }),
                        ...(linea ? [
                            prisma.fatturaElettronicaLinea.update({
                                where: { id: linea.id },
                                data: {
                                    descrizione: `${descrizioneBase} - pagamento registrato senza emissione fattura`,
                                    prezzoUnitario: importi.importoNetto,
                                    prezzoTotale: importi.importoNetto,
                                    aliquotaIva,
                                    natura: aliquotaIva === 0 ? 'N4' : null,
                                },
                            }),
                        ] : [
                            prisma.fatturaElettronicaLinea.create({
                                data: {
                                    fatturaId: fatturaSenzaFattura.id,
                                    tenantId,
                                    numeroLinea: 1,
                                    descrizione: `${descrizioneBase} - pagamento registrato senza emissione fattura`,
                                    quantita: 1,
                                    prezzoUnitario: importi.importoNetto,
                                    prezzoTotale: importi.importoNetto,
                                    aliquotaIva,
                                    natura: aliquotaIva === 0 ? 'N4' : null,
                                },
                            }),
                        ]),
                        prisma.movimentoContabile.update({
                            where: { id: movEntrata.id },
                            data: { fatturaElettronicaId: fatturaSenzaFattura.id },
                        }),
                    ]);
                    lastUniqueError = null;
                    break;
                } catch (err) {
                    if (!alreadyInternalNumber && err?.code === 'P2002' && attempt < 4) {
                        lastUniqueError = err;
                        continue;
                    }
                    throw err;
                }
            }
            if (lastUniqueError) throw lastUniqueError;
            movEntrata = { ...movEntrata, fatturaElettronicaId: fatturaSenzaFattura.id };
            result.fattura = { ...fatturaSenzaFattura, ...dataFattura };
        }

        if (source.appuntamentoId) {
            const appuntamentoPagamento = await prisma.appuntamento.findFirst({
                where: { id: source.appuntamentoId, tenantId, deletedAt: null },
                select: { stato: true },
            });
            await prisma.appuntamento.updateMany({
                where: { id: source.appuntamentoId, tenantId, deletedAt: null },
                data: {
                    pagamentoAnticipato: true,
                    pagamentoDataOra: new Date(),
                    ...(['COMPLETATO', 'FATTURATO'].includes(appuntamentoPagamento?.stato) ? { stato: 'FATTURATO' } : {}),
                },
            });
        }
        result.movimenti.push(movEntrata);

        if (!source.medicoId) {
            result.warnings.push({
                type: 'MISSING_COMPENSO',
                message: 'Medico non disponibile: compenso passivo non generato.',
                field: 'medicoId',
            });
            return result;
        }

        let movUscita = await prisma.movimentoContabile.findFirst({
            where: {
                ...sourceWhere,
                direzione: 'USCITA',
                personId: source.medicoId,
            },
            orderBy: { updatedAt: 'desc' },
        });

        const compenso = await getCompensoProfessionista(
            voceTariffario,
            source.medicoId,
            prestazioneId,
            importi.importoNetto,
            tenantId
        );
        if (!compenso?.compensoNetto || compenso.compensoNetto <= 0) {
            result.warnings.push({
                type: 'MISSING_COMPENSO',
                message: `Nessun compenso definito per il medico su "${descrizioneBase}".`,
                solutionUrl: '/tariffario-medico',
                field: 'compenso',
            });
            return result;
        }

        if (movUscita && ['BOZZA', 'DA_FATTURARE'].includes(movUscita.stato)) {
            movUscita = await prisma.movimentoContabile.update({
                where: { id: movUscita.id },
                data: {
                    stato: 'DA_FATTURARE',
                    importoNetto: compenso.compensoNetto,
                    importoLordo: compenso.compensoNetto,
                    importoIva: 0,
                    importoRiferimento: importi.importoNetto,
                    compensoTipo: compenso.tipo,
                    voceTariffarioId: voceTariffario?.id || movUscita.voceTariffarioId || null,
                    note: 'Compenso da incasso senza fattura',
                    updatedBy: createdBy || null,
                },
            });
            if (movEntrata.movimentoCollegatoId !== movUscita.id) {
                await prisma.movimentoContabile.update({
                    where: { id: movEntrata.id },
                    data: { movimentoCollegatoId: movUscita.id },
                });
            }
        } else if (!movUscita) {
            movUscita = await creaMovimentoUscita({
                tipo: tipoMovimento,
                tipoSoggetto: 'MEDICO',
                personId: source.medicoId,
                companyTenantProfileId: companyId || null,
                visitaId: source.visitaId || null,
                appuntamentoId: source.appuntamentoId || null,
                appPrestazioneId: source.appPrestazioneId || null,
                voceTariffarioId: voceTariffario?.id || null,
                compensoNetto: compenso.compensoNetto,
                compensoTipo: compenso.tipo,
                importoRiferimento: importi.importoNetto,
                dataEsecuzione: source.dataEsecuzione,
                descrizione: `Compenso medico - ${descrizioneBase} - pagata senza fattura`,
                stato: 'DA_FATTURARE',
                tenantId,
                createdBy,
            });
            await prisma.movimentoContabile.update({
                where: { id: movEntrata.id },
                data: { movimentoCollegatoId: movUscita.id },
            });
            await prisma.movimentoContabile.update({
                where: { id: movUscita.id },
                data: { note: 'Compenso da incasso senza fattura' },
            });
        }

        if (movUscita) result.movimenti.push(movUscita);
        return result;
    },

    // ─── P70 — FINALIZZAZIONE MOVIMENTI NON-MDL ────────────────────────────

    /**
     * P70 — Al termine della visita (non-MDL), aggiorna tutti i movimenti BOZZA
     * dell'appuntamento a DA_FATTURARE.
     *
     * @param {string} appuntamentoId
     * @param {string} tenantId
     * @param {string} [updatedBy]
     * @returns {Promise<{aggiornati: number}>}
     */
    async finalizzaMovimentiAppuntamento(appuntamentoId, tenantId, updatedBy) {
        const result = { aggiornati: 0 };
        try {
            const updated = await prisma.movimentoContabile.updateMany({
                where: {
                    appuntamentoId,
                    tenantId,
                    stato: 'BOZZA',
                    deletedAt: null,
                },
                data: {
                    stato: 'DA_FATTURARE',
                    updatedBy: updatedBy || null,
                },
            });
            result.aggiornati = updated.count;
            if (updated.count > 0) {
                logger.info({ appuntamentoId, aggiornati: updated.count }, 'Movimenti BOZZA finalizzati a DA_FATTURARE (visita completata)');
            }
        } catch (err) {
            logger.error({ error: err.message, appuntamentoId }, 'Errore finalizzaMovimentiAppuntamento');
            throw err;
        }
        return result;
    },

    /**
     * Aggiorna il movimento contabile al cambio stato del preventivo.
     *   ACCETTATO          → promuove PREVENTIVO → DA_FATTURARE
     *   RIFIUTATO/SCADUTO  → annulla i movimenti esistenti
     *   INVIATO/VISUALIZZATO → genera il movimento se non esiste ancora
     *
     * @param {Object} preventivo - Record preventivo aggiornato (con nuovo stato)
     * @param {string} nuovoStato - Nuovo StatoPreventivo
     * @param {string} tenantId
     * @param {string} [updatedBy]
     */
    async aggiornaStatoPreventivo(preventivo, nuovoStato, tenantId, updatedBy) {
        try {
            if (['RIFIUTATO', 'ANNULLATO', 'SCADUTO'].includes(nuovoStato)) {
                await this.annullaMovimentiSorgente({ preventivoId: preventivo.id }, tenantId, updatedBy);
            } else if (nuovoStato === 'ACCETTATO') {
                // Promuovi PREVENTIVO → DA_FATTURARE
                await prisma.movimentoContabile.updateMany({
                    where: { preventivoId: preventivo.id, tenantId, deletedAt: null, stato: 'PREVENTIVO' },
                    data: { stato: 'DA_FATTURARE', updatedBy: updatedBy || null },
                });
                logger.info({ preventivoId: preventivo.id, tenantId }, 'Movimenti preventivo promossi a DA_FATTURARE');
            } else if (['INVIATO', 'VISUALIZZATO', 'BOZZA'].includes(nuovoStato)) {
                // Assicura che esista almeno il movimento PREVENTIVO
                const existing = await esisteMovimento({ preventivoId: preventivo.id, direzione: 'ENTRATA', tenantId });
                if (!existing) {
                    await this.generaPerPreventivo(preventivo, tenantId, updatedBy);
                }
            }
        } catch (err) {
            logger.error({ error: err.message, preventivoId: preventivo?.id }, 'Errore aggiornaStatoPreventivo');
        }
    },
};

export default MovimentoContabileGenerator;
