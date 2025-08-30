import { X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useState } from 'react';
import { sanitizeErrorMessage } from '../../utils/errorUtils';

interface ErrorDisplayProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  details?: string[];
  onClose?: () => void;
  className?: string;
}

/**
 * Componente per visualizzare messaggi di errore, avvisi o informazioni
 * in modo elegante e con la possibilità di chiuderli
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  message,
  type = 'error',
  details = [],
  onClose,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // Sanitizza il messaggio di errore per rimuovere riferimenti tecnici
  const sanitizedMessage = sanitizeErrorMessage(message, 'Si è verificato un errore');
  
  // Colori in base al tipo di messaggio
  const colorMap = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-800',
      detailText: 'text-red-700',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      detailText: 'text-amber-700',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      detailText: 'text-blue-700',
      icon: <Info className="h-5 w-5 text-blue-500" />
    }
  };
  
  const { bg, border, text, detailText, icon } = colorMap[type];
  
  return (
    <div className={`${bg} ${border} border rounded-md p-4 ${className}`}>
      <div className="flex justify-between">
        <div className="flex">
          {icon}
          <div className="ml-3">
            <p className={`${text} font-medium`}>{sanitizedMessage}</p>
            
            {details.length > 0 && (
              <div className="mt-1">
                <button
                  type="button"
                  className={`${detailText} text-sm underline`}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Nascondi dettagli' : 'Mostra dettagli'}
                </button>
                
                {showDetails && (
                  <ul className={`${detailText} text-sm mt-2 ml-4 list-disc`}>
                    {details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
        
        {onClose && (
          <button
            type="button"
            className={`${text} hover:opacity-70`}
            onClick={onClose}
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;