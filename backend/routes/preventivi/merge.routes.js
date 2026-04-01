/**
 * Preventivi Merge Routes
 * 
 * Gestione merge/unmerge preventivi:
 * - POST /merge - Unisce più preventivi in uno
 * - POST /:id/unmerge - Separa preventivo unito
 * 
 * @module routes/preventivi/merge.routes
 */

import {
  express,
  body,
  param,
  prisma,
  authenticate,
  requirePermissions,
  auditLog,
  logger,
  preventiviService,
  validate
} from './common.js';

const router = express.Router();

/**
 * POST /api/v1/preventivi/merge
 * Unisce più preventivi della stessa azienda in uno nuovo
 * 
 * I preventivi originali vengono marcati come ARCHIVIATO e mantengono
 * il riferimento al preventivo unificato nel campo dettagliServizio.mergedIntoId
 * 
 * Il nuovo preventivo unificato contiene:
 * - Tutte le voci dei preventivi originali
 * - Riferimenti ai preventivi originali in dettagliServizio.mergedFromIds
 * - Totali ricalcolati
 */
router.post('/merge',
  authenticate,
  requirePermissions(['preventivi:create', 'preventivi:update']),
  auditLog('preventivi', 'MERGE'),
  [
    body('preventiviIds').isArray({ min: 2 }).withMessage('Seleziona almeno 2 preventivi da unire'),
    body('preventiviIds.*').isUUID().withMessage('ID preventivo non valido')
  ],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.person;
      const { preventiviIds } = req.body;

      // Recupera tutti i preventivi da unire
      const preventivi = await prisma.preventivo.findMany({
        where: {
          id: { in: preventiviIds },
          tenantId,
          deletedAt: null
        },
        include: {
          azienda: true,
          persona: true,
          sconti: true
        }
      });

      // Verifica che tutti i preventivi esistano
      if (preventivi.length !== preventiviIds.length) {
        return res.status(404).json({
          success: false,
          error: 'Uno o più preventivi non trovati o già eliminati'
        });
      }

      // Verifica che appartengano tutti alla stessa azienda
      const aziendaIds = [...new Set(preventivi.map(p => p.aziendaId))];
      if (aziendaIds.length > 1 || !aziendaIds[0]) {
        return res.status(400).json({
          success: false,
          error: 'I preventivi devono appartenere tutti alla stessa azienda'
        });
      }

      // Verifica che nessuno sia già fatturato
      const fatturati = preventivi.filter(p => p.stato === 'FATTURATO');
      if (fatturati.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Impossibile unire preventivi già fatturati'
        });
      }

      // Verifica che nessuno sia già risultato di un merge
      const alreadyMerged = preventivi.filter(p =>
        p.dettagliServizio?.mergedFromIds?.length > 0
      );
      if (alreadyMerged.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Impossibile unire preventivi già unificati. Seleziona i preventivi originali.'
        });
      }

      const aziendaId = aziendaIds[0];
      const azienda = preventivi[0].azienda;

      // Combina tutte le voci
      const vociFuse = [];
      let prezzoTotaleUnificato = 0;
      let scontoTotaleUnificato = 0;

      for (const p of preventivi) {
        vociFuse.push({
          originalPreventivoId: p.id,
          originalNumero: p.numero,
          titoloServizio: p.titoloServizio,
          descrizioneServizio: p.descrizioneServizio,
          tipoServizio: p.tipoServizio,
          prezzoUnitario: parseFloat(p.prezzoUnitario),
          quantita: p.quantita,
          prezzoTotale: parseFloat(p.prezzoTotale),
          scontoTotale: parseFloat(p.scontoTotale || 0)
        });

        prezzoTotaleUnificato += parseFloat(p.prezzoTotale);
        scontoTotaleUnificato += parseFloat(p.scontoTotale || 0);
      }

      // Calcola totali
      const imponibile = prezzoTotaleUnificato - scontoTotaleUnificato;
      const aliquotaIva = parseFloat(preventivi[0].aliquotaIva) || 22;
      const importoIva = imponibile * (aliquotaIva / 100);
      const importoFinale = imponibile + importoIva;

      // Genera numero progressivo
      const numeroUnificato = await preventiviService.generateNumeroPreventivo(tenantId);

      // Crea descrizione unificata
      const descrizioneUnificata = vociFuse.map((v, i) =>
        `${i + 1}. ${v.titoloServizio} (da ${v.originalNumero}): €${v.prezzoTotale.toFixed(2)}`
      ).join('\n');

      // Crea il nuovo preventivo unificato
      const preventivoUnificato = await prisma.preventivo.create({
        data: {
          tenantId,
          aziendaId,
          clienteType: 'AZIENDA',
          numero: numeroUnificato,
          numeroProgressivo: parseInt(numeroUnificato.split('-')[2]),
          annoProgressivo: new Date().getFullYear(),
          titoloServizio: `Preventivo Unificato - ${azienda?.ragioneSociale || 'Azienda'}`,
          descrizioneServizio: descrizioneUnificata,
          tipoServizio: 'ALTRO',
          prezzoUnitario: prezzoTotaleUnificato,
          quantita: 1,
          prezzoTotale: prezzoTotaleUnificato,
          scontoTotale: scontoTotaleUnificato,
          aliquotaIva,
          imponibile,
          importoIva,
          importoFinale,
          stato: 'BOZZA',
          dataEmissione: new Date(),
          dataScadenza: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          generatedBy: userId,
          dettagliServizio: {
            mergedFromIds: preventiviIds,
            mergedFromNumeri: preventivi.map(p => p.numero),
            voci: vociFuse,
            mergedAt: new Date().toISOString(),
            mergedBy: userId
          }
        },
        include: {
          azienda: true,
          persona: true
        }
      });

      // Archivia i preventivi originali e collega al nuovo
      await Promise.all(preventivi.map(p =>
        prisma.preventivo.update({
          where: { id: p.id },
          data: {
            stato: 'ARCHIVIATO',
            dettagliServizio: {
              ...p.dettagliServizio,
              mergedIntoId: preventivoUnificato.id,
              mergedIntoNumero: preventivoUnificato.numero,
              mergedAt: new Date().toISOString()
            }
          }
        })
      ));

      res.json({
        success: true,
        data: preventivoUnificato,
        message: `${preventivi.length} preventivi uniti in ${preventivoUnificato.numero}`,
        mergedPreventivi: preventivi.map(p => ({
          id: p.id,
          numero: p.numero,
          stato: 'ARCHIVIATO'
        }))
      });

      logger.info('Preventivi merged', {
        component: 'preventivi-routes',
        action: 'merge',
        mergedCount: preventivi.length,
        newPreventivoId: preventivoUnificato.id,
        newNumero: preventivoUnificato.numero,
        originalIds: preventiviIds,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to merge preventivi', {
        component: 'preventivi-routes',
        action: 'merge',
        preventiviIds: req.body.preventiviIds,
        error: 'Operazione non riuscita',
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server durante l\'unione dei preventivi'
      });
    }
  }
);

