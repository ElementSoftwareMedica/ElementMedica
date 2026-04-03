import { useState, useEffect } from 'react'
import { Briefcase, Shield, FileText, ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react'

// ============================================================
// Types
// ============================================================

interface Mansione {
  id: string
  nome: string
  codice: string | null
  rischi: string // JSON array
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

function getLabelForCode(code: string): string {
  return ALL_RISCHI.find(r => r.code === code)?.label ?? code
}

// ============================================================
// Component
// ============================================================

interface Props {
  personId: string
}

export function MDLInfoCardOffline({ personId }: Props): JSX.Element {
  const [mansioni, setMansioni] = useState<Mansione[]>([])
  const [protocolli, setProtocolli] = useState<Protocollo[]>([])
  const [rischiPersonalizzati, setRischiPersonalizzati] = useState<RischioPersonalizzato[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMansione, setExpandedMansione] = useState<string | null>(null)
  const [showRischi, setShowRischi] = useState(false)
  const [showRischiPersonalizzati, setShowRischiPersonalizzati] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ codiceRischio: '', livello: 'MEDIO', categoria: 'FISICI' })
  const [isSaving, setIsSaving] = useState(false)

  const tenantId = (window as unknown as { __tenantId?: string }).__tenantId || ''

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

        const mansioneIds = assignments.map(a => a.mansioneId)

        // 2. Load all mansioni and filter
        const allMansioni = await window.desktopApi.db.query({
          table: 'mansioni',
          where: { _isDeleted: 0 }
        }) as Mansione[]

        const filtered = allMansioni.filter(m => mansioneIds.includes(m.id))
        setMansioni(filtered)

        // 3. Load protocolli for these mansioni
        const allProtocolli = await window.desktopApi.db.query({
          table: 'protocolli',
          where: { _isDeleted: 0 }
        }) as Protocollo[]

        const filteredP = allProtocolli.filter(p =>
          p.mansioneId && mansioneIds.includes(p.mansioneId)
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

  // Aggregate all risks from all mansioni
  const allRischi: Rischio[] = mansioni.flatMap(m => {
    try {
      return JSON.parse(m.rischi || '[]') as Rischio[]
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

  if (mansioni.length === 0 && protocolli.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
        <p className="text-xs text-gray-400 text-center">Nessuna informazione MDL disponibile</p>
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
        {mansioni.length === 0 ? (
          <p className="text-xs text-gray-400">Nessuna mansione assegnata</p>
        ) : (
          <div className="space-y-1">
            {mansioni.map(m => {
              const isExpanded = expandedMansione === m.id
              const rischi: Rischio[] = (() => {
                try { return JSON.parse(m.rischi || '[]') } catch { return [] }
              })()

              return (
                <div key={m.id}>
                  <button
                    onClick={() => setExpandedMansione(isExpanded ? null : m.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{m.nome}</p>
                      {m.codice && <p className="text-[10px] text-gray-400">{m.codice}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {rischi.length > 0 && (
                        <span className="text-[10px] text-gray-400">{rischi.length} rischi</span>
                      )}
                      {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                    </div>
                  </button>
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
