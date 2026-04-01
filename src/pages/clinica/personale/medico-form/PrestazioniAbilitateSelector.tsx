import React, { useMemo, useState } from 'react';
import { Search, CheckSquare, Square, Minus, ChevronRight, Stethoscope, Info, Filter } from 'lucide-react';
import type { Prestazione, TipoPrestazione } from '@/services/clinicaApi';

// Labels per i tipi di prestazione
const TIPO_PRESTAZIONE_LABELS: Record<TipoPrestazione, string> = {
    VISITA_SPECIALISTICA: 'Visita Specialistica',
    VISITA_MEDICINA_LAVORO: 'Medicina del Lavoro',
    ESAME_STRUMENTALE: 'Esame Strumentale',
    ESAME_LABORATORIO: 'Esame Laboratorio',
    INTERVENTO_AMBULATORIALE: 'Intervento Ambulatoriale',
    VACCINAZIONE: 'Vaccinazione',
    CERTIFICAZIONE: 'Certificazione',
    CONSULENZA: 'Consulenza'
};

interface PrestazioniAbilitateSelectorProps {
    prestazioni: Prestazione[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    specialties?: string[];
    showAllPrestazioni?: boolean;
    onShowAllChange?: (showAll: boolean) => void;
}

interface CategoriaGroup {
    nome: string;
    prestazioni: Prestazione[];
    selectedCount: number;
}

/**
 * PrestazioniAbilitateSelector
 * 
 * Two-column selector for prestazioni:
 * - Left column: Categories (branche specialistiche) with select all per category
 * - Right column: Prestazioni list for selected category
 * 
 * Features:
 * - Global "Select All" button
 * - Per-category "Select All" checkbox
 * - Search within prestazioni
 * - Visual indication of selection state
 */
export const PrestazioniAbilitateSelector: React.FC<PrestazioniAbilitateSelectorProps> = ({
    prestazioni,
    selectedIds,
    onSelectionChange,
    specialties = [],
    showAllPrestazioni = false,
    onShowAllChange
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTipo, setSelectedTipo] = useState<TipoPrestazione | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // All available tipi - show all, not just those present in prestazioni
    const tipiDisponibili = useMemo(() => {
        const allTipi = Object.keys(TIPO_PRESTAZIONE_LABELS) as TipoPrestazione[];
        return allTipi.sort((a, b) =>
            TIPO_PRESTAZIONE_LABELS[a].localeCompare(TIPO_PRESTAZIONE_LABELS[b])
        );
    }, []);

    // Filter prestazioni based on tipo, then specialties
    const filteredPrestazioni = useMemo(() => {
        let filtered = prestazioni;

        // First filter by tipo if selected
        if (selectedTipo) {
            filtered = filtered.filter(p => p.tipo === selectedTipo);
        }

        // Then filter by specialties if not showing all
        if (!showAllPrestazioni && specialties.length > 0) {
            filtered = filtered.filter(p => {
                const branche = p.brancheSpecialistiche && p.brancheSpecialistiche.length > 0
                    ? p.brancheSpecialistiche
                    : (p.brancaSpecialistica ? [p.brancaSpecialistica] : []);

                if (branche.length === 0) return true;

                return branche.some(branca =>
                    specialties.some(spec =>
                        branca.toLowerCase().includes(spec.toLowerCase()) ||
                        spec.toLowerCase().includes(branca.toLowerCase())
                    )
                );
            });
        }

        return filtered;
    }, [prestazioni, selectedTipo, specialties, showAllPrestazioni]);

    // Group prestazioni by category
    const categorieGroups = useMemo(() => {
        const groups: Record<string, Prestazione[]> = {};
        const uncategorized: Prestazione[] = [];

        filteredPrestazioni.forEach(p => {
            const branche = p.brancheSpecialistiche && p.brancheSpecialistiche.length > 0
                ? p.brancheSpecialistiche
                : (p.brancaSpecialistica ? [p.brancaSpecialistica] : []);

            if (branche.length === 0) {
                uncategorized.push(p);
            } else {
                branche.forEach(branca => {
                    if (!groups[branca]) {
                        groups[branca] = [];
                    }
                    // Avoid duplicates if prestazione belongs to multiple branche
                    if (!groups[branca].find(existing => existing.id === p.id)) {
                        groups[branca].push(p);
                    }
                });
            }
        });

        // Convert to array and sort
        const result: CategoriaGroup[] = Object.entries(groups)
            .map(([nome, prest]) => ({
                nome,
                prestazioni: prest.sort((a, b) => a.nome.localeCompare(b.nome)),
                selectedCount: prest.filter(p => selectedIds.includes(p.id)).length
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome));

        // Add uncategorized if any
        if (uncategorized.length > 0) {
            result.push({
                nome: 'Altre Prestazioni',
                prestazioni: uncategorized.sort((a, b) => a.nome.localeCompare(b.nome)),
                selectedCount: uncategorized.filter(p => selectedIds.includes(p.id)).length
            });
        }

        return result;
    }, [filteredPrestazioni, selectedIds]);

    // Auto-select first category if none selected
    React.useEffect(() => {
        if (!selectedCategory && categorieGroups.length > 0) {
            setSelectedCategory(categorieGroups[0].nome);
        }
    }, [categorieGroups, selectedCategory]);

    // Get counts per tipo
    const tipoStats = useMemo(() => {
        const stats: Record<TipoPrestazione, { total: number; selected: number }> = {} as Record<TipoPrestazione, { total: number; selected: number }>;

        tipiDisponibili.forEach(tipo => {
            const prestazioniTipo = prestazioni.filter(p => p.tipo === tipo);
            stats[tipo] = {
                total: prestazioniTipo.length,
                selected: prestazioniTipo.filter(p => selectedIds.includes(p.id)).length
            };
        });

        return stats;
    }, [prestazioni, tipiDisponibili, selectedIds]);

    // Toggle all prestazioni of a tipo
    const toggleTipo = (tipo: TipoPrestazione) => {
        const tipoIds = prestazioni.filter(p => p.tipo === tipo).map(p => p.id);
        const allSelected = tipoIds.every(id => selectedIds.includes(id));

        if (allSelected) {
            onSelectionChange(selectedIds.filter(id => !tipoIds.includes(id)));
        } else {
            const newSelection = new Set([...selectedIds, ...tipoIds]);
            onSelectionChange(Array.from(newSelection));
        }
    };

    // Get current category prestazioni
    const currentCategoryPrestazioni = useMemo(() => {
        if (!selectedCategory) return [];
        const group = categorieGroups.find(g => g.nome === selectedCategory);
        if (!group) return [];

        if (!searchQuery) return group.prestazioni;

        return group.prestazioni.filter(p =>
            p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.codice.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [selectedCategory, categorieGroups, searchQuery]);

    // Category selection state
    const getCategorySelectionState = (category: CategoriaGroup): 'none' | 'partial' | 'all' => {
        if (category.selectedCount === 0) return 'none';
        if (category.selectedCount === category.prestazioni.length) return 'all';
        return 'partial';
    };

    // Toggle single prestazione
    const togglePrestazione = (prestazioneId: string) => {
        if (selectedIds.includes(prestazioneId)) {
            onSelectionChange(selectedIds.filter(id => id !== prestazioneId));
        } else {
            onSelectionChange([...selectedIds, prestazioneId]);
        }
    };

    // Toggle all prestazioni in a category
    const toggleCategory = (category: CategoriaGroup) => {
        const categoryIds = category.prestazioni.map(p => p.id);
        const allSelected = categoryIds.every(id => selectedIds.includes(id));

        if (allSelected) {
            // Deselect all in category
            onSelectionChange(selectedIds.filter(id => !categoryIds.includes(id)));
        } else {
            // Select all in category
            const newSelection = new Set([...selectedIds, ...categoryIds]);
            onSelectionChange(Array.from(newSelection));
        }
    };

    // Toggle all prestazioni
    const toggleAll = () => {
        const allIds = filteredPrestazioni.map(p => p.id);
        const allSelected = allIds.every(id => selectedIds.includes(id));

        if (allSelected) {
            // Deselect all filtered prestazioni
            onSelectionChange(selectedIds.filter(id => !allIds.includes(id)));
        } else {
            // Select all filtered prestazioni
            const newSelection = new Set([...selectedIds, ...allIds]);
            onSelectionChange(Array.from(newSelection));
        }
    };

    const allFilteredSelected = filteredPrestazioni.length > 0 &&
        filteredPrestazioni.every(p => selectedIds.includes(p.id));

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-teal-600" />
                Prestazioni Abilitate
                {selectedIds.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-sm">
                        {selectedIds.length}
                    </span>
                )}
            </h2>

            {/* Info Banner */}
            {specialties.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start gap-2">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800">
                            Mostrando prestazioni coerenti con le specializzazioni: {specialties.join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-4 mb-4">
                {/* Toggle all prestazioni visibility */}
                {onShowAllChange && (
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showAllPrestazioni}
                            onChange={(e) => onShowAllChange(e.target.checked)}
                            className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        Mostra tutte le prestazioni
                    </label>
                )}

                {/* Select All Button */}
                <button
                    type="button"
                    onClick={toggleAll}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${allFilteredSelected
                            ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    {allFilteredSelected ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
                </button>

                <span className="text-sm text-gray-500">
                    {filteredPrestazioni.length} prestazioni disponibili
                </span>
            </div>

            {/* Three Column Layout - proportional widths: 3 + 3 + 6 = 12 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[400px]">
                {/* First Column - Tipo Prestazione Filter (3/12 = 25%) */}
                <div className="lg:col-span-3 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-700">Tipo</h3>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto">
                        {/* "Tutti" option */}
                        <button
                            type="button"
                            onClick={() => setSelectedTipo(null)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left border-b border-gray-100 transition-colors ${selectedTipo === null ? 'bg-teal-50' : 'hover:bg-gray-50'
                                }`}
                        >
                            <span className={`text-sm ${selectedTipo === null ? 'font-medium text-teal-700' : 'text-gray-700'}`}>
                                Tutti i tipi
                            </span>
                            <span className="text-xs text-gray-500 ml-auto">
                                {prestazioni.length}
                            </span>
                        </button>

                        {tipiDisponibili.map(tipo => {
                            const stats = tipoStats[tipo];
                            const isSelected = selectedTipo === tipo;
                            const allOfTypeSelected = stats.selected === stats.total && stats.total > 0;

                            return (
                                <div
                                    key={tipo}
                                    className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-b-0 transition-colors ${isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'
                                        }${stats.total === 0 ? ' opacity-50' : ''}`}
                                >
                                    {/* Checkbox to select all of this type */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (stats.total > 0) toggleTipo(tipo);
                                        }}
                                        className="flex-shrink-0"
                                        disabled={stats.total === 0}
                                    >
                                        {allOfTypeSelected ? (
                                            <CheckSquare className="h-4 w-4 text-teal-600" />
                                        ) : stats.selected > 0 ? (
                                            <Minus className="h-4 w-4 text-teal-600" />
                                        ) : (
                                            <Square className="h-4 w-4 text-gray-400" />
                                        )}
                                    </button>

                                    {/* Type name - click to filter */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTipo(isSelected ? null : tipo)}
                                        className="flex-1 text-left flex items-center justify-between min-w-0"
                                    >
                                        <span className={`text-sm truncate ${isSelected ? 'font-medium text-teal-700' : 'text-gray-700'
                                            }`}>
                                            {TIPO_PRESTAZIONE_LABELS[tipo]}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1 flex-shrink-0">
                                            {stats.selected}/{stats.total}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Middle Column - Categories (3/12 = 25%) */}
                <div className="lg:col-span-3 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700">Branca Specialistica</h3>
                    </div>
                    <div className="max-h-[350px] overflow-y-auto">
                        {categorieGroups.length > 0 ? (
                            categorieGroups.map(category => {
                                const state = getCategorySelectionState(category);
                                const isSelected = selectedCategory === category.nome;

                                return (
                                    <div
                                        key={category.nome}
                                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${isSelected ? 'bg-teal-50' : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        {/* Category checkbox */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCategory(category);
                                            }}
                                            className="flex-shrink-0"
                                        >
                                            {state === 'all' && (
                                                <CheckSquare className="h-5 w-5 text-teal-600" />
                                            )}
                                            {state === 'partial' && (
                                                <Minus className="h-5 w-5 text-teal-600" />
                                            )}
                                            {state === 'none' && (
                                                <Square className="h-5 w-5 text-gray-400" />
                                            )}
                                        </button>

                                        {/* Category name */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategory(category.nome)}
                                            className="flex-1 text-left flex items-center justify-between min-w-0"
                                        >
                                            <span className={`text-sm truncate ${isSelected ? 'font-medium text-teal-700' : 'text-gray-700'
                                                }`}>
                                                {category.nome}
                                            </span>
                                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                                <span className="text-xs text-gray-500">
                                                    {category.selectedCount}/{category.prestazioni.length}
                                                </span>
                                                {isSelected && (
                                                    <ChevronRight className="h-4 w-4 text-teal-600" />
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-3 py-6 text-center text-gray-500 text-sm">
                                Nessuna categoria disponibile
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Prestazioni (6/12 = 50%) */}
                <div className="lg:col-span-6 border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                    {/* Header with search */}
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm font-medium text-gray-700 flex-shrink-0">
                                {selectedCategory || 'Prestazioni'}
                                {selectedTipo && ` • ${TIPO_PRESTAZIONE_LABELS[selectedTipo]}`}
                            </h3>
                            <div className="flex-1 relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cerca prestazione..."
                                    className="w-full pl-8 pr-3 py-1 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Prestazioni list */}
                    <div className="flex-1 max-h-[350px] overflow-y-auto">
                        {currentCategoryPrestazioni.length > 0 ? (
                            currentCategoryPrestazioni.map(prestazione => {
                                const isSelected = selectedIds.includes(prestazione.id);

                                return (
                                    <button
                                        key={prestazione.id}
                                        type="button"
                                        onClick={() => togglePrestazione(prestazione.id)}
                                        className={`w-full px-3 py-2 text-left border-b border-gray-100 last:border-b-0 flex items-center gap-3 transition-colors ${isSelected
                                                ? 'bg-teal-50 hover:bg-teal-100'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        {/* Checkbox icon */}
                                        {isSelected ? (
                                            <CheckSquare className="h-5 w-5 text-teal-600 flex-shrink-0" />
                                        ) : (
                                            <Square className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                        )}

                                        {/* Prestazione info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium ${isSelected ? 'text-teal-700' : 'text-gray-900'
                                                    }`}>
                                                    {prestazione.codice}
                                                </span>
                                                <span className="text-sm text-gray-600 truncate">
                                                    {prestazione.nome}
                                                </span>
                                            </div>
                                            {prestazione.durataPrevista && (
                                                <span className="text-xs text-gray-500">
                                                    {prestazione.durataPrevista} min
                                                </span>
                                            )}
                                        </div>

                                        {/* Price */}
                                        {prestazione.prezzoBase != null && (
                                            <span className="text-sm text-gray-500 flex-shrink-0">
                                                €{Number(prestazione.prezzoBase).toFixed(2)}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        ) : selectedCategory ? (
                            <div className="px-3 py-8 text-center text-gray-500 text-sm">
                                {searchQuery
                                    ? 'Nessuna prestazione trovata con questi criteri'
                                    : 'Nessuna prestazione in questa categoria'}
                            </div>
                        ) : (
                            <div className="px-3 py-8 text-center text-gray-500 text-sm">
                                Seleziona una categoria per vedere le prestazioni
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selected Summary */}
            {selectedIds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Prestazioni selezionate ({selectedIds.length})
                    </h4>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {selectedIds.slice(0, 10).map(id => {
                            const prestazione = filteredPrestazioni.find(p => p.id === id) ||
                                prestazioni.find(p => p.id === id);
                            if (!prestazione) return null;

                            return (
                                <span
                                    key={id}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs"
                                >
                                    {prestazione.codice}
                                    <button
                                        type="button"
                                        onClick={() => togglePrestazione(id)}
                                        className="hover:text-teal-900"
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                        {selectedIds.length > 10 && (
                            <span className="text-xs text-gray-500">
                                +{selectedIds.length - 10} altre
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrestazioniAbilitateSelector;
