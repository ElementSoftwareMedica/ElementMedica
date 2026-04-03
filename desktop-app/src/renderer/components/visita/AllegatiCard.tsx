import { useState, useEffect, useCallback } from 'react'
import { Paperclip, Plus, Trash2, ChevronDown, ChevronRight, File, FileText, Image, FileSpreadsheet } from 'lucide-react'

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
}

export function AllegatiCard({ visitId, tenantId, isReadOnly }: Props): JSX.Element {
  const [allegati, setAllegati] = useState<Allegato[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

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

    setIsUploading(true)
    try {
      const sourcePath = result.filePaths[0]
      const fileInfo = await window.desktopApi.file.copyToAppData({
        sourcePath,
        visitaId: visitId
      })

      const now = new Date().toISOString()
      const { id } = await window.desktopApi.db.insert({
        table: 'allegati',
        data: {
          tenantId,
          visitaId: visitId,
          nome: fileInfo.nome,
          tipo: fileInfo.tipo,
          dimensione: fileInfo.dimensione,
          localPath: fileInfo.localPath,
          serverUrl: null,
          createdAt: now,
          updatedAt: now,
        }
      })

      await window.desktopApi.sync.enqueue({
        type: 'CREATE',
        entity: 'allegato',
        entityId: id,
        payload: {
          tenantId,
          visitaId: visitId,
          nome: fileInfo.nome,
          tipo: fileInfo.tipo,
          dimensione: fileInfo.dimensione,
          localPath: fileInfo.localPath,
        }
      })

      await loadAllegati()
    } finally {
      setIsUploading(false)
    }
  }, [visitId, tenantId, isUploading, loadAllegati])

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

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
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
