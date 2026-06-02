/**
 * GiudizioEmailService — P66 MDL
 * Gestisce l'invio delle notifiche email di fine giornata (EOD) per i
 * giudizi di idoneità emessi, ai sensi dell'art. 41 c.7 D.Lgs. 81/08.
 *
 * Invio verso:
 *  - Lavoratore (email da PersonTenantProfile)
 *  - Datore di lavoro / Azienda (email da CompanyTenantProfile, via Visita→Appuntamento)
 */

import prisma from '../../config/prisma-optimization.js';
import { EmailService } from '../emailService.js';
import { logger } from '../../utils/logger.js';

// ============================================================
// HELPERS
// ============================================================

const GIUDIZIO_LABELS = {
    IDONEO: 'Idoneo',
    IDONEO_CON_PRESCRIZIONI: 'Idoneo parziale con prescrizioni',
    IDONEO_CON_LIMITAZIONI: 'Idoneo parziale con limitazioni',
    IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: 'Idoneo parziale con limitazioni e prescrizioni',
    NON_IDONEO_TEMPORANEO: 'Temporaneamente non idoneo',
    NON_IDONEO_PERMANENTE: 'Non idoneo permanente'
};

const GIUDIZIO_BADGE = {
    IDONEO: 'badge-idoneo',
    IDONEO_CON_PRESCRIZIONI: 'badge-prescrizioni',
    IDONEO_CON_LIMITAZIONI: 'badge-limitazioni',
    IDONEO_CON_LIMITAZIONI_PRESCRIZIONI: 'badge-limitazioni',
    NON_IDONEO_TEMPORANEO: 'badge-non-idoneo',
    NON_IDONEO_PERMANENTE: 'badge-non-idoneo'
};

function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function buildTemplateData(giudizio, recipientName, clinicSettings) {
    return {
        recipientName: recipientName,
        lavoratoreName: `${giudizio.person.firstName} ${giudizio.person.lastName}`,
        mansione: giudizio.mansioni?.map(m => m.mansione?.denominazione).filter(Boolean).join(', ') || '—',
        medicoName: `${giudizio.medicoCompetente.gender === 'FEMALE' ? 'Dott.ssa' : 'Dott.'} ${giudizio.medicoCompetente.firstName} ${giudizio.medicoCompetente.lastName}`,
        dataVisita: formatDate(giudizio.dataEmissione),
        giudizioLabel: GIUDIZIO_LABELS[giudizio.tipoGiudizio] || giudizio.tipoGiudizio,
        badgeClass: GIUDIZIO_BADGE[giudizio.tipoGiudizio] || 'badge-idoneo',
        dataScadenza: giudizio.dataScadenza ? formatDate(giudizio.dataScadenza) : '',
        prescrizioniIdoneita: giudizio.prescrizioniIdoneita || '',
        limitazioni: giudizio.limitazioni || '',
        clinicName: clinicSettings.name || 'Clinica',
        clinicPhone: clinicSettings.phone || '',
        clinicEmail: clinicSettings.email || ''
    };
}

// ============================================================
// SERVICE
// ============================================================

