import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { Button } from '../../design-system/atoms/Button';
import { SearchBar } from '../../design-system/molecules';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import ResizableTable from '../../components/shared/ResizableTable';
import { sanitizeErrorMessage } from '../../utils/errorUtils';
import { Company } from '../../types';

interface Invoice {
  id: string;
  number: string;
  date: string;
  company?: Company;
  total: number;
  status: 'draft' | 'issued' | 'paid' | 'overdue';
  payment_date?: string;
  due_date: string;
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

interface InvoicesProps {
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

const Invoices: React.FC<InvoicesProps> = ({
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      // In futuro qui verrà fatta una chiamata API reale
      // const response = await axios.get<Invoice[]>('/api/invoices');
      // setInvoices(response.data);
      setInvoices([]);
      setError(null);
    } catch (err) {
      setError('Errore nel caricamento delle fatture');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string, close?: () => void) => {
    try {
      // In futuro qui verrà fatta una chiamata API reale
      // const res = await axios.delete('/api/invoices/${id}');
      setInvoices(invoices.filter(i => i.id !== id));
      if (close) setTimeout(close, 100);
      alert('Fattura eliminata con successo');
    } catch (err: any) {
      const userMessage = sanitizeErrorMessage(err, 'Errore durante l\'eliminazione della fattura');
      alert(userMessage);
    }
  };
  
  // Opzioni di filtro per le fatture
  const invoiceFilterOptions = [
    {
      label: 'Stato',
      value: 'status',
      options: [
        { label: 'Bozza', value: 'draft' },
        { label: 'Emessa', value: 'issued' },
        { label: 'Pagata', value: 'paid' },
        { label: 'Scaduta', value: 'overdue' }
      ]
    },
    {
      label: 'Azienda',
      value: 'company',
      options: [...new Set(invoices.filter(i => i.company).map(i => i.company?.ragioneSociale))].map(name => ({
        label: name || '',
        value: name || ''
      }))
    }
  ];

  // Opzioni di ordinamento per le fatture
  const invoiceSortOptions = [
    { label: 'Numero', value: 'number' },
    { label: 'Data', value: 'date' },
    { label: 'Azienda', value: 'company' },
    { label: 'Importo', value: 'total' },
    { label: 'Scadenza', value: 'due_date' },
    { label: 'Data Pagamento', value: 'payment_date' }
  ];

  // Configurazione colonne per tabella fatture
  const invoiceColumns = [
    {
      key: 'actions',
      label: 'Azioni',
      width: 120,
      renderCell: (invoice: Invoice) => (
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
            <button type="button" onClick={() => { handleDeleteInvoice(invoice.id, close); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Elimina</button>
          </>}
        </DropdownMenu>
      )
    },
    {
      key: 'number',
      label: 'Numero',
      width: 150,
      renderCell: (invoice: Invoice) => invoice.number
    },
    {
      key: 'date',
      label: 'Data',
      width: 120,
      renderCell: (invoice: Invoice) => new Date(invoice.date).toLocaleDateString('it-IT')
    },
    {
      key: 'company',
      label: 'Azienda',
      width: 200,
      renderCell: (invoice: Invoice) => invoice.company?.ragioneSociale || '-'
    },
    {
      key: 'total',
      label: 'Importo',
      width: 120,
      renderCell: (invoice: Invoice) => `€ ${invoice.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },
    {
      key: 'status',
      label: 'Stato',
      width: 120,
      renderCell: (invoice: Invoice) => {
        const statusMap: Record<string, { label: string, className: string }> = {
          'draft': { label: 'Bozza', className: 'bg-gray-100 text-gray-800' },
          'issued': { label: 'Emessa', className: 'bg-blue-100 text-blue-800' },
          'paid': { label: 'Pagata', className: 'bg-green-100 text-green-800' },
          'overdue': { label: 'Scaduta', className: 'bg-red-100 text-red-800' }
        };
        const { label, className } = statusMap[invoice.status] || { label: invoice.status, className: 'bg-gray-100' };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'due_date',
      label: 'Scadenza',
      width: 120,
      renderCell: (invoice: Invoice) => new Date(invoice.due_date).toLocaleDateString('it-IT')
    },
    {
      key: 'payment_date',
      label: 'Data Pagamento',
      width: 140,
      renderCell: (invoice: Invoice) => invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString('it-IT') : '-'
    }
  ];
  
  // Filtra le fatture in base alla ricerca
  let filteredInvoices = invoices;
  
  if (searchTerm) {
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    filteredInvoices = invoices.filter(
      (invoice) =>
        invoice.number.toLowerCase().includes(lowercaseSearchTerm) ||
        (invoice.company?.ragioneSociale || '').toLowerCase().includes(lowercaseSearchTerm)
    );
  }
  
  // Applica filtri specifici
  if (activeFilters.status) {
    filteredInvoices = filteredInvoices.filter(
      (invoice) => invoice.status === activeFilters.status
    );
  }
  
  if (activeFilters.company) {
    filteredInvoices = filteredInvoices.filter(
      (invoice) => invoice.company?.ragioneSociale === activeFilters.company
    );
  }

  // Search filter bar component
  const SearchFilterBar = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
      <div className="flex-grow max-w-lg">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Cerca fatture..."
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
              alert('Nessuna fattura selezionata');
              return;
            }
            if (confirm(`Sei sicuro di voler eliminare ${selectedIds.length} fatture?`)) {
              setInvoices(invoices.filter(i => !selectedIds.includes(i.id)));
              setSelectedIds([]);
              setSelectionMode(false);
            }
          }}
          onExportSelected={() => console.log('Export selected', selectedIds)}
          onClearSelection={() => {
            setSelectedIds([]);
            setSelectionMode(false);
          }}
          filterOptions={invoiceFilterOptions}
          sortOptions={invoiceSortOptions}
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
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nessuna fattura trovata</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <ResizableTable
            columns={invoiceColumns}
            data={filteredInvoices}
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

export default Invoices;