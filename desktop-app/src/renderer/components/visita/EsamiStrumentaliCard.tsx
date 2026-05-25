import { useState, useEffect, useCallback } from 'react'
import { Activity, Plus, Trash2, Save, ChevronDown, ChevronRight, Zap, Loader2, CheckCircle2, FileText } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

// ============================================================
// Types & Constants
// ============================================================

interface EsameStrumentale {
  id: string
  _localId: string
  tipo: string
  risultato: string | null
  valori: string | null // JSON
  dataEsame: string | null
  note: string | null
}

interface ExamDocument {
  id: string
  nome: string
  tipo: string | null
  dimensione: number | null
  localPath: string | null
  serverUrl: string | null
}

const TIPI_ESAME: Array<{ value: string; label: string; parametri: string[]; bridgeSupported?: boolean }> = [
  { value: 'SPIROMETRIA', label: 'Spirometria', parametri: ['FVC', 'FEV1', 'FEV1/FVC', 'PEF'], bridgeSupported: true },
  { value: 'AUDIOMETRIA', label: 'Audiometria', parametri: ['Orecchio DX (dB)', 'Orecchio SX (dB)', 'Deficit'], bridgeSupported: true },
  { value: 'ECG', label: 'ECG', parametri: ['FC', 'Ritmo', 'Asse', 'Conclusioni'], bridgeSupported: true },
  { value: 'VISIOTEST', label: 'Visiotest', parametri: ['Visus OD', 'Visus OS', 'Stereopsi', 'Cromatica'] },
  { value: 'EMOCROMO', label: 'Esami Ematochimici', parametri: ['HB', 'GR', 'GB', 'PLT', 'Glicemia', 'Creatinina'] },
  { value: 'ESAME_LABORATORIO', label: 'Esame di Laboratorio', parametri: ['Materiale', 'Analisi richieste', 'Esito', 'Valori fuori range'] },
  { value: 'ESAME_MICROBIOLOGICO', label: 'Esame Microbiologico', parametri: ['Campione', 'Ricerca', 'Esito', 'Antibiogramma'] },
  { value: 'DRUG_TEST', label: 'Drug Test', parametri: ['Esito', 'Sostanze testate'] },
  { value: 'ALCOL_TEST', label: 'Alcol Test', parametri: ['Esito', 'Valore BAC'] },
  { value: 'RX_TORACE', label: 'RX Torace', parametri: ['Referto'] },
  { value: 'ALTRO', label: 'Altro', parametri: [] },
]

