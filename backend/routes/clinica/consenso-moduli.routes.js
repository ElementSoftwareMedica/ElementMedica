/**
 * Consenso Moduli Routes — CRUD per la gestione dei moduli consenso per tenant
 *
 * GET    /impostazioni/consensi-moduli           → Lista moduli (DB + defaults non ancora personalizzati)
 * POST   /impostazioni/consensi-moduli           → Crea/salva modulo personalizzato
 * PUT    /impostazioni/consensi-moduli/:id       → Aggiorna modulo esistente
 * DELETE /impostazioni/consensi-moduli/:id       → Soft delete modulo personalizzato
 * POST   /impostazioni/consensi-moduli/reset/:codice → Ripristina un modulo al default (elimina override DB)
 *
 * @module routes/clinica/consenso-moduli.routes
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import { logger } from '../../utils/logger.js';
import prisma from '../../config/prisma-optimization.js';

// Testi di default (stesso oggetto usato in ConsensoFirmaService)
const TESTI_CONSENSI_DEFAULT = {
    gdpr: {
        codice: 'gdpr',
        titolo: 'Consenso al trattamento dei dati personali (GDPR)',
        sottotitolo: 'Artt. 13–14 del Regolamento UE 2016/679',
        obbligatorio: true,
        ordine: 1,
        validitaGiorni: null,
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
        codice: 'sanitari',
        titolo: 'Consenso al trattamento dei dati sanitari',
        sottotitolo: 'Art. 9 del Regolamento UE 2016/679 — Dati particolari relativi alla salute',
        obbligatorio: true,
        ordine: 2,
        validitaGiorni: null,
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
        codice: 'prestazione',
        titolo: 'Consenso informato alla prestazione sanitaria',
        sottotitolo: 'Consenso al trattamento diagnostico/terapeutico — Legge 219/2017',
        obbligatorio: false,
        ordine: 3,
        validitaGiorni: null,
        testo: `In conformità alla Legge n. 219/2017 (Norme in materia di consenso informato e di disposizioni anticipate di trattamento), dichiaro:

• Di aver ricevuto informazioni esaurienti sulla natura, le finalità, i benefici, i rischi e le possibili alternative alla prestazione sanitaria richiesta
• Di aver avuto la possibilità di porre domande al personale sanitario, che ha risposto in modo chiaro e comprensibile
• Di comprendere che ho il diritto di rifiutare o revocare il presente consenso in qualsiasi momento, senza che ciò pregiudichi la qualità delle cure future
• Di esprimere liberamente e consapevolmente il mio consenso all'esecuzione della prestazione sanitaria

La revoca del consenso può essere comunicata verbalmente al medico o al personale sanitario in qualsiasi momento prima o durante la prestazione.`,
    },
    chirurgico: {
        codice: 'chirurgico',
        titolo: 'Consenso informato a intervento chirurgico/invasivo',
        sottotitolo: 'Interventi in anestesia locale/locoregionale/generale',
        obbligatorio: false,
        ordine: 4,
        validitaGiorni: null,
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
        codice: 'marketing',
        titolo: 'Consenso a comunicazioni marketing',
        sottotitolo: 'Comunicazioni promozionali, informative e iniziative della struttura',
        obbligatorio: false,
        ordine: 5,
        validitaGiorni: 3650,
        testo: `Acconsento a ricevere comunicazioni informative, promozionali e aggiornamenti sui servizi della struttura tramite email, SMS, telefono o altri recapiti forniti.

Il consenso è facoltativo e può essere revocato in qualsiasi momento senza conseguenze sull'erogazione delle prestazioni sanitarie.`,
    },
    comunicazioni: {
        codice: 'comunicazioni',
        titolo: 'Consenso a promemoria e comunicazioni di servizio',
        sottotitolo: 'Reminder appuntamenti, indicazioni operative e comunicazioni amministrative',
        obbligatorio: false,
        ordine: 6,
        validitaGiorni: 3650,
        testo: `Acconsento a ricevere comunicazioni di servizio relative ad appuntamenti, preparazioni, documenti, referti e informazioni amministrative connesse alle prestazioni richieste.

Le comunicazioni potranno avvenire tramite email, SMS, telefono o altri canali indicati in anagrafica.`,
    },
    fse_alimentazione: {
        codice: 'fse_alimentazione',
        titolo: 'Consenso alimentazione Fascicolo Sanitario Elettronico',
        sottotitolo: 'Inserimento dei documenti sanitari nel FSE',
        obbligatorio: false,
        ordine: 7,
        validitaGiorni: 3650,
        testo: `Acconsento all'alimentazione del Fascicolo Sanitario Elettronico con i dati e i documenti sanitari prodotti dalla struttura, secondo la normativa vigente e le indicazioni regionali applicabili.`,
    },
    fse_consultazione: {
        codice: 'fse_consultazione',
        titolo: 'Consenso consultazione Fascicolo Sanitario Elettronico',
        sottotitolo: 'Consultazione del FSE da parte dei professionisti autorizzati',
        obbligatorio: false,
        ordine: 8,
        validitaGiorni: 3650,
        testo: `Acconsento alla consultazione del mio Fascicolo Sanitario Elettronico da parte dei professionisti sanitari autorizzati, limitatamente alle finalità di cura, prevenzione e presa in carico clinica.`,
    },
    fse_pregresso: {
        codice: 'fse_pregresso',
        titolo: 'Consenso recupero dati pregressi FSE',
        sottotitolo: 'Consultazione dei documenti sanitari già presenti nel FSE',
        obbligatorio: false,
        ordine: 9,
        validitaGiorni: 3650,
        testo: `Acconsento al recupero e alla consultazione dei documenti sanitari pregressi presenti nel Fascicolo Sanitario Elettronico, quando utili alla continuità assistenziale e alla valutazione clinica.`,
    },
    mdl_sorveglianza: {
        codice: 'mdl_sorveglianza',
        titolo: 'Consenso sorveglianza sanitaria Medicina del Lavoro',
        sottotitolo: 'D.Lgs. 81/2008 - visite, accertamenti e giudizio di idoneita',
        obbligatorio: true,
        ordine: 10,
        validitaGiorni: 365,
        testo: `Dichiaro di aver ricevuto informazioni sulla sorveglianza sanitaria prevista dal D.Lgs. 81/2008, sugli accertamenti sanitari correlati ai rischi lavorativi e sulle modalita di trattamento della documentazione sanitaria e del giudizio di idoneita.

Acconsento all'esecuzione della visita medica del lavoro e degli accertamenti sanitari previsti dal protocollo sanitario aziendale o indicati dal medico competente, nei limiti delle finalita di prevenzione e tutela della salute nei luoghi di lavoro.`,
    },
};

export { TESTI_CONSENSI_DEFAULT };

const router = express.Router();
router.use(authenticate);

/**
 * GET /impostazioni/consensi-moduli
 * Lista di tutti i moduli consenso per il tenant.
 * Unisce i record DB con i default per quelli non ancora personalizzati.
 */
