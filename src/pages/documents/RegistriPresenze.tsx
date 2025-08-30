import React, { useState } from 'react';
import { Button } from '../../design-system/atoms/Button';
import { SearchBar } from '../../design-system/molecules';
import { SearchBarControls } from '../../design-system/molecules/SearchBarControls';
import ResizableTable from '../../components/shared/ResizableTable';

interface RegistriPresenzeProps {
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

const RegistriPresenze: React.FC<RegistriPresenzeProps> = ({
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

  // Opzioni di filtro per i registri presenze
  const registriFilterOptions = [
    {
      label: 'Corso',
      value: 'course',
      options: [
        {label: 'Corso A', value: 'corso_a'},
        {label: 'Corso B', value: 'corso_b'},
      ]
    },
    {
      label: 'Formatore',
      value: 'trainer',
      options: [
        {label: 'Mario Rossi', value: 'mario_rossi'},
        {label: 'Luca Bianchi', value: 'luca_bianchi'},
      ]
    }
  ];

  // Opzioni di ordinamento per i registri presenze
  const registriSortOptions = [
    { label: 'Corso', value: 'corso' },
    { label: 'Data', value: 'data' },
    { label: 'Formatore', value: 'formatore' }
  ];

  // Search filter bar component
  const SearchFilterBar = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
      <div className="flex-grow max-w-lg">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Cerca registri presenze..."
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
          onDeleteSelected={() => console.log('Delete selected registri')}
          onExportSelected={() => console.log('Export selected', selectedIds)}
          onClearSelection={() => {
            setSelectedIds([]);
            setSelectionMode(false);
          }}
          filterOptions={registriFilterOptions}
          sortOptions={registriSortOptions}
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
      
      <div className="bg-white rounded-lg shadow p-6 min-h-[200px] flex items-center justify-center text-gray-400">
        {loading ? (
          <div>Caricamento in corso...</div>
        ) : (
          <div>(Qui verrà mostrata la tabella dei registri presenze)</div>
        )}
      </div>
    </div>
  );
};

export default RegistriPresenze;