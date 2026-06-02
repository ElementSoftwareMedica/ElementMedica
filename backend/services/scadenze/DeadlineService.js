/**
 * P66 - Deadline Service
 * 
 * Gestione centralizzata delle scadenze per tutte le tipologie:
 * - Visite mediche (prossimo controllo)
 * - Formazione (attestati)
 * - Farmaci
 * - Manutenzioni strumenti
 * - Documenti
 * - Protocolli MDL
 * - Sopralluoghi
 * - Tariffari
 * - Altro
 * 
 * @module services/scadenze/DeadlineService
 * @project P66 - Sistema Scadenze Centralizzato
 */

import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';


// Categorie disponibili
export const DEADLINE_CATEGORIES = [
    'VISITA_MEDICA',
    'FORMAZIONE',
    'FARMACO',
    'MANUTENZIONE',
    'DOCUMENTO',
    'PROTOCOLLO_MDL',
    'SOPRALLUOGO',
    'TARIFFARIO',
    'ALTRO'
];

// Priorità
export const DEADLINE_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];

// Stati
export const DEADLINE_STATUSES = ['ATTIVA', 'IN_PREAVVISO', 'SCADUTA', 'COMPLETATA', 'ANNULLATA'];

const CATEGORY_ALIASES = {
    VISITA: 'VISITA_MEDICA',
    PROTOCOLLO_SANITARIO: 'PROTOCOLLO_MDL',
    CERTIFICAZIONE: 'DOCUMENTO',
    CONTRATTO: 'DOCUMENTO'
};

const PRIORITY_ALIASES = {
    URGENT: 'CRITICAL'
};

const normalizeCategory = (category) => CATEGORY_ALIASES[category] || category;
const normalizePriority = (priority) => PRIORITY_ALIASES[priority] || priority;

const normalizePerson = (person) => person ? ({
    ...person,
    nome: person.nome || person.firstName || '',
    cognome: person.cognome || person.lastName || '',
    email: person.email || person.tenantProfiles?.[0]?.email || null,
    phone: person.phone || person.tenantProfiles?.[0]?.phone || null,
    telefono: person.telefono || person.tenantProfiles?.[0]?.phone || null
}) : null;

const normalizeDeadlineItem = (item) => ({
    ...item,
    responsabile: normalizePerson(item.responsabile),
    person: normalizePerson(item.person),
    company: item.company || (item.companyProfile?.company ? {
        id: item.companyProfile.id,
        ragioneSociale: item.companyProfile.company.ragioneSociale
    } : undefined),
    companySite: item.companySite || (item.site ? {
        id: item.site.id,
        nome: item.site.siteName || item.site.nome || item.site.name
    } : undefined),
    ricorrente: item.ricorrente ?? item.isRicorrente ?? false,
    frequenzaMesi: item.frequenzaMesi ?? item.periodicitaMesi ?? null
});

const startOfToday = () => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    return oggi;
};

const getStatusForDate = (date) => {
    const oggi = startOfToday();
    const scadenza = new Date(date);
    scadenza.setHours(0, 0, 0, 0);

    if (scadenza < oggi) return 'SCADUTA';

    const tra30giorni = new Date(oggi);
    tra30giorni.setDate(tra30giorni.getDate() + 30);
    return scadenza <= tra30giorni ? 'IN_PREAVVISO' : 'ATTIVA';
};

const getPriorityForDate = (date) => {
    const oggi = startOfToday();
    const scadenza = new Date(date);
    scadenza.setHours(0, 0, 0, 0);
    const days = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 0) return 'CRITICAL';
    if (days <= 7) return 'HIGH';
    if (days <= 30) return 'NORMAL';
    return 'LOW';
};

const matchesSearch = (item, search) => {
    if (!search) return true;
    const text = [
        item.titolo,
        item.descrizione,
        item.note,
        item.person?.nome,
        item.person?.cognome,
        item.company?.ragioneSociale,
        item.ambulatorio?.nome
    ].filter(Boolean).join(' ').toLowerCase();
    return text.includes(String(search).toLowerCase());
};

