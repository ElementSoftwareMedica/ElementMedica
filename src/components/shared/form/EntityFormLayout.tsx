import React, { ReactNode } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { Button } from '../../../design-system/atoms/Button';

interface EntityFormLayoutProps {
  /** Titolo del form */
  title: string;
  /** Sottotitolo opzionale */
  subtitle?: string;
  /** Funzione chiamata quando il form viene chiuso */
  onClose?: () => void;
  /** Funzione chiamata per tornare indietro */
  onBack?: () => void;
  /** Contenuto del form */
  children: ReactNode;
  /** Se il form sta salvando */
  isSaving?: boolean;
  /** Funzione chiamata quando il form viene inviato */
  onSubmit?: () => void;
  /** Label del pulsante di salvataggio */
  submitLabel?: string;
  /** Label del pulsante di annullamento */
  cancelLabel?: string;
  /** Mostra il pulsante di chiusura a X */
  showCloseButton?: boolean;
  /** Mostra il pulsante di ritorno */
  showBackButton?: boolean;
  /** Errore da visualizzare */
  error?: string;
  /** Messaggio di successo */
  successMessage?: string;
  /** Classi CSS aggiuntive */
  className?: string;
  /** Contenuto extra da visualizzare nell'header */
  headerContent?: ReactNode;
}

/**
 * Layout standardizzato per i form di creazione/modifica entità
 */
const EntityFormLayout: React.FC<EntityFormLayoutProps> = ({
  title,
  subtitle,
  onClose,
  onBack,
  children,
  isSaving = false,
  onSubmit,
  submitLabel = 'Salva',
  cancelLabel = 'Annulla',
  showCloseButton = true,
  showBackButton = false,
  error,
  successMessage,
  className = '',
  headerContent,
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Torna indietro"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {headerContent}
          
          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Messaggi di errore o successo */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Contenuto del form */}
      <div className="p-6">
        {children}
      </div>
      
      {/* Footer con pulsanti */}
      {(onSubmit || onClose) && (
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          {onClose && (
            <Button
              variant="outline"
              shape="pill"
              onClick={onClose}
              disabled={isSaving}
            >
              {cancelLabel}
            </Button>
          )}
          
          {onSubmit && (
            <Button
              variant="primary"
              shape="pill"
              onClick={onSubmit}
              disabled={isSaving}
            >
              {isSaving ? 'Salvataggio in corso...' : submitLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EntityFormLayout;