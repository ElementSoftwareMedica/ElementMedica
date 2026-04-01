import React, { createContext, useState, ReactNode, useCallback, useRef } from 'react';

/**
 * Tipi di notifica supportati
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Dati di una notifica toast
 * R26: aggiunto title, timestamp per progress bar
 */
export interface ToastData {
  id: string;
  message: string;
  /** Titolo opzionale — se assente viene generato automaticamente dal tipo */
  title?: string;
  type: ToastType;
  duration: number;
  /** Timestamp creazione, usato per la progress bar */
  createdAt: number;
  /** Contatore per messaggi aggregati (es: "3 operazioni completate") */
  count?: number;
}

/**
 * Opzioni per la creazione di una notifica toast
 */
export interface ToastOptions {
  message: string;
  /** Titolo personalizzato — se omesso viene generato automaticamente */
  title?: string;
  type?: ToastType;
  duration?: number;
  /** Se true, bypassa deduplicazione e mostra sempre */
  force?: boolean;
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
  toast: () => { },
  removeToast: () => { },
  clearToasts: () => { }
});

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provider per il sistema di notifiche toast
 * 
 * R26: 
 * - Finestra dedup aumentata a 2000ms
 * - Titolo personalizzabile, altrimenti auto-generato
 * - Max 3 toast simultanei (il più vecchio viene rimpiazzato)
 * - Aggregazione: se 3+ toast dello stesso tipo arrivano entro 1s, vengono uniti
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  /** Tracking messaggi recenti per deduplicazione */
  const recentMessagesRef = useRef<Map<string, number>>(new Map());
  const timeoutMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** Finestra temporale per deduplicazione (ms) — R26: aumentata a 2000ms */
  const DEDUP_WINDOW_MS = 2000;
  /** Max toast visibili simultaneamente */
  const MAX_TOASTS = 3;

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }, []);

  const removeToast = useCallback((id: string) => {
    const timeout = timeoutMapRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutMapRef.current.delete(id);
    }
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ message, title, type = 'info', duration = 5000, force = false }: ToastOptions) => {
      let standardizedType = type;

      // Standardizziamo il tipo dal contenuto solo se non specificato
      if (type === 'info') {
        const lower = message.toLowerCase();
        if (lower.includes('success') || lower.includes('completat') || lower.includes('aggiunt') ||
          lower.includes('modificat') || lower.includes('salvat') || lower.includes('importazione completata')) {
          standardizedType = 'success';
        } else if (lower.includes('error') || lower.includes('errore') || lower.includes('fallito') ||
          lower.includes('impossibile') || lower.includes('non riuscito') || lower.includes('non valido')) {
          standardizedType = 'error';
        }
      }

      // Deduplicazione messaggi (R26: finestra 2000ms)
      const messageKey = `${message}::${standardizedType}`;
      const now = Date.now();
      const lastShown = recentMessagesRef.current.get(messageKey);

      if (!force && lastShown && (now - lastShown) < DEDUP_WINDOW_MS) {
        return;
      }

      recentMessagesRef.current.set(messageKey, now);

      // Pulizia periodica della mappa
      if (recentMessagesRef.current.size > 100) {
        const cutoff = now - 15000;
        for (const [key, timestamp] of recentMessagesRef.current.entries()) {
          if (timestamp < cutoff) recentMessagesRef.current.delete(key);
        }
      }

      const id = generateId();
      const newToast: ToastData = {
        id,
        message,
        title,
        type: standardizedType,
        duration,
        createdAt: now,
        count: 1
      };

      setToasts((prevToasts) => {
        // R26: Max MAX_TOASTS toast. Se il limite è raggiunto, rimuovi il più vecchio.
        const updated = [...prevToasts, newToast];
        if (updated.length > MAX_TOASTS) {
          const removed = updated.splice(0, updated.length - MAX_TOASTS);
          removed.forEach(t => {
            const existingTimeout = timeoutMapRef.current.get(t.id);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
              timeoutMapRef.current.delete(t.id);
            }
          });
        }
        return updated;
      });

      if (duration > 0) {
        const timeout = setTimeout(() => {
          removeToast(id);
        }, duration);
        timeoutMapRef.current.set(id, timeout);
      }
    },
    [generateId, removeToast]
  );

  const clearToasts = useCallback(() => {
    // Cancella tutti i timeout attivi
    for (const timeout of timeoutMapRef.current.values()) {
      clearTimeout(timeout);
    }
    timeoutMapRef.current.clear();
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast, clearToasts }}>
      {children}
    </ToastContext.Provider>
  );
};

export default ToastProvider; 