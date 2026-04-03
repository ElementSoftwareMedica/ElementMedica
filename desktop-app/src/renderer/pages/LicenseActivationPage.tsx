import { useState, useEffect } from 'react'
import { KeyRound, Monitor, AlertCircle, CheckCircle2, Loader2, Copy, Check } from 'lucide-react'
import { useLicense } from '../context/LicenseContext'

export function LicenseActivationPage(): JSX.Element {
  const { activateLicense, isLoading: isContextLoading } = useLicense()
  const [licenseKey, setLicenseKey] = useState('')
  const [machineId, setMachineId] = useState<string | null>(null)
  const [machineName, setMachineName] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
    // Auto-format as DESK-XXXX-XXXX-XXXX
    const clean = value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    setLicenseKey(clean)
    setError(null)
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
    try {
      await activateLicense(key)
      // LicenseContext will update isActivated → App.tsx will unmount this page
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'attivazione. Verifica il codice e riprova.'
      setError(message)
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600/20 rounded-2xl border border-teal-600/30 mb-4">
            <KeyRound className="w-8 h-8 text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Attivazione Licenza</h1>
          <p className="text-gray-400 text-sm">
            Inserisci il codice licenza fornito dal tuo amministratore per attivare l'applicazione su questo PC.
          </p>
        </div>

        {/* Machine ID card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Monitor className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Questo PC</p>
              {machineName && (
                <p className="text-sm text-white font-medium mb-1">{machineName}</p>
              )}
              <p className="text-xs text-gray-500 break-all">
                {machineId ? (
                  <>
                    ID: <span className="font-mono text-gray-300">{machineId}</span>
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
                className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Copia ID PC"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-600">
            Comunica questo ID al tuo amministratore per associare la licenza a questo PC.
          </p>
        </div>

        {/* License key input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
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
              'w-full px-4 py-3 bg-gray-900 border rounded-xl font-mono text-sm text-white placeholder-gray-600 outline-none transition-colors',
              error ? 'border-red-500 focus:border-red-400' : 'border-gray-700 focus:border-teal-500',
            ].join(' ')}
            disabled={isActivating}
            autoComplete="off"
            spellCheck={false}
          />
          {error && (
            <div className="flex items-start gap-2 mt-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Activate button */}
        <button
          type="button"
          onClick={handleActivate}
          disabled={isActivating || !licenseKey}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-xl transition-colors"
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

        <p className="text-center text-xs text-gray-600 mt-6">
          Per ricevere un codice licenza, contatta il supporto ElementMedica.
        </p>
      </div>
    </div>
  )
}
