/**
 * SearchPatient Component
 * Searchable patient selector with autocomplete
 * 
 * Features:
 * - Debounced search
 * - Recent patients
 * - Quick patient creation
 * - Keyboard navigation
 * 
 * @module components/clinica/SearchPatient
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Search,
    User,
    X,
    Plus,
    Clock,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { Paziente } from '../../services/clinicaApi';
import { usePazienteSearch } from '../../hooks/clinica';

// =====================================================
// TYPES
// =====================================================

interface SearchPatientProps {
    value?: Paziente | null;
    onChange: (patient: Paziente | null) => void;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    showRecentPatients?: boolean;
    recentPatients?: Paziente[];
    onCreateNew?: () => void;
    className?: string;
    error?: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const SearchPatient: React.FC<SearchPatientProps> = ({
    value,
    onChange,
    placeholder = 'Cerca paziente per nome, cognome o codice fiscale...',
    disabled = false,
    autoFocus = false,
    showRecentPatients = true,
    recentPatients = [],
    onCreateNew,
    className = '',
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { searchTerm, setSearchTerm, results, isSearching } = usePazienteSearch();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto focus
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
                return;
            }
        }

        const items = searchTerm.length >= 2 ? results : recentPatients;
        const totalItems = items.length + (onCreateNew ? 1 : 0);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => (prev + 1) % totalItems);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => (prev - 1 + totalItems) % totalItems);
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0) {
                    if (focusedIndex < items.length) {
                        handleSelect(items[focusedIndex]);
                    } else if (onCreateNew) {
                        onCreateNew();
                    }
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchTerm('');
                break;
        }
    }, [isOpen, focusedIndex, results, recentPatients, searchTerm, onCreateNew]);

    // Handle selection
    const handleSelect = (patient: Paziente) => {
        onChange(patient);
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
    };

    // Handle clear
    const handleClear = () => {
        onChange(null);
        setSearchTerm('');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    // Render patient item
    const renderPatientItem = (patient: Paziente, index: number, isRecent: boolean = false) => {
        const isFocused = index === focusedIndex;
        const fullName = `${patient.cognome} ${patient.nome}`;

        return (
            <button
                key={patient.id}
                className={`
          w-full flex items-center gap-3 px-4 py-3 text-left
          hover:bg-gray-50 transition-colors
          ${isFocused ? 'bg-blue-50' : ''}
        `}
                onClick={() => handleSelect(patient)}
                onMouseEnter={() => setFocusedIndex(index)}
            >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                        {fullName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                        {patient.codiceFiscale || 'CF non disponibile'}
                        {patient.dataNascita && (
                            <span className="ml-2">
                                • {new Date(patient.dataNascita).toLocaleDateString('it-IT')}
                            </span>
                        )}
                    </p>
                </div>
                {isRecent && (
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
        );
    };

    // Selected patient display
    if (value) {
        return (
            <div className={className}>
                <div className={`
          flex items-center gap-3 p-3 bg-white border rounded-lg
          ${error ? 'border-red-300' : 'border-gray-200'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                            {value.cognome} {value.nome}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                            {value.codiceFiscale || 'CF non disponibile'}
                        </p>
                    </div>
                    {!disabled && (
                        <button
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={handleClear}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }

    const items = searchTerm.length >= 2 ? results : recentPatients;
    const showCreateNew = onCreateNew && searchTerm.length >= 2;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Input */}
            <div className={`
        relative flex items-center bg-white border rounded-lg
        ${isOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200'}
        ${error ? 'border-red-300' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
                <Search className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        setFocusedIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full px-3 py-3 bg-transparent outline-none text-gray-900 placeholder-gray-500 disabled:cursor-not-allowed"
                />
                {isSearching && (
                    <Loader2 className="w-5 h-5 text-blue-500 mr-3 animate-spin" />
                )}
                {searchTerm && !isSearching && (
                    <button
                        className="p-1 mr-2 text-gray-400 hover:text-gray-600 rounded"
                        onClick={() => {
                            setSearchTerm('');
                            setFocusedIndex(-1);
                        }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {/* No search term - show recent */}
                    {searchTerm.length < 2 && showRecentPatients && recentPatients.length > 0 && (
                        <>
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Pazienti Recenti
                                </p>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {recentPatients.map((patient, index) =>
                                    renderPatientItem(patient, index, true)
                                )}
                            </div>
                        </>
                    )}

                    {/* Search results */}
                    {searchTerm.length >= 2 && (
                        <>
                            {isSearching ? (
                                <div className="px-4 py-8 text-center">
                                    <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
                                    <p className="text-sm text-gray-500">Ricerca in corso...</p>
                                </div>
                            ) : results.length > 0 ? (
                                <>
                                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                        <p className="text-xs font-medium text-gray-500">
                                            {results.length} risultat{results.length === 1 ? 'o' : 'i'} per "{searchTerm}"
                                        </p>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {results.map((patient, index) =>
                                            renderPatientItem(patient, index)
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="px-4 py-8 text-center">
                                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">
                                        Nessun paziente trovato per "{searchTerm}"
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Create new option */}
                    {showCreateNew && (
                        <button
                            className={`
                w-full flex items-center gap-3 px-4 py-3 text-left border-t border-gray-100
                hover:bg-gray-50 transition-colors
                ${focusedIndex === items.length ? 'bg-blue-50' : ''}
              `}
                            onClick={onCreateNew}
                            onMouseEnter={() => setFocusedIndex(items.length)}
                        >
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <Plus className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-green-700">
                                    Crea nuovo paziente
                                </p>
                                <p className="text-sm text-gray-500">
                                    Aggiungi "{searchTerm}" come nuovo paziente
                                </p>
                            </div>
                        </button>
                    )}

                    {/* Empty state for no input */}
                    {searchTerm.length < 2 && (!showRecentPatients || recentPatients.length === 0) && (
                        <div className="px-4 py-8 text-center">
                            <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                                Digita almeno 2 caratteri per cercare
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchPatient;
