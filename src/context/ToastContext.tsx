import React, { createContext, useState, ReactNode, useCallback } from 'react';

/**
 * Tipi di notifica supportati
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Dati di una notifica toast
 */
export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

/**
 * Opzioni per la creazione di una notifica toast
 */
export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

/**
 * Proprietà del contesto Toast
 */
interface ToastContextProps {
  toasts: ToastData[];
  toast: (options: ToastOptions) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

/**
 * Contesto per la gestione delle notifiche toast
 * @example
 * // Per utilizzare il contesto:
 * const { toast } = useContext(ToastContext);
 * 
 * // Per mostrare una notifica:
 * toast({ 
 *   message: 'Operazione completata con successo', 
 *   type: 'success',
 *   duration: 3000
 * });
 */
export const ToastContext = createContext<ToastContextProps>({
  toasts: [],
  toast: () => {},
  removeToast: () => {},
  clearToasts: () => {}
});

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provider per il sistema di notifiche toast
 * Avvolge l'applicazione e fornisce il contesto per le notifiche
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }, []);

  /**
   * Mostra una nuova notifica toast
   * @param options - Opzioni per la notifica
   */
  const toast = useCallback(
    ({ message, type = 'info', duration = 5000 }: ToastOptions) => {
      let standardizedType = type;
      
      // Standardizziamo il tipo in base al contenuto del messaggio
      if (type !== 'success' && type !== 'error') {
        if (message.toLowerCase().includes('success') || 
            message.toLowerCase().includes('completat') || 
            message.toLowerCase().includes('aggiunt') || 
            message.toLowerCase().includes('modificat') || 
            message.toLowerCase().includes('salvat') ||
            message.toLowerCase().includes('importazione completata')) {
          standardizedType = 'success';
        }
        
        if (message.toLowerCase().includes('error') || 
            message.toLowerCase().includes('errore') || 
            message.toLowerCase().includes('fallito') || 
            message.toLowerCase().includes('impossibile') || 
            message.toLowerCase().includes('non riuscito') ||
            message.toLowerCase().includes('non valido')) {
          standardizedType = 'error';
        }
      } else {
        // Se il tipo è esplicitamente specificato, lo rispettiamo
        standardizedType = type;
      }
      
      const id = generateId();
      const newToast: ToastData = { id, message, type: standardizedType, duration };
      
      setToasts((prevToasts) => {
        // Verifica se esiste già un toast simile
        const hasSimilar = prevToasts.some(
          t => t.message === message && t.type === standardizedType
        );
        
        if (hasSimilar) {
          console.log('Toast simile già presente, ignorato:', message);
          return prevToasts;
        }
        
        return [...prevToasts, newToast];
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [generateId]
  );

  /**
   * Rimuove una notifica toast
   * @param id - ID della notifica da rimuovere
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);
  
  /**
   * Rimuove tutte le notifiche toast
   */
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast, clearToasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export default ToastProvider; 