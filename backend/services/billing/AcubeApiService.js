/**
 * AcubeApiService - Integrazione AcubeAPI v1
 * Fatturazione Elettronica (SDI/FatturaPA) e Sistema Tessera Sanitaria
 *
 * Docs: https://docs.acubeapi.com/documentation/common/authentication
 * Docs: https://docs.acubeapi.com/documentation/italy/
 *
 * === ARCHITETTURA SaaS ===
 * ElementMedica possiede un unico account AcubeAPI (master account).
 * Le credenziali vivono nelle env vars del server:
 *   - ACUBE_EMAIL      → email dell'account AcubeAPI (default: info@element-srl.it)
 *   - ACUBE_PASSWORD   → password dell'account AcubeAPI
 *   - ACUBE_API_URL    → base URL (sandbox vs prod)
 *   - ACUBE_AUTH_URL   → auth URL (sandbox vs prod)
 *   - ACUBE_ENV        → "sandbox" | "production"
 *
 * I tenant configurano SOLO i dati anagrafici dei loro enti emittenti
 * (denominazione, CF, P.IVA, SistemaTS). Non toccano le credenziali ACube.
 *
 * Auth: POST https://common-sandbox.api.acubeapi.com/login  → { token }
 *       POST https://common.api.acubeapi.com/login          → { token } (prod)
 *
 * @module services/billing/AcubeApiService
 * @project P97 - Fatturazione Elettronica & Sistema TS
 */

import axios from 'axios';
import logger from '../../utils/logger.js';

// ============================================================================
// CONFIGURAZIONE ACUBE — GESTITA CENTRALMENTE DA ELEMENTMEDICA
// ============================================================================

export const ACUBE_ENV = process.env.ACUBE_ENV || 'sandbox';
export const ACUBE_IS_SANDBOX = ACUBE_ENV !== 'production';

export const ACUBE_BASE_URL = process.env.ACUBE_API_URL ||
    (ACUBE_IS_SANDBOX
        ? 'https://it-sandbox.api.acubeapi.com'
        : 'https://it.api.acubeapi.com');

export const ACUBE_AUTH_URL = process.env.ACUBE_AUTH_URL ||
    (ACUBE_IS_SANDBOX
        ? 'https://common-sandbox.api.acubeapi.com/login'
        : 'https://common.api.acubeapi.com/login');

// Credenziali master ElementMedica (da env)
const ACUBE_MASTER_EMAIL = process.env.ACUBE_EMAIL || 'info@elementmedica.com';
if (!process.env.ACUBE_PASSWORD) {
    logger.error('[AcubeAPI] SECURITY: ACUBE_PASSWORD env var non impostato. Impostare ACUBE_PASSWORD in .env.');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('[CONFIG] ACUBE_PASSWORD env var is required in production');
    }
}
const ACUBE_MASTER_PASSWORD = process.env.ACUBE_PASSWORD || '';

logger.info('[AcubeAPI] Configurazione', {
    env: ACUBE_ENV,
    baseUrl: ACUBE_BASE_URL,
    authUrl: ACUBE_AUTH_URL,
    masterEmail: ACUBE_MASTER_EMAIL
});

// ============================================================================
// TOKEN CACHE (in-memory, TTL 23h)
// ============================================================================

/** @type {Map<string, { token: string, expiresAt: number }>} */
const _tokenCache = new Map();

/**
 * Ottieni JWT Bearer token da AcubeAPI.
 * Il token viene messo in cache per 23 ore (AcubeAPI token dura 24h).
 *
 * @param {string} email    - Email account AcubeAPI
 * @param {string} password - Password account AcubeAPI
 * @returns {Promise<string>} JWT token
 */
export async function getAcubeToken(email, password) {
    const cacheKey = email;
    const cached = _tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.token;
    }

    try {
        const response = await axios.post(
            ACUBE_AUTH_URL,
            { email, password },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                timeout: 15000,
            }
        );

        const token = response.data?.token;
        if (!token) {
            throw new Error('AcubeAPI: nessun token ricevuto dalla risposta di login');
        }

        // TTL 23 ore
        _tokenCache.set(cacheKey, {
            token,
            expiresAt: Date.now() + 23 * 60 * 60 * 1000,
        });

        logger.info('[AcubeAPI] Token ottenuto con successo', { email: email?.replace(/(.{2}).*@/, '$1***@') });
        return token;
    } catch (err) {
        const detail = err.response?.data || err.message;
        logger.error('[AcubeAPI] Errore autenticazione', { email: email?.replace(/(.{2}).*@/, '$1***@'), detail });
        throw new Error(`AcubeAPI auth error: ${JSON.stringify(detail)}`);
    }
}

