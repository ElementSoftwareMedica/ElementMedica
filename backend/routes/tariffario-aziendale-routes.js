/**
 * Tariffario Aziendale Routes
 * 
 * API endpoints per la gestione dei Tariffari Aziende - Medicina del Lavoro
 * 
 * @module routes/tariffario-aziendale-routes
 */

import express from 'express';
import TariffarioAziendaleService from '../services/management/TariffarioAziendaleService.js';
import MovimentoContabileGenerator from '../services/management/MovimentoContabileGenerator.js';
import prisma from '../config/prisma-optimization.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';

const router = express.Router();

// Middleware di autenticazione per tutte le routes
router.use(authenticate);

// =============================================
// TARIFFARI CRUD
// =============================================

/**
 * GET /api/v1/tariffari-aziendali
 * Lista tutti i tariffari con filtri
 */
router.get('/', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const { tipo, companyId, convenzioneId, attivo, search, page, limit } = req.query;

        const result = await TariffarioAziendaleService.getAll(getEffectiveTenantId(req), {
            tipo,
            companyId,
            convenzioneId,
            attivo: attivo !== undefined ? attivo === 'true' : undefined,
            search,
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 20
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista tariffari');
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * GET /api/v1/tariffari-aziendali/base
 * Lista solo i tariffari base (per dropdown clonazione)
 */
router.get('/base', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tariffari = await TariffarioAziendaleService.getTariffariBase(getEffectiveTenantId(req));
        res.json({
            success: true,
            data: tariffari
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista tariffari base');
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * GET /api/v1/tariffari-aziendali/prestazioni-mdl
 * Lista prestazioni Medicina del Lavoro disponibili
 */
router.get('/prestazioni-mdl', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const prestazioni = await TariffarioAziendaleService.getPrestazioniMDL(getEffectiveTenantId(req));
        res.json({
            success: true,
            data: prestazioni
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore lista prestazioni MDL');
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * GET /api/v1/tariffari-aziendali/by-template/:templateId
 * Voci tariffario associate a un DocumentoTemplate (questionario)
 */
router.get('/by-template/:templateId', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const voci = await TariffarioAziendaleService.getVociByDocumentoTemplate(
            req.params.templateId,
            getEffectiveTenantId(req)
        );
        res.json({
            success: true,
            data: voci
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore recupero voci per template');
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * GET /api/v1/tariffari-aziendali/by-prestazione/:prestazioneId
 * Voci tariffario associate a una prestazione specifica
 */
router.get('/by-prestazione/:prestazioneId', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const voci = await TariffarioAziendaleService.getVociByPrestazione(
            req.params.prestazioneId,
            getEffectiveTenantId(req)
        );
        res.json({
            success: true,
            data: voci
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Errore recupero voci per prestazione');
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero delle voci tariffario'
        });
    }
});


/**
 * GET /api/v1/tariffari-aziendali/:id/pdf
 * Genera PDF del tariffario
 */
router.get('/:id/pdf', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { tenantIds } = req.query;
        const parsedTenantIds = tenantIds ? tenantIds.split(',') : [tenantId];
        const { buffer, filename } = await TariffarioAziendaleService.generatePDF(req.params.id, parsedTenantIds);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore generazione PDF tariffario');
        res.status(500).json({
            success: false,
            error: 'Errore nella generazione del PDF'
        });
    }
});
/**
 * GET /api/v1/tariffari-aziendali/:id
 * Dettaglio tariffario con tutte le voci
 */
router.get('/:id', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const tariffario = await TariffarioAziendaleService.getById(
            req.params.id,
            getEffectiveTenantId(req)
        );
        res.json({
            success: true,
            data: tariffario
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore dettaglio tariffario');
        res.status(error.message.includes('non trovato') ? 404 : 500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/v1/tariffari-aziendali
 * Crea nuovo tariffario
 */
router.post('/', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const tariffario = await TariffarioAziendaleService.create(
            req.body,
            getEffectiveTenantId(req),
            req.person.personId
        );
        res.status(201).json({
            success: true,
            data: tariffario
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', body: req.body }, 'Errore creazione tariffario');
        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * PUT /api/v1/tariffari-aziendali/:id
 * Aggiorna tariffario
 */
router.put('/:id', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const tariffario = await TariffarioAziendaleService.update(
            req.params.id,
            req.body,
            getEffectiveTenantId(req)
        );
        res.json({
            success: true,
            data: tariffario
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore aggiornamento tariffario');
        res.status(error.message.includes('non trovato') ? 404 : 400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * DELETE /api/v1/tariffari-aziendali/:id
 * Elimina tariffario (soft delete)
 */
router.delete('/:id', requirePermission('tariffari:update'), async (req, res) => {
    try {
        await TariffarioAziendaleService.delete(req.params.id, getEffectiveTenantId(req));
        res.json({
            success: true,
            message: 'Tariffario eliminato con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore eliminazione tariffario');
        res.status(error.message.includes('non trovato') ? 404 : 400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/v1/tariffari-aziendali/:id/clone
 * Clona un tariffario per un'azienda
 */
router.post('/:id/clone', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const clone = await TariffarioAziendaleService.clone(
            req.params.id,
            getEffectiveTenantId(req),
            req.person.personId
        );
        res.status(201).json({
            success: true,
            data: clone
        });
    } catch (error) {
        logger.error({ error: error.message, id: req.params.id }, 'Errore clonazione tariffario');
        res.status(400).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// =============================================
// ASSOCIAZIONE TARIFFARIO ↔ AZIENDA
// =============================================

/**
 * POST /api/v1/tariffari-aziendali/:id/associate
 * Associa un tariffario a un'azienda (crea o aggiorna associazione)
 */
router.post('/:id/associate', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return res.status(400).json({ success: false, error: 'ID tariffario non valido' });
        }
        const tenantId = getEffectiveTenantId(req);
        let { companyTenantProfileId, validoDa, validoA, note } = req.body;

        if (!companyTenantProfileId) {
            return res.status(400).json({
                success: false,
                error: 'companyTenantProfileId è obbligatorio'
            });
        }

        // Risolvi Company.id → CompanyTenantProfile.id se necessario
        const profile = await TariffarioAziendaleService.resolveCompanyProfile(
            companyTenantProfileId, tenantId
        );
        if (!profile) {
            return res.status(404).json({
                success: false,
                error: 'Azienda non trovata nel tenant corrente'
            });
        }

        const result = await TariffarioAziendaleService.associate(
            id,
            profile.id,
            tenantId,
            { validoDa, validoA, note }
        );

        res.status(201).json({
            success: true,
            data: result
        });

        // Background: ricalcola movimenti a €0 per nomine/sopralluoghi di quest'azienda
        setImmediate(async () => {
            try {
                const zeroMovs = await prisma.movimentoContabile.findMany({
                    where: {
                        companyTenantProfileId: profile.id,
                        tenantId,
                        importoNetto: 0,
                        direzione: 'ENTRATA',
                        stato: { in: ['BOZZA', 'DA_FATTURARE'] },
                        deletedAt: null,
                        OR: [
                            { nominaRuoloId: { not: null } },
                            { sopralluogoId: { not: null } },
                            { consulenzaId: { not: null } }
                        ]
                    },
                    select: { id: true, nominaRuoloId: true, sopralluogoId: true, consulenzaId: true }
                });
                for (const mov of zeroMovs) {
                    // Annulla i movimenti a 0€ e rigenera
                    const sourceFilter = mov.nominaRuoloId
                        ? { nominaRuoloId: mov.nominaRuoloId }
                        : mov.sopralluogoId
                            ? { sopralluogoId: mov.sopralluogoId }
                            : { consulenzaId: mov.consulenzaId };

                    // Annulla sia ENTRATA che USCITA a 0
                    await prisma.movimentoContabile.updateMany({
                        where: { ...sourceFilter, tenantId, deletedAt: null, importoNetto: 0, stato: { in: ['BOZZA', 'DA_FATTURARE'] } },
                        data: { stato: 'ANNULLATO', deletedAt: new Date(), note: 'Ricalcolato dopo associazione tariffario' }
                    });

                    // Rigenera (con validazione tenantId)
                    if (mov.nominaRuoloId) {
                        const nomina = await prisma.nominaRuolo.findFirst({ where: { id: mov.nominaRuoloId, tenantId, deletedAt: null }, include: { person: true } });
                        if (nomina) await MovimentoContabileGenerator.generaPerNomina(nomina, tenantId);
                    } else if (mov.sopralluogoId) {
                        const sopr = await prisma.sopralluogo.findFirst({ where: { id: mov.sopralluogoId, tenantId, deletedAt: null } });
                        if (sopr) await MovimentoContabileGenerator.generaPerSopralluogo(sopr, tenantId);
                    }
                }
                if (zeroMovs.length > 0) {
                    logger.info({ count: zeroMovs.length, companyTenantProfileId: profile.id }, 'Ricalcolati movimenti a €0 dopo associazione tariffario');
                }
            } catch (err) {
                logger.warn({ error: 'Ricalcolo movimenti fallito' }, 'Errore ricalcolo movimenti post-associazione');
            }
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', id: req.params.id }, 'Errore associazione tariffario');
        res.status(400).json({
            success: false,
            error: 'Errore associazione tariffario'
        });
    }
});

/**
 * PATCH /api/v1/tariffari-aziendali/associations/:associationId
 * Aggiorna un'associazione esistente (validoDa, validoA, note, successore)
 */
router.patch('/associations/:associationId', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const { associationId } = req.params;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(associationId)) {
            return res.status(400).json({ success: false, error: 'ID associazione non valido' });
        }
        const tenantId = getEffectiveTenantId(req);

        // Whitelist campi aggiornabili
        const { validoDa, validoA, attivo, note, successoreAssociationId } = req.body;

        const updated = await TariffarioAziendaleService.updateAssociation(
            associationId,
            tenantId,
            { validoDa, validoA, attivo, note, successoreAssociationId }
        );

        res.json({
            success: true,
            data: updated,
            message: 'Associazione aggiornata con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', associationId: req.params.associationId }, 'Errore aggiornamento associazione tariffario');
        const statusCode = error.message.includes('non trovata') ? 404 : 400;
        res.status(statusCode).json({
            success: false,
            error: error.message.includes('non trovata') ? 'Associazione non trovata' : 'Errore aggiornamento associazione'
        });
    }
});

/**
 * GET /api/v1/tariffari-aziendali/associations/by-company/:companyTenantProfileId
 * Lista tariffari disponibili per un'azienda (per selezione successore)
 */
router.get('/associations/by-company/:companyTenantProfileId', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const { companyTenantProfileId } = req.params;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(companyTenantProfileId)) {
            return res.status(400).json({ success: false, error: 'ID azienda non valido' });
        }
        const tenantId = getEffectiveTenantId(req);

        const result = await TariffarioAziendaleService.getByCompanyProfile(companyTenantProfileId, tenantId);
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita' }, 'Errore recupero associazioni per azienda');
        res.status(500).json({ success: false, error: 'Errore interno del server' });
    }
});

// =============================================
// VOCI TARIFFARIO
// =============================================
// NOTA: Le route piu specifiche (batch, reorder) DEVONO essere definite PRIMA
// di /:id/voci per evitare che Express catturi "batch" come parte del path generico.

/**
 * POST /api/v1/tariffari-aziendali/:id/voci/batch
 * Aggiunge piu voci in un unica transazione (usato per VISITA_MEDICINA_LAVORO e DVR)
 */
router.post('/:id/voci/batch', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const { voci } = req.body;
        if (!Array.isArray(voci) || voci.length === 0) {
            return res.status(400).json({ success: false, error: 'Array voci obbligatorio e non vuoto' });
        }
        if (voci.length > 50) {
            return res.status(400).json({ success: false, error: 'Massimo 50 voci per batch' });
        }
        const tenantId = getEffectiveTenantId(req);
        const results = await TariffarioAziendaleService.addVociBatch(req.params.id, voci, tenantId);
        res.status(201).json({ success: true, data: results });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tariffarioId: req.params.id }, 'Errore aggiunta voci batch');
        res.status(400).json({ success: false, error: 'Errore interno del server' });
    }
});

/**
 * PATCH /api/v1/tariffari-aziendali/:id/voci/reorder
 * Riordina le voci del tariffario
 */
router.patch('/:id/voci/reorder', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const { updates } = req.body;
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, error: 'Array updates obbligatorio' });
        }
        const tenantId = getEffectiveTenantId(req);
        await TariffarioAziendaleService.reorderVoci(req.params.id, updates, tenantId);
        res.json({ success: true, message: 'Voci riordinate con successo' });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tariffarioId: req.params.id }, 'Errore riordino voci');
        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * POST /api/v1/tariffari-aziendali/:id/voci
 * Aggiunge una voce al tariffario
 */
router.post('/:id/voci', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const voce = await TariffarioAziendaleService.addVoce(
            req.params.id,
            req.body,
            getEffectiveTenantId(req)
        );
        res.status(201).json({
            success: true,
            data: voce
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', tariffarioId: req.params.id }, 'Errore aggiunta voce');
        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * PUT /api/v1/tariffari-aziendali/:id/voci/:voceId
 * Aggiorna una voce del tariffario
 */
router.put('/:id/voci/:voceId', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const voce = await TariffarioAziendaleService.updateVoce(
            req.params.voceId,
            req.body,
            getEffectiveTenantId(req)
        );
        res.json({
            success: true,
            data: voce
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', voceId: req.params.voceId }, 'Errore aggiornamento voce');
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * DELETE /api/v1/tariffari-aziendali/:id/voci/:voceId
 * Elimina una voce del tariffario
 */
router.delete('/:id/voci/:voceId', requirePermission('tariffari:update'), async (req, res) => {
    try {
        await TariffarioAziendaleService.deleteVoce(req.params.voceId, getEffectiveTenantId(req));
        res.json({
            success: true,
            message: 'Voce eliminata con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', voceId: req.params.voceId }, 'Errore eliminazione voce');
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// =============================================
// FASCE DIPENDENTI
// =============================================

/**
 * POST /api/v1/voci-tariffario/:voceId/fasce
 * Aggiunge una fascia dipendenti a una voce
 */
router.post('/voci/:voceId/fasce', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const fascia = await TariffarioAziendaleService.addFascia(
            req.params.voceId,
            req.body,
            getEffectiveTenantId(req)
        );
        res.status(201).json({
            success: true,
            data: fascia
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', voceId: req.params.voceId }, 'Errore aggiunta fascia');
        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * PUT /api/v1/voci-tariffario/:voceId/fasce/:fasciaId
 * Aggiorna una fascia dipendenti
 */
router.put('/voci/:voceId/fasce/:fasciaId', requirePermission('tariffari:update'), async (req, res) => {
    try {
        const fascia = await TariffarioAziendaleService.updateFascia(
            req.params.fasciaId,
            req.body,
            getEffectiveTenantId(req)
        );
        res.json({
            success: true,
            data: fascia
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', fasciaId: req.params.fasciaId }, 'Errore aggiornamento fascia');
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

/**
 * DELETE /api/v1/voci-tariffario/:voceId/fasce/:fasciaId
 * Elimina una fascia dipendenti
 */
router.delete('/voci/:voceId/fasce/:fasciaId', requirePermission('tariffari:update'), async (req, res) => {
    try {
        await TariffarioAziendaleService.deleteFascia(req.params.fasciaId, getEffectiveTenantId(req));
        res.json({
            success: true,
            message: 'Fascia eliminata con successo'
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', fasciaId: req.params.fasciaId }, 'Errore eliminazione fascia');
        res.status(error.message.includes('non trovata') ? 404 : 400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// =============================================
// UTILITY
// =============================================

/**
 * POST /api/v1/voci-tariffario/:voceId/calcola-prezzo
 * Calcola il prezzo per una voce in base al numero dipendenti
 */
router.post('/voci/:voceId/calcola-prezzo', requirePermission('tariffari:read'), async (req, res) => {
    try {
        const { numeroDipendenti } = req.body;

        if (numeroDipendenti === undefined || numeroDipendenti < 0) {
            return res.status(400).json({
                success: false,
                error: 'Numero dipendenti non valido'
            });
        }

        const result = await TariffarioAziendaleService.calcolaPrezzo(
            req.params.voceId,
            numeroDipendenti,
            getEffectiveTenantId(req)
        );

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error({ error: 'Operazione non riuscita', voceId: req.params.voceId }, 'Errore calcolo prezzo');
        res.status(400).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

export default router;
