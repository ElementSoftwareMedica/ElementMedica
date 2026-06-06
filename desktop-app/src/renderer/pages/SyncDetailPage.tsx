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
  Loader2,
  History,
  Edit3,
  Save,
  CalendarDays
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
import { ElegantDateRangeInput } from '../components/ElegantControls'

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

interface QueueOperation extends ConflictOp {
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'CONFLICT' | 'FAILED'
  dependsOn?: unknown
  errorMessage?: string | null
}

interface SyncLogRow {
  id: string
  syncSessionId: string
  direction: string
  entityType: string | null
  entityCount: number
  status: string
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
  metadata: string | null
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
  const todayIso = new Date().toISOString().split('T')[0]
  const [dateRange, setDateRange] = useState({ start: todayIso, end: todayIso })
  const [operations, setOperations] = useState<QueueOperation[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLogRow[]>([])
  const [editOp, setEditOp] = useState<{ op: QueueOperation; draft: string; error: string | null } | null>(null)

  const inDateRange = useCallback((isoValue?: string | null): boolean => {
    if (!isoValue) return false
    const day = isoValue.split('T')[0]
    return (!dateRange.start || day >= dateRange.start) && (!dateRange.end || day <= dateRange.end)
  }, [dateRange.end, dateRange.start])

  const loadData = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const [queueStats, conflictOps, queueRows, logRows] = await Promise.all([
        getQueueStats(),
        getConflictOperations(),
        window.desktopApi.db.query({ table: 'operations_queue', orderBy: { column: 'timestamp', direction: 'DESC' }, limit: 200 }).catch(() => []),
        window.desktopApi.db.query({ table: 'sync_log', orderBy: { column: 'startedAt', direction: 'DESC' }, limit: 200 }).catch(() => [])
      ])
      setStats(queueStats)
      setConflictsList(conflictOps as ConflictOp[])
      setPendingOperations(queueStats.pending)
      setConflicts(queueStats.conflict)
      setOperations((queueRows as Array<Record<string, unknown>>).map(row => ({
        ...row,
        payload: parseJsonObject(row.payload, {}),
        dependsOn: parseJsonObject(row.dependsOn, []),
        conflictData: row.conflictData ? parseJsonObject(row.conflictData, null) : null,
      } as QueueOperation)))
      setSyncLogs(logRows as SyncLogRow[])
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

  const handleDiscardOperation = async (id: string): Promise<void> => {
    await window.desktopApi.db.deleteWhere({ table: 'operations_queue', where: { id } })
    await loadData()
  }

  const handleRetryOperation = async (id: string): Promise<void> => {
    await window.desktopApi.db.update({
      table: 'operations_queue',
      id,
      data: { status: 'PENDING', retryCount: 0, conflictData: null, errorMessage: null }
    })
    await loadData()
  }

  const handleSavePayload = async (): Promise<void> => {
    if (!editOp) return
    try {
      const parsed = JSON.parse(editOp.draft) as Record<string, unknown>
      await window.desktopApi.db.update({
        table: 'operations_queue',
        id: editOp.op.id,
        data: {
          payload: JSON.stringify(parsed),
          status: 'PENDING',
          retryCount: 0,
          conflictData: null,
          errorMessage: null,
        }
      })
      setEditOp(null)
      await loadData()
    } catch {
      setEditOp(prev => prev ? { ...prev, error: 'JSON non valido' } : prev)
    }
  }

  const visibleOperations = operations.filter(op => inDateRange(op.timestamp))
  const failedOperations = visibleOperations.filter(op => op.status === 'FAILED')
  const visibleLogs = syncLogs.filter(log => inDateRange(log.startedAt))

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

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <CalendarDays className="h-4 w-4 text-teal-600" />
          Intervallo operazioni
        </div>
        <ElegantDateRangeInput
          value={dateRange}
          onChange={setDateRange}
          presets={[
            { label: 'Oggi', start: todayIso, end: todayIso },
            { label: 'Ieri', start: new Date(Date.now() - 86_400_000).toISOString().split('T')[0], end: new Date(Date.now() - 86_400_000).toISOString().split('T')[0] },
            { label: '7 giorni', start: new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0], end: todayIso },
          ]}
        />
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

      {failedOperations.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white">
          <div className="border-b border-red-100 bg-red-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-red-800">Errori di sincronizzazione nel periodo ({failedOperations.length})</h2>
            <p className="mt-1 text-xs text-red-600">Puoi correggere il payload, ritentare o scartare una singola operazione.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {failedOperations.map(op => (
              <div key={op.id} className="grid gap-3 px-4 py-3 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{ENTITY_LABELS[op.entity] || op.entity}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{ACTION_LABELS[op.type] || op.type}</span>
                    <span className="text-xs text-gray-400">{new Date(op.timestamp).toLocaleString('it-IT')}</span>
                  </div>
                  <p className="mt-1 text-xs text-red-600 line-clamp-2">
                    {formatOperationError(op)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRetryOperation(op.id)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                    <RotateCcw className="h-3 w-3" /> Riprova
                  </button>
                  <button onClick={() => setEditOp({ op, draft: JSON.stringify(op.payload, null, 2), error: null })} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    <Edit3 className="h-3 w-3" /> Payload
                  </button>
                  <button onClick={() => handleDiscardOperation(op.id)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50">
                    <Trash2 className="h-3 w-3" /> Scarta
                  </button>
                </div>
              </div>
            ))}
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <History className="h-4 w-4 text-teal-600" />
          <h2 className="text-sm font-semibold text-gray-900">Sincronizzazioni passate ({visibleLogs.length})</h2>
        </div>
        {visibleLogs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">Nessuna sincronizzazione registrata nel periodo selezionato.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleLogs.map(log => (
              <div key={log.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[140px_1fr_90px_120px]">
                <span className="font-medium text-gray-900">{new Date(log.startedAt).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-gray-600">{log.direction} · {log.entityType || 'tutte le entità'}</span>
                <span className="font-mono text-xs text-gray-500">{log.entityCount || 0} record</span>
                <span className={`text-xs font-semibold ${log.status === 'SUCCESS' ? 'text-green-700' : 'text-red-700'}`}>{log.status}</span>
                {log.errorMessage && <p className="md:col-span-4 text-xs text-red-600">{log.errorMessage}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

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
      {editOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditOp(null)}>
          <div className="m-4 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Modifica payload sincronizzazione</h2>
                <p className="text-xs text-gray-500">{ENTITY_LABELS[editOp.op.entity] || editOp.op.entity} · {editOp.op.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setEditOp(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <textarea
                value={editOp.draft}
                onChange={event => setEditOp(prev => prev ? { ...prev, draft: event.target.value, error: null } : prev)}
                className="min-h-[360px] w-full rounded-xl border border-gray-200 bg-gray-950 p-3 font-mono text-xs text-gray-50 outline-none focus:ring-2 focus:ring-teal-500"
                spellCheck={false}
              />
              {editOp.error && <p className="mt-2 text-xs font-medium text-red-600">{editOp.error}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button onClick={() => setEditOp(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button onClick={handleSavePayload} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
                <Save className="h-3.5 w-3.5" /> Salva e ritenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return (value as T) ?? fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function formatOperationError(op: QueueOperation): string {
  const conflict = op.conflictData as { error?: string; message?: string } | null | undefined
  return op.errorMessage || conflict?.error || conflict?.message || 'Errore non specificato'
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
