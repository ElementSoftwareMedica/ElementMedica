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
import { assertUploadedFileIsSafe } from '../utils/fileSecurity.js';
import fs from 'fs';
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

const DESKTOP_NOMINA_ROLES = [
    'MEDICO_COMPETENTE',
    'MEDICO_COMPETENTE_COORDINATO',
    'RSPP',
    'ASPP',
    'RLS',
    'PREPOSTO',
    'ADDETTO_PS',
    'ADDETTO_AI',
    'DIRIGENTE_SICUREZZA'
];

const DESKTOP_PROFESSIONAL_ROLES = [
    'MEDICO',
    'MEDICO_COMPETENTE',
    'RSPP',
    'ASPP',
    'CONSULENTE_SICUREZZA',
    'TECNICO_SICUREZZA'
];

function collectProfessionalIdsFromCompanies(aziende = []) {
    const ids = new Set();
    for (const profile of aziende) {
        if (profile.referenteId) ids.add(profile.referenteId);
        for (const site of profile.sites || []) {
            if (site.medicoCompetenteId) ids.add(site.medicoCompetenteId);
            if (site.rsppId) ids.add(site.rsppId);
            if (site.referenteId) ids.add(site.referenteId);
        }
        for (const nomina of profile.nomine || []) {
            if (nomina.personId) ids.add(nomina.personId);
        }
    }
    return [...ids].filter(Boolean);
}

async function getDesktopProfessionals(tenantId, professionalIds = []) {
    const idFilter = professionalIds.length > 0 ? [{ id: { in: professionalIds } }] : [];
    return prisma.person.findMany({
        where: {
            deletedAt: null,
            OR: [
                {
                    personRoles: {
                        some: {
                            tenantId,
                            deletedAt: null,
                            isActive: true,
                            roleType: { in: DESKTOP_PROFESSIONAL_ROLES }
                        }
                    }
                },
                ...idFilter
            ]
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
            },
            personRoles: {
                where: { tenantId, deletedAt: null, isActive: true },
                select: { roleType: true }
            },
            nomine: {
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: 'ATTIVA',
                    tipoRuolo: { in: DESKTOP_NOMINA_ROLES }
                },
                select: { tipoRuolo: true, companyTenantProfileId: true, siteId: true }
            }
        },
        orderBy: { lastName: 'asc' }
    });
}

function splitMansioniForDesktop(mansioni = []) {
    const mansioneRischi = mansioni.flatMap(m => (m.rischiAssociati || []).map(r => ({
        ...r,
        mansioneId: r.mansioneId || m.id,
        tenantId: r.tenantId || m.tenantId
    })));
    const mansioniBase = mansioni.map(({ rischiAssociati, ...m }) => m);
    return { mansioniBase, mansioneRischi };
}

function splitProtocolliForDesktop(protocolli = []) {
    const protocolloPrestazioni = protocolli.flatMap(p => (p.prestazioni || []).map(item => ({
        id: item.id,
        tenantId: item.tenantId || p.tenantId,
        protocolloId: item.protocolloId || p.id,
        prestazioneId: item.prestazioneId || item.prestazione?.id,
        prestazioneNome: item.prestazione?.nome || item.prestazioneNome || null,
        prestazioneCodice: item.prestazione?.codice || item.prestazioneCodice || null,
        isObbligatoria: item.isObbligatoria,
        periodicita: item.periodicita,
        periodicitaCustomMesi: item.periodicitaCustomMesi,
        scadenzaDefaultMesi: item.prestazione?.scadenzaDefaultMesi || item.scadenzaDefaultMesi || null,
        condizioniApplicazione: item.condizioniApplicazione,
        note: item.note,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        deletedAt: item.deletedAt
    })));
    const protocolliBase = protocolli.map(({ prestazioni, ...p }) => p);
    return { protocolliBase, protocolloPrestazioni };
}

function splitDocumentTemplatesForDesktop(documentTemplates = []) {
    const questionariMediciConfig = documentTemplates
        .filter(t => t.questionarioConfig)
        .map(t => ({
            ...t.questionarioConfig,
            documentoTemplateId: t.id,
            tenantId: t.questionarioConfig.tenantId || t.tenantId
        }));
    const documentTemplatesBase = documentTemplates.map(({ questionarioConfig, ...t }) => t);
    return { documentTemplatesBase, questionariMediciConfig };
}

export const DESKTOP_TOMBSTONE_SOURCES = [
    { model: 'person', table: 'patients', where: tenantId => ({ tenantProfiles: { some: { tenantId } } }) },
    { model: 'personTenantProfile', table: 'patients', idField: 'personId' },
    { model: 'companyTenantProfile', table: 'companies' },
    { model: 'companySite', table: 'company_sites' },
    { model: 'nominaRuolo', table: 'nomine_ruolo' },
    { model: 'appuntamento', table: 'appointments' },
    { model: 'appuntamentoPrestazione', table: 'appointment_prestazioni' },
    { model: 'visita', table: 'visits' },
    { model: 'allegatoVisita', table: 'allegati' },
    { model: 'mansione', table: 'mansioni' },
    { model: 'mansioneRischio', table: 'mansione_rischi' },
    { model: 'lavoratoreMansione', table: 'lavoratore_mansioni' },
    { model: 'lavoratoreRischioAggiuntivo', table: 'lavoratore_rischi_aggiuntivi' },
    { model: 'protocolloSanitario', table: 'protocolli' },
    { model: 'protocolloPrestazione', table: 'protocollo_prestazioni' },
    { model: 'scadenzaPrestazioneProtocollo', table: 'scadenze' },
    { model: 'giudizioIdoneita', table: 'giudizi_idoneita' },
    { model: 'movimentoContabile', table: 'movimenti_contabili' },
    { model: 'prestazione', table: 'prestazioni' },
    { model: 'tariffarioAziendale', table: 'tariffari' },
    { model: 'voceTariffario', table: 'tariffario_voci' },
    { model: 'tariffarioCompanyAssociation', table: 'tariffario_company_associations' },
    { model: 'convenzione', table: 'convenzioni' },
    { model: 'ambulatorio', table: 'ambulatori' },
    { model: 'slotDisponibilita', table: 'slot_disponibilita' },
    { model: 'visitTemplate', table: 'visit_templates' },
    { model: 'documentoTemplate', table: 'document_templates' },
    { model: 'documentoCompilato', table: 'documenti_compilati' },
    { model: 'profiloDiSalutePersona', table: 'profili_salute' },
    { model: 'documentoClinico', table: 'documenti_clinici' },
    { model: 'personDocument', table: 'person_documents' },
    { model: 'referto', table: 'referti' },
    { model: 'firmaDigitale', table: 'firme_digitali' },
    { model: 'sopralluogo', table: 'sopralluoghi' },
    { model: 'dVR', table: 'dvr' },
    { model: 'consulenzaMDL', table: 'consulenze_mdl' },
    { model: 'allegato3B', table: 'allegati_3b' }
];

