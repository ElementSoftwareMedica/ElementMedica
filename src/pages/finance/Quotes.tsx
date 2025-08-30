import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { Button } from '../../design-system/atoms/Button';
import { SearchBar } from '../../design-system/molecules';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import ResizableTable from '../../components/shared/ResizableTable';
import { Company } from '../../types';

interface Quote {
  id: string;
  number: string;
  date: string;
  company?: Company;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  expiration_date: string;
}

// DropdownMenu component
const DropdownMenu: React.FC<{ children: (close: () => void) => React.ReactNode; trigger: React.ReactNode }> = ({ children, trigger }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Portal rendering
  const [menuPos, setMenuPos] = useState<{top: number, left: number} | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left" style={{overflow: 'visible'}}>
      <span ref={triggerRef} onClick={() => setOpen(o => !o)}>{trigger}</span>
      {open && menuPos && ReactDOM.createPortal(
        <div ref={menuRef} style={{ position: 'absolute', zIndex: 99999, left: menuPos.left, top: menuPos.top, background: '#fffbe6', minWidth: '8rem', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }} className="w-32 bg-white border border-gray-200 rounded shadow-lg">
          {children(() => setOpen(false))}
        </div>,
        document.body
      )}
    </div>
  );
};

interface QuotesProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeFilters: Record<string, string>;
  setActiveFilters: (filters: Record<string, string>) => void;
  activeSort: { field: string, direction: 'asc' | 'desc' };
  setActiveSort: (sort: { field: string, direction: 'asc' | 'desc' }) => void;
  selectionMode: boolean;
  setSelectionMode: (mode: boolean) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
}

