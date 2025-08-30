import { useContext, useMemo, useCallback } from 'react';
import { ToastContext } from '../../context/ToastContext';
import type { ToastType, ToastOptions } from '../../context/ToastContext';

/**
 * Hook ottimizzato per la gestione dei toast
 * Fornisce API semplificata e funzioni memoizzate
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { toasts, toast, removeToast, clearToasts } = context;

  // Funzioni memoizzate per evitare re-render
  const toastActions = useMemo(() => ({
    // Funzioni base
    add: toast,
    remove: removeToast,
    clear: clearToasts,
    
    // Funzioni specifiche per tipo
    success: (message: string, options?: Omit<ToastOptions, 'type'>) => {
      toast({ message, ...options, type: 'success' });
    },
    
    error: (message: string, options?: Omit<ToastOptions, 'type'>) => {
      toast({ message, ...options, type: 'error' });
    },
    
    warning: (message: string, options?: Omit<ToastOptions, 'type'>) => {
      toast({ message, ...options, type: 'warning' });
    },
    
    info: (message: string, options?: Omit<ToastOptions, 'type'>) => {
      toast({ message, ...options, type: 'info' });
    },
    
    // Funzioni per azioni comuni
    saveSuccess: (entity?: string) => {
      const message = entity ? `${entity} salvato con successo` : 'Salvato con successo';
      toast({ message, type: 'success' });
    },
    
    saveError: (entity?: string, error?: string) => {
      const message = entity 
        ? `Errore nel salvare ${entity}${error ? `: ${error}` : ''}`
        : `Errore nel salvare${error ? `: ${error}` : ''}`;
      toast({ message, type: 'error' });
    },
    
    deleteSuccess: (entity?: string) => {
      const message = entity ? `${entity} eliminato con successo` : 'Eliminato con successo';
      toast({ message, type: 'success' });
    },
    
    deleteError: (entity?: string, error?: string) => {
      const message = entity 
        ? `Errore nell'eliminare ${entity}${error ? `: ${error}` : ''}`
        : `Errore nell'eliminare${error ? `: ${error}` : ''}`;
      toast({ message, type: 'error' });
    },
    
    loadingError: (entity?: string, error?: string) => {
      const message = entity 
        ? `Errore nel caricare ${entity}${error ? `: ${error}` : ''}`
        : `Errore nel caricamento${error ? `: ${error}` : ''}`;
      toast({ message, type: 'error' });
    },
    
    networkError: () => {
      toast({ 
        message: 'Errore di connessione. Verifica la tua connessione internet.', 
        type: 'error',
        duration: 5000
      });
    },
    
    validationError: (message?: string) => {
      toast({ message: message || 'Verifica i dati inseriti', type: 'warning' });
    },
    
    // Funzioni per operazioni asincrone
    promise: async <T>(
      promise: Promise<T>,
      messages: {
        loading?: string;
        success?: string | ((data: T) => string);
        error?: string | ((error: unknown) => string);
      }
    ): Promise<T> => {
      let loadingToastId: string | undefined;
      
      if (messages.loading) {
        toast({ message: messages.loading, type: 'info', duration: 0 });
      }
      
      try {
        const result = await promise;
        
        if (loadingToastId) {
          removeToast(loadingToastId);
        }
        
        if (messages.success) {
          const successMessage = typeof messages.success === 'function' 
            ? messages.success(result)
            : messages.success;
          toast({ message: successMessage, type: 'success' });
        }
        
        return result;
      } catch (error) {
        if (loadingToastId) {
          removeToast(loadingToastId);
        }
        
        if (messages.error) {
          const errorMessage = typeof messages.error === 'function'
            ? messages.error(error)
            : messages.error;
          toast({ message: errorMessage, type: 'error' });
        }
        
        throw error;
      }
    }
    
  }), [toast, removeToast, clearToasts]);

  return {
    toasts,
    ...toastActions
  };
};

export default useToast;