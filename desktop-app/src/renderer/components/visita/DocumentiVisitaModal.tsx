import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ClipboardCheck, FileStack, Plus, Save, X } from 'lucide-react'

interface VisitTemplate {
  id: string
  nome: string
  tipo: string | null
  fields: string
  campi?: string
  codice?: string | null
  fase?: string | null
  questionarioConfig?: string | null
}

interface FieldDef {
  key?: string
  name?: string
  label: string
  tipo?: 'text' | 'textarea' | 'select' | 'boolean' | 'number'
  type?: 'TEXT' | 'TEXTAREA' | 'DROPDOWN' | 'BOOLEAN' | 'NUMBER'
  opzioni?: Array<string | { label?: string; value?: string }>
  options?: Array<string | { label?: string; value?: string }>
  obbligatorio?: boolean
  required?: boolean
}

interface Compilato {
  id: string
  templateId: string
  risposte: string
  dataCompilazione: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  mode: 'questionari' | 'modulistica'
  visitId: string
  personId: string
  tenantId: string
  isReadOnly: boolean
}

function isQuestionarioTemplate(t: VisitTemplate): boolean {
  const text = `${t.tipo || ''} ${t.nome || ''} ${t.codice || ''} ${t.questionarioConfig || ''}`.toLowerCase()
  return text.includes('questionario') || text.includes('scheda_sorveglianza') || text.includes('alcol') || text.includes('rischio') || text.includes('sintomi') || text.includes('scoring')
}

