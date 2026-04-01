/**
 * ComuneAutocomplete - Componente autocomplete per comuni italiani
 * 
 * Features:
 * - Ricerca comuni con debounce
 * - Selezione automatica provincia
 * - Supporto tastiera
 * - Mostra provincia/regione nel dropdown
 * - Dropdown renderizzato via portal per evitare problemi con overflow parent
 * 
 * @module components/ui/ComuneAutocomplete
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronDown, X, Check } from 'lucide-react';
import { searchComuniAsync, type ComuneItaliano, PROVINCE_REGIONI } from '../../data/comuniItaliani';

export interface ComuneAutocompleteProps {
    /** Valore corrente (nome comune) */
    value: string;
    /** Callback quando cambia il valore */
    onChange: (value: string) => void;
    /** Callback quando viene selezionato un comune (con tutti i dati) */
    onSelect?: (comune: ComuneItaliano | null) => void;
    /** Placeholder */
    placeholder?: string;
    /** Disabilitato */
    disabled?: boolean;
    /** Errore */
    error?: boolean;
    /** Classe CSS aggiuntiva */
    className?: string;
    /** ID per accessibilità */
    id?: string;
    /** Nome campo */
    name?: string;
    /** Label */
    label?: string;
    /** Mostra provincia selezionata */
    showProvincia?: boolean;
    /** Valore provincia corrente */
    provinciaValue?: string;
    /** Callback per cambio provincia */
    onProvinciaChange?: (provincia: string) => void;
}

/**
 * Componente autocomplete per la selezione di comuni italiani
 * Seleziona automaticamente la provincia quando si sceglie un comune
 */
export const ComuneAutocomplete: React.FC<ComuneAutocompleteProps> = ({
    value,
    onChange,
    onSelect,
    placeholder = 'Cerca comune...',
    disabled = false,
    error = false,
    className = '',
    id,
    name,
    label,
    showProvincia = false,
    provinciaValue = '',
    onProvinciaChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<ComuneItaliano[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [selectedComune, setSelectedComune] = useState<ComuneItaliano | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Aggiorna posizione dropdown quando aperto
    // Usa coordinate viewport (non documento) perché il dropdown è fixed
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom,  // Coordinate viewport per position: fixed
                left: rect.left,
                width: rect.width
            });
        }
    }, [isOpen, suggestions]);

    // Sincronizza searchQuery con value esterno
    useEffect(() => {
        if (value !== searchQuery && !isOpen) {
            setSearchQuery(value);
        }
    }, [value]);

    // Cerca comuni quando cambia la query
    useEffect(() => {
        if (searchQuery.length >= 2 && isOpen) {
            // Usa versione async per garantire caricamento dati
            searchComuniAsync(searchQuery, 15).then(results => {
                setSuggestions(results);
                setHighlightedIndex(-1);
            });
        } else {
            setSuggestions([]);
        }
    }, [searchQuery, isOpen]);

    // Click outside handler - deve escludere sia il container che il dropdown portal
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Verifica che il click non sia nel container principale
            const isInsideContainer = containerRef.current?.contains(target);
            // Verifica che il click non sia nel dropdown (portal)
            const isInsideDropdown = dropdownRef.current?.contains(target);

            if (!isInsideContainer && !isInsideDropdown) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Gestione selezione
    const handleSelect = useCallback((comune: ComuneItaliano) => {
        setSelectedComune(comune);
        setSearchQuery(comune.nome);
        onChange(comune.nome);
        onSelect?.(comune);
        onProvinciaChange?.(comune.provincia);
        setIsOpen(false);
        setSuggestions([]);
    }, [onChange, onSelect, onProvinciaChange]);

    // Gestione tastiera
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                    handleSelect(suggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    }, [isOpen, suggestions, highlightedIndex, handleSelect]);

    // Gestione input
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchQuery(newValue);
        onChange(newValue);
        setSelectedComune(null);
        if (newValue.length >= 2) {
            setIsOpen(true);
        }
    }, [onChange]);

    // Focus handler
    const handleFocus = useCallback(() => {
        if (searchQuery.length >= 2) {
            setIsOpen(true);
        }
    }, [searchQuery]);

    // Clear handler
    const handleClear = useCallback(() => {
        setSearchQuery('');
        onChange('');
        setSelectedComune(null);
        onSelect?.(null);
        onProvinciaChange?.('');
        inputRef.current?.focus();
    }, [onChange, onSelect, onProvinciaChange]);

    // Scroll into view per elemento evidenziato
    useEffect(() => {
        if (highlightedIndex >= 0 && dropdownRef.current) {
            const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    // Regione dalla provincia corrente
    const currentRegione = useMemo(() => {
        if (provinciaValue) {
            return PROVINCE_REGIONI[provinciaValue] || '';
        }
        if (selectedComune) {
            return selectedComune.regione;
        }
        return '';
    }, [provinciaValue, selectedComune]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}

            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400" />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    id={id}
                    name={name}
                    value={searchQuery}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    className={`
                        w-full pl-9 pr-8 py-2 border rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-teal-500
                        transition-colors
                        ${error ? 'border-red-300 bg-red-50' : 'border-gray-300'}
                        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                        ${selectedComune ? 'text-gray-900' : ''}
                    `}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    role="combobox"
                />

                {/* Clear button o chevron */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchQuery && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            tabIndex={-1}
                        >
                            <X className="h-3 w-3 text-gray-400" />
                        </button>
                    )}
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {/* Mostra provincia e regione se selezionato */}
            {showProvincia && (provinciaValue || selectedComune) && (
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    {(provinciaValue || selectedComune?.provincia) && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                            {provinciaValue || selectedComune?.provincia}
                        </span>
                    )}
                    {currentRegione && (
                        <span className="text-gray-400">{currentRegione}</span>
                    )}
                </div>
            )}

            {/* Dropdown suggerimenti - renderizzato via portal per evitare problemi con overflow parent */}
            {isOpen && suggestions.length > 0 && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-xl"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        zIndex: 9999
                    }}
                    role="listbox"
                >
                    {suggestions.map((comune, index) => (
                        <div
                            key={`${comune.code}-${index}`}
                            onClick={() => handleSelect(comune)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`
                                px-3 py-2 cursor-pointer flex items-center justify-between
                                ${index === highlightedIndex ? 'bg-teal-50' : 'hover:bg-gray-50'}
                                ${selectedComune?.code === comune.code ? 'bg-teal-100' : ''}
                            `}
                            role="option"
                            aria-selected={selectedComune?.code === comune.code}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 truncate">
                                        {comune.nome}
                                    </span>
                                    <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 flex-shrink-0">
                                        {comune.provincia}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                    {comune.regione}
                                </div>
                            </div>
                            {selectedComune?.code === comune.code && (
                                <Check className="h-4 w-4 text-teal-600 flex-shrink-0 ml-2" />
                            )}
                        </div>
                    ))}
                </div>,
                document.body
            )}

            {/* Messaggio nessun risultato - renderizzato via portal */}
            {isOpen && searchQuery.length >= 2 && suggestions.length === 0 && createPortal(
                <div
                    className="fixed bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-sm text-gray-500 text-center"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        zIndex: 9999
                    }}
                >
                    Nessun comune trovato per "{searchQuery}"
                </div>,
                document.body
            )}
        </div>
    );
};

export default ComuneAutocomplete;
