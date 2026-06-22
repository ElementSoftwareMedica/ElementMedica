/**
 * UscitaMCService
 *
 * Gestione delle uscite del Medico Competente presso le sedi aziendali.
 * Ogni uscita genera automaticamente:
 *   - ENTRATA: ricavo verso l'azienda (Da Fatturare)
 *   - USCITA: compenso al medico competente esecutore
 *
 * @module services/management/UscitaMCService
 */

import prisma from '../../config/prisma-optimization.js';
import { logger } from '../../utils/logger.js';

const UscitaMCService = {
    /**
     * Lista uscite MC per azienda
     */
    async getAll(tenantId, { companyTenantProfileId, stato, page = 1, limit = 50 } = {}) {
        const where = {
            tenantId,
            deletedAt: null,
            ...(companyTenantProfileId && { companyTenantProfileId }),
            ...(stato && { stato })
        };

        const [data, total] = await Promise.all([
            prisma.uscitaMC.findMany({
                where,
                include: {
                    site: { select: { id: true, siteName: true } },
                    medico: { select: { id: true, firstName: true, lastName: true, gender: true } }
                },
                orderBy: { data: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.uscitaMC.count({ where })
        ]);

        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    },

    /**
     * Singola uscita MC
     */
    async getById(id, tenantId) {
        const uscita = await prisma.uscitaMC.findFirst({
            where: { id, tenantId, deletedAt: null },
            include: {
                site: { select: { id: true, siteName: true } },
                medico: { select: { id: true, firstName: true, lastName: true, gender: true } },
                voceTariffario: { select: { id: true, nome: true, tipo: true } }
            }
        });
        if (!uscita) throw new Error('Uscita MC non trovata');
        return uscita;
    },

    /**
     * Lista medici disponibili per una company (nominati MC o coordinati)
     * Precedenza: medico nominato su company → medici coordinati → tutti i MC del tenant
     */
    async getMediciDisponibili(companyTenantProfileId, tenantId) {
        const nomine = await prisma.nominaRuolo.findMany({
            where: {
                tenantId,
                deletedAt: null,
                companyTenantProfileId,
                tipoRuolo: { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'] },
                stato: { notIn: ['REVOCATA', 'SCADUTA'] }
            },
            include: {
                persona: { select: { id: true, firstName: true, lastName: true, gender: true } }
            },
            orderBy: [
                { tipoRuolo: 'asc' },
                { dataInizio: 'desc' }
            ]
        });

        return nomine
            .filter(n => n.persona)
            .map(n => ({
                id: n.persona.id,
                firstName: n.persona.firstName,
                lastName: n.persona.lastName,
                gender: n.persona.gender,
                tipoRuolo: n.tipoRuolo,
                isPrimario: n.tipoRuolo === 'MEDICO_COMPETENTE'
            }));
    },

    /**
     * Lista delle voci tariffario "Una tantum" del tariffario aziendale in vigore,
     * selezionabili come spesa da rendicontare insieme (o in alternativa) all'uscita MC.
     */
    async getVociUnaTantum(companyTenantProfileId, tenantId, referenceDate = new Date()) {
        const baseWhere = { companyTenantProfileId, tenantId, attivo: true, deletedAt: null };

        // Tariffario in vigore alla data di riferimento (non scaduto, non futuro)
        let assoc = await prisma.tariffarioCompanyAssociation.findFirst({
            where: {
                ...baseWhere,
                validoDa: { lte: referenceDate },
                OR: [{ validoA: null }, { validoA: { gte: referenceDate } }],
            },
            include: { tariffario: { include: { voci: { where: { attivo: true, deletedAt: null } } } } },
            orderBy: { validoDa: 'desc' },
        });

        if (!assoc) return [];

        return (assoc.tariffario?.voci || [])
            // Solo voci "Una tantum"; la voce USCITA_MC è già rappresentata
            // dall'opzione "standard" nel modal, quindi va esclusa dall'elenco.
            .filter(v => v.frequenza === 'UNA_TANTUM' && v.tipo !== 'USCITA_MC')
            .map(v => ({
                id: v.id,
                tipo: v.tipo,
                nome: v.nome,
                prezzoBase: v.prezzoBase,
                ivaAliquota: v.ivaAliquota,
                hasCompenso: v.compensoProfessionistaTipo != null,
            }))
            .sort((a, b) => (a.nome || a.tipo).localeCompare(b.nome || b.tipo));
    },

    /**
     * Crea una nuova uscita MC
     */
    async create(data, tenantId) {
        const {
            companyTenantProfileId,
            siteId,
            medicoId,
            voceTariffarioId,
            data: dataUscita,
            note
        } = data;

        if (!companyTenantProfileId) throw new Error('companyTenantProfileId è obbligatorio');
        if (!dataUscita) throw new Error('La data dell\'uscita è obbligatoria');

        const company = await prisma.companyTenantProfile.findFirst({
            where: { id: companyTenantProfileId, tenantId, deletedAt: null }
        });
        if (!company) throw new Error('Azienda non trovata o non autorizzata');

        if (medicoId) {
            const nomina = await prisma.nominaRuolo.findFirst({
                where: {
                    tenantId,
                    companyTenantProfileId,
                    personId: medicoId,
                    tipoRuolo: { in: ['MEDICO_COMPETENTE', 'MEDICO_COMPETENTE_COORDINATO'] },
                    stato: { notIn: ['REVOCATA', 'SCADUTA'] },
                    deletedAt: null
                }
            });
            if (!nomina) throw new Error('Medico non trovato o non autorizzato per questa azienda');
        }

        // Se è stata scelta una voce "Una tantum" diversa, verifica che appartenga
        // al tariffario in vigore per questa azienda
        if (voceTariffarioId) {
            const vociValide = await this.getVociUnaTantum(companyTenantProfileId, tenantId);
            if (!vociValide.some(v => v.id === voceTariffarioId)) {
                throw new Error('Voce tariffario non valida per il tariffario in vigore');
            }
        }

        const uscita = await prisma.uscitaMC.create({
            data: {
                companyTenantProfileId,
                ...(siteId && { siteId }),
                ...(medicoId && { medicoId }),
                ...(voceTariffarioId && { voceTariffarioId }),
                data: new Date(dataUscita),
                ...(note && { note: note.trim() }),
                stato: 'DA_FATTURARE',
                tenantId
            },
            include: {
                site: { select: { id: true, siteName: true } },
                medico: { select: { id: true, firstName: true, lastName: true, gender: true } },
                voceTariffario: { select: { id: true, nome: true, tipo: true } }
            }
        });

        logger.info({ id: uscita.id, companyTenantProfileId, tenantId }, 'UscitaMC creata');
        return uscita;
    },

    /**
     * Annulla un'uscita MC
     */
    async annulla(id, tenantId) {
        const existing = await prisma.uscitaMC.findFirst({
            where: { id, tenantId, deletedAt: null }
        });
        if (!existing) throw new Error('Uscita MC non trovata');
        if (existing.stato === 'FATTURATA') {
            throw new Error('Impossibile annullare un\'uscita già fatturata');
        }

        const updated = await prisma.uscitaMC.update({
            where: { id },
            data: { stato: 'ANNULLATA' }
        });

        logger.info({ id, tenantId }, 'UscitaMC annullata');
        return updated;
    },

    /**
     * Soft delete (GDPR compliant)
     */
    async delete(id, tenantId, deletionReason, deletedBy) {
        if (!deletionReason || deletionReason.trim().length < 10) {
            throw new Error('Il motivo di eliminazione è obbligatorio (min 10 caratteri)');
        }

        const existing = await prisma.uscitaMC.findFirst({
            where: { id, tenantId, deletedAt: null }
        });
        if (!existing) throw new Error('Uscita MC non trovata');

        await prisma.$transaction([
            prisma.uscitaMC.update({
                where: { id },
                data: { deletedAt: new Date() }
            }),
            prisma.gdprAuditLog.create({
                data: {
                    resourceType: 'UscitaMC',
                    resourceId: id,
                    action: 'DELETE',
                    personId: deletedBy || null,
                    dataAccessed: {
                        fields: ['id', 'data', 'stato', 'medicoId'],
                        reason: deletionReason.trim(),
                        deletedBy: deletedBy || null
                    },
                    tenantId
                }
            })
        ]);

        logger.info({ id, tenantId, deletedBy }, 'UscitaMC eliminata (soft delete)');
    }
};

export default UscitaMCService;
