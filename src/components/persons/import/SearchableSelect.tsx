import React, { useState } from 'react';
import { SearchableSelectProps } from '../../../types/import/personImportTypes';

/**
 * Componente riutilizzabile per selezione con ricerca
 * Utilizzato per la selezione di aziende durante la risoluzione dei conflitti
 */
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Seleziona...",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtra le opzioni in base al termine di ricerca
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trova l'opzione selezionata
  const selectedOption = options.find(option => option.value === value);

  // Gestisce la selezione di un'opzione
  const handleOptionSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Gestisce l'apertura/chiusura del dropdown
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Gestisce il cambio del termine di ricerca
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Pulsante principale */}
      <button
        type="button"
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Campo di ricerca */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
          
          {/* Lista opzioni */}
          <div className="max-h-48 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors ${
                    option.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                  }`}
                  onClick={() => handleOptionSelect(option.value)}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <span className="block truncate">{option.label}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">
                Nessun risultato trovato
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay per chiudere il dropdown quando si clicca fuori */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default SearchableSelect;