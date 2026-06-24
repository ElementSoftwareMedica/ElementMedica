/**
 * ConsensoFirmaService — Gestione token firma consensi informativi (tablet paziente)
 *
 * Flusso:
 * 1. La segreteria genera un token da AccettazionePazienteModal
 *    → POST /api/v1/clinica/appuntamenti/:id/consenso-token
 * 2. Il paziente apre il link sul tablet
 *    → GET  /api/v1/public/consenso-firma/:token
 * 3. Il paziente legge, firma (canvas) e conferma
 *    → POST /api/v1/public/consenso-firma/:token
 * 4. AccettazionePazienteModal fa polling per rilevare la firma
 *    → GET  /api/v1/clinica/appuntamenti/:id/consenso-status
 *
 * @module services/clinical/ConsensoFirmaService
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';
import ConsentFSEService from '../consent-fse/ConsentFSEService.js';
import { GDPRService } from '../gdpr-service.js';
import { CONSENSI_MODULI_CATALOG } from './consensiModuliCatalog.js';

// Validità del token: 2 ore (il paziente può impiegare del tempo)
const TOKEN_VALIDITY_MS = 2 * 60 * 60 * 1000;

const FSE_CONSENSI_MAP = {
    fse_alimentazione: 'ALIMENTAZIONE',
    fse_consultazione: 'CONSULTAZIONE',
    fse_pregresso: 'PREGRESSO',
};

const MDL_CONSENSI_CODES = ['mdl_sorveglianza'];

/**
 * Testi dei consensi informativi.
 * Vengono restituiti al frontend pubblico per la visualizzazione.
 * In futuro potranno essere personalizzati per tenant tramite CMS.
 */
