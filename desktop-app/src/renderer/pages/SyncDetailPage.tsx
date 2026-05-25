import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpCircle,
  RotateCcw,
  Shield,
  Trash2,
  GitCompare,
  X,
  Loader2
} from 'lucide-react'
import axios from 'axios'
import { useSyncStatus } from '../sync/SyncStatusProvider'
import { useConnectivity } from '../context/ConnectivityContext'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import {
  executeUploadSync,
  getQueueStats,
  getConflictOperations,
  resolveConflict,
  retryFailedOperations,
  discardFailedOperations,
  type QueueStats
} from '../sync/SyncEngine'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'

const ENTITY_LABELS: Record<string, string> = {
  visits: 'Visite',
  appointments: 'Appuntamenti',
  giudizi_idoneita: 'Giudizi Idoneità',
  esami_strumentali: 'Esami Strumentali',
  movimenti_contabili: 'Movimenti Contabili',
  scadenze: 'Scadenze',
  visita: 'Visita',
  appuntamento: 'Appuntamento',
  giudizioIdoneita: 'Giudizio Idoneità',
  esameStrumentale: 'Esame Strumentale',
  movimentoContabile: 'Movimento Contabile',
  deadlineItem: 'Scadenza'
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creazione',
  UPDATE: 'Modifica',
  DELETE: 'Eliminazione'
}

// Fields to hide from diff display (internal/irrelevant)
const HIDDEN_DIFF_FIELDS = new Set([
  'tenantId', 'createdAt', '_syncStatus', '_isDeleted', '_localId', '_serverId',
  '_version', '_localUpdatedAt', '_lastSyncAt', 'localPath', 'serverUrl'
])

interface ConflictOp {
  id: string
  type: string
  entity: string
  entityId: string
  timestamp: string
  retryCount: number
  payload: Record<string, unknown>
  conflictData?: {
    operationId: string
    status: string
    serverId?: string
    serverUpdatedAt?: string
    error?: string
  } | null
}

interface DiffModalState {
  op: ConflictOp
  serverData: Record<string, unknown> | null
  loading: boolean
  error: string | null
}

