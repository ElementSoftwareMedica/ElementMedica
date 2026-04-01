import { useContext, useCallback } from 'react';
import { ToastContext, ToastType } from '../context/ToastContext';

/**
 * Opzioni per la creazione di una notifica toast
 * 
 * P52 Session #11c: Aggiunto force per bypassare deduplicazione
 */
export interface ToastOptions {
  /** Messaggio da mostrare nella notifica */
  message: string;
  /** Titolo opzionale della notifica */
  title?: string;
  /** Tipo di notifica (success, error, warning, info) */
  type?: ToastType;
  /** Durata in millisecondi (default: 5000) */
  duration?: number;
  /** 
   * P52 Session #11c: Se true, bypassa deduplicazione e mostra sempre
   * Utile per notifiche che devono sempre apparire (es: conferme utente)
   * @default false
   */
  force?: boolean;
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

  const showToast = useCallback((options: ToastOptions) => toast(options), [toast]);

  return {
    /**
     * Mostra una notifica toast
     * @param options - Opzioni della notifica
     */
    showToast,

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