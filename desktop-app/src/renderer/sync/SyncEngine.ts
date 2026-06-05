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
    // Table name keys
    visits: 'visita',
    appointments: 'appuntamento',
    giudizi_idoneita: 'giudizioIdoneita',
    esami_strumentali: 'esameStrumentale',
    movimenti_contabili: 'movimentoContabile',
    scadenze: 'scadenzaPrestazioneProtocollo',
    patients: 'personTenantProfile',
    companies: 'companyTenantProfile',
    lavoratore_mansioni: 'lavoratoreMansione',
    mansioni: 'mansione',
    company_sites: 'companySite',
    appointment_prestazioni: 'appuntamentoPrestazione',
    protocolli: 'protocolloSanitario',
    allegati: 'allegatoVisita',
    documenti_compilati: 'documentoCompilato',
    questionari_medici_config: 'questionarioMedicoConfig',
    questionari_risposte: 'questionarioRisposta',
    profili_salute: 'profiloDiSalutePersona',
    documenti_clinici: 'documentoClinico',
    referti: 'referto',
    firme_digitali: 'firmaDigitale',
    // Alias keys (Prisma model names used directly in enqueue calls)
    visita: 'visita',
    appuntamento: 'appuntamento',
    giudizioIdoneita: 'giudizioIdoneita',
    esameStrumentale: 'esameStrumentale',
    movimentoContabile: 'movimentoContabile',
    personTenantProfile: 'personTenantProfile',
    companyTenantProfile: 'companyTenantProfile',
    lavoratoreMansione: 'lavoratoreMansione',
    mansione: 'mansione',
    companySite: 'companySite',
    protocolloSanitario: 'protocolloSanitario',
    appuntamentoPrestazione: 'appuntamentoPrestazione',
    allegatoVisita: 'allegatoVisita',
    allegato: 'allegatoVisita',
    documentoCompilato: 'documentoCompilato',
    questionarioMedicoConfig: 'questionarioMedicoConfig',
    questionarioRisposta: 'questionarioRisposta',
    profiloDiSalutePersona: 'profiloDiSalutePersona',
    documentoClinico: 'documentoClinico',
    referto: 'referto',
    firmaDigitale: 'firmaDigitale',
    // Rischi aggiuntivi lavoratore
    lavoratore_rischi_aggiuntivi: 'lavoratoreRischioAggiuntivo',
    lavoratoreRischioAggiuntivo: 'lavoratoreRischioAggiuntivo',
    mansione_rischi: 'mansioneRischio',
    mansioneRischio: 'mansioneRischio',
    protocollo_prestazioni: 'protocolloPrestazione',
    protocolloPrestazione: 'protocolloPrestazione',
    // Legacy DeadlineItem alias kept only to drain old queued operations.
    deadlineItem: 'deadlineItem',
    // ScadenzaPrestazioneProtocollo (MDL protocol deadlines)
    scadenze_prestazioni_protocollo: 'scadenzaPrestazioneProtocollo',
    scadenzaPrestazioneProtocollo: 'scadenzaPrestazioneProtocollo',
    nominaRuolo: 'nominaRuolo',
    nomine_ruolo: 'nominaRuolo',
    tariffario_company_associations: 'tariffarioCompanyAssociation',
    tariffarioCompanyAssociation: 'tariffarioCompanyAssociation',
    sopralluoghi: 'sopralluogo',
    sopralluogo: 'sopralluogo',
    dvr: 'dVR',
    dVR: 'dVR',
    consulenze_mdl: 'consulenzaMDL',
    consulenzaMDL: 'consulenzaMDL',
    allegati_3b: 'allegato3B',
    allegato3B: 'allegato3B'
}

const ACTION_MAP: Record<string, string> = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete'
}

// === Dependency Resolution ===

const ACTION_PRIORITY: Record<string, number> = { CREATE: 0, UPDATE: 1, DELETE: 2 }