const Quotes: React.FC<QuotesProps> = ({
  searchTerm,
  setSearchTerm,
  activeFilters,
  setActiveFilters,
  activeSort,
  setActiveSort,
  selectionMode,
  setSelectionMode,
  selectedIds,
  setSelectedIds
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      // In futuro qui verrà fatta una chiamata API reale
      // const response = await axios.get<Quote[]>('/api/quotes');
      // setQuotes(response.data);
      setQuotes([]);
      setError(null);
    } catch (err) {
      setError('Errore nel caricamento dei preventivi');
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuote = async (id: string, close?: () => void) => {
    try {
      // In futuro qui verrà fatta una chiamata API reale
      // const res = await axios.delete('/api/quotes/${id}');
      setQuotes(quotes.filter(q => q.id !== id));
      if (close) setTimeout(close, 100);
      alert('Preventivo eliminato con successo');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert('Errore durante l\'eliminazione: ' + errorMessage);
    }
  };
  
  // Opzioni di filtro per i preventivi
  const quoteFilterOptions = [
    {
      label: 'Stato',
      value: 'status',
      options: [
        { label: 'Bozza', value: 'draft' },
        { label: 'Inviato', value: 'sent' },
        { label: 'Accettato', value: 'accepted' },
        { label: 'Rifiutato', value: 'rejected' }
      ]
    },
    {
      label: 'Azienda',
      value: 'company',
      options: [...new Set(quotes.filter(q => q.company).map(q => q.company?.ragioneSociale))].map(name => ({
        label: name || '',
        value: name || ''
      }))
    }
  ];

  // Opzioni di ordinamento per i preventivi
  const quoteSortOptions = [
    { label: 'Numero', value: 'number' },
    { label: 'Data', value: 'date' },
    { label: 'Azienda', value: 'company' },
    { label: 'Importo', value: 'total' },
    { label: 'Scadenza', value: 'expiration_date' }
  ];

  // Configurazione colonne per tabella preventivi
  const quoteColumns = [
    {
      key: 'actions',
      label: 'Azioni',
      width: 120,
      renderCell: (quote: Quote) => (
        <DropdownMenu
          trigger={
            <button type="button" className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors">
              Azioni
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          }
        >
          {(close) => <>
            <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => { console.log('Visualizza'); close(); }}>Visualizza</button>
            <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => { console.log('Modifica'); close(); }}>Modifica</button>
            <button type="button" onClick={() => { handleDeleteQuote(quote.id, close); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Elimina</button>
          </>}
        </DropdownMenu>
      )
    },
    {
      key: 'number',
      label: 'Numero',
      width: 150,
      renderCell: (quote: Quote) => quote.number
    },
    {
      key: 'date',
      label: 'Data',
      width: 120,
      renderCell: (quote: Quote) => new Date(quote.date).toLocaleDateString('it-IT')
    },
    {
      key: 'company',
      label: 'Azienda',
      width: 200,
      renderCell: (quote: Quote) => quote.company?.ragioneSociale || '-'
    },
    {
      key: 'total',
      label: 'Importo',
      width: 120,
      renderCell: (quote: Quote) => `€ ${quote.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      key: 'status',
      label: 'Stato',
      width: 120,
      renderCell: (quote: Quote) => {
        const statusMap: Record<string, { label: string, className: string }> = {
          'draft': { label: 'Bozza', className: 'bg-gray-100 text-gray-800' },
          'sent': { label: 'Inviato', className: 'bg-blue-100 text-blue-800' },
          'accepted': { label: 'Accettato', className: 'bg-green-100 text-green-800' },
          'rejected': { label: 'Rifiutato', className: 'bg-red-100 text-red-800' }
        };
        const { label, className } = statusMap[quote.status] || { label: quote.status, className: 'bg-gray-100' };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'expiration_date',
      label: 'Scadenza',
      width: 120,
      renderCell: (quote: Quote) => new Date(quote.expiration_date).toLocaleDateString('it-IT')
    }
  ];
  
  // Filtra i preventivi in base alla ricerca
  let filteredQuotes = quotes;
  
  if (searchTerm) {
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    filteredQuotes = quotes.filter(
      (quote) =>
        quote.number.toLowerCase().includes(lowercaseSearchTerm) ||
        (quote.company?.ragioneSociale || '').toLowerCase().includes(lowercaseSearchTerm)
    );
  }
  
  // Applica filtri specifici
  if (activeFilters.status) {
    filteredQuotes = filteredQuotes.filter(
      (quote) => quote.status === activeFilters.status
    );
  }
  
  if (activeFilters.company) {
    filteredQuotes = filteredQuotes.filter(
      (quote) => quote.company?.ragioneSociale === activeFilters.company
    );
  }

  // Search filter bar component
  const SearchFilterBar = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
      <div className="flex-grow max-w-lg">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Cerca preventivi..."
        />
      </div>
      
      <div className="flex items-center gap-2">
        <SearchBarControls
          onToggleSelectionMode={() => {
            setSelectionMode(true);
            setSelectedIds([]);
          }}
          isSelectionMode={selectionMode}
          selectedCount={selectedIds.length}
          onDeleteSelected={() => {
            if (selectedIds.length === 0) {
              alert('Nessun preventivo selezionato');
              return;
            }
            if (confirm(`Sei sicuro di voler eliminare ${selectedIds.length} preventivi?`)) {
              setQuotes(quotes.filter(q => !selectedIds.includes(q.id)));
              setSelectedIds([]);
              setSelectionMode(false);
            }
          }}
          onExportSelected={() => console.log('Export selected', selectedIds)}
          onClearSelection={() => {
            setSelectedIds([]);
            setSelectionMode(false);
          }}
          filterOptions={quoteFilterOptions}
          sortOptions={quoteSortOptions}
          onFilterChange={(filters) => {
            setActiveFilters(filters);
          }}
          activeFilters={activeFilters}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
      </div>
    </div>
  );

  return (
    <div>
      <SearchFilterBar />
      
      {loading ? (
        <div className="text-center py-8 text-gray-500">Caricamento...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : filteredQuotes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nessun preventivo trovato</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <ResizableTable
            columns={quoteColumns}
            data={filteredQuotes}
            tableProps={{
              className: "min-w-full divide-y divide-gray-200"
            }}
            tbodyProps={{
              className: "bg-white divide-y divide-gray-200"
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Quotes;