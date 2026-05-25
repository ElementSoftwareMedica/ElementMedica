import { useState, useEffect } from 'react'
import { Briefcase, Shield, FileText, ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

// ============================================================
// Types
// ============================================================

interface Mansione {
  id: string
  nome: string
  codice: string | null
  rischi: string // JSON array
  rischiAssociati?: string | null
  companyName: string | null
}

interface Protocollo {
  id: string
  nome: string
  mansioneId: string | null
  prestazioni: string // JSON array
  mansioneNome: string | null
}

interface Rischio {
  id?: string
  nome: string
  livello: string
  categoria?: string
}

interface RischioPersonalizzato {
  id: string
  personId: string
  codiceRischio: string
  livello: string
  categoria: string
  descrizioneEsposizione: string | null
  note: string | null
}

const LIVELLO_COLORS: Record<string, string> = {
  BASSO: 'bg-green-100 text-green-800',
  MEDIO: 'bg-yellow-100 text-yellow-800',
  ALTO: 'bg-orange-100 text-orange-800',
  MOLTO_ALTO: 'bg-red-100 text-red-800',
}

const CATEGORIE_RISCHIO: Record<string, { code: string; label: string }[]> = {
  FISICI: [
    { code: 'RUM', label: 'Rumore' }, { code: 'VIB_MB', label: 'Vibrazioni mano-braccio' },
    { code: 'VIB_WBV', label: 'Vibrazioni corpo intero' }, { code: 'RAD_ION', label: 'Radiazioni ionizzanti' },
    { code: 'RAD_NIR', label: 'Radiazioni non ionizzanti' }, { code: 'CEM', label: 'Campi elettromagnetici' },
    { code: 'MIC', label: 'Microclima severo' },
  ],
  CHIMICI: [
    { code: 'CHI', label: 'Agenti chimici' }, { code: 'CAN', label: 'Cancerogeni/mutageni' },
    { code: 'AMI', label: 'Amianto' }, { code: 'PIO', label: 'Piombo' }, { code: 'POL', label: 'Polveri/silice' },
  ],
  BIOLOGICI: [{ code: 'BIO', label: 'Agenti biologici' }],
  ERGONOMICI: [
    { code: 'MMC', label: 'Movimentazione carichi' }, { code: 'MOV_RIP', label: 'Movimenti ripetitivi' },
    { code: 'POS', label: 'Posture incongrue' },
  ],
  ORGANIZZATIVI: [
    { code: 'NOT', label: 'Lavoro notturno' }, { code: 'VDT', label: 'Videoterminale' },
    { code: 'SLC', label: 'Stress lavoro-correlato' },
  ],
  SPECIFICI: [
    { code: 'QUO', label: 'Lavoro in quota' }, { code: 'SPA_CON', label: 'Spazi confinati' },
    { code: 'GUI_MEZ', label: 'Guida mezzi' }, { code: 'ISO', label: 'Lavoro isolato' },
  ],
  SETTORIALI: [
    { code: 'CAR_ELE', label: 'Carrelli elevatori' }, { code: 'ELE', label: 'Rischio elettrico' },
    { code: 'INC', label: 'Incendio/emergenza' }, { code: 'ALC', label: 'Alcol/sostanze' },
  ],
}

const ALL_RISCHI = Object.entries(CATEGORIE_RISCHIO).flatMap(([cat, items]) =>
  items.map(r => ({ ...r, categoria: cat }))
)

const RISCHIO_ENUM_LABELS: Record<string, string> = {
  RUMORE: 'Rumore',
  VIBRAZIONI: 'Vibrazioni',
  VIBRAZIONI_MANO_BRACCIO: 'Vibrazioni mano-braccio',
  VIBRAZIONI_CORPO_INTERO: 'Vibrazioni corpo intero',
  RADIAZIONI_IONIZZANTI: 'Radiazioni ionizzanti',
  RADIAZIONI_NON_IONIZZANTI: 'Radiazioni non ionizzanti',
  CAMPI_ELETTROMAGNETICI: 'Campi elettromagnetici',
  MICROCLIMA: 'Microclima',
  CHIMICO: 'Agenti chimici',
  AGENTI_CHIMICI: 'Agenti chimici',
  CANCEROGENO: 'Cancerogeni/mutageni',
  AMIANTO: 'Amianto',
  BIOLOGICO: 'Agenti biologici',
  MMC: 'Movimentazione manuale carichi',
  MOVIMENTI_RIPETITIVI: 'Movimenti ripetitivi',
  POSTURE_INCONGRUE: 'Posture incongrue',
  NOTTURNO: 'Lavoro notturno',
  VIDEOTERMINALE: 'Videoterminale',
  STRESS_LAVORO_CORRELATO: 'Stress lavoro-correlato',
  LAVORO_IN_QUOTA: 'Lavoro in quota',
  SPAZI_CONFINATI: 'Spazi confinati',
  GUIDA_MEZZI: 'Guida mezzi',
  CARRELLI_ELEVATORI: 'Carrelli elevatori',
  ELETTRICO: 'Rischio elettrico',
  ALCOL: 'Alcol/sostanze',
}

function getLabelForCode(code: string): string {
  const normalized = code.trim().toUpperCase()
  return ALL_RISCHI.find(r => r.code === normalized)?.label ?? RISCHIO_ENUM_LABELS[normalized] ?? normalized.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================================
// Component
// ============================================================

interface Props {
  personId: string
  tenantId: string
  isReadOnly: boolean
}

function normalizeRischio(raw: unknown): Rischio | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const code = String(r.codiceRischio || r.codice || r.code || '')
  const nome = String(r.nome || r.label || r.descrizione || r.rischioNome || getLabelForCode(code) || '').trim()
  if (!nome) return null
  return {
    id: r.id ? String(r.id) : undefined,
    nome,
    livello: String(r.livello || r.riskLevel || 'MEDIO'),
    categoria: r.categoria ? String(r.categoria) : undefined,
  }
}

export function MDLInfoCardOffline({ personId, tenantId, isReadOnly }: Props): JSX.Element {
  const [mansioni, setMansioni] = useState<Mansione[]>([])
  const [allMansioni, setAllMansioni] = useState<Mansione[]>([])
  const [protocolli, setProtocolli] = useState<Protocollo[]>([])
  const [allProtocolli, setAllProtocolli] = useState<Protocollo[]>([])
  const [patientProtocolloId, setPatientProtocolloId] = useState('')
  const [rischiPersonalizzati, setRischiPersonalizzati] = useState<RischioPersonalizzato[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMansione, setExpandedMansione] = useState<string | null>(null)
  const [showRischi, setShowRischi] = useState(false)
  const [showRischiPersonalizzati, setShowRischiPersonalizzati] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ codiceRischio: '', livello: 'MEDIO', categoria: 'FISICI' })
  const [showMansioneForm, setShowMansioneForm] = useState(false)
  const [mansioneForm, setMansioneForm] = useState({ mansioneId: '', nome: '', protocolloId: '' })
  const [isSaving, setIsSaving] = useState(false)

  async function loadRischiPersonalizzati() {
    if (!window.desktopApi?.rischi) return
    const rows = await window.desktopApi.rischi.getForWorker(personId)
    setRischiPersonalizzati(rows as RischioPersonalizzato[])
  }

  useEffect(() => {
    async function load() {
      if (!window.desktopApi || !personId) return
      setLoading(true)

      try {
        // 1. Load mansione assignments for this person
        const assignments = await window.desktopApi.db.query({
          table: 'lavoratore_mansioni',
          where: { personId, _isDeleted: 0 }
        }) as Array<{ mansioneId: string }>
        const patientRows = await window.desktopApi.db.query({
          table: 'patients',
          where: { id: personId, _isDeleted: 0 },
          limit: 1
        }) as Array<{ protocolloSanitarioId: string | null }>
        setPatientProtocolloId(patientRows[0]?.protocolloSanitarioId || '')

        const mansioneIds = assignments.map(a => a.mansioneId)

        // 2. Load all mansioni and filter
        const allMansioni = await window.desktopApi.db.query({
          table: 'mansioni',
          where: { _isDeleted: 0 }
        }) as Mansione[]

        const filtered = allMansioni.filter(m => mansioneIds.includes(m.id))
        setAllMansioni(allMansioni)
        setMansioni(filtered)

        // 3. Load protocolli for these mansioni
        const allProtocolli = await window.desktopApi.db.query({
          table: 'protocolli',
          where: { _isDeleted: 0 }
        }) as Protocollo[]
        setAllProtocolli(allProtocolli)

        const filteredP = allProtocolli.filter(p =>
          p.id === patientRows[0]?.protocolloSanitarioId || (p.mansioneId && mansioneIds.includes(p.mansioneId))
        )
        setProtocolli(filteredP)

        // 4. Load per-worker personalized risks
        await loadRischiPersonalizzati()
      } catch {
        // Silent fail — card just shows empty
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [personId])

  async function handleAddRischio() {
    if (!addForm.codiceRischio || !window.desktopApi?.rischi || isSaving) return
    setIsSaving(true)
    try {
      const cat = ALL_RISCHI.find(r => r.code === addForm.codiceRischio)?.categoria || addForm.categoria
      await window.desktopApi.rischi.add(personId, tenantId, {
        codiceRischio: addForm.codiceRischio,
        livello: addForm.livello,
        categoria: cat,
      })
      setAddForm({ codiceRischio: '', livello: 'MEDIO', categoria: 'FISICI' })
      setShowAddForm(false)
      await loadRischiPersonalizzati()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemoveRischio(id: string) {
    if (!window.desktopApi?.rischi) return
    await window.desktopApi.rischi.remove(id)
    setRischiPersonalizzati(prev => prev.filter(r => r.id !== id))
  }

  async function reloadAll() {
    const assignments = await window.desktopApi.db.query({ table: 'lavoratore_mansioni', where: { personId, _isDeleted: 0 } }) as Array<{ mansioneId: string }>
    const ids = assignments.map(a => a.mansioneId)
    const mRows = await window.desktopApi.db.query({ table: 'mansioni', where: { _isDeleted: 0 }, orderBy: { column: 'nome', direction: 'ASC' } }) as Mansione[]
    const pRows = await window.desktopApi.db.query({ table: 'protocolli', where: { _isDeleted: 0 }, orderBy: { column: 'nome', direction: 'ASC' } }) as Protocollo[]
    setAllMansioni(mRows)
    setAllProtocolli(pRows)
    setMansioni(mRows.filter(m => ids.includes(m.id)))
    setProtocolli(pRows.filter(p => p.id === patientProtocolloId || (p.mansioneId && ids.includes(p.mansioneId))))
  }

  async function handleSaveMansione() {
    if (!window.desktopApi || isReadOnly || isSaving) return
    setIsSaving(true)
    try {
      const now = new Date().toISOString()
      let mansioneId = mansioneForm.mansioneId
      if (!mansioneId && mansioneForm.nome.trim()) {
        mansioneId = uuidv4()
        const codice = `DESK-${mansioneId.slice(0, 8).toUpperCase()}`
        const created = await window.desktopApi.db.insert({
          table: 'mansioni',
          data: {
            id: mansioneId,
            tenantId,
            nome: mansioneForm.nome.trim(),
            descrizione: null,
            codice,
            rischi: '[]',
            rischiAssociati: '[]',
            isActive: 1,
            createdAt: now,
            updatedAt: now,
          }
        }) as { id: string }
        mansioneId = created.id
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'mansioni', entityId: mansioneId, payload: { id: mansioneId, tenantId, nome: mansioneForm.nome.trim(), codice, descrizione: null } })
      }
      if (mansioneId) {
        const exists = mansioni.some(m => m.id === mansioneId)
        if (!exists) {
          const link = { id: uuidv4(), tenantId, personId, mansioneId, dataInizio: now, isPrimary: mansioni.length === 0 ? 1 : 0, createdAt: now, updatedAt: now }
          await window.desktopApi.db.insert({ table: 'lavoratore_mansioni', data: link })
          await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'lavoratore_mansioni', entityId: link.id, payload: link })
        }
      }
      if (mansioneForm.protocolloId) await handleChangeProtocollo(mansioneForm.protocolloId)
      setMansioneForm({ mansioneId: '', nome: '', protocolloId: '' })
      setShowMansioneForm(false)
      await reloadAll()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemoveMansione(mansioneId: string) {
    if (!window.desktopApi || isReadOnly) return
    const rows = await window.desktopApi.db.query({ table: 'lavoratore_mansioni', where: { personId, mansioneId, _isDeleted: 0 }, limit: 1 }) as Array<{ id: string }>
    if (rows[0]) {
      await window.desktopApi.db.deleteWhere({ table: 'lavoratore_mansioni', where: { id: rows[0].id } })
      await window.desktopApi.sync.enqueue({ type: 'DELETE', entity: 'lavoratore_mansioni', entityId: rows[0].id, payload: { personId, mansioneId } })
    }
    await reloadAll()
  }

  async function handleRenameMansione(mansioneId: string, nome: string) {
    if (!window.desktopApi || isReadOnly || !nome.trim()) return
    const data = { nome: nome.trim(), updatedAt: new Date().toISOString() }
    await window.desktopApi.db.update({ table: 'mansioni', id: mansioneId, data })
    await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'mansioni', entityId: mansioneId, payload: data })
    setMansioni(prev => prev.map(m => m.id === mansioneId ? { ...m, nome: data.nome } : m))
  }

  async function handleChangeProtocollo(protocolloId: string) {
    if (!window.desktopApi || isReadOnly) return
    await window.desktopApi.db.update({ table: 'patients', id: personId, data: { protocolloSanitarioId: protocolloId || null } })
    await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'patients', entityId: personId, payload: { protocolloSanitarioId: protocolloId || null } })
    setPatientProtocolloId(protocolloId)
  }

  // Aggregate all risks from all mansioni
  const allRischi: Rischio[] = mansioni.flatMap(m => {
    try {
      const combined = [...(JSON.parse(m.rischi || '[]') as unknown[]), ...(JSON.parse(m.rischiAssociati || '[]') as unknown[])]
      return combined.map(normalizeRischio).filter(Boolean) as Rischio[]
    } catch {
      return []
    }
  })

  // Deduplicate by nome
  const uniqueRischi = allRischi.reduce<Rischio[]>((acc, r) => {
    if (!acc.find(x => x.nome === r.nome)) acc.push(r)
    return acc
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card divide-y divide-gray-100">
      {/* Mansioni */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Briefcase className="w-3.5 h-3.5 text-teal-600" />
          Mansioni ({mansioni.length})
        </h3>
        {!isReadOnly && (
          <button onClick={() => setShowMansioneForm(prev => !prev)} className="mb-2 inline-flex items-center gap-1 rounded-lg border border-teal-200 px-2 py-1 text-[11px] font-medium text-teal-700 hover:bg-teal-50">
            <Plus className="h-3 w-3" />
            Mansione
          </button>
        )}
        {showMansioneForm && (
          <div className="mb-3 space-y-2 rounded-xl border border-teal-100 bg-teal-50 p-3">
            <select value={mansioneForm.mansioneId} onChange={e => setMansioneForm(f => ({ ...f, mansioneId: e.target.value, nome: '' }))} className="w-full rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-xs">
              <option value="">Nuova mansione o seleziona dal catalogo...</option>
              {allMansioni.filter(m => !mansioni.some(x => x.id === m.id)).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            {!mansioneForm.mansioneId && (
              <input value={mansioneForm.nome} onChange={e => setMansioneForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome nuova mansione" className="w-full rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-xs" />
            )}
            <select value={mansioneForm.protocolloId} onChange={e => setMansioneForm(f => ({ ...f, protocolloId: e.target.value }))} className="w-full rounded-lg border border-teal-200 bg-white px-2 py-1.5 text-xs">
              <option value="">Protocollo sanitario opzionale...</option>
              {allProtocolli.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <button onClick={handleSaveMansione} disabled={isSaving || (!mansioneForm.mansioneId && !mansioneForm.nome.trim())} className="w-full rounded-lg bg-teal-600 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              {isSaving ? 'Salvataggio...' : 'Salva mansione'}
            </button>
          </div>
        )}
        {mansioni.length === 0 ? (
          <p className="text-xs text-gray-400">Nessuna mansione assegnata</p>
        ) : (
          <div className="space-y-1">
            {mansioni.map(m => {
              const isExpanded = expandedMansione === m.id
              const rischi: Rischio[] = (() => {
                try {
                  const combined = [...(JSON.parse(m.rischi || '[]') as unknown[]), ...(JSON.parse(m.rischiAssociati || '[]') as unknown[])]
                  return combined.map(normalizeRischio).filter(Boolean) as Rischio[]
                } catch { return [] }
              })()

              return (
                <div key={m.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedMansione(isExpanded ? null : m.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <input
                        value={m.nome}
                        readOnly={isReadOnly}
                        onChange={e => setMansioni(prev => prev.map(x => x.id === m.id ? { ...x, nome: e.target.value } : x))}
                        onBlur={e => { void handleRenameMansione(m.id, e.target.value) }}
                        onClick={e => e.stopPropagation()}
                        className="w-full rounded border border-transparent bg-transparent px-1 text-xs font-medium text-gray-900 outline-none focus:border-teal-200 focus:bg-white"
                      />
                      {m.codice && <p className="text-[10px] text-gray-400">{m.codice}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {rischi.length > 0 && (
                        <span className="text-[10px] text-gray-400">{rischi.length} rischi</span>
                      )}
                      {!isReadOnly && (
                        <button onClick={(e) => { e.stopPropagation(); void handleRemoveMansione(m.id) }} className="rounded p-0.5 text-gray-300 hover:bg-red-50 hover:text-red-600" title="Rimuovi mansione">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                    </div>
                  </div>
                  {isExpanded && rischi.length > 0 && (
                    <div className="ml-3 pl-2 border-l-2 border-gray-100 space-y-0.5 py-1">
                      {rischi.map((r, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 truncate">{r.nome}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${LIVELLO_COLORS[r.livello] || 'bg-gray-100 text-gray-600'}`}>
                            {r.livello}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Protocolli */}
      {protocolli.length > 0 && (
        <div className="p-4">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Protocolli ({protocolli.length})
          </h3>
          <div className="space-y-1.5">
            {protocolli.map(p => {
              const prestazioni: Array<{ prestazioneNome?: string; periodicitaMesi?: number }> = (() => {
                try { return JSON.parse(p.prestazioni || '[]') } catch { return [] }
              })()

              return (
                <div key={p.id} className="px-2 py-1.5 rounded-lg bg-gray-50">
                  <p className="text-xs font-medium text-gray-900">{p.nome}</p>
                  {p.mansioneNome && (
                    <p className="text-[10px] text-gray-400">Mansione: {p.mansioneNome}</p>
                  )}
                  {prestazioni.length > 0 && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {prestazioni.length} prestazion{prestazioni.length === 1 ? 'e' : 'i'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {!isReadOnly && allProtocolli.length > 0 && (
        <div className="p-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Protocollo sanitario associato
            <select value={patientProtocolloId} onChange={e => { void handleChangeProtocollo(e.target.value) }} className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-normal normal-case">
              <option value="">Nessun protocollo diretto</option>
              {allProtocolli.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        </div>
      )}

      {/* All Risks Summary */}
      {uniqueRischi.length > 0 && (
        <div className="p-4">
          <button
            onClick={() => setShowRischi(!showRischi)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-orange-500" />
              Rischi ({uniqueRischi.length})
            </h3>
            {showRischi ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
          </button>
          {showRischi && (
            <div className="mt-2 space-y-0.5">
              {uniqueRischi.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg hover:bg-gray-50">
                  <span className="text-gray-700">{r.nome}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${LIVELLO_COLORS[r.livello] || 'bg-gray-100 text-gray-600'}`}>
                    {r.livello}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rischi Personalizzati */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowRischiPersonalizzati(!showRischiPersonalizzati)}
            className="flex items-center gap-1.5"
          >
            <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-violet-600" />
              Rischi Personalizzati ({rischiPersonalizzati.length})
            </h3>
            {showRischiPersonalizzati ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={isReadOnly}
            className="p-1 rounded-lg hover:bg-violet-50 text-violet-600 transition-colors"
            title="Aggiungi rischio personalizzato"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-3 p-3 bg-violet-50 rounded-xl border border-violet-100 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-violet-900">Aggiungi rischio</p>
              <button onClick={() => setShowAddForm(false)} className="text-violet-400 hover:text-violet-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <select
              value={addForm.codiceRischio}
              onChange={e => {
                const cat = ALL_RISCHI.find(r => r.code === e.target.value)?.categoria || 'FISICI'
                setAddForm(f => ({ ...f, codiceRischio: e.target.value, categoria: cat }))
              }}
              className="w-full text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
            >
              <option value="">Seleziona rischio...</option>
              {Object.entries(CATEGORIE_RISCHIO).map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items.map(r => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={addForm.livello}
              onChange={e => setAddForm(f => ({ ...f, livello: e.target.value }))}
              className="w-full text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
            >
              <option value="BASSO">Basso</option>
              <option value="MEDIO">Medio</option>
              <option value="ALTO">Alto</option>
              <option value="MOLTO_ALTO">Molto Alto</option>
            </select>
            <button
              onClick={handleAddRischio}
              disabled={!addForm.codiceRischio || isSaving}
              className="w-full text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-1.5 font-medium disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Salvataggio...' : 'Aggiungi'}
            </button>
          </div>
        )}

        {showRischiPersonalizzati && (
          <div className="space-y-0.5">
            {rischiPersonalizzati.length === 0 ? (
              <p className="text-xs text-gray-400">Nessun rischio personalizzato</p>
            ) : (
              rischiPersonalizzati.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg hover:bg-gray-50 group">
                  <div className="min-w-0">
                    <span className="text-gray-700">{getLabelForCode(r.codiceRischio)}</span>
                    {r.note && <p className="text-[10px] text-gray-400 truncate">{r.note}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${LIVELLO_COLORS[r.livello] || 'bg-gray-100 text-gray-600'}`}>
                      {r.livello}
                    </span>
                    <button
                      onClick={() => handleRemoveRischio(r.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
