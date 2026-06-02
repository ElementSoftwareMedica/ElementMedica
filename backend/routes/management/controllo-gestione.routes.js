import express from 'express';
import middleware from '../../middleware/auth.js';
import prisma from '../../config/prisma-optimization.js';
import { canAccessTenant, getAccessibleTenants, getEffectiveTenantId } from '../../utils/tenantHelper.js';
import logger from '../../utils/logger.js';

const router = express.Router();
const { authenticate } = middleware;

function toDate(value, fallback) {
    const date = value ? new Date(value) : fallback;
    return Number.isNaN(date.getTime()) ? fallback : date;
}

function splitIds(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(splitIds);
    return String(value).split(',').map(item => item.trim()).filter(Boolean);
}

function money(value) {
    if (value == null) return 0;
    return Number(value) || 0;
}

function getTrendBucket(dateValue, granularity) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Senza data';
    if (granularity === 'giorno') return date.toISOString().slice(0, 10);
    if (granularity === 'settimana') {
        const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = start.getUTCDay() || 7;
        start.setUTCDate(start.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
        const week = Math.ceil((((start - yearStart) / 86400000) + 1) / 7);
        return `${start.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
    }
    return date.toISOString().slice(0, 7);
}

router.get('/prestazioni', authenticate, async (req, res) => {
    try {
        const tenantId = getEffectiveTenantId(req);
        const requestedTenantIds = splitIds(req.query.tenantIds);
        let tenantIds = [tenantId].filter(Boolean);
        if (req.query.allTenants === 'true') {
            const accessibleTenants = await getAccessibleTenants(req);
            tenantIds = accessibleTenants.map(t => t.id).filter(Boolean);
        } else if (requestedTenantIds.length > 0) {
            tenantIds = requestedTenantIds.filter(id => canAccessTenant(req, id));
        }
        if (tenantIds.length === 0 && tenantId) tenantIds = [tenantId];
        const tenantWhere = tenantIds.length === 1 ? tenantIds[0] : { in: tenantIds };
        const now = new Date();
        const startFallback = new Date(now.getFullYear(), now.getMonth(), 1);
        const endFallback = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const dataDa = toDate(req.query.dataDa, startFallback);
        const dataA = toDate(req.query.dataA, endFallback);
        dataA.setHours(23, 59, 59, 999);

        const medicoIds = splitIds(req.query.medicoIds);
        const companyTenantProfileIds = splitIds(req.query.companyTenantProfileIds);
        const stati = splitIds(req.query.stati);
        const tipoPrestazioni = splitIds(req.query.tipoPrestazioni);
        const includeMovimentiAziendali = req.query.includeMovimentiAziendali === 'true';
        const trendGranularity = ['giorno', 'settimana', 'mese'].includes(req.query.trendGranularity)
            ? req.query.trendGranularity
            : 'settimana';

        const items = await prisma.appuntamentoPrestazione.findMany({
            where: {
                tenantId: tenantWhere,
                deletedAt: null,
                stato: { in: stati.length ? stati : ['ESEGUITA', 'IN_ATTESA_REFERTO', 'REFERTATA'] },
                ...(medicoIds.length ? { medicoRefertanteId: { in: medicoIds } } : {}),
                appuntamento: {
                    tenantId: tenantWhere,
                    deletedAt: null,
                    dataOra: { gte: dataDa, lte: dataA },
                    ...(companyTenantProfileIds.length ? { companyTenantProfileId: { in: companyTenantProfileIds } } : {})
                }
            },
            include: {
                prestazione: { select: { id: true, nome: true, codice: true } },
                medicoRefertante: { select: { id: true, firstName: true, lastName: true } },
                movimentiContabili: {
                    where: { tenantId: tenantWhere, deletedAt: null, direzione: 'ENTRATA', stato: { not: 'ANNULLATO' } },
                    select: { importoNetto: true, importoLordo: true }
                },
                appuntamento: {
                    select: {
                        dataOra: true,
                        tipoVisitaMDL: true,
                        medico: { select: { id: true, firstName: true, lastName: true } },
                        companyTenantProfile: {
                            select: {
                                id: true,
                                company: { select: { id: true, ragioneSociale: true, piva: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { appuntamento: { dataOra: 'desc' } },
            take: 5000
        });

        const pivotMap = new Map();
        const byPrestazione = new Map();
        const byMedico = new Map();
        const byAzienda = new Map();
        const trend = new Map();

        for (const item of items) {
            const medico = item.medicoRefertante || item.appuntamento?.medico;
            const companyProfile = item.appuntamento?.companyTenantProfile;
            const isMdl = Boolean(item.appuntamento?.tipoVisitaMDL || companyProfile?.id);
            const itemCategory = isMdl ? 'MDL' : 'PRIVATE';
            if (tipoPrestazioni.length && !tipoPrestazioni.includes(itemCategory)) continue;
            const importoNetto = item.movimentiContabili.reduce((sum, movimento) => sum + money(movimento.importoNetto), 0);
            const importoLordo = item.movimentiContabili.reduce((sum, movimento) => sum + money(movimento.importoLordo), 0);
            const rowKey = [
                companyProfile?.id || 'senza-azienda',
                medico?.id || 'senza-medico',
                item.prestazioneId
            ].join('|');
            const current = pivotMap.get(rowKey) || {
                companyTenantProfileId: companyProfile?.id || null,
                azienda: companyProfile?.company?.ragioneSociale || 'Senza azienda',
                medicoId: medico?.id || null,
                medico: medico ? `${medico.lastName || ''} ${medico.firstName || ''}`.trim() : 'Non assegnato',
                prestazioneId: item.prestazioneId,
                prestazione: item.prestazione?.nome || 'Prestazione',
                codice: item.prestazione?.codice || null,
                count: 0,
                importoNetto: 0,
                importoLordo: 0
            };
            current.count += 1;
            current.importoNetto += importoNetto;
            current.importoLordo += importoLordo;
            pivotMap.set(rowKey, current);

            const bump = (map, key, label) => {
                const value = map.get(key) || { id: key, label, count: 0, importoNetto: 0 };
                value.count += 1;
                value.importoNetto += importoNetto;
                map.set(key, value);
            };
            bump(byPrestazione, item.prestazioneId, item.prestazione?.nome || 'Prestazione');
            bump(byMedico, medico?.id || 'senza-medico', medico ? `${medico.lastName || ''} ${medico.firstName || ''}`.trim() : 'Non assegnato');
            bump(byAzienda, companyProfile?.id || 'senza-azienda', companyProfile?.company?.ragioneSociale || 'Senza azienda');
            bump(trend, getTrendBucket(item.appuntamento?.dataOra, trendGranularity), getTrendBucket(item.appuntamento?.dataOra, trendGranularity));
        }

        if (includeMovimentiAziendali) {
            const companyMovements = await prisma.movimentoContabile.findMany({
                where: {
                    tenantId: tenantWhere,
                    deletedAt: null,
                    direzione: 'ENTRATA',
                    stato: { not: 'ANNULLATO' },
                    dataEsecuzione: { gte: dataDa, lte: dataA },
                    tipo: {
                        in: [
                            'SOPRALLUOGO_MC',
                            'SOPRALLUOGO_RSPP',
                            'DVR_NUOVO',
                            'DVR_AGGIORNAMENTO_CON_MODIFICHE',
                            'DVR_AGGIORNAMENTO_SENZA_MODIFICHE',
                            'NOMINA_MC',
                            'NOMINA_RSPP',
                            'ALLEGATO_3B',
                            'CORSO_FORMAZIONE',
                            'BUNDLE',
                            'CONVENZIONE',
                            'CONSULENZA'
                        ]
                    },
                    ...(companyTenantProfileIds.length ? { companyTenantProfileId: { in: companyTenantProfileIds } } : {})
                },
                include: {
                    companyTenantProfile: {
                        select: { id: true, company: { select: { ragioneSociale: true, piva: true } } }
                    },
                    person: { select: { id: true, firstName: true, lastName: true } }
                },
                take: 5000
            });

            for (const movimento of companyMovements) {
                const companyProfile = movimento.companyTenantProfile;
                const medico = movimento.person;
                if (medicoIds.length && (!medico?.id || !medicoIds.includes(medico.id))) continue;
                const tipoLabel = String(movimento.tipo || 'MOVIMENTO').replaceAll('_', ' ');
                const rowKey = [
                    companyProfile?.id || 'senza-azienda',
                    medico?.id || 'senza-medico',
                    `mov:${movimento.tipo}`
                ].join('|');
                const current = pivotMap.get(rowKey) || {
                    companyTenantProfileId: companyProfile?.id || null,
                    azienda: companyProfile?.company?.ragioneSociale || 'Senza azienda',
                    medicoId: medico?.id || null,
                    medico: medico ? `${medico.lastName || ''} ${medico.firstName || ''}`.trim() : 'Non assegnato',
                    prestazioneId: `mov:${movimento.tipo}`,
                    prestazione: tipoLabel,
                    codice: movimento.tipo || null,
                    count: 0,
                    importoNetto: 0,
                    importoLordo: 0
                };
                current.count += 1;
                current.importoNetto += money(movimento.importoNetto);
                current.importoLordo += money(movimento.importoLordo);
                pivotMap.set(rowKey, current);
                const bump = (map, key, label) => {
                    const value = map.get(key) || { id: key, label, count: 0, importoNetto: 0 };
                    value.count += 1;
                    value.importoNetto += money(movimento.importoNetto);
                    map.set(key, value);
                };
                bump(byPrestazione, `mov:${movimento.tipo}`, tipoLabel);
                bump(byMedico, medico?.id || 'senza-medico', medico ? `${medico.lastName || ''} ${medico.firstName || ''}`.trim() : 'Non assegnato');
                bump(byAzienda, companyProfile?.id || 'senza-azienda', companyProfile?.company?.ragioneSociale || 'Senza azienda');
                bump(trend, getTrendBucket(movimento.dataEsecuzione, trendGranularity), getTrendBucket(movimento.dataEsecuzione, trendGranularity));
            }
        }

        const filters = await Promise.all([
            prisma.person.findMany({
                where: {
                    deletedAt: null,
                    personRoles: { some: { tenantId: tenantWhere, deletedAt: null, roleType: { in: ['MEDICO', 'MEDICO_COMPETENTE'] } } }
                },
                select: { id: true, firstName: true, lastName: true },
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
                take: 500
            }),
            prisma.companyTenantProfile.findMany({
                where: { tenantId: tenantWhere, deletedAt: null, isActive: true },
                select: {
                    id: true,
                    company: { select: { ragioneSociale: true, piva: true } }
                },
                orderBy: { company: { ragioneSociale: 'asc' } },
                take: 1000
            })
        ]);

        res.json({
            success: true,
            data: {
                periodo: { dataDa: dataDa.toISOString(), dataA: dataA.toISOString() },
                totals: {
                    prestazioni: Array.from(pivotMap.values()).reduce((sum, row) => sum + row.count, 0),
                    importoNetto: Array.from(pivotMap.values()).reduce((sum, row) => sum + row.importoNetto, 0),
                    aziende: byAzienda.size,
                    medici: byMedico.size
                },
                rows: Array.from(pivotMap.values()).sort((a, b) => b.count - a.count),
                charts: {
                    byPrestazione: Array.from(byPrestazione.values()).sort((a, b) => b.count - a.count).slice(0, 12),
                    byMedico: Array.from(byMedico.values()).sort((a, b) => b.count - a.count).slice(0, 12),
                    byAzienda: Array.from(byAzienda.values()).sort((a, b) => b.count - a.count).slice(0, 12),
                    trend: Array.from(trend.values()).sort((a, b) => a.id.localeCompare(b.id))
                },
                filters: {
                    medici: filters[0].map(m => ({ id: m.id, label: `${m.lastName || ''} ${m.firstName || ''}`.trim() })),
                    aziende: filters[1].map(a => ({ id: a.id, label: a.company?.ragioneSociale || 'Azienda', piva: a.company?.piva || null }))
                }
            }
        });
    } catch (error) {
        logger.error({
            component: 'controllo-gestione.routes',
            action: 'prestazioni',
            error: error.message,
            tenantId: req.person?.tenantId
        }, 'Errore controllo di gestione');
        res.status(500).json({ success: false, error: 'Errore controllo di gestione' });
    }
});

export default router;
