/**
 * Credentials Management Service
 * 
 * Gestisce la comunicazione delle credenziali ai nuovi utenti:
 * - Invio email con credenziali
 * - Generazione schede PDF stampabili
 * - Batch processing per import massivi
 * 
 * @module services/credentials/CredentialsService
 * @version 1.0.0
 */

import logger from '../../utils/logger.js';
import EmailService from '../emailService.js';
import CredentialsCardService from './CredentialsCardService.js';
import prisma from '../../config/prisma-optimization.js';

class CredentialsService {

    /**
     * Comunica le credenziali a un utente appena creato
     * Sceglie automaticamente il metodo migliore:
     * - Se ha email → invia email
     * - Se non ha email → prepara scheda PDF
     * 
     * @param {Object} person - Persona creata (con _temporaryPassword)
     * @param {Object} organization - Dati organizzazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Risultato con metodo usato e dati
     */
    static async communicateCredentials(person, organization, tenantId) {
        const temporaryPassword = person._temporaryPassword;

        if (!temporaryPassword) {
            logger.warn('No temporary password to communicate', {
                personId: person.id,
                hasPassword: !!person.password
            });
            return {
                success: false,
                reason: 'no_temporary_password',
                method: null
            };
        }

        const result = {
            personId: person.id,
            fullName: `${person.firstName} ${person.lastName}`,
            username: person.username,
            hasEmail: !!person.tenantProfiles?.[0]?.email,
            method: null,
            emailSent: false,
            cardGenerated: false,
            temporaryPassword // Solo per uso interno, non esporre al client senza necessità
        };

        // P48: email è in PersonTenantProfile, non in Person
        const email = person.tenantProfiles?.[0]?.email;

        // Se ha email, invia email
        if (email) {
            try {
                await EmailService.sendWelcomeCredentials(
                    { ...person, email },
                    temporaryPassword,
                    organization,
                    organization.loginUrl || process.env.FRONTEND_URL,
                    tenantId
                );
                result.method = 'email';
                result.emailSent = true;

                logger.info('Welcome email queued', {
                    personId: person.id,
                    email: email.substring(0, 3) + '***' // GDPR: maschera email
                });
            } catch (error) {
                logger.error('Failed to send welcome email', {
                    personId: person.id,
                    error: error.message
                });
                // Fallback a scheda PDF
                result.method = 'card';
                result.emailError = 'Impossibile inviare l\'email di benvenuto';
            }
        } else {
            result.method = 'card';
        }

        // Genera sempre la scheda credenziali (utile anche come backup)
        try {
            const cardData = await CredentialsCardService.prepareCredentialData(
                person,
                temporaryPassword,
                { loginUrl: organization.loginUrl || process.env.FRONTEND_URL }
            );
            result.cardData = cardData;
            result.cardGenerated = true;
        } catch (error) {
            logger.error('Failed to prepare credential card', {
                personId: person.id,
                error: error.message
            });
        }

        result.success = result.emailSent || result.cardGenerated;
        return result;
    }

