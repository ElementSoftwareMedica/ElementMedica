import { useState, useEffect, type CSSProperties } from 'react'
import { KeyRound, Monitor, AlertCircle, CheckCircle2, Loader2, Copy, Check, Stethoscope, LogOut, ChevronDown, ArrowRightLeft } from 'lucide-react'
import { useLicense } from '../context/LicenseContext'
import { useDesktopAuth } from '../context/DesktopAuthContext'

export function LicenseActivationPage(): JSX.Element {
    const { activateLicense, isLoading: isContextLoading } = useLicense()
    const { user, logout, currentTenantId, availableTenants, switchTenant } = useDesktopAuth()
    const [licenseKey, setLicenseKey] = useState('')
    const [machineId, setMachineId] = useState<string | null>(null)
    const [machineName, setMachineName] = useState<string | null>(null)
    const [isActivating, setIsActivating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [showTenantMenu, setShowTenantMenu] = useState(false)
    // Transfer confirmation state: set when backend returns 409 (license on another machine)
    const [transferPending, setTransferPending] = useState<{ activatedOn: string; key: string } | null>(null)

    // macOS: traffic lights float over page content — push header content right to avoid overlap
    const isMac = navigator.userAgent.includes('Macintosh')
    const isWin = navigator.userAgent.includes('Windows')

    useEffect(() => {
        const load = async (): Promise<void> => {
            try {
                const [id, name] = await Promise.all([
                    window.desktopApi.license.getMachineId(),
                    window.desktopApi.license.getMachineName(),
                ])
                setMachineId(id as string)
                setMachineName(name as string)
            } catch {
                // silent
            }
        }
        load()
    }, [])

    const handleKeyChange = (value: string): void => {
        const clean = value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
        setLicenseKey(clean)
        setError(null)
        setTransferPending(null)
    }

    const handleActivate = async (): Promise<void> => {
        const key = licenseKey.trim().toUpperCase()
        if (!key) {
            setError('Inserisci il codice licenza')
            return
        }
        if (!/^DESK-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
            setError('Formato non valido. Il codice deve essere nel formato DESK-XXXX-XXXX-XXXX')
            return
        }

        setIsActivating(true)
        setError(null)
        setTransferPending(null)
        try {
            await activateLicense(key)
        } catch (err: unknown) {
            if (err instanceof Error && (err as Error & { code?: string }).code === 'MACHINE_CONFLICT') {
                const activatedOn = (err as Error & { activatedOn?: string }).activatedOn || 'altro PC'
                setTransferPending({ activatedOn, key })
                return
            }
            const message = err instanceof Error ? err.message : 'Errore durante l\'attivazione. Verifica il codice e riprova.'
            setError(message)
        } finally {
            setIsActivating(false)
        }
    }

    const handleConfirmTransfer = async (): Promise<void> => {
        if (!transferPending) return
        setIsActivating(true)
        setError(null)
        try {
            await activateLicense(transferPending.key, true)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Errore durante il trasferimento. Riprova.'
            setError(message)
            setTransferPending(null)
        } finally {
            setIsActivating(false)
        }
    }

    const copyMachineId = async (): Promise<void> => {
        if (!machineId) return
        await navigator.clipboard.writeText(machineId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (isContextLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Verifica licenza...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Minimal header — macOS: draggable region + extra left padding for traffic lights
                Windows: draggable + right padding to clear native window controls */}
            <header
                className={`${isMac ? 'h-[60px] pt-[26px]' : isWin ? 'h-11' : 'h-14'} bg-white border-b border-gray-200 flex items-center justify-between px-5`}
                style={(isMac || isWin) ? ({ WebkitAppRegion: 'drag' } as CSSProperties) : undefined}
            >
                <div
                    className={`flex items-center gap-2.5 ${isMac ? 'pl-16' : ''}`}
                    style={(isMac || isWin) ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                >
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-gray-900 font-heading">ElementMedica</span>
                        <span className="block text-[10px] text-teal-600 -mt-0.5">Desktop</span>
                    </div>
                </div>
                <div
                    className={`flex items-center gap-3${isWin ? ' pr-36' : ''}`}
                    style={(isMac || isWin) ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                >
                    {/* Tenant selector — always visible so user can switch to the tenant that has a license */}
                    {availableTenants.length > 1 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowTenantMenu(!showTenantMenu)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 font-medium transition-colors"
                            >
                                <span className="max-w-[120px] truncate">
                                    {availableTenants.find(t => t.tenantId === currentTenantId)?.tenantName || 'Tenant'}
                                </span>
                                <ChevronDown className={`w-3 h-3 text-teal-500 transition-transform ${showTenantMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showTenantMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[180px]">
                                    {availableTenants.map(t => (
                                        <button
                                            key={t.tenantId}
                                            onClick={async () => {
                                                await switchTenant(t.tenantId)
                                                setShowTenantMenu(false)
                                                setError(null)
                                            }}
                                            className={`w-full text-left px-3 py-2 text-[12px] transition-colors ${t.tenantId === currentTenantId
                                                ? 'bg-teal-50 text-teal-700 font-medium'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            <span className="block truncate">{t.tenantName}</span>
                                            {t.role && <span className="block text-[10px] text-gray-400 mt-0.5">{t.role}</span>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {user && (
                        <span className="text-xs text-gray-500">
                            {user.firstName} {user.lastName}
                        </span>
                    )}
                    <button
                        onClick={logout}
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        title="Esci"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-50 rounded-2xl border border-teal-100 mb-4">
                            <KeyRound className="w-8 h-8 text-teal-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 font-heading mb-2">Attiva la tua licenza</h1>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Inserisci il codice licenza fornito dal tuo amministratore per attivare l'applicazione su questo PC.
                            Il codice determina le funzionalità disponibili (app offline, bridge dispositivi o entrambi).
                        </p>
                        {availableTenants.length > 1 && (
                            <p className="mt-2 text-[12px] text-teal-600">
                                Se hai più tenant, seleziona quello corretto dal menu in alto a destra.
                            </p>
                        )}
                    </div>

                    {/* Machine ID card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Monitor className="w-4.5 h-4.5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Questo PC</p>
                                {machineName && (
                                    <p className="text-sm text-gray-900 font-medium mb-0.5">{machineName}</p>
                                )}
                                <p className="text-xs text-gray-500 break-all">
                                    {machineId ? (
                                        <>
                                            ID: <span className="font-mono text-gray-700">{machineId}</span>
                                        </>
                                    ) : (
                                        <span className="animate-pulse">Caricamento...</span>
                                    )}
                                </p>
                            </div>
                            {machineId && (
                                <button
                                    type="button"
                                    onClick={copyMachineId}
                                    className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                    title="Copia ID PC"
                                >
                                    {copied ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                        <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
                            Comunica questo ID al tuo amministratore per associare la licenza a questo PC.
                        </p>
                    </div>

                    {/* License key input */}
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Codice Licenza
                        </label>
                        <input
                            type="text"
                            value={licenseKey}
                            onChange={(e) => handleKeyChange(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                            placeholder="DESK-XXXX-XXXX-XXXX"
                            maxLength={19}
                            className={[
                                'w-full px-4 py-3 bg-white border rounded-xl font-mono text-sm text-gray-900 placeholder-gray-400 outline-none transition-all',
                                error
                                    ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-500/10'
                                    : 'border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20',
                            ].join(' ')}
                            disabled={isActivating}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        {error && (
                            <div className="flex items-start gap-2 mt-2.5">
                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* Transfer confirmation card — shown when license is bound to another machine */}
                    {transferPending && (
                        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-amber-800 mb-1">Licenza attiva su altro PC</p>
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        Questa licenza è già associata a <strong>{transferPending.activatedOn || 'un altro PC'}</strong>.
                                        Vuoi trasferirla su questo PC?
                                        L'altro PC perderà l'accesso.
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            type="button"
                                            onClick={handleConfirmTransfer}
                                            disabled={isActivating}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-200 text-white text-xs font-semibold rounded-lg transition-colors"
                                        >
                                            {isActivating
                                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Trasferimento…</>
                                                : <><ArrowRightLeft className="w-3 h-3" /> Trasferisci su questo PC</>}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTransferPending(null)}
                                            disabled={isActivating}
                                            className="px-3 py-1.5 text-amber-700 hover:text-amber-900 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors"
                                        >
                                            Annulla
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activate button — hidden when transfer confirmation is active */}
                    {!transferPending && (
                        <button
                            type="button"
                            onClick={handleActivate}
                            disabled={isActivating || !licenseKey}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-teal-600/20 hover:shadow-md hover:shadow-teal-600/25 disabled:shadow-none"
                        >
                            {isActivating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Attivazione in corso…
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Attiva Licenza
                                </>
                            )}
                        </button>
                    )}

                    <p className="text-center text-[11px] text-gray-400 mt-6">
                        Per ricevere un codice licenza, contatta il supporto ElementMedica.
                    </p>
                </div>
            </div>
        </div>
    )
}
