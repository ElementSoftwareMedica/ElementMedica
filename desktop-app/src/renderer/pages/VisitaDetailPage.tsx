import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Clock,
  Stethoscope,
  Heart,
  ClipboardList,
  Search,
  Pill,
  FileText,
  Building2,
  AlertTriangle,
  Timer
} from 'lucide-react'
import { MDLInfoCardOffline } from '../components/visita/MDLInfoCardOffline'
import { GiudizioIdoneitaCard } from '../components/visita/GiudizioIdoneitaCard'
import { EsamiStrumentaliCard } from '../components/visita/EsamiStrumentaliCard'
import { FirmaDigitaleCard } from '../components/visita/FirmaDigitaleCard'
import { AllegatiCard } from '../components/visita/AllegatiCard'
import { QuestionariCard } from '../components/visita/QuestionariCard'

// ============================================================
// Types
// ============================================================

interface Visit {
  id: string
  _localId: string
  _serverId: string | null
  _syncStatus: string
  _version: number
  tenantId: string
  personId: string | null
  appuntamentoId: string | null
  medicoId: string | null
  ambulatorioId: string | null
  stato: string
  tipoVisitaMDL: string | null
  dataOra: string | null
  dataInizio: string | null
  dataFine: string | null
  durataMinuti: number | null
  datiStrutturati: string
  templateId: string | null
  totaleCosto: number
  firmaMedico: string | null
  firmaPaziente: string | null
  personFirstName: string | null
  personLastName: string | null
  personTaxCode: string | null
  medicoFirstName: string | null
  medicoLastName: string | null
  companyName: string | null
  prestazioneNome: string | null
  prestazioneCodice: string | null
  isMDL: number
}

interface Patient {
  id: string
  firstName: string | null
  lastName: string | null
  taxCode: string | null
  birthDate: string | null
  gender: string | null
  email: string | null
  phone: string | null
  companyName: string | null
}

interface FormValues {
  [key: string]: unknown
}

// ============================================================
// Constants
// ============================================================

const SECTIONS = [
  { id: 'anamnesi', label: 'Anamnesi', icon: ClipboardList },
  { id: 'vitali', label: 'Parametri Vitali', icon: Heart },
  { id: 'esame', label: 'Esame Obiettivo', icon: Stethoscope },
  { id: 'diagnosi', label: 'Diagnosi', icon: Search },
  { id: 'terapia', label: 'Terapia', icon: Pill },
  { id: 'note', label: 'Note & Follow-up', icon: FileText },
] as const

// ============================================================
// Main Component
// ============================================================

