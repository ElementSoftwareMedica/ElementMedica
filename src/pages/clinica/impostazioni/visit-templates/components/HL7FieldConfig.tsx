/**
 * P65 - HL7 Field Configuration Component
 * 
 * Componente per configurare il mapping HL7/LOINC di un campo del template visita.
 * Permette ai medici di associare i loro campi personalizzati a codici LOINC standard
 * per garantire compatibilità con l'export CDA/FSE 2.0.
 * 
 * @module components/HL7FieldConfig
 * @project P65 - FSE Integration Predisposition
 * 
 * FIX: Usa React Portal per il dropdown per evitare problemi di z-index 
 * con container overflow-hidden nel modal parent
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Search,
    Check,
    X,
    Info,
    FileCode2,
    ChevronDown,
    ChevronRight,
    Sparkles,
    ExternalLink
} from 'lucide-react';
import {
    LOINC_CATALOG,
    CDA_SECTIONS,
    searchLoinc,
    getLoincGroupedBySection,
    getLoincByCode,
    type LOINCEntry,
    type CDASection
} from '../../../../../constants/loincCatalog';
import type { VisitFieldHL7Config } from '../../../../../services/clinicaApi';

// ============================================
// TYPES
// ============================================

interface HL7FieldConfigProps {
    /** Configurazione HL7 attuale del campo */
    hl7Config?: VisitFieldHL7Config;
    /** Label del campo (per suggerimenti intelligenti) */
    fieldLabel: string;
    /** Tipo del campo (per filtrare suggerimenti) */
    fieldType: string;
    /** Callback quando la configurazione cambia */
    onChange: (config: VisitFieldHL7Config | undefined) => void;
    /** Se mostrare in modalità compatta */
    compact?: boolean;
}

// ============================================
// HELPER: Suggerimenti Intelligenti
// ============================================

/**
 * Suggerisce codici LOINC basandosi sul label e tipo del campo
 */
const getSuggestedCodes = (fieldLabel: string, fieldType: string): LOINCEntry[] => {
    const label = fieldLabel.toLowerCase();
    const suggestions: LOINCEntry[] = [];

    // Keywords mapping per suggerimenti automatici
    const keywordMap: Record<string, string[]> = {
        '10164-2': ['anamnesi', 'storia', 'patologica', 'prossima', 'presente'],
        '11348-0': ['remota', 'pregressa', 'passata'],
        '10157-6': ['familiare', 'famiglia'],
        '29762-2': ['lavorativa', 'sociale', 'occupazionale', 'lavoro'],
        '29545-1': ['esame obiettivo', 'generale', 'obiettività'],
        '8302-2': ['altezza', 'statura'],
        '29463-7': ['peso', 'weight'],
        '39156-5': ['bmi', 'massa corporea'],
        '8480-6': ['sistolica', 'pressione alta', 'massima'],
        '8462-4': ['diastolica', 'pressione bassa', 'minima'],
        '8867-4': ['frequenza cardiaca', 'battiti', 'polso', 'fc'],
        '9279-1': ['frequenza respiratoria', 'respiro', 'fr'],
        '8310-5': ['temperatura', 'febbre'],
        '2708-6': ['saturazione', 'spo2', 'ossigeno'],
        '10223-6': ['cardiologico', 'cuore', 'cardiaco'],
        '10210-3': ['toracico', 'polmoni', 'torace', 'respiratorio'],
        '10199-8': ['addominale', 'addome'],
        '10205-3': ['neurologico', 'neuro'],
        '32434-0': ['muscolo', 'scheletrico', 'articolazioni'],
        '29548-5': ['diagnosi'],
        '10160-0': ['terapia', 'farmaci'],
        '48765-2': ['allergie', 'reazioni'],
        '55110-1': ['conclusioni', 'conclusione'],
        '11323-3': ['idoneità', 'giudizio'],
        '30954-2': ['ecg', 'elettrocardiogramma'],
        '11524-6': ['spirometria'],
        '28568-4': ['audiometria', 'udito'],
        '79066-7': ['visiotest', 'vista', 'visivo']
    };

    // Cerca match nel label
    for (const [code, keywords] of Object.entries(keywordMap)) {
        if (keywords.some(kw => label.includes(kw))) {
            const entry = getLoincByCode(code);
            if (entry) {
                suggestions.push(entry);
            }
        }
    }

    // Se tipo numerico, suggerisci parametri vitali
    if (fieldType === 'NUMBER' || fieldType === 'VITALS') {
        const vitalCodes = ['8302-2', '29463-7', '39156-5', '8480-6', '8462-4', '8867-4', '9279-1', '8310-5', '2708-6'];
        vitalCodes.forEach(code => {
            if (!suggestions.find(s => s.code === code)) {
                const entry = getLoincByCode(code);
                if (entry) suggestions.push(entry);
            }
        });
    }

    // Limita a 5 suggerimenti
    return suggestions.slice(0, 5);
};