const TESTI_CONSENSI = {
    gdpr: {
        id: 'gdpr',
        titolo: 'Consenso al trattamento dei dati personali (GDPR)',
        sottotitolo: 'Artt. 13–14 del Regolamento UE 2016/679',
        obbligatorio: true,
        testo: `Ai sensi degli artt. 13–14 del Regolamento UE 2016/679 (GDPR), i dati personali comunicati saranno trattati dal titolare del trattamento esclusivamente per finalità diagnostiche, terapeutiche e di prevenzione, inclusa la redazione della documentazione clinica ed amministrativa necessaria all'erogazione delle prestazioni sanitarie.

I dati potranno essere comunicati ai soli professionisti sanitari coinvolti nella sua cura, alle strutture del SSN in caso di urgenza, nonché agli enti previdenziali e assicurativi nei limiti di legge.

Lei ha il diritto di:
• Accedere ai propri dati e ottenerne copia
• Richiedere la rettifica o la cancellazione
• Richiedere la limitazione del trattamento
• Opporsi al trattamento
• Presentare reclamo all'Autorità Garante per la protezione dei dati personali (www.garanteprivacy.it)

Il titolare del trattamento è disponibile per ulteriori informazioni presso la struttura.`,
    },
    sanitari: {
        id: 'sanitari',
        titolo: 'Consenso al trattamento dei dati sanitari',
        sottotitolo: 'Art. 9 del Regolamento UE 2016/679 — Dati particolari relativi alla salute',
        obbligatorio: true,
        testo: `Ai sensi dell'art. 9 del Regolamento UE 2016/679 (GDPR), i dati sanitari rientrano nelle categorie particolari di dati personali e possono essere trattati solo previo consenso esplicito dell'interessato.

Esprimo il mio consenso esplicito al trattamento dei dati relativi alla mia salute da parte del personale sanitario autorizzato per le seguenti finalità:
• Erogazione delle prestazioni sanitarie richieste
• Redazione e conservazione della documentazione clinica (cartelle cliniche, referti, prescrizioni)
• Comunicazione ai medici curanti e specialisti coinvolti nel percorso di cura
• Trasmissione al medico di medicina generale per continuità delle cure (se applicabile)
• Adempimenti di legge in materia di sorveglianza sanitaria

Il trattamento avviene nel rispetto del segreto professionale e delle misure di sicurezza previste dalla normativa vigente.`,
    },
    prestazione: {
        id: 'prestazione',
        titolo: 'Consenso informato alla prestazione sanitaria',
        sottotitolo: 'Consenso al trattamento diagnostico/terapeutico — Legge 219/2017',
        obbligatorio: false,
        testo: `In conformità alla Legge n. 219/2017 (Norme in materia di consenso informato e di disposizioni anticipate di trattamento), dichiaro:

• Di aver ricevuto informazioni esaurienti sulla natura, le finalità, i benefici, i rischi e le possibili alternative alla prestazione sanitaria richiesta
• Di aver avuto la possibilità di porre domande al personale sanitario, che ha risposto in modo chiaro e comprensibile
• Di comprendere che ho il diritto di rifiutare o revocare il presente consenso in qualsiasi momento, senza che ciò pregiudichi la qualità delle cure future
• Di esprimere liberamente e consapevolmente il mio consenso all'esecuzione della prestazione sanitaria

La revoca del consenso può essere comunicata verbalmente al medico o al personale sanitario in qualsiasi momento prima o durante la prestazione.`,
    },
    chirurgico: {
        id: 'chirurgico',
        titolo: 'Consenso informato a intervento chirurgico/invasivo',
        sottotitolo: 'Interventi in anestesia locale/locoregionale/generale',
        obbligatorio: false,
        testo: `Dichiaro di essere stato informato dal medico curante in merito all'intervento chirurgico/procedura invasiva proposta:

• Natura dell'intervento: tipo di procedura, approccio chirurgico / anestesiologico previsto
• Finalità terapeutica o diagnostica dell'intervento
• Rischi specifici e generali, inclusi quelli anestesiologici
• Possibili complicanze intraoperatorie e postoperatorie (precoci e tardive)
• Tempi di recupero attesi e limitazioni post-intervento
• Alternative terapeutiche disponibili e conseguenze del rifiuto

Esprimo il mio consenso LIBERO E INFORMATO all'esecuzione dell'intervento e delle procedure anestesiologiche connesse, autorizzando il team chirurgico a eseguire eventuali manovre indispensabili per la mia incolumità qualora si rendessero necessarie durante l'intervento.`,
    },
    marketing: {
        id: 'marketing',
        titolo: 'Consenso a comunicazioni marketing',
        sottotitolo: 'Comunicazioni promozionali, informative e iniziative della struttura',
        obbligatorio: false,
        testo: `Acconsento a ricevere comunicazioni informative, promozionali e aggiornamenti sui servizi della struttura tramite email, SMS, telefono o altri recapiti forniti.

Il consenso è facoltativo e può essere revocato in qualsiasi momento senza conseguenze sull'erogazione delle prestazioni sanitarie.`,
    },
    comunicazioni: {
        id: 'comunicazioni',
        titolo: 'Consenso a promemoria e comunicazioni di servizio',
        sottotitolo: 'Reminder appuntamenti, indicazioni operative e comunicazioni amministrative',
        obbligatorio: false,
        testo: `Acconsento a ricevere comunicazioni di servizio relative ad appuntamenti, preparazioni, documenti, referti e informazioni amministrative connesse alle prestazioni richieste.

Le comunicazioni potranno avvenire tramite email, SMS, telefono o altri canali indicati in anagrafica.`,
    },
    fse_alimentazione: {
        id: 'fse_alimentazione',
        titolo: 'Consenso alimentazione Fascicolo Sanitario Elettronico',
        sottotitolo: 'Inserimento dei documenti sanitari nel FSE',
        obbligatorio: false,
        testo: `Acconsento all'alimentazione del Fascicolo Sanitario Elettronico con i dati e i documenti sanitari prodotti dalla struttura, secondo la normativa vigente e le indicazioni regionali applicabili.`,
    },
    fse_consultazione: {
        id: 'fse_consultazione',
        titolo: 'Consenso consultazione Fascicolo Sanitario Elettronico',
        sottotitolo: 'Consultazione del FSE da parte dei professionisti autorizzati',
        obbligatorio: false,
        testo: `Acconsento alla consultazione del mio Fascicolo Sanitario Elettronico da parte dei professionisti sanitari autorizzati, limitatamente alle finalità di cura, prevenzione e presa in carico clinica.`,
    },
    fse_pregresso: {
        id: 'fse_pregresso',
        titolo: 'Consenso recupero dati pregressi FSE',
        sottotitolo: 'Consultazione dei documenti sanitari già presenti nel FSE',
        obbligatorio: false,
        testo: `Acconsento al recupero e alla consultazione dei documenti sanitari pregressi presenti nel Fascicolo Sanitario Elettronico, quando utili alla continuità assistenziale e alla valutazione clinica.`,
    },
    mdl_sorveglianza: {
        id: 'mdl_sorveglianza',
        titolo: 'Consenso sorveglianza sanitaria Medicina del Lavoro',
        sottotitolo: 'D.Lgs. 81/2008 - visite, accertamenti e giudizio di idoneita',
        obbligatorio: true,
        testo: `Dichiaro di aver ricevuto informazioni sulla sorveglianza sanitaria prevista dal D.Lgs. 81/2008, sugli accertamenti sanitari correlati ai rischi lavorativi e sulle modalita di trattamento della documentazione sanitaria e del giudizio di idoneita.

Acconsento all'esecuzione della visita medica del lavoro e degli accertamenti sanitari previsti dal protocollo sanitario aziendale o indicati dal medico competente, nei limiti delle finalita di prevenzione e tutela della salute nei luoghi di lavoro.`,
    },
};

