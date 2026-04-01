/**
 * Access Control Utility
 * Verifica se un utente può accedere a una risorsa in base alle regole di accessControl.
 *
 * Struttura accessControl (Json?):
 * {
 *   allowedPersonIds?: string[]       // solo queste persone possono accedere
 *   denyPersonIds?: string[]          // queste persone non possono accedere
 *   allowedRoleTypes?: string[]       // solo questi roleType possono accedere
 *   allowedSpecialties?: string[]     // solo medici con queste specialità possono accedere
 * }
 *
 * Regole:
 * 1. Se accessControl è null/undefined → accesso consentito
 * 2. SUPER_ADMIN e ADMIN hanno sempre accesso
 * 3. Se denyPersonIds include req.person.id → accesso negato
 * 4. Se allowedPersonIds è definito → la persona deve essere nell'elenco
 * 5. Se allowedRoleTypes è definito → la persona deve avere almeno uno dei ruoli
 * 6. Se allowedSpecialties è definito → la persona deve avere almeno una delle specialità
 *    (richiede query DB per leggere PersonTenantProfile.specialties)
 *
 * @module utils/accessControl
 * @version 1.0.0 - R21
 */

import prisma from '../config/prisma-optimization.js';
import logger from './logger.js';

/**
 * Verifica accesso a una risorsa con accessControl.
 *
 * @param {Object|null} accessControl  - Campo accessControl della risorsa (può essere null)
 * @param {Object}      person         - req.person (da middleware auth)
 * @param {Object}      [opts]
 * @param {boolean}     [opts.loadSpecialties=true] - Se fare query DB per le specialità
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
export async function checkAccessControl(accessControl, person, { loadSpecialties = true } = {}) {
    // Nessuna restrizione configurata → libero accesso
    if (!accessControl || typeof accessControl !== 'object') {
        return { allowed: true };
    }

    const { allowedPersonIds, denyPersonIds, allowedRoleTypes, allowedSpecialties } = accessControl;

    // SUPER_ADMIN e ADMIN hanno sempre accesso
    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (person.roles?.some(r => adminRoles.includes(r))) {
        return { allowed: true };
    }

    // Nega esplicitamente
    if (denyPersonIds?.length && denyPersonIds.includes(person.id)) {
        return { allowed: false, reason: 'Accesso negato per questo utente' };
    }

    // allowedPersonIds: la persona deve essere nell'elenco
    if (allowedPersonIds?.length) {
        if (!allowedPersonIds.includes(person.id)) {
            return { allowed: false, reason: 'Accesso riservato a specifici operatori' };
        }
        return { allowed: true }; // già incluso → ok
    }

    // allowedRoleTypes: almeno uno dei ruoli
    if (allowedRoleTypes?.length) {
        const hasRole = person.roles?.some(r => allowedRoleTypes.includes(r));
        if (!hasRole) {
            return { allowed: false, reason: `Accesso riservato ai ruoli: ${allowedRoleTypes.join(', ')}` };
        }
    }

    // allowedSpecialties: verifica specialità via DB (PersonTenantProfile.specialties)
    if (allowedSpecialties?.length) {
        let userSpecialties = [];

        if (loadSpecialties) {
            try {
                const profile = await prisma.personTenantProfile.findFirst({
                    where: {
                        personId: person.id,
                        tenantId: person.tenantId,
                        deletedAt: null,
                        isActive: true,
                    },
                    select: { specialties: true }
                });
                userSpecialties = profile?.specialties ?? [];
            } catch (err) {
                logger.warn('accessControl: impossibile caricare specialità', { personId: person.id, err: err.message });
                // in caso di errore DB, nega l'accesso per sicurezza
                return { allowed: false, reason: 'Impossibile verificare le specialità del medico' };
            }
        }

        const hasSpecialty = userSpecialties.some(s => allowedSpecialties.includes(s));
        if (!hasSpecialty) {
            return {
                allowed: false,
                reason: `Accesso limitato alle specialità: ${allowedSpecialties.join(', ')}`
            };
        }
    }

    return { allowed: true };
}

/**
 * Versione sincrona senza check specialità (usa solo i dati già in req.person).
 * Utile per check veloci quando le specialità non sono rilevanti.
 *
 * @param {Object|null} accessControl
 * @param {Object}      person
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkAccessControlSync(accessControl, person) {
    if (!accessControl || typeof accessControl !== 'object') return { allowed: true };

    const { allowedPersonIds, denyPersonIds, allowedRoleTypes } = accessControl;

    const adminRoles = ['SUPER_ADMIN', 'ADMIN'];
    if (person.roles?.some(r => adminRoles.includes(r))) return { allowed: true };

    if (denyPersonIds?.length && denyPersonIds.includes(person.id)) {
        return { allowed: false, reason: 'Accesso negato per questo utente' };
    }

    if (allowedPersonIds?.length && !allowedPersonIds.includes(person.id)) {
        return { allowed: false, reason: 'Accesso riservato a specifici operatori' };
    }

    if (allowedRoleTypes?.length) {
        const hasRole = person.roles?.some(r => allowedRoleTypes.includes(r));
        if (!hasRole) {
            return { allowed: false, reason: `Accesso riservato ai ruoli: ${allowedRoleTypes.join(', ')}` };
        }
    }

    return { allowed: true };
}
