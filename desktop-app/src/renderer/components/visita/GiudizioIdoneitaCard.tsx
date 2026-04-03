import { useState, useEffect, useCallback } from 'react'
import { Scale, ChevronDown, ChevronRight, Save, FileDown } from 'lucide-react'
import { downloadGiudizioPdf } from './GiudizioIdoneitaPdf'

// ============================================================
// Types & Constants
// ============================================================

interface GiudizioIdoneita {
  id: string
  _localId: string
  tipo: string | null
  esito: string | null
  limitazioni: string | null
  prescrizioni: string | null
  dataEmissione: string | null
  dataScadenza: string | null
  note: string | null
  firmaMedico: string | null
  protocolloNumero: string | null
}

const TIPI_VISITA: Array<{ value: string; label: string }> = [
  { value: 'PREVENTIVA', label: 'Preventiva' },
  { value: 'PERIODICA', label: 'Periodica' },
  { value: 'STRAORDINARIA', label: 'Straordinaria' },
  { value: 'PREASSUNTIVA', label: 'Preassuntiva' },
  { value: 'CESSAZIONE', label: 'A cessazione rapporto' },
]

const ESITI: Array<{ value: string; label: string; color: string }> = [
  { value: 'IDONEO', label: 'Idoneo', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'IDONEO_CON_PRESCRIZIONI', label: 'Idoneo con prescrizioni', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'IDONEO_CON_LIMITAZIONI', label: 'Idoneo con limitazioni', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'NON_IDONEO_TEMPORANEO', label: 'Non idoneo temporaneo', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'NON_IDONEO_PERMANENTE', label: 'Non idoneo permanente', color: 'bg-red-100 text-red-800 border-red-300' },
]

// ============================================================
// Component
// ============================================================

interface Props {
  visitId: string
  personId: string
  medicoId: string
  tenantId: string
  isReadOnly: boolean
  personFirstName?: string
  personLastName?: string
  medicoFirstName?: string
  medicoLastName?: string
  mansioneNome?: string
}

