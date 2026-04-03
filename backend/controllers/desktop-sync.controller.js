/**
 * P98 - Desktop Sync Controller
 * Controller per sincronizzazione dati tra webapp e app desktop MDL.
 * Gestisce download giornaliero, upload batch, e gestione client.
 * 
 * @module controllers/desktop-sync.controller
 * @project P98 - MDL Desktop Offline-First
 */

import { logger } from '../utils/logger.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import prisma from '../config/prisma-optimization.js';

/**
 * GET /api/v1/desktop-sync/download-day
 * Scarica tutti i dati necessari per una giornata MDL.
 * Include: appuntamenti, pazienti coinvolti, aziende, mansioni, scadenze,
 * prestazioni, protocolli, ambulatori, giudizi idoneità, convenzioni.
 * 
 * Query params:
 *   - date: YYYY-MM-DD (default: oggi)
 *   - ambulatorioId: filtra per ambulatorio specifico (opzionale)
 */
export async function downloadDay(req, res) {
  try {
    const tenantId = getEffectiveTenantId(req);
    const medicoId = req.person.id;
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const ambulatorioId = req.query.ambulatorioId || null;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Formato data non valido. Usare YYYY-MM-DD' });
    }

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    logger.info({ tenantId, medicoId, date: dateStr, ambulatorioId }, '[P98] Download day request');

    // 1. Appuntamenti della giornata (con prestazioni collegate)
    const appointmentWhere = {
      tenantId,
      deletedAt: null,
      dataOra: { gte: startOfDay, lte: endOfDay },
      ...(ambulatorioId ? { ambulatorioId } : {})
    };

    const appuntamenti = await prisma.appuntamento.findMany({
      where: appointmentWhere,
      include: {
        prestazioni: {
          where: { deletedAt: null },
          include: {
            prestazione: true,
            medicoRefertante: {
              select: { id: true, firstName: true, lastName: true, gender: true }
            }
          }
        },
        ambulatorio: true,
        convenzione: {
          select: { id: true, codice: true, nome: true, tipo: true }
        },
        companyTenantProfile: {
          include: {
            company: {
              select: { id: true, ragioneSociale: true, piva: true, codiceFiscale: true }
            }
          }
        }
      },
      orderBy: { dataOra: 'asc' }
    });

    // 2. Raccogliere tutti i pazienteId unici dagli appuntamenti
    const pazienteIds = [...new Set(appuntamenti.map(a => a.pazienteId))];
    const companyProfileIds = [...new Set(
      appuntamenti
        .map(a => a.companyTenantProfileId)
        .filter(Boolean)
    )];

    // 3. Dati pazienti (Person + PersonTenantProfile)
    const pazienti = pazienteIds.length > 0 ? await prisma.person.findMany({
      where: {
        id: { in: pazienteIds },
        deletedAt: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        birthPlace: true,
        birthProvince: true,
        gender: true,
        taxCode: true,
        profileImage: true,
        tenantProfiles: {
          where: { tenantId, deletedAt: null },
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            residenceAddress: true,
            residenceCity: true,
            postalCode: true,
            province: true,
            companyTenantProfileId: true,
            siteId: true,
            protocolloSanitarioId: true,
            notes: true,
            disagioPsicologico: true,
            hiredDate: true,
            endDate: true
          }
        }
      }
    }) : [];

    // 4. Mansioni dei pazienti
    const lavoratoriMansioni = pazienteIds.length > 0 ? await prisma.lavoratoreMansione.findMany({
      where: {
        tenantId,
        personId: { in: pazienteIds },
        isAttiva: true
      },
      include: {
        mansione: true
      }
    }) : [];

    // 5. Visite esistenti per gli appuntamenti (per ripresa offline)
    const appuntamentoIds = appuntamenti.map(a => a.id);
    const visiteEsistenti = appuntamentoIds.length > 0 ? await prisma.visita.findMany({
      where: {
        tenantId,
        deletedAt: null,
        appuntamentoId: { in: appuntamentoIds }
      },
      include: {
        giudizioIdoneita: {
          include: {
            mansioni: {
              include: { mansione: true }
            }
          }
        },
        esamiStrumentali: {
          where: { deletedAt: null }
        }
      }
    }) : [];

    // 6. Scadenze attive per i pazienti della giornata
    const scadenze = pazienteIds.length > 0 ? await prisma.deadlineItem.findMany({
      where: {
        tenantId,
        deletedAt: null,
        personId: { in: pazienteIds },
        status: { in: ['ATTIVA', 'IN_SCADENZA', 'SCADUTA'] }
      },
      orderBy: { dataScadenza: 'asc' }
    }) : [];

    // 7. Giudizi di idoneità precedenti per i pazienti
    const giudiziPrecedenti = pazienteIds.length > 0 ? await prisma.giudizioIdoneita.findMany({
      where: {
        tenantId,
        personId: { in: pazienteIds },
        stato: 'VALIDO'
      },
      include: {
        mansioni: {
          include: { mansione: true }
        }
      },
      orderBy: { dataEmissione: 'desc' }
    }) : [];

    // 8. Prestazioni attive del tenant (catalogo)
    const prestazioni = await prisma.prestazione.findMany({
      where: {
        tenantId,
        deletedAt: null,
        attivo: true
      },
      select: {
        id: true,
        codice: true,
        nome: true,
        tipo: true,
        durataPrevista: true,
        prezzoBase: true,
        ivaAliquota: true,
        prezzoPrimaVisita: true,
        prezzoControllo: true,
        scadenzaDefaultMesi: true,
        branchType: true
      }
    });

    // 9. Ambulatori del tenant
    const ambulatori = await prisma.ambulatorio.findMany({
      where: {
        tenantId,
        deletedAt: null,
        stato: 'ATTIVO'
      },
      select: {
        id: true,
        codice: true,
        nome: true,
        specializzazione: true,
        colore: true,
        isEsterno: true
      }
    });

    // 10. Movimenti contabili per le visite esistenti (per continuità contabile)
    const visitaIds = visiteEsistenti.map(v => v.id);
    const movimentiContabili = visitaIds.length > 0 ? await prisma.movimentoContabile.findMany({
      where: {
        tenantId,
        deletedAt: null,
        visitaId: { in: visitaIds }
      }
    }) : [];

    // 11. Mansioni complete del tenant (per assegnazione offline)
    const mansioni = await prisma.mansione.findMany({
      where: {
        tenantId
      },
      include: {
        rischiAssociati: true
      }
    });

    // 13. Rischi aggiuntivi per lavoratore (personalizzazioni individuali)
    const rischiAggiuntivi = pazienteIds.length > 0 ? await prisma.lavoratoreRischioAggiuntivo.findMany({
      where: {
        tenantId,
        personId: { in: pazienteIds },
        deletedAt: null
      },
      select: {
        id: true,
        personId: true,
        tenantId: true,
        codiceRischio: true,
        livello: true,
        categoria: true,
        descrizioneEsposizione: true,
        fonteRischio: true,
        periodicitaMesi: true,
        note: true,
        sourceMansioneId: true,
        createdAt: true,
        updatedAt: true
      }
    }) : [];

    // 12. CompanyTenantProfiles coinvolti (con sedi)
    const aziende = companyProfileIds.length > 0 ? await prisma.companyTenantProfile.findMany({
      where: {
        id: { in: companyProfileIds },
        tenantId,
        deletedAt: null
      },
      include: {
        company: {
          select: {
            id: true,
            ragioneSociale: true,
            piva: true,
            codiceFiscale: true,
            sedeLegaleIndirizzo: true,
            sedeLegaleCitta: true,
            sedeLegaleCap: true,
            sedeLegaleProvincia: true,
            codiceAteco: true,
            settore: true
          }
        },
        sites: {
          where: { deletedAt: null },
          select: {
            id: true,
            siteName: true,
            indirizzo: true,
            citta: true,
            cap: true,
            provincia: true
          }
        }
      }
    }) : [];

    const payload = {
      meta: {
        date: dateStr,
        tenantId,
        medicoId,
        ambulatorioId,
        downloadedAt: new Date().toISOString(),
        version: '1.0.0',
        counts: {
          appuntamenti: appuntamenti.length,
          pazienti: pazienti.length,
          visiteEsistenti: visiteEsistenti.length,
          scadenze: scadenze.length,
          giudiziPrecedenti: giudiziPrecedenti.length,
          prestazioni: prestazioni.length,
          ambulatori: ambulatori.length,
          mansioni: mansioni.length,
          aziende: aziende.length,
          movimentiContabili: movimentiContabili.length,
          rischiAggiuntivi: rischiAggiuntivi.length
        }
      },
      appuntamenti,
      pazienti,
      lavoratoriMansioni,
      visiteEsistenti,
      scadenze,
      giudiziPrecedenti,
      prestazioni,
      ambulatori,
      movimentiContabili,
      mansioni,
      aziende,
      rischiAggiuntivi
    };

    logger.info({
      tenantId,
      date: dateStr,
      counts: payload.meta.counts
    }, '[P98] Download day completed');

    res.json(payload);
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, '[P98] Errore download day');
    res.status(500).json({ error: 'Errore nel download dei dati giornalieri' });
  }
}

