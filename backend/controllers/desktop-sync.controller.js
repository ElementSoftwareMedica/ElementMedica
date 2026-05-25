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
import { createMulterConfig } from '../config/multer.js';
import path from 'path';

// Multer instance for attachment uploads (clinical files, max 50MB)
const attachmentUpload = createMulterConfig({
    destination: 'uploads/allegati-visite',
    allowedMimeTypes: [
        'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv', 'application/dicom', 'application/octet-stream'
    ],
    maxFileSize: 50 * 1024 * 1024
});

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
                status: { in: ['ATTIVA', 'IN_PREAVVISO', 'SCADUTA'] }
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
                        provincia: true,
                        medicoCompetenteId: true
                    }
                },
                nomine: {
                    where: {
                        deletedAt: null,
                        stato: 'ATTIVA',
                        tipoRuolo: { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'] }
                    },
                    select: {
                        id: true,
                        personId: true,
                        tipoRuolo: true,
                        dataInizio: true,
                        dataFine: true,
                        dataScadenza: true,
                        person: { select: { id: true, firstName: true, lastName: true } }
                    }
                }
            }
        }) : [];

        // 14. Protocolli sanitari del tenant
        const protocolli = await prisma.protocolloSanitario.findMany({
            where: {
                tenantId,
                deletedAt: null
            },
            include: {
                prestazioni: {
                    where: { deletedAt: null },
                    include: { prestazione: true }
                }
            }
        });

        const medici = await prisma.person.findMany({
            where: {
                deletedAt: null,
                tenantProfiles: { some: { tenantId, deletedAt: null } },
                personRoles: {
                    some: {
                        tenantId,
                        deletedAt: null,
                        isActive: true,
                        roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE'] }
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                taxCode: true,
                tenantProfiles: {
                    where: { tenantId, deletedAt: null },
                    select: { email: true, phone: true, status: true, specialties: true },
                    take: 1
                }
            },
            orderBy: { lastName: 'asc' }
        });

        // 15. Visit templates del tenant
        const visitTemplates = await prisma.visitTemplate.findMany({
            where: {
                tenantId,
                deletedAt: null
            }
        });

        // 16. Modulistica/questionari configurati nella webapp
        const documentTemplates = await prisma.documentoTemplate.findMany({
            where: {
                tenantId,
                deletedAt: null,
                isActive: true
            },
            include: {
                questionarioConfig: true
            },
            orderBy: [
                { ordine: 'asc' },
                { nome: 'asc' }
            ]
        });

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
                    rischiAggiuntivi: rischiAggiuntivi.length,
                    protocolli: protocolli.length,
                    visitTemplates: visitTemplates.length,
                    documentTemplates: documentTemplates.length,
                    medici: medici.length
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
            rischiAggiuntivi,
            protocolli,
            visitTemplates,
            documentTemplates,
            medici
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
 * GET /api/v1/desktop-sync/download-full-db
 * Scarica l'intero database del tenant per uso offline completo.
 * Include TUTTI i pazienti, aziende, visite, scadenze, mansioni, ecc.
 * Supporta sincronizzazione incrementale via lastSyncAt query param.
 *
 * Query params:
 *   - lastSyncAt: ISO timestamp per download incrementale (opzionale)
 */
export async function downloadFullDb(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const lastSyncAt = req.query.lastSyncAt ? new Date(req.query.lastSyncAt) : null;

        logger.info({ tenantId, lastSyncAt }, '[P98] Download full DB request');

        const updatedFilter = lastSyncAt ? { updatedAt: { gte: lastSyncAt } } : {};

        // 1. ALL patients (Person + TenantProfile) for this tenant
        const pazienti = await prisma.person.findMany({
            where: {
                deletedAt: null,
                tenantProfiles: { some: { tenantId, deletedAt: null } },
                ...updatedFilter
            },
            select: {
                id: true, firstName: true, lastName: true, birthDate: true, birthPlace: true,
                birthProvince: true, gender: true, taxCode: true, profileImage: true,
                tenantProfiles: {
                    where: { tenantId, deletedAt: null },
                    select: {
                        id: true, email: true, phone: true, status: true,
                        residenceAddress: true, residenceCity: true, postalCode: true, province: true,
                        companyTenantProfileId: true, siteId: true, protocolloSanitarioId: true,
                        notes: true, disagioPsicologico: true, hiredDate: true, endDate: true
                    }
                }
            }
        });

        // 2. ALL companies for this tenant
        const aziende = await prisma.companyTenantProfile.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            include: {
                company: {
                    select: {
                        id: true, ragioneSociale: true, piva: true, codiceFiscale: true,
                        sedeLegaleIndirizzo: true, sedeLegaleCitta: true, sedeLegaleCap: true,
                        sedeLegaleProvincia: true, codiceAteco: true, settore: true
                    }
                },
                sites: {
                    where: { deletedAt: null },
                    select: { id: true, siteName: true, indirizzo: true, citta: true, cap: true, provincia: true, medicoCompetenteId: true }
                },
                nomine: {
                    where: {
                        deletedAt: null,
                        stato: 'ATTIVA',
                        tipoRuolo: { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'] }
                    },
                    select: {
                        id: true,
                        personId: true,
                        tipoRuolo: true,
                        dataInizio: true,
                        dataFine: true,
                        dataScadenza: true,
                        person: { select: { id: true, firstName: true, lastName: true } }
                    }
                }
            }
        });

        // 3. ALL mansioni
        const mansioni = await prisma.mansione.findMany({
            where: { tenantId, ...updatedFilter },
            include: { rischiAssociati: true }
        });

        // 4. ALL protocolli
        const protocolli = await prisma.protocolloSanitario.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            include: {
                prestazioni: { where: { deletedAt: null }, include: { prestazione: true } }
            }
        });

        // 5. ALL prestazioni
        const prestazioni = await prisma.prestazione.findMany({
            where: { tenantId, deletedAt: null, attivo: true, ...updatedFilter },
            select: {
                id: true, codice: true, nome: true, tipo: true, durataPrevista: true,
                prezzoBase: true, ivaAliquota: true, prezzoPrimaVisita: true, prezzoControllo: true,
                scadenzaDefaultMesi: true, branchType: true
            }
        });

        const medici = await prisma.person.findMany({
            where: {
                deletedAt: null,
                tenantProfiles: { some: { tenantId, deletedAt: null } },
                personRoles: {
                    some: {
                        tenantId,
                        deletedAt: null,
                        isActive: true,
                        roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE'] }
                    }
                }
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                gender: true,
                taxCode: true,
                tenantProfiles: {
                    where: { tenantId, deletedAt: null },
                    select: { email: true, phone: true, status: true, specialties: true },
                    take: 1
                }
            },
            orderBy: { lastName: 'asc' }
        });

        // 6. ALL ambulatori
        const ambulatori = await prisma.ambulatorio.findMany({
            where: { tenantId, deletedAt: null, stato: 'ATTIVO', ...updatedFilter },
            select: { id: true, codice: true, nome: true, specializzazione: true, colore: true, isEsterno: true }
        });

        // 7. ALL active scadenze
        const scadenze = await prisma.deadlineItem.findMany({
            where: { tenantId, deletedAt: null, status: { in: ['ATTIVA', 'IN_PREAVVISO', 'SCADUTA'] }, ...updatedFilter },
            orderBy: { dataScadenza: 'asc' }
        });

        // 8. ALL lavoratore-mansione assignments
        const lavoratoriMansioni = await prisma.lavoratoreMansione.findMany({
            where: { tenantId, isAttiva: true, ...updatedFilter },
            include: { mansione: true }
        });

        // 9. Visit templates
        const visitTemplates = await prisma.visitTemplate.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter }
        });

        // 9b. Modulistica/questionari configurati nella webapp
        const documentTemplates = await prisma.documentoTemplate.findMany({
            where: { tenantId, deletedAt: null, isActive: true, ...updatedFilter },
            include: { questionarioConfig: true },
            orderBy: [
                { ordine: 'asc' },
                { nome: 'asc' }
            ]
        });

        // 10. Rischi aggiuntivi
        const rischiAggiuntivi = await prisma.lavoratoreRischioAggiuntivo.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            select: {
                id: true, personId: true, tenantId: true, codiceRischio: true, livello: true,
                categoria: true, descrizioneEsposizione: true, fonteRischio: true,
                periodicitaMesi: true, note: true, sourceMansioneId: true,
                createdAt: true, updatedAt: true
            }
        });

        // 11. Recent visits (last 500, or updated since lastSyncAt)
        const visite = await prisma.visita.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            orderBy: { dataOra: 'desc' },
            take: 500,
            select: {
                id: true, appuntamentoId: true, ambulatorioId: true, prestazioneId: true,
                pazienteId: true, medicoId: true, dataOra: true, durataEffettiva: true,
                stato: true, anamnesi: true, esamiObiettivo: true, diagnosiPrincipale: true,
                terapia: true, noteClinico: true, prescrizioni: true, prossimoControllo: true,
                noteFollowup: true, isPrimaVisita: true, tipoVisitaMDL: true,
                tenantId: true, createdAt: true, updatedAt: true
            }
        });

        // 12. Tariffari + voci (catalog data needed offline)
        // Query TariffarioAziendale (owner of voci), include company associations
        const tariffariRaw = await prisma.tariffarioAziendale.findMany({
            where: { tenantId, deletedAt: null, attivo: true },
            include: {
                voci: { where: { deletedAt: null, attivo: true }, include: { prestazione: true } },
                companyAssociations: {
                    where: { deletedAt: null, attivo: true },
                    select: { id: true, companyTenantProfileId: true, validoDa: true, validoA: true }
                }
            }
        });
        const tariffari = tariffariRaw.map(t => ({
            id: t.id,
            nome: t.nome,
            codice: t.codice,
            descrizione: t.descrizione,
            attivo: t.attivo,
            validoDa: t.validoDa,
            validoA: t.validoA,
            companyAssociations: JSON.stringify((t.companyAssociations || []).map(a => ({
                companyTenantProfileId: a.companyTenantProfileId,
                validoDa: a.validoDa,
                validoA: a.validoA
            }))),
            voci: JSON.stringify((t.voci || []).map(v => ({
                id: v.id,
                tipo: v.tipo,
                nome: v.prestazione?.nome || v.tipo,
                prezzoBase: v.prezzoBase,
                categoriaVisita: v.categoriaVisita,
                attivo: v.attivo
            }))),
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
        }));

        // 13. Convenzioni
        const convenzioniRaw = await prisma.convenzione.findMany({
            where: { tenantId, deletedAt: null, attiva: true },
            select: {
                id: true, nome: true, codice: true, tipo: true, descrizione: true,
                enteTerzo: true, branchType: true, attiva: true,
                dataInizio: true, dataFine: true, condizioni: true,
                tenantId: true, createdAt: true, updatedAt: true
            }
        });
        const convenzioni = convenzioniRaw.map(c => ({
            ...c,
            condizioni: c.condizioni ? JSON.stringify(c.condizioni) : null
        }));

        // 14. Recent giudizi idoneità (last 2 years)
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 2);
        const giudiziPrecedenti = await prisma.giudizioIdoneita.findMany({
            where: { tenantId, deletedAt: null, dataEmissione: { gte: cutoff }, ...updatedFilter },
            orderBy: { dataEmissione: 'desc' },
            take: 1000,
            select: {
                id: true, visitaId: true, personId: true, medicoCompetenteId: true,
                tipoGiudizio: true, prescrizioniIdoneita: true, limitazioni: true,
                dataEmissione: true, dataScadenza: true, motivazioni: true,
                tenantId: true, createdAt: true, updatedAt: true
            }
        });

        // 15. Recent movimenti contabili (last 6 months)
        const cutoffMovimenti = new Date();
        cutoffMovimenti.setMonth(cutoffMovimenti.getMonth() - 6);
        const movimentiContabili = await prisma.movimentoContabile.findMany({
            where: { tenantId, deletedAt: null, dataEsecuzione: { gte: cutoffMovimenti }, ...updatedFilter },
            orderBy: { dataEsecuzione: 'desc' },
            take: 2000,
            select: {
                id: true, visitaId: true, personId: true, companyTenantProfileId: true,
                importoLordo: true, aliquotaIva: true, importoIva: true, direzione: true,
                stato: true, tipo: true, descrizione: true, dataEsecuzione: true,
                riferimentoPagamento: true, tenantId: true, createdAt: true, updatedAt: true
            }
        });

        const payload = {
            meta: {
                tenantId,
                downloadedAt: new Date().toISOString(),
                isFullSync: !lastSyncAt,
                lastSyncAt: lastSyncAt?.toISOString() || null,
                version: '1.0.0',
                counts: {
                    pazienti: pazienti.length,
                    aziende: aziende.length,
                    mansioni: mansioni.length,
                    protocolli: protocolli.length,
                    prestazioni: prestazioni.length,
                    ambulatori: ambulatori.length,
                    scadenze: scadenze.length,
                    lavoratoriMansioni: lavoratoriMansioni.length,
                    visitTemplates: visitTemplates.length,
                    documentTemplates: documentTemplates.length,
                    medici: medici.length,
                    rischiAggiuntivi: rischiAggiuntivi.length,
                    visite: visite.length,
                    tariffari: tariffari.length,
                    convenzioni: convenzioni.length,
                    giudizi: giudiziPrecedenti.length,
                    movimenti: movimentiContabili.length
                }
            },
            pazienti,
            aziende,
            mansioni,
            protocolli,
            prestazioni,
            ambulatori,
            scadenze,
            lavoratoriMansioni,
            visitTemplates,
            documentTemplates,
            medici,
            rischiAggiuntivi,
            visite,
            tariffari,
            convenzioni,
            giudiziPrecedenti,
            movimentiContabili
        };

        logger.info({ tenantId, counts: payload.meta.counts }, '[P98] Download full DB completed');
        res.json(payload);
    } catch (error) {
        logger.error({ error: error.message, stack: error.stack }, '[P98] Errore download full DB');
        res.status(500).json({ error: 'Errore nel download del database completo' });
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
            'movimentoContabile', 'deadlineItem', 'scadenzaPrestazioneProtocollo',
            'personTenantProfile', 'companyTenantProfile',
            'lavoratoreRischioAggiuntivo',
            'lavoratoreMansione', 'mansione', 'companySite', 'appuntamentoPrestazione',
            'protocolloSanitario',
            'allegatoVisita', 'documentoCompilato'
        ];
        const allowedActions = ['create', 'update', 'delete'];

        // Entity types that have a createdBy field in Prisma schema
        const createdBySupported = new Set(['visita', 'appuntamento', 'movimentoContabile', 'appuntamentoPrestazione']);

        // Entity types that contain personal health data — require GDPR audit on DELETE
        const gdprAuditEntities = new Set([
            'visita', 'appuntamento', 'giudizioIdoneita', 'esameStrumentale',
            'personTenantProfile', 'lavoratoreRischioAggiuntivo', 'appuntamentoPrestazione'
        ]);

        // SQLite-internal fields that must never be sent to Prisma
        const SQLITE_INTERNAL_FIELDS = new Set([
            '_syncStatus', '_localUpdatedAt', '_lastSyncAt', '_isDeleted',
            '_version', '_localId', '_serverId', 'localPath', 'serverUrl'
        ]);

        // Denormalized display-only fields that exist in local SQLite but not in Prisma
        const DISPLAY_ONLY_FIELDS = new Set([
            'personFirstName', 'personLastName', 'personTaxCode',
            'medicoFirstName', 'medicoLastName', 'companyName',
            'prestazioneNome', 'prestazioneCodice', 'ambulatorioNome',
            'mansione', 'isMDL'
        ]);

        /**
         * Per-entity field transformers: remap local SQLite field names to Prisma field names.
         * Also strips local-only fields and adds required defaults where missing.
         * Called AFTER SQLITE_INTERNAL_FIELDS filtering, BEFORE calling Prisma.
         */
        const transformFields = (entityType, data, action) => {
            const d = { ...data };

            if (entityType === 'visita') {
                // personId → pazienteId
                if ('personId' in d && !('pazienteId' in d)) { d.pazienteId = d.personId; delete d.personId; }
                // esameObiettivo → esamiObiettivo
                if ('esameObiettivo' in d && !('esamiObiettivo' in d)) { d.esamiObiettivo = d.esameObiettivo; delete d.esameObiettivo; }
                // diagnosi → diagnosiPrincipale
                if ('diagnosi' in d && !('diagnosiPrincipale' in d)) { d.diagnosiPrincipale = d.diagnosi; delete d.diagnosi; }
                // noteInterne → noteClinico
                if ('noteInterne' in d && !('noteClinico' in d)) { d.noteClinico = d.noteInterne; delete d.noteInterne; }
                // durataMinuti → durataEffettiva
                if ('durataMinuti' in d && !('durataEffettiva' in d)) { d.durataEffettiva = d.durataMinuti; delete d.durataMinuti; }
                // templateId → visitTemplateId
                if ('templateId' in d && !('visitTemplateId' in d)) { d.visitTemplateId = d.templateId; delete d.templateId; }
                // stato: 'INIZIATA' → 'IN_CORSO' (not a valid StatoVisita enum value)
                if (d.stato === 'INIZIATA') d.stato = 'IN_CORSO';
                // datiStrutturati: parse JSON string for Prisma Json field
                if (typeof d.datiStrutturati === 'string') {
                    try { d.datiStrutturati = JSON.parse(d.datiStrutturati); } catch { d.datiStrutturati = {}; }
                }
                // Strip local-only fields not in Prisma Visita schema
                ['dataInizio', 'dataFine', 'motivoVisita', 'notePazienti', 'tipo',
                    'firmaMedico', 'firmaPaziente', 'firmaTimestamp', 'totaleCosto',
                    'spiReadings', 'durataMinuti'].forEach(f => delete d[f]);
            }

            else if (entityType === 'appuntamento') {
                // personId → pazienteId
                if ('personId' in d && !('pazienteId' in d)) { d.pazienteId = d.personId; delete d.personId; }
                // tipo: 'NON_PROGRAMMATA' is not a valid TipoVisitaMDL — map to tipoVisitaMDL or strip
                if ('tipo' in d) {
                    const VALID_TIPO_MDL = ['PREVENTIVA', 'PREVENTIVA_PREASSUNTIVA', 'PERIODICA', 'CAMBIO_MANSIONE',
                        'CESSAZIONE_RAPPORTO', 'PRECEDENTE_ASSENZA', 'SU_RICHIESTA_LAVORATORE', 'STRAORDINARIA',
                        'VERIFICA_IDONEITA', 'RIENTRO_MATERNITA'];
                    if (!VALID_TIPO_MDL.includes(d.tipo)) delete d.tipo;
                    else if (!('tipoVisitaMDL' in d)) { d.tipoVisitaMDL = d.tipo; delete d.tipo; }
                    else delete d.tipo;
                }
                // Generate numeroPrenotazione if missing (required field in Prisma)
                if (!d.numeroPrenotazione) d.numeroPrenotazione = `MDL-${Date.now()}`;
                // durata → durataMinuti
                if ('durata' in d && !('durataMinuti' in d)) { d.durataMinuti = d.durata; delete d.durata; }
            }

            else if (entityType === 'giudizioIdoneita') {
                // medicoId → medicoCompetenteId (fallback for old payloads not yet fixed)
                if ('medicoId' in d && !('medicoCompetenteId' in d)) { d.medicoCompetenteId = d.medicoId; delete d.medicoId; }
                // esito → tipoGiudizio (fallback for old payloads)
                if ('esito' in d && !('tipoGiudizio' in d)) { d.tipoGiudizio = d.esito; delete d.esito; }
                // prescrizioni → prescrizioniIdoneita (fallback for old payloads)
                if ('prescrizioni' in d && !('prescrizioniIdoneita' in d)) { d.prescrizioniIdoneita = d.prescrizioni; delete d.prescrizioni; }
                // Strip local-only fields
                ['tipo', 'note', 'firmaMedico', 'protocolloNumero'].forEach(f => delete d[f]);
            }

            else if (entityType === 'deadlineItem') {
                // eseguita → status: COMPLETATA (fallback for old payloads not yet fixed)
                if ('eseguita' in d && !('status' in d)) {
                    d.status = d.eseguita ? 'COMPLETATA' : 'ATTIVA';
                    delete d.eseguita;
                }
                // dataEsecuzione → completatoAt (fallback)
                if ('dataEsecuzione' in d && !('completatoAt' in d)) { d.completatoAt = d.dataEsecuzione; delete d.dataEsecuzione; }
                // Strip local display-only fields
                ['prestazioneNome', 'mansione', 'urgenza'].forEach(f => delete d[f]);
            }

            else if (entityType === 'scadenzaPrestazioneProtocollo') {
                // Convert SQLite integer booleans to JS/Prisma booleans
                if ('eseguita' in d) d.eseguita = d.eseguita === 1 || d.eseguita === true;
                if ('isPrimaVisita' in d) d.isPrimaVisita = d.isPrimaVisita === 1 || d.isPrimaVisita === true;
                // Strip local display-only fields not present in Prisma model
                ['personFirstName', 'personLastName', 'prestazioneNome', 'mansione', 'companyName', 'stato'].forEach(f => delete d[f]);
                // mansioneId is required in Prisma schema
                if (!d.mansioneId) {
                    logger.warn({ entityType, id: d.id }, 'scadenzaPrestazioneProtocollo missing mansioneId — skipping');
                    return null;
                }
            }

            else if (entityType === 'movimentoContabile') {
                // importo → importoLordo
                if ('importo' in d && !('importoLordo' in d)) { d.importoLordo = d.importo; delete d.importo; }
                // iva → aliquotaIva
                if ('iva' in d && !('aliquotaIva' in d)) { d.aliquotaIva = d.iva; delete d.iva; }
                // dataMovimento → dataEsecuzione
                if ('dataMovimento' in d && !('dataEsecuzione' in d)) { d.dataEsecuzione = d.dataMovimento; delete d.dataMovimento; }
                // riferimentoFattura → riferimentoPagamento
                if ('riferimentoFattura' in d && !('riferimentoPagamento' in d)) { d.riferimentoPagamento = d.riferimentoFattura; delete d.riferimentoFattura; }
                // Add required defaults for CREATE
                if (action === 'create') {
                    if (!d.direzione) d.direzione = 'ENTRATA';
                    if (!d.tipoSoggetto) d.tipoSoggetto = d.companyTenantProfileId ? 'AZIENDA' : 'PAZIENTE';
                    if (d.importoIva === undefined && d.aliquotaIva === 0) d.importoIva = 0;
                }
            }

            else if (entityType === 'allegatoVisita') {
                // allegatoVisita CREATE is handled by the file upload pipeline (syncAttachments)
                // Only DELETE operations should reach here via the batch sync
                // Strip local-only fields that don't exist in AllegatoVisita Prisma model
                ['dimensione', 'localPath', 'nome', 'tipo'].forEach(f => delete d[f]);
            }

            else if (entityType === 'documentoCompilato') {
                // personId → pazienteId
                if ('personId' in d && !('pazienteId' in d)) { d.pazienteId = d.personId; delete d.personId; }
                // templateId → documentoTemplateId
                if ('templateId' in d && !('documentoTemplateId' in d)) { d.documentoTemplateId = d.templateId; delete d.templateId; }
                // risposte → datiCompilati (parse JSON string for Prisma Json field)
                if ('risposte' in d && !('datiCompilati' in d)) {
                    try { d.datiCompilati = typeof d.risposte === 'string' ? JSON.parse(d.risposte) : d.risposte; }
                    catch { d.datiCompilati = {}; }
                    delete d.risposte;
                }
                // dataCompilazione is local-only
                delete d.dataCompilazione;
            }

            else if (entityType === 'mansione') {
                if ('nome' in d && !('denominazione' in d)) { d.denominazione = d.nome; delete d.nome; }
                if (!d.codice) {
                    const suffix = String(d.id || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
                    d.codice = `DESK-${suffix || Date.now()}`;
                }
                ['companyTenantProfileId', 'companyName', 'rischi', 'rischiAssociati', 'isActive'].forEach(f => delete d[f]);
            }

            // Strip denormalized display-only fields from all entity types
            for (const f of DISPLAY_ONLY_FIELDS) delete d[f];

            return d;
        };

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

                // Apply tenantId enforcement and strip SQLite-internal fields
                const rawData = Object.fromEntries(
                    Object.entries({ ...op.data, tenantId }).filter(([k]) => !SQLITE_INTERNAL_FIELDS.has(k))
                );

                // Apply entity-specific field transformers (local SQLite names → Prisma names)
                const sanitizedData = transformFields(op.entityType, rawData, op.action);
                if (!sanitizedData) {
                    results.push({
                        operationId: op.id,
                        status: 'skipped',
                        error: 'Operazione ignorata: dati non sincronizzabili'
                    });
                    continue;
                }

                let result;
                if (op.action === 'create') {
                    // Special handling for personTenantProfile: need to create Person first
                    if (op.entityType === 'personTenantProfile') {
                        const { firstName, lastName, taxCode, birthDate, birthPlace, gender, profileImage, companyName, ...profileData } = sanitizedData;
                        // Find or create Person record
                        let person = taxCode
                            ? await prisma.person.findFirst({ where: { taxCode, deletedAt: null } })
                            : null;
                        if (!person) {
                            person = await prisma.person.create({
                                data: {
                                    id: op.entityId, // Use local UUID so visits can reference personId
                                    firstName: firstName || '',
                                    lastName: lastName || '',
                                    taxCode: taxCode || null,
                                    birthDate: birthDate ? new Date(birthDate) : null,
                                    birthPlace: birthPlace || null,
                                    gender: gender || null,
                                }
                            });
                        }
                        result = await prisma.personTenantProfile.create({
                            data: { ...profileData, personId: person.id }
                        });
                    } else {
                        const createData = {
                            id: sanitizedData.id || op.entityId,
                            ...sanitizedData,
                            ...(createdBySupported.has(op.entityType) ? { createdBy: personId } : {})
                        };
                        result = await prisma[op.entityType].create({
                            data: createData
                        });
                    }
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
                } else if (op.action === 'delete') {
                    // Verify entity belongs to tenant before soft-deleting
                    const existing = await prisma[op.entityType].findFirst({
                        where: {
                            id: op.entityId,
                            tenantId,
                            deletedAt: null
                        }
                    });

                    if (!existing) {
                        // Already deleted or not found — treat as success (idempotent)
                        results.push({
                            operationId: op.id,
                            status: 'success',
                            serverId: op.entityId
                        });
                        continue;
                    }

                    result = await prisma[op.entityType].update({
                        where: { id: op.entityId },
                        data: { deletedAt: new Date() }
                    });

                    // GDPR audit log for entities containing personal health data
                    if (gdprAuditEntities.has(op.entityType)) {
                        await prisma.gdprAuditLog.create({
                            data: {
                                tenantId,
                                personId,
                                action: 'DELETE',
                                resourceType: op.entityType,
                                resourceId: op.entityId,
                                dataAccessed: {
                                    deletionReason: sanitizedData.deletionReason || op.data?.deletionReason || 'Eliminazione da app desktop',
                                    operation: 'SOFT_DELETE_DESKTOP_SYNC'
                                }
                            }
                        }).catch(auditErr => {
                            logger.warn({ error: auditErr.message }, '[P98] GDPR audit log fallita per DELETE desktop');
                        });
                    }
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

        // Log client registration (persistence can be added later via DesktopSyncClient table)
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

/**
 * POST /api/v1/desktop-sync/error-report
 * Riceve log degli errori client-side accumulati dal client desktop.
 * Gli errori vengono loggati server-side per monitoraggio.
 *
 * Body:
 *   - errors: Array<{ ts, message, stack?, context? }>
 */
export async function errorReport(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const personId = req.person.id;
        const { errors } = req.body;

        if (!Array.isArray(errors) || errors.length === 0) {
            return res.json({ received: 0 });
        }

        const MAX_ERRORS = 100;
        const truncated = errors.slice(0, MAX_ERRORS);

        for (const err of truncated) {
            logger.warn({
                tenantId,
                personId,
                clientTs: err.ts,
                clientMessage: err.message,
                clientContext: err.context
            }, '[P98] Desktop client error report');
        }

        res.json({ received: truncated.length });
    } catch (error) {
        logger.error({ error: error.message }, '[P98] Errore error report');
        res.status(500).json({ error: 'Errore nel salvataggio del report' });
    }
}
export function getAttachmentUploadMiddleware() {
    return attachmentUpload.single('file');
}

/**
 * GET /api/v1/desktop-sync/conflict-data
 * Restituisce lo stato attuale server di un'entità per il confronto conflitti.
 * 
 * Query params:
 *   - entityType: string (visita, appuntamento, giudizioIdoneita, ...)
 *   - entityId: string (UUID server)
 */
export async function getConflictData(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const { entityType, entityId } = req.query;

        const allowedEntityTypes = [
            'visita', 'appuntamento', 'giudizioIdoneita', 'esameStrumentale',
            'movimentoContabile', 'deadlineItem', 'scadenzaPrestazioneProtocollo',
            'personTenantProfile', 'companyTenantProfile',
            'lavoratoreRischioAggiuntivo', 'lavoratoreMansione', 'companySite',
            'appuntamentoPrestazione', 'protocolloSanitario',
            'allegatoVisita', 'documentoCompilato'
        ];

        if (!entityType || !allowedEntityTypes.includes(entityType)) {
            return res.status(400).json({ error: 'entityType non valido' });
        }
        if (!entityId || typeof entityId !== 'string' || entityId.length > 100) {
            return res.status(400).json({ error: 'entityId non valido' });
        }

        // Models that don't have a top-level tenantId field
        const noTenantIdModels = new Set(['allegatoVisita', 'appuntamentoPrestazione', 'documentoCompilato', 'lavoratoreMansione', 'lavoratoreRischioAggiuntivo']);

        let serverEntity;
        if (noTenantIdModels.has(entityType)) {
            serverEntity = await prisma[entityType].findFirst({ where: { id: entityId } });
        } else {
            serverEntity = await prisma[entityType].findFirst({ where: { id: entityId, tenantId } });
        }

        if (!serverEntity) {
            return res.status(404).json({ error: 'Entità non trovata sul server' });
        }

        // Remove sensitive internal fields before sending
        const safeEntity = { ...serverEntity };
        delete safeEntity.tenantId;

        res.json({ entityType, entityId, serverData: safeEntity });
    } catch (error) {
        logger.error({ error: error.message }, '[P98] Errore get conflict data');
        res.status(500).json({ error: 'Errore nel recupero dei dati conflitto' });
    }
}

