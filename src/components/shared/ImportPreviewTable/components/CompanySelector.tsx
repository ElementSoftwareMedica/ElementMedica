import React, { useState, useRef, useEffect, useMemo } from 'react';

interface Company {
  id: string;
  name?: string;
  ragioneSociale?: string;
}

interface CompanySelectorProps {
  companies: Company[];
  selectedCompanyId?: string;
  selectedRowsCount: number;
  totalRowsCount: number;
  onCompanySelect: (companyId: string) => void;
}

/**
 * Company selector dropdown component for import preview
 * 
 * Provides company search and selection with visual feedback
 */
export function CompanySelector({
  companies,
  selectedCompanyId,
  selectedRowsCount,
  totalRowsCount,
  onCompanySelect
}: CompanySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter companies by search term
  const filteredCompanies = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return companies;
    return companies.filter(c =>
      (c.ragioneSociale || c.name || '').toLowerCase().includes(term)
    );
  }, [companies, searchTerm]);

  // Handle company selection
  const handleSelect = (companyId: string) => {
    onCompanySelect(companyId);
    setIsOpen(false);
  };

  // Get display name for selected company
  const selectedCompanyName = selectedCompanyId
    ? (companies.find(c => c.id === selectedCompanyId)?.ragioneSociale || 
       companies.find(c => c.id === selectedCompanyId)?.name || 'Seleziona azienda')
    : 'Assegna azienda';

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-full border border-blue-700 cursor-pointer flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
        </svg>
        <span>{selectedCompanyName}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-xl z-[999] overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input
                type="text"
                placeholder="Cerca azienda per nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-600">
              {selectedRowsCount > 0 && selectedRowsCount < totalRowsCount
                ? `Assegna azienda alle ${selectedRowsCount} righe selezionate` 
                : 'Assegna azienda a tutte le righe'}
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <div
                  key={company.id}
                  onClick={() => handleSelect(company.id)}
                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                    selectedCompanyId === company.id ? "bg-blue-100 text-blue-800 border-blue-200" : "text-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{company.ragioneSociale || company.name}</div>
                    </div>
                    {selectedCompanyId === company.id && (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center">
                <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <p className="text-sm text-gray-500">Nessuna azienda trovata</p>
                <p className="text-xs text-gray-400 mt-1">Prova a modificare i criteri di ricerca</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
