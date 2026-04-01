/**
 * PrestazionePicker - Prestazione/Bundle selection component
 * @module pages/clinica/agenda/components/modals/AppointmentBookingModal/PrestazionePicker
 */

import React, { useMemo, useState } from 'react';
import {
    Stethoscope,
    Package,
    X,
    Search
} from 'lucide-react';

import type { Prestazione, OffertaBundle } from '../../../../../../services/clinicaApi';
import type { PrestazionePickerProps } from './types';

// Threshold for showing search bar
const SEARCH_THRESHOLD = 8;

export const PrestazionePicker: React.FC<PrestazionePickerProps> = ({
    selectedPrestazione,
    setSelectedPrestazione,
    selectedBundle,
    setSelectedBundle,
    selectionType,
    setSelectionType,
    setSelectedTariffario,
    filteredPrestazioni,
    filteredBundles,
    medicoDetails,
    scontoValidato,
    calcolaPrezzoScontato
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter prestazioni based on search query
    const displayedPrestazioni = useMemo(() => {
        if (!searchQuery.trim()) return filteredPrestazioni;
        const query = searchQuery.toLowerCase();
        return filteredPrestazioni.filter(p =>
            p.nome.toLowerCase().includes(query) ||
            p.codice.toLowerCase().includes(query)
        );
    }, [filteredPrestazioni, searchQuery]);

    // Filter bundles based on search query
    const displayedBundles = useMemo(() => {
        if (!searchQuery.trim()) return filteredBundles;
        const query = searchQuery.toLowerCase();
        return filteredBundles.filter(b =>
            b.nome.toLowerCase().includes(query) ||
            b.codice.toLowerCase().includes(query)
        );
    }, [filteredBundles, searchQuery]);

    // Show search bar if there are many items
    const showSearchBar = selectionType === 'prestazione'
        ? filteredPrestazioni.length > SEARCH_THRESHOLD
        : filteredBundles.length > SEARCH_THRESHOLD;

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                <Stethoscope className="h-4 w-4 inline mr-1" />
                Prestazione / Bundle *
            </label>

            {/* Selected item display */}
            {(selectedPrestazione || selectedBundle) ? (
                <div className={`flex items-center gap-3 p-3 ${selectedBundle ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
                    <div className={`w-10 h-10 rounded-lg ${selectedBundle ? 'bg-purple-200' : 'bg-blue-200'} flex items-center justify-center`}>
                        {selectedBundle ? (
                            <Package className="h-5 w-5 text-purple-700" />
                        ) : (
                            <Stethoscope className="h-5 w-5 text-blue-700" />
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="font-medium text-gray-900">
                            {selectedBundle ? selectedBundle.nome : selectedPrestazione?.nome}
                        </p>
                        <p className="text-sm text-gray-500">
                            {selectedBundle ? (
                                <>
                                    {selectedBundle.codice} • {selectedBundle.durataBundle || '?'} min
                                    {selectedBundle.prezzoBundle != null && (
                                        <>
                                            {' • '}
                                            {scontoValidato?.valid && calcolaPrezzoScontato(Number(selectedBundle.prezzoBundle)) !== null ? (
                                                <>
                                                    <span className="line-through text-gray-400 mr-1">€{Number(selectedBundle.prezzoBundle).toFixed(2)}</span>
                                                    <span className="font-medium text-green-600">€{calcolaPrezzoScontato(Number(selectedBundle.prezzoBundle))?.toFixed(2)}</span>
                                                </>
                                            ) : (
                                                <span className="font-medium text-purple-700">€{Number(selectedBundle.prezzoBundle).toFixed(2)}</span>
                                            )}
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {selectedPrestazione?.codice} • {selectedPrestazione?.durataPrevista} min
                                    {selectedPrestazione?.prezzoBase != null && (
                                        <>
                                            {' • '}
                                            {scontoValidato?.valid && calcolaPrezzoScontato(Number(selectedPrestazione.prezzoBase)) !== null ? (
                                                <>
                                                    <span className="line-through text-gray-400 mr-1">€{Number(selectedPrestazione.prezzoBase).toFixed(2)}</span>
                                                    <span className="font-medium text-green-600">€{calcolaPrezzoScontato(Number(selectedPrestazione.prezzoBase))?.toFixed(2)}</span>
                                                </>
                                            ) : (
                                                <span className="font-medium text-teal-700">€{Number(selectedPrestazione.prezzoBase).toFixed(2)}</span>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedPrestazione(null);
                            setSelectedBundle(null);
                            setSelectedTariffario(null);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <div className="border border-gray-200 rounded-lg">
                    {/* Tabs for Prestazioni / Bundle */}
                    <div className="flex border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => setSelectionType('prestazione')}
                            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${selectionType === 'prestazione'
                                ? 'text-teal-700 bg-teal-50 border-b-2 border-teal-500'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Stethoscope className="h-4 w-4 inline mr-1" />
                            Prestazioni ({filteredPrestazioni.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectionType('bundle')}
                            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${selectionType === 'bundle'
                                ? 'text-purple-700 bg-purple-50 border-b-2 border-purple-500'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Package className="h-4 w-4 inline mr-1" />
                            Bundle ({filteredBundles.length})
                        </button>
                    </div>

                    {/* Search bar - shown when many items */}
                    {showSearchBar && (
                        <div className="px-2 py-2 border-b border-gray-100">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={`Cerca ${selectionType === 'prestazione' ? 'prestazione' : 'bundle'}...`}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Content based on selection type */}
                    <div className="p-2 max-h-48 overflow-y-auto">
                        {selectionType === 'prestazione' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {displayedPrestazioni.map(prestazione => (
                                    <button
                                        key={prestazione.id}
                                        onClick={() => {
                                            setSelectedPrestazione(prestazione);
                                            setSelectedBundle(null);
                                        }}
                                        className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 text-left transition-colors"
                                    >
                                        <Stethoscope className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 text-sm truncate">{prestazione.nome}</p>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-gray-500">{prestazione.durataPrevista} min</span>
                                                {prestazione.prezzoBase != null && (
                                                    <span className="text-xs font-semibold text-teal-700">€{Number(prestazione.prezzoBase).toFixed(2)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {displayedPrestazioni.length === 0 && (
                                    <p className="col-span-2 text-center text-sm text-gray-500 py-4">
                                        {searchQuery
                                            ? 'Nessuna prestazione trovata per la ricerca'
                                            : medicoDetails?.abilitazioni?.length === 0
                                                ? 'Nessuna prestazione abilitata per questo medico'
                                                : 'Nessuna prestazione disponibile'}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {displayedBundles.map(bundle => (
                                    <button
                                        key={bundle.id}
                                        onClick={() => {
                                            setSelectedBundle(bundle);
                                            setSelectedPrestazione(null);
                                        }}
                                        className="flex items-center gap-2 p-2.5 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 text-left transition-colors"
                                    >
                                        <Package className="h-4 w-4 text-purple-400 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-gray-900 text-sm truncate">{bundle.nome}</p>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs text-gray-500">
                                                    {bundle.durataBundle || '?'} min • {bundle.prestazioni?.length || 0} prestazioni
                                                </span>
                                                {bundle.prezzoBundle != null && (
                                                    <span className="text-xs font-semibold text-purple-700">€{Number(bundle.prezzoBundle).toFixed(2)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {displayedBundles.length === 0 && (
                                    <p className="text-center text-sm text-gray-500 py-4">
                                        {searchQuery
                                            ? 'Nessun bundle trovato per la ricerca'
                                            : 'Nessun bundle disponibile per questo medico'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrestazionePicker;
