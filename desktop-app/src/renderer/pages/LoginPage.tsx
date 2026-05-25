import { useState, type CSSProperties } from 'react'
import { Stethoscope, Eye, EyeOff, AlertCircle, Loader2, Shield, Wifi, WifiOff, Copy, Check } from 'lucide-react'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { useConnectivity } from '../context/ConnectivityContext'

interface DiagnosticInfo {
    apiUrl: string
    status?: number
    message?: string
    serverResponse?: string
    timestamp: string
}

export function LoginPage(): JSX.Element {
    const { login } = useDesktopAuth()
    const { isOnline } = useConnectivity()
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [diagnostic, setDiagnostic] = useState<DiagnosticInfo | null>(null)
    const [copied, setCopied] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setDiagnostic(null)

        setIsLoading(true)

        try {
            await login(identifier.trim(), password)
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: unknown; status?: number }; code?: string; message?: string }

            // Build diagnostic info for support
            const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4001') + '/api/v1/auth/login'
            const diagInfo: DiagnosticInfo = {
                apiUrl,
                status: axiosErr.response?.status,
                message: axiosErr.message,
                serverResponse: axiosErr.response?.data ? JSON.stringify(axiosErr.response.data, null, 2) : undefined,
                timestamp: new Date().toISOString()
            }
            setDiagnostic(diagInfo)
            console.error('[LoginPage] Login error diagnostic', diagInfo)

            if (axiosErr.code === 'ERR_NETWORK' || axiosErr.code === 'ECONNREFUSED') {
                setError('Impossibile raggiungere il server. Verifica la connessione internet.')
            } else if (axiosErr.response?.status === 401) {
                const serverData = axiosErr.response.data as Record<string, string> | null
                setError(serverData?.message || serverData?.error || 'Credenziali non valide. Controlla email e password.')
            } else if (axiosErr.response?.status === 400) {
                const serverData = axiosErr.response.data as Record<string, string> | null
                setError(serverData?.message || serverData?.error || 'Dati di accesso non validi.')
            } else if ((axiosErr.response?.data as Record<string, string> | null)?.error) {
                setError((axiosErr.response!.data as Record<string, string>).error)
            } else {
                setError('Errore di connessione al server. Riprova tra qualche istante.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-teal-700 via-teal-600 to-teal-500 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
                    <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2" />
                </div>

                {/* macOS: draggable top bar so user can drag window from the teal panel */}
                {navigator.userAgent.includes('Macintosh') && (
                    <div
                        className="absolute top-0 left-0 right-0 h-[48px]"
                        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
                    />
                )}

                <div className="relative z-10 flex flex-col justify-between p-10 w-full">
                    {/* Logo — macOS: extra left padding to clear traffic lights (x:16→~80px) */}
                    <div
                        className={`flex items-center gap-3 ${navigator.userAgent.includes('Macintosh') ? 'pl-14 pt-2' : ''}`}
                        style={navigator.userAgent.includes('Macintosh') ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                    >
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                            <Stethoscope className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="text-lg font-bold text-white font-heading tracking-tight">ElementMedica</span>
                            <span className="block text-xs text-teal-100/80 font-medium">Desktop</span>
                        </div>
                    </div>

                    {/* Central content */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold text-white font-heading leading-tight">
                            Medicina del Lavoro<br />
                            <span className="text-teal-100/90">Ovunque ti trovi.</span>
                        </h2>
                        <p className="text-teal-100/70 text-sm leading-relaxed max-w-sm">
                            Gestisci visite, giudizi di idoneità e sorveglianza sanitaria direttamente dal tuo PC.
                            Lavora anche offline e sincronizza quando sei connesso.
                        </p>

                        <div className="flex flex-col gap-3 pt-2">
                            <div className="flex items-center gap-3 text-teal-100/80 text-xs">
                                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-3.5 h-3.5" />
                                </div>
                                <span>Dati crittografati e conformi GDPR</span>
                            </div>
                            <div className="flex items-center gap-3 text-teal-100/80 text-xs">
                                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Wifi className="w-3.5 h-3.5" />
                                </div>
                                <span>Funziona offline con sincronizzazione automatica</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-teal-200/40 text-[10px]">
                        &copy; {new Date().getFullYear()} ElementMedica &mdash; Tutti i diritti riservati
                    </p>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center bg-gray-50 p-6 sm:p-10">
                <div className="w-full max-w-sm">
                    {/* Mobile-only logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-14 h-14 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-teal-600/20">
                            <Stethoscope className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 font-heading">ElementMedica</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Desktop &mdash; Medicina del Lavoro</p>
                    </div>

                    {/* Desktop header */}
                    <div className="hidden lg:block mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 font-heading">Bentornato</h1>
                        <p className="text-sm text-gray-500 mt-1">Accedi con le tue credenziali ElementMedica</p>
                    </div>

                    {/* Connection status - informational only, non-blocking */}
                    {!isOnline && (
                        <div className="flex items-center gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5">
                            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="text-xs text-amber-700">Nessuna connessione rilevata &mdash; il login potrebbe non funzionare.</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email o Username
                            </label>
                            <input
                                id="identifier"
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="nome@esempio.com"
                                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                required
                                autoFocus
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-3.5 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <div className="flex items-start gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <span className="text-xs text-red-700 leading-relaxed">{error}</span>
                                </div>
                                {diagnostic && (
                                    <div className="mt-1 p-2 bg-red-100/60 rounded-lg text-[9px] text-red-800 font-mono space-y-0.5 select-all border border-red-200">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-semibold text-red-600">Dettagli tecnici</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const text = [
                                                        `URL: ${diagnostic.apiUrl}`,
                                                        diagnostic.status !== undefined ? `HTTP: ${diagnostic.status}` : null,
                                                        diagnostic.message ? `Errore: ${diagnostic.message}` : null,
                                                        diagnostic.serverResponse ? `Server: ${diagnostic.serverResponse}` : null,
                                                        `Ora: ${diagnostic.timestamp}`
                                                    ].filter(Boolean).join('\n')
                                                    navigator.clipboard?.writeText(text).then(() => {
                                                        setCopied(true)
                                                        setTimeout(() => setCopied(false), 2000)
                                                    })
                                                }}
                                                className="flex items-center gap-1 text-[9px] text-red-500 hover:text-red-700 transition-colors"
                                                title="Copia diagnostica"
                                            >
                                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                {copied ? 'Copiato' : 'Copia'}
                                            </button>
                                        </div>
                                        <div><span className="font-bold">URL:</span> {diagnostic.apiUrl}</div>
                                        {diagnostic.status !== undefined && <div><span className="font-bold">HTTP:</span> {diagnostic.status}</div>}
                                        {diagnostic.message && <div><span className="font-bold">Errore:</span> {diagnostic.message}</div>}
                                        {diagnostic.serverResponse && (
                                            <div className="mt-1">
                                                <span className="font-bold">Server:</span>
                                                <pre className="whitespace-pre-wrap break-all mt-0.5 text-[8px]">{diagnostic.serverResponse}</pre>
                                            </div>
                                        )}
                                        <div><span className="font-bold">Ora:</span> {diagnostic.timestamp}</div>
                                        <div className="text-red-400 mt-1">Tasto destro → Ispeziona elemento per aprire DevTools (o F12)</div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !identifier || !password}
                            className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm shadow-teal-600/20 hover:shadow-md hover:shadow-teal-600/25 disabled:shadow-none"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Accesso in corso...
                                </>
                            ) : (
                                'Accedi'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-[10px] text-gray-400 mt-6">
                        Usa le stesse credenziali della piattaforma web ElementMedica
                    </p>
                    <p className="text-center text-[9px] text-gray-300 mt-1 font-mono select-all">
                        {import.meta.env.VITE_API_URL || 'http://localhost:4001'} &mdash; v{import.meta.env.VITE_APP_VERSION || '?'} &mdash; build {__BUILD_DATE__}
                    </p>
                </div>
            </div>
        </div>
    )
}
