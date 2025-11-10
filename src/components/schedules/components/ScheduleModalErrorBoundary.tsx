import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ScheduleModalErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private previousResetKeys: Array<string | number>;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
    this.previousResetKeys = props.resetKeys || [];
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Genera un ID univoco per l'errore
    const errorId = `schedule-modal-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log dell'errore per debugging
    console.error('ScheduleModalErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });

    // Callback opzionale per gestione errori personalizzata
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset automatico quando cambiano le resetKeys
    if (hasError && resetKeys && resetOnPropsChange) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => this.previousResetKeys[index] !== key
      );

      if (hasResetKeyChanged) {
        this.previousResetKeys = resetKeys;
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleAutoRetry = () => {
    // Auto-retry dopo 3 secondi
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 3000);
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Usa il fallback personalizzato se fornito
      if (fallback) {
        return fallback;
      }

      // UI di errore di default per il modal
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-6 w-6 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Errore nel Modal
                </h2>
              </div>
              <button
                onClick={() => window.history.back()}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messaggio di errore */}
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                Si è verificato un errore imprevisto durante il caricamento del modal di pianificazione.
              </p>
              
              {/* Dettagli errore (solo in development) */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Dettagli tecnici (sviluppo)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
                    <div className="mb-2">
                      <strong>Errore:</strong> {error.message}
                    </div>
                    <div className="mb-2">
                      <strong>ID:</strong> {errorId}
                    </div>
                    {errorInfo && (
                      <div>
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap mt-1">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Azioni */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Riprova</span>
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex-1"
              >
                Ricarica Pagina
              </button>
            </div>

            {/* Auto-retry info */}
            <div className="mt-4 text-center">
              <button
                onClick={this.handleAutoRetry}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Oppure riprova automaticamente tra 3 secondi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ScheduleModalErrorBoundary;

// Hook per utilizzare l'error boundary in modo programmatico
export const useScheduleModalErrorHandler = () => {
  const throwError = (error: Error) => {
    // Forza il re-render con errore per attivare l'error boundary
    throw error;
  };

  const handleAsyncError = (asyncFn: () => Promise<any>) => {
    return asyncFn().catch((error) => {
      console.error('Async error in ScheduleModal:', error);
      throwError(error);
    });
  };

  return {
    throwError,
    handleAsyncError
  };
};

// Tipi per l'export
export type ScheduleModalErrorBoundaryProps = Props;
export type ScheduleModalErrorBoundaryState = State;