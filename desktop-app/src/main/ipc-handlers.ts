import { ipcMain, app, dialog, BrowserWindow, Tray, safeStorage, shell } from 'electron'
import { getDatabase } from './database'
import { encryptRecord, decryptRecord } from './crypto'
import { getMachineId, getMachineName } from './fingerprint'
import { v4 as uuidv4 } from 'uuid'
import { copyFileSync, mkdirSync, statSync, existsSync, appendFileSync, readFileSync, writeFileSync } from 'fs'
import { join, basename, extname } from 'path'
import { startBridge, stopBridge, getBridgeStatus, BRIDGE_PORT } from './bridge-process'
import { bridgeEvents, BRIDGE_CALLBACK_TOKEN } from './bridge-callback-server'
import type { BridgeExamResult } from './bridge-callback-server'
import { sendNotification } from './notifications'
import { generateFhirBundle } from './fse-export'
import type { FhirPatient, FhirVisit, FhirGiudizio } from './fse-export'

/**
 * IPC Handlers — Main Process
 * Ogni handler valida gli input prima di operare su SQLite (security)
 */

// Current tenant scope — set by renderer when user switches tenant
let currentTenantId: string | null = null

// Tray reference for badge updates
let trayRef: Tray | null = null

export function setTray(t: Tray): void {
    trayRef = t
}

/**
 * Query pending scadenze within N days and update dock badge + tray tooltip.
 * Called after storeDayData and on a 5-min interval from main process.
 */
export function updateAppBadge(): void {
    try {
        const db = getDatabase()
        const cutoff = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const params: unknown[] = [cutoff]
        let sql = `SELECT COUNT(*) as count FROM scadenze WHERE eseguita = 0 AND _isDeleted = 0 AND dataScadenza <= ?`
        if (currentTenantId) {
            sql += ` AND tenantId = ?`
            params.push(currentTenantId)
        }
        const row = db.prepare(sql).get(...params) as { count: number } | undefined
        const count = row?.count ?? 0

        // macOS dock badge
        if (app.isReady() && typeof app.setBadgeCount === 'function') {
            app.setBadgeCount(count)
        }

        // Tray tooltip
        if (trayRef) {
            trayRef.setToolTip(
                count > 0
                    ? `ElementMedica Desktop — ${count} scadenz${count === 1 ? 'a' : 'e'} in scadenza`
                    : 'ElementMedica Desktop'
            )
        }
    } catch {
        // Non-critical — silent
    }
}

// Tables that contain tenantId and should be auto-filtered
// appointment_prestazioni and company_sites are excluded: they are scoped
// through their parent (appointments/companies) and have no tenantId column.
const TENANT_SCOPED_TABLES = new Set([
    'visits', 'appointments',
    'patients', 'companies', 'nomine_ruolo',
    'mansioni', 'mansione_rischi', 'lavoratore_mansioni', 'protocolli', 'protocollo_prestazioni',
    'scadenze', 'giudizi_idoneita', 'movimenti_contabili',
    'prestazioni', 'tariffari', 'convenzioni', 'ambulatori', 'slot_disponibilita', 'medici',
    'visit_templates', 'document_templates', 'questionari_medici_config', 'esami_strumentali', 'allegati',
    'documenti_compilati', 'questionari_risposte',
    'profili_salute', 'documenti_clinici', 'person_documents', 'referti',
    'firme_digitali', 'lavoratore_rischi_aggiuntivi',
    'tariffario_voci', 'tariffario_company_associations', 'sopralluoghi', 'dvr', 'consulenze_mdl', 'allegati_3b'
])

