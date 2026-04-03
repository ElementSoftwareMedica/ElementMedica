/**
 * CSV Export utility for offline data.
 * Supports exporting visits, patients, and companies from local SQLite.
 */

type ExportEntity = 'visits' | 'patients' | 'companies'

interface ExportConfig {
  entity: ExportEntity
  columns: { key: string; label: string }[]
}

const EXPORT_CONFIGS: Record<ExportEntity, ExportConfig> = {
  visits: {
    entity: 'visits',
    columns: [
      { key: 'visitDate', label: 'Data Visita' },
      { key: 'patientName', label: 'Lavoratore' },
      { key: 'visitType', label: 'Tipo Visita' },
      { key: 'tipoVisitaMDL', label: 'Tipo MDL' },
      { key: 'motivoVisita', label: 'Motivo' },
      { key: 'status', label: 'Stato' },
      { key: 'durataMinuti', label: 'Durata (min)' },
      { key: 'totaleCosto', label: 'Costo Totale' }
    ]
  },
  patients: {
    entity: 'patients',
    columns: [
      { key: 'lastName', label: 'Cognome' },
      { key: 'firstName', label: 'Nome' },
      { key: 'taxCode', label: 'Codice Fiscale' },
      { key: 'birthDate', label: 'Data Nascita' },
      { key: 'gender', label: 'Sesso' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Telefono' },
      { key: 'companyName', label: 'Azienda' },
      { key: 'residenceCity', label: 'Città' }
    ]
  },
  companies: {
    entity: 'companies',
    columns: [
      { key: 'ragioneSociale', label: 'Ragione Sociale' },
      { key: 'piva', label: 'P.IVA' },
      { key: 'codiceFiscale', label: 'Codice Fiscale' },
      { key: 'codiceAteco', label: 'ATECO' },
      { key: 'settore', label: 'Settore' },
      { key: 'sedeLegaleCitta', label: 'Città' },
      { key: 'emailGenerale', label: 'Email' },
      { key: 'telefonoGenerale', label: 'Telefono' },
      { key: 'status', label: 'Stato' }
    ]
  }
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function exportToCSV(entity: ExportEntity): Promise<void> {
  if (!window.desktopApi) return

  const config = EXPORT_CONFIGS[entity]

  const rows = await window.desktopApi.db.query({
    table: config.entity,
    where: { _isDeleted: 0 }
  }) as Record<string, unknown>[]

  // Build CSV
  const header = config.columns.map(c => c.label).join(',')
  const dataRows = rows.map(row =>
    config.columns.map(c => escapeCSV(row[c.key])).join(',')
  )

  const csv = [header, ...dataRows].join('\n')

  // Download via Blob
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${entity}_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
