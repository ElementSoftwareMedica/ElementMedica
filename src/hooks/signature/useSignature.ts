/**
 * P65 - useSignature Hook
 * 
 * React hook per gestione firme digitali.
 * Integra con FirmaDigitaleService backend.
 * 
 * @module hooks/signature/useSignature
 */

import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../useToast';
import { apiGet, apiPost, apiPut } from '../../services/api';
import type { SignatureData, SignatureResult } from '../../components/signature';

// ============================================
// TYPES
// ============================================

export type TipoFirma = 'SEMPLICE' | 'GRAFOMETRICA' | 'FEQ' | 'FEA' | 'REMOTA';
export type TipoDocumento = 'REFERTO' | 'CONSENSO' | 'QUESTIONARIO' | 'CERTIFICATO' | 'GIUDIZIO_IDONEITA' | 'ALLEGATO_3B' | 'ALTRO';
export type TipoFirmatario = 'MEDICO' | 'PAZIENTE' | 'OPERATORE' | 'RAPPRESENTANTE_LEGALE';
export type StatoFirma = 'IN_ATTESA' | 'FIRMATO' | 'RIFIUTATO' | 'SCADUTO' | 'VERIFICATO' | 'ANNULLATO';

export interface FirmaDigitale {
    id: string;
    refertoId?: string;
    documentoId?: string;
    documentType: TipoDocumento;
    firmatarioId: string;
    firmatarioRole: TipoFirmatario;
    stato: StatoFirma;
    tipoFirma: TipoFirma;
    hashDocumento: string;
    hashFirma?: string;
    firmaImageUrl?: string;
    validatoDa?: string;
    validatoAt?: string;
    motivoRifiuto?: string;
    tenantId: string;
    createdAt: string;
    updatedAt: string;
    firmatario?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface CreateSignatureRequestInput {
    documentType: TipoDocumento;
    refertoId?: string;
    documentoId?: string;
    firmatarioId: string;
    firmatarioRole: TipoFirmatario;
    tipoFirma: TipoFirma;
    documentContent: string;
}

export interface ApplySignatureInput {
    firmaId: string;
    signatureData: SignatureData;
    consent: {
        gdprAccepted: boolean;
        dataProcessingAccepted: boolean;
        timestamp: Date;
    };
}

export interface VerifySignatureResult {
    valid: boolean;
    firma?: FirmaDigitale;
    verification?: {
        documentIntegrity: boolean;
        hashMatch: boolean;
        isExpired: boolean;
        hasVault: boolean;
    };
    error?: string;
}

export interface SavedSignatureInfo {
    firmaId: string;
    imageUrl: string;
    tipo: TipoFirma;
    lastUsed: string;
}

// ============================================
// API FUNCTIONS
// ============================================

const signatureApi = {
    /**
     * Crea richiesta firma
     */
    createRequest: async (data: CreateSignatureRequestInput): Promise<FirmaDigitale> => {
        const response = await apiPost<FirmaDigitale>('/api/v1/signatures/request', data);
        return response;
    },

    /**
     * Applica firma semplice
     */
    applySimpleSignature: async (firmaId: string, signerId: string): Promise<FirmaDigitale> => {
        const response = await apiPost<FirmaDigitale>(`/api/v1/signatures/${firmaId}/sign-simple`, {
            signerId
        });
        return response;
    },

    /**
     * Applica firma grafometrica
     */
    applyGraphometricSignature: async (
        firmaId: string,
        signerId: string,
        signatureData: SignatureData
    ): Promise<FirmaDigitale> => {
        const response = await apiPost<FirmaDigitale>(`/api/v1/signatures/${firmaId}/sign-graphometric`, {
            signerId,
            firmaImageBase64: signatureData.imageBase64,
            biometricData: signatureData.biometricData,
            dispositivo: navigator.userAgent.includes('iPad') || navigator.userAgent.includes('Tablet')
                ? 'TABLET'
                : 'DESKTOP'
        });
        return response;
    },

    /**
     * Verifica firma
     */
    verify: async (firmaId: string, documentContent: string): Promise<VerifySignatureResult> => {
        const response = await apiPost<VerifySignatureResult>(`/api/v1/signatures/${firmaId}/verify`, {
            documentContent
        });
        return response;
    },

    /**
     * Ottieni firma salvata per riutilizzo
     */
    getSavedSignature: async (firmatarioId: string): Promise<SavedSignatureInfo | null> => {
        try {
            const response = await apiGet<SavedSignatureInfo>(`/api/v1/signatures/saved/${firmatarioId}`);
            return response;
        } catch {
            return null;
        }
    },

    /**
     * Lista firme per documento
     */
    getByDocument: async (params: {
        refertoId?: string;
        documentoId?: string;
        stato?: StatoFirma;
    }): Promise<FirmaDigitale[]> => {
        const queryParams = new URLSearchParams();
        if (params.refertoId) queryParams.append('refertoId', params.refertoId);
        if (params.documentoId) queryParams.append('documentoId', params.documentoId);
        if (params.stato) queryParams.append('stato', params.stato);

        const response = await apiGet<FirmaDigitale[]>(`/api/v1/signatures?${queryParams}`);
        return response;
    },

    /**
     * Annulla firma
     */
    cancel: async (firmaId: string, motivoAnnullamento: string): Promise<FirmaDigitale> => {
        const response = await apiPost<FirmaDigitale>(`/api/v1/signatures/${firmaId}/cancel`, {
            motivoAnnullamento
        });
        return response;
    }
};

// ============================================
// HOOK
// ============================================

export interface UseSignatureOptions {
    /** Tipo firma default */
    defaultType?: TipoFirma;
    /** Auto-fetch firma salvata */
    autoFetchSaved?: boolean;
    /** Firmatario ID per fetch firma salvata */
    firmatarioId?: string;
}

export interface UseSignatureReturn {
    /** Crea richiesta firma */
    createRequest: (data: CreateSignatureRequestInput) => Promise<FirmaDigitale>;
    /** Applica firma */
    applySignature: (input: ApplySignatureInput) => Promise<FirmaDigitale>;
    /** Verifica firma */
    verifySignature: (firmaId: string, documentContent: string) => Promise<VerifySignatureResult>;
    /** Annulla firma */
    cancelSignature: (firmaId: string, motivo: string) => Promise<FirmaDigitale>;
    /** Firma salvata */
    savedSignature: SavedSignatureInfo | null;
    /** Caricamento firma salvata */
    loadingSavedSignature: boolean;
    /** Mutations loading state */
    isCreating: boolean;
    isSigning: boolean;
    isVerifying: boolean;
    isCancelling: boolean;
}

export function useSignature(options: UseSignatureOptions = {}): UseSignatureReturn {
    const {
        defaultType = 'GRAFOMETRICA',
        autoFetchSaved = true,
        firmatarioId
    } = options;

    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // ============================================
    // QUERIES
    // ============================================

    /**
     * Fetch firma salvata
     */
    const { data: savedSignature, isLoading: loadingSavedSignature } = useQuery({
        queryKey: ['savedSignature', firmatarioId],
        queryFn: () => signatureApi.getSavedSignature(firmatarioId!),
        enabled: autoFetchSaved && !!firmatarioId
    });

    // ============================================
    // MUTATIONS
    // ============================================

    /**
     * Crea richiesta firma
     */
    const createRequestMutation = useMutation({
        mutationFn: signatureApi.createRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['signatures'] });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                title: 'Errore creazione firma',
                message: 'Errore del server'
            });
        }
    });

    /**
     * Applica firma semplice
     */
    const applySimpleMutation = useMutation({
        mutationFn: ({ firmaId, signerId }: { firmaId: string; signerId: string }) =>
            signatureApi.applySimpleSignature(firmaId, signerId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['signatures'] });
            showToast({
                type: 'success',
                title: 'Documento firmato',
                message: 'La firma è stata applicata con successo'
            });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                title: 'Errore firma',
                message: 'Errore del server'
            });
        }
    });

    /**
     * Applica firma grafometrica
     */
    const applyGraphometricMutation = useMutation({
        mutationFn: ({ firmaId, signerId, signatureData }: {
            firmaId: string;
            signerId: string;
            signatureData: SignatureData;
        }) => signatureApi.applyGraphometricSignature(firmaId, signerId, signatureData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['signatures'] });
            queryClient.invalidateQueries({ queryKey: ['savedSignature'] });
            showToast({
                type: 'success',
                title: 'Documento firmato',
                message: 'La firma grafometrica è stata applicata con successo'
            });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                title: 'Errore firma',
                message: 'Errore del server'
            });
        }
    });

    /**
     * Verifica firma
     */
    const verifyMutation = useMutation({
        mutationFn: ({ firmaId, documentContent }: { firmaId: string; documentContent: string }) =>
            signatureApi.verify(firmaId, documentContent)
    });

    /**
     * Annulla firma
     */
    const cancelMutation = useMutation({
        mutationFn: ({ firmaId, motivo }: { firmaId: string; motivo: string }) =>
            signatureApi.cancel(firmaId, motivo),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['signatures'] });
            showToast({
                type: 'success',
                title: 'Firma annullata',
                message: 'La firma è stata annullata'
            });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                title: 'Errore annullamento',
                message: 'Errore del server'
            });
        }
    });

    // ============================================
    // HANDLERS
    // ============================================

    /**
     * Crea richiesta firma
     */
    const createRequest = useCallback(async (data: CreateSignatureRequestInput) => {
        return createRequestMutation.mutateAsync(data);
    }, [createRequestMutation]);

    /**
     * Applica firma (semplice o grafometrica)
     */
    const applySignature = useCallback(async (input: ApplySignatureInput) => {
        const { firmaId, signatureData, consent } = input;

        // Log consent per audit trail

        // Determina tipo firma da signatureData
        const hasImage = signatureData.imageBase64 && !signatureData.isEmpty;

        if (hasImage) {
            // Firma grafometrica
            return applyGraphometricMutation.mutateAsync({
                firmaId,
                signerId: '', // Will be set from backend context
                signatureData
            });
        } else {
            // Firma semplice
            return applySimpleMutation.mutateAsync({
                firmaId,
                signerId: '' // Will be set from backend context
            });
        }
    }, [applyGraphometricMutation, applySimpleMutation]);

    /**
     * Verifica firma
     */
    const verifySignature = useCallback(async (firmaId: string, documentContent: string) => {
        return verifyMutation.mutateAsync({ firmaId, documentContent });
    }, [verifyMutation]);

    /**
     * Annulla firma
     */
    const cancelSignature = useCallback(async (firmaId: string, motivo: string) => {
        return cancelMutation.mutateAsync({ firmaId, motivo });
    }, [cancelMutation]);

    // ============================================
    // RETURN
    // ============================================

    return {
        createRequest,
        applySignature,
        verifySignature,
        cancelSignature,
        savedSignature: savedSignature ?? null,
        loadingSavedSignature,
        isCreating: createRequestMutation.isPending,
        isSigning: applySimpleMutation.isPending || applyGraphometricMutation.isPending,
        isVerifying: verifyMutation.isPending,
        isCancelling: cancelMutation.isPending
    };
}

