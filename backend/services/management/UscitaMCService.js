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
                medico: { select: { id: true, firstName: true, lastName: true, gender: true } }
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
     * Crea una nuova uscita MC
     */
    async create(data, tenantId) {
        const {
            companyTenantProfileId,
            siteId,
            medicoId,
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

        const uscita = await prisma.uscitaMC.create({
            data: {
                companyTenantProfileId,
                ...(siteId && { siteId }),
                ...(medicoId && { medicoId }),
                data: new Date(dataUscita),
                ...(note && { note: note.trim() }),
                stato: 'DA_FATTURARE',
                tenantId
            },
            include: {
                site: { select: { id: true, siteName: true } },
                medico: { select: { id: true, firstName: true, lastName: true, gender: true } }
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
