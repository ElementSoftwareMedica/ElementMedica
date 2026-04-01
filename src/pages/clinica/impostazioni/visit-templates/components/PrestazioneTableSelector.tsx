/**
 * PrestazioneTableSelector
 * 
 * Selettore a 3 colonne per prestazioni nel modal template visita.
 * Layout: Tipo | Branca | Prestazioni con search bar integrata.
 * Supporta sia single-select che multi-select.
 * 
 * @module pages/clinica/impostazioni/visit-templates/components
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
    Search, CheckSquare, Square, Minus, ChevronRight,
    Filter, X
} from 'lucide-react';
import type { Prestazione, TipoPrestazione } from '@/services/clinicaApi';

// Labels per i tipi di prestazione
const TIPO_LABELS: Record<TipoPrestazione, string> = {
    VISITA_SPECIALISTICA: 'Visita Specialistica',
    VISITA_MEDICINA_LAVORO: 'Medicina del Lavoro',
    ESAME_STRUMENTALE: 'Esame Strumentale',
    ESAME_LABORATORIO: 'Esame Laboratorio',
    INTERVENTO_AMBULATORIALE: 'Intervento Ambulatoriale',
    VACCINAZIONE: 'Vaccinazione',
    CERTIFICAZIONE: 'Certificazione',
    CONSULENZA: 'Consulenza'
};

interface PrestazioneTableSelectorProps {
    prestazioni: Prestazione[];
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    multiSelect?: boolean;
}

interface BrancaGroup {
    nome: string;
    prestazioni: Prestazione[];
    selectedCount: number;
}

const PrestazioneTableSelector: React.FC<PrestazioneTableSelectorProps> = ({
    prestazioni,
    selectedIds,
    onSelectionChange,
    multiSelect = true
}) => {
    const [selectedTipo, setSelectedTipo] = useState<TipoPrestazione | null>(null);
    const [selectedBranca, setSelectedBranca] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Available tipi with counts
    const tipiWithCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        prestazioni.forEach(p => {
            counts[p.tipo] = (counts[p.tipo] || 0) + 1;
        });
        return (Object.keys(TIPO_LABELS) as TipoPrestazione[])
            .filter(tipo => (counts[tipo] || 0) > 0)
            .map(tipo => ({
                tipo,
                label: TIPO_LABELS[tipo],
                count: counts[tipo] || 0,
                selectedCount: prestazioni.filter(p => p.tipo === tipo && selectedIds.includes(p.id)).length
            }));
    }, [prestazioni, selectedIds]);

    // Filter by tipo
    const tipoFiltered = useMemo(() => {
        if (!selectedTipo) return prestazioni;
        return prestazioni.filter(p => p.tipo === selectedTipo);
    }, [prestazioni, selectedTipo]);

    // Group by branca
    const brancaGroups = useMemo(() => {
        const groups: Record<string, Prestazione[]> = {};
        const uncategorized: Prestazione[] = [];

        tipoFiltered.forEach(p => {
            const branche = p.brancheSpecialistiche?.length
                ? p.brancheSpecialistiche
                : (p.brancaSpecialistica ? [p.brancaSpecialistica] : []);

            if (branche.length === 0) {
                uncategorized.push(p);
            } else {
                branche.forEach(branca => {
                    if (!groups[branca]) groups[branca] = [];
                    if (!groups[branca].find(x => x.id === p.id)) {
                        groups[branca].push(p);
                    }
                });
            }
        });

        const result: BrancaGroup[] = Object.entries(groups)
            .map(([nome, prest]) => ({
                nome,
                prestazioni: prest.sort((a, b) => a.nome.localeCompare(b.nome)),
                selectedCount: prest.filter(p => selectedIds.includes(p.id)).length
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome));

        if (uncategorized.length > 0) {
            result.push({
                nome: 'Altre',
                prestazioni: uncategorized.sort((a, b) => a.nome.localeCompare(b.nome)),
                selectedCount: uncategorized.filter(p => selectedIds.includes(p.id)).length
            });
        }

        return result;
    }, [tipoFiltered, selectedIds]);

    // Auto-select first branca
    useEffect(() => {
        if (!selectedBranca && brancaGroups.length > 0) {
            setSelectedBranca(brancaGroups[0].nome);
        }
    }, [brancaGroups, selectedBranca]);

    // Reset branca when tipo changes
    useEffect(() => {
        setSelectedBranca(null);
    }, [selectedTipo]);

    // Prestazioni for selected branca with search
    const displayPrestazioni = useMemo(() => {
        let list: Prestazione[];
        if (selectedBranca) {
            const group = brancaGroups.find(g => g.nome === selectedBranca);
            list = group?.prestazioni || [];
        } else {
            list = tipoFiltered;
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                p.nome.toLowerCase().includes(q) ||
                p.codice.toLowerCase().includes(q)
            );
        }

        return list;
    }, [selectedBranca, brancaGroups, tipoFiltered, searchQuery]);

    // Toggle single prestazione
    const togglePrestazione = (id: string) => {
        if (multiSelect) {
            if (selectedIds.includes(id)) {
                onSelectionChange(selectedIds.filter(x => x !== id));
            } else {
                onSelectionChange([...selectedIds, id]);
            }
        } else {
            // Single-select: toggle or replace
            onSelectionChange(selectedIds.includes(id) ? [] : [id]);
        }
    };

    // Toggle all in branca
    const toggleBranca = (group: BrancaGroup) => {
        if (!multiSelect) return;
        const ids = group.prestazioni.map(p => p.id);
        const allSelected = ids.every(id => selectedIds.includes(id));
        if (allSelected) {
            onSelectionChange(selectedIds.filter(id => !ids.includes(id)));
        } else {
            onSelectionChange([...new Set([...selectedIds, ...ids])]);
        }
    };

    const getBrancaState = (group: BrancaGroup): 'none' | 'partial' | 'all' => {
        if (group.selectedCount === 0) return 'none';
        if (group.selectedCount === group.prestazioni.length) return 'all';
        return 'partial';
    };

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header with search */}
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 flex-shrink-0">
                    Prestazioni
                    {selectedIds.length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-semibold">
                            {selectedIds.length}
                        </span>
                    )}
                </span>
                <div className="flex-1 relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cerca per nome o codice..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 3-Column Grid */}
            <div className="grid grid-cols-12 min-h-[280px] max-h-[350px]">
                {/* Column 1: Tipo */}
                <div className="col-span-3 border-r border-gray-200 overflow-y-auto">
                    <div className="bg-gray-100/50 px-3 py-1.5 border-b border-gray-200 flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5 text-gray-500" />
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tipo</span>
                    </div>
                    {/* "All" option */}
                    <button
                        type="button"
                        onClick={() => setSelectedTipo(null)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left border-b border-gray-100 transition-colors text-sm ${selectedTipo === null ? 'bg-teal-50 text-teal-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                            }`}
                    >
                        <span>Tutti</span>
                        <span className="text-xs text-gray-400">{prestazioni.length}</span>
                    </button>
                    {tipiWithCounts.map(({ tipo, label, count, selectedCount }) => (
                        <button
                            key={tipo}
                            type="button"
                            onClick={() => setSelectedTipo(selectedTipo === tipo ? null : tipo)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-left border-b border-gray-100 transition-colors text-sm ${selectedTipo === tipo ? 'bg-teal-50 text-teal-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                                }`}
                        >
                            <span className="truncate">{label}</span>
                            <span className="text-xs flex-shrink-0 ml-1">
                                {selectedCount > 0 ? (
                                    <span className="text-teal-600">{selectedCount}/{count}</span>
                                ) : (
                                    <span className="text-gray-400">{count}</span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Column 2: Branca */}
                <div className="col-span-3 border-r border-gray-200 overflow-y-auto">
                    <div className="bg-gray-100/50 px-3 py-1.5 border-b border-gray-200">
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Branca</span>
                    </div>
                    {brancaGroups.length > 0 ? brancaGroups.map(group => {
                        const state = getBrancaState(group);
                        const isActive = selectedBranca === group.nome;

                        return (
                            <div
                                key={group.nome}
                                className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 transition-colors cursor-pointer ${isActive ? 'bg-teal-50' : 'hover:bg-gray-50'
                                    }`}
                            >
                                {multiSelect && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleBranca(group); }}
                                        className="flex-shrink-0"
                                    >
                                        {state === 'all' ? (
                                            <CheckSquare className="h-4 w-4 text-teal-600" />
                                        ) : state === 'partial' ? (
                                            <Minus className="h-4 w-4 text-teal-600" />
                                        ) : (
                                            <Square className="h-4 w-4 text-gray-400" />
                                        )}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setSelectedBranca(group.nome)}
                                    className="flex-1 flex items-center justify-between min-w-0 text-left"
                                >
                                    <span className={`text-sm truncate ${isActive ? 'font-medium text-teal-700' : 'text-gray-700'}`}>
                                        {group.nome}
                                    </span>
                                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                                        <span className="text-xs text-gray-400">
                                            {group.selectedCount > 0 ? (
                                                <span className="text-teal-600">{group.selectedCount}/{group.prestazioni.length}</span>
                                            ) : (
                                                group.prestazioni.length
                                            )}
                                        </span>
                                        {isActive && <ChevronRight className="h-3.5 w-3.5 text-teal-600" />}
                                    </div>
                                </button>
                            </div>
                        );
                    }) : (
                        <div className="px-3 py-6 text-center text-sm text-gray-400">
                            Nessuna branca
                        </div>
                    )}
                </div>

                {/* Column 3: Prestazioni */}
                <div className="col-span-6 overflow-y-auto">
                    <div className="bg-gray-100/50 px-3 py-1.5 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            {selectedBranca || 'Prestazioni'}
                        </span>
                        <span className="text-xs text-gray-400">{displayPrestazioni.length} risultati</span>
                    </div>
                    {displayPrestazioni.length > 0 ? displayPrestazioni.map(p => {
                        const isSelected = selectedIds.includes(p.id);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => togglePrestazione(p.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b border-gray-100 transition-colors ${isSelected ? 'bg-teal-50 hover:bg-teal-100' : 'hover:bg-gray-50'
                                    }`}
                            >
                                {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                ) : (
                                    <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-teal-200 text-teal-800' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {p.codice}
                                        </span>
                                        <span className={`text-sm truncate ${isSelected ? 'font-medium text-teal-700' : 'text-gray-900'}`}>
                                            {p.nome}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-400">
                                    {p.durataPrevista > 0 && <span>{p.durataPrevista} min</span>}
                                    {p.prezzoBase != null && <span>€{Number(p.prezzoBase).toFixed(0)}</span>}
                                </div>
                            </button>
                        );
                    }) : (
                        <div className="px-3 py-8 text-center text-sm text-gray-400">
                            {searchQuery ? 'Nessun risultato per la ricerca' : 'Seleziona una branca'}
                        </div>
                    )}
                </div>
            </div>

            {/* Selected chips */}
            {selectedIds.length > 0 && (
                <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200">
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {selectedIds.map(id => {
                            const p = prestazioni.find(x => x.id === id);
                            if (!p) return null;
                            return (
                                <span
                                    key={id}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs"
                                >
                                    {p.codice} - {p.nome}
                                    <button
                                        type="button"
                                        onClick={() => togglePrestazione(id)}
                                        className="hover:text-teal-900 ml-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PrestazioneTableSelector;
