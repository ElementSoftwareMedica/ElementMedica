import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { apiGet, apiDelete } from '../../services/api';
import { Button } from '../../design-system/atoms/Button';
import { SearchBar } from '../../design-system/molecules';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import ResizableTable from '../../components/shared/ResizableTable';
import { Company } from '../../types';

interface LetteraIncarico {
  id: string;
  scheduledCourseId: string;
  trainerId: string;
  nomeFile: string;
  url: string;
  numeroProgressivo: number;
  annoProgressivo?: number;
  dataGenerazione: string;
  scheduledCourse: {
    course: { title: string; };
    sessions: { date: string; trainer?: { firstName: string; lastName: string; }; co_trainer?: { firstName: string; lastName: string; } }[];
    companies: { company: Company }[];
  };
  trainer: {
    firstName: string;
  lastName: string;
    tariffa_oraria?: number;
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

interface LettereIncaricoProps {
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

const LettereIncarico: React.FC<LettereIncaricoProps> = ({
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
  const [lettere, setLettere] = useState<LetteraIncarico[]>([]);

  useEffect(() => {
    fetchLettere();
  }, []);

  const fetchLettere = async () => {
    try {
      setLoading(true);
      const data = await apiGet<LetteraIncarico[]>('/api/lettere-incarico');
      setLettere(data as LetteraIncarico[]);
    } catch (err) {
      setError('Errore nel caricamento delle lettere di incarico');
      console.error('Error fetching lettere:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLettera = async (id: string, close?: () => void) => {
    try {
      await apiDelete(`/api/lettere-incarico/${id}`);
      setLettere(lettere.filter(l => l.id !== id));
      if (close) setTimeout(close, 100);
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + (err?.message || err));
    }
  };

  const handleDeleteMultipleLettere = async () => {
    if (selectedIds.length === 0) {
      alert('Nessuna lettera selezionata');
      return;
    }
    try {
      // Delete one by one since we don't have a bulk delete endpoint
      await Promise.all(selectedIds.map(id => apiDelete(`/api/lettere-incarico/${id}`)));
      setLettere(lettere.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    } catch (err) {
      alert('Errore durante l\'eliminazione multipla');
    }
  };
  
  // Opzioni di filtro per le lettere
  const lettereFilterOptions = [
    {
      label: 'Corso',
      value: 'course',
      options: [...new Set(lettere.map(l => l.scheduledCourse.course.title))].map(title => ({
        label: title,
        value: title
      }))
    },
    {
      label: 'Formatore',
      value: 'trainer',
      options: [...new Set(lettere.map(l => `${l.trainer.firstName} ${l.trainer.lastName}`))].map(name => ({
        label: name,
        value: name
      }))
    }
  ];

  // Opzioni di ordinamento per le lettere
  const lettereSortOptions = [
    { label: 'Corso', value: 'corso' },
    { label: 'Azienda', value: 'azienda' },
    { label: 'Formatore', value: 'formatore' },
    { label: 'Data Generazione', value: 'dataGenerazione' }
  ];

  // Configurazione colonne per tabella lettere
  const lettereColumns = [
    { 
      key: 'actions',
      label: 'Azioni',
      width: 120,
      renderCell: (lettera: LetteraIncarico) => (
        <DropdownMenu
          trigger={
            <button type="button" className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors">
              Azioni
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
          }
        >
          {(close) => <>
            <a href={`/api${lettera.url}`} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Download</a>
            <button type="button" onClick={e => { e.stopPropagation(); handleDeleteLettera(lettera.id, close); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Elimina</button>
          </>}
        </DropdownMenu>
      ),
    },
    { 
      key: 'corso',
      label: 'Corso',
      width: 200,
      renderCell: (lettera: LetteraIncarico) => lettera.scheduledCourse.course.title
    },
    { 
      key: 'azienda',
      label: 'Azienda',
      width: 180,
      renderCell: (lettera: LetteraIncarico) => lettera.scheduledCourse.companies?.[0]?.company?.ragioneSociale || '--'
    },
    { 
      key: 'formatore',
      label: 'Formatore',
      width: 180,
      renderCell: (lettera: LetteraIncarico) => `${lettera.trainer.firstName} ${lettera.trainer.lastName}`
    },
    { 
      key: 'tariffa',
      label: 'Tariffa Oraria',
      width: 120,
      renderCell: (lettera: LetteraIncarico) => lettera.trainer.tariffa_oraria?.toFixed(2) || '--'
    },
    { 
      key: 'compenso',
      label: 'Compenso Totale',
      width: 150,
      renderCell: (lettera: LetteraIncarico) => {
        const tariffa = lettera.trainer.tariffa_oraria?.toFixed(2) || '--';
        const oreTotali = (lettera as any).ORE_TOTALI;
        return tariffa !== '--' && oreTotali ? (parseFloat(tariffa) * parseFloat(oreTotali)).toFixed(2) : '--';
      }
    },
    { 
      key: 'dataGenerazione',
      label: 'Data Generazione',
      width: 150,
      renderCell: (lettera: LetteraIncarico) => lettera.dataGenerazione ? new Date(lettera.dataGenerazione).toLocaleDateString('it-IT') : '--'
    },
    { 
      key: 'numeroProgressivo',
      label: 'Numero Progressivo',
      width: 160,
      renderCell: (lettera: LetteraIncarico) => (lettera.numeroProgressivo != null && lettera.annoProgressivo != null) ? `${lettera.numeroProgressivo}/${lettera.annoProgressivo}` : '--'
    }
  ];
  
  // Filtra le lettere in base alla ricerca
  let filteredLettere = lettere;
  
  if (searchTerm) {
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    filteredLettere = lettere.filter(
      (lettera) =>
        lettera.scheduledCourse.course.title.toLowerCase().includes(lowercaseSearchTerm) ||
        `${lettera.trainer.firstName} ${lettera.trainer.lastName}`.toLowerCase().includes(lowercaseSearchTerm) ||
        (lettera.scheduledCourse.companies?.[0]?.company?.ragioneSociale || '').toLowerCase().includes(lowercaseSearchTerm)
    );
  }
  
  // Applica i filtri
  if (activeFilters.course) {
    filteredLettere = filteredLettere.filter(
      (lettera) => lettera.scheduledCourse.course.title === activeFilters.course
    );
  }
  
  if (activeFilters.trainer) {
    filteredLettere = filteredLettere.filter(
      (lettera) => `${lettera.trainer.firstName} ${lettera.trainer.lastName}` === activeFilters.trainer
    );
  }

  // Search filter bar component
  const SearchFilterBar = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
      <div className="flex-grow max-w-lg">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Cerca lettere di incarico..."
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
          onDeleteSelected={handleDeleteMultipleLettere}
          onExportSelected={() => console.log('Export selected', selectedIds)}
          onClearSelection={() => {
            setSelectedIds([]);
            setSelectionMode(false);
          }}
          filterOptions={lettereFilterOptions}
          sortOptions={lettereSortOptions}
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
      ) : filteredLettere.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nessuna lettera di incarico trovata</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <ResizableTable
            columns={lettereColumns}
            data={filteredLettere}
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
                const lettera = filteredLettere[index];
                
                if (lettera && lettera.url) {
                  window.open(`/api${lettera.url}`, '_blank');
                }
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LettereIncarico;