import { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = null // Suppress default console logging

    autoUpdater.on('checking-for-update', () => {
        mainWindow.webContents.send('updater:checking')
    })

    autoUpdater.on('update-available', (info) => {
        mainWindow.webContents.send('updater:available', {
            version: info.version,
            releaseDate: info.releaseDate
        })
    })

    autoUpdater.on('update-not-available', () => {
        mainWindow.webContents.send('updater:not-available')
    })

    autoUpdater.on('download-progress', (progressObj) => {
        mainWindow.webContents.send('updater:progress', {
            percent: progressObj.percent,
            bytesPerSecond: progressObj.bytesPerSecond,
            transferred: progressObj.transferred,
            total: progressObj.total
        })
    })

    autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('updater:downloaded')
    })

    autoUpdater.on('error', (error) => {
        mainWindow.webContents.send('updater:error', error.message)
    })

    // Check for updates every 4 hours — handle rejection to avoid crashing main process
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(() => { /* network unavailable or feed unreachable */ })
    }, 4 * 60 * 60 * 1000)

    // Initial check after 10 seconds
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch(() => { /* silent startup check */ })
    }, 10000)
}
