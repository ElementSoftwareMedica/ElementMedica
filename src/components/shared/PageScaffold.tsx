import React, { ReactNode } from 'react';
import { 
  Download,
  FileText,
  Plus,
  Upload
} from 'lucide-react';
import EntityListLayout from '../layouts/EntityListLayout';
import {
  SearchBar,
  ViewModeToggle,
  AddEntityDropdown,
  ColumnSelector
} from './ui';
import { FilterPanel } from '../../design-system/organisms/FilterPanel';
import { Dropdown } from '../../design-system/molecules/Dropdown';

export interface PageScaffoldProps {
  /** Titolo della pagina */
  title: string;
  /** Descrizione della pagina */
  description?: string;
  /** Modalità di visualizzazione corrente */
  viewMode: 'table' | 'grid';
  /** Funzione chiamata quando cambia la modalità di visualizzazione */
  onViewModeChange: (mode: 'table' | 'grid') => void;
  /** Valore della barra di ricerca */
  searchValue: string;
  /** Funzione chiamata quando cambia il valore della ricerca */
  onSearchChange: (value: string) => void;
  /** Nome dell'entità singolare (es. "azienda", "corso") */
  entityName: string;
  /** Genere dell'entità ('m' o 'f') */
  entityGender?: 'm' | 'f';
  /** Funzione chiamata quando si vuole creare una nuova entità */
  onCreateNew: () => void;
  /** Funzione chiamata quando si vuole importare */
  onImport?: () => void;
  /** Funzione chiamata quando si vuole scaricare il template */
  onDownloadTemplate?: () => void;
  /** Funzione chiamata quando si vuole esportare tutto */
  onExportAll?: () => void;
  /** Definizioni delle colonne per il selettore di colonne */
  columns?: Array<{key: string; label: string; required?: boolean}>;
  /** Colonne nascoste */
  hiddenColumns?: string[];
  /** Funzione chiamata quando cambia la visibilità delle colonne */
  onColumnVisibilityChange?: (columns: string[]) => void;
  /** Ordinamento delle colonne */
  columnOrder?: Record<string, number>;
  /** Funzione chiamata quando cambia l'ordinamento delle colonne */
  onColumnOrderChange?: (order: Record<string, number>) => void;
  /** Se la pagina è in caricamento */
  loading?: boolean;
  /** Messaggio di errore */
  error?: string;
  /** Funzione per ricaricare i dati */
  onRefresh?: () => void;
  /** Funzione chiamata quando si clicca sul pulsante filtro */
  onFilterClick?: () => void;
  /** Se ci sono filtri attivi */
  filtersActive?: boolean;
  /** Contenuto principale della pagina */
  children: ReactNode;
}

/**
 * Componente di scaffolding per le pagine con layout standard:
 * - Titolo e descrizione
 * - Controlli per la modalità di visualizzazione e azioni
 * - Barra di ricerca e filtri
 * - Contenuto principale (tabella o griglia)
 */
const PageScaffold: React.FC<PageScaffoldProps> = ({
  title,
  description,
  viewMode,
  onViewModeChange,
  searchValue,
  onSearchChange,
  entityName,
  onCreateNew,
  onImport,
  onDownloadTemplate,
  onExportAll,
  columns,
  hiddenColumns,
  onColumnVisibilityChange,
  columnOrder,
  onColumnOrderChange,
  loading,
  error,
  onRefresh,
  onFilterClick,
  filtersActive,
  children
}) => {
  // entityArticle removed - not used
  
  // Opzioni per il dropdown Aggiungi
  const addOptions = [
    {
      label: `Aggiungi ${entityName}`,
      icon: <Plus className="h-4 w-4" />,
      onClick: onCreateNew
    },
    onImport && {
      label: `Importa da CSV`,
      icon: <Upload className="h-4 w-4" />,
      onClick: onImport
    },
    onDownloadTemplate && {
      label: `Scarica template CSV`,
      icon: <FileText className="h-4 w-4" />,
      onClick: onDownloadTemplate
    }
  ].filter(Boolean);
  
  return (
    <EntityListLayout
      title={title}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      headerContent={
        <div className="flex flex-wrap items-center justify-between mb-4">
          <div>
            {description && <p className="text-gray-500">{description}</p>}
          </div>
          
          <div className="flex items-center space-x-3">
            <ViewModeToggle
              viewMode={viewMode}
              onChange={onViewModeChange}
              gridLabel="Griglia"
              tableLabel="Tabella"
            />
            
            <AddEntityDropdown
              label={`Aggiungi ${entityName}`}
              options={addOptions}
              icon={<Plus className="h-4 w-4" />}
              variant="primary"
            />
          </div>
        </div>
      }
      searchBarContent={
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:items-center md:justify-between mb-6">
          <div className="w-full md:max-w-xs">
            <SearchBar
              value={searchValue}
              onChange={onSearchChange}
              placeholder={`Cerca ${entityName}...`}
              onFilterClick={onFilterClick}
              filtersActive={filtersActive}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <FilterPanel />
            
            {columns && onColumnVisibilityChange && (
              <ColumnSelector
                columns={columns}
                hiddenColumns={hiddenColumns || []}
                onChange={onColumnVisibilityChange}
                onOrderChange={onColumnOrderChange}
                columnOrder={columnOrder}
              />
            )}
          </div>
        </div>
      }
    >
      {/* Menu di azioni dropdown per mobile */}
      <div className="mb-4 md:hidden">
        <Dropdown
          variant="outline"
          label="Altre azioni"
          className="w-full"
          actions={[
            onImport && {
              label: 'Importa da CSV',
              icon: <Upload className="h-4 w-4" />,
              onClick: onImport
            },
            onDownloadTemplate && {
              label: 'Scarica template CSV',
              icon: <Download className="h-4 w-4" />,
              onClick: onDownloadTemplate
            },
            onExportAll && {
              label: 'Esporta tutto',
              icon: <Download className="h-4 w-4" />,
              onClick: onExportAll
            }
          ].filter(Boolean)}
        />
      </div>
      
      {/* Contenuto principale */}
      {children}
    </EntityListLayout>
  );
};

export default PageScaffold;