router.get('/impostazioni/consensi-moduli', requirePermission('impostazioni:read'), async (req, res) => {
    const tenantId = getEffectiveTenantId(req);
    try {
        const dbModuli = await prisma.consensoModulo.findMany({
            where: { tenantId, deletedAt: null },
            orderBy: { ordine: 'asc' },
        });

        const dbByCodice = {};
        for (const m of dbModuli) {
            dbByCodice[m.codice] = m;
        }

        // Merge: defaults first (in ordine), then any extra DB-only modules
        const defaultKeys = Object.keys(TESTI_CONSENSI_DEFAULT);
        const result = [];

        for (const key of defaultKeys) {
            if (dbByCodice[key]) {
                result.push({ ...dbByCodice[key], isDefault: false });
            } else {
                result.push({ ...TESTI_CONSENSI_DEFAULT[key], id: null, isDefault: true, attivo: true, prestazioniIds: [] });
            }
        }

        // Add any custom (non-default) DB modules
        for (const m of dbModuli) {
            if (!TESTI_CONSENSI_DEFAULT[m.codice]) {
                result.push({ ...m, isDefault: false });
            }
        }

        res.json({ success: true, data: result });
    } catch (err) {
        logger.error({ error: 'Operazione non riuscita', tenantId }, 'Errore recupero moduli consenso');
        res.status(500).json({ success: false, error: 'Impossibile recuperare i moduli consenso.' });
    }
});

/**
 * POST /impostazioni/consensi-moduli
 * Crea o sovrascrive un modulo consenso per il tenant.
 * Se il codice esiste già (soft-deleted o meno), fa un upsert.
 */