const ENTITY_PRIORITY: Record<string, number> = {
    patients: 0,
    companies: 0,
    personTenantProfile: 0,
    companyTenantProfile: 0,
    company_sites: 1,
    companySite: 1,
    protocolli: 1,
    protocolloSanitario: 1,
    protocollo_prestazioni: 1,
    protocolloPrestazione: 1,
    mansione_rischi: 1,
    mansioneRischio: 1,
    nominaRuolo: 1,
    nomine_ruolo: 1,
    tariffario_company_associations: 2,
    tariffarioCompanyAssociation: 2,
    visits: 2,
    visita: 2,
    appointments: 2,
    appuntamento: 2,
    appointment_prestazioni: 2,
    appuntamentoPrestazione: 2,
    lavoratore_mansioni: 2,
    lavoratoreMansione: 2,
    giudizi_idoneita: 3,
    giudizioIdoneita: 3,
    esami_strumentali: 3,
    esameStrumentale: 3,
    movimenti_contabili: 4,
    movimentoContabile: 4,
    scadenze: 4,
    deadlineItem: 4,
    scadenze_prestazioni_protocollo: 4,
    scadenzaPrestazioneProtocollo: 4,
    mansione: 2,
    mansioni: 2,
    lavoratore_rischi_aggiuntivi: 3,
    lavoratoreRischioAggiuntivo: 3,
    allegati: 4,
    allegatoVisita: 4,
    allegato: 4,
    documenti_compilati: 4,
    questionari_medici_config: 4,
    questionari_risposte: 5,
    profili_salute: 3,
    documenti_clinici: 5,
    referti: 5,
    firme_digitali: 6,
    documentoCompilato: 4,
    questionarioMedicoConfig: 4,
    questionarioRisposta: 5,
    profiloDiSalutePersona: 3,
    documentoClinico: 5,
    referto: 5,
    firmaDigitale: 6,
    sopralluoghi: 4,
    sopralluogo: 4,
    dvr: 4,
    dVR: 4,
    consulenze_mdl: 4,
    consulenzaMDL: 4,
    allegati_3b: 4,
    allegato3B: 4
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

interface UploadSyncOptions {
    notify?: boolean
}

export async function executeUploadSync(callbacks: SyncCallbacks, options: UploadSyncOptions = {}): Promise<void> {
    const shouldNotify = options.notify !== false
    callbacks.onStart()

    try {
        const pending = await window.desktopApi.sync.getPendingOperations() as PendingOperation[]

        if (pending.length === 0) {
            callbacks.onComplete({ success: 0, conflict: 0, error: 0 })
            return
        }

        let token: string | null = null
        try {
            const stored = await window.desktopApi.auth.getTokens()
            token = stored.accessToken || null
        } catch { /* token unavailable */ }
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
                        'X-Desktop-Client': 'true',
                        ...(localStorage.getItem('desktop_currentTenantId')
                            ? {
                                'X-Tenant-ID': localStorage.getItem('desktop_currentTenantId')!,
                                'X-Operate-Tenant-Id': localStorage.getItem('desktop_currentTenantId')!
                            }
                            : {})
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

        // Upload client-side error log to server (non-blocking, best-effort)
        try {
            const errorLog = await window.desktopApi.app.getErrorLog()
            if (Array.isArray(errorLog) && errorLog.length > 0) {
                const tenantId = localStorage.getItem('desktop_currentTenantId') || ''
                await axios.post(
                    `${API_BASE}/api/v1/desktop-sync/error-report`,
                    { errors: errorLog },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'X-Desktop-Client': 'true',
                            ...(tenantId ? { 'X-Tenant-ID': tenantId, 'X-Operate-Tenant-Id': tenantId } : {})
                        },
                        timeout: 15000
                    }
                )
                await window.desktopApi.app.clearErrorLog()
            }
        } catch { /* error log upload is non-blocking */ }

        // Sync binary attachments (non-blocking, runs after metadata operations)
        try {
            await syncAttachments(token, localStorage.getItem('desktop_currentTenantId') || '')
        } catch { /* attachment sync is non-blocking */ }

        // Native notification on sync completion
        try {
            if (!shouldNotify) return
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
                // Check if user was explicitly disabled (wipe remoto)
                if (error.response.data?.userDisabled === true || error.response.data?.wiped === true) {
                    // Require confirmation before irreversible wipe — prevents accidental data loss from server bugs
                    const confirmed = await window.desktopApi?.app?.confirmDialog?.({
                        title: 'Account disabilitato',
                        message: 'Il server ha segnalato che questo account è stato disabilitato. Vuoi cancellare i dati locali da questo dispositivo?',
                        detail: 'Questa operazione è irreversibile. I dati non ancora sincronizzati andranno persi.',
                        buttons: ['Annulla', 'Cancella dati locali'],
                        defaultId: 0,
                        type: 'warning'
                    })
                    if (confirmed) {
                        await performWipeRemoto()
                        callbacks.onError('Account disabilitato — dati locali cancellati')
                    } else {
                        callbacks.onError('Sessione scaduta — effettua nuovamente il login')
                    }
                } else {
                    callbacks.onError('Sessione scaduta — effettua nuovamente il login')
                }
            } else if (error.response?.status === 403 && error.response.data?.userDisabled === true) {
                const confirmed = await window.desktopApi?.app?.confirmDialog?.({
                    title: 'Accesso revocato',
                    message: 'Il server ha revocato l\'accesso a questo account. Vuoi cancellare i dati locali da questo dispositivo?',
                    detail: 'Questa operazione è irreversibile.',
                    buttons: ['Annulla', 'Cancella dati locali'],
                    defaultId: 0,
                    type: 'warning'
                })
                if (confirmed) {
                    await performWipeRemoto()
                    callbacks.onError('Accesso revocato — dati locali cancellati')
                } else {
                    callbacks.onError('Accesso revocato — effettua nuovamente il login')
                }
            } else {
                callbacks.onError('Errore nella sincronizzazione')
            }
        } else {
            const errMsg = error instanceof Error ? error.message : String(error)
            callbacks.onError(`Errore imprevisto: ${errMsg}`)
        }
    }
}

