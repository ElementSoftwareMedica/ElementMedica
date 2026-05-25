/**
 * E2E — Desktop MDL local workflow
 *
 * Verifies the real Electron IPC + SQLite layer used by the offline-first
 * appointment/visit pages. This catches native DB, tenant scope and sync queue
 * regressions without requiring a production login/license in the test runner.
 */

import { test, expect } from './electron-fixture'
import { formatProtocolloPeriodicity, parseProtocolloPrestazioni } from '../src/renderer/utils/protocolloSanitario'

const TENANT_ID = 'tenant-e2e-mdl'

async function insertAppointment(page: import('playwright').Page, id: string, stato = 'PRENOTATO'): Promise<void> {
    await page.evaluate(async ({ tenantId, id, stato }) => {
        await window.desktopApi.tenant.set(tenantId)
        await window.desktopApi.db.insert({
            table: 'appointments',
            data: {
                id,
                tenantId,
                dataOra: new Date().toISOString(),
                durataPrevista: 30,
                stato,
                personId: `person-${id}`,
                personFirstName: 'Mario',
                personLastName: 'Rossi',
                personTaxCode: 'RSSMRA80A01H501U',
                medicoId: `medico-${id}`,
                medicoFirstName: 'Laura',
                medicoLastName: 'Bianchi',
                ambulatorioId: `amb-${id}`,
                prestazioneId: `prest-${id}`,
                companyName: 'Azienda E2E',
                prestazioneNome: 'Visita medica del lavoro',
                prestazioneCodice: 'VIS_MDL',
                tipo: 'PERIODICA',
                note: 'Appuntamento E2E'
            }
        })
    }, { tenantId: TENANT_ID, id, stato })
}

test.describe('Desktop MDL appointment and visit local flow', () => {
    test('normalizes protocol prestazioni without undefined periodicity labels', async () => {
        const raw = JSON.stringify([
            { prestazione: { id: 'prest-1', nome: 'Audiometria' }, periodicita: 'MESI_12', isObbligatoria: true },
            { prestazioneNome: 'Spirometria', periodicitaCustomMesi: 24, obbligatoria: false },
            { nomePrestazione: 'ECG', periodicita: null }
        ])

        const prestazioni = parseProtocolloPrestazioni(raw)

        expect(prestazioni.map(p => p.prestazioneNome)).toEqual(['Audiometria', 'Spirometria', 'ECG'])
        expect(prestazioni.map(p => formatProtocolloPeriodicity(p.periodicitaMesi))).toEqual([
            'ogni 1 anno',
            'ogni 2 anni',
            'su indicazione'
        ])
        expect(prestazioni.map(p => formatProtocolloPeriodicity(p.periodicitaMesi)).join(' ')).not.toContain('undefined')
    })

    test('keeps no-show visible and creates a visit with sync operations', async ({ page }) => {
        await expect(page.locator('body')).toBeVisible({ timeout: 12000 })

        const noShowId = `appt-noshow-${Date.now()}`
        await insertAppointment(page, noShowId)

        const noShowResult = await page.evaluate(async ({ id }) => {
            await window.desktopApi.db.update({
                table: 'appointments',
                id,
                data: { stato: 'NO_SHOW' }
            })
            await window.desktopApi.sync.enqueue({
                type: 'UPDATE',
                entity: 'appointments',
                entityId: id,
                localId: id,
                payload: { stato: 'NO_SHOW' }
            })
            const rows = await window.desktopApi.db.query({ table: 'appointments', where: { id }, limit: 1 })
            return rows[0] as { stato: string; _isDeleted: number }
        }, { id: noShowId })

        expect(noShowResult.stato).toBe('NO_SHOW')
        expect(noShowResult._isDeleted).toBe(0)

        const visitAppointmentId = `appt-visit-${Date.now()}`
        await insertAppointment(page, visitAppointmentId)

        const visitResult = await page.evaluate(async ({ appointmentId }) => {
            const appointments = await window.desktopApi.db.query({
                table: 'appointments',
                where: { id: appointmentId, _isDeleted: 0 },
                limit: 1
            }) as Array<Record<string, unknown>>
            const appointment = appointments[0]
            const now = new Date().toISOString()
            const visitInsert = await window.desktopApi.db.insert({
                table: 'visits',
                data: {
                    tenantId: appointment.tenantId,
                    personId: appointment.personId,
                    appuntamentoId: appointment.id,
                    medicoId: appointment.medicoId,
                    ambulatorioId: appointment.ambulatorioId,
                    stato: 'IN_CORSO',
                    tipo: appointment.tipo,
                    tipoVisitaMDL: appointment.tipo,
                    dataOra: appointment.dataOra,
                    dataInizio: now,
                    datiStrutturati: '{}',
                    isMDL: 1,
                    personFirstName: appointment.personFirstName,
                    personLastName: appointment.personLastName,
                    personTaxCode: appointment.personTaxCode,
                    medicoFirstName: appointment.medicoFirstName,
                    medicoLastName: appointment.medicoLastName,
                    companyName: appointment.companyName,
                    prestazioneNome: appointment.prestazioneNome,
                    prestazioneCodice: appointment.prestazioneCodice,
                    createdAt: now,
                    updatedAt: now
                }
            }) as { id: string; _localId: string }

            await window.desktopApi.sync.enqueue({
                type: 'CREATE',
                entity: 'visits',
                entityId: visitInsert.id,
                localId: visitInsert._localId,
                payload: {
                    tenantId: appointment.tenantId,
                    pazienteId: appointment.personId,
                    appuntamentoId: appointment.id,
                    medicoId: appointment.medicoId,
                    ambulatorioId: appointment.ambulatorioId,
                    prestazioneId: appointment.prestazioneId || null,
                    tipoVisitaMDL: appointment.tipo || null,
                    stato: 'IN_CORSO',
                    dataOra: appointment.dataOra
                }
            })

            await window.desktopApi.db.update({
                table: 'appointments',
                id: appointmentId,
                data: { stato: 'IN_CORSO' }
            })

            const visits = await window.desktopApi.db.query({
                table: 'visits',
                where: { appuntamentoId: appointmentId, _isDeleted: 0 },
                limit: 1
            })
            const pendingOps = await window.desktopApi.sync.getPendingOperations() as Array<{ entity: string; type: string; payload: Record<string, unknown> }>
            return { visit: visits[0] as { stato: string; appuntamentoId: string }, pendingOps }
        }, { appointmentId: visitAppointmentId })

        expect(visitResult.visit.appuntamentoId).toBe(visitAppointmentId)
        expect(visitResult.visit.stato).toBe('IN_CORSO')
        expect(visitResult.pendingOps.some(op => op.entity === 'visits' && op.type === 'CREATE')).toBeTruthy()
        expect(visitResult.pendingOps.some(op => op.entity === 'appointments' && op.payload.stato === 'NO_SHOW')).toBeTruthy()
    })
})
