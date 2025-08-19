import React from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Dropdown, DropdownAction } from '../../molecules/Dropdown';
import { ViewModeToggle } from '../../molecules/ViewModeToggle';
import { cn } from '../../utils';

export interface HeaderPanelProps {
  /** Etichetta per il tipo di entità (es. "corso", "azienda", "formatore") */
  entityType: string;
  /** Genere dell'entità: 'm' per maschile, 'f' per femminile */
  entityGender?: 'm' | 'f';
  /** Modalità di visualizzazione attuale */
  viewMode?: 'table' | 'grid';
  /** Funzione chiamata quando la modalità di visualizzazione cambia */
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  /** Se mostrare il toggle della vista */
  showViewToggle?: boolean;
  /** Funzione chiamata quando il pulsante Aggiungi viene cliccato */
  onAdd?: () => void;
  /** Funzione chiamata quando il pulsante Importa viene cliccato */
  onImport?: () => void;
  /** Funzione chiamata quando il pulsante Download Template viene cliccato */
  onDownloadTemplate?: () => void;
  /** Funzione chiamata quando il pulsante Download CSV viene cliccato */
  onDownloadCsv?: () => void;
  /** Classi personalizzate aggiuntive */
  className?: string;
}

/**
 * Componente HeaderPanel per i controlli principali nell'header della pagina.
 * Include il dropdown per aggiungere elementi con opzioni di importazione e download.
 */
export const HeaderPanel: React.FC<HeaderPanelProps> = ({
  entityType,
  entityGender = 'm',
  viewMode,
  onViewModeChange,
  showViewToggle = true,
  onAdd,
  onImport,
  onDownloadTemplate,
  onDownloadCsv,
  className = '',
}) => {
  // Determina il prefisso corretto in base al genere
  const genderPrefix = entityGender === 'f' ? 'Nuova' : 'Nuovo';
  
  // Capitalizza la prima lettera del tipo di entità
  const entityTypeCapitalized = entityType && typeof entityType === 'string' ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : 'Elemento';
  
  // Opzioni per il dropdown di aggiunta
  const addOptions: DropdownAction[] = [];
  
  // Prima opzione: Aggiungi singolo elemento
  if (onAdd) {
    addOptions.push({
      label: `Aggiungi ${entityType || 'elemento'} singolo`,
      icon: <Plus className="h-4 w-4" />,
      onClick: onAdd,
      variant: 'default',
    });
  }
  
  // Aggiunge l'opzione di importazione se è disponibile
  if (onImport) {
    addOptions.push({
      label: `Importa da CSV`,
      icon: <Upload className="h-4 w-4" />,
      onClick: onImport,
      variant: 'default',
    });
  }
  
  // Aggiunge l'opzione di download template se è disponibile
  if (onDownloadTemplate || onDownloadCsv) {
    addOptions.push({
      label: `Scarica template CSV`,
      icon: <Download className="h-4 w-4" />,
      onClick: onDownloadTemplate || onDownloadCsv || (() => {}),
      variant: 'default',
    });
  }

  // Stile comune per tutti i pulsanti
  const commonButtonStyle = 'h-10';
    
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      {/* Toggle Vista (posizionato a sinistra) */}
      <div className="flex items-center gap-3 order-first">
        {showViewToggle && viewMode && onViewModeChange && (
          <ViewModeToggle
            viewMode={viewMode}
            onChange={onViewModeChange}
            gridLabel="Griglia"
            tableLabel="Tabella"
            className={cn(commonButtonStyle)}
          />
        )}
      </div>
      
      {/* Dropdown Aggiungi con icona Plus e freccia */}
      <div className="flex items-center gap-3 order-last">
        <Dropdown
          variant="primary"
          label={`Aggiungi ${entityTypeCapitalized}`}
          icon={<Plus className="h-4 w-4" />}
          showArrow={true}
          pill={true}
          actions={addOptions}
          className={cn(commonButtonStyle)}
        />
      </div>
    </div>
  );
};

export default HeaderPanel;