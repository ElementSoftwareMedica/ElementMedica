/**
 * Rischio Prestazione Routes - P56 Medicina del Lavoro
 * 
 * API per gestione mapping rischi → prestazioni obbligatorie
 * secondo D.Lgs 81/08. Permette di:
 * - Configurare le prestazioni per ogni rischio
 * - Calcolare automaticamente le prestazioni per un lavoratore
 * - Seed dei dati standard da normativa
 * 
 * @module routes/clinica/rischio-prestazioni.routes
 */

import express from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import RischioPrestazioneService, { DEFAULT_RISCHIO_PRESTAZIONI, CATALOGO_PRESTAZIONI_MDL } from '../../services/clinical/RischioPrestazioneService.js';
import { getEffectiveTenantId } from '../../utils/tenantHelper.js';
import logger from '../../utils/logger.js';
import { validateParamId, validateParam } from '../../middleware/validateUUID.js';

const router = express.Router();
router.param('id', validateParamId);
router.param('personId', validateParam('personId'));

/**
 * Catalogo rischi con informazioni dettagliate
 * Secondo D.Lgs 81/08 e normativa correlata
 */
const CATALOGO_RISCHI = {
    // RISCHI FISICI
    RUM: { nome: 'Rumore', categoria: 'FISICI', normativa: 'Art. 190-192 D.Lgs 81/08', periodicita: 12 },
    VIB_MB: { nome: 'Vibrazioni mano-braccio', categoria: 'FISICI', normativa: 'Art. 200-202 D.Lgs 81/08', periodicita: 12 },
    VIB_WBV: { nome: 'Vibrazioni corpo intero', categoria: 'FISICI', normativa: 'Art. 200-202 D.Lgs 81/08', periodicita: 12 },
    RAD_ION: { nome: 'Radiazioni ionizzanti', categoria: 'FISICI', normativa: 'D.Lgs 101/2020', periodicita: 6 },
    RAD_NIR: { nome: 'Radiazioni non ionizzanti', categoria: 'FISICI', normativa: 'Art. 180 D.Lgs 81/08', periodicita: 12 },
    CEM: { nome: 'Campi elettromagnetici', categoria: 'FISICI', normativa: 'Art. 206-212 D.Lgs 81/08', periodicita: 12 },
    MIC: { nome: 'Microclima severo', categoria: 'FISICI', normativa: 'Art. 180 D.Lgs 81/08', periodicita: 12 },

    // RISCHI CHIMICI
    CHI: { nome: 'Agenti chimici', categoria: 'CHIMICI', normativa: 'Art. 221-232 D.Lgs 81/08', periodicita: 12 },
    CAN: { nome: 'Agenti cancerogeni/mutageni', categoria: 'CHIMICI', normativa: 'Art. 233-245 D.Lgs 81/08', periodicita: 6 },
    AMI: { nome: 'Amianto', categoria: 'CHIMICI', normativa: 'Art. 246-261 D.Lgs 81/08', periodicita: 12 },
    PIO: { nome: 'Piombo e composti', categoria: 'CHIMICI', normativa: 'Art. 229 D.Lgs 81/08', periodicita: 6 },

    // RISCHI BIOLOGICI
    BIO: { nome: 'Agenti biologici', categoria: 'BIOLOGICI', normativa: 'Art. 266-286 D.Lgs 81/08', periodicita: 12 },

    // RISCHI ERGONOMICI
    MMC: { nome: 'Movimentazione manuale carichi', categoria: 'ERGONOMICI', normativa: 'Art. 167-171 D.Lgs 81/08', periodicita: 12 },
    MOV_RIP: { nome: 'Movimenti ripetitivi', categoria: 'ERGONOMICI', normativa: 'Allegato XXXIII D.Lgs 81/08', periodicita: 12 },
    POS: { nome: 'Posture incongrue', categoria: 'ERGONOMICI', normativa: 'Allegato XXXIII D.Lgs 81/08', periodicita: 12 },

    // RISCHI ORGANIZZATIVI
    NOT: { nome: 'Lavoro notturno', categoria: 'ORGANIZZATIVI', normativa: 'D.Lgs 66/2003 Art. 14', periodicita: 12 },
    VDT: { nome: 'Videoterminale', categoria: 'ORGANIZZATIVI', normativa: 'Art. 172-178 D.Lgs 81/08', periodicita: 24 },
    SLC: { nome: 'Stress lavoro-correlato', categoria: 'ORGANIZZATIVI', normativa: 'Art. 28 D.Lgs 81/08', periodicita: 12 },

    // RISCHI SPECIFICI
    QUO: { nome: 'Lavoro in quota', categoria: 'SPECIFICI', normativa: 'Art. 107 D.Lgs 81/08', periodicita: 12 },
    SPA_CON: { nome: 'Spazi confinati', categoria: 'SPECIFICI', normativa: 'DPR 177/2011', periodicita: 12 },
    GUI_MEZ: { nome: 'Guida automezzi', categoria: 'SPECIFICI', normativa: 'Art. 168 CdS', periodicita: 12 },

    // RISCHI SETTORIALI
    CAR_ELE: { nome: 'Carrelli elevatori', categoria: 'SETTORIALI', normativa: 'Accordo CSR 22/02/2012', periodicita: 12 },
    ELE: { nome: 'Rischio elettrico', categoria: 'SETTORIALI', normativa: 'Art. 80-87 D.Lgs 81/08', periodicita: 12 },
    INC: { nome: 'Rischio incendio', categoria: 'SETTORIALI', normativa: 'DM 10/03/1998', periodicita: 12 },
    ISO: { nome: 'Lavoro isolato', categoria: 'SETTORIALI', normativa: 'Art. 15 D.Lgs 81/08', periodicita: 12 },
    IPE: { nome: 'Lavori con funi/ipogei', categoria: 'SETTORIALI', normativa: 'Art. 116-121 D.Lgs 81/08', periodicita: 12 },
    POL: { nome: 'Polveri/silice', categoria: 'SETTORIALI', normativa: 'Art. 225 D.Lgs 81/08', periodicita: 12 },
    ALC: { nome: 'Alcol/sostanze psicotrope', categoria: 'SETTORIALI', normativa: 'L. 125/2001', periodicita: 12 }
};