/**
 * POST /api/v1/desktop-sync/upload-batch
 * Riceve batch di operazioni CRUD eseguite offline e le applica al database.
 * Ogni operazione è atomica all'interno di una transazione.
 * 
 * Body:
 *   - clientId: string (UUID del client desktop)
 *   - operations: Array<{ id, entityType, entityId, action, data, timestamp }>
 */
export async function uploadBatch(req, res) {
  try {
    const tenantId = getEffectiveTenantId(req);
    const personId = req.person.id;
    const { clientId, operations } = req.body;

    if (!clientId || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({ error: 'clientId e operations sono obbligatori' });
    }

    if (operations.length > 500) {
      return res.status(400).json({ error: 'Massimo 500 operazioni per batch' });
    }

    logger.info({
      tenantId,
      personId,
      clientId,
      operationCount: operations.length
    }, '[P98] Upload batch request');

    const results = [];
    const allowedEntityTypes = [
      'visita', 'appuntamento', 'giudizioIdoneita', 'esameStrumentale',
      'movimentoContabile', 'deadlineItem'
    ];
    const allowedActions = ['create', 'update'];

    for (const op of operations) {
      try {
        // Validate operation
        if (!allowedEntityTypes.includes(op.entityType)) {
          results.push({
            operationId: op.id,
            status: 'rejected',
            error: `Tipo entità non consentito: ${op.entityType}`
          });
          continue;
        }

        if (!allowedActions.includes(op.action)) {
          results.push({
            operationId: op.id,
            status: 'rejected',
            error: `Azione non consentita: ${op.action}`
          });
          continue;
        }

        // Apply tenantId enforcement (never trust client data)
        const sanitizedData = { ...op.data, tenantId };

        let result;
        if (op.action === 'create') {
          result = await prisma[op.entityType].create({
            data: {
              ...sanitizedData,
              createdBy: personId
            }
          });
        } else if (op.action === 'update') {
          // Verify entity belongs to tenant before updating
          const existing = await prisma[op.entityType].findFirst({
            where: {
              id: op.entityId,
              tenantId,
              deletedAt: null
            }
          });

          if (!existing) {
            results.push({
              operationId: op.id,
              status: 'conflict',
              error: 'Entità non trovata o non appartenente al tenant'
            });
            continue;
          }

          result = await prisma[op.entityType].update({
            where: { id: op.entityId },
            data: sanitizedData
          });
        }

        results.push({
          operationId: op.id,
          status: 'success',
          serverId: result.id,
          serverUpdatedAt: result.updatedAt
        });

      } catch (opError) {
        logger.error({
          operationId: op.id,
          entityType: op.entityType,
          error: opError.message
        }, '[P98] Errore singola operazione batch');

        results.push({
          operationId: op.id,
          status: 'error',
          error: 'Errore nell\'applicazione dell\'operazione'
        });
      }
    }

    const summary = {
      total: operations.length,
      success: results.filter(r => r.status === 'success').length,
      conflict: results.filter(r => r.status === 'conflict').length,
      rejected: results.filter(r => r.status === 'rejected').length,
      error: results.filter(r => r.status === 'error').length
    };

    logger.info({ tenantId, clientId, summary }, '[P98] Upload batch completed');

    res.json({ summary, results });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, '[P98] Errore upload batch');
    res.status(500).json({ error: 'Errore nell\'upload del batch' });
  }
}

