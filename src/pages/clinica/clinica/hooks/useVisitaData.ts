/**
 * useVisitaData - Hook for loading visit data
 * 
 * Manages all data fetching for the visit page:
 * - Visita (existing or new)
 * - Appuntamento
 * - Paziente
 * - Prestazione
 * - VisitTemplate (from new P52 system)
 * 
 * @module pages/clinica/clinica/hooks/useVisitaData
 * @project P52 - Clinical Visit Template System
 */

import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    visiteApi,
    appuntamentiApi,
    pazientiApi,
    prestazioniApi,
    visitTemplatesApi
} from '../../../../services/clinicaApi';
import type { VisitaContext, UseVisitaDataReturn } from '../types';

export function useVisitaData(): UseVisitaDataReturn {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    // URL params
    const appuntamentoIdFromUrl = searchParams.get('appuntamento');
    const isNew = !id || id === 'nuovo';

    // ============================================
    // QUERY: Visita esistente
    // ============================================
    const {
        data: visita,
        isLoading: loadingVisita,
        error: visitaError,
        refetch: refetchVisita
    } = useQuery({
        queryKey: ['visita', id],
        queryFn: () => visiteApi.getById(id!),
        enabled: !isNew && !!id,
        staleTime: 30000, // 30 secondi
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 404) return false;
            return failureCount < 2;
        }
    });

    // Determina l'ID appuntamento
    const appuntamentoId = useMemo(() => {
        return appuntamentoIdFromUrl || visita?.appuntamentoId || null;
    }, [appuntamentoIdFromUrl, visita?.appuntamentoId]);

    // ============================================
    // QUERY: Appuntamento
    // ============================================
    const {
        data: appuntamento,
        isLoading: loadingAppuntamento
    } = useQuery({
        queryKey: ['appuntamento', appuntamentoId],
        queryFn: () => appuntamentiApi.getById(appuntamentoId!),
        enabled: !!appuntamentoId,
        staleTime: 60000
    });

    // ============================================
    // QUERY: Paziente
    // ============================================
    const pazienteId = appuntamento?.pazienteId || visita?.pazienteId;

    const {
        data: paziente,
        isLoading: loadingPaziente
    } = useQuery({
        queryKey: ['paziente', pazienteId],
        queryFn: () => pazientiApi.getById(pazienteId!),
        enabled: !!pazienteId,
        staleTime: 60000
    });

    // ============================================
    // QUERY: Prestazione
    // ============================================
    const prestazioneId = appuntamento?.prestazioneId || visita?.prestazioneId;

    const {
        data: prestazione,
        isLoading: loadingPrestazione
    } = useQuery({
        queryKey: ['prestazione', prestazioneId],
        queryFn: () => prestazioniApi.getById(prestazioneId!),
        enabled: !!prestazioneId,
        staleTime: 60000
    });

    // ============================================
    // QUERY: VisitTemplate (P52 System)
    // ============================================
    const medicoId = appuntamento?.medicoId || visita?.medicoId;
    // bundleId may come from appuntamento relation or template context
    const bundleId: string | undefined = undefined;

    const {
        data: template,
        isLoading: loadingTemplate,
        error: templateError
    } = useQuery({
        queryKey: ['visit-template-for-visit', medicoId, prestazioneId, bundleId],
        queryFn: async () => {
            const result = await visitTemplatesApi.getForVisit({
                medicoId: medicoId!,
                prestazioneId: prestazioneId || undefined,
                bundleId: bundleId
            });
            return result;
        },
        enabled: !!medicoId,
        staleTime: 300000, // 5 minuti
        retry: 1
    });

    // ============================================
    // COMPUTED STATE
    // ============================================
    const isLoading = useMemo(() => {
        return loadingVisita || loadingAppuntamento || loadingPaziente || loadingPrestazione;
    }, [loadingVisita, loadingAppuntamento, loadingPaziente, loadingPrestazione]);

    const error = useMemo(() => {
        return visitaError || templateError || null;
    }, [visitaError, templateError]);

    // ============================================
    // CONTEXT OBJECT
    // ============================================
    const context: VisitaContext = useMemo(() => ({
        visitaId: id || null,
        appuntamentoId,
        isNew,
        visita: visita || null,
        appuntamento: appuntamento || null,
        paziente: paziente || null,
        prestazione: prestazione || null,
        template: template || null,
        isLoading,
        isLoadingTemplate: loadingTemplate,
        error: error as Error | null
    }), [
        id,
        appuntamentoId,
        isNew,
        visita,
        appuntamento,
        paziente,
        prestazione,
        template,
        isLoading,
        loadingTemplate,
        error
    ]);

    return {
        context,
        refetch: refetchVisita
    };
}