/**
 * @route GET /api/v1/clinica/rischio-prestazioni/catalogo
 * @desc Catalogo completo dei rischi lavorativi con prestazioni da normativa
 * @access Private - VIEW_VISITA
 */
router.get('/catalogo', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const { categoria } = req.query;

        let rischi = Object.entries(CATALOGO_RISCHI).map(([codice, info]) => {
            // Recupera le prestazioni obbligatorie da normativa per questo rischio
            const defaultPrestazioni = DEFAULT_RISCHIO_PRESTAZIONI[codice] || [];

            // Trasforma i codici prestazione in nomi human-readable
            const prestazioniObbligatorie = defaultPrestazioni
                .filter(p => p.obbligatoria)
                .map(p => {
                    const prestazioneInfo = CATALOGO_PRESTAZIONI_MDL[p.codice];
                    return prestazioneInfo ? prestazioneInfo.nome : p.codice;
                });

            // Descrizione più dettagliata del rischio
            const descrizioni = {
                RUM: 'Esposizione a livelli di rumore superiori ai limiti di legge che possono causare ipoacusia professionale.',
                VIB_MB: 'Esposizione a vibrazioni trasmesse al sistema mano-braccio che possono causare sindrome di Raynaud e angioneuropatia.',
                VIB_WBV: 'Esposizione a vibrazioni trasmesse al corpo intero che possono causare lombalgie e patologie vertebrali.',
                RAD_ION: 'Esposizione a radiazioni ionizzanti che possono causare danni biologici alle cellule e ai tessuti.',
                RAD_NIR: 'Esposizione a radiazioni non ionizzanti (UV, IR, laser) che possono causare danni oculari e cutanei.',
                CEM: 'Esposizione a campi elettromagnetici che possono causare effetti biologici diretti e indiretti.',
                MIC: 'Esposizione a condizioni microclimatiche severe (caldo/freddo estremo) che possono compromettere la termoregolazione.',
                CHI: 'Esposizione ad agenti chimici pericolosi che possono causare intossicazioni acute o croniche.',
                CAN: 'Esposizione ad agenti cancerogeni o mutageni che possono causare tumori professionali.',
                AMI: 'Esposizione a fibre di amianto che possono causare asbestosi, mesotelioma e carcinoma polmonare.',
                PIO: 'Esposizione a piombo e suoi composti che può causare saturnismo con danni neurologici e renali.',
                BIO: 'Esposizione ad agenti biologici (virus, batteri, parassiti) che possono causare infezioni professionali.',
                MMC: 'Movimentazione manuale di carichi che può causare patologie muscolo-scheletriche, in particolare lombari.',
                MOV_RIP: 'Movimenti ripetitivi degli arti superiori che possono causare tendinopatie e sindrome del tunnel carpale.',
                POS: 'Mantenimento di posture incongrue che possono causare patologie muscolo-scheletriche.',
                NOT: 'Lavoro notturno che può alterare i ritmi circadiani e causare disturbi metabolici e cardiovascolari.',
                VDT: 'Uso prolungato di videoterminali che può causare astenopia e disturbi muscolo-scheletrici.',
                SLC: 'Esposizione a fattori di stress lavoro-correlato che possono causare disturbi psico-fisici.',
                QUO: 'Lavoro in quota con rischio di caduta dall\'alto - richiede idoneità psicofisica specifica.',
                SPA_CON: 'Lavoro in spazi confinati con rischio di asfissia e difficoltà di evacuazione.',
                GUI_MEZ: 'Guida di automezzi aziendali - richiede idoneità alla guida e assenza di uso sostanze.',
                CAR_ELE: 'Utilizzo di carrelli elevatori - richiede formazione specifica e idoneità psicofisica.',
                ELE: 'Lavori sotto tensione o in prossimità di parti attive - richiede formazione PES/PAV/PEI.',
                INC: 'Esposizione a rischio incendio - richiede formazione antincendio e idoneità.',
                ISO: 'Lavoro in condizioni di isolamento senza possibilità di immediato soccorso.',
                IPE: 'Lavori su funi o in ambienti ipogei - richiede idoneità psicofisica specifica.',
                POL: 'Esposizione a polveri e silice cristallina che possono causare silicosi e BPCO.',
                ALC: 'Mansioni che vietano assunzione alcol/sostanze psicotrope per motivi di sicurezza.'
            };

            return {
                codice,
                ...info,
                descrizione: descrizioni[codice] || info.nome,
                prestazioniObbligatorie
            };
        });

        // Filtra per categoria se specificata
        if (categoria) {
            rischi = rischi.filter(r => r.categoria === categoria);
        }

        // Raggruppa per categoria
        const grouped = rischi.reduce((acc, r) => {
            if (!acc[r.categoria]) {
                acc[r.categoria] = [];
            }
            acc[r.categoria].push(r);
            return acc;
        }, {});

        res.json({
            totale: rischi.length,
            categorie: Object.keys(grouped),
            rischi: grouped,
            flatList: rischi
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore catalogo rischi');
        res.status(500).json({ error: 'Errore nel recupero del catalogo rischi' });
    }
});