class ConsensoFirmaService {
    /**
     * Genera un token univoco per la firma consensi su tablet.
     * Invalida i token precedenti non ancora firmati per questo appuntamento.
     *
     * @param {Object} params
     * @param {string} params.appuntamentoId - ID appuntamento
     * @param {string} params.tenantId - ID tenant
     * @param {string[]} params.documentiDaMostrare - Tipi documento: ['gdpr','sanitari','prestazione',...]
     * @param {string} params.createdBy - PersonId della segreteria che genera il token
     * @returns {Promise<{token: string, url: string, expiresAt: Date}>}
     */
    async generateToken({ appuntamentoId, tenantId, documentiDaMostrare, createdBy }) {
        // Verifica appuntamento
        const appuntamento = await prisma.appuntamento.findFirst({
            where: { id: appuntamentoId, tenantId, deletedAt: null }
        });
        if (!appuntamento) {
            throw new Error('Appuntamento non trovato');
        }

        // Invalida token precedenti non firmati per questo appuntamento (stesso tenant)
        const existing = await prisma.consensoFirmaToken.findMany({
            where: { appuntamentoId, tenantId, firmatoAt: null }
        });
        if (existing.length > 0) {
            await prisma.consensoFirmaToken.deleteMany({
                where: { id: { in: existing.map(t => t.id) } }
            });
        }

        const expiresAt = new Date(Date.now() + TOKEN_VALIDITY_MS);

        const record = await prisma.consensoFirmaToken.create({
            data: {
                appuntamentoId,
                tenantId,
                documentiDaMostrare,
                expiresAt,
                createdBy,
            }
        });

        logger.info({
            component: 'ConsensoFirmaService',
            action: 'generateToken',
            appuntamentoId,
            tokenId: record.id,
            documentiDaMostrare,
            tenantId
        }, 'Token consenso generato');

        await this._logConsentAudit({
            tenantId,
            personId: appuntamento.pazienteId,
            appuntamentoId,
            tokenId: record.id,
            action: 'CONSENT_TOKEN_CREATED',
            details: { documentiDaMostrare, createdBy: createdBy || null },
        });

        return {
            token: record.token,
            expiresAt: record.expiresAt,
        };
    }

