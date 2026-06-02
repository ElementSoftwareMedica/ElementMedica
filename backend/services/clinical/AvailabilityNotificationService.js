import prisma from '../../config/prisma-optimization.js';
import logger from '../../utils/logger.js';
import NotificationService from '../notifications/NotificationService.js';

const ACTION_LABELS = {
    created: 'creato',
    updated: 'modificato',
    deleted: 'eliminato',
    generated: 'generato',
    copied: 'copiato'
};

class AvailabilityNotificationService {
    static async notifySecretaries({ tenantId, actorId, medicoId, action = 'updated', entityId, count = 1, actionUrl = '/poliambulatorio/disponibilita' }) {
        if (!tenantId || !actorId) return;

        try {
            const [secretaries, medico] = await Promise.all([
                prisma.person.findMany({
                    where: {
                        deletedAt: null,
                        tenantProfiles: {
                            some: {
                                tenantId,
                                deletedAt: null,
                                isActive: true
                            }
                        },
                        personRoles: {
                            some: {
                                tenantId,
                                deletedAt: null,
                                isActive: true,
                                roleType: 'SEGRETERIA_CLINICA'
                            }
                        }
                    },
                    select: { id: true }
                }),
                medicoId ? prisma.person.findFirst({
                    where: { id: medicoId, tenantProfiles: { some: { tenantId, deletedAt: null } }, deletedAt: null },
                    select: { firstName: true, lastName: true }
                }) : null
            ]);

            const recipients = secretaries.filter(person => person.id !== actorId);
            if (recipients.length === 0) return;

            const medicoName = medico
                ? `${medico.firstName || ''} ${medico.lastName || ''}`.trim() || 'un medico'
                : 'un medico';
            const actionLabel = ACTION_LABELS[action] || ACTION_LABELS.updated;

            const normalizedCount = Number.isFinite(Number(count)) && Number(count) > 0 ? Number(count) : 1;
            const isPlural = normalizedCount > 1;
            const notification = {
                title: 'Disponibilita medico aggiornata',
                body: isPlural
                    ? `${medicoName} ha ${actionLabel} ${normalizedCount} disponibilita.`
                    : `${medicoName} ha ${actionLabel} una disponibilita.`,
                shortBody: isPlural
                    ? `${normalizedCount} disponibilita ${actionLabel} da ${medicoName}`
                    : `Disponibilita ${actionLabel} da ${medicoName}`,
                type: 'WARNING',
                category: 'APPOINTMENT',
                priority: 'HIGH',
                channels: ['IN_APP'],
                icon: 'calendar-clock',
                actionUrl,
                actionLabel: 'Apri disponibilita',
                entityType: 'DISPONIBILITA_MEDICO',
                entityId,
                triggeredBy: actorId,
                metadata: { medicoId, action, count: normalizedCount }
            };

            await Promise.allSettled(
                recipients.map(person => NotificationService.sendToPerson(person.id, notification, tenantId))
            );
        } catch (error) {
            logger.error({
                component: 'availability-notification-service',
                error: error.message,
                tenantId,
                actorId,
                medicoId
            }, 'Failed to notify secretaries about availability change');
        }
    }
}

export default AvailabilityNotificationService;
