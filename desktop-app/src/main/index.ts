import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipc-handlers'
import { setupAutoUpdater } from './auto-updater'
import { getDatabase, closeDatabase } from './database'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: false,
    title: 'ElementMedica Desktop - Medicina del Lavoro',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Dev: load from Vite dev server. Prod: load built files
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault()
    }
  })
}

function createTray(): void {
  // Placeholder icon — will be replaced with actual icon
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Apri ElementMedica', click: () => mainWindow?.show() },
    { type: 'separator' },
    {
      label: 'Stato: Online',
      id: 'connection-status',
      enabled: false
    },
    { type: 'separator' },
    { label: 'Esci', click: () => app.quit() }
  ])

  tray.setToolTip('ElementMedica Desktop')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => mainWindow?.show())
}

app.whenReady().then(() => {
  // Set app user model ID for Windows
  electronApp.setAppUserModelId('com.elementsoftware.elementmedica-desktop')

  // Optimize shortcuts
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Initialize database
  getDatabase()

  // Setup IPC handlers
  setupIpcHandlers()

  // Create window and tray
  createWindow()
  createTray()

  // Setup auto-updater (production only)
  if (!is.dev) {
    setupAutoUpdater(mainWindow!)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running in tray
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

// Handle graceful shutdown
app.on('before-quit', () => {
  closeDatabase()
})

// IPC: Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())
