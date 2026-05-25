/**
 * Native Notifications — P98 §6.5
 *
 * Sends native OS notifications for key app events.
 * Uses Electron's built-in Notification API (no external dependencies).
 *
 * Events handled:
 *   - Sync completed successfully
 *   - Sync failed (with error message)
 *   - Conflicts to resolve (with count)
 *   - Bridge: exam result received
 *   - App update available
 *   - Backup created
 *
 * IPC channel: 'notify:send' → called by renderer to trigger native notification
 * Also used directly from main process (syncEngine, bridge callback, etc.)
 */

import { Notification, nativeImage, app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

// ────────────────────────── Types ──────────────────────────────

export type NotificationEvent =
    | 'sync-complete'
    | 'sync-failed'
    | 'sync-conflicts'
    | 'bridge-exam-result'
    | 'update-available'
    | 'update-downloaded'
    | 'backup-created'
    | 'custom'

export interface NotifyPayload {
    event: NotificationEvent
    /** Extra context (conflict count, exam device name, error message, etc.) */
    detail?: string
    /** Override title (for 'custom' event) */
    title?: string
    /** Override body (for 'custom' event) */
    body?: string
}

// ────────────────────────── Icon ───────────────────────────────

function getAppIcon(): Electron.NativeImage {
    const candidates = [
        join(__dirname, '../../resources/icon.png'),
        join(app.getAppPath(), 'resources/icon.png'),
        join(process.resourcesPath ?? '', 'icon.png'),
    ]
    for (const c of candidates) {
        if (existsSync(c)) return nativeImage.createFromPath(c)
    }
    return nativeImage.createEmpty()
}

// ────────────────────────── Message builder ────────────────────

interface NotificationMessage {
    title: string
    body: string
}

function buildMessage(payload: NotifyPayload): NotificationMessage {
    switch (payload.event) {
        case 'sync-complete':
            return {
                title: 'Sincronizzazione completata',
                body: payload.detail
                    ? `Dati aggiornati con il server. ${payload.detail}`
                    : 'Tutti i dati sono stati sincronizzati con ElementMedica.',
            }

        case 'sync-failed':
            return {
                title: 'Sincronizzazione fallita',
                body: payload.detail
                    ? `Errore: ${payload.detail}`
                    : 'Impossibile sincronizzare. Riprova quando sei online.',
            }

        case 'sync-conflicts':
            return {
                title: 'Conflitti da risolvere',
                body: payload.detail
                    ? `${payload.detail} conflitt${Number(payload.detail) === 1 ? 'o richiede' : 'i richiedono'} la tua attenzione.`
                    : 'Ci sono conflitti da risolvere prima di completare la sincronizzazione.',
            }

        case 'bridge-exam-result':
            return {
                title: 'Risultato esame ricevuto',
                body: payload.detail
                    ? `Esame ${payload.detail} completato. Il risultato è stato salvato.`
                    : 'L\'esame strumentale è stato completato e salvato automaticamente.',
            }

        case 'update-available':
            return {
                title: 'Aggiornamento disponibile',
                body: payload.detail
                    ? `Versione ${payload.detail} disponibile. Verrà installata alla prossima chiusura.`
                    : 'Un aggiornamento è disponibile e verrà installato alla chiusura dell\'app.',
            }

        case 'update-downloaded':
            return {
                title: 'Aggiornamento pronto',
                body: 'L\'aggiornamento è stato scaricato. Riavvia l\'applicazione per installarlo.',
            }

        case 'backup-created':
            return {
                title: 'Backup creato',
                body: payload.detail
                    ? `Backup salvato in: ${payload.detail}`
                    : 'Il backup del database è stato creato.',
            }

        case 'custom':
            return {
                title: payload.title ?? 'ElementMedica Desktop',
                body: payload.body ?? '',
            }
    }
}

// ────────────────────────── Public API ─────────────────────────

/**
 * Send a native OS notification.
 * No-op if notifications are not supported on the platform.
 */
export function sendNotification(payload: NotifyPayload): void {
    if (!Notification.isSupported()) return

    const { title, body } = buildMessage(payload)
    if (!title && !body) return

    const notification = new Notification({
        title,
        body,
        icon: getAppIcon(),
        silent: false,
    })

    notification.show()
}
