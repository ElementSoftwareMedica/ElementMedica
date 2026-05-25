import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack)
    // Report to crash reporter (P98 §6.4)
    if (typeof window !== 'undefined' && (window as typeof window & { desktopApi?: { crash?: { report: (p: object) => void } } }).desktopApi?.crash) {
      ;(window as typeof window & { desktopApi: { crash: { report: (p: object) => void } } }).desktopApi.crash.report({
        message: error.message,
        stack: error.stack,
        extra: { componentStack: errorInfo.componentStack ?? undefined },
      })
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 font-heading mb-1">
              Errore imprevisto
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Si è verificato un errore. I tuoi dati sono al sicuro.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-gray-100 rounded-lg p-3 mb-4 max-h-32 overflow-auto text-red-600">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            >
              <RefreshCw className="w-4 h-4" />
              Riprova
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
