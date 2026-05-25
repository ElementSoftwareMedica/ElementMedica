import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import '@/index.css'
import '@/styles/brand-themes.css'
import '@/design-system/design-system.css'
import { triggerSyncSoon } from './sync/SyncScheduler'

// Global error reporter — sends uncaught errors to main process log file
function reportError(message: string, stack?: string, context?: string): void {
  try {
    window.desktopApi?.app?.logError({ message, stack, context })
  } catch { /* never throw from error handler */ }
}

window.addEventListener('error', (event) => {
  reportError(event.message, event.error?.stack, 'window:error')
})
window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason
  reportError(
    err instanceof Error ? err.message : String(err),
    err instanceof Error ? err.stack : undefined,
    'unhandledrejection'
  )
})

// ── Renderer startup diagnostic ────────────────────────────────────────────────
// Writes a breadcrumb to startup.log (main process file) so that Windows
// blank-page issues can be diagnosed even without opening DevTools.
// Includes UA, location, protocol, hash — key data for file:// routing diagnosis.
window.addEventListener('DOMContentLoaded', () => {
  reportError(
    `[Renderer] DOMContentLoaded — platform: ${navigator.platform}, ` +
    `ua: ${navigator.userAgent.slice(0, 80)}, ` +
    `protocol: ${location.protocol}, pathname: ${location.pathname}, hash: ${location.hash || '(empty)'}`,
    undefined,
    'renderer:startup'
  )
})
// === Live-sync: trigger upload shortly after any enqueue when online ===
// contextBridge exposes APIs as read-only in the renderer.
// We wrap enqueue with a module-level proxy that triggers sync.
// The direct assignment may not work (contextBridge read-only) — use try/catch.
if (window.desktopApi?.sync) {
  const _origEnqueue = window.desktopApi.sync.enqueue.bind(window.desktopApi.sync)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ; (window.desktopApi.sync as any).enqueue = async (op: Parameters<typeof _origEnqueue>[0]) => {
      const result = await _origEnqueue(op)
      if (navigator.onLine) {
        triggerSyncSoon(1500) // 1.5s debounce for batching rapid writes
      }
      return result
    }
  } catch {
    // contextBridge makes this read-only — fall back to trigger from a global hook
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ; (window as any).__onSyncEnqueue = () => { if (navigator.onLine) triggerSyncSoon(1500) }
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false, // Offline-first: don't retry failed queries
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst'
    },
    mutations: {
      networkMode: 'offlineFirst'
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* HashRouter: required for Electron file:// protocol.
          BrowserRouter relies on HTML5 History API which, with file:// URLs, sets
          location.pathname to the full file path (e.g. /C:/Users/.../index.html on Windows).
          React Router finds no matching route, Routes returns null, <main> renders empty.
          HashRouter uses the URL hash (#/path) which is isolated from the file path. */}
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