/**
 * @route GET /api/v1/clinica/rischio-prestazioni/default-mapping
 * @desc Mapping di default rischio → prestazioni da normativa
 * @access Private - VIEW_VISITA
 */
router.get('/default-mapping', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const { codiceRischio } = req.query;

        if (codiceRischio) {
            const mapping = DEFAULT_RISCHIO_PRESTAZIONI[codiceRischio];
            if (!mapping) {
                return res.status(404).json({ error: 'Rischio non trovato nel catalogo' });
            }
            return res.json({
                codiceRischio,
                info: CATALOGO_RISCHI[codiceRischio],
                prestazioni: mapping
            });
        }

        // Ritorna tutto il mapping
        res.json(DEFAULT_RISCHIO_PRESTAZIONI);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore default mapping');
        res.status(500).json({ error: 'Errore nel recupero del mapping di default' });
    }
});

/**
 * @route GET /api/v1/clinica/rischio-prestazioni
 * @desc Lista mapping configurati per il tenant
 * @access Private - VIEW_VISITA
 */
router.get('/', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { codiceRischio } = req.query;

        const mappings = await RischioPrestazioneService.findAll(tenantId, { codiceRischio });

        // Raggruppa per rischio
        const grouped = mappings.reduce((acc, m) => {
            if (!acc[m.codiceRischio]) {
                acc[m.codiceRischio] = {
                    info: CATALOGO_RISCHI[m.codiceRischio],
                    prestazioni: []
                };
            }
            acc[m.codiceRischio].prestazioni.push(m);
            return acc;
        }, {});

        // Restituisce sia il formato raggruppato che flat per il frontend
        res.json({
            totale: mappings.length,
            rischiConfigurati: Object.keys(grouped).length,
            mappings: grouped,
            // data array for frontend compatibility
            data: mappings
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista mapping');
        res.status(500).json({ error: 'Errore nel recupero dei mapping' });
    }
});

/**
 * @route GET /api/v1/clinica/rischio-prestazioni/by-risk/:codiceRischio
 * @desc Prestazioni per un rischio specifico
 * @access Private - VIEW_VISITA
 */
router.get('/by-risk/:codiceRischio', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { codiceRischio } = req.params;

        // Validazione codice rischio
        if (!CATALOGO_RISCHI[codiceRischio]) {
            return res.status(400).json({
                error: 'Codice rischio non valido',
                codiciValidi: Object.keys(CATALOGO_RISCHI)
            });
        }

        const mappings = await RischioPrestazioneService.findByRischio(codiceRischio, tenantId);

        res.json({
            codiceRischio,
            info: CATALOGO_RISCHI[codiceRischio],
            prestazioni: mappings
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore mapping per rischio');
        res.status(500).json({ error: 'Errore nel recupero delle prestazioni per il rischio' });
    }
});