// ============================================
// P65: SIGNATURE PREFERENCES HOOK
// ============================================

export interface SignatureTypeInfo {
    type: TipoFirma;
    enabled: boolean;
    feature: string | null;
    tier: string | null;
    reason?: string | null;
}

export interface SignaturePreferences {
    preferredType: TipoFirma;
    availableTypes: SignatureTypeInfo[];
}

const signaturePreferencesApi = {
    /**
     * Ottieni tipi firma disponibili per il tenant
     */
    getAvailableTypes: async (): Promise<SignatureTypeInfo[]> => {
        const response = await apiGet<{ success: boolean; data: SignatureTypeInfo[] }>('/api/v1/signatures/types/available');
        return response.data;
    },

    /**
     * Verifica se un tipo firma è abilitato
     */
    checkType: async (tipoFirma: TipoFirma): Promise<{ enabled: boolean; feature: string | null; reason: string }> => {
        const response = await apiPost<{ success: boolean; data: { enabled: boolean; feature: string | null; reason: string } }>(
            '/api/v1/signatures/types/check',
            { tipoFirma }
        );
        return response.data;
    },

    /**
     * Ottieni preferenze firma del medico corrente
     */
    getMyPreferences: async (): Promise<SignaturePreferences> => {
        const response = await apiGet<{ success: boolean; data: SignaturePreferences }>('/api/v1/signatures/preferences/me');
        return response.data;
    },

    /**
     * Aggiorna preferenze firma del medico corrente
     */
    updateMyPreferences: async (tipoFirma: TipoFirma): Promise<SignaturePreferences> => {
        const response = await apiPut<{ success: boolean; data: SignaturePreferences }>(
            '/api/v1/signatures/preferences/me',
            { tipoFirma }
        );
        return response.data;
    }
};

