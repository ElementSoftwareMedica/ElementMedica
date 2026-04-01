/**
 * MedicoRefertanteCard - Card to select/change the refertante doctor
 * 
 * Allows picking a different medico to sign the referto instead of
 * the one who opened/performed the visit.
 * Visible only to users with visite:update permission.
 * 
 * @module pages/clinica/clinica/components/MedicoRefertanteCard
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    UserCheck,
    Search,
    X,
    ChevronDown,
    Check,
    Stethoscope,
    Loader2
} from 'lucide-react';
import { mediciApi, visiteApi } from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import { extractGenderFromTaxCode } from '../../../../utils/codiceFiscale';

interface MedicoOption {
    id: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    codiceFiscale?: string;
    taxCode?: string;
    // From mediciApi.getAll() — flat shape
    specialties?: string[];
    registerCode?: string;
    // From visita.medicoRefertante include — nested shape
    tenantProfiles?: Array<{
        specialties?: string[];
        registerCode?: string;
    }>;
}

function getSpecialties(m: MedicoOption): string[] {
    if (m.specialties?.length) return m.specialties;
    if (m.tenantProfiles?.[0]?.specialties?.length) return m.tenantProfiles[0].specialties;
    return [];
}

function getRegisterCode(m: MedicoOption): string | undefined {
    return m.registerCode || m.tenantProfiles?.[0]?.registerCode;
}

interface MedicoRefertanteCardProps {
    visitaId: string | null;
    medicoId: string;            // Medico who performed the visit
    medicoRefertanteId?: string | null; // Current refertante override
    medicoRefertante?: MedicoOption | null;
    medicoVisita?: MedicoOption | null; // The original visit medico
    disabled?: boolean;
    className?: string;
}

function getMedicoTitle(gender?: string, taxCode?: string): string {
    // Prioritize explicit gender, then derive from codice fiscale
    const effectiveGender = gender || (taxCode ? extractGenderFromTaxCode(taxCode) : null);
    return effectiveGender === 'FEMALE' ? 'Dott.ssa' : 'Dott.';
}

function formatMedicoDisplay(m: MedicoOption): string {
    const title = getMedicoTitle(m.gender, m.codiceFiscale || m.taxCode);
    return `${title} ${m.lastName || ''} ${m.firstName || ''}`.trim();
}

export const MedicoRefertanteCard: React.FC<MedicoRefertanteCardProps> = ({
    visitaId,
    medicoId,
    medicoRefertanteId,
    medicoRefertante,
    medicoVisita,
    disabled = false,
    className = ''
}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [openUpward, setOpenUpward] = useState(false);
    const dropdownTriggerRef = useRef<HTMLButtonElement>(null);

    // Determine dropdown direction when opening
    useEffect(() => {
        if (isOpen && dropdownTriggerRef.current) {
            const rect = dropdownTriggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If less than 280px below (dropdown max-h ~256 + margin), open upward
            setOpenUpward(spaceBelow < 280);
        }
    }, [isOpen]);

    // Fetch all tenant medici
    // mediciApi.getAll() returns PaginatedResponse { data: [...], pagination: {...} }
    const { data: mediciResponse } = useQuery({
        queryKey: ['medici-list-refertante'],
        queryFn: () => mediciApi.getAll({ limit: 200 }),
        staleTime: 5 * 60 * 1000,
        enabled: isOpen
    });

    // Extract the array from PaginatedResponse
    const mediciList = useMemo(() => {
        if (!mediciResponse) return [];
        // Handle PaginatedResponse shape { data: [...], pagination: {...} }
        if (mediciResponse.data && Array.isArray(mediciResponse.data)) return mediciResponse.data;
        // Fallback: already an array
        if (Array.isArray(mediciResponse)) return mediciResponse;
        return [];
    }, [mediciResponse]);

    // Filter medici by search
    const filteredMedici = useMemo(() => {
        if (!mediciList.length) return [];
        if (!search.trim()) return mediciList;
        const lower = search.toLowerCase();
        return mediciList.filter((m: MedicoOption) =>
            `${m.firstName} ${m.lastName}`.toLowerCase().includes(lower) ||
            `${m.lastName} ${m.firstName}`.toLowerCase().includes(lower)
        );
    }, [mediciList, search]);

    // Mutation to update medico refertante
    const updateMutation = useMutation({
        mutationFn: (newMedicoRefertanteId: string | null) => {
            if (!visitaId) return Promise.reject(new Error('Visita non ancora creata'));
            return visiteApi.updateMedicoRefertante(visitaId, newMedicoRefertanteId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visita'] });
            showToast({ message: 'Medico refertante aggiornato', type: 'success' });
            setIsOpen(false);
            setSearch('');
        },
        onError: () => {
            showToast({ message: 'Errore nell\'aggiornamento del medico refertante', type: 'error' });
        }
    });

    const handleSelect = useCallback((medicoOptionId: string) => {
        // If selecting the same as the visit medico, clear the refertante
        const value = medicoOptionId === medicoId ? null : medicoOptionId;
        updateMutation.mutate(value);
    }, [medicoId, updateMutation]);

    const handleReset = useCallback(() => {
        updateMutation.mutate(null);
    }, [updateMutation]);

    // Current effective medico for display
    const currentRefertante = medicoRefertante || medicoVisita;
    const isOverridden = !!medicoRefertanteId && medicoRefertanteId !== medicoId;

    return (
        <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-gray-100 rounded-t-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-violet-100 rounded-lg">
                            <UserCheck className="h-4 w-4 text-violet-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">Medico Refertante</h3>
                    </div>
                    {isOverridden && !disabled && (
                        <button
                            onClick={handleReset}
                            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                            title="Ripristina medico originale"
                        >
                            <X className="h-3 w-3" />
                            Ripristina
                        </button>
                    )}
                </div>
            </div>

            {/* Current Selection */}
            <div className="p-4">
                {currentRefertante ? (
                    <div className="mb-3">
                        {/* Override badge — prominent at top */}
                        {isOverridden && (
                            <div className="mb-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full">
                                    <UserCheck className="h-3 w-3" />
                                    Medico diverso dal visitante
                                </span>
                            </div>
                        )}
                        {/* Medico name — primary, prominent display */}
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-teal-50 rounded-lg flex-shrink-0 mt-0.5">
                                <Stethoscope className="h-5 w-5 text-teal-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-gray-900 leading-snug">
                                    {formatMedicoDisplay(currentRefertante)}
                                </div>
                                {getSpecialties(currentRefertante).length > 0 && (
                                    <div className="text-xs text-teal-600 font-medium mt-1">
                                        {getSpecialties(currentRefertante).join(', ')}
                                    </div>
                                )}
                                {getRegisterCode(currentRefertante) && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        Albo OMCeO: {getRegisterCode(currentRefertante)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 mb-3">
                        Nessun medico selezionato
                    </div>
                )}

                {/* Select Button / Dropdown */}
                {!disabled && (
                    <div className="relative">
                        <button
                            ref={dropdownTriggerRef}
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm
                                     border border-gray-200 rounded-lg hover:border-violet-300 
                                     hover:bg-violet-50/50 transition-colors text-gray-700"
                        >
                            <span className="flex items-center gap-2">
                                <Search className="h-3.5 w-3.5 text-gray-400" />
                                Cambia medico refertante
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown — z-50 to overlay card content, dynamic direction */}
                        {isOpen && (
                            <div className={`absolute z-50 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-hidden ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                                }`}>
                                {/* Search input */}
                                <div className="p-2 border-b border-gray-100">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Cerca medico..."
                                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md 
                                                     focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* List */}
                                <div className="max-h-48 overflow-y-auto">
                                    {updateMutation.isPending && (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
                                        </div>
                                    )}
                                    {!updateMutation.isPending && filteredMedici.length === 0 && (
                                        <div className="py-4 text-center text-xs text-gray-500">
                                            Nessun medico trovato
                                        </div>
                                    )}
                                    {!updateMutation.isPending && filteredMedici.map((m: MedicoOption) => {
                                        const isCurrentRefertante = m.id === (medicoRefertanteId || medicoId);
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => handleSelect(m.id)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left
                                                          hover:bg-violet-50 transition-colors border-b border-gray-50 last:border-b-0
                                                          ${isCurrentRefertante ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''}`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-gray-900">
                                                        {formatMedicoDisplay(m)}
                                                    </div>
                                                    {getSpecialties(m).length > 0 && (
                                                        <div className="text-xs text-teal-600 mt-0.5">
                                                            {getSpecialties(m).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                                {isCurrentRefertante && (
                                                    <Check className="h-4 w-4 text-violet-600 flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicoRefertanteCard;