class DeadlineService {
    /**
     * Ottiene tutte le scadenze con filtri
     */
    async getAll(tenantId, filters = {}) {
        const {
            categoria,
            status,
            priorita,
            responsabileId,
            personId,
            companyProfileId,
            siteId,
            dataScadenzaDa,
            dataScadenzaA,
            dataInizio,
            dataFine,
            search,
            page = 1,
            limit = 20,
            sortBy = 'dataScadenza',
            sortOrder = 'asc'
        } = filters;

        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const limitNumber = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100000);
        const fromDate = dataScadenzaDa || dataInizio;
        const toDate = dataScadenzaA || dataFine;
        const normalizedCategory = categoria ? normalizeCategory(categoria) : null;
        const normalizedPriority = priorita ? normalizePriority(priorita) : null;

        const where = {
            tenantId,
            deletedAt: null
        };

        // Filtri
        if (normalizedCategory) where.categoria = normalizedCategory;
        if (status) where.status = status;
        if (normalizedPriority) where.priorita = normalizedPriority;
        if (responsabileId) where.responsabileId = responsabileId;
        if (personId) where.personId = personId;
        if (companyProfileId) where.companyProfileId = companyProfileId;
        if (siteId) where.siteId = siteId;

        // Range date
        if (fromDate || toDate) {
            where.dataScadenza = {};
            if (fromDate) where.dataScadenza.gte = new Date(fromDate);
            if (toDate) {
                const endDate = new Date(toDate);
                endDate.setHours(23, 59, 59, 999);
                where.dataScadenza.lte = endDate;
            }
        }

        // Ricerca testuale
        if (search) {
            where.OR = [
                { titolo: { contains: search, mode: 'insensitive' } },
                { descrizione: { contains: search, mode: 'insensitive' } },
                { note: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [storedItems, derivedItems] = await Promise.all([
            prisma.deadlineItem.findMany({
                where,
                include: {
                    responsabile: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    person: {
                        select: { id: true, firstName: true, lastName: true }
                    },
                    companyProfile: {
                        select: {
                            id: true,
                            company: { select: { ragioneSociale: true } }
                        }
                    },
                    site: {
                        select: { id: true, siteName: true }
                    },
                    farmaco: {
                        select: { id: true, nome: true, codice: true }
                    }
                },
                orderBy: { dataScadenza: 'asc' }
            }),
            this.getDerivedDeadlines(tenantId, {
                categoria: normalizedCategory,
                status,
                priorita: normalizedPriority,
                personId,
                dataScadenzaDa: fromDate,
                dataScadenzaA: toDate,
                search
            })
        ]);

        const allItems = [
            ...storedItems.map(normalizeDeadlineItem),
            ...derivedItems
        ].filter(item => matchesSearch(item, search));

        const sortableItems = allItems.sort((a, b) => {
            const direction = sortOrder === 'desc' ? -1 : 1;
            const valueA = sortBy === 'titolo' ? String(a.titolo || '') : new Date(a.dataScadenza).getTime();
            const valueB = sortBy === 'titolo' ? String(b.titolo || '') : new Date(b.dataScadenza).getTime();

            if (valueA < valueB) return -1 * direction;
            if (valueA > valueB) return 1 * direction;
            return 0;
        });

        const total = sortableItems.length;
        const start = (pageNumber - 1) * limitNumber;
        const paginatedItems = sortableItems.slice(start, start + limitNumber);

        return {
            data: paginatedItems,
            items: paginatedItems,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber)
            }
        };
    }

