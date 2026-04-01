import React, { Component, ErrorInfo, ReactNode } from 'react';
import { sanitizeErrorMessage } from '../../utils/errorUtils';
import { cn } from '../../design-system/utils';

/**
 * Error Boundary component for lazy-loaded routes and components
 * Week 11 Implementation - Lazy Loading Optimization
 */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console always (visible in browser DevTools in production)
    console.error('[ErrorBoundary] Caught error:', error.name, error.message);
    console.error('[ErrorBoundary] Stack:', error.stack);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Auto-reload on stale chunk / dynamic import errors (deploy caused new hashes)
    if (
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Loading chunk') ||
      error.name === 'ChunkLoadError'
    ) {
      const reloadKey = 'chunk-error-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      // Reload once per 60s max to avoid infinite loops
      if (!lastReload || now - Number(lastReload) > 60_000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return;
      }
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className={cn(
          'flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-50 border border-red-200 rounded-lg',
          this.props.className
        )}>
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Si è verificato un errore
          </h3>

          <p className="text-red-600 text-center mb-4 max-w-md">
            Si è verificato un errore durante il caricamento di questo componente. Riprova.
          </p>

          {this.state.error && (
            <details className="mb-4 p-3 bg-red-100 rounded text-sm text-red-800 max-w-full overflow-auto">
              <summary className="cursor-pointer font-medium">Dettagli errore (copia per il supporto)</summary>
              <pre className="mt-2 whitespace-pre-wrap">
                {this.state.error.name}: {this.state.error.message}{process.env.NODE_ENV === 'development' && this.state.error.stack ? `\n${this.state.error.stack}` : ''}
              </pre>
            </details>
          )}

          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Riprova
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ErrorBoundary;