/**
 * Ottieni il Bearer token del master account ElementMedica.
 * Usa le credenziali dalle env vars: ACUBE_EMAIL + ACUBE_PASSWORD.
 * @returns {Promise<string>} JWT token
 */
export async function getMasterAcubeToken() {
    return getAcubeToken(ACUBE_MASTER_EMAIL, ACUBE_MASTER_PASSWORD);
}

/**
 * Invalida il token in cache per forzare un nuovo login.
 * Utile in caso di 401 ricevuto dalle API.
 * @param {string} email
 */
export function invalidateAcubeToken(email) {
    _tokenCache.delete(email);
}

// Sandbox credentials SistemaTS (testing only — mai usate in produzione)
// Override tramite env vars: ACUBE_SANDBOX_PROFESSIONAL_*, ACUBE_SANDBOX_DOCTOR_*
export const ACUBE_SANDBOX = {
    professional: {
        pinCode: process.env.ACUBE_SANDBOX_PROFESSIONAL_PIN || '3489543096',
        username: process.env.ACUBE_SANDBOX_PROFESSIONAL_USERNAME || 'MTOMRA66A41G224M',
        password: process.env.ACUBE_SANDBOX_PROFESSIONAL_PASSWORD || 'Salve123',
        piva: process.env.ACUBE_SANDBOX_PROFESSIONAL_PIVA || '65498732105',
    },
    doctor: {
        pinCode: process.env.ACUBE_SANDBOX_DOCTOR_PIN || '1234567890',
        username: process.env.ACUBE_SANDBOX_DOCTOR_USERNAME || 'PROVAX00X00X000Y',
        password: process.env.ACUBE_SANDBOX_DOCTOR_PASSWORD || 'Salve123',
        piva: process.env.ACUBE_SANDBOX_DOCTOR_PIVA || '65498732105',
    },
};

// ============================================================================
// ACUBE API CLIENT
// Nota: le funzioni accettano un token opzionale. Se non fornito,
// viene usato automaticamente il master token ElementMedica.
// ============================================================================

/**
 * Risolve il Bearer token da usare.
 * @param {string|null} token - Token esplicito (opzionale)
 * @returns {Promise<string>} Bearer token
 */
async function resolveToken(token) {
    if (token) return token;
    return getMasterAcubeToken();
}

/**
 * Invia fattura elettronica ad AcubeAPI (SDI)
 * POST /invoices
 *
 * @param {string|null} token   - Bearer token (null = usa master)
 * @param {object} fatturaPA    - Oggetto FatturaPA in formato snake_case
 * @returns {{ uuid: string }}  - UUID fattura su AcubeAPI (202 Accepted)
 */
export async function inviaFatturaSDI(token, fatturaPA) {
    try {
        const bearerToken = await resolveToken(token);
        const response = await axios.post(
            `${ACUBE_BASE_URL}/invoices`,
            fatturaPA,
            {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                timeout: 30000,
            }
        );
        logger.info('[AcubeAPI] Fattura inviata con UUID: ' + response.data?.uuid);
        return response.data;
    } catch (err) {
        // Se 401, invalida token e riprova una volta
        if (err.response?.status === 401) {
            invalidateAcubeToken(ACUBE_MASTER_EMAIL);
            const freshToken = await resolveToken(null);
            const response = await axios.post(`${ACUBE_BASE_URL}/invoices`, fatturaPA, {
                headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
                timeout: 30000,
            });
            return response.data;
        }
        const detail = err.response?.data || err.message;
        const status = err.response?.status;
        logger.error('[AcubeAPI] Errore invio fattura SDI', { status, detail });
        if (status && status >= 400 && status < 500) {
            const validationError = new Error(`AcubeAPI validazione: ${JSON.stringify(detail)}`);
            validationError.isValidation = true;
            throw validationError;
        }
        throw new Error(`AcubeAPI errore invio: ${JSON.stringify(detail)}`);
    }
}