const GiudizioEmailService = {

    /**
     * Invia la notifica EOD per un singolo giudizio.
     * @param {string} giudizioId
     * @param {'lavoratore'|'azienda'|'both'} recipient  default: 'both'
     */
    async sendGiudizioNotification(giudizioId, recipient = 'both') {
        const giudizio = await prisma.giudizioIdoneita.findFirst({
            where: { id: giudizioId, deletedAt: null },
            include: {
                person: true,
                medicoCompetente: { select: { firstName: true, lastName: true, gender: true } },
                mansioni: { include: { mansione: { select: { denominazione: true } } } },
                visita: {
                    include: {
                        appuntamento: {
                            include: {
                                companyTenantProfile: {
                                    select: {
                                        emailGenerale: true,
                                        company: {
                                            select: { ragioneSociale: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                tenant: { select: { name: true, settings: true } }
            }
        });

        if (!giudizio) throw new Error(`GiudizioIdoneita ${giudizioId} non trovato`);

        // BOZZA: non inviare notifiche – il giudizio non è definitivo
        if (giudizio.stato === 'BOZZA') {
            logger.info('GiudizioEmailService: skip notifica per giudizio in BOZZA', { giudizioId });
            return { lavoratore: 'skipped-bozza', azienda: 'skipped-bozza' };
        }

        const { tenantId } = giudizio;
        const clinicSettings = {
            name: giudizio.tenant.name,
            email: giudizio.tenant.settings?.clinicEmail || giudizio.tenant.settings?.email || '',
            phone: giudizio.tenant.settings?.clinicPhone || giudizio.tenant.settings?.phone || ''
        };

        const results = { lavoratore: null, azienda: null };

        // --- LAVORATORE ---
        if (recipient === 'lavoratore' || recipient === 'both') {
            const profile = await prisma.personTenantProfile.findFirst({
                where: { personId: giudizio.personId, tenantId, deletedAt: null },
                select: { email: true }
            });
            const emailAddress = profile?.email;

            if (emailAddress) {
                try {
                    const data = buildTemplateData(
                        giudizio,
                        `${giudizio.person.firstName} ${giudizio.person.lastName}`,
                        clinicSettings
                    );
                    await EmailService.queue({ to: emailAddress, template: 'GIUDIZIO_IDONEITA_NOTIFICA', data, tenantId });
                    await prisma.giudizioIdoneita.update({
                        where: { id: giudizioId },
                        data: { dataNotificaLavoratore: new Date() }
                    });
                    results.lavoratore = 'sent';
                    logger.info('GiudizioEmailService: lavoratore notificato', {
                        giudizioId, email: emailAddress.substring(0, 3) + '***'
                    });
                } catch (err) {
                    results.lavoratore = `error: ${err.message}`;
                    logger.warn('GiudizioEmailService: errore invio lavoratore', { giudizioId, error: err.message });
                }
            } else {
                results.lavoratore = 'no-email';
            }
        }

        // --- AZIENDA / DATORE DI LAVORO ---
        if (recipient === 'azienda' || recipient === 'both') {
            const companyProfile = giudizio.visita?.appuntamento?.companyTenantProfile;
            const aziendaEmail = companyProfile?.emailGenerale;

            if (aziendaEmail) {
                try {
                    const data = buildTemplateData(
                        giudizio,
                        companyProfile.company?.ragioneSociale || 'Datore di lavoro',
                        clinicSettings
                    );
                    await EmailService.queue({ to: aziendaEmail, template: 'GIUDIZIO_IDONEITA_NOTIFICA', data, tenantId });
                    await prisma.giudizioIdoneita.update({
                        where: { id: giudizioId },
                        data: { dataNotificaDatoreLavoro: new Date() }
                    });
                    results.azienda = 'sent';
                    logger.info('GiudizioEmailService: azienda notificata', {
                        giudizioId, email: aziendaEmail.substring(0, 3) + '***'
                    });
                } catch (err) {
                    results.azienda = `error: ${err.message}`;
                    logger.warn('GiudizioEmailService: errore invio azienda', { giudizioId, error: err.message });
                }
            } else {
                results.azienda = 'no-email';
            }
        }

        return results;
    },

    /**
     * Invia le notifiche EOD per TUTTI i giudizi emessi oggi non ancora notificati.
     * Chiamato dal cron notturno alle 22:00.
     * @returns {{ processed: number, sent: number, skipped: number, errors: number }}
     */
    async sendDailyGiudiziNotifications() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        logger.info('GiudizioEmailService: starting EOD batch', {
            date: today.toISOString().slice(0, 10)
        });

        // Trova giudizi emessi oggi, validi, non ancora notificati al lavoratore
        const giudizi = await prisma.giudizioIdoneita.findMany({
            where: {
                deletedAt: null,
                stato: 'VALIDO',
                dataEmissione: { gte: today, lt: tomorrow },
                dataNotificaLavoratore: null
            },
            select: { id: true, tenantId: true }
        });

        const stats = { processed: giudizi.length, sent: 0, skipped: 0, errors: 0 };

        for (const g of giudizi) {
            try {
                const result = await this.sendGiudizioNotification(g.id, 'both');
                const sent = Object.values(result).filter(v => v === 'sent').length;
                if (sent > 0) {
                    stats.sent++;
                } else {
                    stats.skipped++;
                }
            } catch (err) {
                stats.errors++;
                logger.error('GiudizioEmailService: EOD batch error', {
                    giudizioId: g.id,
                    error: err.message
                });
            }
        }

        logger.info('GiudizioEmailService: EOD batch completed', stats);
        return stats;
    }
};

export default GiudizioEmailService;
