import type { DataAdapter, ApiRequest, ApiResponse } from './ApiAdapter'

/**
 * OfflineAdapter — Routes API calls to local SQLite via IPC.
 * Used when the app is offline.
 *
 * Maps REST-style API paths to local database operations.
 */
export class OfflineAdapter implements DataAdapter {
  isAvailable(): boolean {
    return !!window.desktopApi
  }

  async request<T = unknown>(req: ApiRequest): Promise<ApiResponse<T>> {
    const route = this.matchRoute(req)
    if (!route) {
      throw new Error(`Operazione non disponibile offline: ${req.method} ${req.path}`)
    }
    const data = await route()
    return { data: data as T, status: 200, isOffline: true }
  }

  private matchRoute(req: ApiRequest): (() => Promise<unknown>) | null {
    const { method, path, data } = req

    // ========== VISITS ==========
    if (method === 'GET' && path.match(/\/api\/v1\/visite$/)) {
      return () => this.queryTable('visits')
    }
    if (method === 'GET' && path.match(/\/api\/v1\/visite\/([^/]+)$/)) {
      const id = path.split('/').pop()!
      return () => this.queryOne('visits', id)
    }
    if (method === 'POST' && path.match(/\/api\/v1\/visite$/)) {
      return () => this.insertWithQueue('visits', 'visita', data!)
    }
    if (method === 'PUT' && path.match(/\/api\/v1\/visite\/([^/]+)$/)) {
      const id = path.split('/').pop()!
      return () => this.updateWithQueue('visits', id, 'visita', data!)
    }

    // ========== APPOINTMENTS ==========
    if (method === 'GET' && path.match(/\/api\/v1\/appuntamenti/)) {
      return () => this.queryTable('appointments')
    }

    // ========== PATIENTS ==========
    if (method === 'GET' && path.match(/\/api\/v1\/persons/)) {
      return () => this.queryTable('patients')
    }

    // ========== COMPANIES ==========
    if (method === 'GET' && path.match(/\/api\/v1\/companies/)) {
      return () => this.queryTable('companies')
    }

    // ========== SCADENZE ==========
    if (method === 'GET' && path.match(/\/api\/v1\/scadenze-mdl/)) {
      return () => this.queryTable('scadenze')
    }

    // ========== MANSIONI ==========
    if (method === 'GET' && path.match(/\/api\/v1\/mansioni/)) {
      return () => this.queryTable('mansioni')
    }

    // ========== PROTOCOLLI ==========
    if (method === 'GET' && path.match(/\/api\/v1\/protocolli-sanitari/)) {
      return () => this.queryTable('protocolli')
    }

    // ========== PRESTAZIONI ==========
    if (method === 'GET' && path.match(/\/api\/v1\/prestazioni/)) {
      return () => this.queryTable('prestazioni')
    }

    // ========== MOVIMENTI CONTABILI ==========
    if (method === 'GET' && path.match(/\/api\/v1\/movimenti-contabili/)) {
      return () => this.queryTable('movimenti_contabili')
    }

    return null
  }

  // ========== HELPERS ==========

  private async queryTable(table: string): Promise<unknown[]> {
    const rows = await window.desktopApi.db.query({
      table,
      where: { _isDeleted: 0 }
    })
    return rows as unknown[]
  }

  private async queryOne(table: string, id: string): Promise<unknown> {
    const rows = await window.desktopApi.db.query({
      table,
      where: { id, _isDeleted: 0 },
      limit: 1
    })
    const results = rows as unknown[]
    if (results.length === 0) throw new Error('Record non trovato')
    return results[0]
  }

  private async insertWithQueue(
    table: string,
    entity: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    // Insert locally
    const result = await window.desktopApi.db.insert({ table, data })

    // Enqueue for sync
    await window.desktopApi.sync.enqueue({
      type: 'CREATE',
      entity,
      entityId: result.id as string,
      localId: result._localId as string,
      payload: data
    })

    return { ...data, id: result.id }
  }

  private async updateWithQueue(
    table: string,
    id: string,
    entity: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    // Update locally
    await window.desktopApi.db.update({ table, id, data })

    // Enqueue for sync
    await window.desktopApi.sync.enqueue({
      type: 'UPDATE',
      entity,
      entityId: id,
      payload: data
    })

    return { ...data, id }
  }
}
