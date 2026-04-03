import { ipcMain, app, dialog, BrowserWindow } from 'electron'
import { getDatabase } from './database'
import { encryptRecord, decryptRecord } from './crypto'
import { getMachineId, getMachineName } from './fingerprint'
import { v4 as uuidv4 } from 'uuid'
import { copyFileSync, mkdirSync, statSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'

/**
 * IPC Handlers — Main Process
 * Ogni handler valida gli input prima di operare su SQLite (security)
 */
export function setupIpcHandlers(): void {
  // ========== DATABASE OPERATIONS ==========

  ipcMain.handle('db:query', async (_event, { table, where, orderBy, limit }) => {
    validateTableName(table)
    const db = getDatabase()
    let sql = `SELECT * FROM ${table}`
    const params: unknown[] = []

    if (where && typeof where === 'object') {
      const conditions = Object.entries(where)
        .filter(([key]) => isValidColumnName(key))
        .map(([key], idx) => {
          params.push(where[key])
          return `"${key}" = ?${idx + 1}`
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
      _isDeleted: false
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
    const updateData = encryptRecord(table, {
      ...data,
      _syncStatus: 'PENDING',
      _localUpdatedAt: now,
      _version: (data._version || 0) + 1
    })

    const columns = Object.keys(updateData).filter(isValidColumnName)
    const setClauses = columns.map(col => `"${col}" = ?`)
    const values = [...columns.map(col => updateData[col]), id]

    const sql = `UPDATE "${table}" SET ${setClauses.join(', ')} WHERE id = ?`
    db.prepare(sql).run(...values)

    return { success: true }
  })

  ipcMain.handle('db:softDelete', async (_event, { table, id }) => {
    validateTableName(table)
    if (!id || typeof id !== 'string') throw new Error('ID invalido')

    const db = getDatabase()
    const now = new Date().toISOString()
    const sql = `UPDATE "${table}" SET "_isDeleted" = 1, "_syncStatus" = 'PENDING', "_localUpdatedAt" = ? WHERE id = ?`
    db.prepare(sql).run(now, id)

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
      _isDeleted: false,
      _version: 1
    }

    // ---- Helper: insert or replace rows in a table ----
    const bulkUpsert = (table: string, records: Record<string, unknown>[]) => {
      if (!records || records.length === 0) return
      validateTableName(table)

      const transaction = db.transaction((items: Record<string, unknown>[]) => {
        for (const item of items) {
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
      })

      transaction(records)
    }

    // ---- 1. Build company lookup map FIRST (needed by patients for companyName) ----
    const companyMap = new Map<string, Record<string, unknown>>()
    if (data.aziende && Array.isArray(data.aziende)) {
      const flatCompanies: Record<string, unknown>[] = []
      const flatSites: Record<string, unknown>[] = []

      for (const ctp of data.aziende) {
        const c = ctp.company || {}
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
    if (data.visiteEsistenti && Array.isArray(data.visiteEsistenti)) {
      const flatVisite: Record<string, unknown>[] = []
      for (const v of data.visiteEsistenti) {
        const patient = patientMap.get(v.pazienteId)

        flatVisite.push({
          id: v.id,
          tenantId: v.tenantId,
          personId: v.pazienteId,
          appuntamentoId: v.appuntamentoId,
          medicoId: v.medicoId,
          ambulatorioId: v.ambulatorioId,
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
          companyName: null,
          prestazioneNome: null,
          prestazioneCodice: null,
          isMDL: v.tipoVisitaMDL ? 1 : 0,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt
        })
      }
      bulkUpsert('visits', flatVisite)
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
          nome: m.nome,
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
          mansione: mansione?.nome as string || null,
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
        personId: g.personId,
        visitaId: g.visitaId,
        medicoId: g.medicoId,
        tipo: g.tipo,
        esito: g.esito,
        limitazioni: g.limitazioni,
        prescrizioni: g.prescrizioni,
        dataEmissione: g.dataEmissione,
        dataScadenza: g.dataScadenza,
        note: g.note,
        firmaMedico: g.firmaMedico,
        protocolloNumero: g.protocolloNumero,
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
        personId: mc.personId,
        companyTenantProfileId: mc.companyTenantProfileId,
        tipo: mc.tipo,
        descrizione: mc.descrizione,
        importo: mc.importo,
        iva: mc.iva,
        importoNetto: mc.importoNetto,
        stato: mc.stato,
        dataMovimento: mc.dataMovimento,
        dataScadenza: mc.dataScadenza,
        dataPagamento: mc.dataPagamento,
        metodoPagamento: mc.metodoPagamento,
        riferimentoFattura: mc.riferimentoFattura,
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

    // ---- 13. Update sync state ----
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
        visits: data.visiteEsistenti?.length || 0,
        companies: data.aziende?.length || 0,
        prestazioni: data.prestazioni?.length || 0,
        ambulatori: data.ambulatori?.length || 0,
        mansioni: data.mansioni?.length || 0,
        scadenze: data.scadenze?.length || 0,
        rischiAggiuntivi: data.rischiAggiuntivi?.length || 0
      }
    }
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
    return { success: true }
  })

  ipcMain.handle('rischi:remove', async (_event, { id }: { id: string }) => {
    if (!id || typeof id !== 'string') throw new Error('id richiesto')
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare(
      `UPDATE lavoratore_rischi_aggiuntivi SET "_isDeleted" = 1, "_syncStatus" = 'PENDING', "_localUpdatedAt" = ? WHERE id = ?`
    ).run(now, id)
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

  ipcMain.handle('file:copyToAppData', async (_event, { sourcePath, visitaId }: { sourcePath: string; visitaId: string }) => {
    if (!sourcePath || typeof sourcePath !== 'string') throw new Error('Percorso sorgente non valido')
    if (!visitaId || typeof visitaId !== 'string') throw new Error('ID visita non valido')
    if (!existsSync(sourcePath)) throw new Error('File sorgente non trovato')

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

  // ========== UPDATER ACTIONS ==========

  ipcMain.handle('updater:downloadUpdate', async () => {
    const { autoUpdater } = await import('electron-updater')
    await autoUpdater.downloadUpdate()
    return { success: true }
  })

  ipcMain.handle('updater:installUpdate', async () => {
    const { autoUpdater } = await import('electron-updater')
    autoUpdater.quitAndInstall(false, true)
    return { success: true }
  })

  // ========== NATIVE NOTIFICATIONS ==========

  ipcMain.handle('app:showNotification', async (_event, { title, body }: { title: string; body: string }) => {
    const { Notification } = await import('electron')
    if (Notification.isSupported()) {
      const notification = new Notification({ title, body })
      notification.show()
      notification.on('click', () => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) win.show()
      })
    }
    return { success: true }
  })

  // ========== LICENSE ==========

  ipcMain.handle('license:getMachineId', async () => {
    return getMachineId()
  })

  ipcMain.handle('license:getMachineName', async () => {
    return getMachineName()
  })

  ipcMain.handle('license:getInfo', async () => {
    const db = getDatabase()
    const row = db.prepare(`SELECT value FROM sync_state WHERE key = 'licenseInfo'`).get() as { value: string } | undefined
    if (!row) return null
    try {
      return JSON.parse(row.value)
    } catch {
      return null
    }
  })

  ipcMain.handle('license:storeInfo', async (_event, info: Record<string, unknown>) => {
    if (!info || typeof info !== 'object') throw new Error('Dati licenza non validi')
    const db = getDatabase()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT OR REPLACE INTO sync_state (key, value, updatedAt) VALUES (?, ?, ?)`
    ).run('licenseInfo', JSON.stringify({ ...info, lastHeartbeatAt: now }), now)
    return { success: true }
  })
}

// ========== VALIDATION HELPERS ==========

const VALID_TABLES = new Set([
  'visits', 'appointments', 'appointment_prestazioni',
  'patients', 'companies', 'company_sites',
  'mansioni', 'lavoratore_mansioni', 'protocolli',
  'scadenze', 'giudizi_idoneita', 'movimenti_contabili',
  'prestazioni', 'tariffari', 'convenzioni', 'ambulatori',
  'visit_templates', 'esami_strumentali', 'allegati',
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