/**
 * Wipe Remoto: cancella tutti i dati locali quando il server segnala
 * che l'utente è stato disabilitato. Rispetta il GDPR (nessuna conservazione
 * di dati PII dopo revoca del consenso/accesso).
 */
async function performWipeRemoto(): Promise<void> {
    try {
        // Clear all SQLite tables with patient data
        const TABLES_TO_WIPE = [
            'visits', 'appointments', 'patients', 'companies', 'company_sites', 'nomine_ruolo',
            'mansioni', 'mansione_rischi', 'lavoratore_mansioni', 'protocolli', 'protocollo_prestazioni', 'scadenze',
            'giudizi_idoneita', 'movimenti_contabili', 'prestazioni', 'tariffari',
            'convenzioni', 'ambulatori', 'slot_disponibilita', 'medici', 'visit_templates', 'document_templates', 'questionari_medici_config', 'esami_strumentali',
            'allegati', 'documenti_compilati', 'questionari_risposte',
            'profili_salute', 'documenti_clinici', 'person_documents', 'referti', 'visit_revisions',
            'visit_access_logs', 'firme_digitali', 'lavoratore_rischi_aggiuntivi',
            'tariffario_voci', 'tariffario_company_associations', 'sopralluoghi', 'dvr', 'consulenze_mdl', 'allegati_3b',
            'operations_queue', 'sync_log'
        ]
        for (const table of TABLES_TO_WIPE) {
            try {
                await window.desktopApi.db.clearTable({ table })
            } catch { /* table may not exist */ }
        }
        // Clear auth tokens from secure storage (safeStorage)
        if (window.desktopApi?.auth) {
            window.desktopApi.auth.clearTokens().catch(() => { /* best-effort */ })
        }
        // Clear non-sensitive cached data from localStorage
        const KEYS_TO_CLEAR = [
            'desktop_accessToken', 'desktop_refreshToken', 'desktop_user',
            'desktop_tenantId', 'desktop_currentTenantId', 'desktop_permissions',
            'desktop_availableTenants'
        ]
        for (const key of KEYS_TO_CLEAR) {
            localStorage.removeItem(key)
        }
        // Force reload after wipe to show login page
        setTimeout(() => window.location.reload(), 1000)
    } catch {
        // Non-blocking — reload anyway
        localStorage.clear()
        setTimeout(() => window.location.reload(), 1000)
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

// === Discard Failed ===

export async function discardFailedOperations(): Promise<void> {
    await window.desktopApi.db.deleteWhere({
        table: 'operations_queue',
        where: { status: 'FAILED' }
    })
}

// === Queue Stats ===

export async function getQueueStats(): Promise<QueueStats> {
    return await window.desktopApi.sync.getQueueStats() as QueueStats
}

// === Get Conflicts ===

export async function getConflictOperations(): Promise<PendingOperation[]> {
    return await window.desktopApi.sync.getConflicts() as PendingOperation[]
}

// === Sync Binary Attachments ===

interface PendingAllegato {
    id: string
    visitaId: string | null
    serverVisitaId?: string | null
    nome: string
    tipo: string | null
    dimensione: number | null
    localPath: string
    tenantId: string
}

export async function syncAttachments(token: string, tenantId: string): Promise<{ uploaded: number; errors: number }> {
    let uploaded = 0
    let errors = 0

    try {
        const pending = await window.desktopApi.file.getPendingAttachments() as PendingAllegato[]
        if (!pending || pending.length === 0) return { uploaded: 0, errors: 0 }

        for (const allegato of pending) {
            try {
                // Read file from local path via IPC (main process)
                const fileData = await window.desktopApi.file.readLocalFile(allegato.localPath) as { buffer: string; size: number }

                // Reconstruct binary from base64
                const binaryStr = atob(fileData.buffer)
                const bytes = new Uint8Array(binaryStr.length)
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i)
                }

                // Determine MIME type from extension
                const mimeTypeMap: Record<string, string> = {
                    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                    png: 'image/png', gif: 'image/gif', webp: 'image/webp',
                    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    txt: 'text/plain', csv: 'text/csv'
                }
                const ext = (allegato.tipo || 'bin').toLowerCase()
                const mimeType = mimeTypeMap[ext] || 'application/octet-stream'

                const blob = new Blob([bytes], { type: mimeType })
                const formData = new FormData()
                formData.append('file', blob, allegato.nome)
                formData.append('allegatoLocalId', allegato.id)
                formData.append('visitaId', allegato.serverVisitaId || allegato.visitaId || '')
                formData.append('nome', allegato.nome)
                formData.append('tipo', allegato.tipo || 'bin')
                formData.append('dimensione', String(allegato.dimensione || fileData.size))
                formData.append('mimeType', mimeType)

                const tenantHeaders: Record<string, string> = tenantId
                    ? { 'X-Tenant-ID': tenantId, 'X-Operate-Tenant-Id': tenantId }
                    : {}

                let response
                try {
                    response = await axios.post(
                        `${API_BASE}/api/v1/desktop-sync/upload-attachment`,
                        formData,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'X-Desktop-Client': 'true',
                                ...tenantHeaders
                            },
                            timeout: 60000
                        }
                    )
                } catch (error) {
                    if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error
                    const routeMissing = typeof error.response?.data === 'string'
                        ? error.response.data.toLowerCase().includes('cannot post')
                        : String(error.response?.data?.error || error.response?.data?.message || '').toLowerCase().includes('endpoint')
                    if (!routeMissing) throw error
                    const fallbackForm = new FormData()
                    fallbackForm.append('file', blob, allegato.nome)
                    fallbackForm.append('visitaId', allegato.serverVisitaId || allegato.visitaId || '')
                    fallbackForm.append('tipo', mimeType.startsWith('image/') ? 'image' : 'document')
                    fallbackForm.append('descrizione', allegato.nome)
                    response = await axios.post(
                        `${API_BASE}/api/v1/clinica/documenti/visita/upload`,
                        fallbackForm,
                        {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'X-Desktop-Client': 'true',
                                ...tenantHeaders
                            },
                            timeout: 60000
                        }
                    )
                }

                const serverUrl = response.data?.serverUrl || response.data?.data?.fileUrl || response.data?.data?.serverUrl
                if (serverUrl) {
                    await window.desktopApi.file.markAttachmentSynced({
                        id: allegato.id,
                        serverUrl
                    })
                    uploaded++
                } else {
                    errors++
                }
            } catch {
                errors++
            }
        }
    } catch {
        // Non-blocking
    }

    return { uploaded, errors }
}