router.post('/impostazioni/consensi-moduli', requirePermission('impostazioni:write'), async (req, res) => {
    const tenantId = getEffectiveTenantId(req);
    const { codice, titolo, sottotitolo, testo, obbligatorio, attivo, ordine, validitaGiorni, prestazioniIds } = req.body;

    if (!codice || !titolo || !testo) {
        return res.status(400).json({ success: false, error: 'codice, titolo e testo sono obbligatori.' });
    }
    if (codice.length > 50) {
        return res.status(400).json({ success: false, error: 'Il codice non può superare 50 caratteri.' });
    }

    try {
        const modulo = await prisma.consensoModulo.upsert({
            where: { tenantId_codice: { tenantId, codice } },
            create: {
                tenantId,
                codice,
                titolo,
                sottotitolo: sottotitolo || null,
                testo,
                obbligatorio: obbligatorio ?? false,
                attivo: attivo ?? true,
                ordine: typeof ordine === 'number' ? ordine : 0,
                validitaGiorni: validitaGiorni ?? null,
                prestazioniIds: prestazioniIds ?? [],
            },
            update: {
                titolo,
                sottotitolo: sottotitolo || null,
                testo,
                obbligatorio: obbligatorio ?? false,
                attivo: attivo ?? true,
                ordine: typeof ordine === 'number' ? ordine : 0,
                validitaGiorni: validitaGiorni ?? null,
                prestazioniIds: prestazioniIds ?? [],
                deletedAt: null, // Ripristina se era soft-deleted
            },
        });
        res.status(201).json({ success: true, data: modulo });
    } catch (err) {
        logger.error({ error: 'Operazione non riuscita', tenantId, codice }, 'Errore creazione modulo consenso');
        res.status(500).json({ success: false, error: 'Impossibile salvare il modulo consenso.' });
    }
});

/**
 * PUT /impostazioni/consensi-moduli/:id
 * Aggiorna un modulo consenso esistente.
 */
router.put('/impostazioni/consensi-moduli/:id', requirePermission('impostazioni:write'), async (req, res) => {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;
    const { titolo, sottotitolo, testo, obbligatorio, attivo, ordine, validitaGiorni, prestazioniIds } = req.body;

    try {
        const existing = await prisma.consensoModulo.findFirst({
            where: { id, tenantId, deletedAt: null },
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Modulo non trovato.' });
        }

        const updated = await prisma.consensoModulo.update({
            where: { id },
            data: {
                titolo: titolo ?? existing.titolo,
                sottotitolo: sottotitolo !== undefined ? sottotitolo : existing.sottotitolo,
                testo: testo ?? existing.testo,
                obbligatorio: obbligatorio !== undefined ? obbligatorio : existing.obbligatorio,
                attivo: attivo !== undefined ? attivo : existing.attivo,
                ordine: typeof ordine === 'number' ? ordine : existing.ordine,
                validitaGiorni: validitaGiorni !== undefined ? validitaGiorni : existing.validitaGiorni,
                prestazioniIds: prestazioniIds ?? existing.prestazioniIds,
            },
        });
        res.json({ success: true, data: updated });
    } catch (err) {
        logger.error({ error: 'Operazione non riuscita', tenantId, id }, 'Errore aggiornamento modulo consenso');
        res.status(500).json({ success: false, error: 'Impossibile aggiornare il modulo consenso.' });
    }
});

/**
 * DELETE /impostazioni/consensi-moduli/:id
 * Soft delete di un modulo consenso personalizzato.
 * I moduli di default (solo in memoria) non hanno un id DB — non necessitano di delete.
 */
router.delete('/impostazioni/consensi-moduli/:id', requirePermission('impostazioni:write'), async (req, res) => {
    const tenantId = getEffectiveTenantId(req);
    const { id } = req.params;

    try {
        const existing = await prisma.consensoModulo.findFirst({
            where: { id, tenantId, deletedAt: null },
        });
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Modulo non trovato.' });
        }

        await prisma.consensoModulo.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        res.json({ success: true, message: 'Modulo eliminato.' });
    } catch (err) {
        logger.error({ error: 'Operazione non riuscita', tenantId, id }, 'Errore eliminazione modulo consenso');
        res.status(500).json({ success: false, error: 'Impossibile eliminare il modulo consenso.' });
    }
});

/**
 * POST /impostazioni/consensi-moduli/reset/:codice
 * Ripristina un modulo al testo di default eliminando l'override DB.
 */
router.post('/impostazioni/consensi-moduli/reset/:codice', requirePermission('impostazioni:write'), async (req, res) => {
    const tenantId = getEffectiveTenantId(req);
    const { codice } = req.params;

    if (!TESTI_CONSENSI_DEFAULT[codice]) {
        return res.status(400).json({ success: false, error: 'Codice non corrisponde a un modulo di default.' });
    }

    try {
        await prisma.consensoModulo.updateMany({
            where: { tenantId, codice },
            data: { deletedAt: new Date() },
        });
        res.json({ success: true, data: { ...TESTI_CONSENSI_DEFAULT[codice], id: null, isDefault: true, attivo: true, prestazioniIds: [] } });
    } catch (err) {
        logger.error({ error: 'Operazione non riuscita', tenantId, codice }, 'Errore reset modulo consenso');
        res.status(500).json({ success: false, error: 'Impossibile ripristinare il modulo.' });
    }
});

export default router;
