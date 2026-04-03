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
  Trash2
} from 'lucide-react'
import { useSyncStatus } from '../sync/SyncStatusProvider'
import { useConnectivity } from '../context/ConnectivityContext'
import {
  executeUploadSync,
  getQueueStats,
  getConflictOperations,
  resolveConflict,
  retryFailedOperations,
  type QueueStats
} from '../sync/SyncEngine'

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

interface ConflictOp {
  id: string
  type: string
  entity: string
  entityId: string
  timestamp: string
  retryCount: number
  payload: Record<string, unknown>
  conflictData: {
    operationId: string
    status: string
    serverId?: string
    serverUpdatedAt?: string
    error?: string
  } | null
}

export function SyncDetailPage(): JSX.Element {
  const { isOnline } = useConnectivity()
  const {
    syncState, pendingOperations, setSyncState, setProgress,
    setLastSyncAt, setPendingOperations, setErrorMessage, setConflicts
  } = useSyncStatus()

  const [stats, setStats] = useState<QueueStats | null>(null)
  const [conflicts, setConflictsList] = useState<ConflictOp[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

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
      await loadData()
    } catch {
      // Silent
    }
    setResolvingId(null)
  }

  const handleRetryFailed = async (): Promise<void> => {
    const count = await retryFailedOperations()
    if (count > 0) {
      await loadData()
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
            disabled={!isOnline || syncState === 'UPLOADING' || (stats?.pending ?? 0) === 0}
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
          <StatCard
            label="In Coda"
            value={stats.pending}
            icon={Clock}
            color="amber"
          />
          <StatCard
            label="Sincronizzati"
            value={stats.synced}
            icon={CheckCircle2}
            color="green"
          />
          <StatCard
            label="Conflitti"
            value={stats.conflict}
            icon={AlertTriangle}
            color="orange"
          />
          <StatCard
            label="Falliti"
            value={stats.failed}
            icon={XCircle}
            color="red"
          />
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
      </div>

      {/* Failed Operations — Retry */}
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
            <button
              onClick={handleRetryFailed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Riprova Tutto
            </button>
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
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ID: {op.entityId.slice(0, 8)}... — {new Date(op.timestamp).toLocaleString('it-IT')}
                    </p>
                    {op.conflictData?.error && (
                      <p className="text-xs text-red-500 mt-1">{op.conflictData.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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

      {/* Empty State */}
      {stats && stats.pending === 0 && stats.conflict === 0 && stats.failed === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900">Tutto sincronizzato</h3>
          <p className="text-xs text-gray-500 mt-1">
            Non ci sono operazioni in sospeso
          </p>
        </div>
      )}
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
