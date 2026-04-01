/**
 * SearchableDropdown Component
 * 
 * A reusable dropdown component with search functionality.
 * Extracted from PreventiviPage.tsx as part of Project 46 modularization.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchableDropdownOption {
    value: string;
    label: string;
}

interface SearchableDropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: SearchableDropdownOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
    required?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
    value,
    onChange,
    options,
    placeholder = "Seleziona...",
    searchPlaceholder = "Cerca...",
    className = "",
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(option => option.value === value);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                className={`w-full px-4 py-2 text-left bg-white dark:bg-gray-800 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 flex items-center justify-between ${required && !value ? 'border-gray-300 dark:border-gray-600' : 'border-gray-300 dark:border-gray-600'
                    }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? 'text-gray-900 dark:text-gray-50' : 'text-gray-500 dark:text-gray-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-black/30">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-auto">
                        {/* Option to clear selection */}
                        <button
                            type="button"
                            className={`w-full px-4 py-2 text-left text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 text-sm ${!value ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : ''
                                }`}
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                                setSearchTerm('');
                            }}
                        >
                            {placeholder}
                        </button>
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-700 text-sm ${option.value === value ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-900 dark:text-gray-50'
                                    }`}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                                Nessun risultato trovato
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableDropdown;
export type { SearchableDropdownProps, SearchableDropdownOption };
