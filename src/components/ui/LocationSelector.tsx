/**
 * LocationSelector - Selettore a 3 colonne per Poliambulatorio → Sede → Ambulatorio
 * 
 * Design elegante con selezione rapida tramite 3 colonne affiancate.
 * Auto-select quando esiste una sola opzione per livello.
 * 
 * @module components/ui/LocationSelector
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Building2,
    MapPin,
    Landmark,
    ChevronDown,
    X,
    Check,
    Loader2
} from 'lucide-react';
import {
    poliambulatoriApi,
    sediApi,
    ambulatoriApi,
    Poliambulatorio,
    SedePoliambulatorio,
    Ambulatorio
} from '../../services/clinicaApi';
import { useTenantFilter } from '../../context/TenantFilterContext';

// ============================================
// TYPES
// ============================================

export interface LocationSelection {
    poliambulatorioId: string | null;
    poliambulatorioNome?: string;
    sedeId: string | null;
    sedeNome?: string;
    ambulatorioId: string | null;
    ambulatorioNome?: string;
}

export interface LocationSelectorProps {
    value: LocationSelection;
    onChange: (selection: LocationSelection) => void;
    /** Se true, tutti i livelli sono opzionali */
    allowPartialSelection?: boolean;
    /** Se true, mostra solo ambulatori (nasconde poliambulatorio/sede se ce n'è 1) */
    compactMode?: boolean;
    /** Dimensione del selettore: 'sm' per stile inline, 'md' per stile card */
    size?: 'sm' | 'md';
    /** Classe CSS aggiuntiva */
    className?: string;
    /** Placeholder quando nulla è selezionato */
    placeholder?: string;
    /** Se true, il selettore è disabilitato */
    disabled?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const LocationSelector: React.FC<LocationSelectorProps> = ({
    value,
    onChange,
    allowPartialSelection = true,
    compactMode = false,
    size = 'md',
    className = '',
    placeholder = 'Seleziona struttura...',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPoliambulatorio, setSelectedPoliambulatorio] = useState<Poliambulatorio | null>(null);
    const [selectedSede, setSelectedSede] = useState<SedePoliambulatorio | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();

    // =====================
    // API Queries
    // =====================

    // Fetch poliambulatori
    const { data: poliambulatori = [], isLoading: isLoadingPoliambulatori } = useQuery({
        queryKey: ['poliambulatori', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const result = await poliambulatoriApi.getAll({
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' }),
                stato: 'ATTIVO'
            });
            return result.data;
        },
        enabled: isReady
    });

    // Fetch sedi quando si seleziona un poliambulatorio
    const { data: sedi = [], isLoading: isLoadingSedi } = useQuery({
        queryKey: ['sedi', selectedPoliambulatorio?.id, tenantFilterKey],
        queryFn: async () => {
            if (!selectedPoliambulatorio?.id) return [];
            const result = await sediApi.getByPoliambulatorio(selectedPoliambulatorio.id);
            return result.filter(s => s.isAttiva);
        },
        enabled: !!selectedPoliambulatorio?.id
    });

    // Fetch ambulatori - use getAll with poliambulatorioId filter
    const { data: ambulatori = [], isLoading: isLoadingAmbulatori } = useQuery({
        queryKey: ['ambulatori', selectedPoliambulatorio?.id, selectedSede?.id, tenantFilterKey],
        queryFn: async () => {
            if (!selectedPoliambulatorio?.id) return [];
            const tenantParams = getTenantFilterParams();
            const result = await ambulatoriApi.getAll({
                poliambulatorioId: selectedPoliambulatorio.id,
                ...(selectedSede?.id && { sedeId: selectedSede.id }),
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' }),
                stato: 'ATTIVO'
            });
            return result.data || [];
        },
        enabled: !!selectedPoliambulatorio?.id
    });

    // =====================
    // Auto-select logic (solo se poliambulatorio/sede unici)
    // =====================

    useEffect(() => {
        if (poliambulatori.length === 1 && !selectedPoliambulatorio) {
            setSelectedPoliambulatorio(poliambulatori[0]);
        }
    }, [poliambulatori, selectedPoliambulatorio]);

    useEffect(() => {
        if (sedi.length === 1 && !selectedSede && selectedPoliambulatorio) {
            setSelectedSede(sedi[0]);
        }
    }, [sedi, selectedSede, selectedPoliambulatorio]);

    // Sync con value iniziale
    // Nota: selectedPoliambulatorio/selectedSede sono intentionally omessi dalle deps
    // per evitare loop infiniti — gli effetti usano già una guard by-id.
    useEffect(() => {
        if (value.poliambulatorioId) {
            const p = poliambulatori.find(pol => pol.id === value.poliambulatorioId);
            if (p) {
                setSelectedPoliambulatorio(prev =>
                    prev?.id === p.id ? prev : p
                );
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.poliambulatorioId, poliambulatori]);

    useEffect(() => {
        if (value.sedeId) {
            const s = sedi.find(sed => sed.id === value.sedeId);
            if (s) {
                setSelectedSede(prev =>
                    prev?.id === s.id ? prev : s
                );
            }
        } else if (value.sedeId === null) {
            // Reset selectedSede; React bails out on Object.is(null, null) → no re-render if already null
            setSelectedSede(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.sedeId, sedi]);

    // =====================
    // Click outside handler
    // =====================

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // =====================
    // Handlers
    // =====================

    const handleSelectPoliambulatorio = useCallback((p: Poliambulatorio) => {
        setSelectedPoliambulatorio(p);
        setSelectedSede(null);

        if (allowPartialSelection) {
            onChange({
                poliambulatorioId: p.id,
                poliambulatorioNome: p.nome,
                sedeId: null,
                sedeNome: undefined,
                ambulatorioId: null,
                ambulatorioNome: undefined
            });
        }
    }, [allowPartialSelection, onChange]);

    const handleSelectSede = useCallback((s: SedePoliambulatorio) => {
        setSelectedSede(s);

        if (allowPartialSelection && selectedPoliambulatorio) {
            onChange({
                poliambulatorioId: selectedPoliambulatorio.id,
                poliambulatorioNome: selectedPoliambulatorio.nome,
                sedeId: s.id,
                sedeNome: s.nome,
                ambulatorioId: null,
                ambulatorioNome: undefined
            });
        }
    }, [allowPartialSelection, selectedPoliambulatorio, onChange]);

    /**
     * Handler for "Tutte le sedi" selection
     * Clears sede filter and notifies parent to show all ambulatori
     */
    const handleSelectAllSedi = useCallback(() => {
        setSelectedSede(null);

        if (selectedPoliambulatorio) {
            onChange({
                poliambulatorioId: selectedPoliambulatorio.id,
                poliambulatorioNome: selectedPoliambulatorio.nome,
                sedeId: null,
                sedeNome: undefined,
                ambulatorioId: null,
                ambulatorioNome: undefined
            });
        }
    }, [selectedPoliambulatorio, onChange]);

    const handleSelectAmbulatorio = useCallback((a: Ambulatorio) => {
        const newSelection: LocationSelection = {
            poliambulatorioId: selectedPoliambulatorio?.id || null,
            poliambulatorioNome: selectedPoliambulatorio?.nome,
            sedeId: selectedSede?.id || null,
            sedeNome: selectedSede?.nome,
            ambulatorioId: a.id,
            ambulatorioNome: a.nome
        };
        onChange(newSelection);
        setIsOpen(false);
    }, [selectedPoliambulatorio, selectedSede, onChange]);

    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPoliambulatorio(null);
        setSelectedSede(null);
        onChange({
            poliambulatorioId: null,
            sedeId: null,
            ambulatorioId: null
        });
    }, [onChange]);

    // =====================
    // Display text
    // =====================

    const hasSelection = value.poliambulatorioId || value.sedeId || value.ambulatorioId;

    const displayText = useMemo(() => {
        if (!hasSelection) return placeholder;

        const parts: string[] = [];

        if (compactMode) {
            // In compact mode show only ambulatorio if selected, otherwise last selection
            if (value.ambulatorioNome) return value.ambulatorioNome;
            if (value.sedeNome) return value.sedeNome;
            if (value.poliambulatorioNome) return value.poliambulatorioNome;
            return placeholder;
        }

        // Full breadcrumb display
        if (value.poliambulatorioNome) parts.push(value.poliambulatorioNome);
        if (value.sedeNome) parts.push(value.sedeNome);
        if (value.ambulatorioNome) parts.push(value.ambulatorioNome);

        return parts.join(' › ') || placeholder;
    }, [value, placeholder, hasSelection, compactMode]);

    const isLoading = isLoadingPoliambulatori;

    // =====================
    // Determine which columns to show
    // =====================

    const showPoliambulatoriColumn = poliambulatori.length > 1;
    const showSediColumn = sedi.length > 1 || (!selectedPoliambulatorio && poliambulatori.length > 0);
    const showAmbulatorioColumn = true;

    // Column count for responsive width
    const columnCount = (showPoliambulatoriColumn ? 1 : 0) + (showSediColumn ? 1 : 0) + (showAmbulatorioColumn ? 1 : 0);
    const dropdownWidth = columnCount === 3 ? 'w-[720px]' : columnCount === 2 ? 'w-[480px]' : 'w-80';

    // =====================
    // Render
    // =====================

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger */}
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                        e.preventDefault();
                        setIsOpen(!isOpen);
                    }
                }}
                className={`
                    w-full flex items-center gap-2 
                    ${size === 'sm' ? 'pl-8 pr-7 py-1.5 text-sm' : 'px-3 py-2'}
                    border rounded-lg text-left transition-all bg-white
                    ${isOpen
                        ? 'ring-2 ring-teal-500 border-teal-300'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                {size === 'sm' ? (
                    <>
                        <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <span className={`flex-1 truncate ${hasSelection ? 'text-gray-900' : 'text-gray-500'}`}>
                            {displayText}
                        </span>
                        {hasSelection && !disabled && (
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleClear}
                                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                                className="p-0.5 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                title="Cancella selezione"
                            >
                                <X className="h-3 w-3 text-gray-400" />
                            </span>
                        )}
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </>
                ) : (
                    <>
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
                            <Building2 className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                Struttura
                            </div>
                            <div className={`text-sm truncate ${hasSelection ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                {displayText}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {hasSelection && !disabled && (
                                <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={handleClear}
                                    onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                    title="Cancella selezione"
                                >
                                    <X className="h-3.5 w-3.5 text-gray-400" />
                                </span>
                            )}
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </>
                )}
            </div>

            {/* Dropdown Panel - 3 Columns */}
            {isOpen && (
                <div className={`absolute z-50 mt-2 ${dropdownWidth} bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden`}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-4 py-3">
                        <div className="flex items-center gap-2 text-white text-sm font-medium">
                            <Landmark className="h-4 w-4" />
                            Seleziona Struttura
                        </div>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-12 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            <span>Caricamento...</span>
                        </div>
                    )}

                    {/* 3 Column Layout */}
                    {!isLoading && (
                        <div className="flex divide-x divide-gray-100" style={{ maxHeight: '320px' }}>
                            {/* Column 1: Poliambulatori */}
                            {showPoliambulatoriColumn && (
                                <div className="flex-1 min-w-0">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <Landmark className="h-3 w-3" />
                                            Poliambulatorio
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto" style={{ maxHeight: '270px' }}>
                                        {poliambulatori.map((p) => {
                                            const isSelected = selectedPoliambulatorio?.id === p.id;
                                            return (
                                                <div
                                                    key={p.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => handleSelectPoliambulatorio(p)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSelectPoliambulatorio(p)}
                                                    className={`
                                                        w-full px-3 py-2.5 text-left cursor-pointer transition-colors
                                                        ${isSelected ? 'bg-teal-50 border-l-2 border-teal-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
                                                    `}
                                                >
                                                    <div className={`text-sm font-medium truncate ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                                                        {p.nome}
                                                    </div>
                                                    {p.indirizzo && (
                                                        <div className="text-xs text-gray-500 truncate mt-0.5">
                                                            {p.indirizzo}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Column 2: Sedi */}
                            {showSediColumn && (
                                <div className="flex-1 min-w-0">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <MapPin className="h-3 w-3" />
                                            Sede
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto" style={{ maxHeight: '270px' }}>
                                        {!selectedPoliambulatorio ? (
                                            <div className="px-3 py-8 text-center text-gray-400 text-sm">
                                                <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                                Seleziona prima un poliambulatorio
                                            </div>
                                        ) : isLoadingSedi ? (
                                            <div className="px-3 py-8 text-center text-gray-400">
                                                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                            </div>
                                        ) : sedi.length === 0 ? (
                                            <div className="px-3 py-8 text-center text-gray-400 text-sm">
                                                Nessuna sede disponibile
                                            </div>
                                        ) : (
                                            <>
                                                {/* Opzione "Tutte le sedi" */}
                                                {allowPartialSelection && sedi.length > 1 && (
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={handleSelectAllSedi}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSelectAllSedi()}
                                                        className={`
                                                            w-full px-3 py-2.5 text-left cursor-pointer transition-colors border-b border-gray-100
                                                            ${!selectedSede ? 'bg-teal-50 border-l-2 border-teal-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
                                                        `}
                                                    >
                                                        <div className={`text-sm font-medium ${!selectedSede ? 'text-teal-700' : 'text-gray-600'}`}>
                                                            Tutte le sedi
                                                        </div>
                                                        <div className="text-xs text-gray-400 mt-0.5">
                                                            Mostra tutti gli ambulatori
                                                        </div>
                                                    </div>
                                                )}
                                                {sedi.map((s) => {
                                                    const isSelected = selectedSede?.id === s.id;
                                                    return (
                                                        <div
                                                            key={s.id}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => handleSelectSede(s)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSelectSede(s)}
                                                            className={`
                                                                w-full px-3 py-2.5 text-left cursor-pointer transition-colors
                                                                ${isSelected ? 'bg-teal-50 border-l-2 border-teal-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
                                                            `}
                                                        >
                                                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                                                                {s.nome}
                                                                {s.isPrincipale && (
                                                                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded">
                                                                        Principale
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {s.indirizzo && (
                                                                <div className="text-xs text-gray-500 truncate mt-0.5">
                                                                    {s.indirizzo}, {s.citta}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Column 3: Ambulatori */}
                            <div className="flex-1 min-w-0">
                                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 className="h-3 w-3" />
                                        Ambulatorio
                                    </div>
                                </div>
                                <div className="overflow-y-auto" style={{ maxHeight: '270px' }}>
                                    {!selectedPoliambulatorio ? (
                                        <div className="px-3 py-8 text-center text-gray-400 text-sm">
                                            <Building2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
                                            Seleziona prima un poliambulatorio
                                        </div>
                                    ) : isLoadingAmbulatori ? (
                                        <div className="px-3 py-8 text-center text-gray-400">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                        </div>
                                    ) : ambulatori.length === 0 ? (
                                        <div className="px-3 py-8 text-center text-gray-400 text-sm">
                                            Nessun ambulatorio disponibile
                                        </div>
                                    ) : (
                                        <>
                                            {/* Opzione "Tutti gli ambulatori" */}
                                            {allowPartialSelection && ambulatori.length > 1 && (
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => {
                                                        onChange({
                                                            poliambulatorioId: selectedPoliambulatorio?.id || null,
                                                            poliambulatorioNome: selectedPoliambulatorio?.nome,
                                                            sedeId: selectedSede?.id || null,
                                                            sedeNome: selectedSede?.nome,
                                                            ambulatorioId: null,
                                                            ambulatorioNome: undefined
                                                        });
                                                        setIsOpen(false);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            onChange({
                                                                poliambulatorioId: selectedPoliambulatorio?.id || null,
                                                                poliambulatorioNome: selectedPoliambulatorio?.nome,
                                                                sedeId: selectedSede?.id || null,
                                                                sedeNome: selectedSede?.nome,
                                                                ambulatorioId: null,
                                                                ambulatorioNome: undefined
                                                            });
                                                            setIsOpen(false);
                                                        }
                                                    }}
                                                    className={`
                                                        w-full px-3 py-2.5 text-left cursor-pointer transition-colors border-b border-gray-100
                                                        ${!value.ambulatorioId && selectedPoliambulatorio ? 'bg-teal-50 border-l-2 border-teal-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
                                                    `}
                                                >
                                                    <div className={`text-sm font-medium ${!value.ambulatorioId && selectedPoliambulatorio ? 'text-teal-700' : 'text-gray-600'}`}>
                                                        Tutti gli ambulatori
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        {ambulatori.length} ambulatori disponibili
                                                    </div>
                                                </div>
                                            )}
                                            {ambulatori.map((a) => {
                                                const isSelected = value.ambulatorioId === a.id;
                                                return (
                                                    <div
                                                        key={a.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => handleSelectAmbulatorio(a)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSelectAmbulatorio(a)}
                                                        className={`
                                                            w-full px-3 py-2.5 text-left cursor-pointer transition-colors
                                                            ${isSelected ? 'bg-teal-50 border-l-2 border-teal-500' : 'hover:bg-gray-50 border-l-2 border-transparent'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {a.colore && (
                                                                <div
                                                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                    style={{ backgroundColor: a.colore }}
                                                                />
                                                            )}
                                                            <div className={`text-sm font-medium truncate ${isSelected ? 'text-teal-700' : 'text-gray-900'}`}>
                                                                {a.nome}
                                                            </div>
                                                            {isSelected && (
                                                                <Check className="h-4 w-4 text-teal-600 ml-auto flex-shrink-0" />
                                                            )}
                                                        </div>
                                                        {a.specializzazione && (
                                                            <div className="text-xs text-gray-500 truncate mt-0.5 ml-4">
                                                                {a.specializzazione}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    {hasSelection && (
                        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex items-center justify-between">
                            <span className="text-xs text-gray-500 truncate max-w-[70%]">
                                {displayText}
                            </span>
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={() => setIsOpen(false)}
                                onKeyDown={(e) => e.key === 'Enter' && setIsOpen(false)}
                                className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors cursor-pointer"
                            >
                                Conferma
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocationSelector;