export function GiudizioIdoneitaCard({ visitId, personId, medicoId, tenantId, isReadOnly, personFirstName, personLastName, medicoFirstName, medicoLastName, mansioneNome }: Props): JSX.Element {
  const [giudizio, setGiudizio] = useState<GiudizioIdoneita | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form fields
  const [tipo, setTipo] = useState('')
  const [esito, setEsito] = useState('')
  const [limitazioni, setLimitazioni] = useState('')
  const [prescrizioni, setPrescrizioni] = useState('')
  const [dataEmissione, setDataEmissione] = useState('')
  const [dataScadenza, setDataScadenza] = useState('')
  const [note, setNote] = useState('')

  // Load existing giudizio for this visit
  useEffect(() => {
    async function load() {
      if (!window.desktopApi || !visitId) return
      setLoading(true)

      try {
        const results = await window.desktopApi.db.query({
          table: 'giudizi_idoneita',
          where: { visitaId: visitId, _isDeleted: 0 },
          limit: 1
        }) as GiudizioIdoneita[]

        if (results.length > 0) {
          const g = results[0]
          setGiudizio(g)
          setTipo(g.tipo || '')
          setEsito(g.esito || '')
          setLimitazioni(g.limitazioni || '')
          setPrescrizioni(g.prescrizioni || '')
          setDataEmissione(g.dataEmissione || '')
          setDataScadenza(g.dataScadenza || '')
          setNote(g.note || '')
          setIsExpanded(true)
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [visitId])

  // Save giudizio
  const handleSave = useCallback(async () => {
    if (!window.desktopApi || isSaving) return
    setIsSaving(true)

    try {
      const data = {
        tenantId,
        personId,
        visitaId: visitId,
        medicoId,
        tipo: tipo || null,
        esito: esito || null,
        limitazioni: limitazioni || null,
        prescrizioni: prescrizioni || null,
        dataEmissione: dataEmissione || new Date().toISOString().split('T')[0],
        dataScadenza: dataScadenza || null,
        note: note || null,
      }

      if (giudizio) {
        // Update existing
        await window.desktopApi.db.update({
          table: 'giudizi_idoneita',
          id: giudizio.id,
          data
        })

        await window.desktopApi.sync.enqueue({
          type: 'UPDATE',
          entity: 'giudizioIdoneita',
          entityId: giudizio.id,
          localId: giudizio._localId,
          payload: data
        })
      } else {
        // Create new
        const result = await window.desktopApi.db.insert({
          table: 'giudizi_idoneita',
          data: {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }) as { id: string; _localId: string }

        await window.desktopApi.sync.enqueue({
          type: 'CREATE',
          entity: 'giudizioIdoneita',
          entityId: result.id,
          localId: result._localId,
          payload: data
        })

        setGiudizio({
          id: result.id,
          _localId: result._localId,
          tipo, esito, limitazioni, prescrizioni,
          dataEmissione, dataScadenza, note,
          firmaMedico: null, protocolloNumero: null
        })
      }
    } finally {
      setIsSaving(false)
    }
  }, [visitId, personId, medicoId, tenantId, giudizio, tipo, esito, limitazioni, prescrizioni, dataEmissione, dataScadenza, note, isSaving])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
        <div className="animate-pulse h-4 bg-gray-100 rounded w-32" />
      </div>
    )
  }

  const esitoConfig = ESITI.find(e => e.value === esito)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4"
      >
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5 text-violet-600" />
          Giudizio di Idoneità
        </h3>
        <div className="flex items-center gap-2">
          {giudizio && esitoConfig && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${esitoConfig.color}`}>
              {esitoConfig.label}
            </span>
          )}
          {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
        </div>
      </button>

      {/* Form */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Tipo */}
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Tipo Visita</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={isReadOnly}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
            >
              <option value="">Seleziona...</option>
              {TIPI_VISITA.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Esito — selection buttons */}
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Esito</label>
            <div className="space-y-1">
              {ESITI.map(e => (
                <button
                  key={e.value}
                  onClick={() => !isReadOnly && setEsito(e.value)}
                  disabled={isReadOnly}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs border transition-colors ${
                    esito === e.value
                      ? e.color + ' border-current'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Limitazioni & Prescrizioni — shown when relevant */}
          {(esito === 'IDONEO_CON_LIMITAZIONI' || esito === 'NON_IDONEO_TEMPORANEO') && (
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Limitazioni</label>
              <textarea
                value={limitazioni}
                onChange={(e) => setLimitazioni(e.target.value)}
                readOnly={isReadOnly}
                rows={2}
                placeholder="Descrivere le limitazioni..."
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
              />
            </div>
          )}

          {(esito === 'IDONEO_CON_PRESCRIZIONI' || esito === 'IDONEO_CON_LIMITAZIONI') && (
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Prescrizioni</label>
              <textarea
                value={prescrizioni}
                onChange={(e) => setPrescrizioni(e.target.value)}
                readOnly={isReadOnly}
                rows={2}
                placeholder="Prescrizioni del giudizio..."
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
              />
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Data Emissione</label>
              <input
                type="date"
                value={dataEmissione}
                onChange={(e) => setDataEmissione(e.target.value)}
                readOnly={isReadOnly}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-600 mb-1">Scadenza</label>
              <input
                type="date"
                value={dataScadenza}
                onChange={(e) => setDataScadenza(e.target.value)}
                readOnly={isReadOnly}
                className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-medium text-gray-600 mb-1">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              readOnly={isReadOnly}
              rows={2}
              placeholder="Note aggiuntive..."
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            />
          </div>

          {/* Save button */}
          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving || !esito}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3 h-3" />
              {isSaving ? 'Salvataggio...' : giudizio ? 'Aggiorna Giudizio' : 'Salva Giudizio'}
            </button>
          )}

          {/* PDF download */}
          {giudizio && esito && (
            <button
              onClick={() => {
                const patientName = [personFirstName, personLastName].filter(Boolean).join(' ') || 'Lavoratore'
                const medicoName = [medicoFirstName ? (medicoFirstName[0] === 'F' ? 'Dott.ssa' : 'Dott.') : '', medicoFirstName, medicoLastName].filter(Boolean).join(' ') || 'Medico Competente'
                downloadGiudizioPdf({
                  giudizio: { ...giudizio, tipo, esito, limitazioni, prescrizioni, dataEmissione, dataScadenza, note, firmaMedico: giudizio.firmaMedico, protocolloNumero: giudizio.protocolloNumero },
                  patientName,
                  medicoName,
                  mansioneNome,
                  generatedAt: new Date().toISOString(),
                })
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 border border-violet-200 transition-colors"
            >
              <FileDown className="w-3 h-3" />
              Scarica PDF (copia lavoratore)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
