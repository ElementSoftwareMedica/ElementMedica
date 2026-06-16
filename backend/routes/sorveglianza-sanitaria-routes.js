/**
 * Sorveglianza Sanitaria Routes
 * Art. 41 D.Lgs 81/08 — Visite mediche MDL
 *
 * Montato come sub-router di companies:
 *   /api/v1/companies/:companyId/sorveglianza-sanitaria
 */

import express from 'express';
import logger from '../utils/logger.js';
import middleware from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { requireFeature } from '../middleware/featureFlags.js';
import prisma from '../config/prisma-optimization.js';
import { getEffectiveTenantId } from '../utils/tenantHelper.js';
import AppuntamentoService from '../services/clinical/AppuntamentoService.js';

const router = express.Router({ mergeParams: true });
const { authenticate: authenticateToken } = middleware;

// Feature gate: sorveglianza sanitaria richiede BRANCH_MEDICA
router.use(authenticateToken, requireFeature('BRANCH_MEDICA'));

// ─── Helpers ──────────────────────────────────────────────────────

/** Recupera il CompanyTenantProfile per companyId o profileId + tenantId */
async function getCompanyProfile(companyIdOrProfileId, tenantId) {
  return prisma.companyTenantProfile.findFirst({
    where: {
      OR: [
        { id: companyIdOrProfileId, tenantId, deletedAt: null },
        { companyId: companyIdOrProfileId, tenantId, deletedAt: null }
      ]
    }
  });
}

