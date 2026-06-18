/**
 * AccettazioneFiltersBar - Barra filtri per accettazione
 * 
 * Filtri compatti per: ricerca, medico, ambulatorio, stato.
 * Integrato con sistema date navigation.
 * 
 * @module pages/clinica/agenda/components/accettazione
 */

import React from 'react';
import {
    Search,
    Filter,
    User,
    Building2,
    X,
    ChevronDown
} from 'lucide-react';
import { Medico, Ambulatorio } from '../../../../../services/clinicaApi';
import { getDoctorTitle } from '../../../../../utils/codiceFiscale';
import { getPersonDisplayName } from '../../../../../utils/personDisplayUtils';
import { AccettazioneFilters } from './useAccettazioneData';
import { ElegantSelect } from '@/components/ui/ElegantSelect';

// ============================================
// TYPES
// ============================================

export interface AccettazioneFiltersBarProps {
    filters: AccettazioneFilters;
    onFiltersChange: (filters: AccettazioneFilters) => void;
    onReset: () => void;
    medici: Medico[];
    ambulatori: Ambulatorio[];
    isLoadingMedici?: boolean;
    isLoadingAmbulatori?: boolean;
    /** Se false, nasconde il dropdown medici (utente può vedere solo i propri appuntamenti) */
    canViewOtherMedici?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const STATO_OPTIONS = [
    { value: 'tutti', label: 'Tutti gli stati' },
    { value: 'da_accettare', label: 'Da Accettare' },
    { value: 'in_attesa', label: 'In Attesa' },
    { value: 'in_corso', label: 'In Visita' },
    { value: 'completati', label: 'Completati' }
] as const;

// ============================================
// COMPONENT
// ============================================

export const AccettazioneFiltersBar: React.FC<AccettazioneFiltersBarProps> = ({
    filters,
    onFiltersChange,
    onReset,
    medici,
    ambulatori,
    isLoadingMedici = false,
    isLoadingAmbulatori = false,
    canViewOtherMedici = true
}) => {
    // Se non può vedere altri medici, il filtro medicoId non conta come attivo
    const hasActiveFilters =
        filters.search !== '' ||
        (canViewOtherMedici && filters.medicoId !== null) ||
        filters.ambulatorioId !== null ||
        filters.stato !== 'tutti';

    const updateFilter = <K extends keyof AccettazioneFilters>(
        key: K,
        value: AccettazioneFilters[K]
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        placeholder="Cerca paziente o n° coda..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    {filters.search && (
                        <button
                            onClick={() => updateFilter('search', '')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Medico Filter - Solo se l'utente ha permesso di vedere altri medici */}
                {canViewOtherMedici && (
                    <div className="min-w-[200px]">
                        <ElegantSelect
                            value={filters.medicoId || ''}
                            onChange={(v) => updateFilter('medicoId', v || null)}
                            disabled={isLoadingMedici}
                            options={[
                                { value: '', label: isLoadingMedici ? 'Caricamento...' : 'Tutti i medici' },
                                ...medici.map((medico) => ({
                                    value: medico.id,
                                    label: `${getDoctorTitle(medico.taxCode, medico.gender)} ${getPersonDisplayName(medico)}`,
                                })),
                            ]}
                            placeholder={isLoadingMedici ? 'Caricamento...' : 'Tutti i medici'}
                        />
                    </div>
                )}

                {/* Ambulatorio Filter */}
                <div className="min-w-[200px]">
                    <ElegantSelect
                        value={filters.ambulatorioId || ''}
                        onChange={(v) => updateFilter('ambulatorioId', v || null)}
                        disabled={isLoadingAmbulatori}
                        options={[
                            { value: '', label: isLoadingAmbulatori ? 'Caricamento...' : 'Tutti gli ambulatori' },
                            ...ambulatori.map((amb) => ({ value: amb.id, label: amb.nome })),
                        ]}
                        placeholder={isLoadingAmbulatori ? 'Caricamento...' : 'Tutti gli ambulatori'}
                    />
                </div>

                {/* Stato Filter */}
                <div className="min-w-[160px]">
                    <ElegantSelect
                        value={filters.stato}
                        onChange={(v) => updateFilter('stato', v as AccettazioneFilters['stato'])}
                        options={STATO_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                    />
                </div>

                {/* Reset Button */}
                {hasActiveFilters && (
                    <button
                        onClick={onReset}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-4 w-4" />
                        Azzera filtri
                    </button>
                )}
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Filtri attivi:</span>

                    {filters.search && (
                        <FilterBadge
                            label={`"${filters.search}"`}
                            onRemove={() => updateFilter('search', '')}
                        />
                    )}

                    {filters.medicoId && (
                        <FilterBadge
                            label={(() => {
                                const m = medici.find(m => m.id === filters.medicoId);
                                return m ? `${getDoctorTitle(m.taxCode, m.gender)} ${getPersonDisplayName(m)}` : 'Medico';
                            })()}
                            onRemove={() => updateFilter('medicoId', null)}
                        />
                    )}

                    {filters.ambulatorioId && (
                        <FilterBadge
                            label={ambulatori.find(a => a.id === filters.ambulatorioId)?.nome || 'Ambulatorio'}
                            onRemove={() => updateFilter('ambulatorioId', null)}
                        />
                    )}

                    {filters.stato !== 'tutti' && (
                        <FilterBadge
                            label={STATO_OPTIONS.find(o => o.value === filters.stato)?.label || filters.stato}
                            onRemove={() => updateFilter('stato', 'tutti')}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

// ============================================
// SUB-COMPONENTS
// ============================================

const FilterBadge: React.FC<{
    label: string;
    onRemove: () => void;
}> = ({ label, onRemove }) => (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full">
        {label}
        <button
            onClick={onRemove}
            className="hover:bg-teal-100 rounded-full p-0.5"
        >
            <X className="h-3 w-3" />
        </button>
    </span>
);

export default AccettazioneFiltersBar;