/**
 * Hook per gestione preferenze tipo firma
 */
export function useSignaturePreferences() {
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    // Query preferenze
    const {
        data: preferences,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['signature-preferences'],
        queryFn: signaturePreferencesApi.getMyPreferences,
        staleTime: 5 * 60 * 1000, // 5 minuti
        retry: 1
    });

    // Query tipi disponibili (più frequente aggiornamento)
    const {
        data: availableTypes,
        isLoading: loadingTypes
    } = useQuery({
        queryKey: ['signature-types-available'],
        queryFn: signaturePreferencesApi.getAvailableTypes,
        staleTime: 60 * 1000 // 1 minuto
    });

    // Mutation aggiornamento preferenza
    const updatePreferenceMutation = useMutation({
        mutationFn: signaturePreferencesApi.updateMyPreferences,
        onSuccess: (data) => {
            queryClient.setQueryData(['signature-preferences'], data);
            showToast({
                type: 'success',
                message: 'Preferenza firma aggiornata con successo'
            });
        },
        onError: (error: Error) => {
            showToast({
                type: 'error',
                message: 'Errore del server'.includes('not enabled')
                    ? 'Questo tipo di firma non è disponibile per il tuo piano. Contatta l\'assistenza per l\'upgrade.'
                    : 'Errore'
            });
        }
    });

    // Mutation verifica tipo
    const checkTypeMutation = useMutation({
        mutationFn: signaturePreferencesApi.checkType
    });

    const updatePreference = useCallback(async (tipoFirma: TipoFirma) => {
        return updatePreferenceMutation.mutateAsync(tipoFirma);
    }, [updatePreferenceMutation]);

    const checkTypeAvailability = useCallback(async (tipoFirma: TipoFirma) => {
        return checkTypeMutation.mutateAsync(tipoFirma);
    }, [checkTypeMutation]);

    return {
        /** Preferenze correnti */
        preferences,
        /** Tipi firma disponibili per il tenant */
        availableTypes: availableTypes ?? preferences?.availableTypes ?? [],
        /** Tipo preferito corrente */
        preferredType: preferences?.preferredType ?? 'SEMPLICE',
        /** Aggiorna preferenza */
        updatePreference,
        /** Verifica disponibilità tipo */
        checkTypeAvailability,
        /** Stato loading */
        isLoading: isLoading || loadingTypes,
        /** Stato updating */
        isUpdating: updatePreferenceMutation.isPending,
        /** Errore */
        error,
        /** Refresh */
        refetch
    };
}

export default useSignature;