    /**
     * Verifica quali consensi sono ancora validi per un paziente.
     * Solo i moduli con validitaGiorni != null vengono considerati "a scadenza".
     * validitaGiorni = null → SEMPRE obbligatorio (nessuna validità cross-appuntamento).
     *
     * @param {string} tenantId
     * @param {string} pazienteId
     * @param {string|null} excludeAppuntamentoId - appuntamento corrente (da escludere)
     * @returns {Promise<Record<string, Date>>} codice → firmatoAt dell'ultima firma valida
     */
    async _getValidConsensiForPaziente(tenantId, pazienteId, excludeAppuntamentoId) {
        // Default validità: GDPR e dati sanitari valgono 365 giorni (una volta per tenant)
        const DEFAULT_VALIDITA_GIORNI = {
            gdpr: 365,
            sanitari: 365,
            marketing: 3650,
            comunicazioni: 3650,
            fse_alimentazione: 3650,
            fse_consultazione: 3650,
            fse_pregresso: 3650,
        };

        // Leggi validitaGiorni dai moduli configurati nel DB per questo tenant
        let moduliMap = {};
        try {
            const moduli = await prisma.consensoModulo.findMany({
                where: { tenantId, deletedAt: null, attivo: true },
                select: { codice: true, validitaGiorni: true },
            });
            for (const m of moduli) {
                moduliMap[m.codice] = m.validitaGiorni;
            }
        } catch (_) { /* ignora — usa solo defaults */ }

        // Cerca i token firmati precedenti per questo paziente (escludi appuntamento corrente)
        const where = {
            tenantId,
            firmatoAt: { not: null },
            appuntamento: { pazienteId },
        };
        if (excludeAppuntamentoId) {
            where.appuntamentoId = { not: excludeAppuntamentoId };
        }

        const prevTokens = await prisma.consensoFirmaToken.findMany({
            where,
            orderBy: { firmatoAt: 'desc' },
            take: 50,
            select: { firmatoAt: true, firmatoConsensi: true },
        });

        const now = Date.now();
        const valid = {};
        for (const tok of prevTokens) {
            for (const codice of (tok.firmatoConsensi || [])) {
                if (valid[codice]) continue; // già trovato uno valido
                // Se il modulo DB ha validitaGiorni impostato (> 0), usa quello.
                // Se null/undefined (non configurato), fallback al default (365 per gdpr/sanitari).
                // Se non c'è default (es. prestazione), null → nessuna carry-over.
                const customGiorni = moduliMap.hasOwnProperty(codice) ? moduliMap[codice] : undefined;
                const giorni = (customGiorni !== null && customGiorni !== undefined)
                    ? customGiorni
                    : (DEFAULT_VALIDITA_GIORNI[codice] ?? null);
                if (giorni === null || giorni === undefined || giorni <= 0) continue;
                const expiryMs = new Date(tok.firmatoAt).getTime() + giorni * 24 * 60 * 60 * 1000;
                if (now < expiryMs) {
                    valid[codice] = tok.firmatoAt;
                }
            }
        }

        try {
            const fseConsents = await prisma.consentFSE.findMany({
                where: {
                    tenantId,
                    personId: pazienteId,
                    consentGiven: true,
                    revokedAt: null,
                    deletedAt: null,
                    tipoConsenso: { in: Object.values(FSE_CONSENSI_MAP) },
                },
                select: { tipoConsenso: true, validFrom: true, validUntil: true },
            });
            const codeByTipo = Object.entries(FSE_CONSENSI_MAP)
                .reduce((acc, [codice, tipo]) => ({ ...acc, [tipo]: codice }), {});
            for (const consent of fseConsents) {
                if (consent.validUntil && new Date(consent.validUntil).getTime() < now) continue;
                const codice = codeByTipo[consent.tipoConsenso];
                if (codice && !valid[codice]) {
                    valid[codice] = consent.validFrom;
                }
            }
        } catch (err) {
            logger.warn({
                component: 'ConsensoFirmaService',
                action: '_getValidConsensiForPaziente',
                error: err.message,
                pazienteId,
            }, 'Impossibile includere consensi FSE nel riepilogo validita');
        }

        return valid;
    }

    async _logConsentAudit({ tenantId, personId, appuntamentoId, tokenId, action, details, ipAddress, userAgent }) {
        if (!tenantId) return;
        try {
            await prisma.gdprAuditLog.create({
                data: {
                    tenantId,
                    personId: personId || null,
                    action,
                    resourceType: 'ConsensoFirmaToken',
                    resourceId: tokenId || appuntamentoId || null,
                    dataAccessed: {
                        ...(details || {}),
                        appuntamentoId: appuntamentoId || null,
                        tokenId: tokenId || null,
                    },
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                },
            });
        } catch (err) {
            logger.warn({
                component: 'ConsensoFirmaService',
                action: '_logConsentAudit',
                error: err.message,
                appuntamentoId,
            }, 'Audit consenso non registrato');
        }
    }

    async _syncFseConsentsFromSignedToken({ tokenRecord, firmatoConsensi, firmatoPazienteNome }) {
        const fseCodes = (firmatoConsensi || []).filter(codice => FSE_CONSENSI_MAP[codice]);
        if (fseCodes.length === 0) return;

        const appointment = await prisma.appuntamento.findFirst({
            where: { id: tokenRecord.appuntamentoId, tenantId: tokenRecord.tenantId, deletedAt: null },
            select: { pazienteId: true },
        });
        if (!appointment?.pazienteId) return;

        const validUntil = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000);
        for (const codice of fseCodes) {
            await ConsentFSEService.upsertConsent({
                personId: appointment.pazienteId,
                tipoConsenso: FSE_CONSENSI_MAP[codice],
                consentGiven: true,
                modalitaRaccolta: 'DIGITALE_FIRMA_GRAFOMETRICA',
                documentoRiferimento: tokenRecord.id,
                validUntil,
                tenantId: tokenRecord.tenantId,
                createdBy: tokenRecord.createdBy || null,
            });
        }