/**
 * Recupera stato fattura da AcubeAPI
 * GET /invoices/{uuid}
 *
 * @param {string|null} token   - Bearer token (null = usa master)
 * @param {string} acubeUuid
 * @returns {object} - Dati fattura con status
 */
export async function getStatoFattura(token, acubeUuid) {
    try {
        const bearerToken = await resolveToken(token);
        const response = await axios.get(
            `${ACUBE_BASE_URL}/invoices/${acubeUuid}`,
            {
                headers: {
                    Authorization: `Bearer ${bearerToken}`,
                    Accept: 'application/json',
                },
                timeout: 15000,
            }
        );
        return response.data;
    } catch (err) {
        const detail = err.response?.data || err.message;
        logger.error('[AcubeAPI] Errore recupero stato fattura', { acubeUuid, detail });
        throw new Error(`AcubeAPI errore stato: ${JSON.stringify(detail)}`);
    }
}

/**
 * Elenca fatture emesse (inviate a clienti)
 * GET /invoices?type=0
 *
 * @param {string|null} token
 * @param {object} params - { page, limit, status, from_date, to_date }
 */
export async function elencaFatture(token, params = {}) {
    try {
        const bearerToken = await resolveToken(token);
        const response = await axios.get(`${ACUBE_BASE_URL}/invoices`, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                Accept: 'application/json',
            },
            params: { ...params, type: 0 },
            timeout: 15000,
        });
        return response.data;
    } catch (err) {
        const detail = err.response?.data || err.message;
        logger.error('[AcubeAPI] Errore lista fatture', { detail });
        throw new Error(`AcubeAPI errore lista: ${JSON.stringify(detail)}`);
    }
}

/**
 * Elenca fatture passive (spese ricevute dai fornitori)
 * GET /invoices?type=1
 *
 * type=0 → fatture emesse (inviate a cliente)
 * type=1 → fatture ricevute (da fornitore → spese aziendali)
 *
 * @param {string|null} token
 * @param {object} params - { page, invoice_date_after, invoice_date_before, sender, document_type }
 */
export async function elencaSpeseRicevute(token, params = {}) {
    try {
        const bearerToken = await resolveToken(token);
        const response = await axios.get(`${ACUBE_BASE_URL}/invoices`, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                Accept: 'application/json',
            },
            params: { ...params, type: 1 },
            timeout: 15000,
        });
        return response.data;
    } catch (err) {
        const detail = err.response?.data || err.message;
        logger.error('[AcubeAPI] Errore lista spese ricevute', { detail });
        throw new Error(`AcubeAPI errore spese ricevute: ${JSON.stringify(detail)}`);
    }
}

/**
 * Recupera dettaglio singola fattura passiva
 * GET /invoices/{uuid}
 * @param {string|null} token
 * @param {string} uuid *
 * @param {string} apiKey
 * @param {string} uuid
 */
export async function getDettaglioSpesa(token, uuid) {
    try {
        const bearerToken = await resolveToken(token);
        const response = await axios.get(`${ACUBE_BASE_URL}/invoices/${uuid}`, {
            headers: {
                Authorization: `Bearer ${bearerToken}`,
                Accept: 'application/json',
            },
            timeout: 15000,
        });
        return response.data;
    } catch (err) {
        const detail = err.response?.data || err.message;
        logger.error('[AcubeAPI] Errore dettaglio spesa', { uuid, detail });
        throw new Error(`AcubeAPI errore dettaglio: ${JSON.stringify(detail)}`);
    }
}

/**
 * Verifica connessione AcubeAPI usando il master account ElementMedica.
 * I tenant non hanno proprie credenziali ACube: il servizio è centralizzato.
 *
 * @returns {{ ok: boolean, env: string, error?: string }}
 */
export async function testConnessioneAcube(email, password) {
    try {
        // Invalida cache per ottenere un token fresco ad ogni test
        const emailToUse = email || ACUBE_MASTER_EMAIL;
        const passwordToUse = password || ACUBE_MASTER_PASSWORD;
        invalidateAcubeToken(emailToUse);
        const token = await getAcubeToken(emailToUse, passwordToUse);
        await elencaFatture(token, { limit: 1 });
        return { ok: true, env: ACUBE_ENV };
    } catch (err) {
        logger.error('Test connessione Acube fallito', { error: err.message });
        return { ok: false, env: ACUBE_ENV, error: 'Connessione ad Acube fallita' };
    }
}

