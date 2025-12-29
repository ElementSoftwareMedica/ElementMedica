import React, { useContext, useEffect, useState } from 'react';
import { ToastContext } from '../../context/ToastContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface NotificationsProps {
  className?: string;
}

/**
 * Componente riutilizzabile per mostrare notifiche toast nell'interfaccia
 * Utilizza il ToastContext per renderizzare le notifiche
 * Posizionato al centro della pagina con animazioni eleganti
 */
const Notifications: React.FC<NotificationsProps> = ({ className = '' }) => {
  const { toasts, removeToast } = useContext(ToastContext);
  const [visibleToasts, setVisibleToasts] = useState<string[]>([]);

  // Anima l'entrata dei toast
  useEffect(() => {
    toasts.forEach(toast => {
      if (!visibleToasts.includes(toast.id)) {
        setTimeout(() => {
          setVisibleToasts(prev => [...prev, toast.id]);
        }, 50);
      }
    });
    // Rimuovi toast non più presenti
    setVisibleToasts(prev => prev.filter(id => toasts.some(t => t.id === id)));
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className={`fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none ${className}`}>
      <div className="flex flex-col items-center gap-3 max-w-lg w-full px-4">
        {toasts.map((toast) => {
          const isVisible = visibleToasts.includes(toast.id);

          // Stili eleganti per tipo di notifica
          const styles = {
            success: {
              bg: 'bg-white',
              border: 'border-l-4 border-green-500',
              icon: 'bg-green-100',
              iconColor: 'text-green-600',
              title: 'text-green-800',
              shadow: 'shadow-lg shadow-green-100/50'
            },
            error: {
              bg: 'bg-white',
              border: 'border-l-4 border-red-500',
              icon: 'bg-red-100',
              iconColor: 'text-red-600',
              title: 'text-red-800',
              shadow: 'shadow-lg shadow-red-100/50'
            },
            warning: {
              bg: 'bg-white',
              border: 'border-l-4 border-amber-500',
              icon: 'bg-amber-100',
              iconColor: 'text-amber-600',
              title: 'text-amber-800',
              shadow: 'shadow-lg shadow-amber-100/50'
            },
            info: {
              bg: 'bg-white',
              border: 'border-l-4 border-blue-500',
              icon: 'bg-blue-100',
              iconColor: 'text-blue-600',
              title: 'text-blue-800',
              shadow: 'shadow-lg shadow-blue-100/50'
            }
          };

          // Icone per ogni tipo
          const icons = {
            success: CheckCircle,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info
          };

          const style = styles[toast.type];
          const Icon = icons[toast.type];

          return (
            <div
              key={toast.id}
              className={`
                w-full pointer-events-auto transform transition-all duration-300 ease-out
                ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
              `}
            >
              <div
                className={`
                  flex items-start gap-4 rounded-xl ${style.bg} ${style.border} ${style.shadow}
                  p-4 backdrop-blur-sm
                `}
                role="alert"
              >
                {/* Icona con background circolare */}
                <div className={`flex-shrink-0 p-2 rounded-full ${style.icon}`}>
                  <Icon className={`w-5 h-5 ${style.iconColor}`} />
                </div>

                {/* Contenuto */}
                <div className="flex-grow min-w-0 pt-0.5">
                  <p className={`text-sm font-semibold ${style.title}`}>
                    {toast.type === 'success' ? 'Operazione completata' :
                      toast.type === 'error' ? 'Si è verificato un errore' :
                        toast.type === 'warning' ? 'Attenzione' : 'Informazione'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {toast.message}
                  </p>
                </div>

                {/* Pulsante chiudi */}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                  aria-label="Chiudi"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications; 