    async getDerivedDeadlines(tenantId, filters = {}) {
        const {
            categoria,
            status,
            priorita,
            personId,
            dataScadenzaDa,
            dataScadenzaA,
            search
        } = filters;

        const dateWhere = {};
        if (dataScadenzaDa) dateWhere.gte = new Date(dataScadenzaDa);
        if (dataScadenzaA) {
            const endDate = new Date(dataScadenzaA);
            endDate.setHours(23, 59, 59, 999);
            dateWhere.lte = endDate;
        }
        const hasDateFilter = Object.keys(dateWhere).length > 0;

        const includeCategory = (cat) => !categoria || categoria === cat;
        const includeStatus = (itemStatus) => !status || status === itemStatus;
        const includePriority = (itemPriority) => !priorita || priorita === itemPriority;
        const includeDate = (date) => {
            if (!date) return false;
            const d = new Date(date);
            if (dataScadenzaDa && d < new Date(dataScadenzaDa)) return false;
            if (dataScadenzaA) {
                const endDate = new Date(dataScadenzaA);
                endDate.setHours(23, 59, 59, 999);
                if (d > endDate) return false;
            }
            return true;
        };

        const queries = [];

        queries.push(includeCategory('MANUTENZIONE')
            ? prisma.strumento.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    stato: { not: 'DISMESSO' },
                    OR: [
                        { prossimaManutenzione: hasDateFilter ? dateWhere : { not: null } },
                        { stato: { in: ['IN_MANUTENZIONE', 'FUORI_SERVIZIO'] } }
                    ]
                },
                include: {
                    ambulatorio: { select: { id: true, nome: true } },
                    ambulatoriAssegnati: {
                        where: { deletedAt: null },
                        include: { ambulatorio: { select: { id: true, nome: true } } }
                    }
                }
            })
            : Promise.resolve([]));

        queries.push(includeCategory('FARMACO')
            ? prisma.farmaco.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    ...(hasDateFilter ? { dataScadenza: dateWhere } : {})
                },
                include: {
                    ambulatorio: { select: { id: true, nome: true } }
                }
            })
            : Promise.resolve([]));

        queries.push(includeCategory('VISITA_MEDICA')
            ? prisma.visita.findMany({
                where: {
                    tenantId,
                    deletedAt: null,
                    tipoVisitaMDL: null,
                    prossimoControllo: hasDateFilter ? dateWhere : { not: null },
                    ...(personId && { pazienteId: personId })
                },
                include: {
                    paziente: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            tenantProfiles: {
                                where: { tenantId, deletedAt: null },
                                select: { email: true, phone: true },
                                take: 1
                            }
                        }
                    },
                    medico: { select: { id: true, firstName: true, lastName: true } },
                    prestazione: { select: { id: true, nome: true } },
                    ambulatorio: { select: { id: true, nome: true } }
                }
            })
            : Promise.resolve([]));

        const [strumenti, farmaci, visite] = await Promise.all(queries);

        const derived = [];

        strumenti.forEach((strumento) => {
            const dataScadenza = strumento.prossimaManutenzione || new Date();
            if (!includeDate(dataScadenza)) return;

            const itemStatus = getStatusForDate(dataScadenza);
            const itemPriority = strumento.stato === 'FUORI_SERVIZIO' ? 'CRITICAL' : getPriorityForDate(dataScadenza);
            if (!includeStatus(itemStatus) || !includePriority(itemPriority)) return;

            const ambulatorio = strumento.ambulatorio || strumento.ambulatoriAssegnati?.[0]?.ambulatorio || null;
            derived.push(normalizeDeadlineItem({
                id: `derived:strumento:${strumento.id}`,
                tenantId,
                categoria: 'MANUTENZIONE',
                priorita: itemPriority,
                status: itemStatus,
                entityType: 'STRUMENTO_MANUTENZIONE',
                entityId: strumento.id,
                dataScadenza,
                titolo: `Manutenzione ${strumento.nome}`,
                descrizione: [
                    strumento.codice ? `Codice ${strumento.codice}` : null,
                    strumento.stato !== 'ATTIVO' ? `Stato ${strumento.stato}` : null
                ].filter(Boolean).join(' - '),
                ambulatorioId: ambulatorio?.id,
                ambulatorio,
                notificaInviata1: false,
                notificaInviata2: false,
                ricorrente: Boolean(strumento.intervallManutenzione),
                frequenzaMesi: strumento.intervallManutenzione || null,
                createdAt: strumento.createdAt,
                updatedAt: strumento.updatedAt
            }));
        });

        farmaci.forEach((farmaco) => {
            const itemStatus = getStatusForDate(farmaco.dataScadenza);
            const itemPriority = getPriorityForDate(farmaco.dataScadenza);
            if (!includeStatus(itemStatus) || !includePriority(itemPriority)) return;

            derived.push(normalizeDeadlineItem({
                id: `derived:farmaco:${farmaco.id}`,
                tenantId,
                categoria: 'FARMACO',
                priorita: itemPriority,
                status: itemStatus,
                entityType: 'FARMACO',
                entityId: farmaco.id,
                farmacoId: farmaco.id,
                dataScadenza: farmaco.dataScadenza,
                titolo: `Scadenza farmaco ${farmaco.nome}`,
                descrizione: [
                    farmaco.lottoNumero ? `Lotto ${farmaco.lottoNumero}` : null,
                    farmaco.ubicazione ? `Ubicazione ${farmaco.ubicazione}` : null
                ].filter(Boolean).join(' - '),
                ubicazione: farmaco.ubicazione,
                quantita: farmaco.quantitaDisponibile,
                unitaMisura: farmaco.unitaMisura,
                lottoNumero: farmaco.lottoNumero,
                ambulatorioId: farmaco.ambulatorioId,
                ambulatorio: farmaco.ambulatorio,
                notificaInviata1: false,
                notificaInviata2: false,
                ricorrente: false,
                createdAt: farmaco.createdAt,
                updatedAt: farmaco.updatedAt
            }));
        });

        visite.forEach((visita) => {
            const itemStatus = getStatusForDate(visita.prossimoControllo);
            const itemPriority = getPriorityForDate(visita.prossimoControllo);
            if (!includeStatus(itemStatus) || !includePriority(itemPriority)) return;

            derived.push(normalizeDeadlineItem({
                id: `derived:visita:${visita.id}`,
                tenantId,
                categoria: 'VISITA_MEDICA',
                priorita: itemPriority,
                status: itemStatus,
                entityType: 'VISITA_FOLLOWUP',
                entityId: visita.id,
                dataScadenza: visita.prossimoControllo,
                titolo: `Controllo ${visita.prestazione?.nome || 'visita'}`,
                descrizione: visita.noteFollowup || `Paziente ${visita.paziente?.lastName || ''} ${visita.paziente?.firstName || ''}`.trim(),
                personId: visita.pazienteId,
                person: normalizePerson(visita.paziente),
                responsabileId: visita.medicoId,
                responsabile: normalizePerson(visita.medico),
                ambulatorioId: visita.ambulatorioId,
                ambulatorio: visita.ambulatorio,
                notificaInviata1: false,
                notificaInviata2: false,
                ricorrente: false,
                createdAt: visita.createdAt,
                updatedAt: visita.updatedAt
            }));
        });

        return derived.filter(item => matchesSearch(item, search));
    }

    /**
     * Risolve una scadenza automatica aggiornando la sorgente reale.
     * Le scadenze derivate non esistono come record persistiti, quindi la chiusura
     * deve agire su farmaco/visita e lasciare un item completato come traccia.
     */
    async resolveDerived(tenantId, data, personId) {
        const { entityType, entityId, newDate, note } = data || {};
        if (!entityType || !entityId) {
            throw new Error('Origine scadenza non valida');
        }

        if (entityType === 'FARMACO') {
            if (!newDate) {
                throw new Error('Nuova data scadenza obbligatoria per il rinnovo farmaco');
            }
            const farmaco = await prisma.farmaco.findFirst({
                where: { id: entityId, tenantId, deletedAt: null }
            });
            if (!farmaco) throw new Error('Farmaco non trovato');

            const nuovaScadenza = new Date(newDate);
            return prisma.$transaction(async (tx) => {
                await tx.deadlineItem.create({
                    data: {
                        tenantId,
                        categoria: 'FARMACO',
                        priorita: getPriorityForDate(farmaco.dataScadenza),
                        status: 'COMPLETATA',
                        entityType: 'FARMACO',
                        entityId: farmaco.id,
                        farmacoId: farmaco.id,
                        dataScadenza: farmaco.dataScadenza,
                        titolo: `Rinnovo farmaco ${farmaco.nome}`,
                        descrizione: note || 'Scadenza farmaco rinnovata',
                        ubicazione: farmaco.ubicazione,
                        quantita: farmaco.quantitaDisponibile,
                        unitaMisura: farmaco.unitaMisura,
                        lottoNumero: farmaco.lottoNumero,
                        completatoAt: new Date(),
                        completatoDa: personId,
                        noteCompletamento: note || `Nuova scadenza: ${nuovaScadenza.toISOString().slice(0, 10)}`,
                        createdBy: personId
                    }
                });

                return tx.farmaco.update({
                    where: { id: farmaco.id },
                    data: { dataScadenza: nuovaScadenza }
                });
            });
        }

        if (entityType === 'VISITA_FOLLOWUP') {
            const visita = await prisma.visita.findFirst({
                where: { id: entityId, tenantId, deletedAt: null },
                include: {
                    paziente: { select: { id: true, firstName: true, lastName: true } },
                    medico: { select: { id: true, firstName: true, lastName: true } },
                    prestazione: { select: { id: true, nome: true } }
                }
            });
            if (!visita || !visita.prossimoControllo) throw new Error('Scadenza visita non trovata');

            return prisma.$transaction(async (tx) => {
                await tx.deadlineItem.create({
                    data: {
                        tenantId,
                        categoria: 'VISITA_MEDICA',
                        priorita: getPriorityForDate(visita.prossimoControllo),
                        status: 'COMPLETATA',
                        entityType: 'VISITA_FOLLOWUP',
                        entityId: visita.id,
                        dataScadenza: visita.prossimoControllo,
                        titolo: `Controllo ${visita.prestazione?.nome || 'visita'}`,
                        descrizione: note || `Follow-up risolto per ${visita.paziente?.lastName || ''} ${visita.paziente?.firstName || ''}`.trim(),
                        personId: visita.pazienteId,
                        responsabileId: visita.medicoId,
                        completatoAt: new Date(),
                        completatoDa: personId,
                        noteCompletamento: note || 'Contatto gestito / nuovo appuntamento da fissare',
                        createdBy: personId
                    }
                });

                return tx.visita.update({
                    where: { id: visita.id },
                    data: {
                        prossimoControllo: null,
                        noteFollowup: note || visita.noteFollowup
                    }
                });
            });
        }

        throw new Error('Tipologia scadenza automatica non supportata');
    }

    /**
     * Ottiene statistiche per dashboard
     */
    async getStats(tenantId, filters = {}) {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const tra7giorni = new Date(oggi);
        tra7giorni.setDate(tra7giorni.getDate() + 7);

        const tra30giorni = new Date(oggi);
        tra30giorni.setDate(tra30giorni.getDate() + 30);

        const { items } = await this.getAll(tenantId, {
            ...filters,
            page: 1,
            limit: 100000,
            sortBy: 'dataScadenza',
            sortOrder: 'asc'
        });

        const relevant = items.filter(item => ['ATTIVA', 'IN_PREAVVISO', 'SCADUTA'].includes(item.status));
        const active = relevant.filter(item => ['ATTIVA', 'IN_PREAVVISO'].includes(item.status));

        const perCategoriaMap = new Map();
        const perPrioritaMap = new Map();

        relevant.forEach(item => {
            perCategoriaMap.set(item.categoria, (perCategoriaMap.get(item.categoria) || 0) + 1);
            perPrioritaMap.set(item.priorita, (perPrioritaMap.get(item.priorita) || 0) + 1);
        });

        return {
            totali: active.length,
            scadute: relevant.filter(item => item.status === 'SCADUTA').length,
            inScadenza7gg: active.filter(item => {
                const date = new Date(item.dataScadenza);
                return date >= oggi && date <= tra7giorni;
            }).length,
            inScadenza30gg: active.filter(item => {
                const date = new Date(item.dataScadenza);
                return date >= oggi && date <= tra30giorni;
            }).length,
            perCategoria: Array.from(perCategoriaMap.entries()).map(([categoria, count]) => ({ categoria, count })),
            perPriorita: Array.from(perPrioritaMap.entries()).map(([priorita, count]) => ({ priorita, count }))
        };
    }

    /**
     * Ottiene una scadenza per ID
     */
    async getById(id, tenantId) {
        return prisma.deadlineItem.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                responsabile: {
                    select: { id: true, firstName: true, lastName: true, gender: true }
                },
                person: {
                    select: { id: true, firstName: true, lastName: true, taxCode: true }
                },
                companyProfile: {
                    include: {
                        company: { select: { ragioneSociale: true, piva: true } }
                    }
                },
                site: true,
                farmaco: true
            }
        });
    }

    /**
     * Crea una nuova scadenza
     */
    async create(data, tenantId, createdBy) {
        // Calcola date preavviso se non fornite
        const dataScadenza = new Date(data.dataScadenza);

        let dataPreavviso1 = data.dataPreavviso1 ? new Date(data.dataPreavviso1) : null;
        let dataPreavviso2 = data.dataPreavviso2 ? new Date(data.dataPreavviso2) : null;

        // Default: 30gg e 7gg prima
        if (!dataPreavviso1) {
            dataPreavviso1 = new Date(dataScadenza);
            dataPreavviso1.setDate(dataPreavviso1.getDate() - 30);
        }
        if (!dataPreavviso2) {
            dataPreavviso2 = new Date(dataScadenza);
            dataPreavviso2.setDate(dataPreavviso2.getDate() - 7);
        }

        const deadline = await prisma.deadlineItem.create({
            data: {
                tenantId,
                categoria: normalizeCategory(data.categoria),
                priorita: normalizePriority(data.priorita || 'NORMAL'),
                status: 'ATTIVA',
                entityType: data.entityType,
                entityId: data.entityId,
                dataScadenza,
                dataPreavviso1,
                dataPreavviso2,
                responsabileId: data.responsabileId,
                personId: data.personId,
                companyProfileId: data.companyProfileId || data.companyId,
                siteId: data.siteId || data.companySiteId,
                titolo: data.titolo,
                descrizione: data.descrizione,
                note: data.note,
                ubicazione: data.ubicazione,
                quantita: data.quantita,
                unitaMisura: data.unitaMisura,
                lottoNumero: data.lottoNumero,
                farmacoId: data.farmacoId,
                isRicorrente: data.isRicorrente ?? data.ricorrente ?? false,
                periodicitaMesi: data.periodicitaMesi ?? data.frequenzaMesi,
                createdBy
            },
            include: {
                responsabile: { select: { id: true, firstName: true, lastName: true } },
                person: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        logger.info({ deadlineId: deadline.id, categoria: data.categoria }, 'Deadline created');
        return deadline;
    }

    /**
     * Aggiorna una scadenza
     */
    async update(id, tenantId, data) {
        // Verifica ownership
        const existing = await prisma.deadlineItem.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!existing) {
            throw new Error('Scadenza non trovata');
        }

        const updateData = {};

        // Campi aggiornabili
        const allowedFields = [
            'categoria', 'priorita', 'status', 'dataScadenza', 'dataPreavviso1', 'dataPreavviso2',
            'responsabileId', 'personId', 'companyProfileId', 'siteId',
            'titolo', 'descrizione', 'note', 'ubicazione', 'quantita', 'unitaMisura',
            'lottoNumero', 'farmacoId', 'isRicorrente', 'periodicitaMesi'
        ];

        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updateData[field] = data[field];
            }
        });

        if (data.companyId !== undefined) updateData.companyProfileId = data.companyId;
        if (data.companySiteId !== undefined) updateData.siteId = data.companySiteId;
        if (data.ricorrente !== undefined) updateData.isRicorrente = data.ricorrente;
        if (data.frequenzaMesi !== undefined) updateData.periodicitaMesi = data.frequenzaMesi;
        if (updateData.categoria) updateData.categoria = normalizeCategory(updateData.categoria);
        if (updateData.priorita) updateData.priorita = normalizePriority(updateData.priorita);

        // Converti date
        if (updateData.dataScadenza) updateData.dataScadenza = new Date(updateData.dataScadenza);
        if (updateData.dataPreavviso1) updateData.dataPreavviso1 = new Date(updateData.dataPreavviso1);
        if (updateData.dataPreavviso2) updateData.dataPreavviso2 = new Date(updateData.dataPreavviso2);

        const deadline = await prisma.deadlineItem.update({
            where: { id },
            data: updateData,
            include: {
                responsabile: { select: { id: true, firstName: true, lastName: true } },
                person: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        logger.info({ deadlineId: id }, 'Deadline updated');
        return deadline;
    }

    /**
     * Marca una scadenza come completata
     */
    async complete(id, tenantId, completatoDa, noteCompletamento) {
        const deadline = await prisma.deadlineItem.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!deadline) {
            throw new Error('Scadenza non trovata');
        }

        const updated = await prisma.deadlineItem.update({
            where: { id },
            data: {
                status: 'COMPLETATA',
                completatoAt: new Date(),
                completatoDa,
                noteCompletamento
            }
        });

        // Se ricorrente, crea la prossima occorrenza
        if (deadline.isRicorrente && deadline.periodicitaMesi) {
            const prossimaData = new Date(deadline.dataScadenza);
            prossimaData.setMonth(prossimaData.getMonth() + deadline.periodicitaMesi);

            await this.create({
                categoria: deadline.categoria,
                priorita: deadline.priorita,
                entityType: deadline.entityType,
                entityId: deadline.entityId,
                dataScadenza: prossimaData,
                responsabileId: deadline.responsabileId,
                personId: deadline.personId,
                companyProfileId: deadline.companyProfileId,
                siteId: deadline.siteId,
                titolo: deadline.titolo,
                descrizione: deadline.descrizione,
                ubicazione: deadline.ubicazione,
                farmacoId: deadline.farmacoId,
                isRicorrente: true,
                periodicitaMesi: deadline.periodicitaMesi
            }, tenantId, completatoDa);

            logger.info({ deadlineId: id, nextDate: prossimaData }, 'Created next recurring deadline');
        }

        logger.info({ deadlineId: id }, 'Deadline completed');
        return updated;
    }

    /**
     * Soft delete
     */
    async delete(id, tenantId, deletedBy, deletionReason) {
        const deadline = await prisma.deadlineItem.findFirst({
            where: { id, tenantId, deletedAt: null }
        });

        if (!deadline) {
            throw new Error('Scadenza non trovata');
        }

        await prisma.$transaction(async (tx) => {
            // Soft delete
            await tx.deadlineItem.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    status: 'ANNULLATA'
                }
            });

            // GDPR Audit Log
            await tx.gdprAuditLog.create({
                data: {
                    personId: deletedBy,
                    action: 'DELETE',
                    resourceType: 'DeadlineItem',
                    resourceId: id,
                    tenantId,
                    dataAccessed: {
                        deletionReason,
                        deletedBy,
                        operation: 'SOFT_DELETE'
                    }
                }
            });
        });

        logger.info({ deadlineId: id }, 'Deadline deleted');
        return { success: true };
    }

    /**
     * Aggiorna stati in base alla data corrente (job schedulato)
     */
    async updateStatuses(tenantId = null) {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);

        const where = {
            deletedAt: null,
            status: { in: ['ATTIVA', 'IN_PREAVVISO'] }
        };

        if (tenantId) where.tenantId = tenantId;

        // Marca come scadute quelle con data passata
        const scadute = await prisma.deadlineItem.updateMany({
            where: {
                ...where,
                dataScadenza: { lt: oggi }
            },
            data: { status: 'SCADUTA' }
        });

        // Marca come IN_PREAVVISO quelle nel range preavviso
        const inPreavviso = await prisma.deadlineItem.updateMany({
            where: {
                ...where,
                status: 'ATTIVA',
                OR: [
                    { dataPreavviso1: { lte: oggi }, dataScadenza: { gte: oggi } },
                    { dataPreavviso2: { lte: oggi }, dataScadenza: { gte: oggi } }
                ]
            },
            data: { status: 'IN_PREAVVISO' }
        });

        logger.info({ scadute: scadute.count, inPreavviso: inPreavviso.count }, 'Deadline statuses updated');
        return { scadute: scadute.count, inPreavviso: inPreavviso.count };
    }
}

export default new DeadlineService();