export function VisitaDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Core data
  const [visit, setVisit] = useState<Visit | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formValues, setFormValues] = useState<FormValues>({})
  const [activeSection, setActiveSection] = useState('anamnesi')
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Refs for save
  const formValuesRef = useRef<FormValues>({})
  useEffect(() => { formValuesRef.current = formValues }, [formValues])

  // ----------------------------------------------------------
  // Load data
  // ----------------------------------------------------------

  const loadVisit = useCallback(async () => {
    if (!id || !window.desktopApi) return
    setLoading(true)
    setError(null)

    try {
      const visits = await window.desktopApi.db.query({
        table: 'visits',
        where: { id, _isDeleted: 0 },
        limit: 1
      }) as Visit[]

      if (visits.length === 0) {
        setError('Visita non trovata')
        return
      }

      const v = visits[0]
      setVisit(v)

      // Parse datiStrutturati + merge flat fields
      try {
        const parsed = JSON.parse(v.datiStrutturati || '{}')
        setFormValues(parsed)
      } catch {
        setFormValues({})
      }

      // Load patient
      if (v.personId) {
        const patients = await window.desktopApi.db.query({
          table: 'patients',
          where: { id: v.personId, _isDeleted: 0 },
          limit: 1
        }) as Patient[]
        if (patients.length > 0) setPatient(patients[0])
      }

      // Calculate elapsed time if in progress
      if (v.stato === 'IN_CORSO' && v.dataInizio) {
        const elapsed = Math.floor((Date.now() - new Date(v.dataInizio).getTime()) / 1000)
        setElapsedSeconds(Math.max(0, elapsed))
      }
    } catch {
      setError('Errore nel caricamento della visita')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadVisit() }, [loadVisit])

  // ----------------------------------------------------------
  // Timer
  // ----------------------------------------------------------

  useEffect(() => {
    if (visit?.stato === 'IN_CORSO') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [visit?.stato])

  const formatTimer = (s: number): string => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  // ----------------------------------------------------------
  // Form updates
  // ----------------------------------------------------------

  const updateField = useCallback((key: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }, [])

  // Save on section change
  const changeSection = useCallback(async (newSection: string) => {
    if (hasChanges && visit && window.desktopApi) {
      await doSave()
    }
    setActiveSection(newSection)
  }, [hasChanges, visit])

  // ----------------------------------------------------------
  // Save
  // ----------------------------------------------------------

  const doSave = useCallback(async () => {
    if (!visit || !window.desktopApi || isSaving) return
    setIsSaving(true)

    try {
      const fv = formValuesRef.current
      const datiStrutturati = JSON.stringify(fv)

      await window.desktopApi.db.update({
        table: 'visits',
        id: visit.id,
        data: {
          datiStrutturati,
          anamnesi: (fv.anamnesiLavorativa as string) || null,
          esameObiettivo: (fv.esameObiettivoGenerale as string) || null,
          diagnosi: (fv.diagnosiPrincipale as string) || null,
          terapia: (fv.terapia as string) || null,
          noteInterne: (fv.noteInterne as string) || null,
        }
      })

      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'visita',
        entityId: visit.id,
        localId: visit._localId,
        payload: { datiStrutturati }
      })

      setHasChanges(false)
      setLastSaved(new Date())
    } finally {
      setIsSaving(false)
    }
  }, [visit?.id, visit?._localId, isSaving])

  // ----------------------------------------------------------
  // Complete visit
  // ----------------------------------------------------------

  const handleComplete = useCallback(async () => {
    if (!visit || !window.desktopApi) return

    // Save form data first
    await doSave()

    const now = new Date().toISOString()
    const durataMinuti = visit.dataInizio
      ? Math.round((Date.now() - new Date(visit.dataInizio).getTime()) / 60000)
      : null

    await window.desktopApi.db.update({
      table: 'visits',
      id: visit.id,
      data: {
        stato: 'COMPLETATA',
        dataFine: now,
        durataMinuti,
      }
    })

    await window.desktopApi.sync.enqueue({
      type: 'UPDATE',
      entity: 'visita',
      entityId: visit.id,
      localId: visit._localId,
      payload: {
        stato: 'COMPLETATA',
        dataFine: now,
        durataMinuti,
        datiStrutturati: JSON.stringify(formValuesRef.current)
      }
    })

    // Auto-generate MovimentoContabile ENTRATA
    try {
      const existing = await window.desktopApi.db.query({
        table: 'movimenti_contabili',
        where: { visitaId: visit.id, _isDeleted: 0 }
      }) as Array<{ id: string }>

      if (existing.length === 0) {
        const movData = {
          tenantId: visit.tenantId,
          visitaId: visit.id,
          personId: visit.personId,
          companyTenantProfileId: null,
          tipo: visit.tipoVisitaMDL ? 'VISITA_MDL' : 'VISITA_MEDICA',
          descrizione: `Visita ${visit.tipoVisitaMDL || 'medica'} — ${visit.personLastName || ''} ${visit.personFirstName || ''}`.trim(),
          importo: visit.totaleCosto || 0,
          iva: 0,
          importoNetto: visit.totaleCosto || 0,
          stato: 'DA_FATTURARE',
          dataMovimento: now,
          dataScadenza: null,
          dataPagamento: null,
          metodoPagamento: null,
          riferimentoFattura: null,
          note: null,
          createdAt: now,
          updatedAt: now,
        }

        const { id: movId } = await window.desktopApi.db.insert({
          table: 'movimenti_contabili',
          data: movData
        })

        await window.desktopApi.sync.enqueue({
          type: 'CREATE',
          entity: 'movimentoContabile',
          entityId: movId,
          payload: movData
        })
      }
    } catch {
      // Non-blocking: movement generation failure shouldn't prevent visit completion
    }

    if (timerRef.current) clearInterval(timerRef.current)
    setVisit(prev => prev ? { ...prev, stato: 'COMPLETATA', dataFine: now, durataMinuti } : null)
  }, [visit, doSave])

  // ----------------------------------------------------------
  // BMI calculation
  // ----------------------------------------------------------

  const bmi = useMemo(() => {
    const peso = Number(formValues.peso)
    const altezza = Number(formValues.altezza)
    if (peso > 0 && altezza > 0) {
      return (peso / Math.pow(altezza / 100, 2)).toFixed(1)
    }
    return null
  }, [formValues.peso, formValues.altezza])

  const bmiCategory = useMemo(() => {
    if (!bmi) return null
    const val = parseFloat(bmi)
    if (val < 18.5) return { label: 'Sottopeso', color: 'text-blue-600' }
    if (val < 25) return { label: 'Normopeso', color: 'text-green-600' }
    if (val < 30) return { label: 'Sovrappeso', color: 'text-yellow-600' }
    return { label: 'Obeso', color: 'text-red-600' }
  }, [bmi])

  // ----------------------------------------------------------
  // Loading / Error states
  // ----------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Caricamento visita...</p>
        </div>
      </div>
    )
  }

  if (error || !visit) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 shadow-card">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-600">{error || 'Visita non trovata'}</p>
          <button
            onClick={() => navigate('/visite')}
            className="mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            ← Torna alle Visite
          </button>
        </div>
      </div>
    )
  }

  const isReadOnly = visit.stato === 'COMPLETATA' || visit.stato === 'ANNULLATA'

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className="h-full flex flex-col -m-4">
      {/* =============== STICKY HEADER =============== */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left: Back + Patient */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/visite')}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900 font-heading">
                  {visit.personLastName} {visit.personFirstName}
                </h1>
                {visit.isMDL === 1 && (
                  <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 text-[10px] font-semibold rounded">
                    MDL
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {visit.companyName && (
                  <>
                    <Building2 className="w-3 h-3" />
                    {visit.companyName}
                    <span className="mx-1">·</span>
                  </>
                )}
                {visit.prestazioneNome || 'Visita'}
              </p>
            </div>
          </div>

          {/* Center: Status + Timer */}
          <div className="flex items-center gap-4">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              visit.stato === 'IN_CORSO' ? 'bg-blue-100 text-blue-800' :
              visit.stato === 'COMPLETATA' ? 'bg-green-100 text-green-800' :
              visit.stato === 'ANNULLATA' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {visit.stato === 'IN_CORSO' ? <Stethoscope className="w-3 h-3" /> :
               visit.stato === 'COMPLETATA' ? <CheckCircle className="w-3 h-3" /> :
               <Clock className="w-3 h-3" />}
              {visit.stato === 'IN_CORSO' ? 'In Corso' :
               visit.stato === 'COMPLETATA' ? 'Completata' :
               visit.stato === 'ANNULLATA' ? 'Annullata' :
               visit.stato}
            </span>

            {visit.stato === 'IN_CORSO' && (
              <div className="flex items-center gap-1.5 text-sm font-mono text-gray-700">
                <Timer className="w-4 h-4 text-teal-600" />
                {formatTimer(elapsedSeconds)}
              </div>
            )}

            {lastSaved && (
              <span className="text-[10px] text-gray-400">
                Salvato {lastSaved.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                <button
                  onClick={doSave}
                  disabled={isSaving || !hasChanges}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Salvataggio...' : 'Salva'}
                </button>
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completa
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =============== MAIN CONTENT =============== */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 grid grid-cols-12 gap-4">

          {/* ====== LEFT SIDEBAR ====== */}
          <div className="col-span-3 space-y-3">
            {/* Patient Card */}
            {patient && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-semibold text-sm">
                    {patient.firstName?.[0]}{patient.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{patient.lastName} {patient.firstName}</p>
                    <p className="text-xs text-gray-500 font-mono">{patient.taxCode}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600">
                  {patient.birthDate && (
                    <p>📅 {new Date(patient.birthDate).toLocaleDateString('it-IT')} ({calcAge(patient.birthDate)} anni)</p>
                  )}
                  {patient.gender && (
                    <p>👤 {patient.gender === 'M' ? 'Maschio' : patient.gender === 'F' ? 'Femmina' : patient.gender}</p>
                  )}
                  {patient.email && <p>✉️ {patient.email}</p>}
                  {patient.phone && <p>📱 {patient.phone}</p>}
                  {patient.companyName && <p>🏢 {patient.companyName}</p>}
                </div>
              </div>
            )}

            {/* MDL Info Card */}
            {visit.personId && (
              <MDLInfoCardOffline personId={visit.personId} />
            )}

            {/* Giudizio Idoneità */}
            {visit.isMDL === 1 && (
              <GiudizioIdoneitaCard
                visitId={visit.id}
                personId={visit.personId || ''}
                medicoId={visit.medicoId || ''}
                tenantId={visit.tenantId}
                isReadOnly={isReadOnly}
                personFirstName={visit.personFirstName ?? undefined}
                personLastName={visit.personLastName ?? undefined}
                medicoFirstName={visit.medicoFirstName ?? undefined}
                medicoLastName={visit.medicoLastName ?? undefined}
              />
            )}

            {/* Esami Strumentali */}
            <EsamiStrumentaliCard
              visitId={visit.id}
              personId={visit.personId || ''}
              tenantId={visit.tenantId}
              isReadOnly={isReadOnly}
            />

            {/* Allegati */}
            <AllegatiCard
              visitId={visit.id}
              tenantId={visit.tenantId}
              isReadOnly={isReadOnly}
            />

            {/* Questionari */}
            <QuestionariCard
              visitId={visit.id}
              personId={visit.personId || ''}
              tenantId={visit.tenantId}
              isReadOnly={isReadOnly}
            />

            {/* Firma Digitale */}
            <FirmaDigitaleCard
              visitId={visit.id}
              firmaMedico={visit.firmaMedico || null}
              firmaPaziente={visit.firmaPaziente || null}
              isReadOnly={isReadOnly}
              onSaveFirma={async (target, dataUrl) => {
                if (!window.desktopApi) return
                const field = target === 'medico' ? 'firmaMedico' : 'firmaPaziente'
                const data = {
                  [field]: dataUrl,
                  firmaTimestamp: new Date().toISOString()
                }
                await window.desktopApi.db.update({ table: 'visits', id: visit.id, data })
                await window.desktopApi.sync.enqueue({
                  type: 'UPDATE',
                  entity: 'visita',
                  entityId: visit.id,
                  payload: data
                })
                setVisit(prev => prev ? { ...prev, ...data } : prev)
                setLastSaved(new Date())
              }}
            />

            {/* Sync Status */}
            <div className={`p-3 rounded-xl text-xs ${
              visit._syncStatus === 'SYNCED' ? 'bg-green-50 text-green-700' :
              visit._syncStatus === 'PENDING' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'
            }`}>
              {visit._syncStatus === 'SYNCED' ? '✓ Sincronizzata' :
               visit._syncStatus === 'PENDING' ? '⏳ Da sincronizzare' :
               '⚠ Conflitto'}
            </div>
          </div>

          {/* ====== RIGHT FORM AREA ====== */}
          <div className="col-span-9 space-y-3">
            {/* Section Tabs */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-1 flex gap-1 overflow-x-auto">
              {SECTIONS.map(section => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => changeSection(section.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-teal-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {section.label}
                  </button>
                )
              })}
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6">

              {/* ===== ANAMNESI ===== */}
              {activeSection === 'anamnesi' && (
                <div className="space-y-4">
                  <SectionHeader icon={ClipboardList} label="Anamnesi" />

                  <FormTextArea
                    label="Anamnesi Lavorativa"
                    value={(formValues.anamnesiLavorativa as string) || ''}
                    onChange={(v) => updateField('anamnesiLavorativa', v)}
                    placeholder="Attività lavorativa, esposizione a rischi, DPI utilizzati..."
                    readOnly={isReadOnly}
                    rows={4}
                  />
                  <FormTextArea
                    label="Anamnesi Patologica Remota"
                    value={(formValues.anamnesiPatologicaRemota as string) || ''}
                    onChange={(v) => updateField('anamnesiPatologicaRemota', v)}
                    placeholder="Patologie pregresse, interventi chirurgici, allergie..."
                    readOnly={isReadOnly}
                    rows={3}
                  />
                  <FormTextArea
                    label="Anamnesi Patologica Prossima"
                    value={(formValues.anamnesiPatologicaProssima as string) || ''}
                    onChange={(v) => updateField('anamnesiPatologicaProssima', v)}
                    placeholder="Problemi attuali, sintomi recenti..."
                    readOnly={isReadOnly}
                    rows={3}
                  />
                  <FormTextArea
                    label="Anamnesi Familiare"
                    value={(formValues.anamnesiFamiliare as string) || ''}
                    onChange={(v) => updateField('anamnesiFamiliare', v)}
                    placeholder="Patologie familiari rilevanti..."
                    readOnly={isReadOnly}
                    rows={2}
                  />
                  <FormTextArea
                    label="Anamnesi Fisiologica"
                    value={(formValues.anamnesiFisiologica as string) || ''}
                    onChange={(v) => updateField('anamnesiFisiologica', v)}
                    placeholder="Abitudini alimentari, attività fisica, fumo, alcool..."
                    readOnly={isReadOnly}
                    rows={2}
                  />
                </div>
              )}

              {/* ===== PARAMETRI VITALI ===== */}
              {activeSection === 'vitali' && (
                <div className="space-y-4">
                  <SectionHeader icon={Heart} label="Parametri Vitali" iconColor="text-red-500" />

                  <div className="grid grid-cols-3 gap-4">
                    <FormNumber
                      label="Peso (kg)"
                      value={formValues.peso as number | undefined}
                      onChange={(v) => updateField('peso', v)}
                      readOnly={isReadOnly}
                      min={0} max={300} step={0.1}
                    />
                    <FormNumber
                      label="Altezza (cm)"
                      value={formValues.altezza as number | undefined}
                      onChange={(v) => updateField('altezza', v)}
                      readOnly={isReadOnly}
                      min={0} max={250} step={1}
                    />
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">BMI</label>
                      <div className={`px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm ${bmiCategory?.color || 'text-gray-400'}`}>
                        {bmi ? `${bmi} — ${bmiCategory?.label}` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <FormNumber
                      label="PA Sistolica (mmHg)"
                      value={formValues.paSistolica as number | undefined}
                      onChange={(v) => updateField('paSistolica', v)}
                      readOnly={isReadOnly}
                      min={0} max={300}
                    />
                    <FormNumber
                      label="PA Diastolica (mmHg)"
                      value={formValues.paDiastolica as number | undefined}
                      onChange={(v) => updateField('paDiastolica', v)}
                      readOnly={isReadOnly}
                      min={0} max={200}
                    />
                    <FormNumber
                      label="FC (bpm)"
                      value={formValues.fc as number | undefined}
                      onChange={(v) => updateField('fc', v)}
                      readOnly={isReadOnly}
                      min={0} max={300}
                    />
                    <FormNumber
                      label="SpO₂ (%)"
                      value={formValues.spo2 as number | undefined}
                      onChange={(v) => updateField('spo2', v)}
                      readOnly={isReadOnly}
                      min={0} max={100}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormNumber
                      label="Temperatura (°C)"
                      value={formValues.temperatura as number | undefined}
                      onChange={(v) => updateField('temperatura', v)}
                      readOnly={isReadOnly}
                      min={30} max={45} step={0.1}
                    />
                    <FormInput
                      label="Visus OD"
                      value={(formValues.visusOD as string) || ''}
                      onChange={(v) => updateField('visusOD', v)}
                      readOnly={isReadOnly}
                      placeholder="10/10"
                    />
                    <FormInput
                      label="Visus OS"
                      value={(formValues.visusOS as string) || ''}
                      onChange={(v) => updateField('visusOS', v)}
                      readOnly={isReadOnly}
                      placeholder="10/10"
                    />
                  </div>
                </div>
              )}

              {/* ===== ESAME OBIETTIVO ===== */}
              {activeSection === 'esame' && (
                <div className="space-y-4">
                  <SectionHeader icon={Stethoscope} label="Esame Obiettivo" />

                  <FormTextArea
                    label="Condizioni Generali"
                    value={(formValues.esameObiettivoGenerale as string) || ''}
                    onChange={(v) => updateField('esameObiettivoGenerale', v)}
                    placeholder="Aspetto generale, stato di nutrizione, colorito..."
                    readOnly={isReadOnly}
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormTextArea
                      label="Apparato Cardiovascolare"
                      value={(formValues.esameObiettivoCuore as string) || ''}
                      onChange={(v) => updateField('esameObiettivoCuore', v)}
                      placeholder="Toni cardiaci, soffi, polsi..."
                      readOnly={isReadOnly}
                      rows={3}
                    />
                    <FormTextArea
                      label="Apparato Respiratorio"
                      value={(formValues.esameObiettivoPolmoni as string) || ''}
                      onChange={(v) => updateField('esameObiettivoPolmoni', v)}
                      placeholder="MV, rumori aggiunti, espansibilità..."
                      readOnly={isReadOnly}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormTextArea
                      label="Addome"
                      value={(formValues.esameObiettivoAddome as string) || ''}
                      onChange={(v) => updateField('esameObiettivoAddome', v)}
                      placeholder="Trattabile, organi, punti dolorosi..."
                      readOnly={isReadOnly}
                      rows={3}
                    />
                    <FormTextArea
                      label="Apparato Locomotore"
                      value={(formValues.esameObiettivoLocomotore as string) || ''}
                      onChange={(v) => updateField('esameObiettivoLocomotore', v)}
                      placeholder="Articolazioni, colonna, motilità..."
                      readOnly={isReadOnly}
                      rows={3}
                    />
                  </div>
                  <FormTextArea
                    label="Apparato Neurologico"
                    value={(formValues.esameObiettivoNeurologico as string) || ''}
                    onChange={(v) => updateField('esameObiettivoNeurologico', v)}
                    placeholder="ROT, sensibilità, coordinazione..."
                    readOnly={isReadOnly}
                    rows={2}
                  />
                  <FormTextArea
                    label="Cute e Annessi"
                    value={(formValues.esameObiettivoCute as string) || ''}
                    onChange={(v) => updateField('esameObiettivoCute', v)}
                    placeholder="Lesioni, neoformazioni, dermatiti..."
                    readOnly={isReadOnly}
                    rows={2}
                  />
                </div>
              )}

              {/* ===== DIAGNOSI ===== */}
              {activeSection === 'diagnosi' && (
                <div className="space-y-4">
                  <SectionHeader icon={Search} label="Diagnosi" />

                  <FormTextArea
                    label="Diagnosi Principale"
                    value={(formValues.diagnosiPrincipale as string) || ''}
                    onChange={(v) => updateField('diagnosiPrincipale', v)}
                    placeholder="Diagnosi o conclusioni cliniche..."
                    readOnly={isReadOnly}
                    rows={4}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      label="Codice ICD-10"
                      value={(formValues.codiceICD as string) || ''}
                      onChange={(v) => updateField('codiceICD', v)}
                      readOnly={isReadOnly}
                      placeholder="es. Z10.0"
                    />
                    <FormInput
                      label="Diagnosi Secondaria"
                      value={(formValues.diagnosiSecondaria as string) || ''}
                      onChange={(v) => updateField('diagnosiSecondaria', v)}
                      readOnly={isReadOnly}
                    />
                  </div>
                  <FormTextArea
                    label="Note Diagnostiche"
                    value={(formValues.noteDiagnostiche as string) || ''}
                    onChange={(v) => updateField('noteDiagnostiche', v)}
                    placeholder="Appunti aggiuntivi, sospetti diagnostici..."
                    readOnly={isReadOnly}
                    rows={3}
                  />
                </div>
              )}

              {/* ===== TERAPIA ===== */}
              {activeSection === 'terapia' && (
                <div className="space-y-4">
                  <SectionHeader icon={Pill} label="Terapia & Prescrizioni" />

                  <FormTextArea
                    label="Terapia"
                    value={(formValues.terapia as string) || ''}
                    onChange={(v) => updateField('terapia', v)}
                    placeholder="Terapia prescritta, farmaci, dosaggi..."
                    readOnly={isReadOnly}
                    rows={5}
                  />
                  <FormTextArea
                    label="Prescrizioni"
                    value={(formValues.prescrizioni as string) || ''}
                    onChange={(v) => updateField('prescrizioni', v)}
                    placeholder="Prescrizioni mediche, accertamenti richiesti..."
                    readOnly={isReadOnly}
                    rows={4}
                  />
                </div>
              )}

              {/* ===== NOTE & FOLLOW-UP ===== */}
              {activeSection === 'note' && (
                <div className="space-y-4">
                  <SectionHeader icon={FileText} label="Note & Follow-up" />

                  <FormTextArea
                    label="Note Interne"
                    value={(formValues.noteInterne as string) || ''}
                    onChange={(v) => updateField('noteInterne', v)}
                    placeholder="Note riservate al medico..."
                    readOnly={isReadOnly}
                    rows={3}
                  />
                  <FormTextArea
                    label="Note per il Paziente"
                    value={(formValues.notePazienti as string) || ''}
                    onChange={(v) => updateField('notePazienti', v)}
                    placeholder="Indicazioni e raccomandazioni per il paziente..."
                    readOnly={isReadOnly}
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      label="Prossimo Controllo"
                      type="date"
                      value={(formValues.prossimoControllo as string) || ''}
                      onChange={(v) => updateField('prossimoControllo', v)}
                      readOnly={isReadOnly}
                    />
                    <FormNumber
                      label="Periodicità (mesi)"
                      value={formValues.periodicitaMesi as number | undefined}
                      onChange={(v) => updateField('periodicitaMesi', v)}
                      readOnly={isReadOnly}
                      min={1} max={120}
                      placeholder="12"
                    />
                  </div>
                  <FormTextArea
                    label="Note Follow-up"
                    value={(formValues.noteFollowup as string) || ''}
                    onChange={(v) => updateField('noteFollowup', v)}
                    placeholder="Piano di follow-up, obiettivi..."
                    readOnly={isReadOnly}
                    rows={3}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// ============================================================
// Form Sub-Components
// ============================================================

function SectionHeader({ icon: Icon, label, iconColor = 'text-teal-600' }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  iconColor?: string
}): JSX.Element {
  return (
    <h2 className="text-base font-semibold text-gray-900 font-heading flex items-center gap-2">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      {label}
    </h2>
  )
}

function FormTextArea({ label, value, onChange, placeholder, readOnly, rows = 3 }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  rows?: number
}): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        rows={rows}
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y ${
          readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''
        }`}
      />
    </div>
  )
}

function FormInput({ label, value, onChange, placeholder, readOnly, type = 'text' }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  readOnly?: boolean
  type?: string
}): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
          readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''
        }`}
      />
    </div>
  )
}

function FormNumber({ label, value, onChange, readOnly, min, max, step = 1, placeholder }: {
  label: string
  value: number | undefined
  onChange: (v: number | null) => void
  readOnly?: boolean
  min?: number
  max?: number
  step?: number
  placeholder?: string
}): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        readOnly={readOnly}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
          readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''
        }`}
      />
    </div>
  )
}
