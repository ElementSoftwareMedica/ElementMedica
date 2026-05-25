/**
 * Local Database Backup — P98 §6.6
 *
 * Export / import the local SQLite database as an AES-256-GCM encrypted + GZIP compressed
 * backup file (.embak). Encryption uses a machine-bound key stored via OS keychain (safeStorage),
 * ensuring GDPR compliance: backups cannot be read on another machine without the exported key.
 *
 * File format:  EMBAK002 (8 B) | IV (12 B) | ciphertext (N B) | GCM tag (16 B)
 * Content:      AES-256-GCM( GZIP( SQLite DB ) )
 *
 * IPC channels exposed:
 *   'backup:export' → creates encrypted backup, returns { ok, path }
 *   'backup:import' → decrypts and restores DB from .embak file, returns { ok }
 *   'backup:list'   → list available auto-backups, returns { ok, files }
 */

import { app, ipcMain, dialog, safeStorage } from 'electron'
import { join } from 'path'
import {
    existsSync,
    mkdirSync,
    copyFileSync,
    readdirSync,
    statSync,
    unlinkSync,
    readFileSync,
    writeFileSync,
} from 'fs'
import { createReadStream, createWriteStream } from 'fs'
import { createGzip, createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { getDatabasePath } from './database'

// ────────────────────────── Constants ──────────────────────────

const MAX_AUTO_BACKUPS = 30
const BACKUP_MAGIC = Buffer.from('EMBAK002')   // 8 bytes — version marker
const IV_LENGTH = 12                            // AES-GCM standard IV
const TAG_LENGTH = 16                           // AES-GCM authentication tag
const KEY_FILE = '.backup.key'                  // safeStorage-encrypted key file

// ────────────────────────── Paths ──────────────────────────────

function getDbPath(): string {
    return getDatabasePath()
}

function getAutoBackupDir(): string {
    const dir = join(app.getPath('userData'), 'backups')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return dir
}

// ────────────────────────── Encryption key ─────────────────────

/**
 * Get or create a 32-byte AES-256 key stored in the OS keychain via safeStorage.
 * The key is machine-bound — backups are only decryptable on the same machine.
 */
function getOrCreateBackupKey(): Buffer {
    const keyFilePath = join(app.getPath('userData'), KEY_FILE)

    if (existsSync(keyFilePath) && safeStorage.isEncryptionAvailable()) {
        try {
            const encryptedKeyBuf = readFileSync(keyFilePath)
            const keyB64 = safeStorage.decryptString(encryptedKeyBuf)
            return Buffer.from(keyB64, 'base64')
        } catch {
            // Fall through to generate a new key (old key lost / corrupt)
        }
    }

    const key = randomBytes(32)
    if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(key.toString('base64'))
        writeFileSync(keyFilePath, encrypted)
    } else {
        // safeStorage unavailable (headless/CI/unsupported OS) — refuse to create
        // a key file in plaintext to avoid false confidence in backup encryption.
        throw new Error('La crittografia del backup non è disponibile su questo sistema (safeStorage non operativo). Il backup non può essere creato in modo sicuro.')
    }
    return key
}

// ────────────────────────── AES-256-GCM archive helpers ────────

/**
 * Compress with GZIP then encrypt with AES-256-GCM.
 * Output format: EMBAK002 | IV(12) | ciphertext | tag(16)
 */
async function encryptBackup(src: string, dest: string, key: Buffer): Promise<void> {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    // 1. Encrypt+compress to a temp file so we can read back and write final file
    const tmpPath = dest + '.enc_tmp'
    try {
        await pipeline(
            createReadStream(src),
            createGzip({ level: 6 }),
            cipher,
            createWriteStream(tmpPath)
        )

        // 2. After pipeline resolves, cipher.final() has been called → GCM tag is available
        const authTag = cipher.getAuthTag()

        // 3. Write final file: magic + iv, then pipe temp file, then append auth tag
        await new Promise<void>((resolve, reject) => {
            const ws = createWriteStream(dest)
            ws.write(BACKUP_MAGIC)
            ws.write(iv)
            const rs = createReadStream(tmpPath)
            rs.on('error', reject)
            ws.on('error', reject)
            rs.on('end', () => {
                ws.write(authTag)
                ws.end()
            })
            ws.on('finish', resolve)
            rs.pipe(ws, { end: false })
        })
    } finally {
        // Always clean up the temp file, even on crash/error
        try { unlinkSync(tmpPath) } catch { /* already gone */ }
    }
}

/**
 * Decrypt AES-256-GCM and decompress to restore the SQLite DB.
 */
async function decryptBackup(src: string, dest: string, key: Buffer): Promise<void> {
    const fileBuffer = readFileSync(src)

    // Parse header: magic(8) + iv(12)
    const magic = fileBuffer.subarray(0, 8)
    if (!magic.equals(BACKUP_MAGIC)) {
        throw new Error('File di backup non valido o corrotto (magic bytes non corrispondono)')
    }

    const iv = fileBuffer.subarray(8, 8 + IV_LENGTH)
    const authTag = fileBuffer.subarray(fileBuffer.length - TAG_LENGTH)
    const ciphertext = fileBuffer.subarray(8 + IV_LENGTH, fileBuffer.length - TAG_LENGTH)

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    // Decrypt → gunzip → write DB
    await new Promise<void>((resolve, reject) => {
        const readable = Readable.from(ciphertext)
        const gunzip = createGunzip()
        const ws = createWriteStream(dest)
        ws.on('finish', resolve)
        ws.on('error', reject)
        decipher.on('error', reject)
        gunzip.on('error', reject)
        readable.pipe(decipher).pipe(gunzip).pipe(ws)
    })
}

