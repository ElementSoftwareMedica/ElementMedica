import { useState, useEffect, useCallback } from 'react'
import { ClipboardCheck, Plus, ChevronDown, ChevronRight, Check, Edit3 } from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface VisitTemplate {
  id: string
  nome: string
  tipo: string | null
  fields: string // JSON array of field definitions
}

interface FieldDef {
  key: string
  label: string
  tipo: 'text' | 'textarea' | 'select' | 'boolean' | 'number'
  opzioni?: string[] // for select
  obbligatorio?: boolean
}

interface QuestionarioCompilato {
  id: string
  _localId: string
  templateId: string
  risposte: string // JSON
  dataCompilazione: string | null
  _templateNome?: string
}

// ============================================================
// Component
// ============================================================

interface Props {
  visitId: string
  personId: string
  tenantId: string
  isReadOnly: boolean
}

export function QuestionariCard({ visitId, personId, tenantId, isReadOnly }: Props): JSX.Element {
  const [templates, setTemplates] = useState<VisitTemplate[]>([])
  const [compilati, setCompilati] = useState<QuestionarioCompilato[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null) // null = not editing, 'NEW' = new, or ID
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [risposte, setRisposte] = useState<Record<string, string | boolean | number>>({})
  const [isSaving, setIsSaving] = useState(false)

  // ----------------------------------------------------------
  // Load templates and compiled questionari
  // ----------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!window.desktopApi) return
    try {
      const [tpls, compiled] = await Promise.all([
        window.desktopApi.db.query({
          table: 'visit_templates',
          where: { _isDeleted: 0 },
          orderBy: { column: 'nome', direction: 'ASC' }
        }) as Promise<VisitTemplate[]>,
        window.desktopApi.db.query({
          table: 'questionari_compilati',
          where: { visitaId: visitId, _isDeleted: 0 },
          orderBy: { column: 'dataCompilazione', direction: 'DESC' }
        }) as Promise<QuestionarioCompilato[]>
      ])
      setTemplates(tpls)
      setCompilati(compiled)
    } catch {
      setTemplates([])
      setCompilati([])
    } finally {
      setLoading(false)
    }
  }, [visitId])

  useEffect(() => { loadData() }, [loadData])

  // ----------------------------------------------------------
  // Parse template fields
  // ----------------------------------------------------------

  const getFields = useCallback((template: VisitTemplate): FieldDef[] => {
    try {
      const parsed = JSON.parse(template.fields)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [])

  // ----------------------------------------------------------
  // Start new questionario
  // ----------------------------------------------------------

  const handleStartNew = useCallback(() => {
    if (templates.length === 0) return
    setSelectedTemplate(templates[0].id)
    setRisposte({})
    setEditingId('NEW')
  }, [templates])

  // ----------------------------------------------------------
  // Edit existing questionario
  // ----------------------------------------------------------

  const handleEdit = useCallback((q: QuestionarioCompilato) => {
    setSelectedTemplate(q.templateId)
    try {
      setRisposte(JSON.parse(q.risposte))
    } catch {
      setRisposte({})
    }
    setEditingId(q.id)
  }, [])

  // ----------------------------------------------------------
  // Save questionario
  // ----------------------------------------------------------

  const handleSave = useCallback(async () => {
    if (!window.desktopApi || isSaving || !selectedTemplate) return
    setIsSaving(true)

    try {
      const now = new Date().toISOString()
      const data = {
        tenantId,
        visitaId: visitId,
        personId,
        templateId: selectedTemplate,
        risposte: JSON.stringify(risposte),
        dataCompilazione: now,
        updatedAt: now,
      }

      if (editingId === 'NEW') {
        const { id } = await window.desktopApi.db.insert({
          table: 'questionari_compilati',
          data: { ...data, createdAt: now }
        })

        await window.desktopApi.sync.enqueue({
          type: 'CREATE',
          entity: 'questionarioCompilato',
          entityId: id,
          payload: data
        })
      } else if (editingId) {
        await window.desktopApi.db.update({
          table: 'questionari_compilati',
          id: editingId,
          data
        })

        await window.desktopApi.sync.enqueue({
          type: 'UPDATE',
          entity: 'questionarioCompilato',
          entityId: editingId,
          payload: data
        })
      }

      setEditingId(null)
      setRisposte({})
      await loadData()
    } finally {
      setIsSaving(false)
    }
  }, [editingId, selectedTemplate, risposte, tenantId, visitId, personId, isSaving, loadData])

  // ----------------------------------------------------------
  // Render field
  // ----------------------------------------------------------

  const renderField = useCallback((field: FieldDef) => {
    const value = risposte[field.key]

    if (field.tipo === 'boolean') {
      return (
        <label key={field.key} className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => setRisposte(prev => ({ ...prev, [field.key]: e.target.checked }))}
            disabled={isReadOnly}
            className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
          />
          <span className="text-xs text-gray-700">{field.label}</span>
          {field.obbligatorio && <span className="text-red-400 text-[10px]">*</span>}
        </label>
      )
    }

    if (field.tipo === 'select' && field.opzioni) {
      return (
        <div key={field.key}>
          <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
            {field.label} {field.obbligatorio && <span className="text-red-400">*</span>}
          </label>
          <select
            value={(value as string) || ''}
            onChange={(e) => setRisposte(prev => ({ ...prev, [field.key]: e.target.value }))}
            disabled={isReadOnly}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Seleziona...</option>
            {field.opzioni.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    }

    if (field.tipo === 'textarea') {
      return (
        <div key={field.key}>
          <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
            {field.label} {field.obbligatorio && <span className="text-red-400">*</span>}
          </label>
          <textarea
            value={(value as string) || ''}
            onChange={(e) => setRisposte(prev => ({ ...prev, [field.key]: e.target.value }))}
            readOnly={isReadOnly}
            rows={2}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
          />
        </div>
      )
    }

    if (field.tipo === 'number') {
      return (
        <div key={field.key}>
          <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
            {field.label} {field.obbligatorio && <span className="text-red-400">*</span>}
          </label>
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) => setRisposte(prev => ({ ...prev, [field.key]: e.target.value ? Number(e.target.value) : '' }))}
            readOnly={isReadOnly}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )
    }

    // Default: text
    return (
      <div key={field.key}>
        <label className="block text-[10px] font-medium text-gray-600 mb-0.5">
          {field.label} {field.obbligatorio && <span className="text-red-400">*</span>}
        </label>
        <input
          type="text"
          value={(value as string) || ''}
          onChange={(e) => setRisposte(prev => ({ ...prev, [field.key]: e.target.value }))}
          readOnly={isReadOnly}
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
    )
  }, [risposte, isReadOnly])

  // ----------------------------------------------------------
  // Get template name by id
  // ----------------------------------------------------------

  const getTemplateName = useCallback((templateId: string): string => {
    return templates.find(t => t.id === templateId)?.nome || 'Questionario'
  }, [templates])

  // ----------------------------------------------------------
  // Currently editing template
  // ----------------------------------------------------------

  const currentTemplate = templates.find(t => t.id === selectedTemplate)
  const currentFields = currentTemplate ? getFields(currentTemplate) : []

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
          <ClipboardCheck className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-semibold text-gray-900 font-heading">Questionari</span>
          {compilati.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
              {compilati.length}
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
              {/* Compiled list */}
              {compilati.length === 0 && !editingId ? (
                <p className="text-xs text-gray-400 text-center py-2">
                  {templates.length === 0 ? 'Nessun modello questionario disponibile' : 'Nessun questionario compilato'}
                </p>
              ) : (
                !editingId && (
                  <div className="space-y-2">
                    {compilati.map(q => {
                      let risposteCount = 0
                      try { risposteCount = Object.keys(JSON.parse(q.risposte)).length } catch { /* ignore */ }
                      return (
                        <div key={q.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {getTemplateName(q.templateId)}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {risposteCount} risposte · {q.dataCompilazione
                                ? new Date(q.dataCompilazione).toLocaleDateString('it-IT')
                                : '—'}
                            </p>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => handleEdit(q)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-teal-600 transition-all"
                              title="Modifica"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              )}

              {/* Editing form */}
              {editingId && (
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  {/* Template selector (only for new) */}
                  {editingId === 'NEW' && templates.length > 1 && (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Modello</label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => {
                          setSelectedTemplate(e.target.value)
                          setRisposte({})
                        }}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Dynamic fields */}
                  {currentFields.length > 0 ? (
                    <div className="space-y-2">
                      {currentFields.map(renderField)}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5">Note / Risposte</label>
                      <textarea
                        value={(risposte['note'] as string) || ''}
                        onChange={(e) => setRisposte(prev => ({ ...prev, note: e.target.value }))}
                        rows={4}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
                        placeholder="Compilare il questionario..."
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Salvataggio...' : 'Salva'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setRisposte({}) }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Annulla
                    </button>
                  </div>
                </div>
              )}

              {/* New button */}
              {!isReadOnly && !editingId && templates.length > 0 && (
                <button
                  onClick={handleStartNew}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-dashed border-gray-300 rounded-lg text-xs font-medium text-gray-500 hover:text-teal-600 hover:border-teal-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Compila questionario
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