/**
 * @route GET /api/v1/clinica/rischio-prestazioni/worker/:personId
 * @desc Calcola prestazioni richieste per un lavoratore
 * @access Private - VIEW_VISITA
 */
router.get('/worker/:personId', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { personId } = req.params;
        const { tipoVisita = 'PERIODICA' } = req.query;

        const prestazioni = await RischioPrestazioneService.calculateRequiredPrestazioni(
            personId,
            tenantId,
            { tipoVisita }
        );

        res.json({
            personId,
            tipoVisita,
            totale: prestazioni.length,
            prestazioni
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', personId: req.params.personId }, 'Errore calcolo prestazioni lavoratore');
        res.status(500).json({ error: 'Errore nel calcolo delle prestazioni richieste' });
    }
});

/**
 * @route GET /api/v1/clinica/rischio-prestazioni/stats
 * @desc Statistiche mapping configurati
 * @access Private - VIEW_VISITA
 */
router.get('/stats', requireAuth, requirePermission('clinica.visite:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);

        const stats = await RischioPrestazioneService.getStats(tenantId);

        res.json(stats);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore statistiche mapping');
        res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
    }
});

/**
 * @route POST /api/v1/clinica/rischio-prestazioni
 * @desc Crea nuovo mapping rischio → prestazione
 * @access Private - EDIT_VISITA
 */
router.post('/', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const data = req.body;

        // Validazione
        if (!data.codiceRischio || !data.prestazioneId) {
            return res.status(400).json({
                error: 'Codice rischio e prestazione sono obbligatori'
            });
        }

        if (!CATALOGO_RISCHI[data.codiceRischio]) {
            return res.status(400).json({
                error: 'Codice rischio non valido',
                codiciValidi: Object.keys(CATALOGO_RISCHI)
            });
        }

        const mapping = await RischioPrestazioneService.create(data, tenantId);

        logger.info({
            codiceRischio: data.codiceRischio,
            prestazioneId: data.prestazioneId,
            createdBy: req.person.id,
            tenantId
        }, 'Mapping rischio-prestazione creato via API');

        res.status(201).json(mapping);
    } catch (error) {
        logger.error({ error: error.message }, 'Errore creazione mapping');

        if (error.code === 'P2002') {
            return res.status(409).json({
                error: 'Mapping già esistente per questa combinazione rischio-prestazione'
            });
        }

        res.status(500).json({ error: 'Errore nella creazione del mapping' });
    }
});

/**
 * @route PUT /api/v1/clinica/rischio-prestazioni/:id
 * @desc Aggiorna mapping
 * @access Private - EDIT_VISITA
 */
router.put('/:id', requireAuth, requirePermission('clinica.visite:update'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;
        const data = req.body;

        const mapping = await RischioPrestazioneService.update(id, data, tenantId);

        logger.info({
            mappingId: id,
            updatedBy: req.person.id,
            tenantId
        }, 'Mapping aggiornato via API');

        res.json(mapping);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiornamento mapping');
        res.status(500).json({ error: 'Errore nell\'aggiornamento del mapping' });
    }
});

/**
 * @route DELETE /api/v1/clinica/rischio-prestazioni/:id
 * @desc Elimina mapping (soft delete)
 * @access Private - DELETE_VISITA
 */
router.delete('/:id', requireAuth, requirePermission('clinica.visite:delete'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { id } = req.params;

        await RischioPrestazioneService.delete(id, tenantId);

        logger.info({
            mappingId: id,
            deletedBy: req.person.id,
            tenantId
        }, 'Mapping eliminato via API');

        res.json({ success: true, message: 'Mapping eliminato' });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore eliminazione mapping');
        res.status(500).json({ error: 'Errore nell\'eliminazione del mapping' });
    }
});

/**
 * @route POST /api/v1/clinica/rischio-prestazioni/seed-defaults
 * @desc Seed mapping di default da normativa D.Lgs 81/08
 * @access Private - MANAGE_VISITA
 */
router.post('/seed-defaults', requireAuth, requirePermission('clinica.visite:manage'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);

        const result = await RischioPrestazioneService.seedDefaults(tenantId);

        logger.info({
            ...result,
            seededBy: req.person.id,
            tenantId
        }, 'Seed mapping rischio-prestazioni completato via API');

        res.json({
            success: true,
            message: `Seed completato: ${result.prestazioni.created} prestazioni e ${result.mappings.created} mapping creati`,
            ...result
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore seed mapping');
        res.status(500).json({ error: 'Errore nel seed dei mapping' });
    }
});

export default router;
