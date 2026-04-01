/**
 * EmailTemplateService.js
 * Service per la gestione dei template email per invio referti
 *
 * Priorità di risoluzione template:
 *   1. prestazioneId specifico
 *   2. medicoId specifico
 *   3. branca
 *   4. default tenant (isDefault=true)
 *
 * @project P74 - Referto Mail, Document Management & Salva e Completa UX
 */

import optimizedPrisma from '../../config/database.js';
import logger from '../../utils/logger.js';

const prisma = optimizedPrisma.getClient();

class EmailTemplateService {

    /**
     * Elenco template email del tenant
     */
    async getAll({ tenantId, branca, medicoId, prestazioneId, isActive, page = 1, limit = 50 }) {
        logger.info({ tenantId, branca }, 'EmailTemplateService.getAll');

        const where = { tenantId, deletedAt: null };
        if (branca !== undefined) where.branca = branca || null;
        if (medicoId !== undefined) where.medicoId = medicoId || null;
        if (prestazioneId !== undefined) where.prestazioneId = prestazioneId || null;
        if (typeof isActive === 'boolean') where.isActive = isActive;

        const offset = (page - 1) * limit;
        const [data, total] = await Promise.all([
            prisma.emailTemplate.findMany({
                where,
                orderBy: [{ isDefault: 'desc' }, { nome: 'asc' }],
                skip: offset,
                take: limit
            }),
            prisma.emailTemplate.count({ where })
        ]);

        return { data, total, page, limit, pages: Math.ceil(total / limit) };
    }

    /**
     * Dettaglio template
     */
    async getById(id, tenantId) {
        const template = await prisma.emailTemplate.findFirst({
            where: { id, tenantId, deletedAt: null }
        });
        if (!template) throw new Error('Template email non trovato');
        return template;
    }

    /**
     * Crea nuovo template
     */
    async create({ tenantId, nome, branca, medicoId, prestazioneId, subject, bodyHtml, allegatiIds = [], isDefault = false }, createdBy) {
        logger.info({ tenantId, nome }, 'EmailTemplateService.create');

        return prisma.$transaction(async (tx) => {
            // Se isDefault=true, rimuovi default precedente dello stesso scope
            if (isDefault) {
                await tx.emailTemplate.updateMany({
                    where: {
                        tenantId, isDefault: true, deletedAt: null,
                        branca: branca || null,
                        medicoId: medicoId || null,
                        prestazioneId: prestazioneId || null
                    },
                    data: { isDefault: false }
                });
            }

            return tx.emailTemplate.create({
                data: { tenantId, nome, branca: branca || null, medicoId: medicoId || null, prestazioneId: prestazioneId || null, subject, bodyHtml, allegatiIds, isDefault, createdBy }
            });
        });
    }

    /**
     * Aggiorna template
     */
    async update(id, tenantId, data) {
        logger.info({ id, tenantId }, 'EmailTemplateService.update');

        const existing = await prisma.emailTemplate.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('Template email non trovato');

        return prisma.$transaction(async (tx) => {
            if (data.isDefault) {
                await tx.emailTemplate.updateMany({
                    where: {
                        tenantId, isDefault: true, deletedAt: null,
                        branca: data.branca ?? existing.branca,
                        medicoId: data.medicoId ?? existing.medicoId,
                        prestazioneId: data.prestazioneId ?? existing.prestazioneId,
                        id: { not: id }
                    },
                    data: { isDefault: false }
                });
            }

            return tx.emailTemplate.update({
                where: { id },
                data: {
                    nome: data.nome,
                    branca: data.branca !== undefined ? data.branca || null : undefined,
                    medicoId: data.medicoId !== undefined ? data.medicoId || null : undefined,
                    prestazioneId: data.prestazioneId !== undefined ? data.prestazioneId || null : undefined,
                    subject: data.subject,
                    bodyHtml: data.bodyHtml,
                    allegatiIds: data.allegatiIds,
                    isDefault: data.isDefault,
                    isActive: data.isActive
                }
            });
        });
    }

    /**
     * Soft delete template
     */
    async delete(id, tenantId) {
        logger.info({ id, tenantId }, 'EmailTemplateService.delete');

        const existing = await prisma.emailTemplate.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('Template email non trovato');

        return prisma.emailTemplate.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    }

    /**
     * Risolve il template più adatto per una specifica visita.
     * Priorità: prestazioneId > medicoId > branca > default tenant
     *
     * @param {string} tenantId
     * @param {Object} opts
     * @param {string} [opts.prestazioneId]
     * @param {string} [opts.medicoId]
     * @param {string} [opts.branca] - es. 'MEDICA'
     * @returns {Promise<Object|null>} template risolto o null
     */
    async resolveTemplate(tenantId, { prestazioneId, medicoId, branca } = {}) {
        logger.info({ tenantId, prestazioneId, medicoId, branca }, 'EmailTemplateService.resolveTemplate');

        const baseWhere = { tenantId, deletedAt: null, isActive: true };

        // 1. Cerca per prestazione specifica
        if (prestazioneId) {
            const tpl = await prisma.emailTemplate.findFirst({
                where: { ...baseWhere, prestazioneId }
            });
            if (tpl) return tpl;
        }

        // 2. Cerca per medico specifico
        if (medicoId) {
            const tpl = await prisma.emailTemplate.findFirst({
                where: { ...baseWhere, medicoId, prestazioneId: null }
            });
            if (tpl) return tpl;
        }

        // 3. Cerca per branca
        if (branca) {
            const tpl = await prisma.emailTemplate.findFirst({
                where: { ...baseWhere, branca, medicoId: null, prestazioneId: null }
            });
            if (tpl) return tpl;
        }

        // 4. Cerca default tenant
        const tpl = await prisma.emailTemplate.findFirst({
            where: { ...baseWhere, isDefault: true, branca: null, medicoId: null, prestazioneId: null }
        });

        return tpl;
    }

    /**
     * Genera HTML dell'email sostituendo le variabili nel template
     * Variabili disponibili: {{paziente}}, {{data}}, {{medico}}, {{prestazione}}, {{struttura}}
     */
    renderBody(bodyHtml, vars = {}) {
        let html = bodyHtml;
        for (const [key, value] of Object.entries(vars)) {
            html = html.replaceAll(`{{${key}}}`, value || '');
        }
        return html;
    }
}

export default new EmailTemplateService();
