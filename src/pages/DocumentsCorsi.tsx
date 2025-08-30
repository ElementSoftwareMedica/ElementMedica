import React, { useState } from 'react';
import EntityListLayout from '../components/layouts/EntityListLayout';
import TabNavigation from '../components/shared/TabNavigation';
import RegistriPresenze from './documents/RegistriPresenze';
import LettereIncarico from './documents/LettereIncarico';
import Attestati from './documents/Attestati';
import { GenerateAttestatiModal } from '../components/shared';
import { ViewModeToggle } from '../design-system/molecules/ViewModeToggle';
import { HeaderPanel } from '../design-system/organisms/HeaderPanel';

const tabConfig = {
  registri: {
    title: 'Registri Presenze',
    subtitle: 'Gestisci tutti i registri presenze dei corsi',
    addLabel: 'Aggiungi Registro',
    searchPlaceholder: 'Cerca registri presenze...'
  },
  lettere: {
    title: 'Lettere di Incarico',
    subtitle: 'Gestisci tutte le lettere di incarico per i formatori',
    addLabel: 'Aggiungi Lettera',
    searchPlaceholder: 'Cerca lettere di incarico...'
  },
  attestati: {
    title: 'Attestati',
    subtitle: 'Gestisci tutti gli attestati emessi',
    addLabel: 'Aggiungi Attestato',
    searchPlaceholder: 'Cerca attestati...'
  }
};

const DocumentsCorsi: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'registri' | 'lettere' | 'attestati'>('registri');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState<{ field: string, direction: 'asc' | 'desc' } | null>(null);
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  const handleAddNew = () => {
    if (activeTab === 'attestati') {
      setShowGenerateModal(true);
      } else {
      alert(`Aggiunta di ${activeTab === 'registri' ? 'registro' : 'lettera di incarico'} non implementata`);
    }
  };

  const tabItems = [
    { id: 'registri', label: 'Registri Presenze' },
    { id: 'lettere', label: 'Lettere di Incarico' },
    { id: 'attestati', label: 'Attestati' }
  ];

  return (
    <>
      <div className="mb-4">
        <TabNavigation 
          tabs={tabItems}
          activeTabId={activeTab} 
          onTabChange={(id: string) => {
            setActiveTab(id as 'registri' | 'lettere' | 'attestati');
            setSearchTerm('');
            setActiveFilters({});
            setActiveSort(null);
            setSelectionMode(false);
            setSelectedIds([]);
          }} 
        />
      </div>
      
      <EntityListLayout
        title={tabConfig[activeTab].title}
        subtitle={tabConfig[activeTab].subtitle}
        extraControls={
          <div className="flex items-center gap-2">
            <ViewModeToggle
              viewMode={viewMode}
              onChange={setViewMode}
              gridLabel="Griglia"
              tableLabel="Tabella"
            />
            <HeaderPanel 
              entityType={activeTab === 'registri' ? 'registro' : activeTab === 'lettere' ? 'lettera' : 'attestato'}
              entityGender={activeTab === 'lettere' ? 'f' : 'm'}
              onAdd={handleAddNew}
            />
          </div>
        }
      >
        {activeTab === 'registri' && (
          <RegistriPresenze
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            activeSort={activeSort as { field: string, direction: 'asc' | 'desc' }}
            setActiveSort={setActiveSort}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />
        )}
        
        {activeTab === 'lettere' && (
          <LettereIncarico
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            activeSort={activeSort as { field: string, direction: 'asc' | 'desc' }}
            setActiveSort={setActiveSort}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            showGenerateModal={showGenerateModal}
            setShowGenerateModal={setShowGenerateModal}
          />
        )}
        
        {activeTab === 'attestati' && (
          <Attestati
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            activeSort={activeSort as { field: string, direction: 'asc' | 'desc' }}
            setActiveSort={setActiveSort}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            showGenerateModal={showGenerateModal}
            setShowGenerateModal={setShowGenerateModal}
          />
        )}
      </EntityListLayout>
      
      {showGenerateModal && (
      <GenerateAttestatiModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
          onGenerate={() => {
            // Implementazione della generazione
          }}
        />
      )}
    </>
  );
};

export default DocumentsCorsi;