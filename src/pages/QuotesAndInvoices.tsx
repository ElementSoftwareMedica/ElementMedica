import React, { useState } from 'react';
import EntityListLayout from '../components/layouts/EntityListLayout';
import TabNavigation from '../components/shared/TabNavigation';
import { ViewModeToggle } from '../design-system/molecules/ViewModeToggle';
import { HeaderPanel } from '../design-system/organisms/HeaderPanel';
import Quotes from './finance/Quotes';
import Invoices from './finance/Invoices';

const tabConfig = {
  quotes: {
    title: 'Preventivi',
    subtitle: 'Gestisci tutti i preventivi creati',
    addLabel: 'Aggiungi Preventivo',
    searchPlaceholder: 'Cerca preventivi...'
  },
  invoices: {
    title: 'Fatture',
    subtitle: 'Gestisci tutte le fatture emesse',
    addLabel: 'Aggiungi Fattura',
    searchPlaceholder: 'Cerca fatture...'
  }
};

const QuotesAndInvoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'quotes' | 'invoices'>('quotes');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [activeSort, setActiveSort] = useState<{ field: string, direction: 'asc' | 'desc' }>({ field: '', direction: 'asc' });
  const [selectionMode, setSelectionMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  const handleAddNew = () => {
    alert(`Aggiunta di ${activeTab === 'quotes' ? 'preventivo' : 'fattura'} non implementata`);
  };

  const tabItems = [
    { id: 'quotes', label: 'Preventivi' },
    { id: 'invoices', label: 'Fatture' }
  ];

  return (
    <>
      <div className="mb-4">
        <TabNavigation 
          tabs={tabItems}
          activeTabId={activeTab} 
          onTabChange={(id: string) => {
            setActiveTab(id as 'quotes' | 'invoices');
            setSearchTerm('');
            setActiveFilters({});
            setActiveSort({ field: '', direction: 'asc' });
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
              entityType={activeTab === 'quotes' ? 'preventivo' : 'fattura'}
              entityGender={activeTab === 'quotes' ? 'm' : 'f'}
              onAdd={handleAddNew}
            />
          </div>
        }
      >
        {activeTab === 'quotes' && (
          <Quotes
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            activeSort={activeSort}
            setActiveSort={setActiveSort}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />
        )}

        {activeTab === 'invoices' && (
          <Invoices
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            activeFilters={activeFilters}
            setActiveFilters={setActiveFilters}
            activeSort={activeSort}
            setActiveSort={setActiveSort}
            selectionMode={selectionMode}
            setSelectionMode={setSelectionMode}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />
        )}
      </EntityListLayout>
    </>
  );
};

export default QuotesAndInvoices;