// ============================================================================
// COSTRUZIONE OGGETTO FATTURAPA
// ============================================================================

/**
 * Status mapping da AcubeAPI a enum interno
 */
export const ACUBE_STATUS_MAP = {
    WAITING: 'WAITING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    NOT_DELIVERED: 'NOT_DELIVERED',
    REJECTED: 'REJECTED',
};

/**
 * Tipo documento mapping
 */
export const TIPO_DOCUMENTO_MAP = {
    FATTURA: 'TD01',
    ACCONTO: 'TD02',
    NOTA_CREDITO: 'TD04',
    NOTA_DEBITO: 'TD05',
};

/**
 * Formatta un numero come stringa decimale con punto separatore.
 * ACube richiede stringhe tipo "22.00", "100.00", "1.00" (min 4 chars)
 * @param {number|string|null|undefined} val
 * @param {number} [decimals=2]
 * @returns {string}
 */
function fmt(val, decimals = 2) {
    const n = Number(val) || 0;
    return n.toFixed(decimals);
}

/**
 * Costruisce il payload FatturaPA da una FatturaElettronica interna
 *
 * Specifiche AcubeAPI (snake_case, stringhe per numerici):
 * - dati_trasmissione: OBBLIGATORIO — codice_destinatario "0000000" per PEC, sette zeri = solo email
 * - importo_totale_documento: stringa decimale "100.00"
 * - quantita, prezzo_unitario, prezzo_totale: tutte stringhe decimali
 * - aliquota_iva: stringa decimale "22.00" con punto (non virgola)
 *
 * @param {object} fattura - Record FatturaElettronica con relazioni
 * @returns {object} - Payload FatturaPA per AcubeAPI
 */
export function buildFatturaPA(fattura) {
    const tipoDoc = TIPO_DOCUMENTO_MAP[fattura.tipoDocumento] || 'TD01';

    // progressivo_invio obbligatorio: usa UUID short oppure numero fattura
    const progressivoInvio = (fattura.numero || fattura.id || '1').replace(/[^A-Za-z0-9]/g, '').slice(0, 10) || '1';

    // codice_destinatario: 7 chars alfanumerico (SDI); se PEC usare '0000000' + pec separata
    const codiceDestinatario = fattura.cessionarioSDI
        ? fattura.cessionarioSDI.padEnd(7, '0').slice(0, 7).toUpperCase()
        : '0000000';

    const header = {
        dati_trasmissione: {
            id_trasmittente: {
                id_paese: 'IT',
                id_codice: fattura.cedentePIVA || fattura.cedenteCF || '00000000000',
            },
            progressivo_invio: progressivoInvio,
            formato_trasmissione: fattura.cessionarioPIVA ? 'FPR12' : 'FPR12', // FPR12 = privati/B2C/B2B
            codice_destinatario: codiceDestinatario,
            ...(fattura.cessionarioPEC && codiceDestinatario === '0000000'
                ? { pec_destinatario: fattura.cessionarioPEC }
                : {}),
        },
        cedente_prestatore: {
            dati_anagrafici: {
                id_fiscale_iva: {
                    id_paese: 'IT',
                    id_codice: fattura.cedentePIVA || fattura.cedenteCF,
                },
                ...(fattura.cedenteCF && fattura.cedenteCF.length >= 11
                    ? { codice_fiscale: fattura.cedenteCF }
                    : {}),
                anagrafica: {
                    denominazione: fattura.cedenteDenominazione,
                },
                regime_fiscale: fattura.cedenteRegimeFiscale || 'RF01',
            },
            sede: {
                indirizzo: fattura.cedenteIndirizzo || 'Via Roma 1',
                cap: (fattura.cedenteCAP || '00100').replace(/\D/g, '').padStart(5, '0').slice(0, 5),
                comune: fattura.cedenteCitta || 'Roma',
                provincia: fattura.cedenteProvincia || 'RM',
                nazione: 'IT',
            },
        },
        cessionario_committente: {
            dati_anagrafici: buildCessionarioAnag(fattura),
            sede: buildCessionarioSede(fattura),
        },
    };

    const linee = (fattura.linee || []).map((l, idx) => ({
        numero_linea: idx + 1,
        descrizione: (l.descrizione || 'Prestazione').slice(0, 1000),
        quantita: fmt(l.quantita ?? 1),
        unita_misura: l.unitaMisura || undefined,
        prezzo_unitario: fmt(l.prezzoUnitario),
        prezzo_totale: fmt(l.prezzoTotale),
        aliquota_iva: fmt(l.aliquotaIva ?? 0),
        ...(l.natura ? { natura: l.natura } : {}),
    }));

    const riepilogo = buildRiepilogo(fattura);

    const body = [
        {
            dati_generali: {
                dati_generali_documento: {
                    tipo_documento: tipoDoc,
                    divisa: fattura.divisa || 'EUR',
                    data: formatDate(fattura.dataEmissione),
                    numero: fattura.numero,
                    importo_totale_documento: fmt(fattura.totale),
                },
                ...(fattura.fatturaOrigineId && fattura.tipoDocumento !== 'FATTURA'
                    ? { dati_fatture_collegate: [{ riferimento_numero_linea: [1] }] }
                    : {}),
            },
            dati_beni_servizi: {
                dettaglio_linee: linee,
                dati_riepilogo: riepilogo,
            },
            dati_pagamento: buildDatiPagamento(fattura),
        },
    ];

    return {
        fattura_elettronica_header: header,
        fattura_elettronica_body: body,
    };
}

