import { useContext } from 'react';
import { ToastContext, ToastType } from '../context/ToastContext';

/**
 * Opzioni per la creazione di una notifica toast
 */
export interface ToastOptions {
  /** Messaggio da mostrare nella notifica */
  message: string;
  /** Tipo di notifica (success, error, warning, info) */
  type?: ToastType;
  /** Durata in millisecondi (default: 5000) */
  duration?: number;
}

/**
 * Hook per utilizzare il sistema di notifiche toast
 * @returns Funzioni per gestire le notifiche toast
 * @example
 * const { showToast } = useToast();
 * showToast({
 *   message: 'Operazione completata con successo',
 *   type: 'success'
 * });
 */
export const useToast = () => {
  const { toast, removeToast, clearToasts, toasts } = useContext(ToastContext);
  
  return {
    /**
     * Mostra una notifica toast
     * @param options - Opzioni della notifica
     */
    showToast: (options: ToastOptions) => toast(options),
    
    /**
     * Rimuove una notifica specifica
     * @param id - ID della notifica da rimuovere
     */
    removeToast,
    
    /**
     * Rimuove tutte le notifiche
     */
    clearToasts,
    
    /**
     * Array delle notifiche attualmente visualizzate
     */
    toasts
  };
};

export default useToast; 