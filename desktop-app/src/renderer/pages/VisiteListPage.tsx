import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stethoscope,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Hourglass,
  User,
  Calendar,
  RefreshCw,
  Building2
} from 'lucide-react'

interface Visita {
  id: string
  _serverId: string | null
  _syncStatus: string
  dataOra: string
  stato: string
  note: string | null
  durataMinuti: number | null
  personId: string | null
  personFirstName: string | null
  personLastName: string | null
  personTaxCode: string | null
  medicoId: string | null
  medicoFirstName: string | null
  medicoLastName: string | null
  companyName: string | null
  prestazioneNome: string | null
  prestazioneCodice: string | null
  isMDL: number
}

const STATO_CONFIG: Record<string, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  PROGRAMMATA: { label: 'Programmata', bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
  IN_CORSO: { label: 'In Corso', bg: 'bg-blue-100', text: 'text-blue-800', icon: Stethoscope },
  SOSPESA: { label: 'In Attesa', bg: 'bg-orange-100', text: 'text-orange-800', icon: Hourglass },
  COMPLETATA: { label: 'Completata', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  ANNULLATA: { label: 'Annullata', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
}

function formatDurata(minutes: number | null): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function VisiteListPage(): JSX.Element {
  const navigate = useNavigate()
  const [visite, setVisite] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStato, setFilterStato] = useState<string>('')

  const loadVisite = useCallback(async () => {
    setLoading(true)
    try {
      if (!window.desktopApi) return
      const rows = await window.desktopApi.db.query({
        table: 'visits',
        where: { _isDeleted: 0 },
        orderBy: { column: 'dataOra', direction: 'DESC' }
      }) as Visita[]
      setVisite(rows)
    } catch {
      // DB not ready
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadVisite() }, [loadVisite])

  const filtered = visite.filter(v => {
    const matchSearch = !searchTerm || [
      v.personFirstName, v.personLastName, v.personTaxCode, v.companyName, v.prestazioneNome
    ].some(f => f?.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchStato = !filterStato || v.stato === filterStato
    return matchSearch && matchStato
  })

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-teal-600" />
          Visite MDL
        </h1>
        <button
          onClick={loadVisite}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aggiorna
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca paziente, azienda, prestazione..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStato}
          onChange={(e) => setFilterStato(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATO_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-gray-500">
        {filtered.length} visit{filtered.length === 1 ? 'a' : 'e'}
        {visite.some(v => v._syncStatus === 'PENDING') && (
          <span className="ml-2 text-amber-600">
            • {visite.filter(v => v._syncStatus === 'PENDING').length} da sincronizzare
          </span>
        )}
      </p>

      {/* Visits Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <Stethoscope className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {visite.length === 0
              ? 'Nessuna visita disponibile. Scarica i dati dalla Dashboard.'
              : 'Nessuna visita corrisponde ai filtri.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Ora</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Paziente</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Prestazione</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Medico</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Durata</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(v => {
                const conf = STATO_CONFIG[v.stato] || STATO_CONFIG.PROGRAMMATA
                const StatusIcon = conf.icon
                const dataOra = v.dataOra ? new Date(v.dataOra) : null

                return (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/visite/${v.id}`)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            {dataOra?.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {dataOra?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-[10px] font-semibold shrink-0">
                          {v.personFirstName?.[0]}{v.personLastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {v.personLastName} {v.personFirstName}
                          </p>
                          {v.companyName && (
                            <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5" />{v.companyName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-sm text-gray-600">{v.prestazioneNome || '—'}</span>
                      {v.prestazioneCodice && (
                        <span className="block text-[10px] text-gray-400">{v.prestazioneCodice}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {v.medicoLastName ? (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          Dott. {v.medicoLastName}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{formatDurata(v.durataMinuti)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${conf.bg} ${conf.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {conf.label}
                      </span>
                      {v._syncStatus === 'PENDING' && (
                        <span className="block text-[9px] text-amber-500 mt-0.5">non sincronizzata</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
