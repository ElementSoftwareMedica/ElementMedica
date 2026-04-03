import { useState, useEffect, useCallback } from 'react'
import { Activity, Plus, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react'

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

const TIPI_ESAME: Array<{ value: string; label: string; parametri: string[] }> = [
  { value: 'SPIROMETRIA', label: 'Spirometria', parametri: ['FVC', 'FEV1', 'FEV1/FVC', 'PEF'] },
  { value: 'AUDIOMETRIA', label: 'Audiometria', parametri: ['Orecchio DX (dB)', 'Orecchio SX (dB)', 'Deficit'] },
  { value: 'ECG', label: 'ECG', parametri: ['FC', 'Ritmo', 'Asse', 'Conclusioni'] },
  { value: 'VISIOTEST', label: 'Visiotest', parametri: ['Visus OD', 'Visus OS', 'Stereopsi', 'Cromatica'] },
  { value: 'EMOCROMO', label: 'Esami Ematochimici', parametri: ['HB', 'GR', 'GB', 'PLT', 'Glicemia', 'Creatinina'] },
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
}

export function EsamiStrumentaliCard({ visitId, personId, tenantId, isReadOnly }: Props): JSX.Element {
  const [esami, setEsami] = useState<EsameStrumentale[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // New esame form state
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTipo, setNewTipo] = useState('')
  const [newRisultato, setNewRisultato] = useState('')
  const [newValori, setNewValori] = useState<Record<string, string>>({})
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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
        setEsami(results)
        if (results.length > 0) setIsExpanded(true)
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
        entity: 'esameStrumentale',
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
    setEsami(prev => prev.filter(e => e.id !== esameId))
  }, [isReadOnly])

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
        </div>
      )}
    </div>
  )
}
