import { useState, useEffect, useCallback } from 'react'
import { Paperclip, Plus, Trash2, ChevronDown, ChevronRight, File, FileText, Image, FileSpreadsheet, X } from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface Allegato {
  id: string
  _localId: string
  nome: string
  tipo: string | null
  dimensione: number | null
  localPath: string | null
  serverUrl: string | null
}

const TIPOLOGIE_CLINICHE = [
  { value: 'ECG', label: 'ECG' },
  { value: 'SPIROMETRIA', label: 'Spirometria' },
  { value: 'AUDIOMETRIA', label: 'Audiometria' },
  { value: 'ESAMI_SANGUE', label: 'Esami del sangue' },
  { value: 'TEST_DROGA', label: 'Drug Test' },
  { value: 'ALCOL_TEST', label: 'Alcol Test' },
  { value: 'RADIOGRAFIA', label: 'Radiografia' },
  { value: 'ECOGRAFIA', label: 'Ecografia' },
  { value: 'VISITA', label: 'Visita medica' },
  { value: 'CERTIFICATO', label: 'Certificato' },
  { value: 'ALTRO', label: 'Altro' },
]

const FILE_ICONS: Record<string, typeof File> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  rtf: FileText,
  jpg: Image,
  jpeg: Image,
  png: Image,
  gif: Image,
  bmp: Image,
  tiff: Image,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================================
// Component
// ============================================================

interface Props {
  visitId: string
  tenantId: string
  isReadOnly: boolean
  defaultExpanded?: boolean
}

interface PendingUpload {
  sourcePath: string
  tipologiaClinica: string
  dataEsecuzione: string
}

export function AllegatiCard({ visitId, tenantId, isReadOnly, defaultExpanded = false }: Props): JSX.Element {
  const [allegati, setAllegati] = useState<Allegato[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isUploading, setIsUploading] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)
  const [modalTipologia, setModalTipologia] = useState('')
  const [modalData, setModalData] = useState(new Date().toISOString().split('T')[0])

  // ----------------------------------------------------------
  // Load allegati from SQLite
  // ----------------------------------------------------------

  const loadAllegati = useCallback(async () => {
    if (!window.desktopApi) return
    try {
      const rows = await window.desktopApi.db.query({
        table: 'allegati',
        where: { visitaId: visitId, _isDeleted: 0 },
        orderBy: { column: 'createdAt', direction: 'DESC' }
      }) as Allegato[]
      setAllegati(rows)
    } catch {
      setAllegati([])
    } finally {
      setLoading(false)
    }
  }, [visitId])

  useEffect(() => { loadAllegati() }, [loadAllegati])

  // ----------------------------------------------------------
  // Add file
  // ----------------------------------------------------------

  const handleAddFile = useCallback(async () => {
    if (!window.desktopApi || isUploading) return

    const result = await window.desktopApi.dialog.openFile()
    if (result.canceled || !result.filePaths.length) return

    setModalTipologia('')
    setModalData(new Date().toISOString().split('T')[0])
    setPendingUpload({ sourcePath: result.filePaths[0], tipologiaClinica: '', dataEsecuzione: new Date().toISOString().split('T')[0] })
  }, [isUploading])

  const handleConfirmUpload = useCallback(async () => {
    if (!window.desktopApi || !pendingUpload) return

    setIsUploading(true)
    setPendingUpload(null)
    try {
      const fileInfo = await window.desktopApi.file.copyToAppData({
        sourcePath: pendingUpload.sourcePath,
        visitaId: visitId
      })

      const now = new Date().toISOString()
      await window.desktopApi.db.insert({
        table: 'allegati',
        data: {
          tenantId,
          visitaId: visitId,
          nome: fileInfo.nome,
          tipo: fileInfo.tipo,
          dimensione: fileInfo.dimensione,
          localPath: fileInfo.localPath,
          serverUrl: null,
          tipologiaClinica: modalTipologia || null,
          dataEsecuzione: modalData || null,
          createdAt: now,
          updatedAt: now,
        }
      })

      await loadAllegati()
    } finally {
      setIsUploading(false)
    }
  }, [pendingUpload, visitId, tenantId, modalTipologia, modalData, loadAllegati])

  // ----------------------------------------------------------
  // Delete file
  // ----------------------------------------------------------

  const handleDelete = useCallback(async (id: string) => {
    if (!window.desktopApi) return

    await window.desktopApi.db.softDelete({ table: 'allegati', id })

    await window.desktopApi.sync.enqueue({
      type: 'DELETE',
      entity: 'allegato',
      entityId: id,
      payload: {}
    })

    setAllegati(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleOpen = useCallback(async (allegato: Allegato) => {
    setOpenError(null)
    try {
      if (allegato.localPath) {
        await window.desktopApi.file.openLocalFile(allegato.localPath)
        return
      }
      if (allegato.serverUrl) {
        const url = allegato.serverUrl.startsWith('http') ? allegato.serverUrl : `https://www.elementmedica.com${allegato.serverUrl}`
        await window.desktopApi.app.openExternal(url)
        return
      }
      setOpenError('Documento non disponibile')
    } catch {
      setOpenError('Impossibile aprire il documento')
    }
  }, [])

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
      {/* Metadata modal shown after file selection */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Informazioni documento</h3>
              <button onClick={() => setPendingUpload(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipologia clinica</label>
                <select
                  value={modalTipologia}
                  onChange={e => setModalTipologia(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">— Nessuna —</option>
                  {TIPOLOGIE_CLINICHE.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data esecuzione</label>
                <input
                  type="date"
                  value={modalData}
                  onChange={e => setModalData(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingUpload(null)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={() => { void handleConfirmUpload() }}
                className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-gray-900 font-heading">Allegati</span>
          {allegati.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
              {allegati.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-2">Caricamento...</p>
          ) : (
            <>
              {/* File list */}
              {allegati.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Nessun allegato</p>
              ) : (
                <div className="space-y-2">
                  {openError && <p className="rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-600">{openError}</p>}
                  {allegati.map(allegato => {
                    const IconCmp = FILE_ICONS[allegato.tipo || ''] || File
                    return (
                      <div key={allegato.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                        <IconCmp className="w-4 h-4 text-gray-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{allegato.nome}</p>
                          <p className="text-[10px] text-gray-400">
                            {allegato.tipo?.toUpperCase()} · {formatFileSize(allegato.dimensione)}
                          </p>
                        </div>
                        {(allegato.localPath || allegato.serverUrl) && (
                          <button
                            onClick={() => { void handleOpen(allegato) }}
                            className="px-2 py-1 text-[10px] font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
                            title="Apri documento"
                          >
                            Apri
                          </button>
                        )}
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDelete(allegato.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                            title="Rimuovi allegato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add button */}
              {!isReadOnly && (
                <button
                  onClick={handleAddFile}
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-500 hover:text-teal-600 hover:border-teal-300 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <span className="animate-pulse">Caricamento...</span>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Aggiungi file
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