const RISULTATI = [
  { value: 'NORMALE', label: 'Normale', color: 'bg-green-100 text-green-800' },
  { value: 'ALTERATO', label: 'Alterato', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PATOLOGICO', label: 'Patologico', color: 'bg-red-100 text-red-800' },
  { value: 'NON_ESEGUITO', label: 'Non eseguito', color: 'bg-gray-100 text-gray-500' },
]

// ============================================================
// Component
// ============================================================

interface Props {
  visitId: string
  personId: string
  tenantId: string
  isReadOnly: boolean
  /** Optional patient data for bridge-based exam launch (GDT patient header) */
  patientData?: { nome?: string; cognome?: string; dataNascita?: string }
  defaultExpanded?: boolean
}

export function EsamiStrumentaliCard({ visitId, personId, tenantId, isReadOnly, patientData, defaultExpanded = false }: Props): JSX.Element {
  const [esami, setEsami] = useState<EsameStrumentale[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [editingId, setEditingId] = useState<string | null>(null)

  // New esame form state
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTipo, setNewTipo] = useState('')
  const [newRisultato, setNewRisultato] = useState('')
  const [newValori, setNewValori] = useState<Record<string, string>>({})
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Bridge launch state
  const [bridgeLaunching, setBridgeLaunching] = useState<string | null>(null) // tipo being launched
  const [bridgeResult, setBridgeResult] = useState<{ sessionId: string; tipo: string } | null>(null)
  const [examDocuments, setExamDocuments] = useState<ExamDocument[]>([])
  const [docError, setDocError] = useState<string | null>(null)

  // Bridge exam result listener
  useEffect(() => {
    if (!window.desktopApi) return
    const handler = (_event: unknown, data: {
      sessionId: string; visitaId?: string; tipo: string
      risultato?: string; valori?: Record<string, string>
      note?: string; completedAt: string
    }) => {
      if (data.visitaId && data.visitaId !== visitId) return
      setBridgeResult(null)
      // Auto-save the received result as an esame
      const saveResultAsync = async (): Promise<void> => {
        if (!window.desktopApi) return
        const esameData = {
          tenantId,
          visitaId: visitId,
          personId,
          tipo: data.tipo,
          risultato: data.risultato || null,
          valori: JSON.stringify(data.valori || {}),
          dataEsame: data.completedAt.split('T')[0],
          note: data.note || 'Risultato da Medical Device Bridge',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const result = await window.desktopApi.db.insert({ table: 'esami_strumentali', data: esameData }) as { id: string; _localId: string }
        await window.desktopApi.sync.enqueue({
          type: 'CREATE',
          entity: 'esami_strumentali',
          entityId: result.id,
          localId: result._localId,
          payload: esameData
        })
        setEsami(prev => [...prev, {
          id: result.id,
          _localId: result._localId,
          tipo: data.tipo,
          risultato: data.risultato || null,
          valori: JSON.stringify(data.valori || {}),
          dataEsame: esameData.dataEsame,
          note: esameData.note,
        }])
      }
      saveResultAsync().catch(() => undefined)
    }
    window.desktopApi.on.bridgeExamResult(handler)
    return () => {
      window.desktopApi?.on.removeAllListeners('bridge:examResult')
    }
  }, [visitId, personId, tenantId])

  // Launch exam via bridge
  const handleLaunchBridgeExam = useCallback(async (tipo: string) => {
    if (!window.desktopApi) return
    setBridgeLaunching(tipo)
    const sessionId = uuidv4()
    try {
      await window.desktopApi.bridge.startExam({
        tipo,
        patientData: {
          nome: patientData?.nome || '',
          cognome: patientData?.cognome || '',
          dataNascita: patientData?.dataNascita || '',
        },
        visitaId: visitId,
        sessionId,
      })
      setBridgeResult({ sessionId, tipo })
    } catch {
      setBridgeResult(null)
    } finally {
      setBridgeLaunching(null)
    }
  }, [visitId, patientData])

  // Load esami for this visit
  useEffect(() => {
    async function load() {
      if (!window.desktopApi || !visitId) return
      setLoading(true)
      try {
        const results = await window.desktopApi.db.query({
          table: 'esami_strumentali',
          where: { visitaId: visitId, _isDeleted: 0 }
        }) as EsameStrumentale[]
        const docs = await window.desktopApi.db.query({
          table: 'allegati',
          where: { visitaId: visitId, _isDeleted: 0 },
          orderBy: { column: 'createdAt', direction: 'DESC' }
        }) as ExamDocument[]
        setEsami(results)
        setExamDocuments(docs.filter(d => /laboratorio|microbiologico|microbio|ematochim/i.test(d.nome || '')))
        if (results.length > 0 || docs.length > 0) setIsExpanded(true)
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [visitId])

  // Get parametri for selected tipo
  const tipoConfig = TIPI_ESAME.find(t => t.value === newTipo)

  // Reset form
  const resetForm = useCallback(() => {
    setNewTipo('')
    setNewRisultato('')
    setNewValori({})
    setNewNote('')
    setShowNewForm(false)
  }, [])

  // Save new esame
  const handleSave = useCallback(async () => {
    if (!window.desktopApi || !newTipo || isSaving) return
    setIsSaving(true)

    try {
      const data = {
        tenantId,
        visitaId: visitId,
        personId,
        tipo: newTipo,
        risultato: newRisultato || null,
        valori: JSON.stringify(newValori),
        dataEsame: new Date().toISOString().split('T')[0],
        note: newNote || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = await window.desktopApi.db.insert({
        table: 'esami_strumentali',
        data
      }) as { id: string; _localId: string }

      await window.desktopApi.sync.enqueue({
        type: 'CREATE',
        entity: 'esami_strumentali',
        entityId: result.id,
        localId: result._localId,
        payload: data
      })

      setEsami(prev => [...prev, {
        id: result.id,
        _localId: result._localId,
        tipo: newTipo,
        risultato: newRisultato || null,
        valori: JSON.stringify(newValori),
        dataEsame: data.dataEsame,
        note: newNote || null,
      }])

      resetForm()
    } finally {
      setIsSaving(false)
    }
  }, [visitId, personId, tenantId, newTipo, newRisultato, newValori, newNote, isSaving, resetForm])

  // Delete esame
  const handleDelete = useCallback(async (esameId: string) => {
    if (!window.desktopApi || isReadOnly) return
    await window.desktopApi.db.softDelete({ table: 'esami_strumentali', id: esameId })
    await window.desktopApi.sync.enqueue({
      type: 'DELETE',
      entity: 'esami_strumentali',
      entityId: esameId,
      payload: {}
    })
    setEsami(prev => prev.filter(e => e.id !== esameId))
  }, [isReadOnly])

  const handleAddDocument = useCallback(async (kind: 'laboratorio' | 'microbiologico') => {
    if (!window.desktopApi || isReadOnly) return
    setDocError(null)
    const result = await window.desktopApi.dialog.openFile()
    if (result.canceled || !result.filePaths.length) return
    try {
      const fileInfo = await window.desktopApi.file.copyToAppData({ sourcePath: result.filePaths[0], visitaId: visitId })
      const now = new Date().toISOString()
      const prefix = kind === 'laboratorio' ? 'Laboratorio' : 'Microbiologico'
      const { id } = await window.desktopApi.db.insert({
        table: 'allegati',
        data: {
          tenantId,
          visitaId: visitId,
          nome: `${prefix} - ${fileInfo.nome}`,
          tipo: fileInfo.tipo,
          dimensione: fileInfo.dimensione,
          localPath: fileInfo.localPath,
          serverUrl: null,
          createdAt: now,
          updatedAt: now,
        }
      }) as { id: string }
      setExamDocuments(prev => [{ id, nome: `${prefix} - ${fileInfo.nome}`, tipo: fileInfo.tipo, dimensione: fileInfo.dimensione, localPath: fileInfo.localPath, serverUrl: null }, ...prev])
    } catch {
      setDocError('Impossibile caricare il documento')
    }
  }, [isReadOnly, tenantId, visitId])

  const handleOpenDocument = useCallback(async (doc: ExamDocument) => {
    setDocError(null)
    try {
      if (doc.localPath) {
        await window.desktopApi.file.openLocalFile(doc.localPath)
      } else if (doc.serverUrl) {
        await window.desktopApi.app.openExternal(doc.serverUrl.startsWith('http') ? doc.serverUrl : `https://www.elementmedica.com${doc.serverUrl}`)
      } else {
        setDocError('Documento non disponibile')
      }
    } catch {
      setDocError('Impossibile aprire il documento')
    }
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
        <div className="animate-pulse h-4 bg-gray-100 rounded w-32" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          Esami Strumentali
        </h3>
        <div className="flex items-center gap-2">
          {esami.length > 0 && (
            <span className="text-[10px] text-gray-400">{esami.length} esam{esami.length === 1 ? 'e' : 'i'}</span>
          )}
          {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Existing exams list */}
          {esami.map(esame => {
            const tipoLabel = TIPI_ESAME.find(t => t.value === esame.tipo)?.label || esame.tipo
            const risultatoConf = RISULTATI.find(r => r.value === esame.risultato)
            const valoriParsed: Record<string, string> = (() => {
              try { return JSON.parse(esame.valori || '{}') } catch { return {} }
            })()
            const valoriEntries = Object.entries(valoriParsed).filter(([, v]) => v)

            return (
              <div key={esame.id} className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-900">{tipoLabel}</span>
                    {risultatoConf && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${risultatoConf.color}`}>
                        {risultatoConf.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {esame.dataEsame && (
                      <span className="text-[10px] text-gray-400">{new Date(esame.dataEsame).toLocaleDateString('it-IT')}</span>
                    )}
                    {!isReadOnly && (
                      <button
                        onClick={() => handleDelete(esame.id)}
                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Show values */}
                {valoriEntries.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {valoriEntries.map(([key, val]) => (
                      <span key={key} className="text-[10px] text-gray-500">
                        <span className="text-gray-400">{key}:</span> {val}
                      </span>
                    ))}
                  </div>
                )}

                {esame.note && (
                  <p className="text-[10px] text-gray-500 italic">{esame.note}</p>
                )}
              </div>
            )
          })}

          {/* Empty state */}
          {esami.length === 0 && !showNewForm && (
            <p className="text-xs text-gray-400 text-center py-2">Nessun esame registrato</p>
          )}

          {/* Add new esame form */}
          {showNewForm && (
            <div className="bg-blue-50/50 rounded-xl p-3 space-y-2.5 border border-blue-100">
              {/* Tipo selection */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Tipo Esame</label>
                <select
                  value={newTipo}
                  onChange={(e) => { setNewTipo(e.target.value); setNewValori({}) }}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Seleziona...</option>
                  {TIPI_ESAME.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic parametri fields */}
              {tipoConfig && tipoConfig.parametri.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-medium text-gray-600">Parametri</label>
                  {tipoConfig.parametri.map(param => (
                    <div key={param} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-28 shrink-0">{param}</span>
                      <input
                        type="text"
                        value={newValori[param] || ''}
                        onChange={(e) => setNewValori(prev => ({ ...prev, [param]: e.target.value }))}
                        className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Risultato */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Risultato</label>
                <div className="flex flex-wrap gap-1">
                  {RISULTATI.map(r => (
                    <button
                      key={r.value}
                      onClick={() => setNewRisultato(r.value)}
                      className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                        newRisultato === r.value
                          ? r.color + ' border-current'
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-[10px] font-medium text-gray-600 mb-1">Note</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  placeholder="Note sull'esame..."
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={resetForm}
                  className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  disabled={!newTipo || isSaving}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3 h-3" />
                  {isSaving ? 'Salvataggio...' : 'Salva'}
                </button>
              </div>
            </div>
          )}

          {/* Add button */}
          {!isReadOnly && !showNewForm && (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Aggiungi Esame
            </button>
          )}

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Documenti laboratorio e microbiologia</p>
            {docError && <p className="rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-600">{docError}</p>}
            {examDocuments.length > 0 && (
              <div className="space-y-1.5">
                {examDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    <span className="min-w-0 flex-1 truncate text-xs text-gray-700">{doc.nome}</span>
                    <button type="button" onClick={() => { void handleOpenDocument(doc) }} className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-medium text-teal-700 hover:bg-teal-100">Apri</button>
                  </div>
                ))}
              </div>
            )}
            {!isReadOnly && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { void handleAddDocument('laboratorio') }} className="rounded-xl border border-dashed border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                  Carica laboratorio
                </button>
                <button type="button" onClick={() => { void handleAddDocument('microbiologico') }} className="rounded-xl border border-dashed border-green-200 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50">
                  Carica microbiologico
                </button>
              </div>
            )}
          </div>

          {/* Bridge quick-launch buttons (ECG / Spirometria / Audiometria) */}
          {!isReadOnly && !showNewForm && (
            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Avvia con dispositivo medico</p>
              <div className="flex flex-wrap gap-2">
                {TIPI_ESAME.filter(t => t.bridgeSupported).map(t => (
                  <button
                    key={t.value}
                    onClick={() => handleLaunchBridgeExam(t.value)}
                    disabled={bridgeLaunching !== null}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 transition-colors"
                  >
                    {bridgeLaunching === t.value
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Zap className="w-3 h-3" />
                    }
                    {t.label}
                  </button>
                ))}
              </div>
              {bridgeResult && (
                <div className="flex items-center gap-1.5 text-[11px] text-green-600 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  Esame avviato — in attesa risultato dal dispositivo…
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