/**
 * POST /api/v1/desktop-sync/upload-attachment
 * Carica un allegato binario da client desktop offline.
 * Crea il record AllegatoVisita nel DB e restituisce serverUrl.
 *
 * Body (multipart/form-data):
 *   - file: binary file
 *   - visitaId: string
 *   - allegatoLocalId: string
 *   - nome: string
 *   - tipo: string (estensione)
 *   - dimensione: string (number)
 *   - mimeType: string
 */
export async function uploadAttachment(req, res) {
    try {
        const tenantId = getEffectiveTenantId(req);
        const personId = req.person.id;

        if (!req.file) {
            return res.status(400).json({ error: 'File obbligatorio' });
        }

        const { visitaId, allegatoLocalId, nome, tipo, dimensione, mimeType } = req.body;

        if (!visitaId || !nome) {
            return res.status(400).json({ error: 'visitaId e nome sono obbligatori' });
        }

        // Verify visita belongs to this tenant
        const visita = await prisma.visita.findFirst({
            where: { id: visitaId, tenantId, deletedAt: null }
        });
        if (!visita) {
            return res.status(404).json({ error: 'Visita non trovata' });
        }

        // Build server URL (relative path served by the static file server)
        const relativeUrl = `/uploads/allegati-visite/${req.file.filename}`;

        // Determine file extension
        const ext = path.extname(req.file.originalname).replace('.', '').toLowerCase();

        // Create AllegatoVisita record
        const allegato = await prisma.allegatoVisita.create({
            data: {
                visitaId,
                tenantId,
                tipo: tipo || ext || 'bin',
                nome,
                fileName: req.file.filename,
                fileUrl: relativeUrl,
                fileSize: req.file.size || (dimensione ? parseInt(dimensione, 10) : null),
                mimeType: mimeType || req.file.mimetype,
                caricatoDa: personId
            }
        });

        logger.info({
            tenantId, visitaId, allegatoId: allegato.id, allegatoLocalId, fileName: req.file.filename
        }, '[P98] Allegato visita caricato da client desktop');

        res.json({
            success: true,
            allegatoId: allegato.id,
            allegatoLocalId,
            serverUrl: relativeUrl,
            fileName: req.file.filename
        });
    } catch (error) {
        logger.error({ error: error.message, stack: error.stack }, '[P98] Errore upload allegato desktop');
        res.status(500).json({ error: 'Errore nel caricamento del file' });
    }
}
