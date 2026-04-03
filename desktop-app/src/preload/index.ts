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
    softDelete: (params: { table: string; id: string }) =>
      ipcRenderer.invoke('db:softDelete', params),
    deleteWhere: (params: { table: string; where: Record<string, unknown> }) =>
      ipcRenderer.invoke('db:deleteWhere', params)
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
      ipcRenderer.invoke('app:showNotification', params)
  },

  // ========== FILE OPERATIONS ==========
  dialog: {
    openFile: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
      ipcRenderer.invoke('dialog:openFile', options)
  },
  file: {
    copyToAppData: (params: { sourcePath: string; visitaId: string }) =>
      ipcRenderer.invoke('file:copyToAppData', params)
  },

  // ========== WINDOW CONTROLS ==========
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
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
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    storeInfo: (info: Record<string, unknown>) => ipcRenderer.invoke('license:storeInfo', info)
  },

  // ========== RISCHI AGGIUNTIVI PER LAVORATORE ==========
  rischi: {
    getForWorker: (personId: string) => ipcRenderer.invoke('rischi:getForWorker', { personId }),
    add: (personId: string, tenantId: string, data: Record<string, unknown>) => ipcRenderer.invoke('rischi:add', { personId, tenantId, data }),
    update: (id: string, data: Record<string, unknown>) => ipcRenderer.invoke('rischi:update', { id, data }),
    remove: (id: string) => ipcRenderer.invoke('rischi:remove', { id }),
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
    removeAllListeners: (channel: string) =>
      ipcRenderer.removeAllListeners(channel)
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