        await this._logConsentAudit({
            tenantId: tokenRecord.tenantId,
            personId: appointment.pazienteId,
            appuntamentoId: tokenRecord.appuntamentoId,
            tokenId: tokenRecord.id,
            action: 'CONSENT_FSE_SYNC_FROM_TABLET',
            details: { fseCodes, firmatoPazienteNome: firmatoPazienteNome || null },
        });
    }

    /**
     * Sincronizza i consensi firmati su tablet nel sistema GDPR (ConsentRecord).
     * Mirror di _syncFseConsentsFromSignedToken: il vocabolario è identico
     * (ConsentRecord.consentType === ConsensoModulo.codice), così i consensi
     * firmati a tablet compaiono e sono gestibili dalle pagine /gdpr.
     *
     * @param {Object} params
     * @param {Object} params.tokenRecord - record ConsensoFirmaToken pre-firma
     * @param {string[]} params.firmatoConsensi - codici consenso accettati
     * @param {string} [params.ipAddress]
     * @param {string} [params.userAgent]
     */
    async _syncGdprConsentsFromSignedToken({ tokenRecord, firmatoConsensi, ipAddress, userAgent }) {
        const codici = (firmatoConsensi || []).filter(Boolean);
        if (codici.length === 0) return;

        const appointment = await prisma.appuntamento.findFirst({
            where: { id: tokenRecord.appuntamentoId, tenantId: tokenRecord.tenantId, deletedAt: null },
            select: { pazienteId: true },
        });
        if (!appointment?.pazienteId) return;

        const titoloByCodice = {};
        for (const m of CONSENSI_MODULI_CATALOG) titoloByCodice[m.codice] = m.titolo;

        const synced = [];
        for (const codice of codici) {
            try {
                await GDPRService.upsertConsent(appointment.pazienteId, codice, true, {
                    purpose: titoloByCodice[codice] || `Consenso "${codice}" firmato su tablet`,
                    legalBasis: 'consent',
                    tenantId: tokenRecord.tenantId,
                    ipAddress,
                    userAgent,
                    source: 'TABLET_FIRMA',
                });
                synced.push(codice);
            } catch (err) {
                logger.warn({ component: 'ConsensoFirmaService', codice, err: err.message }, 'Sync GDPR consenso non riuscita');
            }
        }

        if (synced.length > 0) {
            await this._logConsentAudit({
                tenantId: tokenRecord.tenantId,
                personId: appointment.pazienteId,
                appuntamentoId: tokenRecord.appuntamentoId,
                tokenId: tokenRecord.id,
                action: 'CONSENT_GDPR_SYNC_FROM_TABLET',
                details: { syncedCodici: synced },
            });
        }
    }

    /**
     * Valida un token e restituisce i dati per la pagina consenso.
     * Usato dalla pagina pubblica su tablet.
     *
     * @param {string} token - UUID del token
     * @returns {Promise<Object>} Dati per la pagina consenso
     */
    async validateAndGetConsenso(token) {
        const record = await prisma.consensoFirmaToken.findUnique({
            where: { token },
            include: {
                appuntamento: {
                    select: {
                        id: true,
                        dataOra: true,
                        pazienteId: true,
                        paziente: {
                            select: {
                                firstName: true,
                                lastName: true,
                                birthDate: true,   // to detect minors on frontend
                            }
                        },
                        prestazione: {
                            select: { nome: true }
                        }
                    }
                }
            }
        });

        if (!record) {
            throw new Error('TOKEN_NOT_FOUND');
        }
        if (new Date() > record.expiresAt) {
            throw new Error('TOKEN_EXPIRED');
        }
        if (record.firmatoAt) {
            throw new Error('TOKEN_ALREADY_USED');
        }

        // Costruisci i documenti da mostrare in ordine garantito
        // Prima controlla il DB per eventuali override del tenant, poi fallback ai default
        const documenti = await this.getDocumentiPerIds(record.tenantId, record.documentiDaMostrare);

        // Controlla quali consensi sono già validi per questo paziente (cross-appuntamento)
        let preSignedConsensi = [];
        if (record.appuntamento.pazienteId) {
            try {
                const valid = await this._getValidConsensiForPaziente(
                    record.tenantId,
                    record.appuntamento.pazienteId,
                    record.appuntamento.id,
                );
                preSignedConsensi = Object.keys(valid);
            } catch (_) { /* non blocca la pagina */ }
        }

        return {
            tokenId: record.id,
            appuntamento: {
                dataOra: record.appuntamento.dataOra,
                prestazione: record.appuntamento.prestazione?.nome || 'Visita medica',
                paziente: {
                    firstName: record.appuntamento.paziente?.firstName,
                    lastName: record.appuntamento.paziente?.lastName,
                    birthDate: record.appuntamento.paziente?.birthDate,
                }
            },
            documenti,
            expiresAt: record.expiresAt,
            preSignedConsensi,   // codici consensi già firmati e ancora validi da sessioni precedenti
        };
    }

    /**
     * Registra la firma del paziente.
     * Chiamato dalla pagina pubblica dopo che il paziente ha firmato.
     *
     * @param {Object} params
     * @param {string} params.token - UUID del token
     * @param {string} params.firmaImmagine - base64 PNG della firma canvas
     * @param {string[]} params.firmatoConsensi - Documento ids accettati ['gdpr','sanitari',...]
     * @param {string} [params.firmatoPazienteNome] - Nome dichiarato dal paziente
     * @returns {Promise<Object>} Record aggiornato
     */
    async submitFirma({ token, firmaImmagine, firmatoConsensi, firmatoPazienteNome, ipAddress, userAgent }) {
        const record = await prisma.consensoFirmaToken.findUnique({ where: { token } });

        if (!record) throw new Error('TOKEN_NOT_FOUND');
        if (new Date() > record.expiresAt) throw new Error('TOKEN_EXPIRED');
        if (record.firmatoAt) throw new Error('TOKEN_ALREADY_USED');

        const updated = await prisma.consensoFirmaToken.update({
            where: { token },
            data: {
                firmatoAt: new Date(),
                firmaImmagine,
                firmatoConsensi,
                firmatoPazienteNome: firmatoPazienteNome || null,
            }
        });

        const appointment = await prisma.appuntamento.findFirst({
            where: { id: record.appuntamentoId, tenantId: record.tenantId, deletedAt: null },
            select: { pazienteId: true },
        });

        await this._syncFseConsentsFromSignedToken({
            tokenRecord: record,
            firmatoConsensi,
            firmatoPazienteNome,
        });

        // Sync verso il sistema GDPR (ConsentRecord) — vocabolario unico codice↔consentType
        await this._syncGdprConsentsFromSignedToken({
            tokenRecord: record,
            firmatoConsensi,
            ipAddress,
            userAgent,
        });

        await this._logConsentAudit({
            tenantId: record.tenantId,
            personId: appointment?.pazienteId || null,
            appuntamentoId: record.appuntamentoId,
            tokenId: record.id,
            action: 'CONSENT_SIGNED_ON_TABLET',
            details: { firmatoConsensi, firmatoPazienteNome: firmatoPazienteNome || null },
            ipAddress,
            userAgent,
        });

        logger.info({
            component: 'ConsensoFirmaService',
            action: 'submitFirma',
            tokenId: record.id,
            appuntamentoId: record.appuntamentoId,
            firmatoConsensi,
            tenantId: record.tenantId
        }, 'Consensi firmati dal paziente');

        return updated;
    }

    /**
     * Controlla lo stato dei consensi per un appuntamento.
     * Usato da AccettazionePazienteModal per polling.
     *
     * @param {string} appuntamentoId
     * @param {string} tenantId
     * @returns {Promise<Object>} Stato consensi
     */
    async getStatus(appuntamentoId, tenantId) {
        // Cerca il token firmato più recente (conferma che il consenso è stato dato)
        const signedToken = await prisma.consensoFirmaToken.findFirst({
            where: { appuntamentoId, tenantId, firmatoAt: { not: null } },
            orderBy: { firmatoAt: 'desc' },
        });

        // Cerca il token attivo non ancora firmato (in attesa di firma)
        const activeToken = await prisma.consensoFirmaToken.findFirst({
            where: { appuntamentoId, tenantId, firmatoAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
        });

        // Controlla consensi validi cross-appuntamento per questo paziente
        // e calcola i moduli applicabili in base alla prestazione dell'appuntamento
        let validConsensiPerPaziente = {};
        let moduliApplicabili = [];
        try {
            const appt = await prisma.appuntamento.findFirst({
                where: { id: appuntamentoId, tenantId },
                select: { pazienteId: true, prestazioneId: true, tipoVisitaMDL: true },
            });
            if (appt?.pazienteId) {
                validConsensiPerPaziente = await this._getValidConsensiForPaziente(
                    tenantId,
                    appt.pazienteId,
                    appuntamentoId,
                );
            }
            // Moduli attivi che si applicano alla prestazione di questo appuntamento
            const moduli = await prisma.consensoModulo.findMany({
                where: { tenantId, attivo: true, deletedAt: null },
                select: { codice: true, ordine: true, prestazioniIds: true },
                orderBy: { ordine: 'asc' },
            });
            moduliApplicabili = moduli
                .filter(m =>
                    m.prestazioniIds.length === 0 ||
                    (appt?.prestazioneId && m.prestazioniIds.includes(appt.prestazioneId))
                )
                .map(m => m.codice);
            if (appt?.tipoVisitaMDL) {
                for (const codice of MDL_CONSENSI_CODES) {
                    if (!moduliApplicabili.includes(codice)) {
                        moduliApplicabili.push(codice);
                    }
                }
            }
        } catch (_) { /* non blocca */ }

        // Aggiungi i consensi firmati di QUESTO appuntamento a validConsensiPerPaziente
        // in modo che il frontend li veda come "già validi" e non li ripresenti
        if (signedToken?.firmatoConsensi) {
            for (const codice of signedToken.firmatoConsensi) {
                if (!validConsensiPerPaziente[codice]) {
                    validConsensiPerPaziente[codice] = signedToken.firmatoAt;
                }
            }
        }

        return {
            firmato: !!signedToken?.firmatoAt,
            firmatoAt: signedToken?.firmatoAt ?? null,
            firmatoConsensi: signedToken?.firmatoConsensi ?? [],
            firmatoPazienteNome: signedToken?.firmatoPazienteNome ?? null,
            tokenAttivo: !!activeToken,
            expiresAt: activeToken?.expiresAt ?? signedToken?.expiresAt ?? null,
            validConsensiPerPaziente,
            moduliApplicabili,
        };
    }

    /**
     * Pulisce i token scaduti (chiamabile da un job periodico).
     */
    async cleanupExpiredTokens() {
        const deleted = await prisma.consensoFirmaToken.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
                firmatoAt: null
            }
        });
        logger.info({ count: deleted.count }, 'Token consenso scaduti rimossi');
        return deleted.count;
    }

    /**
     * Carica i documenti da mostrare al paziente.
     * Controlla prima il DB per personalizzazioni del tenant, poi fallback ai default.
     *
     * @param {string} tenantId
     * @param {string[]} ids - codici dei documenti richiesti
     * @returns {Promise<Object[]>}
     */
    async getDocumentiPerIds(tenantId, ids) {
        let dbModuli = [];
        try {
            dbModuli = await prisma.consensoModulo.findMany({
                where: {
                    tenantId,
                    codice: { in: ids },
                    attivo: true,
                    deletedAt: null,
                },
            });
        } catch (_err) {
            // Tabella potrebbe non esistere ancora — usa solo i default
        }

        const dbByCodice = {};
        for (const m of dbModuli) {
            dbByCodice[m.codice] = m;
        }

        return ids
            .map(id => {
                if (dbByCodice[id]) {
                    const m = dbByCodice[id];
                    return { id: m.codice, titolo: m.titolo, sottotitolo: m.sottotitolo, testo: m.testo, obbligatorio: m.obbligatorio };
                }
                const def = TESTI_CONSENSI[id];
                return def ? { id: def.id, titolo: def.titolo, sottotitolo: def.sottotitolo, testo: def.testo, obbligatorio: def.obbligatorio } : null;
            })
            .filter(Boolean);
    }

    /**
     * Restituisce i testi dei consensi disponibili (usato dall'admin per configurazione).
     */
    getDocumentiDisponibili() {
        return Object.values(TESTI_CONSENSI).map(({ id, titolo, sottotitolo, obbligatorio }) => ({
            id, titolo, sottotitolo, obbligatorio
        }));
    }
}

export default new ConsensoFirmaService();
