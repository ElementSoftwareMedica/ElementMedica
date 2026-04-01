import React, { useContext, useEffect, useState } from 'react';
import { ToastContext, ToastType } from '../../context/ToastContext';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface NotificationsProps {
  className?: string;
}

/**
 * Titoli automatici basati sul tipo (R26: supporto title + auto-title)
 */
const AUTO_TITLES: Record<ToastType, string> = {
  success: 'Operazione completata',
  error: 'Si è verificato un errore',
  warning: 'Attenzione',
  info: 'Informazione',
};

/**
 * Configurazione per tipo di toast: icona, colori, barra progresso
 */
const TYPE_CONFIG: Record<ToastType, {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  bar: string;
  border: string;
  titleColor: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    border: 'border-l-4 border-emerald-500',
    titleColor: 'text-emerald-800 dark:text-emerald-300',
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    iconColor: 'text-red-600 dark:text-red-400',
    bar: 'bg-red-500',
    border: 'border-l-4 border-red-500',
    titleColor: 'text-red-800 dark:text-red-300',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    border: 'border-l-4 border-amber-500',
    titleColor: 'text-amber-800 dark:text-amber-300',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
    border: 'border-l-4 border-blue-500',
    titleColor: 'text-blue-800 dark:text-blue-300',
  },
};

/**
 * Componente notifiche toast — R26
 * 
 * - Posizionato in basso a destra (NON al centro — meno invasivo)
 * - Animazione slide-in da destra
 * - Barra di avanzamento che indica il tempo rimanente
 * - Supporto dark mode
 * - Titolo automatico per tipo, oppure personalizzato
 * - Contatore per messaggi aggregati (×N)
 */
const Notifications: React.FC<NotificationsProps> = ({ className = '' }) => {
  const { toasts, removeToast } = useContext(ToastContext);
  const [visibleToasts, setVisibleToasts] = useState<string[]>([]);

  useEffect(() => {
    toasts.forEach(toast => {
      if (!visibleToasts.includes(toast.id)) {
        // Piccolo delay per triggherare la transizione CSS
        const t = setTimeout(() => {
          setVisibleToasts(prev => [...prev, toast.id]);
        }, 30);
        return () => clearTimeout(t);
      }
    });
    // Rimuovi toast non più presenti dalla lista visible
    setVisibleToasts(prev => prev.filter(id => toasts.some(t => t.id === id)));
  }, [toasts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (toasts.length === 0) return null;

  return (
    <>
      {/* CSS per la barra di avanzamento */}
      <style>{`
        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-progress-bar {
          animation: toastProgress linear forwards;
        }
      `}</style>

      {/*
        Posizione: bottom-right — non invasivo, non copre il contenuto principale.
        flex-col-reverse: i nuovi toast appaiono in basso, i vecchi salgono.
      */}
      <div
        className={`fixed bottom-4 right-4 z-[9998] flex flex-col-reverse gap-2 pointer-events-none w-80 max-w-[calc(100vw-2rem)] ${className}`}
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const isVisible = visibleToasts.includes(toast.id);
          const cfg = TYPE_CONFIG[toast.type];
          const Icon = cfg.icon;
          const title = toast.title ?? AUTO_TITLES[toast.type];

          return (
            <div
              key={toast.id}
              className={`
                pointer-events-auto transform transition-all duration-300 ease-out
                ${isVisible
                  ? 'translate-x-0 opacity-100'
                  : 'translate-x-8 opacity-0'}
              `}
            >
              <div
                className={`
                  relative overflow-hidden rounded-xl
                  bg-white dark:bg-gray-800
                  ${cfg.border}
                  shadow-lg shadow-black/10 dark:shadow-black/30
                  flex items-start gap-3 p-3.5
                `}
                role="alert"
              >
                {/* Barra di avanzamento */}
                {toast.duration > 0 && (
                  <div
                    className={`toast-progress-bar absolute top-0 left-0 h-0.5 ${cfg.bar} opacity-60`}
                    style={{ animationDuration: `${toast.duration}ms` }}
                  />
                )}

                {/* Icona */}
                <div className={`flex-shrink-0 p-1.5 rounded-full ${cfg.iconBg}`}>
                  <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                </div>

                {/* Testo */}
                <div className="flex-grow min-w-0">
                  <p className={`text-xs font-semibold leading-tight ${cfg.titleColor}`}>
                    {title}
                    {toast.count && toast.count > 1 && (
                      <span className="ml-1.5 opacity-70">×{toast.count}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                </div>

                {/* Chiudi */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
                  aria-label="Chiudi notifica"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Notifications;
