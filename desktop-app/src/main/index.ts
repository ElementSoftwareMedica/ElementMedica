import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, session, globalShortcut } from 'electron'
import { join } from 'path'
import { appendFileSync, mkdirSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupIpcHandlers, setTray, updateAppBadge } from './ipc-handlers'
import { setupAutoUpdater } from './auto-updater'
import { getDatabase, closeDatabase } from './database'
import { startBridge, stopBridge } from './bridge-process'
import { startCallbackServer, stopCallbackServer } from './bridge-callback-server'
import { setupErrorReporter, watchWindowCrashes } from './error-reporter'
import { setupBackupHandlers, runAutoBackup } from './backup'
import { sendNotification } from './notifications'
import { startGiudziScheduler, stopGiudziScheduler } from './giudizi-scheduler'

// ────────── DB Maintenance ──────────
/**
 * Run SQLite VACUUM + ANALYZE if last run was > 7 days ago.
 * Called 30 s after startup to avoid slowing down initial load.
 * VACUUM reclaims space from soft-deleted rows; ANALYZE refreshes query planner stats.
 */
function scheduleDatabaseMaintenance(): void {
    try {
        const db = getDatabase()
        const row = db.prepare(
            `SELECT value FROM sync_state WHERE key = 'last_vacuum'`
        ).get() as { value: string } | undefined

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        if (!row || row.value < weekAgo) {
            db.exec('VACUUM')
            db.exec('ANALYZE')
            const now = new Date().toISOString()
            db.prepare(
                `INSERT OR REPLACE INTO sync_state (key, value, updatedAt) VALUES ('last_vacuum', ?, ?)`
            ).run(now, now)
        }
    } catch {
        // Non-critical — silently skip
    }
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// ────────── Startup Logger ──────────
// Writes a timestamped line to userData/logs/startup.log.
// Called throughout the startup sequence so crashes can be diagnosed even
// without attaching a debugger — the file survives app restarts.
function writeStartupLog(message: string): void {
    try {
        const logDir = join(app.getPath('userData'), 'logs')
        mkdirSync(logDir, { recursive: true })
        appendFileSync(
            join(logDir, 'startup.log'),
            `[${new Date().toISOString()}] ${message}\n`
        )
    } catch {
        // Never fail the startup sequence because of logging
    }
}

// ────────── Single-instance lock ──────────
// Prevent multiple instances running simultaneously.
// If another instance already holds the lock, focus its window and quit.
if (!app.requestSingleInstanceLock()) {
    app.quit()
}

// ────────── Windows GPU fix ──────────
// Certain Windows GPU drivers (Intel HD Graphics, older AMD, virtual machines)
// cause the Electron renderer to display a completely blank/white window with no
// visible errors. Disabling hardware acceleration forces Chromium to use software
// rendering (SwANGLE) which is universally compatible — slower but guaranteed to render.
// Must be called before app.whenReady().
if (process.platform === 'win32') {
    app.disableHardwareAcceleration()
}

function createWindow(): void {
    const isMac = process.platform === 'darwin'
    const isWin = process.platform === 'win32'

    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        // Hide legacy File/Edit menu bar on all platforms (accessible via Alt on Windows)
        autoHideMenuBar: true,
        title: 'ElementMedica Desktop - Medicina del Lavoro',
        // macOS: hide title bar so content fills edge-to-edge (traffic lights float inline).
        // Traffic lights at x:16 y:37 — centered at y≈43, matching the brand content center
        // (h-[60px] pt-[26px] → center at 26+17=43). The 34px content block fills y=26 to y=60.
        ...(isMac && {
            titleBarStyle: 'hiddenInset',
            trafficLightPosition: { x: 16, y: 37 }
        }),
        // Windows: custom overlay title bar with app colors
        ...(isWin && {
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                color: '#ffffff',
                symbolColor: '#374151',
                height: 40
            }
        }),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: true
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        const { url } = details
        if (url.startsWith('https://') || url.startsWith('http://')) {
            shell.openExternal(url)
        }
        return { action: 'deny' }
    })

    // Watch for renderer crashes and log them
    watchWindowCrashes(mainWindow)

    // DevTools: Cmd+Shift+I / Ctrl+Shift+I / F12 — funzionano anche in produzione
    mainWindow.webContents.on('before-input-event', (_, input) => {
        if (input.type !== 'keyDown') return
        const isMac = process.platform === 'darwin'
        const meta = isMac ? input.meta : input.control
        const isDevShortcut = (meta && input.shift && input.key.toLowerCase() === 'i')
            || input.key === 'F12'
        if (isDevShortcut) {
            if (mainWindow?.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools()
            } else {
                mainWindow?.webContents.openDevTools()
            }
        }
    })

    // Right-click context menu: "Ispeziona elemento" (backup for DevTools access)
    mainWindow.webContents.on('context-menu', (_event, params) => {
        const menu = Menu.buildFromTemplate([
            {
                label: 'Ispeziona elemento (DevTools)',
                click: () => mainWindow?.webContents.openDevTools({ mode: 'detach', activate: true })
            },
            { type: 'separator' },
            {
                label: 'Ricarica pagina',
                click: () => mainWindow?.webContents.reload(),
                enabled: !params.isEditable
            },
            { type: 'separator' },
            {
                label: 'Copia',
                role: 'copy' as const,
                enabled: params.selectionText.length > 0
            },
            {
                label: 'Incolla',
                role: 'paste' as const
            }
        ])
        menu.popup()
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
    // Load icon from resources
    let icon: ReturnType<typeof nativeImage.createEmpty>
    try {
        const iconPath = is.dev
            ? join(__dirname, '../../resources/icon.png')
            : join(process.resourcesPath, 'icon.png')
        icon = nativeImage.createFromPath(iconPath)
        // Resize for tray (16x16 on Windows, 22x22 on Linux, 16x16 on macOS)
        if (!icon.isEmpty()) {
            icon = icon.resize({ width: 16, height: 16 })
        }
    } catch {
        icon = nativeImage.createEmpty()
    }

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

    // ── Log startup info (helps diagnose Windows launch failures) ──
    writeStartupLog(
        `Starting — version: ${app.getVersion()}, platform: ${process.platform}/${process.arch}, ` +
        `electron: ${process.versions.electron}, node: ${process.versions.node}`
    )

    // ── Focus existing window if a second instance is launched ──
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
            mainWindow.focus()
        }
    })

    // ── CORS fix: Electron renderer (file:// origin) sends "Origin: null".
    //    The backend production CORS whitelist doesn't include "null", blocking all API calls.
    //    We intercept requests to the API domain and rewrite the Origin header so the backend
    //    accepts them. This is safe because all requests are still authenticated via JWT.
    const API_ORIGIN = 'https://www.elementmedica.com'
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: [`${API_ORIGIN}/*`] },
        (details, callback) => {
            const headers = { ...details.requestHeaders }
            // Header keys from Electron can be mixed case — find case-insensitively
            const originKey = Object.keys(headers).find(k => k.toLowerCase() === 'origin') || 'Origin'
            const originValue = headers[originKey]
            if (!originValue || originValue === 'null') {
                headers[originKey] = API_ORIGIN
            }
            callback({ requestHeaders: headers })
        }
    )

    // Setup error reporter first (catches uncaught exceptions from this point on)
    setupErrorReporter()
    writeStartupLog('Error reporter initialized')

    // Setup backup IPC handlers
    setupBackupHandlers()

    // Optimize shortcuts
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    // Initialize database — wrapped so a SQLite failure doesn't prevent the window
    // from appearing (renderer will show a degraded-state message if needed).
    try {
        getDatabase()
        writeStartupLog('Database initialized')
    } catch (dbErr) {
        writeStartupLog(`Database init FAILED: ${dbErr instanceof Error ? dbErr.message : String(dbErr)}`)
        // Continue — the window still loads; IPC calls that need the DB will fail gracefully
    }

    // Run daily auto-backup (non-blocking)
    runAutoBackup().catch(() => { })

    // Start bridge callback receiver first (so it's ready when bridge starts)
    startCallbackServer()
    // Auto-start bridge if:
    //   1. config.json exists (device previously configured), OR
    //   2. a cached license with bridge access is found (APP_AND_BRIDGE | BRIDGE_ONLY)
    // On first launch with no license and no config, the bridge is NOT started automatically
    // to avoid the localhost:4050/setup page opening in the system browser unexpectedly.
    const bridgeConfigPath = join(app.getPath('userData'), 'bridge', 'config.json')
    let shouldAutoStartBridge = existsSync(bridgeConfigPath)
    if (!shouldAutoStartBridge) {
        try {
            const db = getDatabase()
            const rows = db.prepare(
                `SELECT value FROM sync_state WHERE key LIKE 'licenseInfo:%' OR key = 'licenseInfo'`
            ).all() as { value: string }[]
            for (const row of rows) {
                try {
                    const info = JSON.parse(row.value) as Record<string, unknown>
                    if (info?.licenseType === 'BRIDGE_ONLY' || info?.licenseType === 'APP_AND_BRIDGE') {
                        shouldAutoStartBridge = true
                        break
                    }
                } catch { /* malformed row */ }
            }
        } catch { /* DB not yet ready */ }
    }
    if (shouldAutoStartBridge) {
        startBridge()
    }

    // Setup IPC handlers
    setupIpcHandlers()

    // Create window and tray
    writeStartupLog('Creating window')
    createWindow()
    createTray()
    if (tray) {
        setTray(tray)
        // Initial badge check after DB is ready
        setTimeout(updateAppBadge, 5000)
        // Refresh badge every 5 minutes
        setInterval(updateAppBadge, 5 * 60 * 1000)
    }

    // Setup auto-updater (production only)
    if (!is.dev) {
        setupAutoUpdater(mainWindow!)
    }

    // Schedule periodic DB maintenance (VACUUM + ANALYZE) — runs after 30s startup delay
    setTimeout(() => scheduleDatabaseMaintenance(), 30_000)

    // Start the daily 22:00 giudizi batch scheduler
    startGiudziScheduler()

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
    stopGiudziScheduler()
    stopBridge()
    stopCallbackServer()
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

// DevTools via IPC (per uso futuro)
ipcMain.on('devtools:open', () => {
    mainWindow?.webContents.openDevTools()
})

// globalShortcut come backup (funziona anche se il focus non è sulla webContents)
app.on('browser-window-focus', () => {
    const shortcut = 'CommandOrControl+Shift+I'
    if (!globalShortcut.isRegistered(shortcut)) {
        globalShortcut.register(shortcut, () => {
            const win = BrowserWindow.getFocusedWindow()
            if (win) {
                if (win.webContents.isDevToolsOpened()) {
                    win.webContents.closeDevTools()
                } else {
                    win.webContents.openDevTools()
                }
            }
        })
    }
})
app.on('browser-window-blur', () => {
    globalShortcut.unregisterAll()
})
