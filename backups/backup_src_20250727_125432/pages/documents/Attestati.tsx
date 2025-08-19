import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { apiGet, apiDelete } from '../../services/api';
import { Button } from '../../design-system/atoms/Button';
import { SearchBar } from '../../design-system/molecules';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import ResizableTable from '../../components/shared/ResizableTable';
import { sanitizeErrorMessage } from '../../utils/errorUtils';
import { Company } from '../../types';

interface Attestato {
  id: string;
  employeeId: string;
  scheduledCourseId: string;
  templateId: string;
  url: string;
  fileUrl?: string;
  nomeFile: string;
  numeroProgressivo: number;
  annoProgressivo: number;
  issued: boolean;
  dataGenerazione: string;
  employee: {
    firstName: string;
    lastName: string;
    codice_fiscale: string;
    company?: Company;
  };
  scheduledCourse: {
    course: {
      id: string;
      title: string;
    };
  };
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

interface AttestatiProps {
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
  showGenerateModal: boolean;
  setShowGenerateModal: (show: boolean) => void;
}

const Attestati: React.FC<AttestatiProps> = ({
  searchTerm,
  setSearchTerm,
  activeFilters,
  setActiveFilters,
  activeSort,
  setActiveSort,
  selectionMode,
  setSelectionMode,
  selectedIds,
  setSelectedIds,
  showGenerateModal,
  setShowGenerateModal
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attestati, setAttestati] = useState<Attestato[]>([]);

  useEffect(() => {
    fetchAttestati();
  }, []);

  const fetchAttestati = async () => {
    try {
      setLoading(true);
      const data = await apiGet<Attestato[]>('/api/attestati');
      setAttestati(data as Attestato[]);
    } catch (err) {
      setError('Errore nel caricamento degli attestati');
      console.error('Error fetching attestati:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttestato = async (id: string, close?: () => void) => {
    try {
      await apiDelete(`/api/attestati/${id}`);
      setAttestati(attestati.filter(a => a.id !== id));
      if (close) setTimeout(close, 100);
    } catch (err: any) {
      const userMessage = sanitizeErrorMessage(err, 'Errore durante l\'eliminazione dell\'attestato');
      alert(userMessage);
    }
  };

  const handleDeleteMultipleAttestati = async () => {
    if (selectedIds.length === 0) {
      alert('Nessun attestato selezionato');
      return;
    }
    try {
      // Use the attestatiService for multiple deletion
      const attestatiService = await import('../../services/attestatiService');
      await attestatiService.default.deleteMultipleAttestati(selectedIds);
      setAttestati(attestati.filter(a => !selectedIds.includes(a.id)));
      setSelectedIds([]);
    } catch (err) {
      const userMessage = sanitizeErrorMessage(err, 'Errore durante l\'eliminazione multipla degli attestati');
      alert(userMessage);
    }
  };
  
  // Opzioni di filtro per gli attestati
  const attestatiFilterOptions = [
    {
      label: 'Corso',
      value: 'course',
      options: [...new Set(attestati.map(a => a.scheduledCourse.course.title))].map(title => ({
        label: title,
        value: title
      }))
    },
    {
      label: 'Azienda',
      value: 'company',
      options: [...new Set(attestati.map(a => a.employee.company?.ragioneSociale).filter(Boolean))].map(name => ({
        label: name || '',
        value: name || ''
      }))
    }
  ];

  // Opzioni di ordinamento per gli attestati
  const attestatiSortOptions = [
    { label: 'Corso', value: 'corso' },
    { label: 'Dipendente', value: 'dipendente' },
    { label: 'Azienda', value: 'azienda' },
    { label: 'Data Generazione', value: 'dataGenerazione' }
  ];

  // Configurazione colonne per tabella attestati
  const attestatiColumns = [
    { 
      key: 'actions',
      label: 'Azioni',
      width: 120,
      renderCell: (attestato: Attestato) => (
        <DropdownMenu
          trigger={
            <button type="button" className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors">
              Azioni
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          }
        >
          {(close) => <>
            <a href={`/api${attestato.url}`} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Download</a>
            <button type="button" onClick={e => { e.stopPropagation(); handleDeleteAttestato(attestato.id, close); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Elimina</button>
          </>}
        </DropdownMenu>
      ),
    },
    { 
      key: 'corso',
      label: 'Corso',
      width: 200,
      renderCell: (attestato: Attestato) => attestato.scheduledCourse.course.title
    },
    { 
      key: 'dipendente',
      label: 'Dipendente',
      width: 180,
      renderCell: (attestato: Attestato) => `${attestato.employee.firstName} ${attestato.employee.lastName}`
    },
    { 
      key: 'codice_fiscale',
      label: 'Codice Fiscale',
      width: 150,
      renderCell: (attestato: Attestato) => attestato.employee.codice_fiscale
    },
    { 
      key: 'azienda',
      label: 'Azienda',
      width: 180,
      renderCell: (attestato: Attestato) => attestato.employee.company?.ragioneSociale || '--'
    },
    { 
      key: 'dataGenerazione',
      label: 'Data Generazione',
      width: 150,
      renderCell: (attestato: Attestato) => attestato.dataGenerazione ? new Date(attestato.dataGenerazione).toLocaleDateString('it-IT') : '--'
    },
    { 
      key: 'numeroProgressivo',
      label: 'Numero Progressivo',
      width: 160,
      renderCell: (attestato: Attestato) => (attestato.numeroProgressivo && attestato.annoProgressivo) ? `${attestato.numeroProgressivo}/${attestato.annoProgressivo}` : '--'
    },
    { 
      key: 'issued',
      label: 'Stato',
      width: 120,
      renderCell: (attestato: Attestato) => (
        <span className={`inline-block px-2 py-1 rounded-full text-xs ${attestato.issued ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {attestato.issued ? 'Emesso' : 'In Attesa'}
        </span>
      )
    }
  ];
  
  // Filtra gli attestati in base alla ricerca
  let filteredAttestati = attestati;
  
  if (searchTerm) {
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    filteredAttestati = attestati.filter(
      (attestato) =>
        attestato.scheduledCourse.course.title.toLowerCase().includes(lowercaseSearchTerm) ||
        `${attestato.employee.firstName} ${attestato.employee.lastName}`.toLowerCase().includes(lowercaseSearchTerm) ||
        attestato.employee.codice_fiscale.toLowerCase().includes(lowercaseSearchTerm) ||
        (attestato.employee.company?.ragioneSociale || '').toLowerCase().includes(lowercaseSearchTerm)
    );
  }
  
  // Applica i filtri
  if (activeFilters.course) {
    filteredAttestati = filteredAttestati.filter(
      (attestato) => attestato.scheduledCourse.course.title === activeFilters.course
    );
  }
  
  if (activeFilters.company) {
    filteredAttestati = filteredAttestati.filter(
      (attestato) => attestato.employee.company?.ragioneSociale === activeFilters.company
    );
  }

  // Search filter bar component
  const SearchFilterBar = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
      <div className="flex-grow max-w-lg">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Cerca attestati..."
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
          onDeleteSelected={handleDeleteMultipleAttestati}
          onExportSelected={() => console.log('Export selected', selectedIds)}
          onClearSelection={() => {
            setSelectedIds([]);
            setSelectionMode(false);
          }}
          filterOptions={attestatiFilterOptions}
          sortOptions={attestatiSortOptions}
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
      ) : filteredAttestati.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nessun attestato trovato</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <ResizableTable
            columns={attestatiColumns}
            data={filteredAttestati}
            tableProps={{
              className: "min-w-full divide-y divide-gray-200"
            }}
            tbodyProps={{
              className: "bg-white divide-y divide-gray-200",
              onClick: (e: React.MouseEvent) => {
                const target = e.target as HTMLElement;
                if (target.closest('button,input,a')) return;
                
                const row = target.closest('tr');
                if (!row) return;
                
                const index = parseInt(row.dataset.index || '0', 10);
                const attestato = filteredAttestati[index];
                
                if (attestato && attestato.url) {
                  window.open(`/api${attestato.url}`, '_blank');
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Attestati;