import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  Search,
  RefreshCw,
  AlertTriangle,
  Shield,
  ChevronRight,
  FileText,
  Pencil,
  X,
  Check,
  Clock,
  Tag
} from 'lucide-react'
import { normalizeProtocolloPrestazioni, type ProtocolloPrestazioneRow } from '../utils/protocolloSanitario'

interface Mansione {
  id: string
  _serverId: string | null
  nome: string | null
  descrizione: string | null
  codice: string | null
  companyName: string | null
  isActive: number
}

// Actual structure from server API (MansioneRischio Prisma model)
interface RischioMansione {
  id?: string
  mansioneId: string
  codiceRischio: string | null
  livello: string
  categoria: string | null
  fonteRischio: string | null
  note: string | null
}

interface Protocollo {
  id: string
  nome: string | null
  mansioneId: string | null
  isActive: number
}

interface EditForm {
  nome: string
  codice: string
  descrizione: string
}

const LIVELLO_COLORS: Record<string, { bg: string; text: string }> = {
  MOLTO_ALTO: { bg: 'bg-red-100', text: 'text-red-800' },
  ALTO: { bg: 'bg-red-50', text: 'text-red-700' },
  MEDIO: { bg: 'bg-orange-50', text: 'text-orange-700' },
  BASSO: { bg: 'bg-green-50', text: 'text-green-700' },
  NON_RILEVANTE: { bg: 'bg-gray-50', text: 'text-gray-500' }
}

function formatPeriodicity(mesi: number | null | undefined): string {
  if (!mesi || mesi <= 0) return 'su indicazione'
  if (mesi >= 12 && mesi % 12 === 0) {
    const anni = mesi / 12
    return `ogni ${anni} ann${anni === 1 ? 'o' : 'i'}`
  }
  return `ogni ${mesi} mes${mesi === 1 ? 'e' : 'i'}`
}

