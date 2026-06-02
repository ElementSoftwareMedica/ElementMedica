import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * Desktop API exposed to the renderer process via contextBridge.
 * SECURITY: Only whitelisted channels are exposed.
 */
const desktopApi = {
    // ========== DATABASE ==========
    db: {
        query: (params: { table: string; where?: Record<string, unknown>; orderBy?: { column: string; direction: string }; limit?: number }) =>
            ipcRenderer.invoke('db:query', params),
        insert: (params: { table: string; data: Record<string, unknown> }) =>
            ipcRenderer.invoke('db:insert', params),
        update: (params: { table: string; id: string; data: Record<string, unknown> }) =>
            ipcRenderer.invoke('db:update', params),
        softDelete: (params: { table: string; id: string; reason?: string }) =>
            ipcRenderer.invoke('db:softDelete', params),
        deleteWhere: (params: { table: string; where: Record<string, unknown> }) =>
            ipcRenderer.invoke('db:deleteWhere', params),
        clearTable: (params: { table: string }) =>
            ipcRenderer.invoke('db:clearTable', params),
        searchPatients: (params: { query: string }) =>
            ipcRenderer.invoke('db:searchPatients', params),
        exportBackup: () =>
            ipcRenderer.invoke('db:exportBackup'),
        importBackup: () =>
            ipcRenderer.invoke('db:importBackup')
    },

    // ========== SYNC ==========
    sync: {
        enqueue: (operation: {
            type: string;
            entity: string;
            entityId: string;
            localId?: string;
            payload: Record<string, unknown>;
            dependsOn?: string[];
        }) => ipcRenderer.invoke('sync:enqueue', operation),
        getPendingOperations: () => ipcRenderer.invoke('sync:getPendingOperations'),
        updateOperationStatus: (params: { id: string; status: string; conflictData?: unknown }) =>
            ipcRenderer.invoke('sync:updateOperationStatus', params),
        storeDayData: (params: { data: Record<string, unknown[]> }) =>
            ipcRenderer.invoke('sync:storeDayData', params),
        remapId: (params: { table: string; localId: string; serverId: string }) =>
            ipcRenderer.invoke('sync:remapId', params),
        getConflicts: () => ipcRenderer.invoke('sync:getConflicts'),
        resolveConflict: (params: { id: string; strategy: string }) =>
            ipcRenderer.invoke('sync:resolveConflict', params),
        retryFailed: () => ipcRenderer.invoke('sync:retryFailed'),
        getQueueStats: () => ipcRenderer.invoke('sync:getQueueStats')
    },

    // ========== APP INFO ==========
    app: {
        getVersion: () => ipcRenderer.invoke('app:getVersion'),
        getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
        isPackaged: () => ipcRenderer.invoke('app:isPackaged'),
        showNotification: (params: { title: string; body: string }) =>
            ipcRenderer.invoke('app:showNotification', params),
        updateBadge: () => ipcRenderer.invoke('app:updateBadge'),
        getScadenzeCount: () => ipcRenderer.invoke('app:getScadenzeCount'),
        logError: (params: { message: string; stack?: string; context?: string }) =>
            ipcRenderer.invoke('app:logError', params),
        getErrorLog: () => ipcRenderer.invoke('app:getErrorLog'),
        clearErrorLog: () => ipcRenderer.invoke('app:clearErrorLog'),
        openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
        confirmDialog: (params: { title: string; message: string; detail?: string; buttons?: string[]; defaultId?: number; type?: string }) =>
            ipcRenderer.invoke('app:confirmDialog', params),
    },

    // ========== FILE OPERATIONS ==========
    dialog: {
        openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
            ipcRenderer.invoke('dialog:openFile', options)
    },
    file: {
        copyToAppData: (params: { sourcePath: string; visitaId: string }) =>
            ipcRenderer.invoke('file:copyToAppData', params),
        writeBase64Attachment: (params: { base64: string; fileName: string; visitaId: string }) =>
            ipcRenderer.invoke('file:writeBase64Attachment', params),
        readLocalFile: (localPath: string) =>
            ipcRenderer.invoke('file:readLocalFile', localPath),
        openLocalFile: (localPath: string) =>
            ipcRenderer.invoke('file:openLocalFile', localPath),
        saveGeneratedDocument: (params: { bufferBase64: string; fileName: string; scopeId?: string }) =>
            ipcRenderer.invoke('file:saveGeneratedDocument', params),
        exportLocalFile: (params: { localPath: string; fileName: string }) =>
            ipcRenderer.invoke('file:exportLocalFile', params),
        getPendingAttachments: () =>
            ipcRenderer.invoke('file:getPendingAttachments'),
        markAttachmentSynced: (params: { id: string; serverUrl: string }) =>
            ipcRenderer.invoke('file:markAttachmentSynced', params)
    },

    // ========== WINDOW CONTROLS ==========
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close')
    },

    // ========== TENANT SCOPE ==========
    tenant: {
        set: (tenantId: string | null) => ipcRenderer.invoke('tenant:set', tenantId),
        get: () => ipcRenderer.invoke('tenant:get')
    },

    // ========== SECURE AUTH TOKENS (OS keychain via safeStorage) ==========
    auth: {
        storeTokens: (tokens: Record<string, string>) => ipcRenderer.invoke('auth:storeTokens', tokens),
        getTokens: () => ipcRenderer.invoke('auth:getTokens') as Promise<Record<string, string>>,
        clearTokens: () => ipcRenderer.invoke('auth:clearTokens'),
        storePasswordHash: (password: string) => ipcRenderer.invoke('auth:storePasswordHash', password),
        verifyPasswordHash: (password: string) => ipcRenderer.invoke('auth:verifyPasswordHash', password) as Promise<{ ok: boolean; verified: boolean }>,
    },

    // ========== UPDATER ACTIONS ==========
    updater: {
        downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
        installUpdate: () => ipcRenderer.invoke('updater:installUpdate')
    },

    // ========== LICENSE ==========
    license: {
        getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
        getMachineName: () => ipcRenderer.invoke('license:getMachineName'),
        getInfo: (tenantId?: string) => ipcRenderer.invoke('license:getInfo', tenantId),
        storeInfo: (info: Record<string, unknown>, tenantId?: string) => ipcRenderer.invoke('license:storeInfo', info, tenantId)
    },

    // ========== RISCHI AGGIUNTIVI PER LAVORATORE ==========
    rischi: {
        getForWorker: (personId: string) => ipcRenderer.invoke('rischi:getForWorker', { personId }),
        add: (personId: string, tenantId: string, data: Record<string, unknown>) => ipcRenderer.invoke('rischi:add', { personId, tenantId, data }),
        update: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('rischi:update', { id, data }),
        remove: (id: string) => ipcRenderer.invoke('rischi:remove', { id }),
    },

    // ========== MEDICAL DEVICE BRIDGE ==========
    bridge: {
        start: () => ipcRenderer.invoke('bridge:start'),
        stop: () => ipcRenderer.invoke('bridge:stop'),
        getStatus: () => ipcRenderer.invoke('bridge:getStatus'),
        getPort: () => ipcRenderer.invoke('bridge:getPort'),
        getConfig: () => ipcRenderer.invoke('bridge:getConfig'),
        saveDeviceConfig: (devices: unknown[]) => ipcRenderer.invoke('bridge:saveDeviceConfig', devices),
        selectDirectory: () => ipcRenderer.invoke('bridge:selectDirectory') as Promise<string | null>,
        selectExecutable: () => ipcRenderer.invoke('bridge:selectExecutable') as Promise<string | null>,
        testConnectivity: () => ipcRenderer.invoke('bridge:testConnectivity') as Promise<{ ok: boolean; status: string; data?: unknown }>,
        testDeviceConfig: () => ipcRenderer.invoke('bridge:testDeviceConfig') as Promise<{ ok: boolean; devices?: Array<{ type: string; displayName: string; enabled: boolean; executableExists: boolean; inputDirExists: boolean; outputDirExists: boolean; pdfDirExists: boolean }>; error?: string }>,
        startExam: (params: {
            tipo: string
            patientData: Record<string, string>
            visitaId: string
            sessionId: string
            tenantId?: string
        }) => ipcRenderer.invoke('bridge:startExam', params),
    },

    // ========== BACKUP (P98 §6.6) ==========
    backup: {
        export: (opts?: { silent?: boolean }) => ipcRenderer.invoke('backup:export', opts),
        import: () => ipcRenderer.invoke('backup:import'),
        list: () => ipcRenderer.invoke('backup:list'),
    },

    // ========== CRASH REPORTER (P98 §6.4) ==========
    crash: {
        report: (payload: { message: string; stack?: string; extra?: Record<string, unknown> }) =>
            ipcRenderer.invoke('app:reportError', payload),
        getLogs: (limit?: number) => ipcRenderer.invoke('app:getCrashLogs', limit),
        clearLogs: () => ipcRenderer.invoke('app:clearCrashLogs'),
    },

    // ========== NOTIFICATIONS (P98 §6.5) ==========
    notify: {
        send: (payload: { event: string; detail?: string; title?: string; body?: string }) =>
            ipcRenderer.invoke('notify:send', payload),
    },

    // ========== GDPR AUDIT LOG ==========
    gdpr: {
        getAuditLog: (params?: { resourceType?: string; limit?: number }) =>
            ipcRenderer.invoke('gdpr:getAuditLog', params),
        addEntry: (params: { resourceType: string; resourceId: string; action: string; reason?: string; dataAccessed?: string[] }) =>
            ipcRenderer.invoke('gdpr:addEntry', params),
    },

    // ========== FSE 2.0 (Fascicolo Sanitario Elettronico) ==========
    fse: {
        getConsent: (patientId: string) => ipcRenderer.invoke('fse:getConsent', { patientId }),
        setConsent: (patientId: string, consent: boolean, optOut?: boolean) =>
            ipcRenderer.invoke('fse:setConsent', { patientId, consent, optOut }),
        exportVisit: (visitId: string, saveToFile?: boolean) =>
            ipcRenderer.invoke('fse:exportVisit', { visitId, saveToFile }),
    },

    // ========== GIUDIZI IDONEITÀ SCHEDULER ==========
    giudizi: {
        runBatch: (force?: boolean) => ipcRenderer.invoke('giudizi:runBatch', force ?? true) as Promise<{
            date: string
            status: 'success' | 'failed' | 'no_giudizi' | 'offline'
            giudiziTrovati?: number
            pdfGenerati?: number
            emailInviati?: number
            zipAziende?: number
            error?: string
            completedAt?: string
        }>,
        getStatus: () => ipcRenderer.invoke('giudizi:getStatus') as Promise<{
            lastRun: string | null
            lastResult: { date: string; status: 'success' | 'failed' | 'no_giudizi' | 'offline'; giudiziTrovati?: number; pdfGenerati?: number; emailInviati?: number; zipAziende?: number; error?: string; completedAt?: string } | null
            isRunning: boolean
        }>
    },

    // ========== EVENTS (Main → Renderer) ==========
    on: {
        updaterChecking: (callback: () => void) =>
            ipcRenderer.on('updater:checking', callback),
        updaterAvailable: (callback: (_event: unknown, info: { version: string; releaseDate: string }) => void) =>
            ipcRenderer.on('updater:available', callback),
        updaterNotAvailable: (callback: () => void) =>
            ipcRenderer.on('updater:not-available', callback),
        updaterProgress: (callback: (_event: unknown, progress: { percent: number }) => void) =>
            ipcRenderer.on('updater:progress', callback),
        updaterDownloaded: (callback: () => void) =>
            ipcRenderer.on('updater:downloaded', callback),
        updaterError: (callback: (_event: unknown, message: string) => void) =>
            ipcRenderer.on('updater:error', callback),
        bridgeExamResult: (callback: (_event: unknown, data: {
            sessionId: string
            visitaId?: string
            tipo: string
            risultato?: string
            valori?: Record<string, string>
            note?: string
            rawGdt?: string
            pdfPath?: string
            pdfBase64?: string
            pdfFilename?: string
            deviceName?: string
            completedAt: string
        }) => void) => ipcRenderer.on('bridge:examResult', callback),
        removeAllListeners: (channel: string) =>
            ipcRenderer.removeAllListeners(channel),
        giudziiBatchResult: (callback: (_event: unknown, result: {
            date: string
            status: 'success' | 'failed' | 'no_giudizi' | 'offline'
            giudiziTrovati?: number
            pdfGenerati?: number
            emailInviati?: number
            zipAziende?: number
            error?: string
            completedAt?: string
        }) => void) => ipcRenderer.on('giudizi:batchResult', callback)
    }
}

// Type for the desktop API
export type DesktopApi = typeof desktopApi

// Expose APIs
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('desktopApi', desktopApi)
    } catch (error) {
        console.error('Failed to expose desktop API:', error)
    }
} else {
    // @ts-ignore - window augmentation
    window.electron = electronAPI
    // @ts-ignore - window augmentation
    window.desktopApi = desktopApi
}
