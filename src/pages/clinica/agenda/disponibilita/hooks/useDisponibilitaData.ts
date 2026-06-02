/**
 * useDisponibilitaData - Hook per gestione dati disponibilità
 * @module pages/clinica/agenda/disponibilita/hooks/useDisponibilitaData
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import {
    disponibilitaApi,
    ferieApi,
    slotsApi,
    mediciApi,
    ambulatoriApi,
    DisponibilitaMedico,
    SlotDisponibilita,
    FerieAssenza
} from '../../../../../services/clinicaApi';
import { useTenantFilter } from '../../../../../context/TenantFilterContext';
import { useToast } from '../../../../../hooks/useToast';
import { useAuth } from '../../../../../context/AuthContext';
import { useRoleGuard } from '../../../../../hooks/useRoleGuard';
import type { MedicoWithStats, SlotForm, SingleSlotForm, FerieForm } from '../types';

export const useDisponibilitaData = () => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { getTenantFilterParams, isReady, tenantFilterKey } = useTenantFilter();
    const { user } = useAuth();
    const { isMedico, isMedicoCompetente } = useRoleGuard();
    const currentMedicoPersonId = isMedico && !isMedicoCompetente ? user?.id : undefined;

    // Build tenant params
    const getTenantParams = useCallback(() => {
        const tenantParams = getTenantFilterParams();
        return {
            ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
            ...(tenantParams.allTenants && { allTenants: 'true' })
        };
    }, [getTenantFilterParams]);

    // ==============================
    // QUERIES
    // ==============================

    // Fetch all medici
    const { data: mediciData, isLoading: loadingMedici } = useQuery({
        queryKey: ['medici-disponibilita', tenantFilterKey, currentMedicoPersonId],
        queryFn: () => mediciApi.getAll({ limit: 200, ...getTenantParams(), ...(currentMedicoPersonId && { medicoId: currentMedicoPersonId }) }),
        enabled: isReady
    });

    const visibleMedici = useMemo(() => {
        const medici = mediciData?.data || [];
        if (!currentMedicoPersonId) return medici;
        return medici.filter(m => m.id === currentMedicoPersonId || m.personId === currentMedicoPersonId);
    }, [mediciData, currentMedicoPersonId]);
    const visibleMedicoIds = useMemo(() => new Set(visibleMedici.map(m => m.id)), [visibleMedici]);
    const assertCanManageMedico = useCallback((medicoId?: string | null) => {
        if (!currentMedicoPersonId) return;
        if (!medicoId || !visibleMedicoIds.has(medicoId)) {
            throw new Error('Puoi gestire solo le tue disponibilità');
        }
    }, [currentMedicoPersonId, visibleMedicoIds]);

    // Fetch all ambulatori
    const { data: ambulatoriData, isLoading: loadingAmbulatori } = useQuery({
        queryKey: ['ambulatori-disponibilita', tenantFilterKey],
        queryFn: () => ambulatoriApi.getAll({ limit: 200, ...getTenantParams() }),
        enabled: isReady
    });

    // Fetch all disponibilità settimanali
    const { data: disponibilitaData, isLoading: loadingDisponibilita } = useQuery({
        queryKey: ['disponibilita-all', tenantFilterKey, currentMedicoPersonId],
        queryFn: () => disponibilitaApi.getAll({ limit: 1000, ...getTenantParams(), ...(currentMedicoPersonId && { medicoId: currentMedicoPersonId }) }).then(r => r.data),
        enabled: isReady
    });

    // Fetch all slots singoli
    // IMPORTANT: includePast=true per vedere TUTTI gli slot, non solo quelli liberi e futuri
    const { data: slotsData, isLoading: loadingSlots } = useQuery({
        queryKey: ['slots-all', tenantFilterKey, currentMedicoPersonId],
        queryFn: () => slotsApi.getAll({ limit: 1000, includePast: 'true', ...getTenantParams(), ...(currentMedicoPersonId && { medicoId: currentMedicoPersonId }) }),
        enabled: isReady
    });

    // Fetch all ferie
    const { data: ferieData, isLoading: loadingFerie } = useQuery({
        queryKey: ['ferie-all', tenantFilterKey, currentMedicoPersonId],
        queryFn: () => ferieApi.getAll({ limit: 1000, ...getTenantParams(), ...(currentMedicoPersonId && { medicoId: currentMedicoPersonId }) }).then(r => r.data),
        enabled: isReady
    });

    // ==============================
    // COMPUTED DATA
    // ==============================

    // Calculate medici with stats
    const mediciWithStats: MedicoWithStats[] = useMemo(() => {
        if (!visibleMedici.length) return [];

        const disponibilita = disponibilitaData || [];
        const slots = slotsData?.data || [];
        const ferie = ferieData || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return visibleMedici.map(medico => {
            // Count weekly slots
            const medicoDisponibilita = disponibilita.filter(d => d.medicoId === medico.id);

            // Calculate weekly hours
            let weeklyMinutes = 0;
            medicoDisponibilita.forEach(d => {
                const [startH, startM] = d.oraInizio.split(':').map(Number);
                const [endH, endM] = d.oraFine.split(':').map(Number);
                weeklyMinutes += (endH * 60 + endM) - (startH * 60 + startM);
            });

            // Find next slot
            const medicoSlots = slots.filter(s => s.medicoId === medico.id && new Date(s.data) >= today);
            const nextSlot = medicoSlots.sort((a, b) =>
                new Date(a.data).getTime() - new Date(b.data).getTime()
            )[0];

            // Check active vacation
            const hasActiveVacation = ferie.some(f => {
                const startDate = new Date(f.dataInizio);
                const endDate = new Date(f.dataFine);
                return f.medicoId === medico.id && startDate <= today && endDate >= today;
            });

            return {
                ...medico,
                slotsCount: medicoDisponibilita.length,
                nextSlot,
                hasActiveVacation,
                weeklyHours: Math.round(weeklyMinutes / 60 * 10) / 10,
                weeklySchedule: medicoDisponibilita
                    .map(d => ({ giorno: d.giorno, oraInizio: d.oraInizio, oraFine: d.oraFine }))
                    .sort((a, b) => (a.giorno || 7) - (b.giorno || 7) || a.oraInizio.localeCompare(b.oraInizio))
            };
        });
    }, [visibleMedici, disponibilitaData, slotsData, ferieData]);

    // Get disponibilità by medico
    const getDisponibilitaByMedico = useCallback((medicoId: string): DisponibilitaMedico[] => {
        if (!disponibilitaData) return [];
        return disponibilitaData.filter(d => d.medicoId === medicoId);
    }, [disponibilitaData]);

    // Get slots by medico
    const getSlotsByMedico = useCallback((medicoId: string): SlotDisponibilita[] => {
        if (!slotsData?.data) return [];
        return slotsData.data.filter(s => s.medicoId === medicoId);
    }, [slotsData]);

    // Get ferie by medico
    const getFerieByMedico = useCallback((medicoId: string) => {
        if (!ferieData) return [];
        return ferieData.filter(f => f.medicoId === medicoId);
    }, [ferieData]);

    // ==============================
    // MUTATIONS
    // ==============================

    // Create orario settimanale
    const createSlotMutation = useMutation({
        mutationFn: (data: Partial<DisponibilitaMedico>) => {
            assertCanManageMedico(data.medicoId);
            return disponibilitaApi.create(data);
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['disponibilita-all'] });
            queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
            queryClient.invalidateQueries({ queryKey: ['slots'] });
            // Sincronizza /calendario
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'] });
            const slotsMsg = result?._slotsGenerated ? ` (${result._slotsGenerated} slot generati per 3 mesi)` : '';
            showToast({ type: 'success', message: `Orario settimanale creato${slotsMsg}` });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nella creazione' });
        }
    });

    // Delete orario settimanale
    const deleteSlotMutation = useMutation({
        mutationFn: (id: string) => {
            const item = (disponibilitaData || []).find(d => d.id === id);
            assertCanManageMedico(item?.medicoId);
            return disponibilitaApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disponibilita-all'] });
            queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
            showToast({ type: 'success', message: 'Orario eliminato' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nell\'eliminazione' });
        }
    });

    // Update orario settimanale
    const updateSlotMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<DisponibilitaMedico> }) => {
            const item = (disponibilitaData || []).find(d => d.id === id);
            assertCanManageMedico(data.medicoId || item?.medicoId);
            return disponibilitaApi.update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disponibilita-all'] });
            queryClient.invalidateQueries({ queryKey: ['disponibilita'] });
            queryClient.invalidateQueries({ queryKey: ['slots'] });
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'] });
            showToast({ type: 'success', message: 'Orario aggiornato' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nell\'aggiornamento' });
        }
    });

    // Create slot singolo
    const createSingleSlotMutation = useMutation({
        mutationFn: (data: Partial<SlotDisponibilita>) => {
            assertCanManageMedico(data.medicoId);
            return slotsApi.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots-all'] });
            queryClient.invalidateQueries({ queryKey: ['slots-singoli'] });
            // Sincronizza /calendario
            queryClient.invalidateQueries({ queryKey: ['slots-calendario'] });
            showToast({ type: 'success', message: 'Disponibilità creata' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nella creazione' });
        }
    });

    // Delete slot singolo
    const deleteSingleSlotMutation = useMutation({
        mutationFn: (id: string) => {
            const item = (slotsData?.data || []).find(s => s.id === id);
            assertCanManageMedico(item?.medicoId);
            return slotsApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots-all'] });
            queryClient.invalidateQueries({ queryKey: ['slots-singoli'] });
            showToast({ type: 'success', message: 'Slot eliminato' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nell\'eliminazione' });
        }
    });

    // Create ferie
    const createFerieMutation = useMutation({
        mutationFn: (data: Partial<FerieAssenza>) => {
            assertCanManageMedico(data.medicoId);
            return ferieApi.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ferie-all'] });
            queryClient.invalidateQueries({ queryKey: ['ferie'] });
            showToast({ type: 'success', message: 'Assenza registrata' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nella creazione' });
        }
    });

    // Delete ferie
    const deleteFerieMutation = useMutation({
        mutationFn: (id: string) => {
            const item = (ferieData || []).find(f => f.id === id);
            assertCanManageMedico(item?.medicoId);
            return ferieApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ferie-all'] });
            queryClient.invalidateQueries({ queryKey: ['ferie'] });
            showToast({ type: 'success', message: 'Assenza eliminata' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nell\'eliminazione' });
        }
    });

    // Copy pattern
    const copyPatternMutation = useMutation({
        mutationFn: async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
            assertCanManageMedico(sourceId);
            assertCanManageMedico(targetId);
            const sourceDisponibilita = getDisponibilitaByMedico(sourceId);
            const promises = sourceDisponibilita.map(d =>
                disponibilitaApi.create({
                    medicoId: targetId,
                    ambulatorioId: d.ambulatorioId,
                    giorno: d.giorno,
                    oraInizio: d.oraInizio,
                    oraFine: d.oraFine,
                    validoDal: new Date().toISOString().split('T')[0]
                })
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disponibilita-all'] });
            showToast({ type: 'success', message: 'Pattern copiato con successo' });
        },
        onError: (error: Error) => {
            showToast({ type: 'error', message: 'Errore nella copia' });
        }
    });

    return {
        // Data
        medici: visibleMedici,
        mediciWithStats,
        ambulatori: ambulatoriData?.data || [],
        disponibilita: disponibilitaData || [],
        slots: slotsData?.data || [],
        ferie: ferieData || [],

        // Loading states
        isLoading: loadingMedici || loadingAmbulatori || loadingDisponibilita || loadingSlots || loadingFerie,
        isReady,

        // Getters
        getDisponibilitaByMedico,
        getSlotsByMedico,
        getFerieByMedico,

        // Mutations
        createSlot: createSlotMutation.mutateAsync,
        updateSlot: async (id: string, data: Partial<DisponibilitaMedico>) => updateSlotMutation.mutateAsync({ id, data }),
        deleteSlot: deleteSlotMutation.mutateAsync,
        createSingleSlot: createSingleSlotMutation.mutateAsync,
        deleteSingleSlot: deleteSingleSlotMutation.mutateAsync,
        createFerie: createFerieMutation.mutateAsync,
        deleteFerie: deleteFerieMutation.mutateAsync,
        copyPattern: copyPatternMutation.mutateAsync,

        // Mutation states
        isCreating: createSlotMutation.isPending || createSingleSlotMutation.isPending || createFerieMutation.isPending,
        isDeleting: deleteSlotMutation.isPending || deleteSingleSlotMutation.isPending || deleteFerieMutation.isPending,
        isCopying: copyPatternMutation.isPending
    };
};