export const DESKTOP_SYNC_ENTITY_TYPES = [
    'visita', 'appuntamento', 'giudizioIdoneita', 'esameStrumentale',
    'movimentoContabile', 'deadlineItem', 'scadenzaPrestazioneProtocollo',
    'personTenantProfile', 'companyTenantProfile',
    'lavoratoreRischioAggiuntivo',
    'lavoratoreMansione', 'mansione', 'companySite', 'appuntamentoPrestazione',
    'protocolloSanitario', 'protocolloPrestazione', 'mansioneRischio',
    'allegatoVisita', 'documentoCompilato', 'questionarioMedicoConfig', 'nominaRuolo',
    'questionarioRisposta', 'profiloDiSalutePersona', 'documentoClinico',
    'referto', 'firmaDigitale',
    'tariffarioCompanyAssociation',
    'sopralluogo', 'dVR', 'consulenzaMDL', 'allegato3B'
];

export async function getDesktopTombstones(tenantId, lastSyncAt) {
    if (!lastSyncAt) return [];

    const rows = await Promise.all(DESKTOP_TOMBSTONE_SOURCES.map(async source => {
        const model = prisma[source.model];
        if (!model?.findMany) return [];

        const tenantWhere = source.where ? source.where(tenantId) : { tenantId };
        const select = {
            id: true,
            deletedAt: true,
            updatedAt: true,
            ...(source.idField ? { [source.idField]: true } : {})
        };
        const deletedRows = await model.findMany({
            where: {
                ...tenantWhere,
                deletedAt: { gte: lastSyncAt }
            },
            select,
            take: 5000
        });

        return deletedRows.map(row => ({
            table: source.table,
            id: source.idField ? row[source.idField] : row.id,
            tenantId,
            deletedAt: row.deletedAt || row.updatedAt,
            updatedAt: row.updatedAt
        })).filter(row => row.id);
    }));

    return rows.flat();
}

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

        // 6. Scadenze protocollo MDL per i pazienti della giornata.
        // Keep day-sync aligned with full-db sync and the desktop `scadenze` table.
        const scadenze = pazienteIds.length > 0 ? await prisma.scadenzaPrestazioneProtocollo.findMany({
            where: {
                tenantId,
                deletedAt: null,
                personId: { in: pazienteIds }
            },
            orderBy: { dataScadenza: 'asc' },
            select: {
                id: true,
                tenantId: true,
                personId: true,
                mansioneId: true,
                prestazioneId: true,
                protocolloId: true,
                dataScadenza: true,
                periodicitaMesi: true,
                isPrimaVisita: true,
                eseguita: true,
                dataEsecuzione: true,
                visitaId: true,
                appuntamentoId: true,
                documentoTemplateId: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true
            }
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

        const slotDisponibilita = await prisma.slotDisponibilita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                data: { gte: startOfDay, lte: endOfDay },
                ...(ambulatorioId ? { ambulatorioId } : {})
            },
            select: {
                id: true, ambulatorioId: true, medicoId: true, prestazioneId: true,
                appuntamentoId: true, disponibilitaMedicoId: true, data: true,
                oraInizio: true, oraFine: true, stato: true, disponibile: true,
                motivoBlocco: true, note: true, visibilePubblico: true, prenotabileOnline: true,
                maxPrenotazioni: true, anticipoMinimoOre: true, anticipoMassimoGiorni: true,
                durataSlotMinuti: true, tenantId: true, createdAt: true, updatedAt: true, deletedAt: true
            },
            orderBy: [{ data: 'asc' }, { oraInizio: 'asc' }]
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
                tenantId,
                deletedAt: null
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

        // 12. CompanyTenantProfiles del tenant (con sedi/nomine MDL).
        // Il desktop usa anche /aziende e /aziende/:id offline: scaricare solo le
        // aziende degli appuntamenti del giorno nasconde nomine MC valide.
        const aziende = await prisma.companyTenantProfile.findMany({
            where: {
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
                        medicoCompetenteId: true,
                        rsppId: true,
                        referenteId: true,
                        dvr: true,
                        dvrDataAggiornamento: true,
                        ultimoSopralluogo: true,
                        prossimoSopralluogo: true,
                        ultimoSopralluogoRSPP: true,
                        prossimoSopralluogoRSPP: true,
                        ultimoSopralluogoMedico: true,
                        prossimoSopralluogoMedico: true
                    }
                },
                nomine: {
                    where: {
                        deletedAt: null,
                        stato: 'ATTIVA',
                        tipoRuolo: { in: DESKTOP_NOMINA_ROLES }
                    },
                    select: {
                        id: true,
                        personId: true,
                        companyTenantProfileId: true,
                        siteId: true,
                        tenantId: true,
                        tipoRuolo: true,
                        stato: true,
                        dataInizio: true,
                        dataFine: true,
                        dataScadenza: true,
                        numeroProtocollo: true,
                        documentoNominaId: true,
                        formazioneRichiesta: true,
                        dataUltimaFormazione: true,
                        dataProssimaFormazione: true,
                        note: true,
                        createdAt: true,
                        updatedAt: true,
                        deletedAt: true,
                        person: {
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
                            }
                        }
                    }
                }
            }
        });

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
        const { mansioniBase, mansioneRischi } = splitMansioniForDesktop(mansioni);
        const { protocolliBase, protocolloPrestazioni } = splitProtocolliForDesktop(protocolli);

        const medici = await getDesktopProfessionals(tenantId, collectProfessionalIdsFromCompanies(aziende));

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
        const { documentTemplatesBase, questionariMediciConfig } = splitDocumentTemplatesForDesktop(documentTemplates);

        const documentiCompilati = visitaIds.length > 0 || pazienteIds.length > 0 ? await prisma.documentoCompilato.findMany({
            where: {
                tenantId,
                deletedAt: null,
                OR: [
                    ...(visitaIds.length > 0 ? [{ visitaId: { in: visitaIds } }] : []),
                    ...(pazienteIds.length > 0 ? [{ pazienteId: { in: pazienteIds } }] : [])
                ]
            },
            include: {
                documentoTemplate: { select: { id: true, nome: true, tipo: true, fase: true } },
                risposteDettagliate: true
            },
            orderBy: { updatedAt: 'desc' },
            take: 1000
        }) : [];
        const questionariRisposte = documentiCompilati.flatMap(doc => doc.risposteDettagliate || []);

        const profiliSalute = pazienteIds.length > 0 ? await prisma.profiloDiSalutePersona.findMany({
            where: { tenantId, deletedAt: null, personId: { in: pazienteIds } }
        }) : [];

        const documentiClinici = visitaIds.length > 0 || pazienteIds.length > 0 ? await prisma.documentoClinico.findMany({
            where: {
                tenantId,
                deletedAt: null,
                OR: [
                    ...(visitaIds.length > 0 ? [{ visitaId: { in: visitaIds } }] : []),
                    ...(pazienteIds.length > 0 ? [{ pazienteId: { in: pazienteIds } }] : [])
                ]
            },
            orderBy: { dataDocumento: 'desc' },
            take: 1000
        }) : [];

        const personDocuments = visitaIds.length > 0 || pazienteIds.length > 0 ? await prisma.personDocument.findMany({
            where: {
                tenantId,
                deletedAt: null,
                OR: [
                    ...(visitaIds.length > 0 ? [{ visitaId: { in: visitaIds } }] : []),
                    ...(pazienteIds.length > 0 ? [{ personId: { in: pazienteIds } }] : [])
                ]
            },
            orderBy: { dataDocumento: 'desc' },
            take: 1000
        }) : [];

        const referti = visitaIds.length > 0 ? await prisma.referto.findMany({
            where: { tenantId, deletedAt: null, visitaId: { in: visitaIds } },
            orderBy: { updatedAt: 'desc' },
            take: 1000
        }) : [];

        const visitRevisions = visitaIds.length > 0 ? await prisma.visitRevision.findMany({
            where: { visitaId: { in: visitaIds } },
            orderBy: { changedAt: 'desc' },
            take: 1000
        }) : [];

        const visitAccessLogs = visitaIds.length > 0 ? await prisma.visitAccessLog.findMany({
            where: { visitaId: { in: visitaIds } },
            orderBy: { accessedAt: 'desc' },
            take: 1000
        }) : [];

        const refertoIds = referti.map(r => r.id);
        const documentoCompilatoIds = documentiCompilati.map(d => d.id);
        const firmeDigitali = refertoIds.length > 0 || documentoCompilatoIds.length > 0 ? await prisma.firmaDigitale.findMany({
            where: {
                tenantId,
                deletedAt: null,
                OR: [
                    ...(refertoIds.length > 0 ? [{ refertoId: { in: refertoIds } }] : []),
                    ...(documentoCompilatoIds.length > 0 ? [{ documentoId: { in: documentoCompilatoIds } }] : [])
                ]
            },
            orderBy: { updatedAt: 'desc' },
            take: 1000
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
                    mansioni: mansioniBase.length,
                    mansioneRischi: mansioneRischi.length,
                    aziende: aziende.length,
                    movimentiContabili: movimentiContabili.length,
                    rischiAggiuntivi: rischiAggiuntivi.length,
                    protocolli: protocolliBase.length,
                    protocolloPrestazioni: protocolloPrestazioni.length,
                    visitTemplates: visitTemplates.length,
                    documentTemplates: documentTemplatesBase.length,
                    questionariMediciConfig: questionariMediciConfig.length,
                    documentiCompilati: documentiCompilati.length,
                    questionariRisposte: questionariRisposte.length,
                    profiliSalute: profiliSalute.length,
                    documentiClinici: documentiClinici.length,
                    personDocuments: personDocuments.length,
                    referti: referti.length,
                    visitRevisions: visitRevisions.length,
                    visitAccessLogs: visitAccessLogs.length,
                    firmeDigitali: firmeDigitali.length,
                    medici: medici.length,
                    slotDisponibilita: slotDisponibilita.length
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
            slotDisponibilita,
            movimentiContabili,
            mansioni: mansioniBase,
            aziende,
            mansioneRischi,
            rischiAggiuntivi,
            protocolli: protocolliBase,
            protocolloPrestazioni,
            visitTemplates,
            documentTemplates: documentTemplatesBase,
            questionariMediciConfig,
            documentiCompilati,
            questionariRisposte,
            profiliSalute,
            documentiClinici,
            personDocuments,
            referti,
            visitRevisions,
            visitAccessLogs,
            firmeDigitali,
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

        const patientWhere = lastSyncAt ? {
            deletedAt: null,
            tenantProfiles: { some: { tenantId, deletedAt: null } },
            OR: [
                { updatedAt: { gte: lastSyncAt } },
                { tenantProfiles: { some: { tenantId, deletedAt: null, updatedAt: { gte: lastSyncAt } } } }
            ]
        } : {
            deletedAt: null,
            tenantProfiles: { some: { tenantId, deletedAt: null } }
        };

        // 1. ALL patients (Person + TenantProfile) for this tenant
        const pazienti = await prisma.person.findMany({
            where: patientWhere,
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

        const companyWhere = lastSyncAt ? {
            tenantId,
            deletedAt: null,
            OR: [
                { updatedAt: { gte: lastSyncAt } },
                { company: { is: { deletedAt: null, updatedAt: { gte: lastSyncAt } } } },
                { sites: { some: { deletedAt: null, updatedAt: { gte: lastSyncAt } } } },
                { nomine: { some: { tenantId, deletedAt: null, updatedAt: { gte: lastSyncAt } } } }
            ]
        } : { tenantId, deletedAt: null };

        // 2. ALL companies for this tenant
        const aziende = await prisma.companyTenantProfile.findMany({
            where: companyWhere,
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
                    select: {
                        id: true,
                        siteName: true,
                        indirizzo: true,
                        citta: true,
                        cap: true,
                        provincia: true,
                        medicoCompetenteId: true,
                        rsppId: true,
                        referenteId: true,
                        dvr: true,
                        dvrDataAggiornamento: true,
                        ultimoSopralluogo: true,
                        prossimoSopralluogo: true,
                        ultimoSopralluogoRSPP: true,
                        prossimoSopralluogoRSPP: true,
                        ultimoSopralluogoMedico: true,
                        prossimoSopralluogoMedico: true
                    }
                },
                nomine: {
                    where: {
                        deletedAt: null,
                        stato: 'ATTIVA',
                        tipoRuolo: { in: DESKTOP_NOMINA_ROLES }
                    },
                    select: {
                        id: true,
                        personId: true,
                        companyTenantProfileId: true,
                        siteId: true,
                        tenantId: true,
                        tipoRuolo: true,
                        stato: true,
                        dataInizio: true,
                        dataFine: true,
                        dataScadenza: true,
                        numeroProtocollo: true,
                        documentoNominaId: true,
                        formazioneRichiesta: true,
                        dataUltimaFormazione: true,
                        dataProssimaFormazione: true,
                        note: true,
                        createdAt: true,
                        updatedAt: true,
                        deletedAt: true,
                        person: {
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
                            }
                        }
                    }
                }
            }
        });

        // 3. ALL mansioni
        const mansioni = await prisma.mansione.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            include: { rischiAssociati: true }
        });

        // 4. ALL protocolli
        const protocolli = await prisma.protocolloSanitario.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            include: {
                prestazioni: { where: { deletedAt: null }, include: { prestazione: true } }
            }
        });
        const { mansioniBase, mansioneRischi } = splitMansioniForDesktop(mansioni);
        const { protocolliBase, protocolloPrestazioni } = splitProtocolliForDesktop(protocolli);

        // 5. ALL prestazioni
        const prestazioni = await prisma.prestazione.findMany({
            where: { tenantId, deletedAt: null, attivo: true, ...updatedFilter },
            select: {
                id: true, codice: true, nome: true, tipo: true, durataPrevista: true,
                prezzoBase: true, ivaAliquota: true, prezzoPrimaVisita: true, prezzoControllo: true,
                scadenzaDefaultMesi: true, branchType: true
            }
        });

        const medici = await getDesktopProfessionals(tenantId, collectProfessionalIdsFromCompanies(aziende));

        // 6. ALL ambulatori
        const ambulatori = await prisma.ambulatorio.findMany({
            where: { tenantId, deletedAt: null, stato: 'ATTIVO', ...updatedFilter },
            select: { id: true, codice: true, nome: true, specializzazione: true, colore: true, isEsterno: true }
        });

        const slotWindowStart = new Date();
        slotWindowStart.setDate(slotWindowStart.getDate() - 30);
        slotWindowStart.setHours(0, 0, 0, 0);
        const slotWindowEnd = new Date();
        slotWindowEnd.setDate(slotWindowEnd.getDate() + 180);
        slotWindowEnd.setHours(23, 59, 59, 999);
        const slotDisponibilita = await prisma.slotDisponibilita.findMany({
            where: {
                tenantId,
                deletedAt: null,
                data: { gte: slotWindowStart, lte: slotWindowEnd },
                ...updatedFilter
            },
            take: 20000,
            select: {
                id: true, ambulatorioId: true, medicoId: true, prestazioneId: true,
                appuntamentoId: true, disponibilitaMedicoId: true, data: true,
                oraInizio: true, oraFine: true, stato: true, disponibile: true,
                motivoBlocco: true, note: true, visibilePubblico: true, prenotabileOnline: true,
                maxPrenotazioni: true, anticipoMinimoOre: true, anticipoMassimoGiorni: true,
                durataSlotMinuti: true, tenantId: true, createdAt: true, updatedAt: true, deletedAt: true
            },
            orderBy: [{ data: 'asc' }, { oraInizio: 'asc' }]
        });

        // 7. ALL active MDL protocol deadlines for desktop sorveglianza sanitaria
        const scadenze = await prisma.scadenzaPrestazioneProtocollo.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            orderBy: { dataScadenza: 'asc' },
            take: 20000,
            select: {
                id: true,
                tenantId: true,
                personId: true,
                mansioneId: true,
                prestazioneId: true,
                protocolloId: true,
                dataScadenza: true,
                periodicitaMesi: true,
                isPrimaVisita: true,
                eseguita: true,
                dataEsecuzione: true,
                visitaId: true,
                appuntamentoId: true,
                documentoTemplateId: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true
            }
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
        const { documentTemplatesBase, questionariMediciConfig } = splitDocumentTemplatesForDesktop(documentTemplates);

        const documentiCompilati = await prisma.documentoCompilato.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            include: {
                documentoTemplate: { select: { id: true, nome: true, tipo: true, fase: true } },
                risposteDettagliate: true
            },
            orderBy: { updatedAt: 'desc' },
            take: 5000
        });
        const questionariRisposte = documentiCompilati.flatMap(doc => doc.risposteDettagliate || []);

        const profiliSalute = await prisma.profiloDiSalutePersona.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            take: 5000
        });

        const documentiClinici = await prisma.documentoClinico.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            orderBy: { dataDocumento: 'desc' },
            take: 5000
        });

        const personDocuments = await prisma.personDocument.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            orderBy: { dataDocumento: 'desc' },
            take: 5000
        });

        const referti = await prisma.referto.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            orderBy: { updatedAt: 'desc' },
            take: 5000
        });

        const visitRevisions = await prisma.visitRevision.findMany({
            where: {
                visita: { tenantId, deletedAt: null },
                ...(lastSyncAt ? { changedAt: { gte: lastSyncAt } } : {})
            },
            orderBy: { changedAt: 'desc' },
            take: 5000
        });

        const visitAccessLogs = await prisma.visitAccessLog.findMany({
            where: {
                visita: { tenantId, deletedAt: null },
                ...(lastSyncAt ? { accessedAt: { gte: lastSyncAt } } : {})
            },
            orderBy: { accessedAt: 'desc' },
            take: 5000
        });

        const firmeDigitali = await prisma.firmaDigitale.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            orderBy: { updatedAt: 'desc' },
            take: 5000
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
                voci: { where: { deletedAt: null, attivo: true }, include: { prestazione: true, documentoTemplate: true }, orderBy: [{ ordine: 'asc' }, { nome: 'asc' }] },
                companyAssociations: {
                    where: { deletedAt: null, attivo: true },
                    select: { id: true, tariffarioId: true, companyTenantProfileId: true, validoDa: true, validoA: true, attivo: true, note: true, tenantId: true, createdAt: true, updatedAt: true }
                }
            }
        });
        const tariffari = tariffariRaw.map(t => ({
            id: t.id,
            tenantId: t.tenantId,
            nome: t.nome,
            codice: t.codice,
            descrizione: t.descrizione,
            attivo: t.attivo,
            validoDa: t.validoDa,
            validoA: t.validoA,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
        }));
        const tariffarioCompanyAssociations = tariffariRaw.flatMap(t => (t.companyAssociations || []).map(a => ({
            id: a.id,
            tariffarioId: a.tariffarioId,
            companyTenantProfileId: a.companyTenantProfileId,
            validoDa: a.validoDa,
            validoA: a.validoA,
            attivo: a.attivo,
            note: a.note,
            tenantId: a.tenantId,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt
        })));
        const vociTariffario = tariffariRaw.flatMap(t => (t.voci || []).map(v => ({
            id: v.id,
            tariffarioAziendaleId: v.tariffarioAziendaleId,
            tenantId: v.tenantId,
            tipo: v.tipo,
            prestazioneId: v.prestazioneId,
            documentoTemplateId: v.documentoTemplateId,
            nome: v.nome || v.prestazione?.nome || v.documentoTemplate?.nome || v.tipo,
            descrizione: v.descrizione,
            prezzoBase: v.prezzoBase,
            ivaAliquota: v.ivaAliquota,
            categoriaVisita: v.categoriaVisita,
            durataMinimaMinuti: v.durataMinimaMinuti,
            compensoProfessionistaTipo: v.compensoProfessionistaTipo,
            compensoProfessionistaValore: v.compensoProfessionistaValore,
            compensoProfessionistaMinimo: v.compensoProfessionistaMinimo,
            compensoProfessionistaMassimo: v.compensoProfessionistaMassimo,
            frequenza: v.frequenza,
            unitaCalcolo: v.unitaCalcolo,
            modalitaAttivazione: v.modalitaAttivazione,
            ordine: v.ordine,
            attivo: v.attivo,
            note: v.note,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt
        })));

        const sopralluoghi = await prisma.sopralluogo.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            select: {
                id: true, siteId: true, esecutoreId: true, dataEsecuzione: true,
                dataProssimoSopralluogo: true, valutazione: true, esito: true, note: true,
                documentoUrl: true, documentoNome: true, tenantId: true, createdAt: true, updatedAt: true, deletedAt: true
            },
            orderBy: { dataEsecuzione: 'desc' },
            take: 2000
        });

        const dvrs = await prisma.dVR.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            select: {
                id: true, siteId: true, effettuatoDa: true, dataEsecuzione: true, dataScadenza: true,
                rischiRilevati: true, note: true, tipoDVR: true, documentoUrl: true, documentoNome: true,
                tenantId: true, createdAt: true, updatedAt: true, deletedAt: true
            },
            orderBy: { dataEsecuzione: 'desc' },
            take: 2000
        });

        const consulenzeMDL = await prisma.consulenzaMDL.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            select: {
                id: true, companyTenantProfileId: true, siteId: true, professionistaId: true,
                data: true, durataMinuti: true, oggetto: true, note: true, importo: true,
                stato: true, tenantId: true, createdAt: true, updatedAt: true, deletedAt: true
            },
            orderBy: { data: 'desc' },
            take: 2000
        });

        const allegati3B = await prisma.allegato3B.findMany({
            where: { tenantId, deletedAt: null, ...updatedFilter },
            select: {
                id: true, medicoCompetenteId: true, companyTenantProfileId: true, anno: true, tenantId: true,
                stato: true, totLavoratoriSorvegliati: true, totVisiteEffettuate: true, totGiudiziIdoneita: true,
                totGiudiziConLimitazioni: true, totGiudiziConPrescrizioni: true, totInidoneita: true,
                statistichePerRischio: true, malattieProf: true, lavoratoriPerGenere: true, lavoratoriPerFasciaEta: true,
                visitePerTipologia: true, giudiziPerTipologia: true, giudiziPerRischio: true, accertamentiIntegrativi: true,
                dataCompilazione: true, dataInvio: true, dataConferma: true, protocolloInvio: true, ricevutaInvio: true,
                note: true, createdAt: true, updatedAt: true, deletedAt: true
            },
            orderBy: [{ anno: 'desc' }, { createdAt: 'desc' }],
            take: 2000
        });

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
        const tombstones = await getDesktopTombstones(tenantId, lastSyncAt);

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
                    mansioni: mansioniBase.length,
                    mansioneRischi: mansioneRischi.length,
                    protocolli: protocolliBase.length,
                    protocolloPrestazioni: protocolloPrestazioni.length,
                    prestazioni: prestazioni.length,
                    ambulatori: ambulatori.length,
                    slotDisponibilita: slotDisponibilita.length,
                    scadenze: scadenze.length,
                    lavoratoriMansioni: lavoratoriMansioni.length,
                    visitTemplates: visitTemplates.length,
                    documentTemplates: documentTemplatesBase.length,
                    questionariMediciConfig: questionariMediciConfig.length,
                    documentiCompilati: documentiCompilati.length,
                    questionariRisposte: questionariRisposte.length,
                    profiliSalute: profiliSalute.length,
                    documentiClinici: documentiClinici.length,
                    personDocuments: personDocuments.length,
                    referti: referti.length,
                    visitRevisions: visitRevisions.length,
                    visitAccessLogs: visitAccessLogs.length,
                    firmeDigitali: firmeDigitali.length,
                    medici: medici.length,
                    rischiAggiuntivi: rischiAggiuntivi.length,
                    visite: visite.length,
                    tariffari: tariffari.length,
                    vociTariffario: vociTariffario.length,
                    tariffarioCompanyAssociations: tariffarioCompanyAssociations.length,
                    sopralluoghi: sopralluoghi.length,
                    dvrs: dvrs.length,
                    consulenzeMDL: consulenzeMDL.length,
                    allegati3B: allegati3B.length,
                    convenzioni: convenzioni.length,
                    giudizi: giudiziPrecedenti.length,
                    movimenti: movimentiContabili.length,
                    tombstones: tombstones.length
                }
            },
            pazienti,
            aziende,
            mansioni: mansioniBase,
            mansioneRischi,
            protocolli: protocolliBase,
            protocolloPrestazioni,
            prestazioni,
            ambulatori,
            slotDisponibilita,
            scadenze,
            lavoratoriMansioni,
            visitTemplates,
            documentTemplates: documentTemplatesBase,
            questionariMediciConfig,
            documentiCompilati,
            questionariRisposte,
            profiliSalute,
            documentiClinici,
            personDocuments,
            referti,
            visitRevisions,
            visitAccessLogs,
            firmeDigitali,
            medici,
            rischiAggiuntivi,
            visite,
            tariffari,
            vociTariffario,
            tariffarioCompanyAssociations,
            sopralluoghi,
            dvrs,
            consulenzeMDL,
            allegati3B,
            convenzioni,
            giudiziPrecedenti,
            movimentiContabili,
            tombstones
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
        const allowedEntityTypes = DESKTOP_SYNC_ENTITY_TYPES;
        const allowedActions = ['create', 'update', 'delete'];

        // Entity types that have a createdBy field in Prisma schema
        const createdBySupported = new Set(['visita', 'appuntamento', 'movimentoContabile', 'appuntamentoPrestazione']);

        // Entity types that contain personal health data — require GDPR audit on DELETE
        const gdprAuditEntities = new Set([
            'visita', 'appuntamento', 'giudizioIdoneita', 'esameStrumentale',
            'personTenantProfile', 'lavoratoreRischioAggiuntivo', 'appuntamentoPrestazione',
            'documentoCompilato', 'questionarioRisposta', 'profiloDiSalutePersona',
            'documentoClinico', 'referto', 'firmaDigitale'
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
                if (typeof d.datiCompilati === 'string') {
                    try { d.datiCompilati = JSON.parse(d.datiCompilati); } catch { d.datiCompilati = {}; }
                }
                if ('esitoCritico' in d) d.esitoCritico = d.esitoCritico === 1 || d.esitoCritico === true;
                ['pdfGeneratoAt', 'firmaPazienteAt', 'firmaMedicoAt', 'firmaDipendenteAt',
                    'firmaFormatoreAt', 'firmaDatoreAt', 'dataScadenza'].forEach(field => {
                        if (d[field]) d[field] = new Date(d[field]);
                    });
                // dataCompilazione is local-only
                delete d.dataCompilazione;
            }

            else if (entityType === 'questionarioRisposta') {
                if ('valoreBoolean' in d) d.valoreBoolean = d.valoreBoolean === 1 || d.valoreBoolean === true;
                if ('flagCritico' in d) d.flagCritico = d.flagCritico === 1 || d.flagCritico === true;
                if ('validato' in d) d.validato = d.validato === 1 || d.validato === true;
                if (typeof d.valoreJson === 'string') {
                    try { d.valoreJson = JSON.parse(d.valoreJson); } catch { delete d.valoreJson; }
                }
                if (d.valoreData) d.valoreData = new Date(d.valoreData);
            }

            else if (entityType === 'questionarioMedicoConfig') {
                ['codiciRischio', 'tipiVisitaMDL'].forEach(field => {
                    if (typeof d[field] === 'string') {
                        try { d[field] = JSON.parse(d[field]); } catch { d[field] = []; }
                    }
                });
                ['scoringConfig', 'validazioniCustom'].forEach(field => {
                    if (typeof d[field] === 'string') {
                        try { d[field] = JSON.parse(d[field]); } catch { d[field] = {}; }
                    }
                });
                ['haScoring', 'richiedeRevisione', 'isPagamento', 'fatturabile'].forEach(field => {
                    if (field in d) d[field] = d[field] === 1 || d[field] === true;
                });
                if (d.prezzoDefault != null) d.prezzoDefault = Number(d.prezzoDefault);
            }

            else if (entityType === 'profiloDiSalutePersona') {
                if ('data' in d) delete d.data;
                ['sorveglianzaSanitaria', 'storicoOccupazionale', 'corsiFormazioneDpi', 'esposizioniLavorative',
                    'vaccinazioni', 'abilitazioniMezzi', 'dpiConsegne'].forEach(field => {
                        if (typeof d[field] === 'string') {
                            try { d[field] = JSON.parse(d[field]); } catch { /* keep scalar legacy data */ }
                        }
                    });
                ['dpiPersonali', 'dpiAzienda', 'mezziAziendali', 'patenteCategorie'].forEach(field => {
                    if (typeof d[field] === 'string') {
                        try { d[field] = JSON.parse(d[field]); } catch { d[field] = d[field].split(',').map(v => v.trim()).filter(Boolean); }
                    }
                });
                ['usaDpiPersonali', 'usaMezziAziendali', 'hasInvalidita', 'legge104',
                    'hasDiabete', 'hasIpertensione', 'hasCardiopatie', 'hasAsma', 'hasEpilessia',
                    'sonnolenzaDiurna', 'apneaNotturna', 'formazioneGenerale', 'formazioneSpecifica',
                    'addestramentoCompletato', 'cqc', 'terapiaInsulina'].forEach(field => {
                        if (field in d) d[field] = d[field] === 1 || d[field] === true;
                    });
                ['peso', 'altezza', 'oreAttivitaSettimana', 'oreSonnoNotte'].forEach(field => {
                    if (d[field] === '' || d[field] === undefined) delete d[field];
                    else if (d[field] !== null) d[field] = Number(d[field]);
                });
                ['sigaretteGiorno', 'anniFumo', 'unitaAlcolSettimana', 'gradoInvaliditaCivile', 'numeroFigli'].forEach(field => {
                    if (d[field] === '' || d[field] === undefined) delete d[field];
                    else if (d[field] !== null) d[field] = Number(d[field]);
                });
                ['patenteScadenza', 'cqcScadenza'].forEach(field => {
                    if (d[field]) d[field] = new Date(d[field]);
                    else delete d[field];
                });
            }

            else if (entityType === 'documentoClinico') {
                if ('personId' in d && !('pazienteId' in d)) { d.pazienteId = d.personId; delete d.personId; }
                if ('valido' in d) d.valido = d.valido === 1 || d.valido === true;
                if (d.dataDocumento) d.dataDocumento = new Date(d.dataDocumento);
            }

            else if (entityType === 'referto') {
                if (typeof d.allegati === 'string') {
                    try { d.allegati = JSON.parse(d.allegati); } catch { d.allegati = []; }
                }
                ['dataFirma', 'dataConsegna'].forEach(field => {
                    if (d[field]) d[field] = new Date(d[field]);
                });
            }

            else if (entityType === 'firmaDigitale') {
                if (d.timestampTSA) d.timestampTSA = new Date(d.timestampTSA);
                if (d.validatoAt) d.validatoAt = new Date(d.validatoAt);
                ['firmaImageUrl'].forEach(f => { if (!d[f]) delete d[f]; });
            }

            else if (entityType === 'tariffarioCompanyAssociation') {
                if ('attivo' in d) d.attivo = d.attivo === 1 || d.attivo === true;
                if (d.validoDa) d.validoDa = new Date(d.validoDa);
                else d.validoDa = new Date();
                if (d.validoA) d.validoA = new Date(d.validoA);
                else delete d.validoA;
                ['successoreAssociationId'].forEach(f => { if (!d[f]) delete d[f]; });
            }

            else if (entityType === 'mansione') {
                if ('nome' in d && !('denominazione' in d)) { d.denominazione = d.nome; delete d.nome; }
                if (!d.codice) {
                    const suffix = String(d.id || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12).toUpperCase();
                    d.codice = `DESK-${suffix || Date.now()}`;
                }
                ['companyTenantProfileId', 'companyName', 'isActive'].forEach(f => delete d[f]);
            }

            else if (entityType === 'mansioneRischio') {
                delete d.nome;
                delete d.mansioneNome;
            }

            else if (entityType === 'protocolloPrestazione') {
                if ('obbligatoria' in d && !('isObbligatoria' in d)) { d.isObbligatoria = d.obbligatoria; delete d.obbligatoria; }
                if ('isObbligatoria' in d) d.isObbligatoria = d.isObbligatoria === 1 || d.isObbligatoria === true;
                ['prestazioneNome', 'prestazioneCodice', 'scadenzaDefaultMesi'].forEach(f => delete d[f]);
            }

            else if (entityType === 'sopralluogo') {
                if (d.dataEsecuzione) d.dataEsecuzione = new Date(d.dataEsecuzione);
                if (d.dataProssimoSopralluogo) d.dataProssimoSopralluogo = new Date(d.dataProssimoSopralluogo);
                else delete d.dataProssimoSopralluogo;
                ['documentoUrl', 'documentoNome'].forEach(f => { if (!d[f]) delete d[f]; });
            }

            else if (entityType === 'dVR') {
                if (d.dataEsecuzione) d.dataEsecuzione = new Date(d.dataEsecuzione);
                if (d.dataScadenza) d.dataScadenza = new Date(d.dataScadenza);
                else {
                    const base = d.dataEsecuzione instanceof Date ? new Date(d.dataEsecuzione) : new Date();
                    base.setFullYear(base.getFullYear() + 1);
                    d.dataScadenza = base;
                }
                if (typeof d.rischiRilevati !== 'string') d.rischiRilevati = JSON.stringify(d.rischiRilevati || []);
                ['documentoUrl', 'documentoNome'].forEach(f => { if (!d[f]) delete d[f]; });
            }

            else if (entityType === 'consulenzaMDL') {
                if (d.data) d.data = new Date(d.data);
                if (d.durataMinuti !== undefined) d.durataMinuti = Number(d.durataMinuti || 0);
                if (d.importo === '' || d.importo === undefined || d.importo === null) delete d.importo;
                else d.importo = Number(d.importo);
                if (!d.stato) d.stato = 'DA_RENDICONTARE';
            }

            else if (entityType === 'allegato3B') {
                if (d.anno !== undefined) d.anno = Number(d.anno);
                ['totLavoratoriSorvegliati', 'totVisiteEffettuate', 'totGiudiziIdoneita',
                    'totGiudiziConLimitazioni', 'totGiudiziConPrescrizioni', 'totInidoneita'].forEach(field => {
                        if (d[field] !== undefined) d[field] = Number(d[field] || 0);
                    });
                ['statistichePerRischio', 'malattieProf', 'lavoratoriPerGenere', 'lavoratoriPerFasciaEta',
                    'visitePerTipologia', 'giudiziPerTipologia', 'giudiziPerRischio', 'accertamentiIntegrativi'].forEach(field => {
                        if (typeof d[field] === 'string') {
                            try { d[field] = JSON.parse(d[field]); } catch { d[field] = {}; }
                        }
                    });
                ['dataCompilazione', 'dataInvio', 'dataConferma'].forEach(field => {
                    if (d[field]) d[field] = new Date(d[field]);
                    else delete d[field];
                });
                if (!d.stato) d.stato = 'DA_COMPILARE';
            }

            // Strip denormalized display-only fields from all entity types
            for (const f of DISPLAY_ONLY_FIELDS) delete d[f];

            return d;
        };

        const splitPersonTenantProfilePayload = (data) => {
            const personFieldNames = [
                'firstName', 'lastName', 'taxCode', 'birthDate', 'birthPlace',
                'birthProvince', 'gender', 'profileImage', 'gdprConsentDate'
            ];
            const profileFieldNames = [
                'tenantId', 'email', 'phone', 'pec', 'residenceAddress', 'residenceCity',
                'postalCode', 'province', 'status', 'title', 'hiredDate', 'endDate',
                'companyTenantProfileId', 'siteId', 'repartoId', 'protocolloSanitarioId',
                'notes', 'disagioPsicologico'
            ];
            const personData = {};
            const profileData = {};

            for (const field of personFieldNames) {
                if (field in data) personData[field] = data[field];
            }
            for (const field of profileFieldNames) {
                if (field in data) profileData[field] = data[field];
            }

            if (personData.birthDate) personData.birthDate = new Date(personData.birthDate);
            if (personData.gdprConsentDate) personData.gdprConsentDate = new Date(personData.gdprConsentDate);
            if (personData.birthProvince) personData.birthProvince = String(personData.birthProvince).trim().toUpperCase().slice(0, 2);
            if (profileData.hiredDate) profileData.hiredDate = new Date(profileData.hiredDate);
            if (profileData.endDate) profileData.endDate = new Date(profileData.endDate);

            return { personData, profileData };
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
                        const { personData, profileData } = splitPersonTenantProfilePayload(sanitizedData);
                        // Find or create Person record
                        let person = personData.taxCode
                            ? await prisma.person.findFirst({ where: { taxCode: personData.taxCode, deletedAt: null } })
                            : null;
                        if (!person) {
                            person = await prisma.person.create({
                                data: {
                                    id: op.entityId, // Use local UUID so visits can reference personId
                                    firstName: personData.firstName || '',
                                    lastName: personData.lastName || '',
                                    taxCode: personData.taxCode || null,
                                    birthDate: personData.birthDate || null,
                                    birthPlace: personData.birthPlace || null,
                                    birthProvince: personData.birthProvince || null,
                                    gender: personData.gender || null,
                                    profileImage: personData.profileImage || null,
                                    gdprConsentDate: personData.gdprConsentDate || null,
                                }
                            });
                        } else {
                            const missingPersonData = Object.fromEntries(
                                Object.entries(personData).filter(([field, value]) =>
                                    value !== null &&
                                    value !== undefined &&
                                    value !== '' &&
                                    (person[field] === null || person[field] === undefined || person[field] === '')
                                )
                            );
                            if (Object.keys(missingPersonData).length > 0) {
                                person = await prisma.person.update({
                                    where: { id: person.id },
                                    data: missingPersonData
                                });
                            }
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
                    if (op.entityType === 'personTenantProfile') {
                        const existingProfile = await prisma.personTenantProfile.findFirst({
                            where: {
                                tenantId,
                                deletedAt: null,
                                OR: [
                                    { id: op.entityId },
                                    { personId: op.entityId }
                                ]
                            },
                            select: { id: true, personId: true }
                        });

                        if (!existingProfile) {
                            results.push({
                                operationId: op.id,
                                status: 'conflict',
                                error: 'Profilo persona non trovato o non appartenente al tenant'
                            });
                            continue;
                        }

                        const { personData, profileData } = splitPersonTenantProfilePayload(sanitizedData);
                        if (Object.keys(personData).length > 0) {
                            await prisma.person.update({
                                where: { id: existingProfile.personId },
                                data: personData
                            });
                        }

                        delete profileData.tenantId;
                        result = Object.keys(profileData).length > 0
                            ? await prisma.personTenantProfile.update({
                                where: { id: existingProfile.id },
                                data: profileData
                            })
                            : await prisma.personTenantProfile.findUnique({ where: { id: existingProfile.id } });
                    } else {
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
        const allowedEntityTypes = new Set(DESKTOP_SYNC_ENTITY_TYPES);

        for (const entity of entities) {
            try {
                if (!allowedEntityTypes.has(entity.entityType)) {
                    conflicts.push({
                        entityType: entity.entityType,
                        entityId: entity.entityId,
                        type: 'invalid_entity_type'
                    });
                    continue;
                }

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

        const allowedEntityTypes = DESKTOP_SYNC_ENTITY_TYPES;

        if (!entityType || !allowedEntityTypes.includes(entityType)) {
            return res.status(400).json({ error: 'entityType non valido' });
        }
        if (!entityId || typeof entityId !== 'string' || entityId.length > 100) {
            return res.status(400).json({ error: 'entityId non valido' });
        }

        // Models that don't have a top-level tenantId field
        const noTenantIdModels = new Set([
            'allegatoVisita', 'appuntamentoPrestazione', 'documentoCompilato',
            'lavoratoreMansione', 'lavoratoreRischioAggiuntivo', 'visitRevision',
            'visitAccessLog'
        ]);

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
        const cleanupUploadedFile = () => {
            if (!req.file?.path) return;
            try {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            } catch {
                // Best-effort cleanup only.
            }
        };

        if (!req.file) {
            return res.status(400).json({ error: 'File obbligatorio' });
        }

        const { visitaId, allegatoLocalId, nome, tipo, dimensione, mimeType } = req.body;

        if (!visitaId || !nome) {
            cleanupUploadedFile();
            return res.status(400).json({ error: 'visitaId e nome sono obbligatori' });
        }

        // Verify visita belongs to this tenant
        const visita = await prisma.visita.findFirst({
            where: { id: visitaId, tenantId, deletedAt: null }
        });
        if (!visita) {
            cleanupUploadedFile();
            return res.status(404).json({ error: 'Visita non trovata' });
        }

        const security = await assertUploadedFileIsSafe(req.file.path);
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
                hashFile: security.sha256,
                caricatoDa: personId
            }
        });

        logger.info({
            tenantId, visitaId, allegatoId: allegato.id, allegatoLocalId, fileName: req.file.filename, scanStatus: security.scan.status
        }, '[P98] Allegato visita caricato da client desktop');

        res.json({
            success: true,
            allegatoId: allegato.id,
            allegatoLocalId,
            serverUrl: relativeUrl,
            fileName: req.file.filename
        });
    } catch (error) {
        if (req.file?.path) {
            try {
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            } catch {
                // Best-effort cleanup only.
            }
        }
        if (error.code === 'MALWARE_SCAN_FAILED' || error.code === 'MALWARE_SCAN_NOT_CONFIGURED') {
            return res.status(400).json({ error: 'File rifiutato dalla scansione sicurezza' });
        }
        logger.error({ error: error.message, stack: error.stack }, '[P98] Errore upload allegato desktop');
        res.status(500).json({ error: 'Errore nel caricamento del file' });
    }
}