export function setupIpcHandlers(): void {

    // ========== TENANT SCOPE ==========
    ipcMain.handle('tenant:set', async (_event, tenantId: string | null) => {
        currentTenantId = tenantId
        return { success: true }
    })

    ipcMain.handle('tenant:get', async () => {
        return currentTenantId
    })

    // ========== SECURE TOKEN STORAGE (safeStorage / OS keychain) ==========
    // Tokens are stored encrypted via the OS keychain rather than in plaintext localStorage.
    // The encrypted blobs are persisted in sync_state using well-known keys.

    const TOKEN_KEYS = new Set(['auth:accessToken', 'auth:refreshToken'])

    ipcMain.handle('auth:storeTokens', async (_event, tokens: Record<string, string>) => {
        if (!tokens || typeof tokens !== 'object') throw new Error('Tokens non validi')
        const db = getDatabase()
        const now = new Date().toISOString()
        for (const [key, value] of Object.entries(tokens)) {
            const storeKey = `auth:${key}`
            if (!TOKEN_KEYS.has(storeKey)) continue // only allow whitelisted keys
            if (typeof value !== 'string') continue
            const stored = safeStorage.isEncryptionAvailable()
                ? safeStorage.encryptString(value).toString('base64')
                : Buffer.from(value).toString('base64') // fallback: base64 (no crypto, but isolated in userData)
            db.prepare(`INSERT OR REPLACE INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?)`)
                .run(storeKey, stored, now)
        }
        return { success: true }
    })

    ipcMain.handle('auth:getTokens', async () => {
        const db = getDatabase()
        const result: Record<string, string> = {}
        for (const storeKey of TOKEN_KEYS) {
            const row = db.prepare(`SELECT value FROM sync_state WHERE key = ?`).get(storeKey) as { value: string } | undefined
            if (!row) continue
            try {
                const decrypted = safeStorage.isEncryptionAvailable()
                    ? safeStorage.decryptString(Buffer.from(row.value, 'base64'))
                    : Buffer.from(row.value, 'base64').toString('utf8')
                const shortKey = storeKey.replace('auth:', '')
                result[shortKey] = decrypted
            } catch { /* corrupted entry — skip */ }
        }
        return result
    })

    ipcMain.handle('auth:clearTokens', async () => {
        const db = getDatabase()
        for (const storeKey of TOKEN_KEYS) {
            db.prepare(`DELETE FROM sync_state WHERE key = ?`).run(storeKey)
        }
        db.prepare(`DELETE FROM sync_state WHERE key = 'auth:passwordHash'`).run()
        return { success: true }
    })

    ipcMain.handle('auth:storePasswordHash', async (_event, password: string) => {
        if (typeof password !== 'string' || password.length === 0) throw new Error('Password non valida')
        const db = getDatabase()
        const { scryptSync, randomBytes: rb } = await import('crypto')
        const salt = rb(32)
        const hash = scryptSync(password, salt, 64)
        const combined = Buffer.concat([salt, hash]).toString('base64')
        const stored = safeStorage.isEncryptionAvailable()
            ? safeStorage.encryptString(combined).toString('base64')
            : combined
        db.prepare(`INSERT OR REPLACE INTO sync_state (key, value, updatedAt) VALUES ('auth:passwordHash', ?, ?)`)
            .run(stored, new Date().toISOString())
        return { success: true }
    })

    ipcMain.handle('auth:verifyPasswordHash', async (_event, password: string) => {
        if (typeof password !== 'string' || password.length === 0) return { ok: false, verified: false }
        const db = getDatabase()
        const row = db.prepare(`SELECT value FROM sync_state WHERE key = 'auth:passwordHash'`).get() as { value: string } | undefined
        if (!row) return { ok: true, verified: false }
        try {
            const { scryptSync, timingSafeEqual } = await import('crypto')
            const combined = safeStorage.isEncryptionAvailable()
                ? safeStorage.decryptString(Buffer.from(row.value, 'base64'))
                : row.value
            const buf = Buffer.from(combined, 'base64')
            const salt = buf.subarray(0, 32)
            const storedHash = buf.subarray(32)
            const hash = scryptSync(password, salt, 64) as Buffer
            const verified = timingSafeEqual(hash, storedHash)
            return { ok: true, verified }
        } catch {
            return { ok: false, verified: false }
        }
    })

    // ========== DATABASE OPERATIONS ==========

    ipcMain.handle('db:query', async (_event, { table, where, orderBy, limit }) => {
        validateTableName(table)
        const db = getDatabase()
        let sql = `SELECT * FROM ${table}`
        const params: unknown[] = []

        // Auto-inject tenantId filter for tenant-scoped tables
        const effectiveWhere = { ...where }
        if (currentTenantId && TENANT_SCOPED_TABLES.has(table) && !effectiveWhere.tenantId) {
            effectiveWhere.tenantId = currentTenantId
        }

        if (effectiveWhere && typeof effectiveWhere === 'object') {
            const conditions = Object.entries(effectiveWhere)
                .filter(([key]) => isValidColumnName(key))
                .map(([key]) => {
                    params.push(effectiveWhere[key] ?? null)
                    return `"${key}" = ?`
                })
            if (conditions.length > 0) {
                sql += ` WHERE ${conditions.join(' AND ')}`
            }
        }

        if (orderBy && isValidColumnName(orderBy.column)) {
            const dir = orderBy.direction === 'DESC' ? 'DESC' : 'ASC'
            sql += ` ORDER BY "${orderBy.column}" ${dir}`
        }

        if (limit && typeof limit === 'number' && limit > 0 && limit <= 1000) {
            sql += ` LIMIT ${Math.floor(limit)}`
        }

        const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
        return rows.map(row => decryptRecord(table, row))
    })

    ipcMain.handle('db:insert', async (_event, { table, data }) => {
        validateTableName(table)
        validateData(data)
        const db = getDatabase()

        const id = data.id || uuidv4()
        const now = new Date().toISOString()
        const record = encryptRecord(table, {
            ...data,
            id,
            _localId: data._localId || id,
            _syncStatus: 'PENDING',
            _localUpdatedAt: now,
            _version: 1,
            _isDeleted: 0
        })

        const columns = Object.keys(record).filter(isValidColumnName)
        const placeholders = columns.map(() => '?')
        const values = columns.map(col => record[col])

        const sql = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')})`
        db.prepare(sql).run(...values)

        return { id, _localId: record._localId }
    })

    ipcMain.handle('db:update', async (_event, { table, id, data }) => {
        validateTableName(table)
        validateData(data)
        if (!id || typeof id !== 'string') throw new Error('ID invalido')

        const db = getDatabase()
        const now = new Date().toISOString()
        // Prevent overwriting immutable fields (id, tenantId) via update payload
        const IMMUTABLE_COLUMNS = new Set(['id', '_localId', 'tenantId'])
        const updateData = encryptRecord(table, {
            ...data,
            _syncStatus: 'PENDING',
            _localUpdatedAt: now,
            _version: (data._version || 0) + 1
        })

        const columns = Object.keys(updateData).filter(k => isValidColumnName(k) && !IMMUTABLE_COLUMNS.has(k))
        const setClauses = columns.map(col => `"${col}" = ?`)
        const values = [...columns.map(col => updateData[col]), id]

        // Enforce tenant isolation: only update rows belonging to the current tenant
        const tenantScoped = TENANT_SCOPED_TABLES.has(table) && currentTenantId
        const sql = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE id = ?${tenantScoped ? ' AND tenantId = ?' : ''}`
        if (tenantScoped) values.push(currentTenantId!)
        db.prepare(sql).run(...values)

        return { success: true }
    })

    ipcMain.handle('db:softDelete', async (_event, { table, id, reason }) => {
        validateTableName(table)
        if (!id || typeof id !== 'string') throw new Error('ID invalido')

        const db = getDatabase()
        const now = new Date().toISOString()
        // Enforce tenant isolation: only soft-delete rows belonging to the current tenant
        const tenantScoped = TENANT_SCOPED_TABLES.has(table) && currentTenantId
        const sql = `UPDATE "${table}" SET "_isDeleted" = 1, "_syncStatus" = 'PENDING', "_localUpdatedAt" = ? WHERE id = ?${tenantScoped ? ' AND tenantId = ?' : ''}`
        const args: unknown[] = tenantScoped ? [now, id, currentTenantId] : [now, id]
        db.prepare(sql).run(...args)

        // GDPR Art. 30: log every deletion of personal data
        const PII_TABLES = new Set([
            'patients', 'visits', 'giudizi_idoneita', 'esami_strumentali', 'allegati',
            'documenti_compilati', 'questionari_risposte',
            'profili_salute', 'documenti_clinici', 'person_documents', 'referti',
            'firme_digitali', 'nomine_ruolo', 'allegati_3b'
        ])
        if (PII_TABLES.has(table)) {
            try {
                const gdprId = uuidv4()
                db.prepare(`
          INSERT INTO gdpr_audit_log (id, resourceType, resourceId, action, deletionReason, performedBy, performedAt, tenantId, dataAccessed, metadata, synced)
          VALUES (?, ?, ?, 'DELETE', ?, ?, ?, ?, '[]', '{}', 0)
        `).run(gdprId, table, id, reason || 'Eliminazione dati', currentTenantId || 'unknown', now, currentTenantId || '')
            } catch {
                // Non-critical — swallow schema errors (old DB without gdpr_audit_log)
            }
        }

        return { success: true }
    })

    // ========== OPERATIONS QUEUE ==========

    ipcMain.handle('sync:enqueue', async (_event, operation) => {
        const db = getDatabase()
        const id = uuidv4()
        const now = new Date().toISOString()

        db.prepare(`
      INSERT INTO operations_queue (id, type, entity, entityId, localId, payload, dependsOn, timestamp, status, retryCount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)
    `).run(
            id,
            operation.type,
            operation.entity,
            operation.entityId,
            operation.localId || null,
            JSON.stringify(operation.payload),
            JSON.stringify(operation.dependsOn || []),
            now
        )

        return { id }
    })

    ipcMain.handle('sync:getPendingOperations', async () => {
        const db = getDatabase()
        const rows = db.prepare(
            `SELECT * FROM operations_queue WHERE status = 'PENDING' ORDER BY timestamp ASC`
        ).all()

        return (rows as Record<string, unknown>[]).map((row) => ({
            ...row,
            payload: JSON.parse(row.payload as string),
            dependsOn: JSON.parse(row.dependsOn as string || '[]')
        }))
    })

    ipcMain.handle('sync:updateOperationStatus', async (_event, { id, status, conflictData }) => {
        const db = getDatabase()
        if (status === 'FAILED') {
            if (conflictData) {
                db.prepare(
                    `UPDATE operations_queue SET status = ?, conflictData = ?, retryCount = retryCount + 1 WHERE id = ?`
                ).run(status, JSON.stringify(conflictData), id)
            } else {
                db.prepare(
                    `UPDATE operations_queue SET status = ?, retryCount = retryCount + 1 WHERE id = ?`
                ).run(status, id)
            }
        } else if (conflictData) {
            db.prepare(
                `UPDATE operations_queue SET status = ?, conflictData = ? WHERE id = ?`
            ).run(status, JSON.stringify(conflictData), id)
        } else {
            db.prepare(
                `UPDATE operations_queue SET status = ? WHERE id = ?`
            ).run(status, id)
        }
        return { success: true }
    })

    // ========== SYNC: ID REMAPPING ==========

    ipcMain.handle('sync:remapId', async (_event, { table, localId, serverId }) => {
        const physicalTable = table === 'scadenzaPrestazioneProtocollo' ? 'scadenze' : table
        validateTableName(physicalTable)
        if (!localId || typeof localId !== 'string') throw new Error('localId invalido')
        if (!serverId || typeof serverId !== 'string') throw new Error('serverId invalido')

        const db = getDatabase()

        // Update the local record with the server-assigned ID
        db.prepare(
            `UPDATE "${physicalTable}" SET _serverId = ?, _syncStatus = 'SYNCED' WHERE id = ?`
        ).run(serverId, localId)

        // Update pending operations that reference this entity
        db.prepare(
            `UPDATE operations_queue SET entityId = ? WHERE entity = ? AND entityId = ? AND status = 'PENDING'`
        ).run(serverId, table, localId)

        return { success: true }
    })

    // ========== SYNC: CONFLICTS ==========

    ipcMain.handle('sync:getConflicts', async () => {
        const db = getDatabase()
        const rows = db.prepare(
            `SELECT * FROM operations_queue WHERE status = 'CONFLICT' ORDER BY timestamp DESC`
        ).all()

        return (rows as Record<string, unknown>[]).map(row => ({
            ...row,
            payload: JSON.parse(row.payload as string),
            dependsOn: JSON.parse(row.dependsOn as string || '[]'),
            conflictData: row.conflictData ? JSON.parse(row.conflictData as string) : null
        }))
    })

    ipcMain.handle('sync:resolveConflict', async (_event, { id, strategy }) => {
        if (!id || typeof id !== 'string') throw new Error('ID invalido')
        const db = getDatabase()

        if (strategy === 'CLIENT_WINS') {
            // Reset to PENDING so it gets re-uploaded with force
            db.prepare(
                `UPDATE operations_queue SET status = 'PENDING', retryCount = 0, conflictData = NULL WHERE id = ?`
            ).run(id)
        } else if (strategy === 'SERVER_WINS') {
            // Discard local change — remove from queue
            db.prepare(
                `DELETE FROM operations_queue WHERE id = ?`
            ).run(id)
        }
        return { success: true }
    })

    // ========== SYNC: RETRY & STATS ==========

    ipcMain.handle('sync:retryFailed', async () => {
        const db = getDatabase()
        const result = db.prepare(
            `UPDATE operations_queue SET status = 'PENDING', retryCount = 0 WHERE status = 'FAILED'`
        ).run()
        return result.changes
    })

    ipcMain.handle('sync:getQueueStats', async () => {
        const db = getDatabase()
        const rows = db.prepare(
            `SELECT status, COUNT(*) as count FROM operations_queue GROUP BY status`
        ).all() as { status: string; count: number }[]

        const stats: Record<string, number> = { PENDING: 0, SYNCED: 0, CONFLICT: 0, FAILED: 0 }
        for (const row of rows) {
            stats[row.status] = row.count
        }

        return {
            pending: stats.PENDING || 0,
            synced: stats.SYNCED || 0,
            conflict: stats.CONFLICT || 0,
            failed: stats.FAILED || 0,
            total: Object.values(stats).reduce((a, b) => a + b, 0)
        }
    })

    // ========== SYNC DATA ==========

    ipcMain.handle('sync:storeDayData', async (_event, { data }) => {
        const db = getDatabase()
        const now = new Date().toISOString()

        const syncMeta = {
            _syncStatus: 'SYNCED',
            _lastSyncAt: now,
            _localUpdatedAt: now,
            _isDeleted: 0,
            _version: 1
        }

        // ---- Helper: insert or replace rows in a table (runs inside outer transaction) ----
        const bulkUpsert = (table: string, records: Record<string, unknown>[]) => {
            if (!records || records.length === 0) return
            validateTableName(table)

            for (const item of records) {
                const record: Record<string, unknown> = encryptRecord(table, {
                    ...item,
                    _serverId: item.id as string,
                    _localId: item.id as string,
                    ...syncMeta
                })

                const columns = Object.keys(record).filter(isValidColumnName)
                const placeholders = columns.map(() => '?')
                const values = columns.map(col => {
                    const val = record[col]
                    if (val === undefined || val === null) return null
                    if (typeof val === 'object') return JSON.stringify(val)
                    return val
                })

                const sql = `INSERT OR REPLACE INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')})`
                db.prepare(sql).run(...values)
            }
        }

        const hasColumn = (table: string, column: string): boolean => {
            validateTableName(table)
            return (db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>)
                .some(info => info.name === column)
        }

        const applyTombstones = (records: Record<string, unknown>[]) => {
            if (!records || records.length === 0) return

            for (const tombstone of records) {
                const table = String(tombstone.table || '')
                const id = String(tombstone.id || '')
                if (!table || !id) continue
                validateTableName(table)

                const updates = [
                    '"_isDeleted" = 1',
                    '"_syncStatus" = \'SYNCED\'',
                    '"_lastSyncAt" = ?',
                    '"_localUpdatedAt" = ?'
                ]
                const values: unknown[] = [now, now]

                if (hasColumn(table, 'deletedAt')) {
                    updates.push('"deletedAt" = ?')
                    values.push(tombstone.deletedAt || now)
                }

                const whereClauses = hasColumn(table, '_serverId')
                    ? ['("id" = ? OR "_serverId" = ?)']
                    : ['"id" = ?']
                values.push(id)
                if (hasColumn(table, '_serverId')) values.push(id)

                if (hasColumn(table, 'tenantId') && tombstone.tenantId) {
                    whereClauses.push('"tenantId" = ?')
                    values.push(tombstone.tenantId)
                }

                db.prepare(`UPDATE "${table}" SET ${updates.join(', ')} WHERE ${whereClauses.join(' AND ')}`).run(...values)
            }
        }

        // Run all data insertions atomically in a single SQLite transaction
        const result = db.transaction((): Record<string, unknown> => {

            // ---- 1. Build company lookup map FIRST (needed by patients for companyName) ----
            const companyMap = new Map<string, Record<string, unknown>>()
            if (data.aziende && Array.isArray(data.aziende)) {
                const flatCompanies: Record<string, unknown>[] = []
                const flatSites: Record<string, unknown>[] = []
                const flatNomineRuolo: Record<string, unknown>[] = []
                const nominaProfessionals = new Map<string, Record<string, unknown>>()

                for (const ctp of data.aziende) {
                    const c = ctp.company || {}
                    const nomine = Array.isArray(ctp.nomine) ? ctp.nomine : []
                    const mcNomina = nomine.find((n: Record<string, unknown>) => n.tipoRuolo === 'MEDICO_COMPETENTE')
                    const rsppNomina = nomine.find((n: Record<string, unknown>) => n.tipoRuolo === 'RSPP')
                    const mainMc = mcNomina?.person || ctp.medicoCompetente
                    const rspp = rsppNomina?.person as Record<string, unknown> | undefined
                    const nomineFigure = nomine.map((n: Record<string, unknown>) => {
                        const person = n.person as Record<string, unknown> | undefined
                        if (n.personId && person) {
                            const profiles = Array.isArray(person.tenantProfiles) ? person.tenantProfiles as Record<string, unknown>[] : []
                            const profile = profiles[0] || {}
                            const roleType = n.tipoRuolo === 'RSPP'
                                ? 'RSPP'
                                : (n.tipoRuolo === 'MEDICO_COMPETENTE' || n.tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO') ? 'MEDICO_COMPETENTE' : String(n.tipoRuolo || '')
                            const existing = nominaProfessionals.get(String(n.personId))
                            const roleTypes = new Set<string>([
                                ...(Array.isArray(existing?.roleTypes) ? existing?.roleTypes as string[] : []),
                                roleType
                            ].filter(Boolean))
                            nominaProfessionals.set(String(n.personId), {
                                id: n.personId,
                                tenantId: ctp.tenantId || data.meta?.tenantId || '',
                                firstName: person.firstName,
                                lastName: person.lastName,
                                gender: person.gender,
                                taxCode: person.taxCode,
                                email: profile.email,
                                phone: profile.phone,
                                roleTypes: Array.from(roleTypes),
                                specialties: Array.isArray(profile.specialties) && profile.specialties.length > 0
                                    ? profile.specialties
                                    : roleType === 'MEDICO_COMPETENTE' ? ['Medicina del Lavoro'] : [],
                                status: profile.status || 'ACTIVE'
                            })
                        }
                        return {
                            id: n.id,
                            tenantId: n.tenantId || ctp.tenantId || data.meta?.tenantId || '',
                            companyTenantProfileId: n.companyTenantProfileId || ctp.id,
                            siteId: n.siteId || null,
                            personId: n.personId,
                            tipoRuolo: n.tipoRuolo,
                            stato: n.stato || 'ATTIVA',
                            dataInizio: n.dataInizio,
                            dataFine: n.dataFine,
                            dataScadenza: n.dataScadenza,
                            numeroProtocollo: n.numeroProtocollo,
                            documentoNominaId: n.documentoNominaId,
                            formazioneRichiesta: n.formazioneRichiesta,
                            dataUltimaFormazione: n.dataUltimaFormazione,
                            dataProssimaFormazione: n.dataProssimaFormazione,
                            note: n.note,
                            firstName: person?.firstName,
                            lastName: person?.lastName,
                            nome: [person?.firstName, person?.lastName].filter(Boolean).join(' '),
                            gender: person?.gender,
                            taxCode: person?.taxCode,
                            createdAt: n.createdAt,
                            updatedAt: n.updatedAt,
                            deletedAt: n.deletedAt
                        }
                    })
                    flatNomineRuolo.push(...nomineFigure.filter((n: Record<string, unknown>) => n.id && n.personId && n.tipoRuolo))
                    const flat: Record<string, unknown> = {
                        id: ctp.id,
                        tenantId: ctp.tenantId || data.meta?.tenantId || '',
                        ragioneSociale: c.ragioneSociale,
                        piva: c.piva,
                        codiceFiscale: c.codiceFiscale,
                        codiceAteco: c.codiceAteco,
                        settore: c.settore,
                        sedeLegaleIndirizzo: c.sedeLegaleIndirizzo,
                        sedeLegaleCitta: c.sedeLegaleCitta,
                        sedeLegaleCap: c.sedeLegaleCap,
                        sedeLegaleProvincia: c.sedeLegaleProvincia,
                        emailGenerale: ctp.emailGenerale,
                        telefonoGenerale: ctp.telefonoGenerale,
                        pec: ctp.pec,
                        sdi: c.sdi,
                        status: ctp.status || 'ACTIVE',
                        isActive: ctp.isActive ? 1 : 0,
                        referenteId: ctp.referenteId,
                        referenteRuolo: ctp.referenteRuolo,
                        medicoCompetenteId: ctp.medicoCompetenteId || c.medicoCompetenteId || mcNomina?.personId || ctp.medicoCompetente?.id || null,
                        medicoCompetenteNome: ctp.medicoCompetenteNome || c.medicoCompetenteNome || (
                            mainMc
                                ? [mainMc.firstName, mainMc.lastName].filter(Boolean).join(' ')
                                : null
                        ),
                        rsppId: rsppNomina?.personId || null,
                        rsppNome: rspp ? [rspp.firstName, rspp.lastName].filter(Boolean).join(' ') : null,
                        medicoSuccessoreId: ctp.medicoSuccessoreId || null,
                        medicoSuccessoreNome: ctp.medicoSuccessoreNome || null,
                        ultimoSopralluogo: ctp.ultimoSopralluogo || c.ultimoSopralluogo || null,
                        prossimoSopralluogo: ctp.prossimoSopralluogo || c.prossimoSopralluogo || null,
                        dvr: ctp.dvr || c.dvr || null,
                        noteCommerciali: ctp.noteCommerciali,
                        noteOperative: ctp.noteOperative,
                        noteInterne: ctp.noteInterne,
                        createdAt: ctp.createdAt,
                        updatedAt: ctp.updatedAt
                    }
                    flatCompanies.push(flat)
                    companyMap.set(ctp.id, flat)

                    // Store sites
                    if (ctp.sites && Array.isArray(ctp.sites)) {
                        for (const site of ctp.sites) {
                            flatSites.push({
                                id: site.id,
                                companyTenantProfileId: ctp.id,
                                siteName: site.siteName,
                                indirizzo: site.indirizzo,
                                citta: site.citta,
                                cap: site.cap,
                                provincia: site.provincia,
                                medicoCompetenteId: site.medicoCompetenteId || null,
                                rsppId: site.rsppId || null,
                                referenteId: site.referenteId || null,
                                dvr: site.dvr || null,
                                ultimoSopralluogo: site.ultimoSopralluogo || site.ultimoSopralluogoMedico || null,
                                prossimoSopralluogo: site.prossimoSopralluogo || site.prossimoSopralluogoMedico || null,
                                createdAt: site.createdAt,
                                updatedAt: site.updatedAt
                            })
                        }
                    }
                }
                bulkUpsert('companies', flatCompanies)
                if (flatNomineRuolo.length > 0) bulkUpsert('nomine_ruolo', flatNomineRuolo)
                if (flatSites.length > 0) bulkUpsert('company_sites', flatSites)
                if (nominaProfessionals.size > 0) {
                    const flatNominaProfessionals = Array.from(nominaProfessionals.values()).map(person => ({
                        ...person,
                        specialties: JSON.stringify(person.specialties || []),
                        roleTypes: JSON.stringify(person.roleTypes || []),
                        _localUpdatedAt: now,
                        _syncStatus: 'SYNCED',
                        _isDeleted: 0,
                        _version: 1
                    }))
                    bulkUpsert('medici', flatNominaProfessionals)
                }
            }

            // ---- 2. Build patient lookup map (Person + TenantProfile flattened, uses companyMap) ----
            const patientMap = new Map<string, Record<string, unknown>>()
            if (data.pazienti && Array.isArray(data.pazienti)) {
                const flatPatients: Record<string, unknown>[] = []
                for (const p of data.pazienti) {
                    const profile = p.tenantProfiles?.[0] || {}
                    const patientCompanyId = profile.companyTenantProfileId as string
                    const patientCompany = patientCompanyId ? companyMap.get(patientCompanyId) : null
                    const flat: Record<string, unknown> = {
                        id: p.id,
                        tenantId: profile.tenantId || data.meta?.tenantId || '',
                        firstName: p.firstName,
                        lastName: p.lastName,
                        taxCode: p.taxCode,
                        birthDate: p.birthDate,
                        birthPlace: p.birthPlace,
                        birthProvince: p.birthProvince,
                        gender: p.gender,
                        profileImage: p.profileImage,
                        email: profile.email,
                        phone: profile.phone,
                        status: profile.status || 'ACTIVE',
                        title: profile.title,
                        residenceAddress: profile.residenceAddress,
                        residenceCity: profile.residenceCity,
                        postalCode: profile.postalCode,
                        province: profile.province,
                        companyTenantProfileId: patientCompanyId,
                        siteId: profile.siteId,
                        repartoId: profile.repartoId,
                        protocolloSanitarioId: profile.protocolloSanitarioId || null,
                        companyName: patientCompany?.ragioneSociale as string || null,
                        gdprConsentDate: p.gdprConsentDate,
                        createdAt: p.createdAt,
                        updatedAt: p.updatedAt
                    }
                    flatPatients.push(flat)
                    patientMap.set(p.id, flat)
                }
                bulkUpsert('patients', flatPatients)
            }

            // ---- 3. Store appointments (denormalized with patient/company/prestazione names) ----
            if (data.appuntamenti && Array.isArray(data.appuntamenti)) {
                const flatApps: Record<string, unknown>[] = []
                for (const a of data.appuntamenti) {
                    const patient = patientMap.get(a.pazienteId)
                    const company = a.companyTenantProfile?.company
                    const firstPrestazione = a.prestazioni?.[0]?.prestazione

                    flatApps.push({
                        id: a.id,
                        tenantId: a.tenantId,
                        personId: a.pazienteId,
                        medicoId: a.medicoId,
                        ambulatorioId: a.ambulatorioId,
                        prestazioneId: a.prestazioneId || firstPrestazione?.id || null,
                        dataOra: a.dataOra,
                        durata: a.durataMinuti,
                        durataPrevista: a.durataMinuti,
                        tipo: a.tipoVisitaMDL,
                        stato: a.stato,
                        note: a.note,
                        companyTenantProfileId: a.companyTenantProfileId,
                        siteId: a.siteId,
                        // Denormalized display fields
                        personFirstName: patient?.firstName as string || null,
                        personLastName: patient?.lastName as string || null,
                        personTaxCode: patient?.taxCode as string || null,
                        medicoFirstName: null, // Will be set if medico data available
                        medicoLastName: null,
                        companyName: company?.ragioneSociale || companyMap.get(a.companyTenantProfileId)?.ragioneSociale as string || null,
                        prestazioneNome: firstPrestazione?.nome || null,
                        prestazioneCodice: firstPrestazione?.codice || null,
                        ambulatorioNome: a.ambulatorio?.nome || null,
                        createdAt: a.createdAt,
                        updatedAt: a.updatedAt
                    })

                    // Store appointment_prestazioni
                    if (a.prestazioni && Array.isArray(a.prestazioni)) {
                        const flatAP: Record<string, unknown>[] = []
                        for (const ap of a.prestazioni) {
                            flatAP.push({
                                id: ap.id,
                                appuntamentoId: a.id,
                                prestazioneId: ap.prestazioneId,
                                prezzo: ap.prezzo,
                                quantita: ap.quantita || 1,
                                note: ap.note
                            })
                        }
                        if (flatAP.length > 0) bulkUpsert('appointment_prestazioni', flatAP)
                    }
                }
                bulkUpsert('appointments', flatApps)
            }

            // ---- 4. Store visite (denormalized) ----
            // Support both `visiteEsistenti` (from download-day) and `visite` (from download-full-db)
            const visiteSource = Array.isArray(data.visiteEsistenti) ? data.visiteEsistenti
                : Array.isArray(data.visite) ? data.visite
                    : null
            if (visiteSource) {
                const flatVisite: Record<string, unknown>[] = []
                for (const v of visiteSource) {
                    const patientId = v.pazienteId || v.personId
                    const patient = patientMap.get(patientId)
                    const patientCompanyId = (patient?.companyTenantProfileId as string) || null
                    const company = patientCompanyId ? companyMap.get(patientCompanyId) : null

                    flatVisite.push({
                        id: v.id,
                        tenantId: v.tenantId,
                        personId: patientId,
                        appuntamentoId: v.appuntamentoId,
                        medicoId: v.medicoId,
                        medicoRefertanteId: v.medicoRefertanteId || null,
                        ambulatorioId: v.ambulatorioId,
                        prestazioneId: v.prestazioneId || v.prestazione?.id || null,
                        stato: v.stato,
                        tipo: v.tipoVisitaMDL,
                        tipoVisitaMDL: v.tipoVisitaMDL,
                        dataOra: v.dataOra,
                        dataInizio: v.dataOra,
                        dataFine: null,
                        durataMinuti: v.durataEffettiva,
                        motivoVisita: null,
                        anamnesi: v.anamnesi,
                        esameObiettivo: v.esamiObiettivo,
                        diagnosi: v.diagnosiPrincipale,
                        terapia: v.terapia,
                        noteInterne: v.noteClinico,
                        notePazienti: null,
                        datiStrutturati: v.datiStrutturati ? JSON.stringify(v.datiStrutturati) : '{}',
                        templateId: v.visitTemplateId,
                        totaleCosto: 0,
                        spiReadings: '[]',
                        // Denormalized
                        personFirstName: patient?.firstName as string || null,
                        personLastName: patient?.lastName as string || null,
                        personTaxCode: patient?.taxCode as string || null,
                        medicoFirstName: null,
                        medicoLastName: null,
                        medicoRefertanteFirstName: v.medicoRefertante?.firstName || null,
                        medicoRefertanteLastName: v.medicoRefertante?.lastName || null,
                        companyName: company?.ragioneSociale as string || null,
                        prestazioneNome: null,
                        prestazioneCodice: null,
                        isMDL: v.tipoVisitaMDL ? 1 : 0,
                        createdAt: v.createdAt,
                        updatedAt: v.updatedAt
                    })
                }
                bulkUpsert('visits', flatVisite)

                // ---- 4b. Extract giudizi_idoneita embedded in visiteEsistenti ----
                const flatGiudizi: Record<string, unknown>[] = []
                for (const v of visiteSource) {
                    const g = (v as Record<string, unknown>).giudizioIdoneita as Record<string, unknown> | null | undefined
                    if (g && g.id) {
                        flatGiudizi.push({
                            id: g.id,
                            tenantId: g.tenantId || data.meta?.tenantId || '',
                            personId: g.personId,
                            visitaId: g.visitaId || v.id,
                            medicoId: g.medicoCompetenteId,
                            tipo: null,
                            esito: g.tipoGiudizio,
                            limitazioni: g.limitazioni,
                            prescrizioni: g.prescrizioniIdoneita,
                            dataEmissione: g.dataEmissione,
                            dataScadenza: g.dataScadenza,
                            note: null,
                            firmaMedico: null,
                            protocolloNumero: null,
                            createdAt: g.createdAt,
                            updatedAt: g.updatedAt
                        })
                    }
                }
                if (flatGiudizi.length > 0) bulkUpsert('giudizi_idoneita', flatGiudizi)
            }

            // ---- 5. Store prestazioni (flat — direct from backend) ----
            if (data.prestazioni && Array.isArray(data.prestazioni)) {
                const flat = data.prestazioni.map((p: Record<string, unknown>) => ({
                    id: p.id,
                    tenantId: data.meta?.tenantId || '',
                    nome: p.nome,
                    codice: p.codice,
                    tipo: p.tipo,
                    categoria: p.tipo,
                    prezzoBase: p.prezzoBase,
                    durataPrevista: p.durataPrevista,
                    ivaAliquota: p.ivaAliquota,
                    scadenzaDefaultMesi: p.scadenzaDefaultMesi,
                    branchType: p.branchType,
                    attivo: 1,
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt
                }))
                bulkUpsert('prestazioni', flat)
            }

            // ---- 5b. Store medici tenant (for refertante picker and visit permissions parity) ----
            if (data.medici && Array.isArray(data.medici)) {
                const flat = data.medici.map((m: Record<string, unknown>) => {
                    const profiles = Array.isArray(m.tenantProfiles) ? m.tenantProfiles as Record<string, unknown>[] : []
                    const profile = profiles[0] || {}
                    const personRoleTypes = Array.isArray(m.personRoles)
                        ? (m.personRoles as Record<string, unknown>[]).map(r => String(r.roleType || '')).filter(Boolean)
                        : []
                    const nominaRoleTypes = Array.isArray(m.nomine)
                        ? (m.nomine as Record<string, unknown>[]).map(n => {
                            if (n.tipoRuolo === 'RSPP') return 'RSPP'
                            if (n.tipoRuolo === 'MEDICO_COMPETENTE' || n.tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO') return 'MEDICO_COMPETENTE'
                            return String(n.tipoRuolo || '')
                        }).filter(Boolean)
                        : []
                    const roleTypes = Array.from(new Set([...personRoleTypes, ...nominaRoleTypes]))
                    const directSpecialties = Array.isArray(m.specialties) ? m.specialties : []
                    return {
                        id: m.id,
                        tenantId: data.meta?.tenantId || '',
                        firstName: m.firstName,
                        lastName: m.lastName,
                        gender: m.gender,
                        taxCode: m.taxCode,
                        email: profile.email || m.email || null,
                        phone: profile.phone || m.phone || null,
                        status: profile.status || m.status || 'ACTIVE',
                        specialties: JSON.stringify(profile.specialties || directSpecialties),
                        roleTypes: JSON.stringify(roleTypes),
                        createdAt: m.createdAt,
                        updatedAt: m.updatedAt
                    }
                })
                bulkUpsert('medici', flat)
            }

            // ---- 6. Store ambulatori (flat — direct from backend) ----
            if (data.ambulatori && Array.isArray(data.ambulatori)) {
                const flat = data.ambulatori.map((a: Record<string, unknown>) => ({
                    id: a.id,
                    tenantId: data.meta?.tenantId || '',
                    codice: a.codice,
                    nome: a.nome,
                    specializzazione: a.specializzazione,
                    colore: a.colore,
                    isEsterno: a.isEsterno ? 1 : 0,
                    stato: 'ATTIVO'
                }))
                bulkUpsert('ambulatori', flat)
            }

            if (data.slotDisponibilita && Array.isArray(data.slotDisponibilita)) {
                bulkUpsert('slot_disponibilita', data.slotDisponibilita.map((s: Record<string, unknown>) => ({
                    id: s.id,
                    tenantId: s.tenantId || data.meta?.tenantId || '',
                    ambulatorioId: s.ambulatorioId,
                    medicoId: s.medicoId,
                    prestazioneId: s.prestazioneId,
                    appuntamentoId: s.appuntamentoId,
                    disponibilitaMedicoId: s.disponibilitaMedicoId,
                    data: typeof s.data === 'string' ? String(s.data).slice(0, 10) : s.data,
                    oraInizio: s.oraInizio,
                    oraFine: s.oraFine,
                    stato: s.stato || 'LIBERO',
                    disponibile: s.disponibile === false ? 0 : 1,
                    motivoBlocco: s.motivoBlocco,
                    note: s.note,
                    visibilePubblico: s.visibilePubblico ? 1 : 0,
                    prenotabileOnline: s.prenotabileOnline ? 1 : 0,
                    maxPrenotazioni: s.maxPrenotazioni ?? 1,
                    anticipoMinimoOre: s.anticipoMinimoOre ?? 0,
                    anticipoMassimoGiorni: s.anticipoMassimoGiorni ?? 90,
                    durataSlotMinuti: s.durataSlotMinuti,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                    deletedAt: s.deletedAt
                })))
            }

            // ---- 7. Store mansioni + dedicated rischi ----
            if (data.mansioni && Array.isArray(data.mansioni)) {
                const flat = data.mansioni.map((m: Record<string, unknown>) => {
                    const companyId = m.companyTenantProfileId as string
                    const company = companyId ? companyMap.get(companyId) : null
                    return {
                        id: m.id,
                        tenantId: m.tenantId || data.meta?.tenantId || '',
                        // Backend Prisma model uses `denominazione`; local SQLite uses `nome`
                        nome: (m.denominazione || m.nome) as string,
                        descrizione: m.descrizione,
                        codice: m.codice,
                        companyTenantProfileId: m.companyTenantProfileId,
                        siteId: m.siteId,
                        companyName: company?.ragioneSociale as string || null,
                        isActive: m.isActive !== undefined ? (m.isActive ? 1 : 0) : 1,
                        createdAt: m.createdAt,
                        updatedAt: m.updatedAt
                    }
                })
                bulkUpsert('mansioni', flat)
            }
            if (data.mansioneRischi && Array.isArray(data.mansioneRischi)) {
                const flatRischi = data.mansioneRischi.map((rischio: Record<string, unknown>) => ({
                    id: rischio.id || `${rischio.mansioneId}-${rischio.codiceRischio}`,
                    tenantId: rischio.tenantId || data.meta?.tenantId || '',
                    mansioneId: rischio.mansioneId,
                    codiceRischio: rischio.codiceRischio,
                    livello: rischio.livello,
                    categoria: rischio.categoria,
                    descrizioneEsposizione: rischio.descrizioneEsposizione,
                    misurePrevenzioneDPI: rischio.misurePrevenzioneDPI,
                    fonteRischio: rischio.fonteRischio,
                    periodicitaMesi: rischio.periodicitaMesi,
                    createdAt: rischio.createdAt,
                    updatedAt: rischio.updatedAt,
                    deletedAt: rischio.deletedAt
                }))
                bulkUpsert('mansione_rischi', flatRischi.filter((r: Record<string, unknown>) => r.id && r.mansioneId && r.codiceRischio))
            }

            // ---- 8. Store scadenze (denormalized with patient/prestazione/mansione/company names) ----
            // Build lookup maps for denormalization
            const prestazioneMap = new Map<string, Record<string, unknown>>()
            if (data.prestazioni && Array.isArray(data.prestazioni)) {
                for (const p of data.prestazioni) {
                    prestazioneMap.set(p.id, p)
                }
            }
            const mansioneMap = new Map<string, Record<string, unknown>>()
            if (data.mansioni && Array.isArray(data.mansioni)) {
                for (const m of data.mansioni) {
                    mansioneMap.set(m.id, m)
                }
            }

            if (data.scadenze && Array.isArray(data.scadenze)) {
                const flat = data.scadenze.map((s: Record<string, unknown>) => {
                    const patient = patientMap.get(s.personId as string)
                    const prestazione = prestazioneMap.get(s.prestazioneId as string)
                    const mansione = s.mansioneId ? mansioneMap.get(s.mansioneId as string) : null
                    // Try to find company from patient's companyTenantProfileId
                    const patientCompanyId = patient?.companyTenantProfileId as string
                    const company = patientCompanyId ? companyMap.get(patientCompanyId) : null

                    return {
                        id: s.id,
                        tenantId: s.tenantId || data.meta?.tenantId || '',
                        personId: s.personId,
                        prestazioneId: s.prestazioneId || '',
                        mansioneId: s.mansioneId,
                        protocolloId: s.protocolloId,
                        dataScadenza: s.dataScadenza,
                        periodicitaMesi: s.periodicitaMesi,
                        eseguita: s.eseguita ? 1 : 0,
                        dataEsecuzione: s.dataEsecuzione,
                        visitaId: s.visitaId,
                        isPrimaVisita: s.isPrimaVisita ? 1 : 0,
                        // Denormalized
                        personFirstName: patient?.firstName as string || null,
                        personLastName: patient?.lastName as string || null,
                        prestazioneNome: prestazione?.nome as string || null,
                        // Backend uses `denominazione`; local SQLite uses `nome`
                        mansione: ((mansione?.denominazione || mansione?.nome) as string) || null,
                        companyName: company?.ragioneSociale as string || null,
                        stato: s.status || s.stato || null,
                        createdAt: s.createdAt,
                        updatedAt: s.updatedAt
                    }
                })
                bulkUpsert('scadenze', flat)
            }

            // ---- 9. Store lavoratoriMansioni ----
            if (data.lavoratoriMansioni && Array.isArray(data.lavoratoriMansioni)) {
                const flat = data.lavoratoriMansioni.map((lm: Record<string, unknown>) => ({
                    id: lm.id,
                    tenantId: lm.tenantId || data.meta?.tenantId || '',
                    personId: lm.personId,
                    mansioneId: lm.mansioneId,
                    dataInizio: lm.dataInizio,
                    dataFine: lm.dataFine,
                    isPrimary: (lm.isPrimaria || lm.isPrimary) ? 1 : 0,
                    createdAt: lm.createdAt,
                    updatedAt: lm.updatedAt
                }))
                bulkUpsert('lavoratore_mansioni', flat)
            }

            // ---- 10. Store giudiziPrecedenti ----
            if (data.giudiziPrecedenti && Array.isArray(data.giudiziPrecedenti)) {
                const flat = data.giudiziPrecedenti.map((g: Record<string, unknown>) => ({
                    id: g.id,
                    tenantId: g.tenantId || data.meta?.tenantId || '',
                    // Support both day-download (personId) and full-db (pazienteId) field names
                    personId: g.personId || g.pazienteId,
                    visitaId: g.visitaId,
                    // Prisma returns medicoCompetenteId; local table uses medicoId
                    medicoId: g.medicoCompetenteId || g.medicoId,
                    // No tipoVisita in Prisma GiudizioIdoneita; tipo is a local-only field
                    tipo: null,
                    // Prisma tipoGiudizio (IDONEO/NON_IDONEO_*) maps to local esito
                    esito: g.tipoGiudizio || g.esito,
                    limitazioni: g.limitazioni || g.limitazioniIdoneita,
                    // Prisma prescrizioniIdoneita maps to local prescrizioni
                    prescrizioni: g.prescrizioni || g.prescrizioniIdoneita,
                    dataEmissione: g.dataEmissione,
                    dataScadenza: g.dataScadenza,
                    // note and firmaMedico/protocolloNumero are local-only fields not in Prisma
                    note: g.motivazioni || g.noteGiudizio || null,
                    firmaMedico: null,
                    protocolloNumero: null,
                    createdAt: g.createdAt,
                    updatedAt: g.updatedAt
                }))
                bulkUpsert('giudizi_idoneita', flat)
            }

            // ---- 11. Store movimentiContabili ----
            if (data.movimentiContabili && Array.isArray(data.movimentiContabili)) {
                const flat = data.movimentiContabili.map((mc: Record<string, unknown>) => ({
                    id: mc.id,
                    tenantId: mc.tenantId || data.meta?.tenantId || '',
                    visitaId: mc.visitaId,
                    appuntamentoId: mc.appuntamentoId,
                    personId: mc.personId || mc.pazienteId,
                    companyTenantProfileId: mc.companyTenantProfileId,
                    // Support both day-download field names and full-db (Prisma) field names
                    tipo: mc.tipo || mc.tipoMovimento,
                    descrizione: mc.descrizione,
                    importo: mc.importo ?? mc.importoLordo,
                    iva: mc.iva ?? mc.aliquotaIva,
                    importoNetto: mc.importoNetto,
                    stato: mc.stato,
                    dataMovimento: mc.dataMovimento || mc.dataEsecuzione,
                    dataScadenza: mc.dataScadenza,
                    dataPagamento: mc.dataPagamento,
                    metodoPagamento: mc.metodoPagamento,
                    riferimentoFattura: mc.riferimentoFattura || mc.riferimentoPagamento,
                    note: mc.note,
                    createdAt: mc.createdAt,
                    updatedAt: mc.updatedAt
                }))
                bulkUpsert('movimenti_contabili', flat)
            }

            // ---- 12. Store rischi aggiuntivi per lavoratore (personalizzazioni individuali) ----
            if (data.rischiAggiuntivi && Array.isArray(data.rischiAggiuntivi)) {
                const flat = data.rischiAggiuntivi.map((r: Record<string, unknown>) => ({
                    id: r.id,
                    personId: r.personId,
                    tenantId: r.tenantId || data.meta?.tenantId || '',
                    // rischioId: provide empty string fallback to satisfy NOT NULL constraint
                    // on databases created from old schema versions that had rischioId NOT NULL
                    rischioId: (r.rischioId as string) || '',
                    codiceRischio: r.codiceRischio,
                    livello: r.livello || 'MEDIO',
                    categoria: r.categoria,
                    descrizioneEsposizione: r.descrizioneEsposizione,
                    fonteRischio: r.fonteRischio,
                    periodicitaMesi: r.periodicitaMesi,
                    note: r.note,
                    sourceMansioneId: r.sourceMansioneId,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt
                }))
                bulkUpsert('lavoratore_rischi_aggiuntivi', flat)
            }

            // ---- 13. Store protocolli sanitari ----
            if (data.protocolli && Array.isArray(data.protocolli)) {
                const flat = data.protocolli.map((p: Record<string, unknown>) => ({
                    id: p.id,
                    tenantId: p.tenantId || data.meta?.tenantId || '',
                    // Backend Prisma model uses `denominazione`; local SQLite uses `nome`
                    nome: (p.denominazione || p.nome) as string,
                    descrizione: p.descrizione,
                    mansioneId: p.mansioneId,
                    companyTenantProfileId: p.companyTenantProfileId,
                    mansioneNome: p.mansioneNome,
                    // Backend uses `isAttivo`; local SQLite uses `isActive`
                    isActive: p.isAttivo != null ? (p.isAttivo ? 1 : 0) : (p.isActive != null ? (p.isActive ? 1 : 0) : 1),
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt
                }))
                bulkUpsert('protocolli', flat)
            }
            if (data.protocolloPrestazioni && Array.isArray(data.protocolloPrestazioni)) {
                const flatPrestazioni = data.protocolloPrestazioni.map((item: Record<string, unknown>) => ({
                    id: item.id || `${item.protocolloId}-${item.prestazioneId}`,
                    tenantId: item.tenantId || data.meta?.tenantId || '',
                    protocolloId: item.protocolloId,
                    prestazioneId: item.prestazioneId,
                    prestazioneNome: item.prestazioneNome || item.nomePrestazione,
                    prestazioneCodice: item.prestazioneCodice,
                    isObbligatoria: item.isObbligatoria != null ? (item.isObbligatoria ? 1 : 0) : (item.obbligatoria != null ? (item.obbligatoria ? 1 : 0) : 1),
                    periodicita: item.periodicita,
                    periodicitaCustomMesi: item.periodicitaCustomMesi,
                    scadenzaDefaultMesi: item.scadenzaDefaultMesi,
                    condizioniApplicazione: item.condizioniApplicazione,
                    note: item.note,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    deletedAt: item.deletedAt
                }))
                bulkUpsert('protocollo_prestazioni', flatPrestazioni.filter((p: Record<string, unknown>) => p.id && p.protocolloId && p.prestazioneId))
            }

            // ---- 14. Store visit templates ----
            if (data.visitTemplates && Array.isArray(data.visitTemplates)) {
                const flat = data.visitTemplates.map((t: Record<string, unknown>) => ({
                    id: t.id,
                    tenantId: t.tenantId || data.meta?.tenantId || '',
                    nome: (t.nome || t.name) as string || 'Template',  // backend sends `name`, local uses `nome`
                    tipo: (t.tipo || t.scope) as string || null,
                    fields: typeof t.fields === 'string' ? t.fields : JSON.stringify(t.fields || []),
                    sidebarConfig: typeof t.sidebarConfig === 'string' ? t.sidebarConfig : JSON.stringify(t.sidebarConfig || {}),
                    isDefault: t.isDefault != null ? (t.isDefault ? 1 : 0) : 0,
                    medicoId: (t.medicoId as string) || null,
                    prestazioneId: (t.prestazioneId as string) || null,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                }))
                bulkUpsert('visit_templates', flat)
            }

            // ---- 15. Store document templates (modulistica + questionari webapp) ----
            if (data.documentTemplates && Array.isArray(data.documentTemplates)) {
                const flat = data.documentTemplates.map((t: Record<string, unknown>) => ({
                    id: t.id,
                    tenantId: t.tenantId || data.meta?.tenantId || '',
                    nome: (t.nome || t.name) as string || 'Documento',
                    descrizione: t.descrizione,
                    codice: t.codice,
                    tipo: t.tipo,
                    fase: t.fase,
                    versione: t.versione || 1,
                    campi: typeof t.campi === 'string' ? t.campi : JSON.stringify(t.campi || []),
                    contenutoHtml: t.contenutoHtml,
                    contenutoPdf: t.contenutoPdf,
                    branchTypes: typeof t.branchTypes === 'string' ? t.branchTypes : JSON.stringify(t.branchTypes || []),
                    richiedeFirma: t.richiedeFirma ? 1 : 0,
                    richiedeFirmaMedico: t.richiedeFirmaMedico ? 1 : 0,
                    richiedeFirmaDipendente: t.richiedeFirmaDipendente ? 1 : 0,
                    richiedeFirmaFormatore: t.richiedeFirmaFormatore ? 1 : 0,
                    richiedeFirmaDatore: t.richiedeFirmaDatore ? 1 : 0,
                    validitaGiorni: t.validitaGiorni,
                    isActive: t.isActive !== undefined ? (t.isActive ? 1 : 0) : 1,
                    ordine: t.ordine || 0,
                    obbligatorio: t.obbligatorio ? 1 : 0,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                }))
                bulkUpsert('document_templates', flat)
            }
            if (data.questionariMediciConfig && Array.isArray(data.questionariMediciConfig)) {
                bulkUpsert('questionari_medici_config', data.questionariMediciConfig.map((q: Record<string, unknown>) => ({
                    id: q.id,
                    documentoTemplateId: q.documentoTemplateId,
                    tenantId: q.tenantId || data.meta?.tenantId || '',
                    codiciRischio: typeof q.codiciRischio === 'string' ? q.codiciRischio : JSON.stringify(q.codiciRischio || []),
                    tipiVisitaMDL: typeof q.tipiVisitaMDL === 'string' ? q.tipiVisitaMDL : JSON.stringify(q.tipiVisitaMDL || []),
                    specializzazione: q.specializzazione,
                    haScoring: q.haScoring ? 1 : 0,
                    scoringConfig: typeof q.scoringConfig === 'string' ? q.scoringConfig : JSON.stringify(q.scoringConfig || {}),
                    sogliaCritica: q.sogliaCritica,
                    compilabileDa: q.compilabileDa,
                    tempoStimato: q.tempoStimato,
                    istruzioniPaziente: q.istruzioniPaziente,
                    istruzioniMedico: q.istruzioniMedico,
                    richiedeRevisione: q.richiedeRevisione !== false ? 1 : 0,
                    validazioniCustom: typeof q.validazioniCustom === 'string' ? q.validazioniCustom : JSON.stringify(q.validazioniCustom || {}),
                    periodicitaMesi: q.periodicitaMesi,
                    protocolloSanitarioId: q.protocolloSanitarioId,
                    voceTariffarioId: q.voceTariffarioId,
                    isPagamento: q.isPagamento ? 1 : 0,
                    prezzoDefault: q.prezzoDefault,
                    fatturabile: q.fatturabile !== false ? 1 : 0,
                    createdAt: q.createdAt,
                    updatedAt: q.updatedAt,
                    deletedAt: q.deletedAt
                })))
            }

            // ---- 15b. Store compiled documents/questionnaires and related visit data ----
            if (data.documentiCompilati && Array.isArray(data.documentiCompilati)) {
                const docs = data.documentiCompilati.map((d: Record<string, unknown>) => ({
                    id: d.id,
                    tenantId: d.tenantId || data.meta?.tenantId || '',
                    documentoTemplateId: d.documentoTemplateId,
                    personId: d.pazienteId || d.personId,
                    visitaId: d.visitaId,
                    appuntamentoId: d.appuntamentoId,
                    datiCompilati: typeof d.datiCompilati === 'string' ? d.datiCompilati : JSON.stringify(d.datiCompilati || {}),
                    stato: d.stato || 'BOZZA',
                    pdfUrl: d.pdfUrl,
                    pdfGeneratoAt: d.pdfGeneratoAt,
                    firmaPaziente: d.firmaPaziente,
                    firmaPazienteAt: d.firmaPazienteAt,
                    firmaMedico: d.firmaMedico,
                    firmaMedicoAt: d.firmaMedicoAt,
                    firmaMedicoId: d.firmaMedicoId,
                    firmaDipendente: d.firmaDipendente,
                    firmaDipendenteAt: d.firmaDipendenteAt,
                    firmaDipendenteId: d.firmaDipendenteId,
                    firmaFormatore: d.firmaFormatore,
                    firmaFormatoreAt: d.firmaFormatoreAt,
                    firmaFormatoreId: d.firmaFormatoreId,
                    firmaDatore: d.firmaDatore,
                    firmaDatoreAt: d.firmaDatoreAt,
                    firmaDatoreId: d.firmaDatoreId,
                    dataScadenza: d.dataScadenza,
                    note: d.note,
                    motivoAnnullamento: d.motivoAnnullamento,
                    punteggioTotale: d.punteggioTotale,
                    punteggioPercentuale: d.punteggioPercentuale,
                    esitoCritico: d.esitoCritico ? 1 : 0,
                    noteAlgoritmo: d.noteAlgoritmo,
                    compilatoDa: d.compilatoDa,
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                    deletedAt: d.deletedAt
                }))
                bulkUpsert('documenti_compilati', docs)
            }

            if (data.questionariRisposte && Array.isArray(data.questionariRisposte)) {
                bulkUpsert('questionari_risposte', data.questionariRisposte.map((r: Record<string, unknown>) => ({
                    id: r.id,
                    documentoCompilatoId: r.documentoCompilatoId,
                    tenantId: r.tenantId || data.meta?.tenantId || '',
                    campoId: r.campoId,
                    campoLabel: r.campoLabel,
                    valoreTesto: r.valoreTesto,
                    valoreNumerico: r.valoreNumerico,
                    valoreBoolean: r.valoreBoolean ? 1 : 0,
                    valoreData: r.valoreData,
                    valoreJson: typeof r.valoreJson === 'string' ? r.valoreJson : JSON.stringify(r.valoreJson || null),
                    punteggio: r.punteggio,
                    pesoCalcolato: r.pesoCalcolato,
                    flagCritico: r.flagCritico ? 1 : 0,
                    validato: r.validato ? 1 : 0,
                    validatoDa: r.validatoDa,
                    validatoAt: r.validatoAt,
                    noteValidazione: r.noteValidazione,
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt
                })))
            }

            if (data.profiliSalute && Array.isArray(data.profiliSalute)) {
                const jsonField = (value: unknown, fallback: unknown) => (
                    typeof value === 'string' ? value : JSON.stringify(value ?? fallback)
                )
                const boolField = (value: unknown) => (value === true || value === 1 ? 1 : 0)
                bulkUpsert('profili_salute', data.profiliSalute.map((p: Record<string, unknown>) => ({
                    id: p.id,
                    personId: p.personId,
                    tenantId: p.tenantId || data.meta?.tenantId || '',
                    peso: p.peso,
                    altezza: p.altezza,
                    fumatore: p.fumatore,
                    sigaretteGiorno: p.sigaretteGiorno,
                    anniFumo: p.anniFumo,
                    alcol: p.alcol,
                    unitaAlcolSettimana: p.unitaAlcolSettimana,
                    attivitaFisica: p.attivitaFisica,
                    oreAttivitaSettimana: p.oreAttivitaSettimana,
                    allergieFarmaci: p.allergieFarmaci,
                    farmaci: p.farmaci,
                    altrePatologie: p.altrePatologie,
                    noteSalute: p.noteSalute,
                    usaDpiPersonali: boolField(p.usaDpiPersonali),
                    dpiPersonali: jsonField(p.dpiPersonali, []),
                    dpiAzienda: jsonField(p.dpiAzienda, []),
                    usaMezziAziendali: boolField(p.usaMezziAziendali),
                    mezziAziendali: jsonField(p.mezziAziendali, []),
                    patenteCategorie: jsonField(p.patenteCategorie, []),
                    patenteScadenza: p.patenteScadenza,
                    cqc: boolField(p.cqc),
                    cqcScadenza: p.cqcScadenza,
                    hasInvalidita: boolField(p.hasInvalidita),
                    tipoInvalidita: p.tipoInvalidita,
                    gradoInvaliditaCivile: p.gradoInvaliditaCivile,
                    legge104: boolField(p.legge104),
                    hasDiabete: boolField(p.hasDiabete),
                    hasIpertensione: boolField(p.hasIpertensione),
                    hasCardiopatie: boolField(p.hasCardiopatie),
                    hasAsma: boolField(p.hasAsma),
                    hasEpilessia: boolField(p.hasEpilessia),
                    alimentazione: p.alimentazione,
                    statoCivile: p.statoCivile,
                    numeroFigli: p.numeroFigli,
                    professione: p.professione,
                    qualitaSonno: p.qualitaSonno,
                    oreSonnoNotte: p.oreSonnoNotte,
                    sonnolenzaDiurna: boolField(p.sonnolenzaDiurna),
                    apneaNotturna: boolField(p.apneaNotturna),
                    formazioneGenerale: boolField(p.formazioneGenerale),
                    formazioneSpecifica: boolField(p.formazioneSpecifica),
                    addestramentoCompletato: boolField(p.addestramentoCompletato),
                    tipoDiabete: p.tipoDiabete,
                    terapiaInsulina: boolField(p.terapiaInsulina),
                    sorveglianzaSanitaria: jsonField(p.sorveglianzaSanitaria, {}),
                    storicoOccupazionale: jsonField(p.storicoOccupazionale, {}),
                    corsiFormazioneDpi: jsonField(p.corsiFormazioneDpi, {}),
                    esposizioniLavorative: jsonField(p.esposizioniLavorative, {}),
                    vaccinazioni: jsonField(p.vaccinazioni, {}),
                    abilitazioniMezzi: jsonField(p.abilitazioniMezzi, {}),
                    dpiConsegne: jsonField(p.dpiConsegne, {}),
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt,
                    deletedAt: p.deletedAt
                })))
            }

            if (data.documentiClinici && Array.isArray(data.documentiClinici)) {
                bulkUpsert('documenti_clinici', data.documentiClinici.map((d: Record<string, unknown>) => ({
                    id: d.id,
                    visitaId: d.visitaId,
                    personId: d.pazienteId || d.personId,
                    tipo: d.tipo,
                    titolo: d.titolo,
                    descrizione: d.descrizione,
                    fileName: d.fileName,
                    fileUrl: d.fileUrl,
                    fileSize: d.fileSize,
                    mimeType: d.mimeType,
                    dataDocumento: d.dataDocumento,
                    valido: d.valido !== false ? 1 : 0,
                    tenantId: d.tenantId || data.meta?.tenantId || '',
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                    deletedAt: d.deletedAt
                })))
            }

            if (data.personDocuments && Array.isArray(data.personDocuments)) {
                bulkUpsert('person_documents', data.personDocuments.map((d: Record<string, unknown>) => ({
                    id: d.id,
                    personId: d.personId || d.pazienteId,
                    tipo: d.tipo,
                    titolo: d.titolo,
                    descrizione: d.descrizione,
                    fileName: d.fileName,
                    fileUrl: d.fileUrl,
                    fileSize: d.fileSize,
                    mimeType: d.mimeType,
                    hashFile: d.hashFile,
                    visitaId: d.visitaId,
                    dataDocumento: d.dataDocumento,
                    dataScadenza: d.dataScadenza,
                    valido: d.valido !== false ? 1 : 0,
                    tenantId: d.tenantId || data.meta?.tenantId || '',
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                    deletedAt: d.deletedAt
                })))
            }

            if (data.referti && Array.isArray(data.referti)) {
                bulkUpsert('referti', data.referti.map((r: Record<string, unknown>) => ({
                    id: r.id,
                    visitaId: r.visitaId,
                    numeroReferto: r.numeroReferto,
                    titolo: r.titolo,
                    contenuto: r.contenuto,
                    conclusioni: r.conclusioni,
                    allegati: typeof r.allegati === 'string' ? r.allegati : JSON.stringify(r.allegati || []),
                    stato: r.stato,
                    dataFirma: r.dataFirma,
                    firmatoBy: r.firmatoBy,
                    hashFirma: r.hashFirma,
                    dataConsegna: r.dataConsegna,
                    modalitaConsegna: r.modalitaConsegna,
                    tenantId: r.tenantId || data.meta?.tenantId || '',
                    createdAt: r.createdAt,
                    updatedAt: r.updatedAt,
                    deletedAt: r.deletedAt
                })))
            }

            if (data.visitRevisions && Array.isArray(data.visitRevisions)) {
                bulkUpsert('visit_revisions', data.visitRevisions.map((r: Record<string, unknown>) => ({
                    id: r.id,
                    visitaId: r.visitaId,
                    revisionNumber: r.revisionNumber,
                    previousData: typeof r.previousData === 'string' ? r.previousData : JSON.stringify(r.previousData || {}),
                    newData: typeof r.newData === 'string' ? r.newData : JSON.stringify(r.newData || {}),
                    changedFields: typeof r.changedFields === 'string' ? r.changedFields : JSON.stringify(r.changedFields || []),
                    changeType: r.changeType,
                    changeReason: r.changeReason,
                    changedBy: r.changedBy,
                    changedAt: r.changedAt
                })))
            }

            if (data.visitAccessLogs && Array.isArray(data.visitAccessLogs)) {
                bulkUpsert('visit_access_logs', data.visitAccessLogs.map((l: Record<string, unknown>) => ({
                    id: l.id,
                    visitaId: l.visitaId,
                    accessType: l.accessType,
                    details: typeof l.details === 'string' ? l.details : JSON.stringify(l.details || {}),
                    accessedBy: l.accessedBy,
                    accessedAt: l.accessedAt
                })))
            }

            if (data.firmeDigitali && Array.isArray(data.firmeDigitali)) {
                bulkUpsert('firme_digitali', data.firmeDigitali.map((f: Record<string, unknown>) => ({
                    id: f.id,
                    refertoId: f.refertoId,
                    documentoId: f.documentoId,
                    documentType: f.documentType,
                    firmatarioId: f.firmatarioId,
                    firmatarioRole: f.firmatarioRole,
                    stato: f.stato,
                    tipoFirma: f.tipoFirma,
                    hashDocumento: f.hashDocumento,
                    hashFirma: f.hashFirma,
                    firmaImageUrl: f.firmaImageUrl,
                    provider: f.provider,
                    timestampTSA: f.timestampTSA,
                    validatoDa: f.validatoDa,
                    validatoAt: f.validatoAt,
                    note: f.note,
                    tenantId: f.tenantId || data.meta?.tenantId || '',
                    createdAt: f.createdAt,
                    updatedAt: f.updatedAt,
                    deletedAt: f.deletedAt
                })))
            }

            // ---- 16. Store tariffari aziendali + voci/associazioni dedicate ----
            if (data.tariffari && Array.isArray(data.tariffari)) {
                const flatVoci: Record<string, unknown>[] = []
                const flatAssociations: Record<string, unknown>[] = []
                const flat = data.tariffari.map((t: Record<string, unknown>) => ({
                    id: t.id,
                    tenantId: t.tenantId || data.meta?.tenantId || '',
                    codice: t.codice,
                    nome: t.nome,
                    descrizione: t.descrizione,
                    attivo: t.attivo != null ? (t.attivo ? 1 : 0) : 1,
                    validoDa: t.validoDa,
                    validoA: t.validoA,
                    isDefault: t.isDefault != null ? (t.isDefault ? 1 : 0) : 0,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                }))
                if (Array.isArray(data.vociTariffario)) {
                    for (const voce of data.vociTariffario as Record<string, unknown>[]) {
                        flatVoci.push({
                            id: voce.id,
                            tenantId: voce.tenantId || data.meta?.tenantId || '',
                            tariffarioAziendaleId: voce.tariffarioAziendaleId,
                            tipo: voce.tipo,
                            prestazioneId: voce.prestazioneId,
                            documentoTemplateId: voce.documentoTemplateId,
                            nome: voce.nome,
                            descrizione: voce.descrizione,
                            prezzoBase: Number(voce.prezzoBase || 0),
                            ivaAliquota: Number(voce.ivaAliquota || 22),
                            categoriaVisita: voce.categoriaVisita,
                            durataMinimaMinuti: voce.durataMinimaMinuti,
                            compensoProfessionistaTipo: voce.compensoProfessionistaTipo,
                            compensoProfessionistaValore: voce.compensoProfessionistaValore,
                            compensoProfessionistaMinimo: voce.compensoProfessionistaMinimo,
                            compensoProfessionistaMassimo: voce.compensoProfessionistaMassimo,
                            frequenza: voce.frequenza,
                            unitaCalcolo: voce.unitaCalcolo,
                            modalitaAttivazione: voce.modalitaAttivazione,
                            ordine: voce.ordine || 0,
                            attivo: voce.attivo != null ? (voce.attivo ? 1 : 0) : 1,
                            note: voce.note,
                            createdAt: voce.createdAt,
                            updatedAt: voce.updatedAt
                        })
                    }
                }
                if (Array.isArray(data.tariffarioCompanyAssociations)) {
                    for (const assoc of data.tariffarioCompanyAssociations as Record<string, unknown>[]) {
                        flatAssociations.push({
                            id: assoc.id || `${assoc.tariffarioId}-${assoc.companyTenantProfileId}`,
                            tenantId: assoc.tenantId || data.meta?.tenantId || '',
                            tariffarioId: assoc.tariffarioId,
                            companyTenantProfileId: assoc.companyTenantProfileId,
                            validoDa: assoc.validoDa,
                            validoA: assoc.validoA,
                            attivo: assoc.attivo != null ? (assoc.attivo ? 1 : 0) : 1,
                            note: assoc.note,
                            createdAt: assoc.createdAt,
                            updatedAt: assoc.updatedAt
                        })
                    }
                }
                bulkUpsert('tariffari', flat)
                bulkUpsert('tariffario_voci', flatVoci.filter(v => v.id && v.tariffarioAziendaleId))
                bulkUpsert('tariffario_company_associations', flatAssociations.filter(a => a.id && a.companyTenantProfileId))
            }

            // ---- 16b. Store servizi MDL aziendali ----
            if (data.sopralluoghi && Array.isArray(data.sopralluoghi)) {
                bulkUpsert('sopralluoghi', data.sopralluoghi.map((s: Record<string, unknown>) => ({
                    id: s.id,
                    tenantId: s.tenantId || data.meta?.tenantId || '',
                    siteId: s.siteId,
                    esecutoreId: s.esecutoreId,
                    dataEsecuzione: s.dataEsecuzione,
                    dataProssimoSopralluogo: s.dataProssimoSopralluogo,
                    valutazione: s.valutazione,
                    esito: s.esito,
                    note: s.note,
                    documentoUrl: s.documentoUrl,
                    documentoNome: s.documentoNome,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt,
                    deletedAt: s.deletedAt
                })))
            }
            if (data.dvrs && Array.isArray(data.dvrs)) {
                bulkUpsert('dvr', data.dvrs.map((d: Record<string, unknown>) => ({
                    id: d.id,
                    tenantId: d.tenantId || data.meta?.tenantId || '',
                    siteId: d.siteId,
                    effettuatoDa: d.effettuatoDa,
                    dataEsecuzione: d.dataEsecuzione,
                    dataScadenza: d.dataScadenza,
                    rischiRilevati: typeof d.rischiRilevati === 'string' ? d.rischiRilevati : JSON.stringify(d.rischiRilevati || []),
                    note: d.note,
                    tipoDVR: d.tipoDVR || 'NUOVO',
                    documentoUrl: d.documentoUrl,
                    documentoNome: d.documentoNome,
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                    deletedAt: d.deletedAt
                })))
            }
            if (data.consulenzeMDL && Array.isArray(data.consulenzeMDL)) {
                bulkUpsert('consulenze_mdl', data.consulenzeMDL.map((c: Record<string, unknown>) => ({
                    id: c.id,
                    tenantId: c.tenantId || data.meta?.tenantId || '',
                    companyTenantProfileId: c.companyTenantProfileId,
                    siteId: c.siteId,
                    professionistaId: c.professionistaId,
                    data: c.data,
                    durataMinuti: c.durataMinuti,
                    oggetto: c.oggetto,
                    note: c.note,
                    importo: c.importo,
                    stato: c.stato || 'DA_RENDICONTARE',
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                    deletedAt: c.deletedAt
                })))
            }
            if (data.allegati3B && Array.isArray(data.allegati3B)) {
                bulkUpsert('allegati_3b', data.allegati3B.map((a: Record<string, unknown>) => ({
                    id: a.id,
                    tenantId: a.tenantId || data.meta?.tenantId || '',
                    medicoCompetenteId: a.medicoCompetenteId,
                    companyTenantProfileId: a.companyTenantProfileId,
                    anno: a.anno,
                    stato: a.stato || 'DA_COMPILARE',
                    totLavoratoriSorvegliati: a.totLavoratoriSorvegliati || 0,
                    totVisiteEffettuate: a.totVisiteEffettuate || 0,
                    totGiudiziIdoneita: a.totGiudiziIdoneita || 0,
                    totGiudiziConLimitazioni: a.totGiudiziConLimitazioni || 0,
                    totGiudiziConPrescrizioni: a.totGiudiziConPrescrizioni || 0,
                    totInidoneita: a.totInidoneita || 0,
                    statistichePerRischio: typeof a.statistichePerRischio === 'string' ? a.statistichePerRischio : JSON.stringify(a.statistichePerRischio || {}),
                    malattieProf: typeof a.malattieProf === 'string' ? a.malattieProf : JSON.stringify(a.malattieProf || {}),
                    lavoratoriPerGenere: typeof a.lavoratoriPerGenere === 'string' ? a.lavoratoriPerGenere : JSON.stringify(a.lavoratoriPerGenere || {}),
                    lavoratoriPerFasciaEta: typeof a.lavoratoriPerFasciaEta === 'string' ? a.lavoratoriPerFasciaEta : JSON.stringify(a.lavoratoriPerFasciaEta || {}),
                    visitePerTipologia: typeof a.visitePerTipologia === 'string' ? a.visitePerTipologia : JSON.stringify(a.visitePerTipologia || {}),
                    giudiziPerTipologia: typeof a.giudiziPerTipologia === 'string' ? a.giudiziPerTipologia : JSON.stringify(a.giudiziPerTipologia || {}),
                    giudiziPerRischio: typeof a.giudiziPerRischio === 'string' ? a.giudiziPerRischio : JSON.stringify(a.giudiziPerRischio || {}),
                    accertamentiIntegrativi: typeof a.accertamentiIntegrativi === 'string' ? a.accertamentiIntegrativi : JSON.stringify(a.accertamentiIntegrativi || {}),
                    dataCompilazione: a.dataCompilazione,
                    dataInvio: a.dataInvio,
                    dataConferma: a.dataConferma,
                    protocolloInvio: a.protocolloInvio,
                    ricevutaInvio: a.ricevutaInvio,
                    note: a.note,
                    createdAt: a.createdAt,
                    updatedAt: a.updatedAt,
                    deletedAt: a.deletedAt
                })))
            }

            // ---- 17. Store convenzioni ----
            if (data.convenzioni && Array.isArray(data.convenzioni)) {
                const flat = data.convenzioni.map((c: Record<string, unknown>) => ({
                    id: c.id,
                    tenantId: c.tenantId || data.meta?.tenantId || '',
                    codice: c.codice,
                    nome: c.nome,
                    tipo: c.tipo,
                    descrizione: c.descrizione,
                    enteTerzo: c.enteTerzo,
                    branchType: c.branchType || 'MEDICA',
                    dataInizio: c.dataInizio,
                    dataFine: c.dataFine,
                    attiva: c.attiva != null ? (c.attiva ? 1 : 0) : 1,
                    isActive: c.attiva != null ? (c.attiva ? 1 : 0) : 1,
                    condizioni: typeof c.condizioni === 'string' ? c.condizioni : JSON.stringify(c.condizioni || {}),
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt
                }))
                bulkUpsert('convenzioni', flat)
            }

            if (data.tombstones && Array.isArray(data.tombstones)) {
                applyTombstones(data.tombstones)
            }

            // ---- 15. Update sync state ----
            db.prepare(
                `INSERT OR REPLACE INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?)`
            ).run('lastDownloadAt', now, now)

            db.prepare(
                `INSERT OR REPLACE INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?)`
            ).run('lastDownloadDate', data.meta?.date || '', now)

            return {
                success: true,
                timestamp: now,
                counts: {
                    patients: data.pazienti?.length || 0,
                    appointments: data.appuntamenti?.length || 0,
                    visits: (data.visiteEsistenti || data.visite)?.length || 0,
                    companies: data.aziende?.length || 0,
                    prestazioni: data.prestazioni?.length || 0,
                    ambulatori: data.ambulatori?.length || 0,
                    slotDisponibilita: data.slotDisponibilita?.length || 0,
                    medici: data.medici?.length || 0,
                    mansioni: data.mansioni?.length || 0,
                    scadenze: data.scadenze?.length || 0,
                    rischiAggiuntivi: data.rischiAggiuntivi?.length || 0,
                    protocolli: data.protocolli?.length || 0,
                    visitTemplates: data.visitTemplates?.length || 0,
                    documentTemplates: data.documentTemplates?.length || 0,
                    documentiCompilati: data.documentiCompilati?.length || 0,
                    questionariRisposte: data.questionariRisposte?.length || 0,
                    profiliSalute: data.profiliSalute?.length || 0,
                    documentiClinici: data.documentiClinici?.length || 0,
                    personDocuments: data.personDocuments?.length || 0,
                    referti: data.referti?.length || 0,
                    visitRevisions: data.visitRevisions?.length || 0,
                    visitAccessLogs: data.visitAccessLogs?.length || 0,
                    firmeDigitali: data.firmeDigitali?.length || 0,
                    tariffari: data.tariffari?.length || 0,
                    convenzioni: data.convenzioni?.length || 0,
                    sopralluoghi: data.sopralluoghi?.length || 0,
                    dvrs: data.dvrs?.length || 0,
                    consulenzeMDL: data.consulenzeMDL?.length || 0,
                    tombstones: data.tombstones?.length || 0
                }
            }
        })()

        // Update dock badge and tray tooltip with scadenze count
        updateAppBadge()

        return result
    })

    // ========== RISCHI AGGIUNTIVI PER LAVORATORE ==========

    ipcMain.handle('rischi:getForWorker', async (_event, { personId }: { personId: string }) => {
        if (!personId || typeof personId !== 'string') throw new Error('personId richiesto')
        const db = getDatabase()
        const rows = db.prepare(
            `SELECT * FROM lavoratore_rischi_aggiuntivi WHERE personId = ? AND ("_isDeleted" IS NULL OR "_isDeleted" = 0) ORDER BY categoria ASC, codiceRischio ASC`
        ).all(personId) as Record<string, unknown>[]
        return rows.map((r) => decryptRecord('lavoratore_rischi_aggiuntivi', r))
    })

    ipcMain.handle('rischi:add', async (_event, { personId, tenantId, data }: { personId: string; tenantId: string; data: Record<string, unknown> }) => {
        if (!personId || !data || !data.codiceRischio) throw new Error('personId e codiceRischio richiesti')
        const db = getDatabase()
        const id = uuidv4()
        const now = new Date().toISOString()
        const record = encryptRecord('lavoratore_rischi_aggiuntivi', {
            id, _localId: id, _serverId: null, personId, tenantId,
            codiceRischio: data.codiceRischio,
            livello: data.livello || 'MEDIO',
            categoria: data.categoria || 'CHIMICO',
            descrizioneEsposizione: data.descrizioneEsposizione || null,
            fonteRischio: data.fonteRischio || null,
            periodicitaMesi: data.periodicitaMesi || null,
            note: data.note || null,
            sourceMansioneId: data.sourceMansioneId || null,
            createdAt: now, updatedAt: now,
            _syncStatus: 'PENDING', _localUpdatedAt: now, _isDeleted: 0, _version: 1
        })
        const columns = Object.keys(record).filter(isValidColumnName)
        const placeholders = columns.map(() => '?').join(', ')
        db.prepare(
            `INSERT OR REPLACE INTO lavoratore_rischi_aggiuntivi (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
        ).run(...columns.map(c => record[c] ?? null))
        // Enqueue for server sync
        const opId = uuidv4()
        db.prepare(
            `INSERT INTO operations_queue (id, type, entity, entityId, localId, payload, dependsOn, timestamp, status, retryCount)
       VALUES (?, 'CREATE', 'lavoratoreRischioAggiuntivo', ?, ?, ?, '[]', ?, 'PENDING', 0)`
        ).run(opId, id, id, JSON.stringify({
            personId, tenantId,
            codiceRischio: data.codiceRischio,
            livello: data.livello || 'MEDIO',
            categoria: data.categoria || 'CHIMICO',
            descrizioneEsposizione: data.descrizioneEsposizione || null,
            fonteRischio: data.fonteRischio || null,
            periodicitaMesi: data.periodicitaMesi || null,
            note: data.note || null,
            sourceMansioneId: data.sourceMansioneId || null
        }), now)
        return { id, success: true }
    })

    ipcMain.handle('rischi:update', async (_event, { id, data }: { id: string; data: Record<string, unknown> }) => {
        if (!id || typeof id !== 'string') throw new Error('id richiesto')
        const db = getDatabase()
        const now = new Date().toISOString()
        const allowedFields = ['livello', 'note', 'descrizioneEsposizione', 'fonteRischio', 'periodicitaMesi']
        const updates: Record<string, unknown> = { updatedAt: now, _syncStatus: 'PENDING', _localUpdatedAt: now }
        for (const key of allowedFields) {
            if (data[key] !== undefined) updates[key] = data[key]
        }
        const validKeys = Object.keys(updates).filter(isValidColumnName)
        const setClauses = validKeys.map(k => `"${k}" = ?`)
        const values = [...validKeys.map(k => updates[k]), id]
        db.prepare(`UPDATE lavoratore_rischi_aggiuntivi SET ${setClauses.join(', ')} WHERE id = ?`).run(...values)
        // Enqueue update for server sync
        const updatedRow = db.prepare(
            `SELECT personId, tenantId, codiceRischio, livello, categoria, descrizioneEsposizione, fonteRischio FROM lavoratore_rischi_aggiuntivi WHERE id = ?`
        ).get(id) as Record<string, unknown> | undefined
        if (updatedRow) {
            const opId = uuidv4()
            db.prepare(
                `INSERT INTO operations_queue (id, type, entity, entityId, localId, payload, dependsOn, timestamp, status, retryCount)
         VALUES (?, 'UPDATE', 'lavoratoreRischioAggiuntivo', ?, ?, ?, '[]', ?, 'PENDING', 0)`
            ).run(opId, id, id, JSON.stringify({ ...updatedRow, ...updates }), now)
        }
        return { success: true }
    })

    ipcMain.handle('rischi:remove', async (_event, { id }: { id: string }) => {
        if (!id || typeof id !== 'string') throw new Error('id richiesto')
        const db = getDatabase()
        const now = new Date().toISOString()
        db.prepare(
            `UPDATE lavoratore_rischi_aggiuntivi SET "_isDeleted" = 1, "_syncStatus" = 'PENDING', "_localUpdatedAt" = ? WHERE id = ?`
        ).run(now, id)
        // Enqueue delete for server sync
        const opId = uuidv4()
        db.prepare(
            `INSERT INTO operations_queue (id, type, entity, entityId, localId, payload, dependsOn, timestamp, status, retryCount)
       VALUES (?, 'DELETE', 'lavoratoreRischioAggiuntivo', ?, ?, '{}', '[]', ?, 'PENDING', 0)`
        ).run(opId, id, id, now)
        return { success: true }
    })

    // ========== FILE OPERATIONS (Allegati) ==========

    ipcMain.handle('dialog:openFile', async (_event, options?: { filters?: { name: string; extensions: string[] }[] }) => {
        const win = BrowserWindow.getFocusedWindow()
        if (!win) return { canceled: true, filePaths: [] }

        const result = await dialog.showOpenDialog(win, {
            title: 'Seleziona file da allegare',
            properties: ['openFile'],
            filters: options?.filters || [
                { name: 'Documenti', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'rtf'] },
                { name: 'Immagini', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'] },
                { name: 'Tutti i file', extensions: ['*'] }
            ]
        })

        return { canceled: result.canceled, filePaths: result.filePaths }
    })

    ipcMain.handle('file:readLocalFile', async (_event, localPath: string) => {
        if (!localPath || typeof localPath !== 'string') throw new Error('Percorso non valido')
        // Restrict to userData to prevent arbitrary file system reads (path traversal)
        const { resolve: resolvePath } = await import('path')
        const userDataDir = app.getPath('userData')
        const resolved = resolvePath(localPath)
        if (!resolved.startsWith(userDataDir)) throw new Error('Accesso al file non consentito')
        if (!existsSync(resolved)) throw new Error('File non trovato')
        const buffer = readFileSync(resolved)
        return { buffer: buffer.toString('base64'), size: buffer.length }
    })

    ipcMain.handle('file:openLocalFile', async (_event, localPath: string) => {
        if (!localPath || typeof localPath !== 'string') throw new Error('Percorso non valido')
        const { resolve: resolvePath } = await import('path')
        const userDataDir = app.getPath('userData')
        const resolved = resolvePath(localPath)
        if (!resolved.startsWith(userDataDir)) throw new Error('Accesso al file non consentito')
        if (!existsSync(resolved)) throw new Error('File non trovato')
        const error = await shell.openPath(resolved)
        if (error) throw new Error(error)
        return { success: true }
    })

    ipcMain.handle('file:saveGeneratedDocument', async (_event, { bufferBase64, fileName, scopeId }: { bufferBase64: string; fileName: string; scopeId?: string }) => {
        if (!bufferBase64 || typeof bufferBase64 !== 'string') throw new Error('Contenuto file non valido')
        if (!fileName || typeof fileName !== 'string') throw new Error('Nome file non valido')
        const safeFileName = basename(fileName).replace(/[^\w.\-]+/g, '_').slice(0, 180)
        const ext = extname(safeFileName)
        const safeScope = (scopeId && typeof scopeId === 'string' ? scopeId : 'company-documents').replace(/[^\w-]+/g, '_')
        const attachmentsDir = join(app.getPath('userData'), 'attachments', safeScope)
        mkdirSync(attachmentsDir, { recursive: true })
        const destPath = join(attachmentsDir, `${uuidv4()}${ext || '.bin'}`)
        const buffer = Buffer.from(bufferBase64, 'base64')
        const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024
        if (buffer.length > MAX_ATTACHMENT_BYTES) throw new Error('File troppo grande (massimo 50 MB)')
        writeFileSync(destPath, buffer)
        return {
            localPath: destPath,
            nome: safeFileName,
            tipo: (ext || '.bin').replace('.', '').toLowerCase(),
            dimensione: buffer.length
        }
    })

    ipcMain.handle('file:exportLocalFile', async (_event, { localPath, fileName }: { localPath: string; fileName: string }) => {
        if (!localPath || typeof localPath !== 'string') throw new Error('Percorso non valido')
        const { resolve: resolvePath } = await import('path')
        const userDataDir = app.getPath('userData')
        const resolved = resolvePath(localPath)
        if (!resolved.startsWith(userDataDir)) throw new Error('Accesso al file non consentito')
        if (!existsSync(resolved)) throw new Error('File non trovato')
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
        const result = await dialog.showSaveDialog(win!, {
            title: 'Salva documento',
            defaultPath: basename(fileName || localPath)
        })
        if (result.canceled || !result.filePath) return { canceled: true }
        copyFileSync(resolved, result.filePath)
        return { canceled: false, filePath: result.filePath }
    })

    ipcMain.handle('file:getPendingAttachments', async () => {
        const db = getDatabase()
        const rows = db.prepare(
            `SELECT a.id, a.visitaId, COALESCE(v._serverId, a.visitaId) AS serverVisitaId,
                    a.nome, a.tipo, a.dimensione, a.localPath, a.tenantId
             FROM allegati a
             LEFT JOIN visits v ON v.id = a.visitaId
             WHERE a.visitaId IS NOT NULL AND a.visitaId != ''
               AND a.localPath IS NOT NULL
               AND (a.serverUrl IS NULL OR a.serverUrl = '')
               AND a._isDeleted = 0
               AND (v.id IS NULL OR v._syncStatus = 'SYNCED' OR v._serverId IS NOT NULL)`
        ).all() as Array<{ id: string; visitaId: string | null; serverVisitaId: string | null; nome: string; tipo: string | null; dimensione: number | null; localPath: string; tenantId: string }>
        return rows
    })

    ipcMain.handle('file:markAttachmentSynced', async (_event, { id, serverUrl }: { id: string; serverUrl: string }) => {
        if (!id || typeof id !== 'string') throw new Error('id richiesto')
        if (!serverUrl || typeof serverUrl !== 'string') throw new Error('serverUrl richiesto')
        const db = getDatabase()
        const now = new Date().toISOString()
        db.prepare(
            `UPDATE allegati SET serverUrl = ?, _syncStatus = 'SYNCED', _lastSyncAt = ? WHERE id = ?`
        ).run(serverUrl, now, id)
        return { success: true }
    })

    ipcMain.handle('file:copyToAppData', async (_event, { sourcePath, visitaId }: { sourcePath: string; visitaId: string }) => {
        if (!sourcePath || typeof sourcePath !== 'string') throw new Error('Percorso sorgente non valido')
        if (!visitaId || typeof visitaId !== 'string') throw new Error('ID visita non valido')
        if (!existsSync(sourcePath)) throw new Error('File sorgente non trovato')

        // Security: enforce max attachment size before copying (disk DoS prevention)
        const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024 // 50 MB
        const srcStats = statSync(sourcePath)
        if (srcStats.size > MAX_ATTACHMENT_BYTES) throw new Error('File troppo grande (massimo 50 MB)')

        const attachmentsDir = join(app.getPath('userData'), 'attachments', visitaId)
        mkdirSync(attachmentsDir, { recursive: true })

        const fileName = basename(sourcePath)
        const ext = extname(fileName)
        const uniqueName = `${uuidv4()}${ext}`
        const destPath = join(attachmentsDir, uniqueName)

        copyFileSync(sourcePath, destPath)

        const stats = statSync(destPath)

        return {
            localPath: destPath,
            nome: fileName,
            tipo: ext.replace('.', '').toLowerCase(),
            dimensione: stats.size
        }
    })

    ipcMain.handle('file:writeBase64Attachment', async (_event, { base64, fileName, visitaId }: { base64: string; fileName: string; visitaId: string }) => {
        if (!base64 || typeof base64 !== 'string') throw new Error('Contenuto file non valido')
        if (!visitaId || typeof visitaId !== 'string') throw new Error('ID visita non valido')
        const safeName = basename(fileName || 'referto-strumentale.pdf').replace(/[^\w.\- ()]/g, '_')
        const ext = extname(safeName) || '.pdf'
        const buffer = Buffer.from(base64, 'base64')
        const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024
        if (buffer.length > MAX_ATTACHMENT_BYTES) throw new Error('File troppo grande (massimo 50 MB)')

        const attachmentsDir = join(app.getPath('userData'), 'attachments', visitaId)
        mkdirSync(attachmentsDir, { recursive: true })
        const destPath = join(attachmentsDir, `${uuidv4()}${ext}`)
        writeFileSync(destPath, buffer)
        const stats = statSync(destPath)

        return {
            localPath: destPath,
            nome: safeName,
            tipo: ext.replace('.', '').toLowerCase(),
            dimensione: stats.size
        }
    })

    // ========== APP INFO ==========

    ipcMain.handle('app:getVersion', async () => {
        return app.getVersion()
    })

    ipcMain.handle('app:getPath', async (_event, name: string) => {
        const validPaths = ['userData', 'temp', 'documents']
        if (!validPaths.includes(name)) throw new Error('Path non valido')
        return app.getPath(name as 'userData' | 'temp' | 'documents')
    })

    ipcMain.handle('app:isPackaged', async () => {
        return app.isPackaged
    })

    /**
     * Open a URL in the system default browser.
     * Allowed: https:// (any) and http://localhost:{BRIDGE_PORT}/setup* only.
     */
    ipcMain.handle('app:openExternal', async (_event, url: string) => {
        if (typeof url !== 'string') throw new Error('URL non valido')
        const isHttps = url.startsWith('https://')
        const isBridgeSetup = (
            url.startsWith(`http://localhost:${BRIDGE_PORT}/setup`) ||
            url.startsWith(`http://127.0.0.1:${BRIDGE_PORT}/setup`)
        )
        if (!isHttps && !isBridgeSetup) throw new Error('URL non consentito')
        await shell.openExternal(url)
    })

    ipcMain.handle('app:confirmDialog', async (_event, params: {
        title: string; message: string; detail?: string;
        buttons?: string[]; defaultId?: number; type?: 'none' | 'info' | 'error' | 'question' | 'warning'
    }) => {
        const { title, message, detail, buttons = ['Annulla', 'Conferma'], defaultId = 0, type = 'question' } = params
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
        const result = await dialog.showMessageBox(win!, {
            type, title, message, detail, buttons, defaultId, cancelId: 0
        })
        return result.response === 1  // true if user clicked the second button (Confirm)
    })

    // ========== DELETE WHERE (for queue cleanup) ==========

    ipcMain.handle('db:deleteWhere', async (_event, { table, where }) => {
        validateTableName(table)
        if (!where || typeof where !== 'object') throw new Error('Condizione WHERE richiesta')

        const db = getDatabase()
        const params: unknown[] = []
        const conditions = Object.entries(where)
            .filter(([key]) => isValidColumnName(key))
            .map(([key]) => {
                params.push(where[key])
                return `"${key}" = ?`
            })

        if (conditions.length === 0) throw new Error('Almeno una condizione WHERE richiesta')

        const sql = `DELETE FROM "${table}" WHERE ${conditions.join(' AND ')}`
        const result = db.prepare(sql).run(...params)
        return { deleted: result.changes }
    })

    // Delete ALL rows from a table — used by wipe remoto
    ipcMain.handle('db:clearTable', async (_event, { table }: { table: string }) => {
        validateTableName(table)
        const db = getDatabase()
        const result = db.prepare(`DELETE FROM "${table}"`).run()
        return { deleted: result.changes }
    })

    // ========== FTS5 PATIENT SEARCH ==========

    ipcMain.handle('db:searchPatients', async (_event, { query }: { query: string }) => {
        if (!query || typeof query !== 'string') return []
        const trimmed = query.trim()
        if (trimmed.length < 2) return []

        const db = getDatabase()
        const tenantFilter = currentTenantId ? `AND p.tenantId = ?` : ''
        const params: unknown[] = []

        // Build FTS5 MATCH query: lowercase tokens to avoid FTS5 keyword conflicts (AND/OR/NOT/NEAR)
        const FTS5_KEYWORDS = new Set(['AND', 'OR', 'NOT', 'NEAR'])
        const tokens = trimmed.replace(/[^a-zA-Z0-9àèéìòùÀÈÉÌÒÙ ]/g, ' ')
            .split(/\s+/)
            .filter(t => t.length >= 2)
        if (tokens.length === 0) return []
        const ftsQuery = tokens
            .map(t => FTS5_KEYWORDS.has(t.toUpperCase()) ? `"${t.toLowerCase()}"` : `${t.toLowerCase()}*`)
            .join(' ')

        if (currentTenantId) params.push(currentTenantId)

        const sql = `
      SELECT p.*
      FROM patients p
      INNER JOIN patients_fts fts ON fts.id = p.id
      WHERE patients_fts MATCH ?
        AND p._isDeleted = 0
        ${tenantFilter}
      ORDER BY p.lastName ASC
      LIMIT 100
    `
        const rows = db.prepare(sql).all(ftsQuery, ...params) as Record<string, unknown>[]
        return rows.map(row => decryptRecord('patients', row))
    })

    // ========== BACKUP / RESTORE ==========

    ipcMain.handle('db:exportBackup', async () => {
        const db = getDatabase()
        const dateStr = new Date().toISOString().slice(0, 10)
        const result = await dialog.showSaveDialog({
            title: 'Salva backup database',
            defaultPath: `elementmedica-backup-${dateStr}.db`,
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        })
        if (result.canceled || !result.filePath) return { success: false }

        // Use better-sqlite3 backup API — safe on open databases
        await db.backup(result.filePath)
        return { success: true, path: result.filePath }
    })

    ipcMain.handle('db:importBackup', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Seleziona backup da ripristinare',
            filters: [{ name: 'SQLite Database', extensions: ['db'] }],
            properties: ['openFile']
        })
        if (result.canceled || !result.filePaths[0]) return { success: false }

        const srcPath = result.filePaths[0]
        const dbPath = join(app.getPath('userData'), 'data', 'elementmedica.db')
        const safetyPath = dbPath + '.pre-restore-' + Date.now()

        // Keep a safety copy before overwriting
        copyFileSync(dbPath, safetyPath)
        copyFileSync(srcPath, dbPath)

        return { success: true, needsRestart: true }
    })

    // ========== UPDATER ACTIONS ==========

    ipcMain.handle('updater:downloadUpdate', async () => {
        try {
            const { autoUpdater } = await import('electron-updater')
            await autoUpdater.downloadUpdate()
            return { success: true }
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Errore download aggiornamento'
            // Propagate error to renderer via event channel so UpdateBanner can show it
            const win = BrowserWindow.getAllWindows()[0]
            if (win) win.webContents.send('updater:error', msg)
            return { success: false, error: msg }
        }
    })

    ipcMain.handle('updater:installUpdate', async () => {
        const { autoUpdater } = await import('electron-updater')
        autoUpdater.quitAndInstall(false, true)
        return { success: true }
    })

    // ========== APP BADGE ==========

    ipcMain.handle('app:updateBadge', async () => {
        updateAppBadge()
        return { success: true }
    })

    ipcMain.handle('app:getScadenzeCount', async () => {
        try {
            const db = getDatabase()
            const today = new Date().toISOString().split('T')[0]
            const t7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            const t30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

            const buildParams = (...dates: string[]) =>
                currentTenantId ? [...dates, currentTenantId] : dates
            const tenantClause = currentTenantId ? ' AND tenantId = ?' : ''

            const scadutiRow = db.prepare(
                `SELECT COUNT(*) as count FROM scadenze WHERE eseguita = 0 AND _isDeleted = 0 AND dataScadenza < ?${tenantClause}`
            ).get(...buildParams(today)) as { count: number }

            const criticiRow = db.prepare(
                `SELECT COUNT(*) as count FROM scadenze WHERE eseguita = 0 AND _isDeleted = 0 AND dataScadenza >= ? AND dataScadenza <= ?${tenantClause}`
            ).get(...buildParams(today, t7)) as { count: number }

            const attenzioneRow = db.prepare(
                `SELECT COUNT(*) as count FROM scadenze WHERE eseguita = 0 AND _isDeleted = 0 AND dataScadenza > ? AND dataScadenza <= ?${tenantClause}`
            ).get(...buildParams(t7, t30)) as { count: number }

            const scaduti = scadutiRow?.count ?? 0
            const critici = criticiRow?.count ?? 0
            const attenzione = attenzioneRow?.count ?? 0
            return { scaduti, critici, attenzione, urgent: scaduti + critici, total: scaduti + critici + attenzione }
        } catch {
            return { scaduti: 0, critici: 0, attenzione: 0, urgent: 0, total: 0 }
        }
    })

    // ========== NATIVE NOTIFICATIONS ==========

    ipcMain.handle('app:showNotification', (_event, { title, body }: { title: string; body: string }) => {
        sendNotification({ event: 'custom', title, body })
        return { success: true }
    })

    // Event-based notifications from renderer (sync complete/fail/conflicts, etc.)
    ipcMain.handle('notify:send', (_event, payload: {
        event: string
        detail?: string
        title?: string
        body?: string
    }) => {
        sendNotification(payload as Parameters<typeof sendNotification>[0])
        return { ok: true }
    })

    // ========== ERROR LOGGING ==========

    ipcMain.handle('app:logError', (_event, { message, stack, context }: { message: string; stack?: string; context?: string }) => {
        try {
            const logDir = join(app.getPath('userData'), 'logs')
            mkdirSync(logDir, { recursive: true })
            const logPath = join(logDir, 'errors.log')
            const ts = new Date().toISOString()
            const line = JSON.stringify({ ts, message, stack, context }) + '\n'
            appendFileSync(logPath, line, 'utf8')
        } catch { /* non-fatal */ }
        return { success: true }
    })

    ipcMain.handle('app:getErrorLog', () => {
        try {
            const logPath = join(app.getPath('userData'), 'logs', 'errors.log')
            if (!existsSync(logPath)) return []
            const raw = readFileSync(logPath, 'utf8')
            // Return last 100 entries, newest first
            const lines = raw.trim().split('\n').filter(Boolean)
            return lines
                .slice(-100)
                .reverse()
                .map(l => { try { return JSON.parse(l) } catch { return null } })
                .filter(Boolean)
        } catch {
            return []
        }
    })

    ipcMain.handle('app:clearErrorLog', () => {
        try {
            const logPath = join(app.getPath('userData'), 'logs', 'errors.log')
            writeFileSync(logPath, '', 'utf8')
        } catch { /* non-fatal */ }
        return { success: true }
    })

    // ========== LICENSE ==========

    ipcMain.handle('license:getMachineId', async () => {
        return getMachineId()
    })

    ipcMain.handle('license:getMachineName', async () => {
        return getMachineName()
    })

    ipcMain.handle('license:getInfo', async (_event, tenantId?: string) => {
        const db = getDatabase()
        const key = tenantId ? `licenseInfo:${tenantId}` : 'licenseInfo'
        const row = db.prepare(`SELECT value FROM sync_state WHERE key = ?`).get(key) as { value: string } | undefined
        if (!row) return null
        try {
            return JSON.parse(row.value)
        } catch {
            return null
        }
    })

    ipcMain.handle('license:storeInfo', async (_event, info: Record<string, unknown>, tenantId?: string) => {
        if (!info || typeof info !== 'object') throw new Error('Dati licenza non validi')
        const db = getDatabase()
        const now = new Date().toISOString()
        const key = tenantId ? `licenseInfo:${tenantId}` : 'licenseInfo'
        db.prepare(
            `INSERT OR REPLACE INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?)`
        ).run(key, JSON.stringify({ ...info, lastHeartbeatAt: now }), now)
        return { success: true }
    })

    // ========== GDPR AUDIT LOG ==========

    /** Retrieve GDPR audit log entries (filterable by resource type). */
    ipcMain.handle('gdpr:getAuditLog', async (_event, { resourceType, limit }: { resourceType?: string; limit?: number } = {}) => {
        const db = getDatabase()
        const effectiveLimit = typeof limit === 'number' && limit > 0 ? Math.min(limit, 500) : 100
        let sql = `SELECT * FROM gdpr_audit_log`
        const params: unknown[] = []

        if (resourceType && typeof resourceType === 'string') {
            sql += ` WHERE resourceType = ?`
            params.push(resourceType)
            if (currentTenantId) { sql += ` AND tenantId = ?`; params.push(currentTenantId) }
        } else if (currentTenantId) {
            sql += ` WHERE tenantId = ?`
            params.push(currentTenantId)
        }

        sql += ` ORDER BY performedAt DESC LIMIT ${effectiveLimit}`
        const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
        return rows
    })

    /** Add a manual GDPR audit entry (e.g. for data export, FSE consent). */
    ipcMain.handle('gdpr:addEntry', async (_event, { resourceType, resourceId, action, reason, dataAccessed }: {
        resourceType: string
        resourceId: string
        action: string
        reason?: string
        dataAccessed?: string[]
    }) => {
        if (!resourceType || !resourceId || !action) throw new Error('resourceType, resourceId, action richiesti')
        const db = getDatabase()
        const id = uuidv4()
        const now = new Date().toISOString()
        db.prepare(`
      INSERT INTO gdpr_audit_log (id, resourceType, resourceId, action, deletionReason, performedBy, performedAt, tenantId, dataAccessed, metadata, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', 0)
    `).run(id, resourceType, resourceId, action, reason || null, currentTenantId || 'unknown', now, currentTenantId || '', JSON.stringify(dataAccessed || []))
        return { id, success: true }
    })

    // ========== FSE 2.0 (Fascicolo Sanitario Elettronico) ==========

    /** Get FSE consent status for a patient. */
    ipcMain.handle('fse:getConsent', async (_event, { patientId }: { patientId: string }) => {
        if (!patientId || typeof patientId !== 'string') throw new Error('patientId richiesto')
        const db = getDatabase()
        const row = db.prepare(
            `SELECT id, fseConsent, fseConsentDate, fseOptOut FROM patients WHERE id = ?`
        ).get(patientId) as { id: string; fseConsent: number; fseConsentDate: string | null; fseOptOut: number } | undefined

        if (!row) throw new Error('Paziente non trovato')
        return {
            patientId: row.id,
            fseConsent: row.fseConsent === 1,
            fseConsentDate: row.fseConsentDate || null,
            fseOptOut: row.fseOptOut === 1
        }
    })

    /** Set FSE consent for a patient and log the consent event in GDPR audit. */
    ipcMain.handle('fse:setConsent', async (_event, { patientId, consent, optOut }: { patientId: string; consent: boolean; optOut?: boolean }) => {
        if (!patientId || typeof patientId !== 'string') throw new Error('patientId richiesto')
        if (typeof consent !== 'boolean') throw new Error('consent (boolean) richiesto')

        const db = getDatabase()
        const now = new Date().toISOString()

        db.prepare(`
      UPDATE patients SET fseConsent = ?, fseConsentDate = ?, fseOptOut = ?, _syncStatus = 'PENDING', _localUpdatedAt = ?
      WHERE id = ?
    `).run(consent ? 1 : 0, consent ? now : null, optOut ? 1 : 0, now, patientId)

        // GDPR audit trail for consent
        try {
            const auditId = uuidv4()
            db.prepare(`
        INSERT INTO gdpr_audit_log (id, resourceType, resourceId, action, deletionReason, performedBy, performedAt, tenantId, dataAccessed, metadata, synced)
        VALUES (?, 'patients', ?, 'FSE_CONSENT', ?, ?, ?, ?, '["fseConsent","fseConsentDate","fseOptOut"]', ?, 0)
      `).run(auditId, patientId, `Consenso FSE ${consent ? 'accordato' : 'revocato'}`, currentTenantId || 'unknown', now, currentTenantId || '', JSON.stringify({ consent, optOut: optOut || false }))
        } catch { /* non-critical */ }

        return { success: true }
    })

    /** Generate a FHIR R4 Bundle for a visit and optionally save to file. */
    ipcMain.handle('fse:exportVisit', async (_event, { visitId, saveToFile }: { visitId: string; saveToFile?: boolean }) => {
        if (!visitId || typeof visitId !== 'string') throw new Error('visitId richiesto')

        const db = getDatabase()

        // Load visit
        const visitRow = db.prepare(`SELECT * FROM visits WHERE id = ?`).get(visitId) as Record<string, unknown> | undefined
        if (!visitRow) throw new Error('Visita non trovata')
        const visit = decryptRecord('visits', visitRow)

        // Load patient
        const patientRow = db.prepare(`SELECT * FROM patients WHERE id = ?`).get(visit.personId as string) as Record<string, unknown> | undefined
        const patient = patientRow ? decryptRecord('patients', patientRow) : null

        // Load giudizio idoneità (optional)
        const giudizioRow = db.prepare(
            `SELECT * FROM giudizi_idoneita WHERE visitaId = ? AND _isDeleted = 0 LIMIT 1`
        ).get(visitId) as Record<string, unknown> | undefined
        const giudizio = giudizioRow ? decryptRecord('giudizi_idoneita', giudizioRow) : null

        const bundle = generateFhirBundle({
            patient: {
                id: (patient?.id as string) || visitRow.personId as string,
                firstName: patient?.firstName as string | null,
                lastName: patient?.lastName as string | null,
                taxCode: patient?.taxCode as string | null,
                birthDate: patient?.birthDate as string | null,
                gender: patient?.gender as string | null,
                tenantId: visit.tenantId as string | null
            } satisfies FhirPatient,
            visit: {
                id: visit.id as string,
                personId: visit.personId as string | null,
                tenantId: visit.tenantId as string | null,
                medicoId: visit.medicoId as string | null,
                stato: visit.stato as string | null,
                dataOra: visit.dataOra as string | null,
                motivoVisita: visit.motivoVisita as string | null,
                anamnesi: visit.anamnesi as string | null,
                esameObiettivo: visit.esameObiettivo as string | null,
                diagnosi: visit.diagnosi as string | null,
                terapia: visit.terapia as string | null,
                codiceICD10: visit.codiceICD10 as string | null,
                codiceICPC2: visit.codiceICPC2 as string | null,
                tipo: visit.tipo as string | null,
                tipoVisitaMDL: visit.tipoVisitaMDL as string | null
            } satisfies FhirVisit,
            giudizio: giudizio ? {
                id: giudizio.id as string,
                esito: giudizio.esito as string | null,
                limitazioni: giudizio.limitazioni as string | null,
                prescrizioni: giudizio.prescrizioni as string | null,
                dataEmissione: giudizio.dataEmissione as string | null,
                dataScadenza: giudizio.dataScadenza as string | null
            } satisfies FhirGiudizio : null
        })

        // Optionally save to a JSON file in userData/fse-exports/
        let savedPath: string | null = null
        if (saveToFile) {
            const exportDir = join(app.getPath('userData'), 'fse-exports')
            if (!existsSync(exportDir)) mkdirSync(exportDir, { recursive: true })
            const fname = `fhir-bundle-${visitId.slice(0, 8)}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
            savedPath = join(exportDir, fname)
            writeFileSync(savedPath, JSON.stringify(bundle, null, 2), 'utf8')

            // GDPR audit: log export
            try {
                const auditId = uuidv4()
                db.prepare(`
          INSERT INTO gdpr_audit_log (id, resourceType, resourceId, action, deletionReason, performedBy, performedAt, tenantId, dataAccessed, metadata, synced)
          VALUES (?, 'visits', ?, 'EXPORT', 'Esportazione FHIR R4 per FSE', ?, ?, ?, '["visits","patients","giudizi_idoneita"]', ?, 0)
        `).run(auditId, visitId, currentTenantId || 'unknown', new Date().toISOString(), currentTenantId || '', JSON.stringify({ format: 'FHIR_R4', path: savedPath }))
            } catch { /* non-critical */ }
        }

        return { bundle, savedPath }
    })

    // ========== MEDICAL DEVICE BRIDGE ==========

    /** Start the bridge child process (idempotent). */
    ipcMain.handle('bridge:start', async () => {
        const result = startBridge()
        return result
    })

    /** Stop the bridge child process. */
    ipcMain.handle('bridge:stop', async () => {
        stopBridge()
        return { stopped: true }
    })

    /** Get bridge status (running, port, pid, available, isSetup). */
    ipcMain.handle('bridge:getStatus', async () => {
        const base = getBridgeStatus()
        if (!base.running) return { ...base, isSetup: false }
        // Probe the bridge HTTP server to distinguish setup mode from operational mode
        try {
            const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/health`, {
                signal: AbortSignal.timeout(1500),
            })
            if (res.ok) {
                const data = await res.json() as { status?: string }
                const isSetup = typeof data.status === 'string' && data.status.includes('setup')
                return { ...base, isSetup }
            }
        } catch {
            // Bridge started but not yet listening — treat as setup phase
        }
        return { ...base, isSetup: true }
    })

    /** Returns the port the bridge HTTP server listens on. */
    ipcMain.handle('bridge:getPort', async () => {
        return { port: BRIDGE_PORT }
    })

    /** Read the bridge device configuration from config.json (creates default if missing). */
    ipcMain.handle('bridge:getConfig', async () => {
        const configPath = join(app.getPath('userData'), 'bridge', 'config.json')
        if (!existsSync(configPath)) {
            return { devices: [], configPath }
        }
        try {
            const raw = readFileSync(configPath, 'utf-8')
            const parsed = JSON.parse(raw) as Record<string, unknown>
            return { devices: parsed.devices ?? [], configPath }
        } catch {
            return { devices: [], configPath }
        }
    })

    /**
     * Save device configuration to config.json and restart bridge.
     * devices: array of DeviceConfig objects (partial updates allowed)
     */
    ipcMain.handle('bridge:saveDeviceConfig', async (_event, devices: unknown[]) => {
        const bridgeDataDir = join(app.getPath('userData'), 'bridge')
        const configPath = join(bridgeDataDir, 'config.json')
        mkdirSync(bridgeDataDir, { recursive: true })

        let existing: Record<string, unknown> = {}
        if (existsSync(configPath)) {
            try {
                existing = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>
            } catch { /* start fresh */ }
        }

        const updated = {
            ...existing,
            port: existing.port ?? BRIDGE_PORT,
            callbackUrl: existing.callbackUrl ?? `http://127.0.0.1:4051/bridge-callback`,
            apiKey: existing.apiKey ?? '',
            gdtVersion: existing.gdtVersion ?? '02.10',
            gdtSenderId: existing.gdtSenderId ?? 'ELEM_MED',
            gdtCharset: existing.gdtCharset ?? 3,
            logLevel: existing.logLevel ?? 'info',
            devices,
        }
        writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf-8')

        // Restart bridge to apply new config
        stopBridge()
        await new Promise(res => setTimeout(res, 500))
        const result = startBridge()
        return { success: true, started: result.started }
    })

    /** Open native folder picker and return selected path. */
    ipcMain.handle('bridge:selectDirectory', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Seleziona cartella',
        })
        return result.canceled ? null : (result.filePaths[0] ?? null)
    })

    /** Open native file picker for executable selection. */
    ipcMain.handle('bridge:selectExecutable', async () => {
        const filters = process.platform === 'win32'
            ? [{ name: 'Eseguibili', extensions: ['exe'] }, { name: 'Tutti', extensions: ['*'] }]
            : [{ name: 'Applicazioni', extensions: ['app', 'exe', ''] }, { name: 'Tutti', extensions: ['*'] }]
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            title: 'Seleziona eseguibile dispositivo',
            filters,
        })
        return result.canceled ? null : (result.filePaths[0] ?? null)
    })

    /** Test bridge HTTP connectivity — GET /health.
     *  Tries BRIDGE_PORT first, then fallback ports (4052, 4053) in case the bridge
     *  started on an alternative port due to a port conflict.
     */
    ipcMain.handle('bridge:testConnectivity', async () => {
        const FALLBACK_PORTS = [BRIDGE_PORT, BRIDGE_PORT + 2, BRIDGE_PORT + 3] // 4050, 4052, 4053

        for (const port of FALLBACK_PORTS) {
            try {
                const res = await fetch(`http://127.0.0.1:${port}/health`, {
                    signal: AbortSignal.timeout(3000),
                })
                if (res.ok) {
                    const data = await res.json() as Record<string, unknown>
                    const isMainPort = port === BRIDGE_PORT
                    return {
                        ok: true,
                        status: data.status ?? 'ok',
                        port,
                        data,
                        portNote: isMainPort ? undefined : `Bridge attivo sulla porta fallback ${port} (invece di ${BRIDGE_PORT})`,
                    }
                }
            } catch (err) {
                const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.message.toLowerCase().includes('timeout'))
                // Log diagnostics for debugging — bridge process info
                const bridgeStatus = getBridgeStatus()
                if (port === FALLBACK_PORTS[FALLBACK_PORTS.length - 1]) {
                    // All ports exhausted — return detailed error
                    const bridgeLogDir = join(app.getPath('userData'), 'bridge', 'logs')
                    return {
                        ok: false,
                        status: isTimeout
                            ? `Bridge avviato (PID ${bridgeStatus.pid ?? 'N/A'}) ma non risponde sulla porta ${BRIDGE_PORT}. Controllare i log: ${bridgeLogDir}`
                            : err instanceof Error ? err.message : 'Non raggiungibile',
                        bridgePid: bridgeStatus.pid,
                        bridgeRunning: bridgeStatus.running,
                        checkedPorts: FALLBACK_PORTS,
                    }
                }
                // Continue to next port only on connection-refused (not timeout)
                if (isTimeout) {
                    const bridgeLogDir = join(app.getPath('userData'), 'bridge', 'logs')
                    return {
                        ok: false,
                        status: `Bridge avviato (PID ${bridgeStatus.pid ?? 'N/A'}) ma non risponde sulla porta ${port}. Controllare i log: ${bridgeLogDir}`,
                        bridgePid: bridgeStatus.pid,
                        bridgeRunning: bridgeStatus.running,
                        checkedPorts: FALLBACK_PORTS,
                    }
                }
                // ECONNREFUSED → try next port
            }
        }

        return { ok: false, status: 'Bridge non raggiungibile su nessuna porta', checkedPorts: FALLBACK_PORTS }
    })

    /** Fetch device configuration diagnostics from the bridge /status endpoint. */
    ipcMain.handle('bridge:testDeviceConfig', async () => {
        try {
            const res = await fetch(`http://127.0.0.1:${BRIDGE_PORT}/status`, {
                signal: AbortSignal.timeout(3000),
            })
            if (res.ok) {
                const data = await res.json() as {
                    devices?: Array<{
                        type: string
                        displayName: string
                        enabled: boolean
                        executableExists: boolean
                        inputDirExists: boolean
                        outputDirExists: boolean
                        pdfDirExists: boolean
                    }>
                }
                return { ok: true, devices: data.devices ?? [] }
            }
            return { ok: false, error: 'Bridge ha risposto con errore' }
        } catch {
            return { ok: false, error: 'Bridge non raggiungibile' }
        }
    })

    /**
     * Start an examination via bridge HTTP API.
     * params.tipo: 'SPIROMETRIA' | 'AUDIOMETRIA' | 'ECG'
     * params.patientData: { nome, cognome, dataNascita, codiceStruttura? }
     * params.visitaId: local visit UUID
     * params.sessionId: unique session UUID for callback matching
     */
    ipcMain.handle('bridge:startExam', async (_event, params: {
        tipo: string
        patientData: Record<string, string>
        visitaId: string
        sessionId: string
        tenantId?: string
    }) => {
        const { tipo, patientData, visitaId, sessionId } = params
        if (!tipo || !patientData || !visitaId || !sessionId) {
            throw new Error('Parametri avvio esame non validi')
        }

        const examTypeMap: Record<string, string> = {
            ECG: 'ecg',
            SPIROMETRIA: 'spirometry',
            AUDIOMETRIA: 'audiometry',
            DRUG_TEST: 'drugtest',
        }
        const bridgeExamType = examTypeMap[tipo] || tipo
        const genderMap: Record<string, 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED'> = {
            MALE: 'MALE',
            FEMALE: 'FEMALE',
            M: 'MALE',
            F: 'FEMALE',
            MASCHIO: 'MALE',
            FEMMINA: 'FEMALE',
        }
        const parseOptionalNumber = (value: string | undefined): number | undefined => {
            if (!value) return undefined
            const parsed = Number(String(value).replace(',', '.'))
            return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
        }
        const tenantId = params.tenantId || patientData.tenantId || currentTenantId || ''
        if (!tenantId) {
            throw new Error('Tenant non disponibile per avvio esame')
        }

        const url = `http://127.0.0.1:${BRIDGE_PORT}/start-exam`
        const body = {
            visitaId,
            examType: bridgeExamType,
            tenantId,
            patient: {
                patientId: String(patientData.patientId || patientData.personId || ''),
                firstName: String(patientData.nome || patientData.firstName || ''),
                lastName: String(patientData.cognome || patientData.lastName || ''),
                dateOfBirth: String(patientData.dataNascita || patientData.birthDate || '').split('T')[0],
                gender: genderMap[String(patientData.gender || patientData.sesso || '').toUpperCase()] || 'NOT_SPECIFIED',
                taxCode: String(patientData.codiceFiscale || patientData.taxCode || ''),
                heightCm: parseOptionalNumber(patientData.altezza || patientData.heightCm),
                weightKg: parseOptionalNumber(patientData.peso || patientData.weightKg),
                ethnicity: String(patientData.etnia || patientData.ethnicity || ''),
            },
            metadata: {
                desktopSessionId: sessionId,
                requestedTipo: tipo,
            },
        }

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Bridge-Api-Key': BRIDGE_CALLBACK_TOKEN,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(10000),
        })

        if (!resp.ok) {
            const txt = await resp.text().catch(() => '')
            throw new Error(`Bridge error ${resp.status}: ${txt}`)
        }

        const result = await resp.json() as Record<string, unknown>
        return result
    })

    // ── Forward bridge exam results to renderer ──────────────────
    bridgeEvents.on('examResult', (data: BridgeExamResult) => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
            if (win.isMinimized()) win.restore()
            win.show()
            win.focus()
            win.webContents.send('bridge:examResult', data)
        }
        // Native notification for exam result
        sendNotification({
            event: 'bridge-exam-result',
            detail: data.deviceName ?? data.tipo,
        })
    })
}

