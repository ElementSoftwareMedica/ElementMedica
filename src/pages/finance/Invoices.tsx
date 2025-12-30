import React, { useState, useEffect } from 'react';
import { SearchBar } from '../../design-system/molecules';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import ResizableTable from '../../components/shared/ResizableTable';
import { sanitizeErrorMessage } from '../../utils/errorUtils';
import { Company } from '../../types';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { useToast } from '../../hooks/useToast';
import { ActionButton } from '../../components/ui';
import { Eye, Edit, Trash2 } from 'lucide-react';

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
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
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

  const handleDeleteInvoice = async (id: string) => {
    try {
      // In futuro qui verrà fatta una chiamata API reale
      // const res = await axios.delete('/api/invoices/${id}');
      setInvoices(invoices.filter(i => i.id !== id));
      showToast({ type: 'success', title: 'Successo', message: 'Fattura eliminata con successo' });
    } catch (err: any) {
      const userMessage = sanitizeErrorMessage(err, 'Errore durante l\'eliminazione della fattura');
      showToast({ type: 'error', title: 'Errore', message: userMessage });
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
        <ActionButton
          theme="blue"
          actions={[
            {
              label: 'Visualizza',
              icon: <Eye className="w-4 h-4" />,
              onClick: () => showToast({ type: 'info', message: 'Visualizzazione fattura non ancora implementata' }),
            },
            {
              label: 'Modifica',
              icon: <Edit className="w-4 h-4" />,
              onClick: () => showToast({ type: 'info', message: 'Modifica fattura non ancora implementata' }),
            },
            {
              label: 'Elimina',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => handleDeleteInvoice(invoice.id),
              variant: 'danger',
            },
          ]}
        />
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
          onDeleteSelected={async () => {
            if (selectedIds.length === 0) {
              showToast({ message: 'Nessuna fattura selezionata', type: 'warning' });
              return;
            }
            const shouldDelete = await confirm({
              title: 'Conferma eliminazione multipla',
              message: `Sei sicuro di voler eliminare ${selectedIds.length} fatture? L'operazione non può essere annullata.`,
              confirmLabel: `Elimina ${selectedIds.length} fatture`,
              variant: 'danger'
            });
            if (shouldDelete) {
              setInvoices(invoices.filter(i => !selectedIds.includes(i.id)));
              setSelectedIds([]);
              setSelectionMode(false);
              showToast({ message: `${selectedIds.length} fatture eliminate con successo`, type: 'success' });
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
            setActiveFilters(filters as Record<string, string>); // Filters are always strings
          }}
          activeFilters={activeFilters}
          activeSort={activeSort}
          onSortChange={(sort) => {
            if (sort && sort.field && sort.direction) {
              setActiveSort({ field: sort.field, direction: sort.direction });
            }
          }}
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
            onRowClick={(invoice) => showToast({ type: 'info', message: `Dettagli fattura ${invoice.number} - funzionalità in arrivo` })}
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