// === Incremental Download (Live Sync) ===

export interface DownloadCallbacks {
    onStart: () => void
    onComplete: (recordCount: number) => void
    onError: (message: string) => void
}

/**
 * executeIncrementalDownload — scarica dal server solo i record modificati
 * dall'ultimo download ({@link lastSyncAt}). Usa GET /download-full-db?lastSyncAt=<ts>.
 * Se lastSyncAt è null, salta il download (full sync va fatto manualmente).
 * Progettato per essere chiamato ogni 3 minuti quando online.
 */
export async function executeIncrementalDownload(
    lastSyncAt: string | null,
    callbacks: DownloadCallbacks
): Promise<void> {
    // Skip if no baseline download was ever done
    if (!lastSyncAt) return

    callbacks.onStart()

    try {
        let token: string | null = null
        try {
            const stored = await window.desktopApi.auth.getTokens()
            token = stored.accessToken || null
        } catch { /* token unavailable */ }
        if (!token) {
            callbacks.onError('Sessione scaduta')
            return
        }

        const tenantId = localStorage.getItem('desktop_currentTenantId') || ''
        const tenantHeaders: Record<string, string> = tenantId
            ? { 'X-Tenant-ID': tenantId, 'X-Operate-Tenant-Id': tenantId }
            : {}

        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'
        const response = await axios.get(`${API_BASE}/api/v1/desktop-sync/download-full-db`, {
            params: { lastSyncAt },
            headers: {
                Authorization: `Bearer ${token}`,
                'X-Desktop-Client': 'true',
                ...tenantHeaders
            },
            timeout: 60000
        })

        const data = response.data
        const counts = data.meta?.counts || {}
        const totalRecords = Object.values(counts).reduce((a: number, b) => a + (b as number), 0) as number

        // Skip merging if server returned no changes
        if (totalRecords === 0) {
            callbacks.onComplete(0)
            return
        }

        await window.desktopApi.sync.storeDayData({ data })
        callbacks.onComplete(totalRecords)
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            callbacks.onError('Sessione scaduta')
        }
        // Other errors (network, timeout) are silently ignored — will retry next interval
    }
}
