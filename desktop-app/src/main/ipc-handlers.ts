import { ipcMain, app, dialog, BrowserWindow, Tray, safeStorage, shell } from 'electron'
import { getDatabase } from './database'
import { encryptRecord, decryptRecord } from './crypto'
import { getMachineId, getMachineName } from './fingerprint'
import { v4 as uuidv4 } from 'uuid'
import { copyFileSync, mkdirSync, statSync, existsSync, appendFileSync, readFileSync, writeFileSync } from 'fs'
import { join, basename, extname } from 'path'
import { startBridge, stopBridge, getBridgeStatus, BRIDGE_PORT } from './bridge-process'
import { bridgeEvents } from './bridge-callback-server'
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
    'patients', 'companies',
    'mansioni', 'lavoratore_mansioni', 'protocolli',
    'scadenze', 'giudizi_idoneita', 'movimenti_contabili',
    'prestazioni', 'tariffari', 'convenzioni', 'ambulatori',
    'visit_templates', 'document_templates', 'esami_strumentali', 'allegati',
    'questionari_compilati', 'lavoratore_rischi_aggiuntivi'
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
        const PII_TABLES = new Set(['patients', 'visits', 'giudizi_idoneita', 'esami_strumentali', 'allegati', 'questionari_compilati'])
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
        validateTableName(table)
        if (!localId || typeof localId !== 'string') throw new Error('localId invalido')
        if (!serverId || typeof serverId !== 'string') throw new Error('serverId invalido')

        const db = getDatabase()

        // Update the local record with the server-assigned ID
        db.prepare(
            `UPDATE "${table}" SET _serverId = ?, _syncStatus = 'SYNCED' WHERE id = ?`
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

        // Run all data insertions atomically in a single SQLite transaction
        const result = db.transaction((): Record<string, unknown> => {

            // ---- 1. Build company lookup map FIRST (needed by patients for companyName) ----
            const companyMap = new Map<string, Record<string, unknown>>()
            if (data.aziende && Array.isArray(data.aziende)) {
                const flatCompanies: Record<string, unknown>[] = []
                const flatSites: Record<string, unknown>[] = []

                for (const ctp of data.aziende) {
                    const c = ctp.company || {}
                    const nomine = Array.isArray(ctp.nomine) ? ctp.nomine : []
                    const mcNomina = nomine.find((n: Record<string, unknown>) => n.tipoRuolo === 'MEDICO_COMPETENTE')
                    const coordinatedNomine = nomine.filter((n: Record<string, unknown>) => n.tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO')
                    const mainMc = mcNomina?.person || ctp.medicoCompetente
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
                        mediciCoordinati: JSON.stringify(
                            ctp.mediciCoordinati ||
                            ctp.mediciCompetentiCoordinati ||
                            coordinatedNomine.map((n: Record<string, unknown>) => ({
                                id: n.personId,
                                personId: n.personId,
                                medicoId: n.personId,
                                firstName: (n.person as Record<string, unknown> | undefined)?.firstName,
                                lastName: (n.person as Record<string, unknown> | undefined)?.lastName,
                                nome: [(n.person as Record<string, unknown> | undefined)?.firstName, (n.person as Record<string, unknown> | undefined)?.lastName].filter(Boolean).join(' '),
                            }))
                        ),
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
                                createdAt: site.createdAt,
                                updatedAt: site.updatedAt
                            })
                        }
                    }
                }
                bulkUpsert('companies', flatCompanies)
                if (flatSites.length > 0) bulkUpsert('company_sites', flatSites)
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

            // ---- 7. Store mansioni (rischiAssociati → JSON, denormalize companyName) ----
            if (data.mansioni && Array.isArray(data.mansioni)) {
                const flat = data.mansioni.map((m: Record<string, unknown>) => {
                    const companyId = m.companyTenantProfileId as string
                    const company = companyId ? companyMap.get(companyId) : null
                    const rischiJson = JSON.stringify(m.rischiAssociati || [])
                    return {
                        id: m.id,
                        tenantId: m.tenantId || data.meta?.tenantId || '',
                        // Backend Prisma model uses `denominazione`; local SQLite uses `nome`
                        nome: (m.denominazione || m.nome) as string,
                        descrizione: m.descrizione,
                        codice: m.codice,
                        companyTenantProfileId: m.companyTenantProfileId,
                        siteId: m.siteId,
                        rischiAssociati: rischiJson,
                        rischi: rischiJson,
                        companyName: company?.ragioneSociale as string || null,
                        isActive: m.isActive !== undefined ? (m.isActive ? 1 : 0) : 1,
                        createdAt: m.createdAt,
                        updatedAt: m.updatedAt
                    }
                })
                bulkUpsert('mansioni', flat)
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
                    prestazioni: typeof p.prestazioni === 'string' ? p.prestazioni : JSON.stringify(p.prestazioni || []),
                    mansioneNome: p.mansioneNome,
                    // Backend uses `isAttivo`; local SQLite uses `isActive`
                    isActive: p.isAttivo != null ? (p.isAttivo ? 1 : 0) : (p.isActive != null ? (p.isActive ? 1 : 0) : 1),
                    createdAt: p.createdAt,
                    updatedAt: p.updatedAt
                }))
                bulkUpsert('protocolli', flat)
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
                    campi: typeof t.campi === 'string' ? t.campi : JSON.stringify(t.campi || []),
                    contenutoHtml: t.contenutoHtml,
                    richiedeFirma: t.richiedeFirma ? 1 : 0,
                    questionarioConfig: typeof t.questionarioConfig === 'string' ? t.questionarioConfig : JSON.stringify(t.questionarioConfig || {}),
                    isActive: t.isActive !== undefined ? (t.isActive ? 1 : 0) : 1,
                    ordine: t.ordine || 0,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                }))
                bulkUpsert('document_templates', flat)
            }

            // ---- 16. Store tariffari aziendali (voci e associazioni come JSON) ----
            if (data.tariffari && Array.isArray(data.tariffari)) {
                const flat = data.tariffari.map((t: Record<string, unknown>) => ({
                    id: t.id,
                    tenantId: t.tenantId || data.meta?.tenantId || '',
                    codice: t.codice,
                    nome: t.nome,
                    descrizione: t.descrizione,
                    attivo: t.attivo != null ? (t.attivo ? 1 : 0) : 1,
                    validoDa: t.validoDa,
                    validoA: t.validoA,
                    voci: typeof t.voci === 'string' ? t.voci : JSON.stringify(t.voci || []),
                    companyAssociations: typeof t.companyAssociations === 'string' ? t.companyAssociations : JSON.stringify(t.companyAssociations || []),
                    isDefault: t.isDefault != null ? (t.isDefault ? 1 : 0) : 0,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                }))
                bulkUpsert('tariffari', flat)
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
                    mansioni: data.mansioni?.length || 0,
                    scadenze: data.scadenze?.length || 0,
                    rischiAggiuntivi: data.rischiAggiuntivi?.length || 0,
                    protocolli: data.protocolli?.length || 0,
                    visitTemplates: data.visitTemplates?.length || 0,
                    documentTemplates: data.documentTemplates?.length || 0,
                    tariffari: data.tariffari?.length || 0,
                    convenzioni: data.convenzioni?.length || 0
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
            id, personId, tenantId,
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

    ipcMain.handle('file:getPendingAttachments', async () => {
        const db = getDatabase()
        const rows = db.prepare(
            `SELECT id, visitaId, nome, tipo, dimensione, localPath, tenantId FROM allegati
       WHERE localPath IS NOT NULL AND (serverUrl IS NULL OR serverUrl = '') AND _isDeleted = 0`
        ).all() as Array<{ id: string; visitaId: string | null; nome: string; tipo: string | null; dimensione: number | null; localPath: string; tenantId: string }>
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
    }) => {
        const { tipo, patientData, visitaId, sessionId } = params
        if (!tipo || !patientData || !visitaId || !sessionId) {
            throw new Error('Parametri avvio esame non validi')
        }

        const url = `http://127.0.0.1:${BRIDGE_PORT}/start-exam`
        const body = {
            sessionId,
            visitaId,
            examType: tipo,
            patient: {
                nome: String(patientData.nome || ''),
                cognome: String(patientData.cognome || ''),
                dataNascita: String(patientData.dataNascita || ''),
                codiceStruttura: String(patientData.codiceStruttura || ''),
            }
        }

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
    'patients', 'companies', 'company_sites',
    'mansioni', 'lavoratore_mansioni', 'protocolli',
    'scadenze', 'giudizi_idoneita', 'movimenti_contabili',
    'prestazioni', 'tariffari', 'convenzioni', 'ambulatori',
    'visit_templates', 'document_templates', 'esami_strumentali', 'allegati',
    'questionari_compilati', 'lavoratore_rischi_aggiuntivi',
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