export function MansioniPage(): JSX.Element {
  const [mansioni, setMansioni] = useState<Mansione[]>([])
  const [protocolliMap, setProtocolliMap] = useState<Map<string, Protocollo>>(new Map())
  const [rischiByMansione, setRischiByMansione] = useState<Map<string, RischioMansione[]>>(new Map())
  const [prestazioniByProtocollo, setPrestazioniByProtocollo] = useState<Map<string, ProtocolloPrestazioneRow[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ nome: '', codice: '', descrizione: '' })
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const [mansioniRows, protocolliRows, rischiRows, protocolloPrestazioniRows] = await Promise.all([
        window.desktopApi.db.query({
          table: 'mansioni',
          where: { _isDeleted: 0 },
          orderBy: { column: 'nome', direction: 'ASC' }
        }),
        window.desktopApi.db.query({
          table: 'protocolli',
          where: { _isDeleted: 0 }
        }),
        window.desktopApi.db.query({
          table: 'mansione_rischi',
          where: { _isDeleted: 0 }
        }).catch(() => []),
        window.desktopApi.db.query({
          table: 'protocollo_prestazioni',
          where: { _isDeleted: 0 }
        }).catch(() => [])
      ])
      setMansioni(mansioniRows as Mansione[])
      const rmap = new Map<string, RischioMansione[]>()
      for (const rischio of rischiRows as RischioMansione[]) {
        if (!rischio.mansioneId) continue
        rmap.set(rischio.mansioneId, [...(rmap.get(rischio.mansioneId) || []), rischio])
      }
      setRischiByMansione(rmap)
      // Build map mansioneId → protocollo (one protocollo per mansione)
      const pmap = new Map<string, Protocollo>()
      for (const p of protocolliRows as Protocollo[]) {
        if (p.mansioneId && !pmap.has(p.mansioneId)) {
          pmap.set(p.mansioneId, p)
        }
      }
      setProtocolliMap(pmap)
      const ppmap = new Map<string, ProtocolloPrestazioneRow[]>()
      for (const row of protocolloPrestazioniRows as Array<ProtocolloPrestazioneRow & { protocolloId?: string }>) {
        if (!row.protocolloId) continue
        ppmap.set(row.protocolloId, [...(ppmap.get(row.protocolloId) || []), row])
      }
      setPrestazioniByProtocollo(ppmap)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleStartEdit = (m: Mansione): void => {
    setEditingId(m.id)
    setEditForm({
      nome: m.nome || '',
      codice: m.codice || '',
      descrizione: m.descrizione || ''
    })
  }

  const handleCancelEdit = (): void => {
    setEditingId(null)
    setEditForm({ nome: '', codice: '', descrizione: '' })
  }

  const handleSaveEdit = async (mansioneId: string): Promise<void> => {
    if (!editForm.nome.trim()) return
    setSaving(true)
    try {
      const updateData = {
        nome: editForm.nome.trim(),
        codice: editForm.codice.trim() || null,
        descrizione: editForm.descrizione.trim() || null
      }
      await window.desktopApi.db.update({ table: 'mansioni', id: mansioneId, data: updateData })
      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'mansione',
        entityId: mansioneId,
        payload: updateData
      })
      setMansioni(prev => prev.map(m => m.id === mansioneId ? { ...m, ...updateData } : m))
      setEditingId(null)
    } catch { /* silent */ }
    setSaving(false)
  }

  const filtered = mansioni.filter(m => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return [m.nome, m.codice, m.companyName, m.descrizione].some(f => f?.toLowerCase().includes(term))
  })

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-teal-600" />
          Mansioni
        </h1>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aggiorna
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cerca per nome mansione, codice, azienda..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      <p className="text-xs text-gray-500">{filtered.length} mansion{filtered.length === 1 ? 'e' : 'i'}</p>

      {/* Mansioni List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {mansioni.length === 0
              ? 'Nessuna mansione scaricata. Scarica i dati dalla Dashboard.'
              : 'Nessuna mansione corrisponde alla ricerca.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => {
            const rischi = rischiByMansione.get(m.id) || []
            const isExpanded = expandedId === m.id
            const isEditing = editingId === m.id
            const protocollo = protocolliMap.get(m.id) || protocolliMap.get(m._serverId || '')

            return (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-card hover:shadow-card-hover transition-all overflow-hidden"
              >
                {/* Card header */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>

                  {isEditing ? (
                    /* Inline Edit Form */
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editForm.nome}
                          onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))}
                          placeholder="Nome mansione *"
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <input
                          type="text"
                          value={editForm.codice}
                          onChange={e => setEditForm(p => ({ ...p, codice: e.target.value }))}
                          placeholder="Codice"
                          className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                        />
                      </div>
                      <input
                        type="text"
                        value={editForm.descrizione}
                        onChange={e => setEditForm(p => ({ ...p, descrizione: e.target.value }))}
                        placeholder="Descrizione (facoltativa)"
                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
                        >
                          <X className="w-3 h-3" />Annulla
                        </button>
                        <button
                          onClick={() => { void handleSaveEdit(m.id) }}
                          disabled={saving || !editForm.nome.trim()}
                          className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          {saving ? 'Salvataggio...' : 'Salva'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal display */
                    <>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{m.nome || 'Mansione senza nome'}</p>
                          {m.codice && (
                            <span className="text-[10px] text-gray-400 font-mono shrink-0">{m.codice}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {m.companyName && (
                            <span className="text-xs text-gray-500">{m.companyName}</span>
                          )}
                          {rischi.length > 0 && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Shield className="w-3 h-3" />{rischi.length} rischi
                            </span>
                          )}
                          {protocollo && (
                            <span className="text-xs text-purple-600 flex items-center gap-1">
                              <FileText className="w-3 h-3" />Protocollo
                            </span>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {!m.isActive && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inattiva</span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(m) }}
                          className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Modifica mansione"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                        >
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Expanded detail panel */}
                {isExpanded && !isEditing && (
                  <div className="border-t border-gray-100 bg-gray-50/30 divide-y divide-gray-100">

                    {/* Descrizione */}
                    {m.descrizione && (
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">Descrizione</p>
                        <p className="text-xs text-gray-600">{m.descrizione}</p>
                      </div>
                    )}

                    {/* Rischi Associati */}
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Rischi Associati ({rischi.length})
                      </p>
                      {rischi.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Nessun rischio associato a questa mansione</p>
                      ) : (
                        <div className="space-y-1.5">
                          {rischi.map((r, i) => {
                            const level = LIVELLO_COLORS[r.livello] || LIVELLO_COLORS.NON_RILEVANTE
                            // Use codiceRischio as the label (correctly mapped from server)
                            const label = r.codiceRischio || 'Rischio non specificato'
                            return (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <AlertTriangle className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-gray-700 font-medium">{label}</span>
                                  {r.categoria && (
                                    <span className="ml-1.5 text-gray-400">({r.categoria})</span>
                                  )}
                                  {r.fonteRischio && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">Fonte: {r.fonteRischio}</p>
                                  )}
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${level.bg} ${level.text}`}>
                                  {r.livello}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Protocollo Sanitario Collegato */}
                    <div className="px-4 py-3">
                      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Protocollo Sanitario
                      </p>
                      {!protocollo ? (
                        <p className="text-xs text-gray-400 italic">Nessun protocollo collegato</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800">{protocollo.nome || 'Protocollo senza nome'}</p>
                            {!protocollo.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inattivo</span>
                            )}
                          </div>
                          {(() => {
                            const prestazioni = normalizeProtocolloPrestazioni(prestazioniByProtocollo.get(protocollo.id) || [])
                            return prestazioni.length > 0 ? (
                              <div className="space-y-1 mt-1">
                                {prestazioni.map((p, pi) => (
                                  <div key={pi} className="flex items-center gap-2 text-xs text-gray-600">
                                    <Tag className="w-3 h-3 text-purple-400 shrink-0" />
                                    <span className="flex-1 truncate">{p.prestazioneNome}</span>
                                    <span className="text-gray-400 flex items-center gap-1 shrink-0">
                                      <Clock className="w-2.5 h-2.5" />
                                      {formatPeriodicity(p.periodicitaMesi)}
                                    </span>
                                    {p.obbligatoria && (
                                      <span className="text-[10px] text-red-600 font-medium shrink-0">Obbligatoria</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Nessuna prestazione nel protocollo</p>
                            )
                          })()}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