// ============================================
// MAIN COMPONENT
// ============================================

const HL7FieldConfig: React.FC<HL7FieldConfigProps> = ({
    hl7Config,
    fieldLabel,
    fieldType,
    onChange,
    compact = false
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<CDASection>>(new Set());

    // Ref per il trigger button e posizione dropdown
    const triggerRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    // Calcola posizione dropdown quando si apre
    useEffect(() => {
        if (isSearchOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Posiziona sotto il trigger
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4, // 4px gap
                left: rect.left + window.scrollX
            });
        }
    }, [isSearchOpen]);

    // Chiudi dropdown se click fuori
    useEffect(() => {
        if (!isSearchOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Controlla se il click è fuori dal dropdown e dal trigger
            if (!target.closest('[data-hl7-dropdown]') && !target.closest('[data-hl7-trigger]')) {
                setIsSearchOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSearchOpen]);

    // Codice selezionato
    const selectedEntry = hl7Config?.code ? getLoincByCode(hl7Config.code) : undefined;

    // Suggerimenti basati sul campo
    const suggestions = useMemo(() =>
        getSuggestedCodes(fieldLabel, fieldType),
        [fieldLabel, fieldType]
    );

    // Risultati ricerca
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return searchLoinc(searchQuery);
    }, [searchQuery]);

    // Catalogo raggruppato per sezione
    const groupedCatalog = useMemo(() => getLoincGroupedBySection(), []);

    // Toggle sezione espansa
    const toggleSection = useCallback((section: CDASection) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    }, []);

    // Seleziona un codice LOINC
    const handleSelectCode = useCallback((entry: LOINCEntry) => {
        onChange({
            code: entry.code,
            codeSystem: entry.codeSystem || 'LOINC',
            section: entry.section,
            displayName: entry.displayName,
            unit: entry.unit,
            includeInCDA: true
        });
        setIsSearchOpen(false);
        setSearchQuery('');
    }, [onChange]);

    // Rimuovi configurazione HL7
    const handleRemove = useCallback(() => {
        onChange(undefined);
    }, [onChange]);

    // Toggle inclusione CDA
    const handleToggleInclude = useCallback(() => {
        if (hl7Config) {
            onChange({
                ...hl7Config,
                includeInCDA: !hl7Config.includeInCDA
            });
        }
    }, [hl7Config, onChange]);

    // ============================================
    // RENDER - Compact Mode (badge inline)
    // ============================================
    if (compact && !isSearchOpen) {
        return (
            <div className="inline-flex items-center gap-1">
                {selectedEntry ? (
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-colors ${hl7Config?.includeInCDA !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 line-through'
                            }`}
                        title={`${selectedEntry.displayName} (${selectedEntry.code})`}
                    >
                        <FileCode2 className="w-3 h-3" />
                        <span className="font-mono">{selectedEntry.code}</span>
                    </button>
                ) : (
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full border border-dashed border-gray-300 hover:border-emerald-300 transition-colors"
                        title="Configura codice HL7/LOINC per export FSE"
                    >
                        <FileCode2 className="w-3 h-3" />
                        <span>HL7</span>
                    </button>
                )}
            </div>
        );
    }

    // ============================================
    // RENDER - Full Mode (dropdown/modal)
    // ============================================
    return (
        <div className="relative" ref={triggerRef} data-hl7-trigger>
            {/* Trigger button / Selected display */}
            <div className="flex items-center gap-2">
                {selectedEntry ? (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${CDA_SECTIONS[selectedEntry.section].color}`}>
                        <span className="text-lg">{CDA_SECTIONS[selectedEntry.section].icon}</span>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                                {selectedEntry.displayName}
                            </div>
                            <div className="text-xs opacity-70 font-mono">
                                LOINC: {selectedEntry.code}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleToggleInclude}
                                className={`p-1 rounded transition-colors ${hl7Config?.includeInCDA !== false
                                        ? 'text-emerald-600 hover:bg-emerald-100'
                                        : 'text-gray-400 hover:bg-gray-200'
                                    }`}
                                title={hl7Config?.includeInCDA !== false ? 'Incluso in export CDA' : 'Escluso da export CDA'}
                            >
                                <Check className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                title="Cambia codice"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleRemove}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Rimuovi configurazione HL7"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                        <FileCode2 className="w-4 h-4" />
                        <span>Configura codice HL7/LOINC per export FSE</span>
                    </button>
                )}
            </div>

            {/* Search/Selection Panel - Rendered via Portal to avoid z-index issues with modal overflow */}
            {isSearchOpen && createPortal(
                <div
                    className="fixed w-[500px] max-h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        zIndex: 9999 // Alto z-index per stare sopra il modal
                    }}
                    data-hl7-dropdown
                >
                    {/* Header */}
                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <FileCode2 className="w-5 h-5 text-emerald-600" />
                                <span className="font-semibold text-gray-800">Mapping HL7/LOINC</span>
                            </div>
                            <button
                                onClick={() => setIsSearchOpen(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cerca codice LOINC o descrizione..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-[380px] overflow-y-auto">
                        {/* Suggerimenti intelligenti */}
                        {!searchQuery && suggestions.length > 0 && (
                            <div className="p-3 border-b border-gray-100 bg-amber-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-semibold text-amber-700">
                                        Suggeriti per "{fieldLabel}"
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.map(entry => (
                                        <button
                                            key={entry.code}
                                            onClick={() => handleSelectCode(entry)}
                                            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white border border-amber-200 rounded-full hover:bg-amber-100 hover:border-amber-300 transition-colors"
                                        >
                                            <span>{CDA_SECTIONS[entry.section].icon}</span>
                                            <span className="font-medium">{entry.displayName}</span>
                                            <span className="text-amber-600 font-mono">{entry.code}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Risultati ricerca */}
                        {searchQuery && searchResults.length > 0 && (
                            <div className="p-2">
                                {searchResults.map(entry => (
                                    <button
                                        key={entry.code}
                                        onClick={() => handleSelectCode(entry)}
                                        className="w-full flex items-center gap-3 p-2 text-left rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <span className="text-xl">{CDA_SECTIONS[entry.section].icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-gray-800 truncate">
                                                {entry.displayName}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-mono">{entry.code}</span>
                                                <span className={`px-1.5 py-0.5 rounded ${CDA_SECTIONS[entry.section].color}`}>
                                                    {CDA_SECTIONS[entry.section].label}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {searchQuery && searchResults.length === 0 && (
                            <div className="p-6 text-center text-gray-500">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Nessun risultato per "{searchQuery}"</p>
                            </div>
                        )}

                        {/* Catalogo completo (quando non si cerca) */}
                        {!searchQuery && (
                            <div className="p-2">
                                {(Object.keys(CDA_SECTIONS) as CDASection[]).map(section => (
                                    <div key={section} className="mb-1">
                                        <button
                                            onClick={() => toggleSection(section)}
                                            className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${expandedSections.has(section)
                                                    ? CDA_SECTIONS[section].color
                                                    : 'hover:bg-gray-50'
                                                }`}
                                        >
                                            {expandedSections.has(section) ? (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-gray-400" />
                                            )}
                                            <span className="text-lg">{CDA_SECTIONS[section].icon}</span>
                                            <span className="text-sm font-medium">{CDA_SECTIONS[section].label}</span>
                                            <span className="text-xs text-gray-400 ml-auto">
                                                {groupedCatalog[section].length} codici
                                            </span>
                                        </button>

                                        {expandedSections.has(section) && (
                                            <div className="ml-8 mt-1 space-y-0.5">
                                                {groupedCatalog[section].map(entry => (
                                                    <button
                                                        key={entry.code}
                                                        onClick={() => handleSelectCode(entry)}
                                                        className={`w-full flex items-center gap-2 p-2 text-left rounded-lg hover:bg-gray-100 transition-colors ${selectedEntry?.code === entry.code
                                                                ? 'bg-emerald-50 ring-1 ring-emerald-300'
                                                                : ''
                                                            }`}
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm text-gray-800 truncate">
                                                                {entry.displayName}
                                                            </div>
                                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                                <span className="font-mono">{entry.code}</span>
                                                                {entry.unit && (
                                                                    <span className="px-1 bg-gray-100 rounded">
                                                                        {entry.unit}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {selectedEntry?.code === entry.code && (
                                                            <Check className="w-4 h-4 text-emerald-600" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Info className="w-3 h-3" />
                            <span>I codici LOINC permettono l'export verso FSE 2.0</span>
                        </div>
                        <a
                            href="https://loinc.org/search/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700"
                        >
                            <ExternalLink className="w-3 h-3" />
                            Cerca su LOINC.org
                        </a>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default HL7FieldConfig;
