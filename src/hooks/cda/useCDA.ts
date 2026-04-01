/**
 * P65 Fase 4 - useCDA Hook
 * 
 * React Query hooks per gestione documenti CDA
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import {
    getCDAConfig,
    generateCDAFromReferto,
    generateCDAFromGiudizio,
    getCDADocument,
    validateCDA,
    getPatientCDADocuments,
    getHL7Mapping,
    type CDASourceType,
    type CDADocument,
    type CDAGenerationResult,
    type CDAValidationResult,
    type CDAConfig,
    type HL7Mapping
} from '@/services/cda-api';

// ============================================
// QUERY KEYS
// ============================================

export const cdaKeys = {
    all: ['cda'] as const,
    config: () => [...cdaKeys.all, 'config'] as const,
    document: (sourceType: CDASourceType, sourceId: string) =>
        [...cdaKeys.all, 'document', sourceType, sourceId] as const,
    patientDocuments: (pazienteId: string) =>
        [...cdaKeys.all, 'patient', pazienteId] as const,
    mapping: (entityType: string, fieldPath: string) =>
        [...cdaKeys.all, 'mapping', entityType, fieldPath] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Hook per configurazione CDA
 */
export function useCDAConfig() {
    return useQuery<CDAConfig, Error>({
        queryKey: cdaKeys.config(),
        queryFn: getCDAConfig,
        staleTime: 1000 * 60 * 60, // 1 ora - config è stabile
    });
}

/**
 * Hook per documento CDA singolo
 */
export function useCDADocument(sourceType: CDASourceType, sourceId: string, enabled = true) {
    return useQuery<CDADocument | null, Error>({
        queryKey: cdaKeys.document(sourceType, sourceId),
        queryFn: () => getCDADocument(sourceType, sourceId),
        enabled: enabled && !!sourceType && !!sourceId,
    });
}

/**
 * Hook per lista documenti CDA paziente
 */
export function usePatientCDADocuments(pazienteId: string, enabled = true) {
    return useQuery<CDADocument[], Error>({
        queryKey: cdaKeys.patientDocuments(pazienteId),
        queryFn: () => getPatientCDADocuments(pazienteId),
        enabled: enabled && !!pazienteId,
    });
}

/**
 * Hook per mapping HL7
 */
export function useHL7Mapping(entityType: string, fieldPath: string, enabled = true) {
    return useQuery<HL7Mapping | null, Error>({
        queryKey: cdaKeys.mapping(entityType, fieldPath),
        queryFn: () => getHL7Mapping(entityType, fieldPath),
        enabled: enabled && !!entityType && !!fieldPath,
    });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook per generare CDA da referto
 */
export function useGenerateCDAFromReferto() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation<CDAGenerationResult, Error, string>({
        mutationFn: generateCDAFromReferto,
        onSuccess: (_data, refertoId) => {
            queryClient.invalidateQueries({ queryKey: cdaKeys.document('REFERTO', refertoId) });
            showToast({
                title: 'CDA Generato',
                message: 'Documento CDA generato con successo',
                type: 'success'
            });
        },
        onError: (error) => {
            showToast({
                title: 'Errore',
                message: 'Errore nella generazione CDA',
                type: 'error'
            });
        }
    });
}

/**
 * Hook per generare CDA da giudizio idoneità
 */
export function useGenerateCDAFromGiudizio() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation<CDAGenerationResult, Error, string>({
        mutationFn: generateCDAFromGiudizio,
        onSuccess: (_data, giudizioId) => {
            queryClient.invalidateQueries({ queryKey: cdaKeys.document('GIUDIZIO_IDONEITA', giudizioId) });
            showToast({
                title: 'CDA Generato',
                message: 'Documento CDA giudizio idoneità generato con successo',
                type: 'success'
            });
        },
        onError: (error) => {
            showToast({
                title: 'Errore',
                message: 'Errore nella generazione CDA',
                type: 'error'
            });
        }
    });
}

/**
 * Hook per validare CDA
 */
export function useValidateCDA() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation<CDAValidationResult, Error, string>({
        mutationFn: validateCDA,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: cdaKeys.all });

            if (data.valid) {
                showToast({
                    title: 'Validazione OK',
                    message: 'Il documento CDA è valido',
                    type: 'success'
                });
            } else {
                showToast({
                    title: 'Validazione Fallita',
                    message: `${data.errors.length} errori trovati`,
                    type: 'error'
                });
            }
        },
        onError: (error) => {
            showToast({
                title: 'Errore',
                message: 'Errore nella validazione',
                type: 'error'
            });
        }
    });
}

// ============================================
// COMBINED HOOK
// ============================================

/**
 * Hook combinato per funzionalità CDA
 */
export function useCDA(options?: {
    pazienteId?: string;
    sourceType?: CDASourceType;
    sourceId?: string;
}) {
    const config = useCDAConfig();
    const document = useCDADocument(
        options?.sourceType || 'REFERTO',
        options?.sourceId || '',
        !!options?.sourceType && !!options?.sourceId
    );
    const patientDocuments = usePatientCDADocuments(
        options?.pazienteId || '',
        !!options?.pazienteId
    );

    const generateFromReferto = useGenerateCDAFromReferto();
    const generateFromGiudizio = useGenerateCDAFromGiudizio();
    const validate = useValidateCDA();

    return {
        // Queries
        config,
        document,
        patientDocuments,

        // Mutations
        generateFromReferto,
        generateFromGiudizio,
        validate,

        // Loading states
        isLoading: config.isLoading || document.isLoading || patientDocuments.isLoading,
        isGenerating: generateFromReferto.isPending || generateFromGiudizio.isPending,
        isValidating: validate.isPending
    };
}

export default useCDA;