function parseFields(template: VisitTemplate | undefined): FieldDef[] {
  const rawFields = template?.fields || template?.campi
  if (!rawFields) return []
  try {
    const parsed = JSON.parse(rawFields) as FieldDef[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function optionValue(option: string | { label?: string; value?: string }): string {
  return typeof option === 'string' ? option : String(option.value || option.label || '')
}

function optionLabel(option: string | { label?: string; value?: string }): string {
  return typeof option === 'string' ? option : String(option.label || option.value || '')
}

function fallbackTemplates(mode: 'questionari' | 'modulistica'): VisitTemplate[] {
  if (mode === 'questionari') {
    return [{
      id: 'offline-questionario-anamnesi-mdl',
      nome: 'Questionario Anamnesi MDL',
      tipo: 'QUESTIONARIO_ANAMNESI_MDL',
      fields: JSON.stringify([
        { key: 'disturbi_attuali', label: 'Disturbi attuali', tipo: 'textarea' },
        { key: 'farmaci', label: 'Farmaci assunti', tipo: 'textarea' },
        { key: 'allergie', label: 'Allergie', tipo: 'textarea' },
        { key: 'fumatore', label: 'Fumatore', tipo: 'boolean' },
        { key: 'note', label: 'Note', tipo: 'textarea' },
      ]),
    }]
  }
  return [{
    id: 'offline-modulo-generico-visita',
    nome: 'Modulo visita',
    tipo: 'MODULO_GENERICO',
    fields: JSON.stringify([
      { key: 'oggetto', label: 'Oggetto', tipo: 'text' },
      { key: 'contenuto', label: 'Contenuto modulo', tipo: 'textarea' },
      { key: 'note', label: 'Note', tipo: 'textarea' },
    ]),
  }]
}

function fieldKey(field: FieldDef): string {
  return field.key || field.name || String(field.label || 'campo')
}

function fieldLabel(field: FieldDef): string {
  return typeof field.label === 'string' ? field.label : String(field.key || field.name || 'Campo')
}

export function DocumentiVisitaModal({ isOpen, onClose, mode, visitId, personId, tenantId, isReadOnly }: Props): JSX.Element | null {
  const [templates, setTemplates] = useState<VisitTemplate[]>([])
  const [compiled, setCompiled] = useState<Compilato[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [risposte, setRisposte] = useState<Record<string, string | number | boolean>>({})
  const [saving, setSaving] = useState(false)

  const title = mode === 'questionari' ? 'Questionari' : 'Modulistica'
  const Icon = mode === 'questionari' ? ClipboardCheck : FileStack

  const loadData = useCallback(async () => {
    if (!window.desktopApi || !isOpen) return
    const [visitTemplateRows, documentTemplateRows, compiledRows] = await Promise.all([
      window.desktopApi.db.query({ table: 'visit_templates', where: { _isDeleted: 0 }, orderBy: { column: 'nome', direction: 'ASC' } }) as Promise<VisitTemplate[]>,
      window.desktopApi.db.query({ table: 'document_templates', where: { _isDeleted: 0, isActive: 1 }, orderBy: { column: 'ordine', direction: 'ASC' } }).catch(() => []) as Promise<VisitTemplate[]>,
      window.desktopApi.db.query({ table: 'questionari_compilati', where: { visitaId: visitId, _isDeleted: 0 }, orderBy: { column: 'dataCompilazione', direction: 'DESC' } }) as Promise<Compilato[]>,
    ])
    const templateRows = [
      ...documentTemplateRows.map(t => ({ ...t, fields: t.campi || t.fields || '[]' })),
      ...visitTemplateRows,
    ].filter((t, idx, all) => all.findIndex(x => x.id === t.id) === idx)
    const filteredFromDb = templateRows.filter(t => mode === 'questionari' ? isQuestionarioTemplate(t) : !isQuestionarioTemplate(t))
    const filteredTemplates = filteredFromDb.length > 0 ? filteredFromDb : fallbackTemplates(mode)
    setTemplates(filteredTemplates)
    setCompiled(compiledRows.filter(row => {
      const template = templateRows.find(t => t.id === row.templateId)
      return template ? (mode === 'questionari' ? isQuestionarioTemplate(template) : !isQuestionarioTemplate(template)) : mode === 'questionari'
    }))
    if (!selectedTemplate && filteredTemplates[0]) setSelectedTemplate(filteredTemplates[0].id)
  }, [isOpen, mode, selectedTemplate, visitId])

  useEffect(() => { void loadData() }, [loadData])

  const currentTemplate = templates.find(t => t.id === selectedTemplate)
  const fields = useMemo(() => parseFields(currentTemplate), [currentTemplate])

  const startNew = (): void => {
    setEditingId('NEW')
    setRisposte({})
    if (!selectedTemplate && templates[0]) setSelectedTemplate(templates[0].id)
  }

  const startEdit = (row: Compilato): void => {
    setEditingId(row.id)
    setSelectedTemplate(row.templateId)
    try { setRisposte(JSON.parse(row.risposte || '{}')) } catch { setRisposte({}) }
  }

  const save = async (): Promise<void> => {
    if (!window.desktopApi || !selectedTemplate || !editingId) return
    setSaving(true)
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
        const { id } = await window.desktopApi.db.insert({ table: 'questionari_compilati', data: { ...data, createdAt: now } }) as { id: string }
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'questionari_compilati', entityId: id, payload: data })
      } else {
        await window.desktopApi.db.update({ table: 'questionari_compilati', id: editingId, data })
        await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'questionari_compilati', entityId: editingId, payload: data })
      }
      setEditingId(null)
      setRisposte({})
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">Compilazione, modifica e sincronizzazione offline della visita</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid max-h-[72vh] grid-cols-12 overflow-hidden">
          <div className="col-span-4 border-r border-gray-100 overflow-y-auto p-4">
            {!isReadOnly && (
              <button onClick={startNew} disabled={templates.length === 0} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                <Plus className="h-4 w-4" /> Nuovo
              </button>
            )}
            {compiled.length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-400">Nessun elemento compilato</p>
            ) : compiled.map(row => {
              const template = templates.find(t => t.id === row.templateId)
              return (
                <button key={row.id} onClick={() => startEdit(row)} className={`mb-2 w-full rounded-xl border px-3 py-2 text-left text-sm ${editingId === row.id ? 'border-teal-300 bg-teal-50' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <span className="block font-medium text-gray-900">{template?.nome || title}</span>
                  <span className="text-xs text-gray-400">{row.dataCompilazione ? new Date(row.dataCompilazione).toLocaleDateString('it-IT') : 'Bozza'}</span>
                </button>
              )
            })}
          </div>

          <div className="col-span-8 overflow-y-auto p-5">
            {editingId ? (
              <div className="space-y-4">
                <label className="block text-xs font-medium text-gray-600">
                  Modello
                  <select disabled={editingId !== 'NEW'} value={selectedTemplate} onChange={e => { setSelectedTemplate(e.target.value); setRisposte({}) }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    {templates.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </label>
                {fields.length === 0 ? (
                  <textarea value={(risposte.note as string) || ''} onChange={e => setRisposte(prev => ({ ...prev, note: e.target.value }))} readOnly={isReadOnly} rows={10} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Compila contenuto..." />
                ) : fields.map(field => {
                  const key = fieldKey(field)
                  const value = risposte[key]
                  const type = (field.tipo || field.type || 'text').toString().toLowerCase()
                  const required = field.obbligatorio || field.required
                  return (
                    <label key={key} className="block text-xs font-medium text-gray-600">
                      {fieldLabel(field)}{required ? ' *' : ''}
                      {type.includes('boolean') ? (
                        <input type="checkbox" checked={!!value} onChange={e => setRisposte(prev => ({ ...prev, [key]: e.target.checked }))} disabled={isReadOnly} className="ml-2 h-4 w-4 rounded border-gray-300 text-teal-600" />
                      ) : type.includes('textarea') ? (
                        <textarea value={(value as string) || ''} onChange={e => setRisposte(prev => ({ ...prev, [key]: e.target.value }))} readOnly={isReadOnly} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      ) : type.includes('select') || type.includes('dropdown') ? (
                        <select value={(value as string) || ''} onChange={e => setRisposte(prev => ({ ...prev, [key]: e.target.value }))} disabled={isReadOnly} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                          <option value="">Seleziona...</option>
                          {(field.opzioni || field.options || []).map(opt => {
                            const value = optionValue(opt)
                            return <option key={value} value={value}>{optionLabel(opt)}</option>
                          })}
                        </select>
                      ) : (
                        <input type={type.includes('number') ? 'number' : 'text'} value={(value as string | number) || ''} onChange={e => setRisposte(prev => ({ ...prev, [key]: type.includes('number') ? Number(e.target.value) : e.target.value }))} readOnly={isReadOnly} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                      )}
                    </label>
                  )
                })}
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                  <button onClick={() => { setEditingId(null); setRisposte({}) }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
                  {!isReadOnly && (
                    <button onClick={save} disabled={saving || !selectedTemplate} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                      <Save className="h-4 w-4" /> {saving ? 'Salvataggio...' : 'Salva'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-80 flex-col items-center justify-center text-center text-gray-400">
                <Check className="mb-3 h-8 w-8" />
                <p className="text-sm">{templates.length === 0 ? `Nessun modello ${title.toLowerCase()} disponibile offline` : 'Seleziona un elemento o creane uno nuovo'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
