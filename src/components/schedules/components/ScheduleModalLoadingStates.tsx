import React from 'react';
import { Loader2, Calendar, Users, FileText, Clock } from 'lucide-react';

// Tipi per i diversi stati di loading
type LoadingType = 
  | 'initial' 
  | 'form-validation' 
  | 'data-fetch' 
  | 'save' 
  | 'step-transition'
  | 'course-selection'
  | 'company-selection'
  | 'attendance-calculation'
  | 'document-generation';

interface LoadingStateProps {
  type: LoadingType;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
}

// Configurazioni per ogni tipo di loading
const LOADING_CONFIGS: Record<LoadingType, {
  icon: React.ComponentType<{ className?: string }>;
  defaultMessage: string;
  color: string;
  duration?: string;
}> = {
  'initial': {
    icon: Loader2,
    defaultMessage: 'Caricamento modal...',
    color: 'text-blue-500',
    duration: 'Pochi secondi'
  },
  'form-validation': {
    icon: Loader2,
    defaultMessage: 'Validazione dati...',
    color: 'text-green-500',
    duration: 'Istantaneo'
  },
  'data-fetch': {
    icon: Loader2,
    defaultMessage: 'Caricamento dati...',
    color: 'text-blue-500',
    duration: '2-3 secondi'
  },
  'save': {
    icon: Loader2,
    defaultMessage: 'Salvataggio in corso...',
    color: 'text-green-500',
    duration: '3-5 secondi'
  },
  'step-transition': {
    icon: Loader2,
    defaultMessage: 'Passaggio al prossimo step...',
    color: 'text-blue-500',
    duration: 'Istantaneo'
  },
  'course-selection': {
    icon: Calendar,
    defaultMessage: 'Caricamento corsi disponibili...',
    color: 'text-purple-500',
    duration: '1-2 secondi'
  },
  'company-selection': {
    icon: Users,
    defaultMessage: 'Caricamento aziende e persone...',
    color: 'text-orange-500',
    duration: '2-3 secondi'
  },
  'attendance-calculation': {
    icon: Clock,
    defaultMessage: 'Calcolo presenze...',
    color: 'text-indigo-500',
    duration: '1 secondo'
  },
  'document-generation': {
    icon: FileText,
    defaultMessage: 'Generazione documenti...',
    color: 'text-red-500',
    duration: '3-5 secondi'
  }
};

// Dimensioni per i diversi size
const SIZE_CONFIGS = {
  sm: {
    icon: 'h-4 w-4',
    text: 'text-sm',
    container: 'p-2'
  },
  md: {
    icon: 'h-6 w-6',
    text: 'text-base',
    container: 'p-4'
  },
  lg: {
    icon: 'h-8 w-8',
    text: 'text-lg',
    container: 'p-6'
  }
};

// Componente principale per gli stati di loading
export const ScheduleModalLoadingState: React.FC<LoadingStateProps> = ({
  type,
  message,
  progress,
  showProgress = false,
  size = 'md',
  overlay = false
}) => {
  const config = LOADING_CONFIGS[type];
  const sizeConfig = SIZE_CONFIGS[size];
  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${sizeConfig.container}`}>
      {/* Icona animata */}
      <div className="relative">
        <Icon 
          className={`${sizeConfig.icon} ${config.color} animate-spin`}
        />
        
        {/* Pulse effect per enfatizzare il loading */}
        <div className={`absolute inset-0 ${sizeConfig.icon} ${config.color} animate-ping opacity-20`} />
      </div>

      {/* Messaggio */}
      <div className="text-center space-y-1">
        <p className={`${sizeConfig.text} font-medium text-gray-700`}>
          {displayMessage}
        </p>
        
        {/* Durata stimata */}
        {config.duration && (
          <p className="text-xs text-gray-500">
            Tempo stimato: {config.duration}
          </p>
        )}
      </div>

      {/* Barra di progresso opzionale */}
      {showProgress && typeof progress === 'number' && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${config.color.replace('text-', 'bg-')}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  // Se overlay è true, mostra il loading sopra tutto
  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
        {content}
      </div>
    );
  }

  return content;
};

// Componente per loading inline (più piccolo)
export const InlineLoadingState: React.FC<{
  type: LoadingType;
  message?: string;
}> = ({ type, message }) => {
  const config = LOADING_CONFIGS[type];
  const Icon = config.icon;
  const displayMessage = message || config.defaultMessage;

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      <Icon className={`h-4 w-4 ${config.color} animate-spin`} />
      <span>{displayMessage}</span>
    </div>
  );
};

// Componente per loading di step specifici
export const StepLoadingOverlay: React.FC<{
  step: number;
  stepName: string;
  message?: string;
}> = ({ step, stepName, message }) => {
  return (
    <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-20 rounded-lg">
      <div className="text-center space-y-4">
        {/* Step indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
            {step}
          </div>
          <span className="text-lg font-medium text-gray-700">{stepName}</span>
        </div>
        
        {/* Loading animation */}
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          <span className="text-gray-600">
            {message || 'Caricamento step...'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Hook per gestire gli stati di loading
export const useScheduleModalLoading = () => {
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});
  const [loadingMessages, setLoadingMessages] = React.useState<Record<string, string>>({});
  const [loadingProgress, setLoadingProgress] = React.useState<Record<string, number>>({});

  const setLoading = React.useCallback((key: string, loading: boolean, message?: string) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
    if (message) {
      setLoadingMessages(prev => ({ ...prev, [key]: message }));
    }
    if (!loading) {
      // Pulisci il messaggio quando il loading finisce
      setLoadingMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[key];
        return newMessages;
      });
      setLoadingProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[key];
        return newProgress;
      });
    }
  }, []);

  const setProgress = React.useCallback((key: string, progress: number) => {
    setLoadingProgress(prev => ({ ...prev, [key]: progress }));
  }, []);

  const isLoading = React.useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const getMessage = React.useCallback((key: string) => {
    return loadingMessages[key];
  }, [loadingMessages]);

  const getProgress = React.useCallback((key: string) => {
    return loadingProgress[key];
  }, [loadingProgress]);

  const isAnyLoading = React.useMemo(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  return {
    setLoading,
    setProgress,
    isLoading,
    getMessage,
    getProgress,
    isAnyLoading,
    loadingStates
  };
};

// Tipi per export
export type {
  LoadingType,
  LoadingStateProps
};

export default ScheduleModalLoadingState;