/**
 * POST /api/preventivi/:id/unmerge
 * Separa un preventivo unito ripristinando gli originali
 * 
 * I preventivi originali vengono ripristinati con lo stesso stato
 * del preventivo unito. Il preventivo unito viene eliminato (soft delete).
 */
router.post('/:id/unmerge',
  authenticate,
  requirePermissions(['preventivi:update']),
  auditLog('preventivi', 'UNMERGE'),
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { tenantId, id: userId } = req.person;
      const { id } = req.params;

      // Trova il preventivo unito
      const preventivoUnito = await prisma.preventivo.findFirst({
        where: { id, tenantId, deletedAt: null }
      });

      if (!preventivoUnito) {
        return res.status(404).json({
          success: false,
          error: 'Preventivo non trovato'
        });
      }

      // Verifica che sia un preventivo unito
      const mergedFromIds = preventivoUnito.dettagliServizio?.mergedFromIds || [];
      if (mergedFromIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Questo preventivo non è un preventivo unito'
        });
      }

      // Ripristina i preventivi originali
      const preventiviOriginali = await prisma.preventivo.findMany({
        where: {
          id: { in: mergedFromIds },
          tenantId,
          deletedAt: null
        }
      });

      // Rimuovi il riferimento mergedInto dai preventivi originali
      const statoPreventivo = preventivoUnito.stato;
      await Promise.all(preventiviOriginali.map(p =>
        prisma.preventivo.update({
          where: { id: p.id },
          data: {
            stato: statoPreventivo,
            dettagliServizio: {
              ...p.dettagliServizio,
              mergedIntoId: null,
              mergedIntoNumero: null,
              mergedAt: null,
              restoredAt: new Date().toISOString(),
              restoredBy: userId,
              restoredWithStato: statoPreventivo
            }
          }
        })
      ));

      // Elimina (soft delete) il preventivo unito
      await prisma.preventivo.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          dettagliServizio: {
            ...preventivoUnito.dettagliServizio,
            unmergedAt: new Date().toISOString(),
            unmergedBy: userId
          }
        }
      });

      res.json({
        success: true,
        message: `Preventivo ${preventivoUnito.numero} separato. ${preventiviOriginali.length} preventivi originali ripristinati.`,
        restoredPreventivi: preventiviOriginali.map(p => ({
          id: p.id,
          numero: p.numero
        }))
      });

      logger.info('Preventivo unmerged', {
        component: 'preventivi-routes',
        action: 'unmerge',
        unmergedPreventivoId: id,
        unmergedNumero: preventivoUnito.numero,
        restoredCount: preventiviOriginali.length,
        restoredIds: mergedFromIds,
        userId,
        tenantId
      });

    } catch (error) {
      logger.error('Failed to unmerge preventivo', {
        component: 'preventivi-routes',
        action: 'unmerge',
        preventivoId: req.params.id,
        error: 'Operazione non riuscita',
        stack: error.stack
      });
      res.status(500).json({
        success: false,
        error: 'Errore interno del server durante la separazione del preventivo'
      });
    }
  }
);

export default router;