function buildCessionarioAnag(fattura) {
    const anag = {};
    if (fattura.cessionarioPIVA) {
        anag.id_fiscale_iva = {
            id_paese: 'IT',
            id_codice: fattura.cessionarioPIVA,
        };
    }
    if (fattura.cessionarioCF) {
        anag.codice_fiscale = fattura.cessionarioCF;
    }
    anag.anagrafica = { denominazione: fattura.cessionarioDenominazione };
    return anag;
}

function buildCessionarioSede(fattura) {
    return {
        indirizzo: fattura.cessionarioIndirizzo || '',
        cap: fattura.cessionarioCAP || '00000',
        comune: fattura.cessionarioCitta || '',
        ...(fattura.cessionarioProvincia
            ? { provincia: fattura.cessionarioProvincia }
            : {}),
        nazione: 'IT',
    };
}

function buildRiepilogo(fattura) {
    // Raggruppa per aliquotaIva (supporta multi-aliquota via linee)
    const map = {};
    for (const l of fattura.linee || []) {
        const key = `${l.aliquotaIva}_${l.natura || ''}`;
        if (!map[key]) {
            map[key] = {
                aliquotaIvaVal: Number(l.aliquotaIva) || 0,
                ...(l.natura ? { natura: l.natura } : {}),
                imponibile_importo: 0,
                imposta: 0,
            };
        }
        map[key].imponibile_importo += Number(l.prezzoTotale) || 0;
        map[key].imposta += (Number(l.prezzoTotale) || 0) * ((Number(l.aliquotaIva) || 0) / 100);
    }
    return Object.values(map).map((r) => ({
        aliquota_iva: fmt(r.aliquotaIvaVal),
        ...(r.natura ? { natura: r.natura } : {}),
        imponibile_importo: fmt(r.imponibile_importo),
        imposta: fmt(r.imposta),
    }));
}

function buildDatiPagamento(fattura) {
    if (!fattura.modalitaPagamento) return [];
    return [
        {
            condizioni_pagamento: fattura.condizioniPagamento || 'TP02',
            dettaglio_pagamento: [
                {
                    modalita_pagamento: fattura.modalitaPagamento || 'MP05',
                    ...(fattura.dataScadenza
                        ? { data_scadenza_pagamento: formatDate(fattura.dataScadenza) }
                        : {}),
                    importo_pagamento: fmt(fattura.totale),
                    ...(fattura.iban ? { iban: fattura.iban } : {}),
                },
            ],
        },
    ];
}

function formatDate(d) {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().split('T')[0]; // YYYY-MM-DD
}

function round2(n) {
    return Math.round(n * 100) / 100;
}
