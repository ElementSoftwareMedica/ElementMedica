import React, { useContext } from 'react';
import { ToastContext } from '../../context/ToastContext';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface NotificationsProps {
  className?: string;
}

/**
 * Componente riutilizzabile per mostrare notifiche toast nell'interfaccia
 * Utilizza il ToastContext per renderizzare le notifiche
 */
const Notifications: React.FC<NotificationsProps> = ({ className = '' }) => {
  const { toasts, removeToast } = useContext(ToastContext);

  if (toasts.length === 0) return null;

  return (
    <div className={`fixed top-4 left-0 right-0 z-50 flex flex-col items-center w-full pointer-events-none ${className}`}>
      {toasts.map((toast) => {
        // Definizione degli stili in base al tipo di notifica
        const styles = {
          success: 'bg-green-50 border-green-500 text-green-800',
          error: 'bg-red-50 border-red-500 text-red-800',
          warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
          info: 'bg-blue-50 border-blue-500 text-blue-800'
        };

        // Icone per ogni tipo di notifica
        const icons = {
          success: <CheckCircle className="w-5 h-5 text-green-500" />,
          error: <AlertCircle className="w-5 h-5 text-red-500" />,
          warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
          info: <Info className="w-5 h-5 text-blue-500" />
        };

        return (
          <div
            key={toast.id}
            className="w-auto max-w-sm mb-2 pointer-events-auto animate-slideDown"
          >
            <div 
              className={`flex items-center rounded-md shadow-md py-2 px-3 ${styles[toast.type]}`}
              role="alert"
            >
              <div className="flex-shrink-0 mr-2">
                {icons[toast.type]}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 ml-2 text-gray-500 hover:text-gray-700 transition-colors duration-200 pointer-events-auto"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Notifications; 