// ────────────────────────── Legacy plain GZIP helpers ──────────
// For backwards compatibility when importing old .db.gz files

async function gunzipFileLegacy(src: string, dest: string): Promise<void> {
    await pipeline(
        createReadStream(src),
        createGunzip(),
        createWriteStream(dest)
    )
}

// ────────────────────────── Auto-backup ────────────────────────

/** Create a daily encrypted auto-backup and rotate old ones. Called at app startup. */
export async function runAutoBackup(): Promise<void> {
    const dbPath = getDbPath()
    if (!existsSync(dbPath)) return  // DB not initialized yet

    const dir = getAutoBackupDir()
    const today = new Date().toISOString().slice(0, 10)  // YYYY-MM-DD
    const backupName = `auto-${today}.embak`
    const backupPath = join(dir, backupName)

    // Skip if today's backup already exists
    if (existsSync(backupPath)) return

    try {
        const key = getOrCreateBackupKey()
        await encryptBackup(dbPath, backupPath, key)
        rotateAutoBackups(dir)
    } catch {
        // Silently skip on error — non-critical
    }
}

function rotateAutoBackups(dir: string): void {
    try {
        const files = readdirSync(dir)
            .filter((f) => f.startsWith('auto-') && (f.endsWith('.embak') || f.endsWith('.db.gz')))
            .map((f) => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
            .sort((a, b) => a.mtime - b.mtime)

        while (files.length > MAX_AUTO_BACKUPS) {
            const oldest = files.shift()!
            unlinkSync(join(dir, oldest.name))
        }
    } catch {
        // Ignore
    }
}

// ────────────────────────── IPC setup ──────────────────────────

export function setupBackupHandlers(): void {
    // Export: AES-256-GCM encrypted + GZIP compressed backup
    ipcMain.handle('backup:export', async (_event, opts?: { silent?: boolean }) => {
        const dbPath = getDbPath()
        if (!existsSync(dbPath)) {
            return { ok: false, error: 'Database non trovato' }
        }

        try {
            let destPath: string
            const key = getOrCreateBackupKey()

            if (opts?.silent) {
                // Silent export: save to auto-backup dir with timestamp
                const ts = new Date().toISOString().replace(/[:.]/g, '-')
                destPath = join(getAutoBackupDir(), `manual-${ts}.embak`)
            } else {
                // Interactive: ask user where to save
                const result = await dialog.showSaveDialog({
                    title: 'Esporta backup crittografato',
                    defaultPath: join(
                        app.getPath('documents'),
                        `elementmedica-backup-${new Date().toISOString().slice(0, 10)}.embak`
                    ),
                    filters: [
                        { name: 'ElementMedica Backup (crittografato)', extensions: ['embak'] },
                        { name: 'Tutti i file', extensions: ['*'] },
                    ],
                })
                if (result.canceled || !result.filePath) {
                    return { ok: false, error: 'Annullato' }
                }
                destPath = result.filePath
            }

            await encryptBackup(dbPath, destPath, key)
            return { ok: true, path: destPath }
        } catch (err) {
            return { ok: false, error: String(err) }
        }
    })

    // Import: decrypt and restore DB from a .embak file (requires app restart)
    ipcMain.handle('backup:import', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Importa backup database',
            filters: [
                { name: 'ElementMedica Backup', extensions: ['embak', 'db.gz'] },
                { name: 'Tutti i file', extensions: ['*'] },
            ],
            properties: ['openFile'],
        })

        if (result.canceled || result.filePaths.length === 0) {
            return { ok: false, error: 'Annullato' }
        }

        const srcPath = result.filePaths[0]
        const dbPath = getDbPath()
        const tempPath = dbPath + '.restore.tmp'

        try {
            const isLegacy = srcPath.endsWith('.db.gz')
            if (isLegacy) {
                await gunzipFileLegacy(srcPath, tempPath)
            } else {
                const key = getOrCreateBackupKey()
                await decryptBackup(srcPath, tempPath, key)
            }

            // Backup current DB before overwriting
            if (existsSync(dbPath)) {
                const safeguard = dbPath + '.pre-restore.bak'
                copyFileSync(dbPath, safeguard)
            }

            // Replace DB
            copyFileSync(tempPath, dbPath)
            unlinkSync(tempPath)

            return { ok: true, message: 'Database ripristinato. Riavvia l\'applicazione.' }
        } catch (err) {
            // Clean up temp file
            try { unlinkSync(tempPath) } catch { /* noop */ }
            return { ok: false, error: String(err) }
        }
    })

    // List auto-backups
    ipcMain.handle('backup:list', () => {
        try {
            const dir = getAutoBackupDir()
            const files = readdirSync(dir)
                .filter((f) => f.endsWith('.embak') || f.endsWith('.db.gz'))
                .map((f) => {
                    const stat = statSync(join(dir, f))
                    return {
                        name: f,
                        path: join(dir, f),
                        size: stat.size,
                        createdAt: stat.mtime.toISOString(),
                        encrypted: f.endsWith('.embak'),
                    }
                })
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

            return { ok: true, files }
        } catch {
            return { ok: false, files: [] }
        }
    })
}
