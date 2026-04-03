import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'

// === Types ===

interface PendingOperation {
  id: string
  type: string
  entity: string
  entityId: string
  localId: string | null
  payload: Record<string, unknown>
  dependsOn: string[]
  timestamp: string
  status: string
  retryCount: number
}

interface UploadResult {
  operationId: string
  status: 'success' | 'conflict' | 'rejected' | 'error'
  serverId?: string
  serverUpdatedAt?: string
  error?: string
}

export interface SyncCallbacks {
  onStart: () => void
  onProgress: (current: number, total: number) => void
  onComplete: (summary: SyncSummary) => void
  onError: (message: string) => void
}

export interface SyncSummary {
  success: number
  conflict: number
  error: number
}

export interface QueueStats {
  pending: number
  synced: number
  conflict: number
  failed: number
  total: number
}

// === Entity & Action Maps ===

const ENTITY_MAP: Record<string, string> = {
  visits: 'visita',
  appointments: 'appuntamento',
  giudizi_idoneita: 'giudizioIdoneita',
  esami_strumentali: 'esameStrumentale',
  movimenti_contabili: 'movimentoContabile',
  scadenze: 'deadlineItem'
}

const ACTION_MAP: Record<string, string> = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
}

// === Dependency Resolution ===

const ACTION_PRIORITY: Record<string, number> = { CREATE: 0, UPDATE: 1, DELETE: 2 }

const ENTITY_PRIORITY: Record<string, number> = {
  visits: 0,
  appointments: 1,
  giudizi_idoneita: 2,
  esami_strumentali: 2,
  movimenti_contabili: 3,
  scadenze: 3
}

/**
 * Sort operations by dependency graph:
 * - CREATEs before UPDATEs before DELETEs
 * - Parent entities before child entities (for CREATEs)
 * - Reverse order for DELETEs (children first)
 * - Tiebreaker: timestamp FIFO
 */
function sortByDependency(ops: PendingOperation[]): PendingOperation[] {
  return [...ops].sort((a, b) => {
    const aAction = ACTION_PRIORITY[a.type] ?? 1
    const bAction = ACTION_PRIORITY[b.type] ?? 1
    if (aAction !== bAction) return aAction - bAction

    const aEntity = ENTITY_PRIORITY[a.entity] ?? 99
    const bEntity = ENTITY_PRIORITY[b.entity] ?? 99
    if (a.type === 'DELETE') return bEntity - aEntity
    if (aEntity !== bEntity) return aEntity - bEntity

    return a.timestamp.localeCompare(b.timestamp)
  })
}

// === Constants ===

const MAX_RETRIES = 3
const BATCH_SIZE = 500

// === Main Upload Sync ===