// ─── GET / — Dati sorveglianza sanitaria per tutti i dipendenti ──
router.get('/',
  authenticateToken,
  requirePermission('visite:read'),
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const tenantId = getEffectiveTenantId(req);

      const profile = await getCompanyProfile(companyId, tenantId);
      if (!profile) {
        return res.status(404).json({
          error: 'Azienda non trovata',
          message: 'Azienda non trovata nel tenant corrente'
        });
      }

      // 1. Lavoratori assegnati a questa azienda con mansioni attive
      const lavoratoriMansione = await prisma.lavoratoreMansione.findMany({
        where: {
          tenantId,
          isAttiva: true,
          deletedAt: null,
          person: {
            deletedAt: null,
            tenantProfiles: {
              some: {
                companyTenantProfileId: profile.id,
                tenantId,
                deletedAt: null
              }
            }
          }
        },
        include: {
          person: {
            select: { id: true, firstName: true, lastName: true }
          },
          mansione: {
            select: {
              id: true, codice: true, denominazione: true, descrizione: true,
              protocolliMansione: {
                where: {
                  protocolloSanitario: { isAttivo: true, deletedAt: null, tenantId }
                },
                take: 1,
                orderBy: { protocolloSanitario: { dataInizioValidita: 'desc' } },
                include: {
                  protocolloSanitario: {
                    include: {
                      prestazioni: {
                        where: { deletedAt: null },
                        include: {
                          prestazione: {
                            select: { id: true, nome: true, codice: true }
                          }
                        }
                      },
                      questionari: {
                        where: { deletedAt: null },
                        select: {
                          id: true,
                          codiciRischio: true,
                          periodicitaMesi: true,
                          documentoTemplate: {
                            select: { id: true, nome: true, codice: true }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (lavoratoriMansione.length === 0) {
        return res.json({ data: [] });
      }

      // 2. Raccogli tutti i personId per query batch
      const personIds = [...new Set(lavoratoriMansione.map(lm => lm.personId))];

      // 3. Batch fetch: ultimo giudizio, ultima visita MDL, prossimo appuntamento MDL, scadenze
      const [giudizi, ultimaVisitaMap, prossimiAppuntamenti, scadenze] = await Promise.all([
        // Ultimi giudizi per ogni persona
        prisma.giudizioIdoneita.findMany({
          where: {
            personId: { in: personIds },
            tenantId,
            deletedAt: null
          },
          orderBy: { dataEmissione: 'desc' },
          select: {
            personId: true,
            tipoGiudizio: true,
            stato: true,
            dataEmissione: true,
            dataScadenza: true
          }
        }),

        // Ultime visite MDL completate per ogni persona
        prisma.visita.findMany({
          where: {
            pazienteId: { in: personIds },
            tenantId,
            deletedAt: null,
            tipoVisitaMDL: { not: null },
            stato: 'COMPLETATA'
          },
          orderBy: { dataOra: 'desc' },
          select: {
            pazienteId: true,
            dataOra: true
          }
        }),

        // Prossimi appuntamenti MDL programmati (non annullati)
        prisma.appuntamento.findMany({
          where: {
            pazienteId: { in: personIds },
            companyTenantProfileId: profile.id,
            tenantId,
            deletedAt: null,
            tipoVisitaMDL: { not: null },
            stato: { in: ['PRENOTATO', 'CONFERMATO'] },
            dataOra: { gte: new Date() }
          },
          orderBy: { dataOra: 'asc' },
          select: {
            pazienteId: true,
            dataOra: true
          }
        }),

        // Scadenze per ultimaEsecuzione delle prestazioni
        prisma.scadenzaPrestazioneProtocollo.findMany({
          where: {
            personId: { in: personIds },
            tenantId,
            deletedAt: null,
            eseguita: true
          },
          orderBy: { dataEsecuzione: 'desc' },
          select: {
            personId: true,
            prestazioneId: true,
            dataEsecuzione: true
          }
        })
      ]);

      // Index maps per accesso O(1)
      const giudiziMap = {};
      for (const g of giudizi) {
        if (!giudiziMap[g.personId]) giudiziMap[g.personId] = g;
      }

      const visitaMap = {};
      for (const v of ultimaVisitaMap) {
        if (!visitaMap[v.pazienteId]) visitaMap[v.pazienteId] = v;
      }

      const appuntamentoMap = {};
      for (const a of prossimiAppuntamenti) {
        if (!appuntamentoMap[a.pazienteId]) appuntamentoMap[a.pazienteId] = a;
      }

      // Mappa scadenze eseguite: personId::prestazioneId → data
      const scadenzeMap = {};
      for (const s of scadenze) {
        const key = `${s.personId}::${s.prestazioneId}`;
        if (!scadenzeMap[key]) scadenzeMap[key] = s.dataEsecuzione;
      }

      // Verifica se il lavoratore ha almeno una visita MDL completata → non è prima visita
      const hasCompletedVisitSet = new Set(Object.keys(visitaMap));

      // 4. Trasforma in formato frontend — raggruppato per persona
      const grouped = {};
      for (const lm of lavoratoriMansione) {
        const pid = lm.personId;
        const { person, mansione } = lm;
        const protocollo = mansione.protocolliMansione?.[0]?.protocolloSanitario ?? null;

        if (!grouped[pid]) {
          grouped[pid] = {
            personId: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            mansioni: [],
            accertamentiMap: new Map(),
            questionariMap: new Map(),
            ultimaVisita: visitaMap[person.id]?.dataOra?.toISOString() ?? null,
            appuntamentoProgrammato: appuntamentoMap[person.id]?.dataOra?.toISOString() ?? null,
            statoGiudizio: giudiziMap[person.id]?.tipoGiudizio ?? null,
            statoGiudizioRecord: giudiziMap[person.id]?.stato ?? null,
            isPrimaVisita: !hasCompletedVisitSet.has(person.id),
            _giudizioScadenza: giudiziMap[person.id]?.dataScadenza ?? null,
          };
        }

        const g = grouped[pid];

        // Aggiungi mansione con il suo protocollo
        g.mansioni.push({
          id: mansione.id,
          nome: mansione.denominazione,
          descrizione: mansione.descrizione,
          assignmentId: lm.id,
          protocollo: protocollo ? {
            id: protocollo.id,
            codice: protocollo.codice,
            denominazione: protocollo.denominazione,
            periodicitaMesi: protocollo.periodicitaVisiteMesi,
          } : null,
        });

        // Merge accertamenti da tutti i protocolli (deduplica per prestazioneId)
        if (protocollo?.prestazioni) {
          for (const pp of protocollo.prestazioni) {
            if (!g.accertamentiMap.has(pp.prestazione.id)) {
              g.accertamentiMap.set(pp.prestazione.id, {
                id: pp.prestazione.id,
                nome: pp.prestazione.nome,
                codice: pp.prestazione.codice,
                isObbligatoria: pp.isObbligatoria,
                periodicita: pp.periodicita,
                periodicitaCustomMesi: pp.periodicitaCustomMesi,
                note: pp.note,
                ultimaEsecuzione: scadenzeMap[`${person.id}::${pp.prestazione.id}`]?.toISOString() ?? null,
              });
            }
          }
        }

        // Merge questionari da protocolli (deduplica per id)
        if (protocollo?.questionari) {
          for (const q of protocollo.questionari) {
            if (!g.questionariMap.has(q.id)) {
              g.questionariMap.set(q.id, {
                id: q.id,
                nome: q.documentoTemplate?.nome ?? 'Questionario',
                codice: q.documentoTemplate?.codice ?? null,
                periodicitaMesi: q.periodicitaMesi,
                tipo: 'questionario',
              });
            }
          }
        }
      }

      // Converte in array, calcola prossimaVisita
      const data = Object.values(grouped).map(g => {
        let prossimaVisita = null;
        if (g._giudizioScadenza) {
          prossimaVisita = g._giudizioScadenza.toISOString();
        } else if (g.ultimaVisita) {
          // Usa la periodicità più breve tra le mansioni
          const periodi = g.mansioni
            .filter(m => m.protocollo?.periodicitaMesi)
            .map(m => m.protocollo.periodicitaMesi);
          if (periodi.length > 0) {
            const d = new Date(g.ultimaVisita);
            d.setMonth(d.getMonth() + Math.min(...periodi));
            prossimaVisita = d.toISOString();
          }
        }

        return {
          personId: g.personId,
          firstName: g.firstName,
          lastName: g.lastName,
          mansioni: g.mansioni,
          accertamenti: Array.from(g.accertamentiMap.values()),
          questionari: Array.from(g.questionariMap.values()),
          ultimaVisita: g.ultimaVisita,
          prossimaVisita,
          appuntamentoProgrammato: g.appuntamentoProgrammato,
          statoGiudizio: g.statoGiudizio,
          statoGiudizioRecord: g.statoGiudizioRecord,
          isPrimaVisita: g.isPrimaVisita,
        };
      });

      res.json({ data });
    } catch (error) {
      logger.error('Errore recupero dati sorveglianza sanitaria', {
        component: 'sorveglianza-sanitaria-routes',
        action: 'getAll',
        error: 'Operazione non riuscita',
        companyId: req.params?.companyId
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero dei dati di sorveglianza sanitaria'
      });
    }
  }
);

// ─── GET /medici-disponibili — Medici competenti per questa azienda ──
router.get('/medici-disponibili',
  authenticateToken,
  requirePermission('visite:read'),
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const tenantId = getEffectiveTenantId(req);
      // includeAllMdl=true → restituisce anche tutti i Medici del Lavoro del tenant
      const includeAllMdl = req.query.includeAllMdl === 'true';

      const profile = await getCompanyProfile(companyId, tenantId);
      if (!profile) {
        return res.status(404).json({
          error: 'Azienda non trovata',
          message: 'Azienda non trovata nel tenant corrente'
        });
      }

      // Medici con nomina MC/MC coordinato attiva per questa azienda (o per le sue sedi).
      const nomineAzienda = await prisma.nominaRuolo.findMany({
        where: {
          tenantId,
          deletedAt: null,
          tipoRuolo: { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'] },
          stato: 'ATTIVA',
          AND: [
            {
              OR: [
                { companyTenantProfileId: profile.id },
                { site: { companyTenantProfileId: profile.id } }
              ]
            },
            {
              OR: [
                { dataFine: null },
                { dataFine: { gte: new Date() } }
              ]
            }
          ]
        },
        select: { personId: true, tipoRuolo: true }
      });

      const siteMedici = await prisma.companySite.findMany({
        where: {
          tenantId,
          companyTenantProfileId: profile.id,
          deletedAt: null,
          medicoCompetenteId: { not: null }
        },
        select: { medicoCompetenteId: true }
      });

      // Il medico competente "principale" dell'azienda (MEDICO_COMPETENTE o MC di sede)
      const principaliIds = new Set([
        ...nomineAzienda.filter(n => n.tipoRuolo === 'MEDICO_COMPETENTE').map(n => n.personId),
        ...siteMedici.map(s => s.medicoCompetenteId).filter(Boolean)
      ]);
      const coordinatiIds = new Set(
        nomineAzienda.filter(n => n.tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO').map(n => n.personId)
      );

      const nominatiIds = [...new Set([
        ...nomineAzienda.map(n => n.personId),
        ...siteMedici.map(s => s.medicoCompetenteId).filter(Boolean)
      ])];

      const buildOption = (m, isNominato) => ({
        id: m.id,
        fullName: `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Medico',
        isNominatoPerAzienda: isNominato,
        isMedicoCompetentePrincipale: principaliIds.has(m.id),
        isCoordinato: coordinatiIds.has(m.id)
      });

      // Fetch le persone nominate (MC + coordinati dell'azienda)
      let allMedici = [];
      if (nominatiIds.length > 0) {
        const nominatedDocs = await prisma.person.findMany({
          where: {
            id: { in: nominatiIds },
            deletedAt: null,
            tenantProfiles: { some: { tenantId, deletedAt: null } }
          },
          select: { id: true, firstName: true, lastName: true }
        });
        // Principale prima, poi coordinati
        allMedici = nominatedDocs
          .map(m => buildOption(m, true))
          .sort((a, b) => (b.isMedicoCompetentePrincipale ? 1 : 0) - (a.isMedicoCompetentePrincipale ? 1 : 0));
      }

      // Tutti i Medici del Lavoro del tenant (solo se forzato) — esclusi i già presenti
      if (includeAllMdl) {
        const altriMedici = await prisma.person.findMany({
          where: {
            deletedAt: null,
            ...(nominatiIds.length > 0 ? { id: { notIn: nominatiIds } } : {}),
            personRoles: { some: { tenantId, roleType: 'MEDICO_COMPETENTE', deletedAt: null } },
            tenantProfiles: { some: { tenantId, deletedAt: null } }
          },
          select: { id: true, firstName: true, lastName: true }
        });
        for (const m of altriMedici) {
          allMedici.push(buildOption(m, false));
        }
      }

      res.json({ medici: allMedici });
    } catch (error) {
      logger.error('Errore recupero medici disponibili', {
        component: 'sorveglianza-sanitaria-routes',
        action: 'getMediciDisponibili',
        error: 'Operazione non riuscita',
        companyId: req.params?.companyId
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero dei medici disponibili'
      });
    }
  }
);

// ─── GET /slot-disponibili — Slot disponibilità per un medico in una data ──
router.get('/slot-disponibili',
  authenticateToken,
  requirePermission('visite:read'),
  async (req, res) => {
    try {
      const tenantId = getEffectiveTenantId(req);
      const { medicoId, data: dataStr, durataMins = '10', personeCount = '1' } = req.query;

      if (!medicoId || !dataStr) {
        return res.status(400).json({
          error: 'Parametri mancanti',
          message: 'medicoId e data sono obbligatori'
        });
      }

      const dataRichiesta = new Date(dataStr + 'T00:00:00');
      const startOfDay = new Date(dataStr + 'T00:00:00.000Z');
      const endOfDay = new Date(dataStr + 'T23:59:59.999Z');

      // 1. Slot dal sistema di disponibilità
      const slotDB = await prisma.slotDisponibilita.findMany({
        where: {
          medicoId,
          tenantId,
          data: {
            gte: startOfDay,
            lte: endOfDay
          },
          disponibile: true,
          stato: 'LIBERO'
        },
        include: {
          ambulatorio: {
            select: { id: true, nome: true }
          }
        },
        orderBy: { oraInizio: 'asc' }
      });

      // 2. Genera slot da pattern disponibilità settimanale se non ci sono slot espliciti
      let slots = slotDB.map(s => ({
        id: s.id,
        oraInizio: s.oraInizio,
        oraFine: s.oraFine,
        durataEffettiva: s.durataSlotMinuti || parseInt(durataMins, 10),
        disponibile: true,
        fonte: 'slot',
        ambulatorioId: s.ambulatorio?.id
      }));

      if (slots.length === 0) {
        // Fallback: genera da DisponibilitaMedico
        const giorno = dataRichiesta.getDay(); // 0=Dom, 1=Lun...
        const disponibilita = await prisma.disponibilitaMedico.findMany({
          where: {
            medicoId,
            tenantId,
            giorno,
            attivo: true,
            OR: [
              { validoDal: null },
              { validoDal: { lte: dataRichiesta } }
            ]
          },
          select: {
            id: true,
            oraInizio: true,
            oraFine: true,
            durataSlot: true,
            intervalloSlot: true,
            validoAl: true,
            ambulatorioId: true
          }
        });

        for (const d of disponibilita) {
          if (d.validoAl && d.validoAl < dataRichiesta) continue;
          const durataSlot = d.durataSlot || parseInt(durataMins, 10);
          const intervallo = d.intervalloSlot || 0;
          const [startH, startM] = d.oraInizio.split(':').map(Number);
          const [endH, endM] = d.oraFine.split(':').map(Number);
          const startMins = startH * 60 + startM;
          const endMins = endH * 60 + endM;

          for (let m = startMins; m + durataSlot <= endMins; m += durataSlot + intervallo) {
            const h = Math.floor(m / 60);
            const min = m % 60;
            const nextM = m + durataSlot;
            const nextH = Math.floor(nextM / 60);
            const nextMin = nextM % 60;
            slots.push({
              id: null,
              oraInizio: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
              oraFine: `${String(nextH).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`,
              durataEffettiva: durataSlot,
              disponibile: true,
              fonte: 'disponibilita',
              ambulatorioId: d.ambulatorioId
            });
          }
        }
      }

      // 3. Appuntamenti già prenotati per questa data + medico (per mostrare occupati)
      const appuntamentiDB = await prisma.appuntamento.findMany({
        where: {
          medicoId,
          tenantId,
          deletedAt: null,
          dataOra: {
            gte: startOfDay,
            lte: endOfDay
          },
          stato: { notIn: ['ANNULLATO', 'NO_SHOW'] }
        },
        include: {
          paziente: {
            select: { firstName: true, lastName: true }
          },
          ambulatorio: {
            select: { id: true, nome: true }
          },
          companyTenantProfile: {
            include: { company: { select: { ragioneSociale: true } } }
          }
        },
        orderBy: { dataOra: 'asc' }
      });

      const appuntamenti = appuntamentiDB.map(a => {
        const ora = a.dataOra;
        const h = ora.getUTCHours();
        const m = ora.getUTCMinutes();
        const durata = a.durataMinuti || 30;
        const fineMin = h * 60 + m + durata;
        return {
          id: a.id,
          oraInizio: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          oraFine: `${String(Math.floor(fineMin / 60)).padStart(2, '0')}:${String(fineMin % 60).padStart(2, '0')}`,
          durataMinuti: durata,
          ambulatorioId: a.ambulatorio?.id,
          pazienteNome: `${a.paziente?.lastName ?? ''} ${a.paziente?.firstName ?? ''}`.trim(),
          aziendaNome: a.companyTenantProfile?.company?.ragioneSociale ?? null
        };
      });

      // 4. Rimuovi slot che si sovrappongono con appuntamenti esistenti
      const occupiedRanges = appuntamenti.map(a => ({
        start: timeToMinutes(a.oraInizio),
        end: timeToMinutes(a.oraFine)
      }));

      const availableSlots = slots.filter(s => {
        const sStart = timeToMinutes(s.oraInizio);
        const sEnd = timeToMinutes(s.oraFine);
        return !occupiedRanges.some(o => sStart < o.end && sEnd > o.start);
      });

      res.json({ slots: availableSlots, appuntamenti });
    } catch (error) {
      logger.error('Errore recupero slot disponibili', {
        component: 'sorveglianza-sanitaria-routes',
        action: 'getSlotDisponibili',
        error: 'Operazione non riuscita',
        medicoId: req.query?.medicoId,
        data: req.query?.data
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nel recupero degli slot disponibili'
      });
    }
  }
);

// ─── POST /programma — Programma visite mediche MDL per i dipendenti selezionati ──
router.post('/programma',
  authenticateToken,
  requirePermission('visite:write'),
  async (req, res) => {
    try {
      const { companyId } = req.params;
      const tenantId = getEffectiveTenantId(req);
      const createdBy = req.person?.personId || req.person?.id;

      const {
        personeIds,
        medicoId,
        dataOraPerPersona,
        duratePersone,
        ambulatorioIdsPerPersona,
        isOverbooking = false,
        notePerPersona,
        accertamentiPerPersona,
        tipoVisitaMDLPerPersona
      } = req.body;

      if (!personeIds?.length || !medicoId || !dataOraPerPersona?.length) {
        return res.status(400).json({
          error: 'Parametri mancanti',
          message: 'personeIds, medicoId e dataOraPerPersona sono obbligatori'
        });
      }

      const profile = await getCompanyProfile(companyId, tenantId);
      if (!profile) {
        return res.status(404).json({
          error: 'Azienda non trovata',
          message: 'Azienda non trovata nel tenant corrente'
        });
      }

      // Verifica che il medico esista nel tenant
      const medico = await prisma.person.findFirst({
        where: {
          id: medicoId,
          deletedAt: null,
          tenantProfiles: { some: { tenantId, deletedAt: null } }
        }
      });
      if (!medico) {
        return res.status(404).json({
          error: 'Medico non trovato',
          message: 'Il medico selezionato non è stato trovato'
        });
      }

      // Trova un ambulatorio di default se non specificato
      const defaultAmbulatorio = await prisma.ambulatorio.findFirst({
        where: { tenantId, deletedAt: null, stato: 'ATTIVO' },
        orderBy: { createdAt: 'asc' }
      });

      // Trova la prestazione MDL di default per il tenant — da assegnare a ogni appuntamento
      // Questo garantisce che Appuntamento.prestazioneId sia valorizzato per:
      // 1. Evitare duplicati "Visita Medica del Lavoro" nella pagina visita
      // 2. Consentire lookup corretto del tariffario aziendale
      const defaultMDLPrestazione = await prisma.prestazione.findFirst({
        where: { tenantId, tipo: 'VISITA_MEDICINA_LAVORO', deletedAt: null },
        select: { id: true }
      });

      let programmati = 0;
      let errori = 0;
      const risultati = [];

      for (let i = 0; i < personeIds.length; i++) {
        const personId = personeIds[i];
        const dataOra = dataOraPerPersona[i];
        const durata = duratePersone?.[i] || 10;
        const ambulatorioId = ambulatorioIdsPerPersona?.[i] || defaultAmbulatorio?.id;
        const note = notePerPersona?.[i] || '';
        const accertamentiIds = accertamentiPerPersona?.[i] || [];
        const tipoVisitaMDL = tipoVisitaMDLPerPersona?.[i] || 'PERIODICA';

        if (!ambulatorioId) {
          errori++;
          risultati.push({ personId, status: 'error', message: 'Nessun ambulatorio disponibile' });
          continue;
        }

        try {
          const appuntamento = await AppuntamentoService.create({
            pazienteId: personId,
            medicoId,
            ambulatorioId,
            dataOra,
            durataMinuti: durata,
            stato: 'PRENOTATO',
            isOverbooking,
            note: note || undefined,
            companyTenantProfileId: profile.id,
            tipoVisitaMDL,
            prestazioneId: defaultMDLPrestazione?.id || null,
            promemoriaEmail: true,
            promemoriaSms: false
          }, tenantId, createdBy);

          // Crea AppuntamentoPrestazione per ogni accertamento
          if (accertamentiIds.length > 0) {
            const apCreates = accertamentiIds.map((prestazioneId, ordine) => ({
              appuntamentoId: appuntamento.id,
              prestazioneId,
              ordine,
              stato: 'DA_ESEGUIRE',
              tenantId,
              createdBy
            }));

            await prisma.appuntamentoPrestazione.createMany({
              data: apCreates,
              skipDuplicates: true
            });
          }

          programmati++;
          risultati.push({ personId, status: 'ok', appuntamentoId: appuntamento.id });
        } catch (err) {
          errori++;
          const msg = err.message?.includes('conflict') || err.message?.includes('conflicts')
            ? 'Sovrapposizione con appuntamento esistente'
            : 'Errore nella programmazione';
          risultati.push({ personId, status: 'error', message: msg });
          logger.warn('Errore programmazione singola visita MDL', {
            component: 'sorveglianza-sanitaria-routes',
            action: 'programma',
            personId,
            error: 'Operazione non riuscita'
          });
        }
      }

      const response = {
        programmati,
        errori,
        totale: personeIds.length,
        risultati,
        message: errori === 0
          ? `${programmati} visit${programmati === 1 ? 'a programmata' : 'e programmate'} con successo`
          : `${programmati} programmat${programmati === 1 ? 'a' : 'e'}, ${errori} error${errori === 1 ? 'e' : 'i'}`
      };

      // Se tutti falliti per conflict → 409
      if (programmati === 0 && errori > 0 && risultati.every(r => r.message?.includes('Sovrapposizione'))) {
        return res.status(409).json(response);
      }

      res.json(response);
    } catch (error) {
      logger.error('Errore programmazione visite MDL', {
        component: 'sorveglianza-sanitaria-routes',
        action: 'programma',
        error: 'Operazione non riuscita',
        companyId: req.params?.companyId
      });
      res.status(500).json({
        error: 'Errore interno del server',
        message: 'Errore nella programmazione delle visite mediche'
      });
    }
  }
);

// ─── Utility ──────────────────────────────────────────────────────
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default router;
