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
 * Layout standardizzato per i form di creazione/modifica entità - stile elegante
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
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
      {/* Header - stile elegante con gradiente sottile */}
      <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-blue-50/30 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-xl transition-all"
              aria-label="Torna indietro"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {headerContent}

          {showCloseButton && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-all"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messaggi di errore o successo - stile pillola */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mx-6 mt-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="ml-3 text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mx-6 mt-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="ml-3 text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Contenuto del form */}
      <div className="p-6">
        {children}
      </div>

      {/* Footer con pulsanti - stile elegante */}
      {(onSubmit || onClose) && (
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end space-x-3">
          {onClose && (
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl"
            >
              {cancelLabel}
            </Button>
          )}

          {onSubmit && (
            <Button
              variant="primary"
              onClick={onSubmit}
              disabled={isSaving}
              className="rounded-xl"
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