export function SyncDetailPage(): JSX.Element {
  const { isOnline } = useConnectivity()
  const { accessToken, currentTenantId } = useDesktopAuth()
  const {
    syncState, pendingOperations, setSyncState, setProgress,
    setLastSyncAt, setPendingOperations, setErrorMessage, setConflicts, lastSyncAt
  } = useSyncStatus()

  const [stats, setStats] = useState<QueueStats | null>(null)
  const [conflicts, setConflictsList] = useState<ConflictOp[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [discardConfirm, setDiscardConfirm] = useState(false)
  const [diffModal, setDiffModal] = useState<DiffModalState | null>(null)

  const loadData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [queueStats, conflictOps] = await Promise.all([
        getQueueStats(),
        getConflictOperations()
      ])
      setStats(queueStats)
      setConflictsList(conflictOps as ConflictOp[])
      setPendingOperations(queueStats.pending)
      setConflicts(queueStats.conflict)
    } catch {
      // Silent — non-blocking
    }
    setIsRefreshing(false)
  }, [setPendingOperations, setConflicts])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10_000)
    return () => clearInterval(interval)
  }, [loadData])

  const handleManualSync = async (): Promise<void> => {
    await executeUploadSync({
      onStart: () => {
        setSyncState('UPLOADING')
        setErrorMessage(null)
      },
      onProgress: (current, total) => {
        setProgress({ current, total })
      },
      onComplete: (summary) => {
        setSyncState('IDLE')
        setProgress(null)
        setLastSyncAt(new Date().toISOString())
        loadData()
        if (summary.conflict > 0) {
          setErrorMessage(`${summary.conflict} conflitti da risolvere`)
        }
      },
      onError: (message) => {
        setSyncState('ERROR')
        setProgress(null)
        setErrorMessage(message)
      }
    })
  }

  const handleResolveConflict = async (opId: string, strategy: 'SERVER_WINS' | 'CLIENT_WINS'): Promise<void> => {
    setResolvingId(opId)
    try {
      await resolveConflict(opId, strategy)
      setDiffModal(null)
      await loadData()
    } catch {
      // Silent
    }
    setResolvingId(null)
  }

  const handleShowDiff = async (op: ConflictOp): Promise<void> => {
    setDiffModal({ op, serverData: null, loading: true, error: null })
    try {
      const response = await axios.get(`${API_BASE}/api/v1/desktop-sync/conflict-data`, {
        params: { entityType: op.entity, entityId: op.entityId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Tenant-ID': currentTenantId
        },
        timeout: 8000
      })
      setDiffModal({ op, serverData: response.data.serverData as Record<string, unknown>, loading: false, error: null })
    } catch {
      setDiffModal(prev => prev ? { ...prev, loading: false, error: 'Impossibile recuperare i dati dal server' } : null)
    }
  }

  const handleRetryFailed = async (): Promise<void> => {
    const count = await retryFailedOperations()
    if (count > 0) {
      await loadData()
    }
  }

  const handleDiscardFailed = async (): Promise<void> => {
    if (!discardConfirm) {
      setDiscardConfirm(true)
      setTimeout(() => setDiscardConfirm(false), 3000)
      return
    }
    try {
      await discardFailedOperations()
      setDiscardConfirm(false)
      await loadData()
    } catch {
      setDiscardConfirm(false)
    }
  }

  const handleClearSynced = async (): Promise<void> => {
    if (!clearConfirm) {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 3000)
      return
    }
    try {
      await window.desktopApi.db.deleteWhere({
        table: 'operations_queue',
        where: { status: 'SYNCED' }
      })
      setClearConfirm(false)
      await loadData()
    } catch {
      setClearConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 font-heading">Stato Sincronizzazione</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitora e gestisci la coda di sincronizzazione
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
          <button
            onClick={handleManualSync}
            disabled={!isOnline || syncState === 'UPLOADING' || ((stats?.pending ?? 0) === 0 && (stats?.failed ?? 0) === 0)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            Sincronizza Ora
          </button>
        </div>
      </div>

      {/* Queue Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="In Coda" value={stats.pending} icon={Clock} color="amber" />
          <StatCard label="Sincronizzati" value={stats.synced} icon={CheckCircle2} color="green" />
          <StatCard label="Conflitti" value={stats.conflict} icon={AlertTriangle} color="orange" />
          <StatCard label="Falliti" value={stats.failed} icon={XCircle} color="red" />
        </div>
      )}

      {/* Connection Status */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${
        isOnline
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">
          {isOnline ? 'Connesso al server' : 'Modalità offline'}
        </span>
        {syncState === 'UPLOADING' && (
          <span className="ml-auto text-sm">Sincronizzazione in corso...</span>
        )}
        {lastSyncAt && syncState !== 'UPLOADING' && (
          <span className="ml-auto text-xs text-gray-500">
            Ultimo sync: {new Date(lastSyncAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Failed Operations */}
      {stats && stats.failed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {stats.failed} operazion{stats.failed === 1 ? 'e fallita' : 'i fallite'}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  Le operazioni verranno ritentate automaticamente fino a 3 volte
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetryFailed}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Riprova Tutto
              </button>
              <button
                onClick={handleDiscardFailed}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  discardConfirm
                    ? 'text-red-700 border-red-400 bg-red-100 hover:bg-red-200'
                    : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {discardConfirm ? 'Conferma scarto' : 'Scarta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts List */}
      {conflicts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-amber-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-amber-800">
                Conflitti da Risolvere ({conflicts.length})
              </h2>
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Il dato è stato modificato sia localmente che sul server. Scegli quale versione mantenere.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {conflicts.map((op) => (
              <div key={op.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {ENTITY_LABELS[op.entity] || op.entity}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                        {ACTION_LABELS[op.type] || op.type}
                      </span>
                      {op.retryCount > 0 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
                          {op.retryCount} tentativi
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ID: {op.entityId.slice(0, 8)}... — {new Date(op.timestamp).toLocaleString('it-IT')}
                    </p>
                    {op.conflictData?.error && (
                      <p className="text-xs text-red-500 mt-1">{op.conflictData.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOnline && (
                      <button
                        onClick={() => handleShowDiff(op)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                        title="Confronta versioni locale vs server"
                      >
                        <GitCompare className="w-3 h-3" />
                        Confronta
                      </button>
                    )}
                    <button
                      onClick={() => handleResolveConflict(op.id, 'SERVER_WINS')}
                      disabled={resolvingId === op.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      title="Mantieni la versione del server"
                    >
                      <Shield className="w-3 h-3" />
                      Server
                    </button>
                    <button
                      onClick={() => handleResolveConflict(op.id, 'CLIENT_WINS')}
                      disabled={resolvingId === op.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                      title="Ri-invia la versione locale"
                    >
                      <ArrowUpCircle className="w-3 h-3" />
                      Locale
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clear Synced Operations */}
      {stats && stats.synced > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-800">
                {stats.synced} operazion{stats.synced === 1 ? 'e sincronizzata' : 'i sincronizzate'}
              </p>
              <p className="text-xs text-gray-500">Rimuovi le voci già sincronizzate dalla coda</p>
            </div>
          </div>
          <button
            onClick={handleClearSynced}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              clearConfirm
                ? 'text-red-600 border-red-300 bg-red-50 hover:bg-red-100'
                : 'text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Trash2 className="w-3 h-3" />
            {clearConfirm ? 'Conferma' : 'Pulisci'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {stats && stats.pending === 0 && stats.conflict === 0 && stats.failed === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">Tutto sincronizzato</h3>
          <p className="text-xs text-gray-500 mt-1">Non ci sono operazioni in sospeso</p>
        </div>
      )}

      {/* Conflict Diff Modal */}
      {diffModal && (
        <ConflictDiffModal
          op={diffModal.op}
          serverData={diffModal.serverData}
          loading={diffModal.loading}
          error={diffModal.error}
          resolvingId={resolvingId}
          onResolve={handleResolveConflict}
          onClose={() => setDiffModal(null)}
        />
      )}
    </div>
  )
}

// === Conflict Diff Modal ===

function ConflictDiffModal({
  op,
  serverData,
  loading,
  error,
  resolvingId,
  onResolve,
  onClose
}: {
  op: ConflictOp
  serverData: Record<string, unknown> | null
  loading: boolean
  error: string | null
  resolvingId: string | null
  onResolve: (opId: string, strategy: 'SERVER_WINS' | 'CLIENT_WINS') => void
  onClose: () => void
}): JSX.Element {
  // Collect all unique field keys from both local and server
  const localData = op.payload || {}
  const allKeys = Array.from(new Set([
    ...Object.keys(localData),
    ...Object.keys(serverData || {})
  ])).filter(k => !HIDDEN_DIFF_FIELDS.has(k)).sort()

  const formatValue = (v: unknown): string => {
    if (v === null || v === undefined) return '—'
    if (typeof v === 'boolean') return v ? 'Sì' : 'No'
    if (typeof v === 'object') return JSON.stringify(v, null, 2)
    return String(v)
  }

  const isDifferent = (key: string): boolean => {
    if (!serverData) return false
    return formatValue(localData[key]) !== formatValue(serverData[key])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Confronto Conflitto — {ENTITY_LABELS[op.entity] || op.entity}
              </h2>
              <p className="text-xs text-gray-500">ID: {op.entityId.slice(0, 12)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Recupero dati dal server...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {!loading && !error && (
            <div className="overflow-x-auto">
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-2 mb-2 sticky top-0 bg-white pb-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2">Campo</div>
                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide bg-amber-50 rounded-lg px-2 py-1">
                  📱 Locale (tuo)
                </div>
                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide bg-blue-50 rounded-lg px-2 py-1">
                  ☁️ Server
                </div>
              </div>
              <div className="space-y-1">
                {allKeys.map(key => {
                  const different = isDifferent(key)
                  return (
                    <div
                      key={key}
                      className={`grid grid-cols-3 gap-2 rounded-lg px-1 py-1 ${different ? 'bg-yellow-50 border border-yellow-200' : ''}`}
                    >
                      <div className="text-xs font-mono text-gray-500 px-1 flex items-start pt-1">{key}</div>
                      <div className={`text-xs font-mono px-2 py-1 rounded min-h-[24px] break-all ${
                        different ? 'bg-amber-100 text-amber-900' : 'bg-gray-50 text-gray-700'
                      }`}>
                        {formatValue(localData[key])}
                      </div>
                      <div className={`text-xs font-mono px-2 py-1 rounded min-h-[24px] break-all ${
                        different ? 'bg-blue-100 text-blue-900' : 'bg-gray-50 text-gray-700'
                      }`}>
                        {serverData ? formatValue(serverData[key]) : '—'}
                      </div>
                    </div>
                  )
                })}
                {allKeys.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">Nessun campo da confrontare</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500">
            I campi evidenziati in giallo sono diversi tra le due versioni.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              onClick={() => onResolve(op.id, 'SERVER_WINS')}
              disabled={resolvingId === op.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <Shield className="w-3.5 h-3.5" />
              Mantieni Server
            </button>
            <button
              onClick={() => onResolve(op.id, 'CLIENT_WINS')}
              disabled={resolvingId === op.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              Mantieni Locale
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// === Stat Card Component ===

function StatCard({
  label,
  value,
  icon: Icon,
  color
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color: 'amber' | 'green' | 'orange' | 'red'
}): JSX.Element {
  const colorMap = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200'
  }
  const iconColorMap = {
    amber: 'text-amber-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    red: 'text-red-500'
  }

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColorMap[color]}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
