import React, { useState, useEffect } from 'react';
import { apiGet, apiDelete } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { SearchBar } from '../../design-system/molecules';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import ResizableTable from '../../components/shared/ResizableTable';
import { Company } from '../../types';
import { ActionButton } from '../../components/ui';
import { Download, Trash2 } from 'lucide-react';

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
  const { showToast } = useToast();
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

  const handleDeleteLettera = async (id: string) => {
    try {
      await apiDelete(`/api/lettere-incarico/${id}`);
      setLettere(lettere.filter(l => l.id !== id));
      showToast({ type: 'success', message: 'Lettera eliminata con successo' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'Errore', message: 'Errore durante l\'eliminazione: ' + (err?.message || err) });
    }
  };

  const handleDeleteMultipleLettere = async () => {
    if (selectedIds.length === 0) {
      showToast({ type: 'warning', title: 'Attenzione', message: 'Nessuna lettera selezionata' });
      return;
    }
    try {
      // Delete one by one since we don't have a bulk delete endpoint
      await Promise.all(selectedIds.map(id => apiDelete(`/api/lettere-incarico/${id}`)));
      setLettere(lettere.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    } catch (err) {
      showToast({ type: 'error', title: 'Errore', message: 'Errore durante l\'eliminazione multipla' });
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
        <ActionButton
          theme="blue"
          actions={[
            {
              label: 'Download',
              icon: <Download className="w-4 h-4" />,
              onClick: () => window.open(`/api${lettera.url}`, '_blank'),
            },
            {
              label: 'Elimina',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => handleDeleteLettera(lettera.id),
              variant: 'danger',
            },
          ]}
        />
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
            setActiveFilters(filters as Record<string, string>);
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
      ) : filteredLettere.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nessuna lettera di incarico trovata</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <ResizableTable
            columns={lettereColumns}
            data={filteredLettere}
            onRowClick={(lettera) => {
              if (lettera.url) {
                window.open(`/api${lettera.url}`, '_blank');
              }
            }}
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

export default LettereIncarico;