    /**
     * Processa le credenziali per un batch di persone importate
     * 
     * @param {Array<Object>} importResults - Risultati import [{person, _temporaryPassword}, ...]
     * @param {Object} organization - Dati organizzazione
     * @param {string} tenantId - ID tenant
     * @param {Object} options - Opzioni (sendEmails, generateCards)
     * @returns {Promise<Object>} Risultato batch con statistiche e dati
     */
    static async processBatchCredentials(importResults, organization, tenantId, options = {}) {
        const {
            sendEmails = true,
            generateCards = true,
            autoSendToEmailUsers = true
        } = options;

        const results = {
            total: importResults.length,
            processed: 0,
            emailsSent: 0,
            emailsFailed: 0,
            cardsGenerated: 0,
            withEmail: [],
            withoutEmail: [],
            errors: []
        };

        const credentialsForCards = [];

        for (const importResult of importResults) {
            const person = importResult.person || importResult;
            const temporaryPassword = importResult._temporaryPassword || person._temporaryPassword;

            if (!person || !temporaryPassword) {
                results.errors.push({
                    personId: person?.id,
                    error: 'Missing person data or temporary password'
                });
                continue;
            }

            const email = person.tenantProfiles?.[0]?.email;

            // Prepara dati per la scheda
            if (generateCards) {
                try {
                    const cardData = await CredentialsCardService.prepareCredentialData(
                        person,
                        temporaryPassword,
                        {
                            loginUrl: organization.loginUrl || process.env.FRONTEND_URL,
                            roleName: importResult.roleType
                        }
                    );
                    credentialsForCards.push(cardData);
                    results.cardsGenerated++;
                } catch (error) {
                    results.errors.push({
                        personId: person.id,
                        error: `Card generation failed: ${error.message}`
                    });
                }
            }

            // Categorizza per email
            if (email) {
                results.withEmail.push({
                    personId: person.id,
                    fullName: `${person.firstName} ${person.lastName}`,
                    email,
                    username: person.username
                });

                // Invia email se abilitato
                if (sendEmails && autoSendToEmailUsers) {
                    try {
                        await EmailService.sendWelcomeCredentials(
                            { ...person, email },
                            temporaryPassword,
                            organization,
                            organization.loginUrl || process.env.FRONTEND_URL,
                            tenantId
                        );
                        results.emailsSent++;
                    } catch (error) {
                        results.emailsFailed++;
                        results.errors.push({
                            personId: person.id,
                            error: `Email failed: ${error.message}`
                        });
                    }
                }
            } else {
                results.withoutEmail.push({
                    personId: person.id,
                    fullName: `${person.firstName} ${person.lastName}`,
                    username: person.username
                });
            }

            results.processed++;
        }

        // Genera HTML per tutte le schede (per download PDF batch)
        if (generateCards && credentialsForCards.length > 0) {
            results.cardsHtml = CredentialsCardService.generateHTML(credentialsForCards, {
                organizationName: organization.name || organization.ragioneSociale,
                loginUrl: organization.loginUrl || process.env.FRONTEND_URL
            });
            results.cardCredentials = credentialsForCards;
        }

        // Statistiche finali
        results.summary = {
            total: results.total,
            withEmail: results.withEmail.length,
            withoutEmail: results.withoutEmail.length,
            emailsSent: results.emailsSent,
            emailsFailed: results.emailsFailed,
            cardsGenerated: results.cardsGenerated,
            errorsCount: results.errors.length,
            // Chi ha bisogno di scheda stampata (no email)
            printRequired: results.withoutEmail.length
        };

        logger.info('Batch credentials processed', {
            tenantId,
            ...results.summary
        });

        return results;
    }

    /**
     * Rigenera password per un utente e comunica le nuove credenziali
     * 
     * @param {string} personId - ID persona
     * @param {Object} organization - Dati organizzazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Risultato con nuove credenziali
     */
    static async resetAndCommunicateCredentials(personId, organization, tenantId) {
        const bcrypt = await import('bcrypt');
        const crypto = await import('crypto');

        // Genera nuova password temporanea
        const temporaryPassword = `Reset_${crypto.default.randomBytes(8).toString('base64url')}!`;
        const hashedPassword = await bcrypt.default.hash(temporaryPassword, 12);

        // Aggiorna nel database
        const person = await prisma.person.update({
            where: { id: personId },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
                failedAttempts: 0,
                lockedUntil: null
            },
            include: {
                tenantProfiles: {
                    where: { tenantId },
                    take: 1
                }
            }
        });

        // Comunica le nuove credenziali
        const result = await this.communicateCredentials(
            { ...person, _temporaryPassword: temporaryPassword },
            organization,
            tenantId
        );

        return {
            ...result,
            personId,
            passwordReset: true
        };
    }

    /**
     * Genera scheda credenziali per una persona esistente
     * (utile se l'utente ha perso la scheda iniziale)
     * 
     * @param {string} personId - ID persona
     * @param {Object} organization - Dati organizzazione
     * @param {string} tenantId - ID tenant
     * @returns {Promise<Object>} Nuova scheda credenziali
     */
    static async regenerateCredentialCard(personId, organization, tenantId) {
        // Questa funzione genera una NUOVA password e la comunica
        return this.resetAndCommunicateCredentials(personId, organization, tenantId);
    }
}

export default CredentialsService;
