import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import {
    Cpu, Wifi, WifiOff, Activity, MonitorDot, Stethoscope, LogOut,
    RefreshCw, ExternalLink, CheckCircle2, XCircle, Clock, Settings,
    FolderOpen, Save, ChevronDown, ChevronUp, Heart, Wind, Ear,
    AlertCircle, CheckCheck, Loader2
} from 'lucide-react'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { useLicense } from '../context/LicenseContext'

interface BridgeStatus {
    running: boolean
    port: number | null
}

interface ExamResult {
    sessionId: string
    tipo: string
    completedAt: string
    deviceName?: string
    risultato?: string
}

interface DeviceConfig {
    type: 'edan-ecg' | 'mir-spirometer' | 'oscilla-audiometer'
    enabled: boolean
    gdtId: string
    gdtInputDir: string
    gdtOutputDir: string
    pdfOutputDir: string
    executable: string
    examType: 'ecg' | 'spirometry' | 'audiometry'
    displayName: string
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'error'

interface DeviceDiag { type: string; displayName: string; enabled: boolean; executableExists: boolean; inputDirExists: boolean; outputDirExists: boolean; pdfDirExists: boolean }

const DEFAULT_DEVICES: DeviceConfig[] = [
    {
        type: 'edan-ecg',
        enabled: false,
        gdtId: 'EDAN_ECG',
        gdtInputDir: '',
        gdtOutputDir: '',
        pdfOutputDir: '',
        executable: '',
        examType: 'ecg',
        displayName: 'Edan ECG',
    },
    {
        type: 'mir-spirometer',
        enabled: false,
        gdtId: 'WINSPIRO',
        gdtInputDir: '',
        gdtOutputDir: '',
        pdfOutputDir: '',
        executable: '',
        examType: 'spirometry',
        displayName: 'MIR Spirometro (WinSpiro)',
    },
    {
        type: 'oscilla-audiometer',
        enabled: false,
        gdtId: 'OSCILLA',
        gdtInputDir: '',
        gdtOutputDir: '',
        pdfOutputDir: '',
        executable: '',
        examType: 'audiometry',
        displayName: 'Oscilla Audiometro',
    },
]

const DEVICE_ICONS: Record<string, JSX.Element> = {
    'edan-ecg': <Heart className="w-4 h-4" />,
    'mir-spirometer': <Wind className="w-4 h-4" />,
    'oscilla-audiometer': <Ear className="w-4 h-4" />,
}

// macOS: traffic lights are at y=18, header needs extra space
const isMac = navigator.userAgent.includes('Macintosh')

export function BridgeModePage(): JSX.Element {
    const { user, logout } = useDesktopAuth()
    const { label, licenseType, daysUntilExpiry } = useLicense()

    const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>({ running: false, port: null })
    const [isStarting, setIsStarting] = useState(false)
    const [recentExams, setRecentExams] = useState<ExamResult[]>([])
    const [webappUrl] = useState<string>(
        import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://app.elementmedica.com'
    )

    // Config panel
    const [showConfig, setShowConfig] = useState(false)
    const [devices, setDevices] = useState<DeviceConfig[]>(DEFAULT_DEVICES)
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

    // Connectivity test
    const [testStatus, setTestStatus] = useState<TestStatus>('idle')
    const [testMessage, setTestMessage] = useState('')

    // Device config diagnostic
    const [diagStatus, setDiagStatus] = useState<'idle' | 'testing' | 'done' | 'error'>('idle')
    const [diagDevices, setDiagDevices] = useState<DeviceDiag[]>([])

    const refreshStatus = useCallback(async (): Promise<void> => {
        try {
            const status = await window.desktopApi.bridge.getStatus()
            const s = status as { running: boolean; port: number | null }
            setBridgeStatus({ running: s.running, port: s.port ?? null })
        } catch {
            // silent
        }
    }, [])

    const loadConfig = useCallback(async (): Promise<void> => {
        try {
            const result = await window.desktopApi.bridge.getConfig() as { devices: DeviceConfig[] }
            if (result.devices && result.devices.length > 0) {
                // Merge loaded devices with defaults (keep defaults for missing types)
                const merged = DEFAULT_DEVICES.map(def => {
                    const found = result.devices.find((d: DeviceConfig) => d.type === def.type)
                    return found ? { ...def, ...found } : def
                })
                setDevices(merged)
            }
        } catch {
            // silent — use defaults
        }
    }, [])

    useEffect(() => {
        refreshStatus()
        loadConfig()
        const interval = setInterval(refreshStatus, 5000)
        return () => clearInterval(interval)
    }, [refreshStatus, loadConfig])

    // Listen for exam results from bridge
    useEffect(() => {
        const handler = (_event: unknown, data: ExamResult): void => {
            setRecentExams(prev => [data, ...prev].slice(0, 10))
        }
        window.desktopApi.on.bridgeExamResult(handler)
    }, [])

    const startBridge = async (): Promise<void> => {
        setIsStarting(true)
        try {
            await window.desktopApi.bridge.start()
            await refreshStatus()
        } catch {
            // silent — status refresh will reflect actual state
        } finally {
            setIsStarting(false)
        }
    }

    const openWebapp = (): void => {
        window.desktopApi.app.openExternal(webappUrl)
    }

    const updateDevice = (type: DeviceConfig['type'], field: keyof DeviceConfig, value: unknown): void => {
        setDevices(prev => prev.map(d => d.type === type ? { ...d, [field]: value } : d))
        setSaveStatus('idle')
    }

    const handleSelectDirectory = async (type: DeviceConfig['type'], field: 'gdtInputDir' | 'gdtOutputDir' | 'pdfOutputDir'): Promise<void> => {
        const path = await window.desktopApi.bridge.selectDirectory()
        if (path) updateDevice(type, field, path)
    }

    const handleSelectExecutable = async (type: DeviceConfig['type']): Promise<void> => {
        const path = await window.desktopApi.bridge.selectExecutable()
        if (path) updateDevice(type, 'executable', path)
    }

    const handleSave = async (): Promise<void> => {
        setIsSaving(true)
        setSaveStatus('idle')
        try {
            const enabledDevices = devices.filter(d => d.enabled)
            await window.desktopApi.bridge.saveDeviceConfig(enabledDevices)
            setSaveStatus('saved')
            await refreshStatus()
            setTimeout(() => setSaveStatus('idle'), 3000)
        } catch {
            setSaveStatus('error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleTestConnectivity = async (): Promise<void> => {
        setTestStatus('testing')
        setTestMessage('')
        try {
            const result = await window.desktopApi.bridge.testConnectivity()
            if (result.ok) {
                setTestStatus('ok')
                setTestMessage('Bridge raggiungibile e funzionante')
            } else {
                setTestStatus('error')
                setTestMessage(result.status)
            }
        } catch {
            setTestStatus('error')
            setTestMessage('Bridge non raggiungibile')
        }
        setTimeout(() => {
            setTestStatus('idle')
            setTestMessage('')
        }, 6000)
    }

    const handleTestDeviceConfig = async (): Promise<void> => {
        setDiagStatus('testing')
        setDiagDevices([])
        try {
            const result = await window.desktopApi.bridge.testDeviceConfig()
            if (result.ok && result.devices) {
                setDiagDevices(result.devices)
                setDiagStatus('done')
            } else {
                setDiagDevices([])
                setDiagStatus('error')
            }
        } catch {
            setDiagStatus('error')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header
                className={`${isMac ? 'h-[60px] pt-[26px]' : 'h-14'} bg-white border-b border-gray-200 flex items-center justify-between px-5 flex-shrink-0`}
                style={isMac ? ({ WebkitAppRegion: 'drag' } as CSSProperties) : undefined}
            >
                <div
                    className={`flex items-center gap-2.5 ${isMac ? 'pl-16' : ''}`}
                    style={isMac ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                >
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                        <Stethoscope className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <span className="text-sm font-semibold text-gray-900 font-heading">ElementMedica</span>
                        <span className="block text-[10px] text-teal-600 -mt-0.5">Bridge</span>
                    </div>
                </div>

                <div
                    className="flex items-center gap-3"
                    style={isMac ? ({ WebkitAppRegion: 'no-drag' } as CSSProperties) : undefined}
                >
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bridgeStatus.running
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${bridgeStatus.running ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        {bridgeStatus.running ? `Attivo :${bridgeStatus.port}` : 'Non attivo'}
                    </div>
                    {user && (
                        <span className="text-xs text-gray-500 hidden sm:block">
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

            {/* Content */}
            <div className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-4">

                {/* Bridge status card */}
                <div className={`rounded-2xl border p-5 ${bridgeStatus.running
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bridgeStatus.running ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                {bridgeStatus.running
                                    ? <Wifi className="w-5 h-5 text-green-600" />
                                    : <WifiOff className="w-5 h-5 text-gray-400" />
                                }
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">
                                    {bridgeStatus.running ? 'Bridge in esecuzione' : 'Bridge non attivo'}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {bridgeStatus.running
                                        ? `In ascolto su http://localhost:${bridgeStatus.port}`
                                        : 'Avvia il bridge per ricevere dati dai dispositivi medici'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {bridgeStatus.running && (
                                <button
                                    onClick={handleTestConnectivity}
                                    disabled={testStatus === 'testing'}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50"
                                    title="Testa connessione"
                                >
                                    {testStatus === 'testing'
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : testStatus === 'ok'
                                            ? <CheckCheck className="w-3.5 h-3.5 text-green-600" />
                                            : testStatus === 'error'
                                                ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                : <Activity className="w-3.5 h-3.5" />
                                    }
                                    Test
                                </button>
                            )}
                            {bridgeStatus.running && (
                                <button
                                    onClick={handleTestDeviceConfig}
                                    disabled={diagStatus === 'testing'}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
                                    title="Testa cartelle e configurazione dispositivi"
                                >
                                    {diagStatus === 'testing'
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <FolderOpen className="w-3.5 h-3.5" />
                                    }
                                    Diagnosi
                                </button>
                            )}
                            <button
                                onClick={bridgeStatus.running ? refreshStatus : startBridge}
                                disabled={isStarting}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${bridgeStatus.running
                                    ? 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                                    : 'bg-teal-600 text-white hover:bg-teal-700'
                                    }`}
                            >
                                {isStarting
                                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    : bridgeStatus.running
                                        ? <RefreshCw className="w-3.5 h-3.5" />
                                        : <Activity className="w-3.5 h-3.5" />
                                }
                                {isStarting ? 'Avvio...' : bridgeStatus.running ? 'Aggiorna' : 'Avvia Bridge'}
                            </button>
                        </div>
                    </div>

                    {/* Test result message */}
                    {testMessage && (
                        <div className={`text-xs px-3 py-1.5 rounded-lg mt-1 ${testStatus === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {testMessage}
                        </div>
                    )}

                    {bridgeStatus.running && (
                        <div className="bg-white/70 rounded-xl p-3 text-xs text-gray-600 font-mono border border-green-100 mt-2">
                            Dispositivi → <span className="text-teal-700 font-semibold">http://localhost:{bridgeStatus.port}/start-exam</span>
                        </div>
                    )}
                </div>

                {/* Device config diagnostic results */}
                {(diagStatus === 'done' || diagStatus === 'error') && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-amber-500" />
                                <span className="text-xs font-medium text-gray-700 uppercase tracking-wider">Diagnosi Configurazione</span>
                            </div>
                            <button onClick={() => setDiagStatus('idle')} className="text-xs text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        {diagStatus === 'error' && (
                            <p className="text-xs text-red-600">Impossibile recuperare la configurazione dal bridge.</p>
                        )}
                        {diagStatus === 'done' && diagDevices.length === 0 && (
                            <p className="text-xs text-gray-500">Nessun dispositivo configurato nel bridge.</p>
                        )}
                        {diagDevices.map(d => (
                            <div key={d.type} className={`mb-3 last:mb-0 p-3 rounded-xl border ${d.enabled ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}>
                                <p className="text-xs font-semibold text-gray-800 mb-2">{d.displayName} {!d.enabled && <span className="text-gray-400 font-normal">(disabilitato)</span>}</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs">
                                        {d.executableExists ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                        <span className={d.executableExists ? 'text-green-700' : 'text-amber-700'}>Eseguibile {d.executableExists ? 'trovato' : 'non trovato (avvio manuale)'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {d.inputDirExists ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                                        <span className={d.inputDirExists ? 'text-green-700' : 'text-red-700'}>Cartella GDT Input {d.inputDirExists ? 'esistente' : 'NON trovata — verificare percorso'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {d.outputDirExists ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                                        <span className={d.outputDirExists ? 'text-green-700' : 'text-red-700'}>Cartella GDT Output {d.outputDirExists ? 'esistente' : 'NON trovata — verificare percorso'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {d.pdfDirExists ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                                        <span className={d.pdfDirExists ? 'text-green-700' : 'text-amber-700'}>Cartella PDF Output {d.pdfDirExists ? 'esistente' : 'non trovata'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Device configuration card */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <button
                        onClick={() => setShowConfig(v => !v)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                <Settings className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Configurazione Strumenti</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {devices.filter(d => d.enabled).length === 0
                                        ? 'Nessuno strumento configurato'
                                        : `${devices.filter(d => d.enabled).length} strument${devices.filter(d => d.enabled).length === 1 ? 'o' : 'i'} configurat${devices.filter(d => d.enabled).length === 1 ? 'o' : 'i'}`
                                    }
                                </p>
                            </div>
                        </div>
                        {showConfig ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>

                    {showConfig && (
                        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-5">
                            {devices.map(device => (
                                <div key={device.type} className={`rounded-xl border p-4 transition-colors ${device.enabled ? 'border-teal-200 bg-teal-50/30' : 'border-gray-200'}`}>
                                    {/* Device header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${device.enabled ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {DEVICE_ICONS[device.type]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{device.displayName}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{device.examType}</p>
                                            </div>
                                        </div>
                                        {/* Enable toggle */}
                                        <button
                                            onClick={() => updateDevice(device.type, 'enabled', !device.enabled)}
                                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${device.enabled ? 'bg-teal-600' : 'bg-gray-200'}`}
                                            role="switch"
                                            aria-checked={device.enabled}
                                        >
                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${device.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>

                                    {device.enabled && (
                                        <div className="space-y-3">
                                            {/* Executable */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Eseguibile del dispositivo</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={device.executable}
                                                        onChange={e => updateDevice(device.type, 'executable', e.target.value)}
                                                        placeholder="Percorso eseguibile (opzionale)"
                                                        className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectExecutable(device.type)}
                                                        className="flex items-center gap-1 px-2.5 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                                                        title="Sfoglia"
                                                    >
                                                        <FolderOpen className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* GDT Input Dir */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Cartella GDT Input <span className="text-red-400">*</span></label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={device.gdtInputDir}
                                                        onChange={e => updateDevice(device.type, 'gdtInputDir', e.target.value)}
                                                        placeholder="Dove il bridge scrive il file GDT per il dispositivo"
                                                        className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectDirectory(device.type, 'gdtInputDir')}
                                                        className="flex items-center gap-1 px-2.5 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                                                        title="Sfoglia"
                                                    >
                                                        <FolderOpen className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* GDT Output Dir */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Cartella GDT Output <span className="text-red-400">*</span></label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={device.gdtOutputDir}
                                                        onChange={e => updateDevice(device.type, 'gdtOutputDir', e.target.value)}
                                                        placeholder="Dove il dispositivo scrive i risultati GDT"
                                                        className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectDirectory(device.type, 'gdtOutputDir')}
                                                        className="flex items-center gap-1 px-2.5 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                                                        title="Sfoglia"
                                                    >
                                                        <FolderOpen className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* PDF Output Dir (optional) */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Cartella PDF Output <span className="text-gray-400 font-normal">(opzionale)</span></label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={device.pdfOutputDir}
                                                        onChange={e => updateDevice(device.type, 'pdfOutputDir', e.target.value)}
                                                        placeholder="Dove il dispositivo scrive i PDF (default: GDT Output)"
                                                        className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                                                    />
                                                    <button
                                                        onClick={() => handleSelectDirectory(device.type, 'pdfOutputDir')}
                                                        className="flex items-center gap-1 px-2.5 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
                                                        title="Sfoglia"
                                                    >
                                                        <FolderOpen className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Save row */}
                            <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-gray-400">Il bridge si riavvierà automaticamente dopo il salvataggio</p>
                                <div className="flex items-center gap-2">
                                    {saveStatus === 'saved' && (
                                        <span className="flex items-center gap-1 text-xs text-green-600">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Salvato
                                        </span>
                                    )}
                                    {saveStatus === 'error' && (
                                        <span className="flex items-center gap-1 text-xs text-red-600">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Errore
                                        </span>
                                    )}
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Save className="w-3.5 h-3.5" />
                                        }
                                        {isSaving ? 'Salvataggio...' : 'Salva e riavvia'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Open webapp button */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                                <MonitorDot className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Apri ElementMedica</p>
                                <p className="text-xs text-gray-500 mt-0.5">Accedi alla webapp per gestire esami e visite</p>
                            </div>
                        </div>
                        <button
                            onClick={openWebapp}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Apri
                        </button>
                    </div>
                </div>

                {/* License info */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Licenza</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{label || 'Bridge'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {licenseType === 'BRIDGE_ONLY' ? 'Bridge Dispositivi Medici' : 'App + Bridge'}
                            </p>
                        </div>
                        {daysUntilExpiry !== null && (
                            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${daysUntilExpiry > 30 ? 'bg-green-50 text-green-700' :
                                daysUntilExpiry > 7 ? 'bg-amber-50 text-amber-700' :
                                    'bg-red-50 text-red-700'
                                }`}>
                                <Clock className="w-3 h-3" />
                                {daysUntilExpiry > 0 ? `${daysUntilExpiry}gg` : 'Scaduta'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent exams */}
                {recentExams.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ultimi esami ricevuti</span>
                        </div>
                        <div className="space-y-2">
                            {recentExams.map((exam) => (
                                <div key={exam.sessionId} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate">
                                            {exam.tipo}{exam.deviceName ? ` — ${exam.deviceName}` : ''}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(exam.completedAt).toLocaleString('it-IT')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* No exams placeholder */}
                {recentExams.length === 0 && bridgeStatus.running && (
                    <div className="text-center py-8 text-gray-400">
                        <XCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nessun esame ricevuto in questa sessione</p>
                        <p className="text-xs mt-1">I risultati dei dispositivi appariranno qui</p>
                    </div>
                )}
            </div>
        </div>
    )
}