export async function executeUploadSync(callbacks: SyncCallbacks): Promise<void> {
  callbacks.onStart()

  try {
    const pending = await window.desktopApi.sync.getPendingOperations() as PendingOperation[]

    if (pending.length === 0) {
      callbacks.onComplete({ success: 0, conflict: 0, error: 0 })
      return
    }

    const token = localStorage.getItem('desktop_accessToken')
    if (!token) {
      callbacks.onError('Sessione scaduta — effettua nuovamente il login')
      return
    }

    // Sort by dependency graph and filter valid + retriable operations
    const sorted = sortByDependency(pending)
    const operations = sorted
      .filter(op => ACTION_MAP[op.type] && ENTITY_MAP[op.entity])
      .filter(op => op.retryCount < MAX_RETRIES)
      .map(op => ({
        id: op.id,
        entityType: ENTITY_MAP[op.entity],
        entityId: op.entityId,
        action: ACTION_MAP[op.type],
        data: op.payload,
        timestamp: op.timestamp
      }))

    if (operations.length === 0) {
      callbacks.onComplete({ success: 0, conflict: 0, error: 0 })
      return
    }

    let clientId = localStorage.getItem('desktop_clientId')
    if (!clientId) {
      clientId = crypto.randomUUID()
      localStorage.setItem('desktop_clientId', clientId)
    }

    callbacks.onProgress(0, operations.length)

    let totalSuccess = 0
    let totalConflict = 0
    let totalError = 0

    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = operations.slice(i, i + BATCH_SIZE)

      const response = await axios.post(
        `${API_BASE}/api/v1/desktop-sync/upload-batch`,
        { clientId, operations: batch },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Desktop-Client': 'true'
          },
          timeout: 120000
        }
      )

      const results: UploadResult[] = response.data.results || []

      for (const result of results) {
        const newStatus = result.status === 'success' ? 'SYNCED'
          : result.status === 'conflict' ? 'CONFLICT'
          : 'FAILED'

        await window.desktopApi.sync.updateOperationStatus({
          id: result.operationId,
          status: newStatus,
          conflictData: result.status === 'conflict' ? result : undefined
        })

        // ID remapping: when a CREATE succeeds and server returns serverId
        if (result.status === 'success' && result.serverId) {
          const originalOp = sorted.find(op => op.id === result.operationId)
          if (originalOp && originalOp.type === 'CREATE') {
            await window.desktopApi.sync.remapId({
              table: originalOp.entity,
              localId: originalOp.entityId,
              serverId: result.serverId
            })
          }
        }
      }

      totalSuccess += results.filter(r => r.status === 'success').length
      totalConflict += results.filter(r => r.status === 'conflict').length
      totalError += results.filter(r => r.status === 'error' || r.status === 'rejected').length

      callbacks.onProgress(Math.min(i + BATCH_SIZE, operations.length), operations.length)
    }

    callbacks.onComplete({
      success: totalSuccess,
      conflict: totalConflict,
      error: totalError
    })

    // Native notification on sync completion
    try {
      if (window.desktopApi?.app?.showNotification) {
        if (totalConflict > 0) {
          await window.desktopApi.app.showNotification({
            title: 'Sincronizzazione completata',
            body: `${totalSuccess} operazioni sincronizzate, ${totalConflict} conflitti da risolvere`
          })
        } else if (totalError > 0) {
          await window.desktopApi.app.showNotification({
            title: 'Sincronizzazione completata con errori',
            body: `${totalSuccess} sincronizzate, ${totalError} errori`
          })
        } else if (totalSuccess > 0) {
          await window.desktopApi.app.showNotification({
            title: 'Sincronizzazione completata',
            body: `${totalSuccess} operazioni sincronizzate con successo`
          })
        }
      }
    } catch { /* notifications are non-blocking */ }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        callbacks.onError('Sessione scaduta — effettua nuovamente il login')
      } else {
        callbacks.onError('Errore nella sincronizzazione')
      }
    } else {
      callbacks.onError('Errore imprevisto nella sincronizzazione')
    }
  }
}

// === Conflict Resolution ===

export async function resolveConflict(
  operationId: string,
  strategy: 'SERVER_WINS' | 'CLIENT_WINS'
): Promise<void> {
  if (strategy === 'SERVER_WINS') {
    // Discard local change — server data is authoritative
    await window.desktopApi.sync.updateOperationStatus({
      id: operationId,
      status: 'SYNCED'
    })
  } else {
    // Re-queue for upload with reset retry count
    await window.desktopApi.sync.resolveConflict({
      id: operationId,
      strategy: 'CLIENT_WINS'
    })
  }
}

// === Retry Failed ===

export async function retryFailedOperations(): Promise<number> {
  return await window.desktopApi.sync.retryFailed() as number
}

// === Queue Stats ===

export async function getQueueStats(): Promise<QueueStats> {
  return await window.desktopApi.sync.getQueueStats() as QueueStats
}

// === Get Conflicts ===

export async function getConflictOperations(): Promise<PendingOperation[]> {
  return await window.desktopApi.sync.getConflicts() as PendingOperation[]
}
