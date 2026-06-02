import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ArrowLeft, Check, ClipboardCheck, Eye, FileStack, Pencil, Plus, Save, Search, X } from 'lucide-react'
import { useDesktopAuth } from '../../context/DesktopAuthContext'
import { ElegantDateInput, ElegantSelect } from '../ElegantControls'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'

interface DocumentTemplate {
  id: string
  nome: string
  descrizione?: string | null
  tipo: string | null
  campi?: string
  codice?: string | null
  fase?: string | null
  richiedeFirma?: number | boolean
  richiedeFirmaMedico?: number | boolean
}

interface QuestionarioMedicoConfig {
  id: string
  documentoTemplateId: string
  codiciRischio?: string | null
  tipiVisitaMDL?: string | null
  haScoring?: number | boolean | null
  compilabileDa?: string | null
}

interface FieldDef {
  key?: string
  name?: string
  label: string
  tipo?: string
  type?: string
  opzioni?: Array<string | { label?: string; value?: string }>
  options?: Array<string | { label?: string; value?: string }>
  defaultValue?: string | number | boolean | string[]
  placeholder?: string
  obbligatorio?: boolean
  required?: boolean
}

interface Compilato {
  id: string
  templateId: string
  risposte: string
  dataCompilazione: string | null
  stato?: string | null
  pdfUrl?: string | null
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

const QUESTIONARIO_TIPO_EXACT = new Set(['ALCOL_SCREENING', 'SCHEDA_SORVEGLIANZA'])
const MODULISTICA_PHASES = [
  { id: 'PRE_VISITA', label: 'Pre visita' },
  { id: 'DURANTE_VISITA', label: 'Durante visita' },
  { id: 'POST_VISITA', label: 'Post visita' },
]

function jsonArrayHasItems(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

function isQuestionarioTemplate(t: DocumentTemplate, configByTemplate: Map<string, QuestionarioMedicoConfig>): boolean {
  const tipo = String(t.tipo || '').toUpperCase()
  if (tipo.startsWith('QUESTIONARIO_') || QUESTIONARIO_TIPO_EXACT.has(tipo)) return true
  const config = configByTemplate.get(t.id)
  return !!(
    config?.haScoring ||
    config?.compilabileDa ||
    jsonArrayHasItems(config?.codiciRischio) ||
    jsonArrayHasItems(config?.tipiVisitaMDL)
  )
}

function parseFields(template: DocumentTemplate | undefined): FieldDef[] {
  if (!template?.campi) return []
  try {
    const parsed = JSON.parse(template.campi) as unknown
    return Array.isArray(parsed) ? parsed as FieldDef[] : []
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

function fieldKey(field: FieldDef): string {
  return field.key || field.name || String(field.label || 'campo')
}

function fieldLabel(field: FieldDef): string {
  return typeof field.label === 'string' ? field.label : String(field.key || field.name || 'Campo')
}

function parseRisposte(raw: string): Record<string, string | number | boolean | string[]> {
  try {
    const parsed = JSON.parse(raw || '{}') as Record<string, string | number | boolean | string[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function buildDefaultRisposte(template: DocumentTemplate | undefined): Record<string, string | number | boolean | string[]> {
  const fields = parseFields(template)
  return fields.reduce<Record<string, string | number | boolean | string[]>>((acc, field) => {
    const key = fieldKey(field)
    const type = String(field.tipo || field.type || '').toLowerCase()
    if (field.defaultValue !== undefined) acc[key] = field.defaultValue
    else if (type.includes('boolean')) acc[key] = false
    else if (type.includes('multi')) acc[key] = []
    else acc[key] = ''
    return acc
  }, {})
}

function normalizePhase(value: string | null | undefined): string {
  const phase = String(value || '').toUpperCase()
  if (phase.includes('POST')) return 'POST_VISITA'
  if (phase.includes('DURANTE')) return 'DURANTE_VISITA'
  return 'PRE_VISITA'
}

export function DocumentiVisitaModal({ isOpen, onClose, mode, visitId, personId, tenantId, isReadOnly }: Props): JSX.Element | null {
  const { accessToken } = useDesktopAuth()
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [compiled, setCompiled] = useState<Compilato[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'fill' | 'view'>('list')
  const [risposte, setRisposte] = useState<Record<string, string | number | boolean | string[]>>({})
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPhase, setSelectedPhase] = useState('PRE_VISITA')
  const [loadError, setLoadError] = useState<string | null>(null)

  const title = mode === 'questionari' ? 'Questionari Medici' : 'Modulistica'
  const Icon = mode === 'questionari' ? ClipboardCheck : FileStack

  const loadData = useCallback(async () => {
    if (!window.desktopApi || !isOpen) return
    setLoadError(null)
    let documentTemplateRows = await window.desktopApi.db.query({ table: 'document_templates', where: { _isDeleted: 0, isActive: 1 }, orderBy: { column: 'ordine', direction: 'ASC' } }).catch(() => []) as DocumentTemplate[]
    let configRows = await window.desktopApi.db.query({ table: 'questionari_medici_config', where: { _isDeleted: 0 } }).catch(() => []) as QuestionarioMedicoConfig[]
    if (accessToken) {
      try {
        const response = await axios.get(`${API_BASE}/api/v1/clinica/modulistica/templates`, {
          params: { isActive: true, limit: 500 },
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 30000,
        })
        const onlineRows = response.data?.data?.data || response.data?.data || []
        const normalized = (Array.isArray(onlineRows) ? onlineRows : []).map((t: Record<string, unknown>) => ({
          id: String(t.id),
          tenantId,
          nome: String(t.nome || t.name || 'Documento'),
          descrizione: t.descrizione ? String(t.descrizione) : null,
          codice: t.codice ? String(t.codice) : null,
          tipo: t.tipo ? String(t.tipo) : null,
          fase: t.fase ? String(t.fase) : null,
          campi: typeof t.campi === 'string' ? t.campi : JSON.stringify(t.campi || []),
          contenutoHtml: t.contenutoHtml ? String(t.contenutoHtml) : null,
          richiedeFirma: t.richiedeFirma ? 1 : 0,
          richiedeFirmaMedico: t.richiedeFirmaMedico ? 1 : 0,
          isActive: t.isActive === false ? 0 : 1,
          ordine: Number(t.ordine || 0),
          updatedAt: t.updatedAt ? String(t.updatedAt) : new Date().toISOString(),
        })) as Array<DocumentTemplate & Record<string, unknown>>
        const normalizedConfigs = (Array.isArray(onlineRows) ? onlineRows : [])
          .map((t: Record<string, unknown>) => ({ templateId: String(t.id), config: t.questionarioConfig as Record<string, unknown> | undefined }))
          .filter(item => item.config && typeof item.config === 'object')
          .map(({ templateId, config }) => ({
            id: String(config?.id || `${templateId}:questionario-config`),
            tenantId,
            documentoTemplateId: templateId,
            codiciRischio: typeof config?.codiciRischio === 'string' ? config.codiciRischio : JSON.stringify(config?.codiciRischio || []),
            tipiVisitaMDL: typeof config?.tipiVisitaMDL === 'string' ? config.tipiVisitaMDL : JSON.stringify(config?.tipiVisitaMDL || []),
            specializzazione: config?.specializzazione ? String(config.specializzazione) : null,
            haScoring: config?.haScoring ? 1 : 0,
            scoringConfig: typeof config?.scoringConfig === 'string' ? config.scoringConfig : JSON.stringify(config?.scoringConfig || {}),
            sogliaCritica: config?.sogliaCritica ?? null,
            compilabileDa: config?.compilabileDa ? String(config.compilabileDa) : null,
            tempoStimato: config?.tempoStimato ?? null,
            istruzioniPaziente: config?.istruzioniPaziente ? String(config.istruzioniPaziente) : null,
            istruzioniMedico: config?.istruzioniMedico ? String(config.istruzioniMedico) : null,
            richiedeRevisione: config?.richiedeRevisione === false ? 0 : 1,
            validazioniCustom: typeof config?.validazioniCustom === 'string' ? config.validazioniCustom : JSON.stringify(config?.validazioniCustom || {}),
            periodicitaMesi: config?.periodicitaMesi ?? null,
            protocolloSanitarioId: config?.protocolloSanitarioId ? String(config.protocolloSanitarioId) : null,
            voceTariffarioId: config?.voceTariffarioId ? String(config.voceTariffarioId) : null,
            isPagamento: config?.isPagamento ? 1 : 0,
            prezzoDefault: config?.prezzoDefault ?? null,
            fatturabile: config?.fatturabile === false ? 0 : 1,
            createdAt: config?.createdAt ? String(config.createdAt) : undefined,
            updatedAt: config?.updatedAt ? String(config.updatedAt) : new Date().toISOString(),
          }))
        for (const row of normalized) {
          const existing = await window.desktopApi.db.query({ table: 'document_templates', where: { id: row.id }, limit: 1 }).catch(() => []) as DocumentTemplate[]
          if (existing[0]) await window.desktopApi.db.update({ table: 'document_templates', id: row.id, data: row })
          else await window.desktopApi.db.insert({ table: 'document_templates', data: row })
        }
        for (const row of normalizedConfigs) {
          const existing = await window.desktopApi.db.query({ table: 'questionari_medici_config', where: { id: row.id }, limit: 1 }).catch(() => []) as QuestionarioMedicoConfig[]
          if (existing[0]) await window.desktopApi.db.update({ table: 'questionari_medici_config', id: row.id, data: row })
          else await window.desktopApi.db.insert({ table: 'questionari_medici_config', data: row })
        }
        if (normalized.length > 0) documentTemplateRows = normalized
        if (normalizedConfigs.length > 0) configRows = normalizedConfigs as QuestionarioMedicoConfig[]
      } catch {
        if (documentTemplateRows.length === 0) setLoadError('Modelli non disponibili: sincronizza la modulistica dalla webapp.')
      }
    }
    const compiledDocumentRows = await window.desktopApi.db.query({
      table: 'documenti_compilati',
      where: { visitaId: visitId, _isDeleted: 0 },
      orderBy: { column: 'updatedAt', direction: 'DESC' }
    }).catch(() => []) as Array<Compilato & { documentoTemplateId?: string; datiCompilati?: string; updatedAt?: string; createdAt?: string }>
    const compiledRows = compiledDocumentRows.map(row => ({
        ...row,
        templateId: row.documentoTemplateId || row.templateId,
        risposte: row.datiCompilati || row.risposte || '{}',
        dataCompilazione: row.dataCompilazione || row.updatedAt || row.createdAt || null,
      }))
    documentTemplateRows = await window.desktopApi.db.query({ table: 'document_templates', where: { _isDeleted: 0, isActive: 1 }, orderBy: { column: 'ordine', direction: 'ASC' } }).catch(() => documentTemplateRows) as DocumentTemplate[]
    configRows = await window.desktopApi.db.query({ table: 'questionari_medici_config', where: { _isDeleted: 0 } }).catch(() => configRows) as QuestionarioMedicoConfig[]
    const configMap = new Map(configRows.map(row => [row.documentoTemplateId, row]))
    const templateRows = documentTemplateRows.filter((t, idx, all) => all.findIndex(x => x.id === t.id) === idx)
    const filteredFromDb = templateRows.filter(t => mode === 'questionari' ? isQuestionarioTemplate(t, configMap) : !isQuestionarioTemplate(t, configMap))
    setTemplates(filteredFromDb)
    setCompiled(compiledRows.filter(row => {
      const template = templateRows.find(t => t.id === row.templateId)
      return template ? (mode === 'questionari' ? isQuestionarioTemplate(template, configMap) : !isQuestionarioTemplate(template, configMap)) : mode === 'questionari'
    }))
    if (!selectedTemplate && filteredFromDb[0]) setSelectedTemplate(filteredFromDb[0].id)
  }, [accessToken, isOpen, mode, selectedTemplate, tenantId, visitId])

  useEffect(() => { void loadData() }, [loadData])

  const currentTemplate = templates.find(t => t.id === selectedTemplate)
  const fields = useMemo(() => parseFields(currentTemplate), [currentTemplate])
  const compiledByTemplate = useMemo(() => {
    const map = new Map<string, Compilato[]>()
    for (const row of compiled) {
      const list = map.get(row.templateId) || []
      list.push(row)
      map.set(row.templateId, list)
    }
    return map
  }, [compiled])
  const visibleTemplates = useMemo(() => {
    const term = search.trim().toLowerCase()
    return templates.filter(t => {
      if (mode === 'modulistica' && normalizePhase(t.fase) !== selectedPhase) return false
      return !term || [t.nome, t.descrizione, t.codice, t.tipo].filter(Boolean).join(' ').toLowerCase().includes(term)
    })
  }, [mode, search, selectedPhase, templates])
  const suggestedTemplates = useMemo(() => visibleTemplates.filter(t => !compiledByTemplate.has(t.id)).slice(0, 8), [compiledByTemplate, visibleTemplates])
  const selectedCompiled = editingId && editingId !== 'NEW' ? compiled.find(row => row.id === editingId) : null

  const resetToList = (): void => {
    setViewMode('list')
    setEditingId(null)
    setRisposte({})
  }

  const startNew = (templateId?: string): void => {
    const nextTemplateId = templateId || selectedTemplate || visibleTemplates[0]?.id || templates[0]?.id || ''
    const template = templates.find(t => t.id === nextTemplateId)
    setSelectedTemplate(nextTemplateId)
    setEditingId('NEW')
    setRisposte(buildDefaultRisposte(template))
    setViewMode('fill')
  }

  const startEdit = (row: Compilato, viewOnly = false): void => {
    setEditingId(row.id)
    setSelectedTemplate(row.templateId)
    setRisposte(parseRisposte(row.risposte))
    setViewMode(viewOnly || isReadOnly ? 'view' : 'fill')
  }

  const save = async (): Promise<void> => {
    if (!window.desktopApi || !selectedTemplate || !editingId) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const compiledPayload = { ...risposte, _modalita: mode, _fase: currentTemplate?.fase || selectedPhase }
      const data = {
        tenantId,
        visitaId: visitId,
        personId,
        documentoTemplateId: selectedTemplate,
        datiCompilati: JSON.stringify(compiledPayload),
        stato: 'BOZZA',
        dataCompilazione: now,
        updatedAt: now,
      }
      if (editingId === 'NEW') {
        const { id } = await window.desktopApi.db.insert({ table: 'documenti_compilati', data: { ...data, createdAt: now } }) as { id: string }
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'documenti_compilati', entityId: id, payload: data })
      } else {
        await window.desktopApi.db.update({ table: 'documenti_compilati', id: editingId, data })
        await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'documenti_compilati', entityId: editingId, payload: data })
      }
      resetToList()
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const renderTemplateCard = (template: DocumentTemplate, variant: 'suggested' | 'all'): JSX.Element => {
    const compilati = compiledByTemplate.get(template.id) || []
    return (
      <div key={`${variant}-${template.id}`} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{template.nome}</p>
            <p className="mt-0.5 text-xs text-gray-500">{template.descrizione || template.codice || template.tipo || 'Modello sincronizzato'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {template.richiedeFirma ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Firma paziente</span> : null}
              {template.richiedeFirmaMedico ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Firma medico</span> : null}
              {compilati.length > 0 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Compilato</span> : null}
            </div>
          </div>
          <button type="button" onClick={() => startNew(template.id)} disabled={isReadOnly} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" />
            {compilati.length > 0 ? 'Ricompila' : 'Compila'}
          </button>
        </div>
      </div>
    )
  }

  const renderField = (field: FieldDef): JSX.Element => {
    const key = fieldKey(field)
    const value = risposte[key]
    const type = String(field.tipo || field.type || 'text').toLowerCase()
    const required = field.obbligatorio || field.required
    const options = field.opzioni || field.options || []
    const label = `${fieldLabel(field)}${required ? ' *' : ''}`
    if (type.includes('boolean') || type === 'checkbox') {
      return (
        <label key={key} className="flex items-center gap-2 rounded-xl border border-gray-100 p-3 text-sm text-gray-700">
          <input type="checkbox" checked={!!value} onChange={e => setRisposte(prev => ({ ...prev, [key]: e.target.checked }))} disabled={isReadOnly || viewMode === 'view'} className="h-4 w-4 rounded border-gray-300 text-teal-600" />
          {label}
        </label>
      )
    }
    if (type.includes('multi')) {
      const selected = Array.isArray(value) ? value.map(String) : []
      return (
        <fieldset key={key} className="rounded-xl border border-gray-100 p-3">
          <legend className="px-1 text-xs font-medium text-gray-600">{label}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {options.map(opt => {
              const optValue = optionValue(opt)
              return (
                <label key={optValue} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selected.includes(optValue)}
                    disabled={isReadOnly || viewMode === 'view'}
                    onChange={e => setRisposte(prev => {
                      const current = Array.isArray(prev[key]) ? prev[key].map(String) : []
                      return { ...prev, [key]: e.target.checked ? [...current, optValue] : current.filter(v => v !== optValue) }
                    })}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                  />
                  {optionLabel(opt)}
                </label>
              )
            })}
          </div>
        </fieldset>
      )
    }
    if (type.includes('radio')) {
      return (
        <fieldset key={key} className="rounded-xl border border-gray-100 p-3">
          <legend className="px-1 text-xs font-medium text-gray-600">{label}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {options.map(opt => {
              const optValue = optionValue(opt)
              return (
                <label key={optValue} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name={key} value={optValue} checked={value === optValue} disabled={isReadOnly || viewMode === 'view'} onChange={() => setRisposte(prev => ({ ...prev, [key]: optValue }))} className="h-4 w-4 border-gray-300 text-teal-600" />
                  {optionLabel(opt)}
                </label>
              )
            })}
          </div>
        </fieldset>
      )
    }
    return (
      <label key={key} className="block text-xs font-medium text-gray-600">
        {label}
        {type.includes('textarea') || type.includes('richtext') ? (
          <textarea value={(value as string) || ''} onChange={e => setRisposte(prev => ({ ...prev, [key]: e.target.value }))} readOnly={isReadOnly || viewMode === 'view'} rows={4} placeholder={field.placeholder} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        ) : type.includes('select') || type.includes('dropdown') ? (
          <ElegantSelect
            value={(value as string) || ''}
            onChange={selected => setRisposte(prev => ({ ...prev, [key]: selected }))}
            disabled={isReadOnly || viewMode === 'view'}
            options={[{ value: '', label: 'Seleziona...' }, ...options.map(opt => ({ value: optionValue(opt), label: optionLabel(opt) }))]}
            className="mt-1"
          />
        ) : type.includes('date') ? (
          <ElegantDateInput
            value={(value as string) || ''}
            onChange={next => setRisposte(prev => ({ ...prev, [key]: next }))}
            clearable
            disabled={isReadOnly || viewMode === 'view'}
            className="mt-1"
          />
        ) : (
          <input
            type={type.includes('number') || type.includes('scale') ? 'number' : 'text'}
            value={(value as string | number) || ''}
            onChange={e => setRisposte(prev => ({ ...prev, [key]: type.includes('number') || type.includes('scale') ? Number(e.target.value) : e.target.value }))}
            readOnly={isReadOnly || viewMode === 'view'}
            placeholder={field.placeholder}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        )}
      </label>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {viewMode !== 'list' && <button type="button" onClick={resetToList} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-4 w-4" /></button>}
            <Icon className="h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-500">
                {mode === 'questionari' ? 'Compila i questionari clinici sincronizzati dalla webapp.' : 'Compila la modulistica per fase visita come nella webapp.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {viewMode === 'list' ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {mode === 'modulistica' && (
              <div className="mb-4 flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                {MODULISTICA_PHASES.map(phase => (
                  <button key={phase.id} type="button" onClick={() => setSelectedPhase(phase.id)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${selectedPhase === phase.id ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {phase.label}
                  </button>
                ))}
              </div>
            )}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Cerca ${title.toLowerCase()}...`} className="min-w-0 flex-1 border-0 text-sm outline-none" />
            </div>
            {loadError && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{loadError}</p>}

            {mode === 'questionari' && (
              <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                I questionari disponibili sono gli stessi modelli attivi della webapp. In offline vengono compilati localmente e accodati alla sincronizzazione.
              </div>
            )}

            {compiled.length > 0 && (
              <section className="mb-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Già compilati</h3>
                <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
                  {compiled.map(row => {
                    const template = templates.find(t => t.id === row.templateId)
                    return (
                      <div key={row.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{template?.nome || title}</p>
                          <p className="text-xs text-gray-500">{row.dataCompilazione ? new Date(row.dataCompilazione).toLocaleString('it-IT') : 'Bozza'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => startEdit(row, true)} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50" title="Visualizza"><Eye className="h-4 w-4" /></button>
                          {!isReadOnly && <button type="button" onClick={() => startEdit(row)} className="rounded-lg border border-teal-200 p-2 text-teal-700 hover:bg-teal-50" title="Continua"><Pencil className="h-4 w-4" /></button>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {mode === 'questionari' ? 'Suggeriti per questa visita' : 'Moduli della fase selezionata'}
              </h3>
              <div className="grid gap-3">
                {(mode === 'questionari' ? suggestedTemplates : visibleTemplates).length === 0 ? (
                  <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400">Nessun modello disponibile</p>
                ) : (mode === 'questionari' ? suggestedTemplates : visibleTemplates).map(t => renderTemplateCard(t, 'suggested'))}
              </div>
            </section>

            {mode === 'questionari' && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Tutti i questionari</h3>
                <div className="grid gap-3">
                  {visibleTemplates.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400">Nessun questionario trovato</p>
                  ) : visibleTemplates.map(t => renderTemplateCard(t, 'all'))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{viewMode === 'view' ? 'Visualizzazione' : editingId === 'NEW' ? 'Nuova compilazione' : 'Modifica compilazione'}</p>
              <h3 className="mt-1 text-lg font-semibold text-gray-900">{currentTemplate?.nome || title}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {currentTemplate?.descrizione || currentTemplate?.codice || currentTemplate?.tipo || (selectedCompiled?.dataCompilazione ? `Compilato il ${new Date(selectedCompiled.dataCompilazione).toLocaleString('it-IT')}` : 'Modello visita')}
              </p>
            </div>

            {editingId === 'NEW' && (
              <label className="mb-4 block text-xs font-medium text-gray-600">
                Modello
                <ElegantSelect value={selectedTemplate} onChange={value => { const template = templates.find(t => t.id === value); setSelectedTemplate(value); setRisposte(buildDefaultRisposte(template)) }} options={visibleTemplates.map(t => ({ value: t.id, label: t.nome }))} className="mt-1" />
              </label>
            )}

            <div className="grid gap-4">
              {fields.length === 0 ? (
                <textarea value={(risposte.note as string) || ''} onChange={e => setRisposte(prev => ({ ...prev, note: e.target.value }))} readOnly={isReadOnly || viewMode === 'view'} rows={10} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" placeholder="Compila contenuto..." />
              ) : fields.map(renderField)}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button onClick={resetToList} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Indietro</button>
              {viewMode === 'view' && !isReadOnly && selectedCompiled && (
                <button onClick={() => setViewMode('fill')} className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
                  <Pencil className="h-4 w-4" /> Modifica
                </button>
              )}
              {viewMode === 'fill' && !isReadOnly && (
                <button onClick={save} disabled={saving || !selectedTemplate} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? 'Salvataggio...' : 'Salva'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
