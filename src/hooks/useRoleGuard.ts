/**
 * useRoleGuard — Logica centralizzata di accesso per ruolo
 *
 * Fornisce flag booleani per ogni livello di accesso usati da layout e route:
 *
 * - isTrainerOnly:        ha solo ruoli TRAINER (senza admin/clinica) → Sicurezza & Formazione
 * - isPazienteOnly:       ha solo ruolo PAZIENTE (senza trainer/clinica/admin) → cartella propria
 * - isTrainerWithPaziente: ha sia TRAINER che PAZIENTE → Sicurezza + cartella propria
 * - isMedico:             ha MEDICO (base o medico competente), senza super-admin → Poliambulatorio filtrato
 * - isMedicoCompetente:   ha MEDICO_COMPETENTE → MEDICO + MDL + aziende/dipendenti nominato
 * - isElevated:           ha almeno un ruolo amministrativo/gestionale → accesso pieno
 */
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// Ruoli che danno accesso alla sezione di formazione/sicurezza
export const TRAINER_ROLE_TYPES = [
    'TRAINER', 'SENIOR_TRAINER', 'EXTERNAL_TRAINER', 'TRAINER_COORDINATOR',
] as const;

// Ruoli che danno accesso completo (admin / gestione)
export const ADMIN_ROLE_TYPES = [
    'ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'COMPANY_ADMIN',
    'TRAINING_ADMIN', 'HR_MANAGER', 'COMPANY_MANAGER', 'SITE_MANAGER',
    'MANAGER',
] as const;

// Ruoli del personale clinico (Poliambulatorio)
export const CLINICAL_STAFF_ROLE_TYPES = [
    'MEDICO', 'MEDICO_COMPETENTE', 'INFERMIERE', 'SEGRETERIA_CLINICA',
] as const;

export interface RoleGuard {
    /** Tutti i ruoli dell'utente */
    roles: string[];

    // --- Flags singoli ruolo ---
    /** Solo ruoli TRAINER senza overlay admin o clinici */
    isTrainerOnly: boolean;
    /** Solo ruolo PAZIENTE, senza nessun altro ruolo rilevante */
    isPazienteOnly: boolean;
    /** Ha sia TRAINER che PAZIENTE (senza admin) → doppio accesso */
    isTrainerWithPaziente: boolean;
    /** Ha MEDICO o MEDICO_COMPETENTE senza super-admin */
    isMedico: boolean;
    /** Ha specificamente MEDICO_COMPETENTE (senza super-admin): MEDICO + accesso MDL */
    isMedicoCompetente: boolean;
    /** Ha almeno un ruolo elevato (admin / gestione) */
    isElevated: boolean;

    // --- Flag di presenza ---
    hasTrainer: boolean;
    hasPaziente: boolean;
    hasMedico: boolean;
    hasAdmin: boolean;
    hasMedicoCompetente: boolean;
}

export const useRoleGuard = (): RoleGuard => {
    const { user } = useAuth();
    const roles: string[] = (user?.roles as string[]) || [];

    return useMemo((): RoleGuard => {
        const hasAdmin = ADMIN_ROLE_TYPES.some(r => roles.includes(r));
        const hasTrainer = TRAINER_ROLE_TYPES.some(r => roles.includes(r));
        const hasClinicalStaff = CLINICAL_STAFF_ROLE_TYPES.some(r => roles.includes(r));
        const hasMedico = roles.includes('MEDICO') || roles.includes('MEDICO_COMPETENTE');
        const hasMedicoCompetente = roles.includes('MEDICO_COMPETENTE');
        const hasPaziente = roles.includes('PAZIENTE');

        // Solo TRAINER — nessun admin, nessun clinico, MA può avere PAZIENTE
        const isTrainerOnly = hasTrainer && !hasAdmin && !hasClinicalStaff;

        // Solo PAZIENTE — nessun trainer, nessun clinico, nessun admin
        const isPazienteOnly = hasPaziente && !hasTrainer && !hasClinicalStaff && !hasAdmin;

        // Doppio ruolo TRAINER + PAZIENTE (senza admin)
        const isTrainerWithPaziente = hasTrainer && hasPaziente && !hasAdmin && !hasClinicalStaff;

        // MEDICO (base o medico competente) — senza super-admin
        const isMedico = hasMedico && !hasAdmin;

        // MEDICO_COMPETENTE specificamente (MEDICO + accesso MDL)
        const isMedicoCompetente = hasMedicoCompetente && !hasAdmin;

        // Elevato = qualsiasi ruolo amministrativo
        const isElevated = hasAdmin;

        return {
            roles,
            isTrainerOnly,
            isPazienteOnly,
            isTrainerWithPaziente,
            isMedico,
            isMedicoCompetente,
            isElevated,
            hasTrainer,
            hasPaziente,
            hasMedico,
            hasMedicoCompetente,
            hasAdmin,
        };
    }, [roles]);
};