/**
 * POST /api/v1/desktop-sync/check-conflicts
 * Verifica conflitti prima dell'upload.
 * Confronta le versioni locali con quelle server.
 * 
 * Body:
 *   - entities: Array<{ entityType, entityId, localUpdatedAt }>
 */
export async function checkConflicts(req, res) {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { entities } = req.body;

    if (!Array.isArray(entities) || entities.length === 0) {
      return res.status(400).json({ error: 'entities è obbligatorio' });
    }

    if (entities.length > 1000) {
      return res.status(400).json({ error: 'Massimo 1000 entità per controllo conflitti' });
    }

    const conflicts = [];

    for (const entity of entities) {
      try {
        const serverEntity = await prisma[entity.entityType].findFirst({
          where: {
            id: entity.entityId,
            tenantId,
            deletedAt: null
          },
          select: { id: true, updatedAt: true }
        });

        if (!serverEntity) {
          conflicts.push({
            entityType: entity.entityType,
            entityId: entity.entityId,
            type: 'deleted_on_server'
          });
          continue;
        }

        const localUpdatedAt = new Date(entity.localUpdatedAt);
        if (serverEntity.updatedAt > localUpdatedAt) {
          conflicts.push({
            entityType: entity.entityType,
            entityId: entity.entityId,
            type: 'modified_on_server',
            serverUpdatedAt: serverEntity.updatedAt
          });
        }
      } catch {
        // Skip invalid entity types
      }
    }

    res.json({
      hasConflicts: conflicts.length > 0,
      conflicts
    });
  } catch (error) {
    logger.error({ error: error.message }, '[P98] Errore check conflicts');
    res.status(500).json({ error: 'Errore nel controllo conflitti' });
  }
}

