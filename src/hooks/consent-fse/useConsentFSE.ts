/**
 * P65 - useConsentFSE Hook
 * 
 * Hook React per gestione consensi FSE con React Query.
 * Supporta:
 * - Caricamento tipi consenso
 * - CRUD consensi paziente
 * - Gestione oscuramento dati
 * 
 * @module hooks/consent-fse
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import consentFSEApi, {
    type ConsentFSETypes,
    type PersonConsentsResponse,
    type ObscurationStatus,
    type UpsertConsentRequest,
    type BatchConsentsResponse
} from '@/services/consent-fse-api';

/**
 * Query keys per cache management
 */
export const consentFSEKeys = {
    all: ['consent-fse'] as const,
    types: () => [...consentFSEKeys.all, 'types'] as const,
    person: (personId: string) => [...consentFSEKeys.all, 'person', personId] as const,
    obscuration: (personId: string) => [...consentFSEKeys.all, 'obscuration', personId] as const
};

/**
 * Hook per ottenere i tipi di consenso disponibili
 */
export function useConsentTypes() {
    return useQuery<ConsentFSETypes>({
        queryKey: consentFSEKeys.types(),
        queryFn: () => consentFSEApi.getTypes(),
        staleTime: 1000 * 60 * 60, // 1 ora - i tipi non cambiano frequentemente
    });
}

/**
 * Hook per ottenere i consensi di un paziente
 */
export function usePersonConsents(personId: string, enabled = true) {
    return useQuery<PersonConsentsResponse>({
        queryKey: consentFSEKeys.person(personId),
        queryFn: () => consentFSEApi.getPersonConsents(personId),
        enabled: !!personId && enabled,
    });
}

/**
 * Hook per ottenere lo stato di oscuramento di un paziente
 */
export function useObscurationStatus(personId: string, enabled = true) {
    return useQuery<ObscurationStatus>({
        queryKey: consentFSEKeys.obscuration(personId),
        queryFn: () => consentFSEApi.getObscurationStatus(personId),
        enabled: !!personId && enabled,
    });
}

/**
 * Hook per creare/aggiornare un consenso
 */
export function useUpsertConsent(personId: string) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (data: UpsertConsentRequest) => consentFSEApi.upsertConsent(personId, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: consentFSEKeys.person(personId) });
            showToast({
                type: 'success',
                message: `Consenso ${data.consentGiven ? 'registrato' : 'revocato'} con successo`
            });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore'
            });
        }
    });
}

/**
 * Hook per registrare consensi multipli in batch
 */
export function useBatchUpsertConsents(personId: string) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation<BatchConsentsResponse, Error, UpsertConsentRequest[]>({
        mutationFn: (consents) => consentFSEApi.batchUpsertConsents(personId, { consents }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: consentFSEKeys.person(personId) });
            showToast({
                type: data.failed > 0 ? 'warning' : 'success',
                message: `${data.successful} consensi registrati${data.failed > 0 ? `, ${data.failed} errori` : ''}`
            });
        },
        onError: (error) => {
            showToast({
                type: 'error',
                message: 'Errore batch consensi'
            });
        }
    });
}

/**
 * Hook per revocare un consenso
 */
export function useRevokeConsent(personId: string) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: ({ consentId, reason }: { consentId: string; reason: string }) =>
            consentFSEApi.revokeConsent(consentId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: consentFSEKeys.person(personId) });
            showToast({
                type: 'success',
                message: 'Consenso revocato con successo'
            });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore revoca'
            });
        }
    });
}

/**
 * Hook per impostare oscuramento dati
 */
export function useSetObscuration(personId: string) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (tipiDatiOscurati: string[]) =>
            consentFSEApi.setObscuration(personId, tipiDatiOscurati),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: consentFSEKeys.obscuration(personId) });
            queryClient.invalidateQueries({ queryKey: consentFSEKeys.person(personId) });
            showToast({
                type: 'success',
                message: data.oscuramentoAttivo
                    ? `Oscuramento attivato per ${data.tipiDatiOscurati.length} tipi di dati`
                    : 'Oscuramento disattivato'
            });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore impostazione oscuramento'
            });
        }
    });
}

/**
 * Hook per eliminare tutti i consensi di un paziente
 */
export function useDeletePersonConsents(personId: string) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    return useMutation({
        mutationFn: (reason: string) => consentFSEApi.deletePersonConsents(personId, reason),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: consentFSEKeys.person(personId) });
            queryClient.invalidateQueries({ queryKey: consentFSEKeys.obscuration(personId) });
            showToast({
                type: 'success',
                message: `${data.deletedCount} consensi eliminati`
            });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore eliminazione'
            });
        }
    });
}

/**
 * Hook combinato per gestione completa consensi FSE paziente
 */
export function useConsentFSE(personId: string) {
    const types = useConsentTypes();
    const consents = usePersonConsents(personId);
    const obscuration = useObscurationStatus(personId);
    const upsertMutation = useUpsertConsent(personId);
    const batchMutation = useBatchUpsertConsents(personId);
    const revokeMutation = useRevokeConsent(personId);
    const obscurationMutation = useSetObscuration(personId);

    return {
        // Dati
        types: types.data,
        consents: consents.data,
        obscuration: obscuration.data,

        // Stati loading
        isLoading: types.isLoading || consents.isLoading,
        isLoadingTypes: types.isLoading,
        isLoadingConsents: consents.isLoading,
        isLoadingObscuration: obscuration.isLoading,

        // Errori
        error: types.error || consents.error,

        // Mutations
        upsertConsent: upsertMutation.mutate,
        batchUpsertConsents: batchMutation.mutate,
        revokeConsent: revokeMutation.mutate,
        setObscuration: obscurationMutation.mutate,

        // Stati mutation
        isUpdating: upsertMutation.isPending || batchMutation.isPending,
        isRevoking: revokeMutation.isPending,
        isSettingObscuration: obscurationMutation.isPending,

        // Refresh
        refetch: () => {
            consents.refetch();
            obscuration.refetch();
        }
    };
}

export default useConsentFSE;