// ========== VALIDATION HELPERS ==========

const VALID_TABLES = new Set([
    'visits', 'appointments', 'appointment_prestazioni',
    'patients', 'companies', 'company_sites', 'nomine_ruolo',
    'mansioni', 'mansione_rischi', 'lavoratore_mansioni', 'protocolli', 'protocollo_prestazioni',
    'scadenze', 'giudizi_idoneita', 'movimenti_contabili',
    'prestazioni', 'tariffari', 'convenzioni', 'ambulatori', 'slot_disponibilita', 'medici',
    'visit_templates', 'document_templates', 'questionari_medici_config', 'esami_strumentali', 'allegati',
    'documenti_compilati', 'questionari_risposte',
    'profili_salute', 'documenti_clinici', 'person_documents', 'referti',
    'visit_revisions', 'visit_access_logs', 'firme_digitali',
    'lavoratore_rischi_aggiuntivi',
    'tariffario_voci', 'tariffario_company_associations', 'sopralluoghi', 'dvr', 'consulenze_mdl', 'allegati_3b',
    'operations_queue', 'sync_log'
])

function validateTableName(table: string): void {
    if (!VALID_TABLES.has(table)) {
        throw new Error(`Tabella non valida: ${table}`)
    }
}

function isValidColumnName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
}

function validateData(data: unknown): void {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Dati non validi')
    }
}