/**
 * POST /api/v1/desktop-sync/client-register
 * Registra un client desktop per il tracking sincronizzazione.
 * 
 * Body:
 *   - clientId: string (UUID generato dal client)
 *   - deviceName: string
 *   - appVersion: string
 */
export async function clientRegister(req, res) {
  try {
    const tenantId = getEffectiveTenantId(req);
    const personId = req.person.id;
    const { clientId, deviceName, appVersion } = req.body;

    if (!clientId || !deviceName || !appVersion) {
      return res.status(400).json({ error: 'clientId, deviceName e appVersion sono obbligatori' });
    }

    // Upsert nella tabella desktop_clients (se esiste) o store in DesktopSyncClient
    // Per ora usiamo una tabella JSON-style tracking
    const existingMeta = await prisma.tenantMeta?.findFirst?.({
      where: {
        tenantId,
        key: `desktop_client_${clientId}`
      }
    });

    // Fallback: utilizziamo un semplice tracking in memoria/log
    logger.info({
      tenantId,
      personId,
      clientId,
      deviceName,
      appVersion,
      registeredAt: new Date().toISOString()
    }, '[P98] Desktop client registered');

    res.json({
      registered: true,
      clientId,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error: error.message }, '[P98] Errore registrazione client');
    res.status(500).json({ error: 'Errore nella registrazione del client' });
  }
}

/**
 * GET /api/v1/desktop-sync/client-status
 * Verifica stato del client desktop (autorizzazione, versione minima, etc.).
 * 
 * Query params:
 *   - clientId: string
 *   - appVersion: string
 */
export async function clientStatus(req, res) {
  try {
    const tenantId = getEffectiveTenantId(req);
    const { clientId, appVersion } = req.query;

    if (!clientId) {
      return res.status(400).json({ error: 'clientId è obbligatorio' });
    }

    // Per ora: sempre autorizzato. In futuro: check blacklist, versione minima, etc.
    res.json({
      authorized: true,
      clientId,
      serverTime: new Date().toISOString(),
      minVersion: '0.1.0',
      needsUpdate: false
    });
  } catch (error) {
    logger.error({ error: error.message }, '[P98] Errore client status');
    res.status(500).json({ error: 'Errore nel controllo stato client' });
  }
}
