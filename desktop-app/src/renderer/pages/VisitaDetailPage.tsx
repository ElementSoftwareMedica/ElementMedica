import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
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
    X,
    XCircle,
    Loader2,
    Timer,
    Euro,
    Download,
    LayoutList,
    AlignJustify,
    Activity,
    Edit3,
    HeartPulse,
    ListChecks,
    CalendarClock,
    UserCheck,
    ChevronDown,
    Plus,
    Trash2,
    History,
    MessageSquare,
    Printer,
    Eye,
    Paperclip,
    GitBranch,
    FileStack,
    Shield,
    Car,
    FlaskConical,
    TrendingUp,
    ChevronUp,
    Upload
} from 'lucide-react'
import { MDLInfoCardOffline } from '../components/visita/MDLInfoCardOffline'
import { GiudizioIdoneitaCard } from '../components/visita/GiudizioIdoneitaCard'
import { EsamiStrumentaliCard } from '../components/visita/EsamiStrumentaliCard'
import { FirmaDigitaleCard } from '../components/visita/FirmaDigitaleCard'
import { AllegatiCard } from '../components/visita/AllegatiCard'
import { DocumentiVisitaModal } from '../components/visita/DocumentiVisitaModal'
import DatePickerElegante from '@/components/ui/DatePickerElegante'
import { ElegantDateInput, ElegantSelect } from '../components/ElegantControls'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { useDesktopPermission } from '../hooks/useDesktopPermission'
import { normalizeProtocolloPrestazioni, type ProtocolloPrestazioneRow } from '../utils/protocolloSanitario'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'

// ============================================================
// Types
// ============================================================

// VisitField mirrors the server-side VisitField type (src/services/clinicaApi.ts)
// kept minimal: only the fields needed for offline form rendering
type VisitFieldType =
    | 'TEXT' | 'TEXTAREA' | 'RICHTEXT' | 'NUMBER'
    | 'DROPDOWN' | 'MULTI_CHOICE' | 'DATE' | 'DATETIME'
    | 'BOOLEAN' | 'VITALS'

interface VisitField {
    id?: string
    name: string
    label: string
    type: VisitFieldType
    section: string
    required: boolean
    visible: boolean
    order: number
    defaultValue?: string
    placeholder?: string
    helpText?: string
    options?: (string | { value: string; label: string; description?: string })[]
    mappedField?: string
}

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
    prestazioneId: string | null
    stato: string
    tipoVisitaMDL: string | null
    dataOra: string | null
    dataInizio: string | null
    dataFine: string | null
    durataMinuti: number | null
    datiStrutturati: string
    templateId: string | null
    medicoRefertanteId?: string | null
    medicoRefertanteFirstName?: string | null
    medicoRefertanteLastName?: string | null
    totaleCosto: number
    firmaMedico: string | null
    firmaPaziente: string | null
    personFirstName: string | null
    personLastName: string | null
    personTaxCode: string | null
    medicoFirstName: string | null
    medicoLastName: string | null
    companyName: string | null
    companyTenantProfileId?: string | null
    prestazioneNome: string | null
    prestazioneCodice: string | null
    isMDL: number
    updatedAt?: string | null
}

interface Patient {
    id: string
    firstName: string | null
    lastName: string | null
    taxCode: string | null
    birthDate: string | null
    birthPlace: string | null
    gender: string | null
    email: string | null
    phone: string | null
    companyName: string | null
    companyTenantProfileId?: string | null
    residenceAddress: string | null
    residenceCity: string | null
    province: string | null
    postalCode: string | null
    title: string | null
    status: string | null
    birthProvince?: string | null
    profileImage?: string | null
    protocolloSanitarioId: string | null
}

interface PrestazioneAppt {
    prestazioneId: string
    nome: string
    codice: string | null
    tipo: string | null
    prezzoCalcolato: number | null
}

interface VisitHistoryItem {
    id: string
    dataOra: string | null
    stato: string | null
    prestazioneNome: string | null
    medicoFirstName: string | null
    medicoLastName: string | null
    isMDL: number | null
}

interface PatientScadenzaItem {
    id: string
    prestazioneId: string | null
    prestazioneNome: string | null
    mansione: string | null
    personId?: string | null
    tenantId?: string | null
    mansioneId?: string | null
    protocolloId?: string | null
    dataScadenza: string | null
    periodicitaMesi: number | null
    eseguita: number | null
    stato: string | null
}

interface FormValues {
    [key: string]: unknown
}

interface PrestazioneCatalogItem {
    id: string
    nome: string
    codice: string | null
    tipo: string | null
    prezzoBase: number | null
    durataPrevista?: number | null
}

interface MedicoOption {
    id: string
    firstName: string | null
    lastName: string | null
    roleTypes?: string | null
}

function parseMedicoRoleTypes(value: string | null | undefined): string[] {
    if (!value) return []
    try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed) ? parsed.map(item => String(item)).filter(Boolean) : []
    } catch {
        return []
    }
}

function isMdlCatalogPrestazione(prestazione: { nome?: string | null; tipo?: string | null }): boolean {
    const text = `${prestazione.tipo || ''} ${prestazione.nome || ''}`.toLowerCase()
    if (text.includes('sportiv') || text.includes('agonistic')) return false
    return text.includes('medicina_lavoro') ||
        text.includes('medicina lavoro') ||
        text.includes('mdl') ||
        text.includes('sorveglianza sanitaria') ||
        text.includes('idoneita lavorativa') ||
        text.includes('idoneità lavorativa')
}

function formatGenderLabel(value: string | null | undefined): string | null {
    if (!value) return null
    const normalized = value.toUpperCase()
    if (normalized === 'M' || normalized === 'MALE' || normalized === 'MASCHIO') return 'Maschio'
    if (normalized === 'F' || normalized === 'FEMALE' || normalized === 'FEMMINA') return 'Femmina'
    return value
}

function addMonthsIso(base: string | null | undefined, months: number | null | undefined): string | null {
    if (!months || months <= 0) return null
    const date = base ? new Date(base) : new Date()
    if (Number.isNaN(date.getTime())) return null
    date.setMonth(date.getMonth() + months)
    return date.toISOString()
}

const MDL_VISIT_TYPE_OPTIONS = [
    { value: 'PREVENTIVA', label: 'Preventiva' },
    { value: 'PREVENTIVA_PREASSUNTIVA', label: 'Preventiva preassuntiva' },
    { value: 'PERIODICA', label: 'Periodica' },
    { value: 'STRAORDINARIA', label: 'Straordinaria' },
]

const HEALTH_PROFILE_FIELDS = [
    'peso', 'altezza', 'bmi', 'fumatore', 'sigaretteGiorno', 'tipoSigaretta', 'etaInizioFumo', 'anniFumo', 'alcol', 'unitaAlcolSettimana',
    'attivitaFisica', 'oreAttivitaSettimana', 'allergieFarmaci', 'farmaci', 'altrePatologie',
    'noteSalute', 'usaDpiPersonali', 'dpiPersonali', 'dpiAzienda', 'usaMezziAziendali',
    'mezziAziendali', 'patenteCategorie', 'patenteScadenza', 'cqc', 'cqcScadenza',
    'hasInvalidita', 'tipoInvalidita', 'gradoInvaliditaCivile', 'legge104', 'hasDiabete',
    'hasIpertensione', 'hasCardiopatie', 'hasAsma', 'hasEpilessia', 'alimentazione', 'porzioniFruttaVerdure', 'droghe',
    'statoCivile', 'numeroFigli', 'professione', 'qualitaSonno', 'oreSonnoNotte',
    'sonnolenzaDiurna', 'apneaNotturna', 'formazioneGenerale', 'formazioneSpecifica',
    'addestramentoCompletato', 'tipoDiabete', 'terapiaInsulina', 'sorveglianzaSanitaria',
    'storicoOccupazionale', 'corsiFormazioneDpi', 'esposizioniLavorative', 'vaccinazioni',
    'abilitazioniMezzi', 'dpiConsegne'
] as const

const HEALTH_PROFILE_LIST_FIELDS = new Set(['dpiPersonali', 'dpiAzienda', 'mezziAziendali', 'patenteCategorie'])
const HEALTH_PROFILE_BOOL_FIELDS = new Set([
    'usaDpiPersonali', 'usaMezziAziendali', 'cqc', 'hasInvalidita', 'legge104',
    'hasDiabete', 'hasIpertensione', 'hasCardiopatie', 'hasAsma', 'hasEpilessia',
    'sonnolenzaDiurna', 'apneaNotturna', 'formazioneGenerale', 'formazioneSpecifica',
    'addestramentoCompletato', 'terapiaInsulina'
])

function parseJsonList(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String).filter(Boolean)
    if (typeof value !== 'string') return []
    try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
        return value.split(',').map(item => item.trim()).filter(Boolean)
    }
}

function normalizeHealthProfileRow(row: Record<string, unknown> | undefined): FormValues {
    if (!row) return {}
    const normalized: FormValues = {}
    for (const field of HEALTH_PROFILE_FIELDS) {
        const value = row[field]
        if (value === undefined || value === null || value === '') continue
        if (HEALTH_PROFILE_LIST_FIELDS.has(field)) normalized[field] = parseJsonList(value)
        else if (HEALTH_PROFILE_BOOL_FIELDS.has(field)) normalized[field] = value === true || value === 1
        else normalized[field] = value
    }
    return normalized
}

function buildHealthProfilePayload(values: FormValues): Record<string, unknown> {
    const payload: Record<string, unknown> = {}
    for (const field of HEALTH_PROFILE_FIELDS) {
        const value = values[field]
        if (value === undefined) continue
        if (HEALTH_PROFILE_LIST_FIELDS.has(field)) payload[field] = Array.isArray(value) ? value : parseJsonList(value)
        else if (HEALTH_PROFILE_BOOL_FIELDS.has(field)) payload[field] = Boolean(value)
        else payload[field] = value === '' ? null : value
    }
    return payload
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
    const location = useLocation()
    const { accessToken } = useDesktopAuth()
    const permissions = useDesktopPermission()
    const locationState = location.state as { from?: string; secondaryVisit?: boolean } | null
    const backTarget = !locationState?.secondaryVisit && locationState?.from ? locationState.from : '/visite'

    // Core data
    const [visit, setVisit] = useState<Visit | null>(null)
    const [patient, setPatient] = useState<Patient | null>(null)
    const [prestazioniAppt, setPrestazioniAppt] = useState<PrestazioneAppt[]>([])
    const [patientVisits, setPatientVisits] = useState<VisitHistoryItem[]>([])
    const [patientScadenze, setPatientScadenze] = useState<PatientScadenzaItem[]>([])
    const [prestazioniCatalog, setPrestazioniCatalog] = useState<PrestazioneCatalogItem[]>([])
    const [prestazioneSearch, setPrestazioneSearch] = useState('')
    const [prestazionePickerOpen, setPrestazionePickerOpen] = useState(false)
    const [mediciOptions, setMediciOptions] = useState<MedicoOption[]>([])
    const [medicoPickerOpen, setMedicoPickerOpen] = useState(false)
    const [medicoSearch, setMedicoSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Template dinamici (P52): se caricato, usa sezioni e campi dal template
    const [templateFields, setTemplateFields] = useState<VisitField[] | null>(null)
    const [templateSections, setTemplateSections] = useState<{ id: string; label: string }[] | null>(null)
    const [, setTemplateSectionLayout] = useState<'tabs' | 'sections' | 'continuous'>('tabs')

    // Form state
    const [formValues, setFormValues] = useState<FormValues>({})
    const [activeSection, setActiveSection] = useState('anamnesi')
    const [hasChanges, setHasChanges] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    // Save state
    const [saveError, setSaveError] = useState<string | null>(null)

    // Timer
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    // Referto PDF state
    const [pdfGenerating, setPdfGenerating] = useState(false)
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)

    // Layout mode: default scroll keeps one continuous visit page; sidebar section buttons scroll to anchors.
    const [layoutMode, setLayoutMode] = useState<'tabs' | 'scroll'>('scroll')
    const [showPatientEdit, setShowPatientEdit] = useState(false)
    const [showHealthEdit, setShowHealthEdit] = useState(false)
    const [editingCompletedVisit, setEditingCompletedVisit] = useState(false)
    const [healthTab, setHealthTab] = useState<'clinica' | 'abitudini' | 'dpi' | 'patente' | 'malattie'>('clinica')
    const [expandedQuickAction, setExpandedQuickAction] = useState<string | null>('note')
    const [showQuestionariModal, setShowQuestionariModal] = useState(false)
    const [showModulisticaModal, setShowModulisticaModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)
    const [selectedHistoryVisit, setSelectedHistoryVisit] = useState<VisitHistoryItem | null>(null)
    const [showExitDialog, setShowExitDialog] = useState(false)
    const [exitActionLoading, setExitActionLoading] = useState(false)
    const [pendingNavigationTarget, setPendingNavigationTarget] = useState<string | null>(null)
    const [discardReason, setDiscardReason] = useState('')
    const [exitError, setExitError] = useState<string | null>(null)
    const [exitDiscardStep, setExitDiscardStep] = useState(false)
    const [patientForm, setPatientForm] = useState({
        email: '',
        phone: '',
        firstName: '',
        lastName: '',
        taxCode: '',
        birthDate: '',
        birthPlace: '',
        gender: '',
        title: '',
        status: '',
        residenceAddress: '',
        residenceCity: '',
        province: '',
        postalCode: '',
    })
    const [healthForm, setHealthForm] = useState({
        peso: '',
        altezza: '',
        paSistolica: '',
        paDiastolica: '',
        fc: '',
        spo2: '',
        temperatura: '',
        bmi: '',
        prossimoControllo: '',
        periodicitaMesi: '',
        fumatore: '',
        sigaretteGiorno: '',
        tipoSigaretta: '',
        etaInizioFumo: '',
        anniFumo: '',
        alcol: '',
        unitaAlcolSettimana: '',
        attivitaFisica: '',
        oreAttivitaSettimana: '',
        noteSalute: '',
        allergieFarmaci: '',
        farmaci: '',
        altrePatologie: '',
        usaDpiPersonali: false,
        dpiPersonali: '',
        dpiAzienda: '',
        usaMezziAziendali: false,
        mezziAziendali: '',
        patenteCategorie: '',
        patenteScadenza: '',
        cqc: false,
        cqcScadenza: '',
        hasInvalidita: false,
        tipoInvalidita: '',
        gradoInvaliditaCivile: '',
        legge104: false,
        hasDiabete: false,
        hasIpertensione: false,
        hasCardiopatie: false,
        hasAsma: false,
        hasEpilessia: false,
        alimentazione: '',
        porzioniFruttaVerdure: '',
        droghe: '',
        statoCivile: '',
        numeroFigli: '',
        professione: '',
        qualitaSonno: '',
        oreSonnoNotte: '',
        sonnolenzaDiurna: false,
        apneaNotturna: false,
        formazioneGenerale: false,
        formazioneSpecifica: false,
        addestramentoCompletato: false,
        malattieProfessionali: '',
    })

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

    // Refs for save
    const formValuesRef = useRef<FormValues>({})
    useEffect(() => { formValuesRef.current = formValues }, [formValues])
    const isCompletedLocked = !!visit && visit.stato === 'COMPLETATA' && !editingCompletedVisit
    const isReadOnly = !visit || visit.stato === 'ANNULLATA' || !permissions.canUpdateVisite() || isCompletedLocked
    const shouldConfirmExit = !!visit && !['COMPLETATA', 'ANNULLATA'].includes(String(visit.stato || '')) && !locationState?.secondaryVisit

    const resolveOfflineVisitTemplate = useCallback(async (targetVisit: Visit): Promise<string | null> => {
        if (!window.desktopApi || targetVisit.templateId) return targetVisit.templateId
        const templates = await window.desktopApi.db.query({
            table: 'visit_templates',
            where: { _isDeleted: 0 }
        }).catch(() => []) as Array<{
            id: string
            tenantId?: string | null
            tipo?: string | null
            medicoId?: string | null
            prestazioneId?: string | null
            isDefault?: number | boolean | null
        }>
        const activeTemplates = templates.filter(template => !template.tenantId || template.tenantId === targetVisit.tenantId)
        const scopeOf = (template: { tipo?: string | null }): string => String(template.tipo || '').toUpperCase()
        const byMedicoPrestazione = activeTemplates.find(template =>
            template.medicoId === targetVisit.medicoId &&
            !!targetVisit.prestazioneId &&
            template.prestazioneId === targetVisit.prestazioneId
        )
        if (byMedicoPrestazione) return byMedicoPrestazione.id
        const byMedicoGeneric = activeTemplates.find(template =>
            template.medicoId === targetVisit.medicoId &&
            !template.prestazioneId &&
            scopeOf(template) === 'PERSONAL'
        )
        if (byMedicoGeneric) return byMedicoGeneric.id
        const byPrestazione = activeTemplates.find(template =>
            !!targetVisit.prestazioneId &&
            template.prestazioneId === targetVisit.prestazioneId &&
            !template.medicoId &&
            scopeOf(template) === 'PRESTAZIONE'
        )
        if (byPrestazione) return byPrestazione.id
        const byMedicoDefault = activeTemplates.find(template =>
            template.medicoId === targetVisit.medicoId &&
            (template.isDefault === true || template.isDefault === 1)
        )
        if (byMedicoDefault) return byMedicoDefault.id
        const byGlobal = activeTemplates.find(template =>
            !template.medicoId &&
            scopeOf(template) === 'GLOBAL' &&
            (template.isDefault === true || template.isDefault === 1)
        )
        return byGlobal?.id || null
    }, [])

    useEffect(() => {
        if (!hasChanges && !shouldConfirmExit) return
        const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasChanges, shouldConfirmExit])

    useEffect(() => {
        if (!shouldConfirmExit) return
        const handlePopState = (): void => {
            window.history.pushState(null, '', window.location.href)
            setExitError(null)
            setExitDiscardStep(false)
            setShowExitDialog(true)
        }
        window.history.pushState(null, '', window.location.href)
        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [shouldConfirmExit])

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
        }
    }, [pdfPreviewUrl])

    useEffect(() => {
        if (!patient) return
        setPatientForm({
            email: patient.email || '',
            phone: patient.phone || '',
            firstName: patient.firstName || '',
            lastName: patient.lastName || '',
            taxCode: patient.taxCode || '',
            birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
            birthPlace: patient.birthPlace || '',
            gender: patient.gender || '',
            title: patient.title || '',
            status: patient.status || '',
            residenceAddress: patient.residenceAddress || '',
            residenceCity: patient.residenceCity || '',
            province: patient.province || '',
            postalCode: patient.postalCode || '',
        })
    }, [patient])

    useEffect(() => {
        setHealthForm({
            peso: formValues.peso != null ? String(formValues.peso) : '',
            altezza: formValues.altezza != null ? String(formValues.altezza) : '',
            paSistolica: formValues.paSistolica != null ? String(formValues.paSistolica) : '',
            paDiastolica: formValues.paDiastolica != null ? String(formValues.paDiastolica) : '',
            fc: formValues.fc != null ? String(formValues.fc) : '',
            spo2: formValues.spo2 != null ? String(formValues.spo2) : '',
            temperatura: formValues.temperatura != null ? String(formValues.temperatura) : '',
            bmi: formValues.bmi != null ? String(formValues.bmi) : '',
            prossimoControllo: (formValues.prossimoControllo as string) || '',
            periodicitaMesi: formValues.periodicitaMesi != null ? String(formValues.periodicitaMesi) : '',
            fumatore: (formValues.fumatore as string) || '',
            sigaretteGiorno: formValues.sigaretteGiorno != null ? String(formValues.sigaretteGiorno) : '',
            tipoSigaretta: (formValues.tipoSigaretta as string) || '',
            etaInizioFumo: formValues.etaInizioFumo != null ? String(formValues.etaInizioFumo) : '',
            anniFumo: formValues.anniFumo != null ? String(formValues.anniFumo) : '',
            alcol: (formValues.alcol as string) || '',
            unitaAlcolSettimana: formValues.unitaAlcolSettimana != null ? String(formValues.unitaAlcolSettimana) : '',
            attivitaFisica: (formValues.attivitaFisica as string) || '',
            oreAttivitaSettimana: formValues.oreAttivitaSettimana != null ? String(formValues.oreAttivitaSettimana) : '',
            noteSalute: (formValues.noteSalute as string) || '',
            allergieFarmaci: (formValues.allergieFarmaci as string) || '',
            farmaci: (formValues.farmaci as string) || '',
            altrePatologie: (formValues.altrePatologie as string) || '',
            usaDpiPersonali: Boolean(formValues.usaDpiPersonali),
            dpiPersonali: Array.isArray(formValues.dpiPersonali) ? formValues.dpiPersonali.join(', ') : String(formValues.dpiPersonali || ''),
            dpiAzienda: Array.isArray(formValues.dpiAzienda) ? formValues.dpiAzienda.join(', ') : String(formValues.dpiAzienda || ''),
            usaMezziAziendali: Boolean(formValues.usaMezziAziendali),
            mezziAziendali: Array.isArray(formValues.mezziAziendali) ? formValues.mezziAziendali.join(', ') : String(formValues.mezziAziendali || ''),
            patenteCategorie: Array.isArray(formValues.patenteCategorie) ? formValues.patenteCategorie.join(', ') : String(formValues.patenteCategorie || ''),
            patenteScadenza: (formValues.patenteScadenza as string) || '',
            cqc: Boolean(formValues.cqc),
            cqcScadenza: (formValues.cqcScadenza as string) || '',
            hasInvalidita: Boolean(formValues.hasInvalidita),
            tipoInvalidita: (formValues.tipoInvalidita as string) || '',
            gradoInvaliditaCivile: formValues.gradoInvaliditaCivile != null ? String(formValues.gradoInvaliditaCivile) : '',
            legge104: Boolean(formValues.legge104),
            hasDiabete: Boolean(formValues.hasDiabete),
            hasIpertensione: Boolean(formValues.hasIpertensione),
            hasCardiopatie: Boolean(formValues.hasCardiopatie),
            hasAsma: Boolean(formValues.hasAsma),
            hasEpilessia: Boolean(formValues.hasEpilessia),
            alimentazione: (formValues.alimentazione as string) || '',
            porzioniFruttaVerdure: formValues.porzioniFruttaVerdure != null ? String(formValues.porzioniFruttaVerdure) : '',
            droghe: (formValues.droghe as string) || '',
            statoCivile: (formValues.statoCivile as string) || '',
            numeroFigli: formValues.numeroFigli != null ? String(formValues.numeroFigli) : '',
            professione: (formValues.professione as string) || '',
            qualitaSonno: (formValues.qualitaSonno as string) || '',
            oreSonnoNotte: formValues.oreSonnoNotte != null ? String(formValues.oreSonnoNotte) : '',
            sonnolenzaDiurna: Boolean(formValues.sonnolenzaDiurna),
            apneaNotturna: Boolean(formValues.apneaNotturna),
            formazioneGenerale: Boolean(formValues.formazioneGenerale),
            formazioneSpecifica: Boolean(formValues.formazioneSpecifica),
            addestramentoCompletato: Boolean(formValues.addestramentoCompletato),
            malattieProfessionali: (formValues.malattieProfessionali as string) || '',
        })
    }, [formValues])

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
            let loadedFormValues: FormValues = {}
            try {
                const parsed = JSON.parse(v.datiStrutturati || '{}')
                loadedFormValues = parsed && typeof parsed === 'object' ? parsed as FormValues : {}
            } catch {
                loadedFormValues = {}
            }
            if (v.personId) {
                const healthRows = await window.desktopApi.db.query({
                    table: 'profili_salute',
                    where: { personId: v.personId, _isDeleted: 0 },
                    limit: 1
                }) as Record<string, unknown>[]
                loadedFormValues = { ...loadedFormValues, ...normalizeHealthProfileRow(healthRows[0]) }
            }
            setFormValues(loadedFormValues)
            if (!v.appuntamentoId && Array.isArray(loadedFormValues._prestazioniAggiuntive)) {
                const savedPrestazioni = (loadedFormValues._prestazioniAggiuntive as Array<Record<string, unknown>>)
                    .map(item => ({
                        prestazioneId: String(item.id || item.prestazioneId || ''),
                        nome: String(item.nome || item.name || 'Prestazione'),
                        codice: (item.codice as string | null) || null,
                        tipo: (item.tipo as string | null) || null,
                        prezzoCalcolato: item.prezzoCalcolato != null || item.prezzoBase != null ? Number(item.prezzoCalcolato ?? item.prezzoBase) : null,
                    }))
                    .filter(item => item.prestazioneId)
                if (savedPrestazioni.length > 0) setPrestazioniAppt(savedPrestazioni)
            }

            // Load visit template with the same priority used by the webapp.
            const resolvedTemplateId = await resolveOfflineVisitTemplate(v)
            if (resolvedTemplateId && resolvedTemplateId !== v.templateId) {
                v.templateId = resolvedTemplateId
                await window.desktopApi.db.update({ table: 'visits', id: v.id, data: { templateId: resolvedTemplateId, updatedAt: new Date().toISOString() } }).catch(() => undefined)
            }
            if (resolvedTemplateId) {
                try {
                    const templates = await window.desktopApi.db.query({
                        table: 'visit_templates',
                        where: { id: resolvedTemplateId, _isDeleted: 0 },
                        limit: 1
                    }) as Array<{ fields: string | null; nome: string; sidebarConfig?: string | null }>
                    if (templates.length > 0) {
                        let fields: VisitField[] = []
                        try { fields = JSON.parse(templates[0].fields || '[]') } catch { /* keep empty */ }
                        try {
                            const sidebarConfig = templates[0].sidebarConfig ? JSON.parse(templates[0].sidebarConfig) as { sectionLayout?: 'tabs' | 'sections' | 'continuous' } : null
                            setTemplateSectionLayout(sidebarConfig?.sectionLayout || 'tabs')
                            setLayoutMode(sidebarConfig?.sectionLayout === 'tabs' ? 'tabs' : 'scroll')
                        } catch { setTemplateSectionLayout('tabs') }
                        const visibleFields = fields.filter(f => f.visible !== false)
                        setTemplateFields(visibleFields)
                        // Build ordered sections list from template fields
                        const sectionOrder: { id: string; label: string }[] = []
                        const seen = new Set<string>()
                        for (const f of visibleFields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
                            if (f.section && !seen.has(f.section)) {
                                seen.add(f.section)
                                sectionOrder.push({ id: f.section, label: f.section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) })
                            }
                        }
                        if (sectionOrder.length > 0) {
                            setTemplateSections(sectionOrder)
                            setActiveSection(sectionOrder[0].id)
                        }
                    }
                } catch { /* template load failure is non-blocking */ }
            }

            // Load patient
            if (v.personId) {
                const patients = await window.desktopApi.db.query({
                    table: 'patients',
                    where: { id: v.personId, _isDeleted: 0 },
                    limit: 1
                }) as Patient[]
                const loadedPatient = patients[0]
                if (loadedPatient) setPatient(loadedPatient)
                const historyRows = await window.desktopApi.db.query({
                    table: 'visits',
                    where: { personId: v.personId, _isDeleted: 0 },
                    orderBy: { column: 'dataOra', direction: 'DESC' }
                }) as VisitHistoryItem[]
                setPatientVisits(historyRows.filter(row => row.id !== v.id))
                const scadenzeRows = await window.desktopApi.db.query({
                    table: 'scadenze',
                    where: { personId: v.personId, _isDeleted: 0 },
                    orderBy: { column: 'dataScadenza', direction: 'ASC' }
                }) as PatientScadenzaItem[]
                if (scadenzeRows.length > 0) {
                    setPatientScadenze(scadenzeRows)
                } else {
                    const assignments = await window.desktopApi.db.query({
                        table: 'lavoratore_mansioni',
                        where: { personId: v.personId, _isDeleted: 0 }
                    }) as Array<{ mansioneId: string | null }>
                    const mansioneIds = assignments.map(a => a.mansioneId).filter(Boolean) as string[]
                    const allProtocolli = await window.desktopApi.db.query({
                        table: 'protocolli',
                        where: { _isDeleted: 0 }
                    }) as Array<{ id: string; mansioneId: string | null; nome: string | null; mansioneNome: string | null }>
                    const allProtocolloPrestazioni = await window.desktopApi.db.query({
                        table: 'protocollo_prestazioni',
                        where: { _isDeleted: 0 }
                    }).catch(() => []) as Array<ProtocolloPrestazioneRow & { protocolloId: string }>
                    const fallbackScadenze = allProtocolli
                        .filter(p => (p.id && loadedPatient?.protocolloSanitarioId === p.id) || (p.mansioneId && mansioneIds.includes(p.mansioneId)))
                        .flatMap(p => {
                            const dedicated = allProtocolloPrestazioni.filter(row => row.protocolloId === p.id)
                            if (dedicated.length > 0) {
                                return normalizeProtocolloPrestazioni(dedicated).map((item, idx) => ({
                                    id: `protocollo:${p.id}:${item.prestazioneId || idx}`,
                                    prestazioneId: item.prestazioneId || null,
                                    prestazioneNome: item.prestazioneNome,
                                    mansione: p.mansioneNome,
                                    personId: v.personId,
                                    tenantId: v.tenantId,
                                    mansioneId: p.mansioneId,
                                    protocolloId: p.id,
                                    dataScadenza: addMonthsIso(v.dataOra || v.dataInizio, item.periodicitaMesi),
                                    periodicitaMesi: item.periodicitaMesi,
                                    eseguita: 0,
                                    stato: 'Da programmare',
                                }))
                            }
                            return []
                        })
                    setPatientScadenze(fallbackScadenze)
                }
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
    }, [id, resolveOfflineVisitTemplate])

    useEffect(() => { loadVisit() }, [loadVisit])

    useEffect(() => {
        if (!window.desktopApi) return
        void Promise.all([
            window.desktopApi.db.query({ table: 'prestazioni', where: { _isDeleted: 0 }, orderBy: { column: 'nome', direction: 'ASC' } }),
            window.desktopApi.db.query({ table: 'medici', where: { _isDeleted: 0 }, orderBy: { column: 'lastName', direction: 'ASC' } }).catch(() => []),
            window.desktopApi.db.query({ table: 'visits', where: { _isDeleted: 0 }, orderBy: { column: 'medicoLastName', direction: 'ASC' } })
        ]).then(async ([prestRows, mediciRows, visitRows]) => {
            setPrestazioniCatalog(prestRows as PrestazioneCatalogItem[])
            const map = new Map<string, MedicoOption>()
            if (visit?.medicoId) map.set(visit.medicoId, { id: visit.medicoId, firstName: visit.medicoFirstName, lastName: visit.medicoLastName })
            if (permissions.canChangeRefertante()) {
                for (const m of mediciRows as Array<{ id: string; firstName: string | null; lastName: string | null; roleTypes?: string | null }>) {
                    const roles = parseMedicoRoleTypes(m.roleTypes)
                    const canRefertare = roles.length === 0 || roles.some(role => role === 'MEDICO' || role === 'MEDICO_COMPETENTE')
                    if (canRefertare && m.id && !map.has(m.id)) map.set(m.id, { id: m.id, firstName: m.firstName, lastName: m.lastName, roleTypes: m.roleTypes })
                }
                if (accessToken) {
                    try {
                        const response = await axios.get(`${API_BASE}/api/v1/clinica/medici`, {
                            params: { limit: 500 },
                            headers: { Authorization: `Bearer ${accessToken}` },
                            timeout: 30000,
                        })
                        const onlineRows = response.data?.data?.data || response.data?.data || []
                        for (const m of onlineRows as Array<{ id: string; firstName?: string | null; lastName?: string | null; nome?: string | null; cognome?: string | null }>) {
                            if (m.id && !map.has(m.id)) map.set(m.id, { id: m.id, firstName: m.firstName || m.nome || null, lastName: m.lastName || m.cognome || null })
                        }
                    } catch {
                        // Offline fallback: keep local doctors.
                    }
                }
            }
            for (const v of visitRows as Array<{ medicoId: string | null; medicoFirstName: string | null; medicoLastName: string | null }>) {
                if (v.medicoId && !map.has(v.medicoId)) {
                    map.set(v.medicoId, { id: v.medicoId, firstName: v.medicoFirstName, lastName: v.medicoLastName })
                }
            }
            setMediciOptions([...map.values()].filter(m => m.lastName || m.firstName))
        }).catch(() => undefined)
    }, [accessToken, permissions, visit?.medicoId, visit?.medicoFirstName, visit?.medicoLastName])

    // Load appointment prestazioni + resolve tariffario prices
    useEffect(() => {
        const load = async (): Promise<void> => {
            if (!visit?.appuntamentoId || !window.desktopApi) return
            try {
                const apRows = await window.desktopApi.db.query({
                    table: 'appointment_prestazioni',
                    where: { appuntamentoId: visit.appuntamentoId, _isDeleted: 0 }
                }) as Array<{ prestazioneId: string }>
                if (apRows.length === 0) return

                // Get company for tariffario lookup
                const apptRows = await window.desktopApi.db.query({
                    table: 'appointments',
                    where: { id: visit.appuntamentoId, _isDeleted: 0 },
                    limit: 1
                }) as Array<{ companyTenantProfileId: string | null }>
                const companyId = apptRows[0]?.companyTenantProfileId || null

                // Build company-specific tariffario price map
                const tariffVoci = new Map<string, number>()
                if (companyId) {
                    const associations = await window.desktopApi.db.query({
                        table: 'tariffario_company_associations',
                        where: { companyTenantProfileId: companyId, _isDeleted: 0, attivo: 1 }
                    }).catch(() => []) as Array<{ tariffarioId: string }>
                    const tariffarioIds = new Set(associations.map(a => a.tariffarioId))
                    if (tariffarioIds.size > 0) {
                        const voci = await window.desktopApi.db.query({
                            table: 'tariffario_voci',
                            where: { _isDeleted: 0, attivo: 1 }
                        }).catch(() => []) as Array<{ tariffarioAziendaleId: string; prestazioneId: string | null; prezzoBase: number }>
                        for (const v of voci) {
                            if (tariffarioIds.has(v.tariffarioAziendaleId) && v.prestazioneId && Number(v.prezzoBase) > 0) {
                                tariffVoci.set(v.prestazioneId, Number(v.prezzoBase))
                            }
                        }
                    }
                }

                // Fetch each prestazione detail
                const result: PrestazioneAppt[] = []
                for (const ap of apRows) {
                    const presRows = await window.desktopApi.db.query({
                        table: 'prestazioni',
                        where: { id: ap.prestazioneId, _isDeleted: 0 },
                        limit: 1
                    }) as Array<{ nome: string | null; codice: string | null; tipo: string | null; prezzoBase: number | null }>
                    const pres = presRows[0]
                    if (pres) {
                        result.push({
                            prestazioneId: ap.prestazioneId,
                            nome: pres.nome || 'Prestazione',
                            codice: pres.codice,
                            tipo: pres.tipo,
                            prezzoCalcolato: tariffVoci.get(ap.prestazioneId) ?? pres.prezzoBase ?? null,
                        })
                    }
                }
                setPrestazioniAppt(result)
            } catch { /* non-blocking */ }
        }
        load()
    }, [visit?.appuntamentoId])

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

    // ----------------------------------------------------------
    // Save
    // ----------------------------------------------------------

    const doSave = useCallback(async () => {
        if (!visit || !window.desktopApi || isSaving) return
        if (!permissions.canUpdateVisite()) return
        setIsSaving(true)
        setSaveError(null)

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
                entity: 'visits',
                entityId: visit._serverId || visit.id,
                localId: visit._localId,
                payload: { datiStrutturati }
            })

            setHasChanges(false)
            setLastSaved(new Date())
            if (visit.stato === 'COMPLETATA') setEditingCompletedVisit(false)
        } catch {
            setSaveError('Errore nel salvataggio. Riprova.')
        } finally {
            setIsSaving(false)
        }
    }, [visit, isSaving, permissions])

    const buildPdfData = useCallback(() => {
        if (!visit) return null
        return {
            visitId: visit.id,
            dataOra: visit.dataOra,
            stato: visit.stato,
            tipoVisitaMDL: visit.tipoVisitaMDL,
            prestazioneNome: visit.prestazioneNome,
            personFirstName: visit.personFirstName,
            personLastName: visit.personLastName,
            personTaxCode: visit.personTaxCode,
            patientBirthDate: patient?.birthDate,
            patientGender: patient?.gender,
            patientResidenceCity: patient?.residenceCity,
            medicoFirstName: visit.medicoFirstName,
            medicoLastName: visit.medicoLastName,
            companyName: visit.companyName,
            formValues: formValuesRef.current,
            durataMinuti: visit.durataMinuti,
        }
    }, [patient, visit])

    const fetchServerRefertoPdf = useCallback(async (regenerate: boolean): Promise<{ blob: Blob; filename: string } | null> => {
        if (!visit?._serverId || !accessToken) return null
        const headers = { Authorization: `Bearer ${accessToken}` }
        const request = async (method: 'get' | 'post') => {
            const response = method === 'post'
                ? await axios.post(`${API_BASE}/api/v1/clinica/visite/${visit._serverId}/pdf`, {}, { headers, timeout: 60000 })
                : await axios.get(`${API_BASE}/api/v1/clinica/visite/${visit._serverId}/pdf`, { headers, timeout: 30000 })
            return response.data?.data as { fileUrl?: string; displayFilename?: string } | null
        }
        let referto = regenerate ? await request('post') : await request('get')
        if (!referto?.fileUrl && !regenerate) referto = await request('post')
        if (!referto?.fileUrl) return null
        const fileUrl = referto.fileUrl.startsWith('http') ? referto.fileUrl : `${API_BASE}${referto.fileUrl}`
        const file = await axios.get(fileUrl, { headers, responseType: 'blob', timeout: 60000 })
        return {
            blob: file.data as Blob,
            filename: referto.displayFilename || `referto_${visit._serverId}.pdf`,
        }
    }, [accessToken, visit?._serverId])

    const generatePdfPreview = useCallback(async (): Promise<void> => {
        const data = buildPdfData()
        if (!data) return
        setPdfGenerating(true)
        try {
            const serverPdf = await fetchServerRefertoPdf(true).catch(() => null)
            const blob = serverPdf?.blob || await (async () => {
                const { createVisitaReferroPdfBlob } = await import('../components/visita/VisitaReferroPdf')
                return createVisitaReferroPdfBlob(data)
            })()
            const url = URL.createObjectURL(blob)
            setPdfPreviewUrl(prev => {
                if (prev) URL.revokeObjectURL(prev)
                return url
            })
        } finally {
            setPdfGenerating(false)
        }
    }, [buildPdfData, fetchServerRefertoPdf])

    const handleHeaderSave = useCallback(async () => {
        if (hasChanges) {
            await doSave()
            if (visit?.stato === 'COMPLETATA') await generatePdfPreview()
            return
        }
        if (visit?.stato === 'COMPLETATA') {
            setEditingCompletedVisit(false)
            setLastSaved(new Date())
            await generatePdfPreview()
        }
    }, [doSave, generatePdfPreview, hasChanges, visit?.stato])

    const handleCancelCompletedEdit = useCallback(async () => {
        if (hasChanges && window.desktopApi) {
            const confirmed = await window.desktopApi.app.confirmDialog({
                title: 'Annulla modifiche visita',
                message: 'Annullare le modifiche non salvate e bloccare di nuovo la visita?',
                detail: 'I dati non salvati verranno ricaricati dalla copia locale.',
                buttons: ['Continua modifica', 'Annulla modifiche'],
                defaultId: 0,
                type: 'warning'
            })
            if (!confirmed) return
        }
        setEditingCompletedVisit(false)
        setHasChanges(false)
        await loadVisit()
    }, [hasChanges, loadVisit])

    // Save on section change
    const changeSection = useCallback(async (newSection: string) => {
        if (hasChanges && visit && window.desktopApi) {
            await doSave()
        }
        setActiveSection(newSection)
        if (layoutMode === 'scroll') {
            requestAnimationFrame(() => {
                sectionRefs.current[newSection]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            })
        }
    }, [hasChanges, visit, doSave, layoutMode])

    // ----------------------------------------------------------
    // Complete visit
    // ----------------------------------------------------------

    const handleComplete = useCallback(async () => {
        if (!visit || !window.desktopApi) return
        if (!permissions.canUpdateVisite()) return

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
            entity: 'visits',
            entityId: visit._serverId || visit.id,
            localId: visit._localId,
            payload: {
                stato: 'COMPLETATA',
                durataEffettiva: durataMinuti,  // Prisma field name (local: durataMinuti)
                datiStrutturati: formValuesRef.current  // send as object, not JSON string
                // dataFine is local-only, not in Prisma Visita schema
            }
        })

        // Auto-generate MovimentoContabile ENTRATA
        try {
            let existing = await window.desktopApi.db.query({
                table: 'movimenti_contabili',
                where: { visitaId: visit.id, _isDeleted: 0 }
            }) as Array<{ id: string }>
            if (existing.length === 0 && visit.appuntamentoId) {
                existing = await window.desktopApi.db.query({
                    table: 'movimenti_contabili',
                    where: { appuntamentoId: visit.appuntamentoId, _isDeleted: 0 }
                }) as Array<{ id: string }>
            }

            if (existing.length === 0) {
                // Resolve price:
                // 1. visit.totaleCosto (if set)
                // 2. Company-specific tariffario voce for this prestazione
                // 3. Fallback: prestazioni.prezzoBase
                let importo = visit.totaleCosto || 0
                let companyTenantProfileId: string | null = null

                if (importo === 0 && visit.appuntamentoId) {
                    // Get appointment to find company + prestazione
                    const apptRows = await window.desktopApi.db.query({
                        table: 'appointments',
                        where: { id: visit.appuntamentoId, _isDeleted: 0 }
                    }) as Array<{ companyTenantProfileId: string | null }>
                    companyTenantProfileId = apptRows[0]?.companyTenantProfileId || null

                    const apRows = await window.desktopApi.db.query({
                        table: 'appointment_prestazioni',
                        where: { appuntamentoId: visit.appuntamentoId, _isDeleted: 0 }
                    }) as Array<{ prestazioneId: string }>

                    if (apRows.length > 0) {
                        const prestazioneId = apRows[0].prestazioneId

                        // Try company-specific tariffario first
                        if (companyTenantProfileId) {
                            const associations = await window.desktopApi.db.query({
                                table: 'tariffario_company_associations',
                                where: { companyTenantProfileId: companyTenantProfileId, _isDeleted: 0, attivo: 1 }
                            }).catch(() => []) as Array<{ tariffarioId: string }>
                            const tariffarioIds = new Set(associations.map(a => a.tariffarioId))
                            if (tariffarioIds.size > 0) {
                                const voci = await window.desktopApi.db.query({
                                    table: 'tariffario_voci',
                                    where: { prestazioneId, _isDeleted: 0, attivo: 1 }
                                }).catch(() => []) as Array<{ tariffarioAziendaleId: string; prezzoBase: number }>
                                const voce = voci.find(v => tariffarioIds.has(v.tariffarioAziendaleId) && Number(v.prezzoBase) > 0)
                                if (voce) {
                                    importo = Number(voce.prezzoBase)
                                }
                            }
                        }

                        // Fallback to base price in prestazioni catalog
                        if (importo === 0) {
                            const presRows = await window.desktopApi.db.query({
                                table: 'prestazioni',
                                where: { id: prestazioneId, _isDeleted: 0 }
                            }) as Array<{ prezzoBase: number | null }>
                            if (presRows.length > 0 && presRows[0].prezzoBase) {
                                importo = presRows[0].prezzoBase
                            }
                        }
                    }
                }

                const movData = {
                    tenantId: visit.tenantId,
                    visitaId: visit.id,
                    appuntamentoId: visit.appuntamentoId ?? null,
                    personId: visit.personId,
                    companyTenantProfileId: companyTenantProfileId ?? null,
                    tipo: visit.tipoVisitaMDL ? 'VISITA_MDL' : 'VISITA_MEDICA',
                    descrizione: `Visita ${visit.tipoVisitaMDL || 'medica'} — ${visit.personLastName || ''} ${visit.personFirstName || ''}`.trim(),
                    importo,
                    iva: 0,
                    importoNetto: importo,
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
                    entity: 'movimenti_contabili',
                    entityId: movId,
                    payload: movData
                })
            } else {
                const movUpdate = {
                    visitaId: visit.id,
                    appuntamentoId: visit.appuntamentoId ?? null,
                    stato: 'DA_FATTURARE',
                    dataMovimento: now,
                    updatedAt: now,
                }
                await window.desktopApi.db.update({
                    table: 'movimenti_contabili',
                    id: existing[0].id,
                    data: movUpdate
                })
                await window.desktopApi.sync.enqueue({
                    type: 'UPDATE',
                    entity: 'movimenti_contabili',
                    entityId: existing[0].id,
                    payload: movUpdate
                })
            }
        } catch {
            // Non-blocking: movement generation failure shouldn't prevent visit completion
        }

        // Auto-generate ScadenzeMDL post-visita (based on patient protocol)
        if (visit.personId) {
            try {
                const mansioni = await window.desktopApi.db.query({
                    table: 'lavoratore_mansioni',
                    where: { personId: visit.personId, _isDeleted: 0 }
                }) as Array<{ id: string; mansioneId: string }>

                if (mansioni.length > 0) {
                    const mansioneIds = [...new Set(mansioni.map(m => m.mansioneId))]

                    const allProtocolli = await window.desktopApi.db.query({
                        table: 'protocolli',
                        where: { _isDeleted: 0 }
                    }) as Array<{ id: string; mansioneId: string | null }>
                    const allProtocolloPrestazioni = await window.desktopApi.db.query({
                        table: 'protocollo_prestazioni',
                        where: { _isDeleted: 0 }
                    }).catch(() => []) as Array<ProtocolloPrestazioneRow & { protocolloId: string }>

                    const relevantProtocolli = allProtocolli.filter(
                        p => p.mansioneId && mansioneIds.includes(p.mansioneId)
                    )

                    for (const protocollo of relevantProtocolli) {
                        const dedicated = allProtocolloPrestazioni.filter(row => row.protocolloId === protocollo.id)
                        const prestazioniItems = dedicated.length > 0
                            ? normalizeProtocolloPrestazioni(dedicated)
                            : []

                        const mansioneId = mansioni.find(m => m.mansioneId === protocollo.mansioneId)?.mansioneId ?? null

                        for (const item of prestazioniItems) {
                            const periodicitaMesi = item.periodicitaMesi ?? 0
                            if (periodicitaMesi <= 0 || !item.prestazioneId) continue

                            // Skip if already pending scadenza for this person + prestazione
                            const existing = await window.desktopApi.db.query({
                                table: 'scadenze',
                                where: { personId: visit.personId!, prestazioneId: item.prestazioneId, eseguita: 0, _isDeleted: 0 }
                            }) as Array<{ id: string }>
                            if (existing.length > 0) continue

                            // Resolve prestazione name (from nested object or local table)
                            let prestazioneNome = item.prestazioneNome || ''
                            if (!prestazioneNome) {
                                const presRows = await window.desktopApi.db.query({
                                    table: 'prestazioni',
                                    where: { id: item.prestazioneId, _isDeleted: 0 }
                                }) as Array<{ nome: string }>
                                prestazioneNome = presRows[0]?.nome || 'Visita medica'
                            }

                            // Compute dataScadenza
                            const scadenzaDate = new Date()
                            scadenzaDate.setMonth(scadenzaDate.getMonth() + periodicitaMesi)
                            const dataScadenza = scadenzaDate.toISOString()
                            const scadenzaId = crypto.randomUUID()

                            // Insert local scadenza record (only fields present in scadenze schema)
                            await window.desktopApi.db.insert({
                                table: 'scadenze',
                                data: {
                                    id: scadenzaId,
                                    tenantId: visit.tenantId,
                                    personId: visit.personId!,
                                    prestazioneId: item.prestazioneId,
                                    mansioneId,
                                    protocolloId: protocollo.id,
                                    dataScadenza,
                                    periodicitaMesi,
                                    eseguita: 0,
                                    visitaId: visit.id,
                                    isPrimaVisita: 0,
                                    personFirstName: visit.personFirstName,
                                    personLastName: visit.personLastName,
                                    prestazioneNome,
                                    stato: 'ATTIVA',
                                    createdAt: now,
                                    updatedAt: now
                                }
                            })

                            // Enqueue CREATE scadenzaPrestazioneProtocollo for server sync
                            await window.desktopApi.sync.enqueue({
                                type: 'CREATE',
                                entity: 'scadenzaPrestazioneProtocollo',
                                entityId: scadenzaId,
                                payload: {
                                    id: scadenzaId,
                                    tenantId: visit.tenantId,
                                    personId: visit.personId!,
                                    mansioneId: mansioneId || protocollo.mansioneId,
                                    prestazioneId: item.prestazioneId,
                                    protocolloId: protocollo.id,
                                    dataScadenza,
                                    periodicitaMesi,
                                    isPrimaVisita: false,
                                    eseguita: false,
                                    visitaId: visit.id,
                                    createdAt: now,
                                    updatedAt: now
                                }
                            })
                        }
                    }
                }
            } catch {
                // Non-blocking: scadenze generation failure shouldn't prevent visit completion
            }
        }

        // Auto-generate/update Giudizio di Idoneità for MDL visits only.
        if (visit.personId && (visit.isMDL || visit.tipoVisitaMDL || visit.prestazioneNome?.toLowerCase().includes('visita medica del lavoro'))) {
            try {
                const values = formValuesRef.current
                const toText = (raw: unknown): string => {
                    if (Array.isArray(raw)) return raw.filter(Boolean).map(String).join('\n')
                    return raw == null ? '' : String(raw).trim()
                }
                const prescrizioni = toText(values.prescrizioniNormativaMdl)
                const limitazioni = toText(values.limitazioniMansioneMdl)
                const rawGiudizio = String(values.giudizioIdoneitaMdl || '').trim()
                const esitoMap: Record<string, string> = {
                    idoneo: 'IDONEO',
                    idoneo_prescrizioni: 'IDONEO_CON_PRESCRIZIONI',
                    idoneo_limitazioni: 'IDONEO_CON_LIMITAZIONI',
                    idoneo_limitazioni_prescrizioni: 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI',
                    temporaneamente_non_idoneo: 'NON_IDONEO_TEMPORANEO',
                    non_idoneo: 'NON_IDONEO_PERMANENTE',
                }
                const esito = esitoMap[rawGiudizio]
                    || (prescrizioni && limitazioni ? 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI'
                        : prescrizioni ? 'IDONEO_CON_PRESCRIZIONI'
                            : limitazioni ? 'IDONEO_CON_LIMITAZIONI'
                                : 'IDONEO')
                const mdlDeadline = patientScadenze.find(s =>
                    s.prestazioneNome?.toLowerCase().includes('visita medica del lavoro')
                )?.dataScadenza || null
                const existingGiudizi = await window.desktopApi.db.query({
                    table: 'giudizi_idoneita',
                    where: { visitaId: visit.id, _isDeleted: 0 }
                }) as Array<{ id: string; _localId?: string | null }>
                const giudizioData = {
                    tenantId: visit.tenantId,
                    personId: visit.personId,
                    visitaId: visit.id,
                    medicoId: visit.medicoRefertanteId || visit.medicoId || null,
                    tipo: visit.tipoVisitaMDL || null,
                    esito,
                    limitazioni: limitazioni || null,
                    prescrizioni: prescrizioni || null,
                    dataEmissione: now.split('T')[0],
                    dataScadenza: mdlDeadline,
                    note: values.tempisticaGiudizioIdoneitaMdl ? String(values.tempisticaGiudizioIdoneitaMdl) : null,
                    updatedAt: now,
                }
                const syncPayload = {
                    tenantId: visit.tenantId,
                    personId: visit.personId,
                    visitaId: visit._serverId || visit.id,
                    medicoCompetenteId: visit.medicoRefertanteId || visit.medicoId || null,
                    tipoGiudizio: esito,
                    limitazioni: giudizioData.limitazioni,
                    prescrizioniIdoneita: giudizioData.prescrizioni,
                    motivazioni: giudizioData.note,
                    dataEmissione: now,
                    dataScadenza: mdlDeadline,
                    stato: 'VALIDO',
                }

                if (existingGiudizi.length > 0) {
                    await window.desktopApi.db.update({
                        table: 'giudizi_idoneita',
                        id: existingGiudizi[0].id,
                        data: giudizioData
                    })
                    await window.desktopApi.sync.enqueue({
                        type: 'UPDATE',
                        entity: 'giudizi_idoneita',
                        entityId: existingGiudizi[0].id,
                        localId: existingGiudizi[0]._localId || existingGiudizi[0].id,
                        payload: syncPayload
                    })
                } else {
                    const { id: giudizioId, _localId } = await window.desktopApi.db.insert({
                        table: 'giudizi_idoneita',
                        data: { ...giudizioData, createdAt: now }
                    })
                    await window.desktopApi.sync.enqueue({
                        type: 'CREATE',
                        entity: 'giudizi_idoneita',
                        entityId: giudizioId,
                        localId: _localId,
                        payload: syncPayload
                    })
                }
            } catch {
                // Non-blocking: judgement sync failure should not prevent local visit completion.
            }
        }

        if (timerRef.current) clearInterval(timerRef.current)
        setVisit(prev => prev ? { ...prev, stato: 'COMPLETATA', dataFine: now, durataMinuti } : null)
        await generatePdfPreview()
    }, [visit, doSave, permissions, generatePdfPreview, patientScadenze])

    // ----------------------------------------------------------
    // Sospendi visita (salva come bozza)
    // ----------------------------------------------------------

    const handleSospendi = useCallback(async () => {
        if (!visit || !window.desktopApi) return
        if (!permissions.canUpdateVisite()) return
        await doSave()
        await window.desktopApi.db.update({
            table: 'visits',
            id: visit.id,
            data: { stato: 'SOSPESA' }
        })
        await window.desktopApi.sync.enqueue({
            type: 'UPDATE',
            entity: 'visits',
            entityId: visit._serverId || visit.id,
            localId: visit._localId,
            payload: { stato: 'SOSPESA' }
        })
        setVisit(prev => prev ? { ...prev, stato: 'SOSPESA' } : prev)
    }, [visit, doSave, permissions])

    // ----------------------------------------------------------
    // Riprendi visita (da SOSPESA → IN_CORSO)
    // ----------------------------------------------------------

    const handleRiprendi = useCallback(async () => {
        if (!visit || !window.desktopApi) return
        if (!permissions.canUpdateVisite()) return
        await window.desktopApi.db.update({
            table: 'visits',
            id: visit.id,
            data: { stato: 'IN_CORSO' }
        })
        await window.desktopApi.sync.enqueue({
            type: 'UPDATE',
            entity: 'visits',
            entityId: visit._serverId || visit.id,
            localId: visit._localId,
            payload: { stato: 'IN_CORSO' }
        })
        setVisit(prev => prev ? { ...prev, stato: 'IN_CORSO' } : prev)
    }, [visit, permissions])

    const handleDownloadPdf = useCallback(async () => {
        if (!visit || pdfGenerating) return
        setPdfGenerating(true)
        try {
            const serverPdf = await fetchServerRefertoPdf(false).catch(() => null)
            if (serverPdf) {
                const url = URL.createObjectURL(serverPdf.blob)
                const anchor = document.createElement('a')
                anchor.href = url
                anchor.download = serverPdf.filename
                document.body.appendChild(anchor)
                anchor.click()
                anchor.remove()
                URL.revokeObjectURL(url)
                return
            }
            const { downloadVisitaReferroPdf } = await import('../components/visita/VisitaReferroPdf')
            const data = buildPdfData()
            if (data) await downloadVisitaReferroPdf(data)
        } catch {
            // Silent: browser will show download progress
        } finally {
            setPdfGenerating(false)
        }
    }, [visit, pdfGenerating, buildPdfData, fetchServerRefertoPdf])

    const handleSavePatientProfile = useCallback(async () => {
        if (!patient || !window.desktopApi || isReadOnly) return
        const now = new Date().toISOString()
        const data = {
            firstName: patientForm.firstName.trim() || null,
            lastName: patientForm.lastName.trim() || null,
            taxCode: patientForm.taxCode.trim() || null,
            birthDate: patientForm.birthDate || null,
            birthPlace: patientForm.birthPlace.trim() || null,
            gender: patientForm.gender || null,
            title: patientForm.title.trim() || null,
            status: patientForm.status || null,
            email: patientForm.email.trim() || null,
            phone: patientForm.phone.trim() || null,
            residenceAddress: patientForm.residenceAddress.trim() || null,
            residenceCity: patientForm.residenceCity.trim() || null,
            province: patientForm.province.trim() || null,
            postalCode: patientForm.postalCode.trim() || null,
            updatedAt: now,
        }
        await window.desktopApi.db.update({ table: 'patients', id: patient.id, data })
        if (visit) {
            const visitData = {
                personFirstName: data.firstName,
                personLastName: data.lastName,
                personTaxCode: data.taxCode,
            }
            await window.desktopApi.db.update({ table: 'visits', id: visit.id, data: visitData })
            setVisit(prev => prev ? { ...prev, ...visitData } : prev)
        }
        await window.desktopApi.sync.enqueue({
            type: 'UPDATE',
            entity: 'patients',
            entityId: patient.id,
            payload: data
        })
        setPatient(prev => prev ? { ...prev, ...data } : prev)
        setShowPatientEdit(false)
    }, [patient, patientForm, visit, isReadOnly])

    const updateHealthVital = useCallback((field: 'peso' | 'altezza', value: string) => {
        setHealthForm(prev => {
            const next = { ...prev, [field]: value }
            const peso = Number(field === 'peso' ? value : prev.peso)
            const altezza = Number(field === 'altezza' ? value : prev.altezza)
            if (peso > 0 && altezza > 0) {
                next.bmi = String(Math.round((peso / ((altezza / 100) ** 2)) * 10) / 10)
            }
            return next
        })
    }, [])

    const updateHealthLifestyle = useCallback((field: 'alcol' | 'attivitaFisica', value: string) => {
        setHealthForm(prev => {
            if (field === 'alcol') {
                const preset: Record<string, string> = { no: '0', non_bevitore: '0', occasionale: '1', moderato: '7', elevato: '14' }
                return { ...prev, alcol: value, unitaAlcolSettimana: preset[value] ?? prev.unitaAlcolSettimana }
            }
            const preset: Record<string, string> = { nessuna: '0', sedentaria: '0', leggera: '2', moderata: '4', intensa: '6' }
            return { ...prev, attivitaFisica: value, oreAttivitaSettimana: preset[value] ?? prev.oreAttivitaSettimana }
        })
    }, [])

    const handleSaveHealthProfile = useCallback(async () => {
        if (!visit || !window.desktopApi || isReadOnly) return
        const asNumber = (value: string): number | null => value.trim() ? Number(value) : null
        const asList = (value: string): string[] => value.split(',').map(v => v.trim()).filter(Boolean)
        const nextValues: FormValues = {
            ...formValuesRef.current,
            peso: asNumber(healthForm.peso),
            altezza: asNumber(healthForm.altezza),
            paSistolica: asNumber(healthForm.paSistolica),
            paDiastolica: asNumber(healthForm.paDiastolica),
            fc: asNumber(healthForm.fc),
            spo2: asNumber(healthForm.spo2),
            temperatura: asNumber(healthForm.temperatura),
            bmi: asNumber(healthForm.bmi),
            prossimoControllo: healthForm.prossimoControllo || '',
            periodicitaMesi: asNumber(healthForm.periodicitaMesi),
            fumatore: healthForm.fumatore || '',
            sigaretteGiorno: asNumber(healthForm.sigaretteGiorno),
            tipoSigaretta: healthForm.tipoSigaretta,
            etaInizioFumo: asNumber(healthForm.etaInizioFumo),
            anniFumo: asNumber(healthForm.anniFumo),
            alcol: healthForm.alcol || '',
            unitaAlcolSettimana: asNumber(healthForm.unitaAlcolSettimana),
            attivitaFisica: healthForm.attivitaFisica || '',
            oreAttivitaSettimana: asNumber(healthForm.oreAttivitaSettimana),
            noteSalute: healthForm.noteSalute,
            allergieFarmaci: healthForm.allergieFarmaci,
            farmaci: healthForm.farmaci,
            altrePatologie: healthForm.altrePatologie,
            usaDpiPersonali: healthForm.usaDpiPersonali,
            dpiPersonali: asList(healthForm.dpiPersonali),
            dpiAzienda: asList(healthForm.dpiAzienda),
            usaMezziAziendali: healthForm.usaMezziAziendali,
            mezziAziendali: asList(healthForm.mezziAziendali),
            patenteCategorie: asList(healthForm.patenteCategorie),
            patenteScadenza: healthForm.patenteScadenza,
            cqc: healthForm.cqc,
            cqcScadenza: healthForm.cqcScadenza,
            hasInvalidita: healthForm.hasInvalidita,
            tipoInvalidita: healthForm.tipoInvalidita,
            gradoInvaliditaCivile: asNumber(healthForm.gradoInvaliditaCivile),
            legge104: healthForm.legge104,
            hasDiabete: healthForm.hasDiabete,
            hasIpertensione: healthForm.hasIpertensione,
            hasCardiopatie: healthForm.hasCardiopatie,
            hasAsma: healthForm.hasAsma,
            hasEpilessia: healthForm.hasEpilessia,
            alimentazione: healthForm.alimentazione,
            porzioniFruttaVerdure: asNumber(healthForm.porzioniFruttaVerdure),
            droghe: healthForm.droghe,
            statoCivile: healthForm.statoCivile,
            numeroFigli: asNumber(healthForm.numeroFigli),
            professione: healthForm.professione,
            qualitaSonno: healthForm.qualitaSonno,
            oreSonnoNotte: asNumber(healthForm.oreSonnoNotte),
            sonnolenzaDiurna: healthForm.sonnolenzaDiurna,
            apneaNotturna: healthForm.apneaNotturna,
            formazioneGenerale: healthForm.formazioneGenerale,
            formazioneSpecifica: healthForm.formazioneSpecifica,
            addestramentoCompletato: healthForm.addestramentoCompletato,
            malattieProfessionali: healthForm.malattieProfessionali,
        }
        const datiStrutturati = JSON.stringify(nextValues)
        await window.desktopApi.db.update({ table: 'visits', id: visit.id, data: { datiStrutturati } })
        await window.desktopApi.sync.enqueue({
            type: 'UPDATE',
            entity: 'visits',
            entityId: visit._serverId || visit.id,
            localId: visit._localId,
            payload: { datiStrutturati }
        })
        if (visit.personId) {
            const now = new Date().toISOString()
            const profilePayload = {
                ...buildHealthProfilePayload(nextValues),
                personId: visit.personId,
                tenantId: visit.tenantId,
                updatedAt: now
            }
            const existingProfiles = await window.desktopApi.db.query({
                table: 'profili_salute',
                where: { personId: visit.personId, _isDeleted: 0 },
                limit: 1
            }) as Array<{ id: string; _localId?: string | null; _serverId?: string | null }>
            if (existingProfiles.length > 0) {
                const profile = existingProfiles[0]
                await window.desktopApi.db.update({ table: 'profili_salute', id: profile.id, data: profilePayload })
                await window.desktopApi.sync.enqueue({
                    type: 'UPDATE',
                    entity: 'profili_salute',
                    entityId: profile._serverId || profile.id,
                    localId: profile._localId || undefined,
                    payload: profilePayload
                })
            } else {
                const profileId = crypto.randomUUID()
                await window.desktopApi.db.insert({
                    table: 'profili_salute',
                    data: { id: profileId, ...profilePayload, createdAt: now }
                })
                await window.desktopApi.sync.enqueue({
                    type: 'CREATE',
                    entity: 'profili_salute',
                    entityId: profileId,
                    payload: { id: profileId, ...profilePayload, createdAt: now }
                })
            }
        }
        setFormValues(nextValues)
        formValuesRef.current = nextValues
        setHasChanges(false)
        setLastSaved(new Date())
        setShowHealthEdit(false)
    }, [visit, healthForm, isReadOnly])

    const resolveCompanyTariffarioPrice = useCallback(async (prestazioneId: string, tipoVisitaMDL?: string | null): Promise<number | null> => {
        if (!window.desktopApi) return null
        let companyTenantProfileId: string | null = patient?.companyTenantProfileId || null
        if (!companyTenantProfileId && visit?.appuntamentoId) {
            const apptRows = await window.desktopApi.db.query({
                table: 'appointments',
                where: { id: visit.appuntamentoId, _isDeleted: 0 },
                limit: 1
            }).catch(() => []) as Array<{ companyTenantProfileId: string | null }>
            companyTenantProfileId = apptRows[0]?.companyTenantProfileId || null
        }
        if (!companyTenantProfileId) return null
        const associations = await window.desktopApi.db.query({
            table: 'tariffario_company_associations',
            where: { companyTenantProfileId, _isDeleted: 0, attivo: 1 }
        }).catch(() => []) as Array<{ tariffarioId: string }>
        const tariffarioIds = new Set(associations.map(a => a.tariffarioId))
        if (tariffarioIds.size === 0) return null
        const voci = await window.desktopApi.db.query({
            table: 'tariffario_voci',
            where: { prestazioneId, _isDeleted: 0, attivo: 1 }
        }).catch(() => []) as Array<{ tariffarioAziendaleId: string; prezzoBase: number; categoriaVisita: string | null }>
        const voce =
            (tipoVisitaMDL ? voci.find(v => tariffarioIds.has(v.tariffarioAziendaleId) && v.categoriaVisita === tipoVisitaMDL && Number(v.prezzoBase) > 0) : null) ||
            voci.find(v => tariffarioIds.has(v.tariffarioAziendaleId) && !v.categoriaVisita && Number(v.prezzoBase) > 0) ||
            voci.find(v => tariffarioIds.has(v.tariffarioAziendaleId) && Number(v.prezzoBase) > 0)
        return voce ? Number(voce.prezzoBase) : null
    }, [patient?.companyTenantProfileId, visit?.appuntamentoId])

    const resolveProtocolloScadenzaTemplate = useCallback(async (prestazioneId: string): Promise<Pick<PatientScadenzaItem, 'mansione' | 'mansioneId' | 'protocolloId' | 'periodicitaMesi' | 'dataScadenza'> | null> => {
        if (!window.desktopApi || !visit?.personId || !prestazioneId) return null
        const existing = patientScadenze.find(s => s.prestazioneId === prestazioneId)
        if (existing) {
            return {
                mansione: existing.mansione,
                mansioneId: existing.mansioneId,
                protocolloId: existing.protocolloId,
                periodicitaMesi: existing.periodicitaMesi,
                dataScadenza: existing.dataScadenza || addMonthsIso(visit.dataOra || new Date().toISOString(), existing.periodicitaMesi),
            }
        }
        const assignments = await window.desktopApi.db.query({
            table: 'lavoratore_mansioni',
            where: { personId: visit.personId, _isDeleted: 0 }
        }).catch(() => []) as Array<{ mansioneId: string | null }>
        const mansioneIds = assignments.map(a => a.mansioneId).filter(Boolean) as string[]
        const protocolli = await window.desktopApi.db.query({
            table: 'protocolli',
            where: { _isDeleted: 0 }
        }).catch(() => []) as Array<{ id: string; mansioneId: string | null; mansioneNome?: string | null }>
        const protocolloIds = protocolli
            .filter(p => (patient?.protocolloSanitarioId && p.id === patient.protocolloSanitarioId) || (p.mansioneId && mansioneIds.includes(p.mansioneId)))
            .map(p => p.id)
        if (protocolloIds.length === 0) return null
        const rows = await window.desktopApi.db.query({
            table: 'protocollo_prestazioni',
            where: { prestazioneId, _isDeleted: 0 }
        }).catch(() => []) as Array<ProtocolloPrestazioneRow & { protocolloId: string }>
        const row = rows.find(r => protocolloIds.includes(r.protocolloId))
        if (!row) return null
        const protocollo = protocolli.find(p => p.id === row.protocolloId)
        const normalized = normalizeProtocolloPrestazioni([row])[0]
        const periodicitaMesi = normalized?.periodicitaMesi || null
        return {
            mansione: protocollo?.mansioneNome || 'Mansione protocollo',
            mansioneId: protocollo?.mansioneId || null,
            protocolloId: row.protocolloId,
            periodicitaMesi,
            dataScadenza: addMonthsIso(visit.dataOra || new Date().toISOString(), periodicitaMesi),
        }
    }, [patient?.protocolloSanitarioId, patientScadenze, visit?.dataOra, visit?.personId])

    const handleChangeMedicoRefertante = useCallback(async (medico: MedicoOption) => {
        if (!visit || !window.desktopApi || isReadOnly) return
        const data = {
            medicoRefertanteId: medico.id === visit.medicoId ? null : medico.id,
            medicoRefertanteFirstName: medico.id === visit.medicoId ? null : medico.firstName,
            medicoRefertanteLastName: medico.id === visit.medicoId ? null : medico.lastName,
        }
        await window.desktopApi.db.update({ table: 'visits', id: visit.id, data })
        await window.desktopApi.sync.enqueue({
            type: 'UPDATE',
            entity: 'visits',
            entityId: visit._serverId || visit.id,
            localId: visit._localId,
            payload: { medicoRefertanteId: data.medicoRefertanteId }
        })
        setVisit(prev => prev ? { ...prev, ...data } : prev)
        setMedicoPickerOpen(false)
        setMedicoSearch('')
    }, [visit, isReadOnly])

    useEffect(() => {
        if (!visit?.prestazioneId || prestazioniAppt.length > 0) return
        void resolveCompanyTariffarioPrice(visit.prestazioneId, visit.tipoVisitaMDL).then(prezzo => {
            if (prezzo == null && !visit.prestazioneNome) return
            setPrestazioniAppt([{
                prestazioneId: visit.prestazioneId || visit.id,
                nome: visit.prestazioneNome || 'Visita',
                codice: visit.prestazioneCodice,
                tipo: null,
                prezzoCalcolato: prezzo,
            }])
        })
    }, [visit?.prestazioneId, visit?.tipoVisitaMDL, visit?.prestazioneNome, visit?.prestazioneCodice, visit?.id, prestazioniAppt.length, resolveCompanyTariffarioPrice])

    const handleAddPrestazione = useCallback(async (prestazione: PrestazioneCatalogItem) => {
        if (!visit || !window.desktopApi || isReadOnly) return
        const now = new Date().toISOString()
        const prezzoTariffario = await resolveCompanyTariffarioPrice(prestazione.id, visit.tipoVisitaMDL)
        const prezzoCalcolato = prezzoTariffario ?? prestazione.prezzoBase ?? null
        if (!visit.appuntamentoId) {
            const current = prestazioniAppt.length > 0
                ? prestazioniAppt
                : (visit.prestazioneId ? [{
                    prestazioneId: visit.prestazioneId,
                    nome: visit.prestazioneNome || 'Visita',
                    codice: visit.prestazioneCodice,
                    tipo: null,
                    prezzoCalcolato: null,
                }] : [])
            if (current.some(p => p.prestazioneId === prestazione.id)) {
                setPrestazionePickerOpen(false)
                setPrestazioneSearch('')
                return
            }
            const nextPrestazioni = [...current, { prestazioneId: prestazione.id, nome: prestazione.nome, codice: prestazione.codice, tipo: prestazione.tipo, prezzoCalcolato }]
            const nextValues = {
                ...formValuesRef.current,
                _prestazioniAggiuntive: nextPrestazioni.map(p => ({
                    id: p.prestazioneId,
                    nome: p.nome,
                    codice: p.codice,
                    tipo: p.tipo,
                    prezzoBase: p.prezzoCalcolato,
                }))
            }
            const data = {
                datiStrutturati: JSON.stringify(nextValues),
                isMDL: visit.isMDL || (isMdlCatalogPrestazione(prestazione) ? 1 : 0),
                tipoVisitaMDL: visit.tipoVisitaMDL || (isMdlCatalogPrestazione(prestazione) ? 'PERIODICA' : null),
                updatedAt: now,
            }
            await window.desktopApi.db.update({ table: 'visits', id: visit.id, data })
            await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'visits', entityId: visit._serverId || visit.id, localId: visit._localId, payload: { datiStrutturati: data.datiStrutturati, tipoVisitaMDL: data.tipoVisitaMDL } })
            setVisit(prev => prev ? { ...prev, ...data } : prev)
            setFormValues(nextValues)
            setPrestazioniAppt(nextPrestazioni)
            if ((data.isMDL || visit.isMDL) && visit.personId && !patientScadenze.some(s => s.prestazioneId === prestazione.id)) {
                const scadenzaId = `local-scadenza-${crypto.randomUUID()}`
                const template = await resolveProtocolloScadenzaTemplate(prestazione.id)
                const scadenza: PatientScadenzaItem = {
                    id: scadenzaId,
                    personId: visit.personId,
                    tenantId: visit.tenantId,
                    prestazioneId: prestazione.id,
                    prestazioneNome: prestazione.nome,
                    mansione: template?.mansione || 'Aggiunta in visita',
                    mansioneId: template?.mansioneId || null,
                    protocolloId: template?.protocolloId || null,
                    dataScadenza: template?.dataScadenza || null,
                    periodicitaMesi: template?.periodicitaMesi || null,
                    eseguita: 0,
                    stato: 'Da configurare',
                }
                await window.desktopApi.db.insert({
                    table: 'scadenze',
                    data: { ...scadenza, tenantId: visit.tenantId, createdAt: now, updatedAt: now }
                }).catch(() => undefined)
                if (scadenza.mansioneId && scadenza.prestazioneId) {
                    await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'scadenzaPrestazioneProtocollo', entityId: scadenzaId, payload: { ...scadenza, eseguita: false, createdAt: now, updatedAt: now } })
                }
                setPatientScadenze(prev => [...prev, scadenza])
            }
        } else {
            const exists = prestazioniAppt.some(p => p.prestazioneId === prestazione.id)
            if (!exists) {
                const inserted = await window.desktopApi.db.insert({
                    table: 'appointment_prestazioni',
                    data: {
                        appuntamentoId: visit.appuntamentoId,
                        prestazioneId: prestazione.id,
                        prezzo: prezzoCalcolato,
                        quantita: 1,
                        note: null,
                    }
                }) as { id: string }
                await window.desktopApi.sync.enqueue({
                    type: 'CREATE',
                    entity: 'appointment_prestazioni',
                    entityId: inserted.id,
                    payload: { appuntamentoId: visit.appuntamentoId, prestazioneId: prestazione.id, prezzo: prezzoCalcolato, quantita: 1 }
                })
                setPrestazioniAppt(prev => [...prev, { prestazioneId: prestazione.id, nome: prestazione.nome, codice: prestazione.codice, tipo: prestazione.tipo, prezzoCalcolato }])
                if (visit.isMDL === 1 && visit.personId && !patientScadenze.some(s => s.prestazioneId === prestazione.id)) {
                    const scadenzaId = `local-scadenza-${crypto.randomUUID()}`
                    const template = await resolveProtocolloScadenzaTemplate(prestazione.id)
                    const scadenza: PatientScadenzaItem = {
                        id: scadenzaId,
                        personId: visit.personId,
                        tenantId: visit.tenantId,
                        prestazioneId: prestazione.id,
                        prestazioneNome: prestazione.nome,
                        mansione: template?.mansione || 'Aggiunta in visita',
                        mansioneId: template?.mansioneId || null,
                        protocolloId: template?.protocolloId || null,
                        dataScadenza: template?.dataScadenza || null,
                        periodicitaMesi: template?.periodicitaMesi || null,
                        eseguita: 0,
                        stato: 'Da configurare',
                    }
                    await window.desktopApi.db.insert({ table: 'scadenze', data: { ...scadenza, createdAt: now, updatedAt: now } }).catch(() => undefined)
                    if (scadenza.mansioneId && scadenza.prestazioneId) {
                        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'scadenzaPrestazioneProtocollo', entityId: scadenzaId, payload: { ...scadenza, eseguita: false, createdAt: now, updatedAt: now } })
                    }
                    setPatientScadenze(prev => [...prev, scadenza])
                }
            }
        }
        setPrestazionePickerOpen(false)
        setPrestazioneSearch('')
    }, [visit, isReadOnly, prestazioniAppt, patientScadenze, resolveCompanyTariffarioPrice, resolveProtocolloScadenzaTemplate])

    const handleRemovePrestazione = useCallback(async (prestazioneId: string) => {
        if (!visit || !window.desktopApi || isReadOnly) return
        if (visit.appuntamentoId) {
            await window.desktopApi.db.deleteWhere({ table: 'appointment_prestazioni', where: { appuntamentoId: visit.appuntamentoId, prestazioneId } })
            await window.desktopApi.sync.enqueue({ type: 'DELETE', entity: 'appointment_prestazioni', entityId: prestazioneId, payload: { appuntamentoId: visit.appuntamentoId, prestazioneId } })
            setPrestazioniAppt(prev => prev.filter(p => p.prestazioneId !== prestazioneId))
        } else {
            const nextPrestazioni = prestazioniAppt.filter(p => p.prestazioneId !== prestazioneId)
            const nextValues = {
                ...formValuesRef.current,
                _prestazioniAggiuntive: nextPrestazioni.map(p => ({
                    id: p.prestazioneId,
                    nome: p.nome,
                    codice: p.codice,
                    tipo: p.tipo,
                    prezzoBase: p.prezzoCalcolato,
                }))
            }
            const datiStrutturati = JSON.stringify(nextValues)
            await window.desktopApi.db.update({ table: 'visits', id: visit.id, data: { datiStrutturati, updatedAt: new Date().toISOString() } })
            await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'visits', entityId: visit._serverId || visit.id, localId: visit._localId, payload: { datiStrutturati } })
            setPrestazioniAppt(nextPrestazioni)
            setFormValues(nextValues)
        }
        const linkedScadenza = patientScadenze.find(s => s.prestazioneId === prestazioneId && String(s.id).startsWith('local-scadenza-'))
        if (linkedScadenza) {
            await window.desktopApi.db.deleteWhere({ table: 'scadenze', where: { id: linkedScadenza.id } }).catch(() => undefined)
            setPatientScadenze(prev => prev.filter(s => s.id !== linkedScadenza.id))
        }
    }, [visit, isReadOnly, prestazioniAppt, patientScadenze])

    const handleChangeTipoVisitaMDL = useCallback(async (tipoVisitaMDL: string) => {
        if (!visit || !window.desktopApi || isReadOnly) return
        const now = new Date().toISOString()
        const currentPrestazioni = prestazioniAppt.length > 0
            ? prestazioniAppt
            : (visit.prestazioneId ? [{
                prestazioneId: visit.prestazioneId,
                nome: visit.prestazioneNome || 'Visita Medica del Lavoro',
                codice: visit.prestazioneCodice,
                tipo: null,
                prezzoCalcolato: null,
            }] : [])

        const nextPrestazioni = await Promise.all(currentPrestazioni.map(async p => {
            const tariffarioPrice = await resolveCompanyTariffarioPrice(p.prestazioneId, tipoVisitaMDL)
            return { ...p, prezzoCalcolato: tariffarioPrice ?? p.prezzoCalcolato ?? null }
        }))
        const totaleCosto = nextPrestazioni.reduce((sum, p) => sum + (Number(p.prezzoCalcolato) || 0), 0)

        await window.desktopApi.db.update({
            table: 'visits',
            id: visit.id,
            data: { tipoVisitaMDL, totaleCosto, updatedAt: now }
        })
        await window.desktopApi.sync.enqueue({
            type: 'UPDATE',
            entity: 'visits',
            entityId: visit._serverId || visit.id,
            localId: visit._localId,
            payload: { tipoVisitaMDL, totaleCosto, updatedAt: now }
        })

        if (visit.appuntamentoId) {
            const rows = await window.desktopApi.db.query({
                table: 'appointment_prestazioni',
                where: { appuntamentoId: visit.appuntamentoId, _isDeleted: 0 }
            }).catch(() => []) as Array<{ id: string; prestazioneId: string | null }>
            for (const prestazione of nextPrestazioni) {
                const row = rows.find(r => r.prestazioneId === prestazione.prestazioneId)
                if (!row) continue
                await window.desktopApi.db.update({
                    table: 'appointment_prestazioni',
                    id: row.id,
                    data: { prezzo: prestazione.prezzoCalcolato, updatedAt: now }
                })
                await window.desktopApi.sync.enqueue({
                    type: 'UPDATE',
                    entity: 'appointment_prestazioni',
                    entityId: row.id,
                    payload: { prezzo: prestazione.prezzoCalcolato, updatedAt: now }
                })
            }
        }

        setVisit(prev => prev ? { ...prev, tipoVisitaMDL, totaleCosto, updatedAt: now } : prev)
        setPrestazioniAppt(nextPrestazioni)
    }, [visit, isReadOnly, prestazioniAppt, resolveCompanyTariffarioPrice])

    const handleUpdateScadenzaProtocollo = useCallback(async (scadenzaId: string, data: Partial<PatientScadenzaItem>) => {
        if (!window.desktopApi || isReadOnly || !visit?.personId) return
        const current = patientScadenze.find(s => s.id === scadenzaId)
        const next = current ? { ...current, ...data } : null
        if (scadenzaId.startsWith('protocollo:')) {
            const localId = `local-scadenza-${crypto.randomUUID()}`
            const payload = {
                id: localId,
                tenantId: visit.tenantId,
                personId: visit.personId,
                prestazioneId: next?.prestazioneId || null,
                prestazioneNome: next?.prestazioneNome || null,
                mansione: next?.mansione || null,
                mansioneId: next?.mansioneId || null,
                protocolloId: next?.protocolloId || null,
                dataScadenza: next?.dataScadenza || null,
                periodicitaMesi: next?.periodicitaMesi || null,
                eseguita: next?.eseguita || 0,
                stato: next?.stato || 'Da programmare',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
            await window.desktopApi.db.insert({ table: 'scadenze', data: payload }).catch(() => undefined)
            setPatientScadenze(prev => prev.map(s => s.id === scadenzaId ? { ...payload } : s))
            if (payload.mansioneId && payload.prestazioneId) {
                await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'scadenzaPrestazioneProtocollo', entityId: localId, payload })
            }
            return
        }
        await window.desktopApi.db.update({ table: 'scadenze', id: scadenzaId, data: { ...data, updatedAt: new Date().toISOString() } })
        const entity = next?.mansioneId && next?.prestazioneId ? 'scadenzaPrestazioneProtocollo' : 'scadenze'
        await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity, entityId: scadenzaId, payload: data })
        setPatientScadenze(prev => prev.map(s => s.id === scadenzaId ? { ...s, ...data } : s))
    }, [isReadOnly, visit, patientScadenze])

    const handleQuickExamDocumentUpload = useCallback(async (kind: 'laboratorio' | 'microbiologico') => {
        if (!visit || !window.desktopApi || isReadOnly) return
        setSaveError(null)
        try {
            const result = await window.desktopApi.dialog.openFile({
                filters: [
                    { name: 'Documenti clinici', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx'] },
                ],
            })
            if (result.canceled || !result.filePaths.length) return
            const fileInfo = await window.desktopApi.file.copyToAppData({ sourcePath: result.filePaths[0], visitaId: visit.id })
            const now = new Date().toISOString()
            const prefix = kind === 'laboratorio' ? 'Laboratorio' : 'Microbiologico'
            await window.desktopApi.db.insert({
                table: 'allegati',
                data: {
                    tenantId: visit.tenantId,
                    visitaId: visit.id,
                    nome: `${prefix} - ${fileInfo.nome}`,
                    tipo: fileInfo.tipo,
                    dimensione: fileInfo.dimensione,
                    localPath: fileInfo.localPath,
                    serverUrl: null,
                    createdAt: now,
                    updatedAt: now,
                },
            })
            setLastSaved(new Date())
        } catch {
            setSaveError('Impossibile caricare il documento clinico.')
        }
    }, [isReadOnly, visit])

    const handleBackRequest = useCallback(() => {
        if ((hasChanges && !isReadOnly) || shouldConfirmExit) {
            setPendingNavigationTarget(backTarget)
            setExitError(null)
            setExitDiscardStep(false)
            setShowExitDialog(true)
            return
        }
        navigate(backTarget)
    }, [hasChanges, isReadOnly, shouldConfirmExit, navigate, backTarget])

    const requestGuardedNavigation = useCallback((target: string) => {
        if ((hasChanges && !isReadOnly) || shouldConfirmExit) {
            setPendingNavigationTarget(target)
            setExitError(null)
            setExitDiscardStep(false)
            setShowExitDialog(true)
            return
        }
        navigate(target, { state: { from: `/visite/${visit?.id || id}` } })
    }, [hasChanges, id, isReadOnly, navigate, shouldConfirmExit, visit?.id])

    const handleExitAction = useCallback(async (action: 'draft' | 'complete' | 'discard' | 'stay') => {
        if (action === 'stay') {
            setShowExitDialog(false)
            setPendingNavigationTarget(null)
            setExitError(null)
            setExitDiscardStep(false)
            return
        }
        if (action === 'discard' && discardReason.trim().length < 10) {
            setExitError('Inserisci un motivo di annullamento di almeno 10 caratteri per il registro GDPR.')
            return
        }
        setExitActionLoading(true)
        setExitError(null)
        try {
            if (action === 'draft') {
                await handleSospendi()
            } else if (action === 'complete') {
                await handleComplete()
            } else if (visit && window.desktopApi) {
                let restoredStatus = 'PRENOTATO'
                let appointment: { id: string; _localId?: string; _serverId?: string | null; stato?: string | null } | null = null
                if (visit.appuntamentoId) {
                    const rows = await window.desktopApi.db.query({
                        table: 'appointments',
                        where: { id: visit.appuntamentoId, _isDeleted: 0 },
                        limit: 1,
                    }) as Array<{ id: string; _localId?: string; _serverId?: string | null; stato?: string | null }>
                    appointment = rows[0] || null
                    const previous = String(appointment?.stato || '').toUpperCase()
                    restoredStatus = ['IN_ATTESA', 'ACCETTATO', 'ARRIVATO', 'IN_CORSO'].includes(previous) ? 'IN_ATTESA' : 'PRENOTATO'
                }

                await window.desktopApi.db.softDelete({ table: 'visits', id: visit.id, reason: discardReason.trim() })
                await window.desktopApi.sync.enqueue({
                    type: 'DELETE',
                    entity: 'visits',
                    entityId: visit._serverId || visit.id,
                    localId: visit._localId,
                    payload: {
                        deletionReason: discardReason.trim(),
                        appuntamentoId: visit.appuntamentoId,
                        restoreAppointmentStatus: restoredStatus,
                    },
                })

                if (appointment) {
                    await window.desktopApi.db.update({
                        table: 'appointments',
                        id: appointment.id,
                        data: { stato: restoredStatus },
                    })
                    await window.desktopApi.sync.enqueue({
                        type: 'UPDATE',
                        entity: 'appointments',
                        entityId: appointment._serverId || appointment.id,
                        localId: appointment._localId,
                        payload: { stato: restoredStatus },
                    })
                }
                setHasChanges(false)
            }
            const target = pendingNavigationTarget || backTarget
            setShowExitDialog(false)
            setPendingNavigationTarget(null)
            setExitDiscardStep(false)
            setDiscardReason('')
            navigate(target)
        } catch {
            setExitError('Operazione non completata. Riprova o salva come bozza.')
        } finally {
            setExitActionLoading(false)
        }
    }, [backTarget, discardReason, handleComplete, handleSospendi, navigate, pendingNavigationTarget, visit])

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

    // Hooks must be before any conditional returns (fixes React error #310)
    // Sections to display: from template (dynamic) or fallback to static SECTIONS
    const displaySections = useMemo(() => {
        if (templateSections && templateSections.length > 0) return templateSections
        return SECTIONS.map(s => ({ id: s.id, label: s.label }))
    }, [templateSections])

    const filteredPrestazioniCatalog = useMemo(() => {
        const term = prestazioneSearch.trim().toLowerCase()
        return prestazioniCatalog
            .filter(p => !term || [p.nome, p.codice, p.tipo].some(value => value?.toLowerCase().includes(term)))
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it'))
    }, [prestazioniCatalog, prestazioneSearch])

    const filteredMediciOptions = useMemo(() => {
        const term = medicoSearch.trim().toLowerCase()
        return mediciOptions.filter(m => !term || `${m.lastName || ''} ${m.firstName || ''}`.toLowerCase().includes(term))
    }, [mediciOptions, medicoSearch])

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
                        onClick={handleBackRequest}
                        className="mt-4 text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                        ← Torna alle Visite
                    </button>
                </div>
            </div>
        )
    }

    // ----------------------------------------------------------
    // Render
    // ----------------------------------------------------------

    return (
        <>
        <div className="h-full flex flex-col -m-4">
            {/* =============== STICKY HEADER =============== */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    {/* Left: Back + Patient */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleBackRequest}
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
                                    {patient && (
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                                            {patient.taxCode && <span className="font-mono">{patient.taxCode}</span>}
                                            {patient.birthDate && <span>{new Date(patient.birthDate).toLocaleDateString('it-IT')} ({calcAge(patient.birthDate)} anni)</span>}
                                    {patient.gender && <span>{formatGenderLabel(patient.gender)}</span>}
                                            {patient.phone && <span>{patient.phone}</span>}
                                            {patient.email && <span>{patient.email}</span>}
                                            {(patient.residenceCity || patient.province) && <span>{[patient.residenceCity, patient.province].filter(Boolean).join(' ')}</span>}
                                    <button
                                        type="button"
                                        onClick={() => setShowPatientEdit(true)}
                                        disabled={isReadOnly}
                                        className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 disabled:text-gray-300"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                        Modifica
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowHealthEdit(true)}
                                        disabled={isReadOnly}
                                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 disabled:text-gray-300"
                                    >
                                        <HeartPulse className="w-3 h-3" />
                                        Profilo salute
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center: Status + Timer */}
                    <div className="flex items-center gap-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${visit.stato === 'IN_CORSO' ? 'bg-blue-100 text-blue-800' :
                            visit.stato === 'COMPLETATA' ? 'bg-green-100 text-green-800' :
                                visit.stato === 'ANNULLATA' ? 'bg-red-100 text-red-800' :
                                    visit.stato === 'SOSPESA' ? 'bg-amber-100 text-amber-800' :
                                        'bg-yellow-100 text-yellow-800'
                            }`}>
                            {visit.stato === 'IN_CORSO' ? <Stethoscope className="w-3 h-3" /> :
                                visit.stato === 'COMPLETATA' ? <CheckCircle className="w-3 h-3" /> :
                                    visit.stato === 'SOSPESA' ? <Clock className="w-3 h-3" /> :
                                        <Clock className="w-3 h-3" />}
                            {visit.stato === 'IN_CORSO' ? 'In Corso' :
                                visit.stato === 'COMPLETATA' ? 'Completata' :
                                    visit.stato === 'ANNULLATA' ? 'Annullata' :
                                        visit.stato === 'SOSPESA' ? 'Sospesa' :
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
                        {saveError && (
                            <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                                {saveError}
                            </span>
                        )}
                        {visit.stato === 'COMPLETATA' && !editingCompletedVisit && permissions.canUpdateVisite() && (
                            <button
                                type="button"
                                onClick={() => setEditingCompletedVisit(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Modifica visita
                            </button>
                        )}
                        {/* PDF Referto: available for completed visits */}
                        {visit.stato === 'COMPLETATA' && !editingCompletedVisit && (
                            <button
                                onClick={() => { void generatePdfPreview() }}
                                disabled={pdfGenerating}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 transition-colors"
                                title="Apri anteprima PDF del referto della visita"
                            >
                                <Download className="w-3.5 h-3.5" />
                                {pdfGenerating ? 'Generando...' : 'PDF Referto'}
                            </button>
                        )}
                        {/* Layout toggle */}
                        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                            <button
                                onClick={() => setLayoutMode('tabs')}
                                className={`p-1.5 transition-colors ${layoutMode === 'tabs' ? 'bg-gray-100 text-teal-600' : 'text-gray-400 hover:bg-gray-50'}`}
                                title="Vista a schede"
                            >
                                <LayoutList className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setLayoutMode('scroll')}
                                className={`p-1.5 transition-colors ${layoutMode === 'scroll' ? 'bg-gray-100 text-teal-600' : 'text-gray-400 hover:bg-gray-50'}`}
                                title="Vista unica (scroll)"
                            >
                                <AlignJustify className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {!isReadOnly && (
                            <>
                                <button
                                    onClick={handleHeaderSave}
                                    disabled={isSaving || (!hasChanges && visit.stato !== 'COMPLETATA')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {isSaving ? 'Salvataggio...' : 'Salva'}
                                </button>
                                {visit.stato === 'COMPLETATA' && editingCompletedVisit && (
                                    <button
                                        onClick={handleCancelCompletedEdit}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Annulla
                                    </button>
                                )}
                                {visit.stato === 'IN_CORSO' && (
                                    <button
                                        onClick={handleSospendi}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                                        title="Salva i dati e sospendi la visita (continua più tardi)"
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        Sospendi
                                    </button>
                                )}
                                {visit.stato === 'SOSPESA' && (
                                    <button
                                        onClick={handleRiprendi}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Riprendi la visita sospesa"
                                    >
                                        <Activity className="w-3.5 h-3.5" />
                                        Riprendi
                                    </button>
                                )}
                                {visit.stato !== 'SOSPESA' && visit.stato !== 'COMPLETATA' && (
                                    <button
                                        onClick={handleComplete}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        Completa
                                    </button>
                                )}
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
                        {/* Quick Actions Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
                            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <ListChecks className="w-3.5 h-3.5 text-teal-600" />
                                Azioni rapide
                            </h3>
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                                {[
                                    { id: 'note', label: 'Note Interne', icon: MessageSquare, color: 'text-amber-500' },
                                    { id: 'storico', label: 'Storico Visita', icon: History, color: 'text-blue-500' },
                                    { id: 'precedenti', label: 'Visite Precedenti', icon: FileText, color: 'text-purple-500' },
                                    { id: 'laboratorio', label: 'Laboratorio', icon: FlaskConical, color: 'text-emerald-500' },
                                    { id: 'microbio', label: 'Esami Microbiologici', icon: TrendingUp, color: 'text-green-500' },
                                    { id: 'allergie', label: 'Allergie', icon: AlertTriangle, color: 'text-red-500' },
                                    { id: 'allegati', label: 'Allegati', icon: Paperclip, color: 'text-pink-500' },
                                    { id: 'questionari', label: 'Questionari', icon: ClipboardList, color: 'text-teal-500' },
                                    { id: 'modulistica', label: 'Modulistica', icon: FileStack, color: 'text-indigo-500' },
                                ].map(action => {
                                    const isOpen = expandedQuickAction === action.id
                                    return (
                                        <div key={action.id}>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedQuickAction(prev => prev === action.id ? null : action.id)}
                                                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-gray-50"
                                            >
                                                <span className="flex items-center gap-3">
                                                    <action.icon className={`w-4 h-4 ${action.color}`} />
                                                    <span className="font-medium text-gray-700">{action.label}</span>
                                                </span>
                                                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-300" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                                            </button>
                                            {isOpen && (
                                                <div className="border-t border-gray-100 bg-gray-50/70 px-3 py-3 text-xs text-gray-600">
                                                    {action.id === 'note' && (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                value={(formValues.noteInterne as string) || ''}
                                                                onChange={e => updateField('noteInterne', e.target.value)}
                                                                readOnly={isReadOnly}
                                                                rows={3}
                                                                placeholder="Note per la segreteria, non visibili al paziente"
                                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-gray-100"
                                                            />
                                                            {!isReadOnly && (
                                                                <button type="button" onClick={doSave} className="w-full rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600">
                                                                    Salva nota
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {action.id === 'storico' && (
                                                        <div className="space-y-2">
                                                            <p>Ultima modifica: {lastSaved ? lastSaved.toLocaleString('it-IT') : (visit.updatedAt ? new Date(visit.updatedAt).toLocaleString('it-IT') : 'Non disponibile')}</p>
                                                            <p>Stato sync: {visit._syncStatus}</p>
                                                            <p>Versione locale: {visit._version}</p>
                                                            <button type="button" onClick={() => setShowHistoryModal(true)} className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">Apri storico completo</button>
                                                        </div>
                                                    )}
                                                    {action.id === 'precedenti' && (
                                                        <div className="space-y-2">
                                                            {patientVisits.length === 0 ? <p>Nessuna visita precedente.</p> : patientVisits.slice(0, 5).map(v => (
                                                                <button key={v.id} type="button" onClick={() => { setSelectedHistoryVisit(v); setShowHistoryModal(true) }} className="w-full rounded-lg bg-white px-2 py-2 text-left hover:bg-purple-50">
                                                                    <span className="block font-medium text-gray-800">{v.prestazioneNome || 'Visita'}</span>
                                                                    <span className="text-[10px] text-gray-500">{v.dataOra ? new Date(v.dataOra).toLocaleDateString('it-IT') : 'Data non disponibile'} · {v.stato || '—'}</span>
                                                                </button>
                                                            ))}
                                                            <button type="button" onClick={() => setShowHistoryModal(true)} className="w-full rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700">Visualizza storico visite</button>
                                                            {patient && <button type="button" onClick={() => requestGuardedNavigation(`/pazienti/${patient.id}`)} className="w-full text-purple-700 hover:underline">Apri cartella lavoratore</button>}
                                                        </div>
                                                    )}
                                                    {(action.id === 'laboratorio' || action.id === 'microbio') && (
                                                        <div className="space-y-2">
                                                            <p>{action.id === 'laboratorio' ? 'Carica e sincronizza referti di laboratorio.' : 'Carica e sincronizza referti microbiologici.'}</p>
                                                            {!isReadOnly && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { void handleQuickExamDocumentUpload(action.id === 'laboratorio' ? 'laboratorio' : 'microbiologico') }}
                                                                    className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                                                >
                                                                    <Upload className="h-3 w-3" /> Carica documento
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {action.id === 'allergie' && (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                value={healthForm.allergieFarmaci}
                                                                onChange={e => setHealthForm(prev => ({ ...prev, allergieFarmaci: e.target.value }))}
                                                                readOnly={isReadOnly}
                                                                rows={3}
                                                                placeholder="Allergie del paziente"
                                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                                            />
                                                            {!isReadOnly && <button type="button" onClick={handleSaveHealthProfile} className="w-full rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600">Salva allergie</button>}
                                                        </div>
                                                    )}
                                                    {action.id === 'allegati' && (
                                                        <div className="quick-action-embedded-card">
                                                            <AllegatiCard
                                                                visitId={visit.id}
                                                                tenantId={visit.tenantId}
                                                                isReadOnly={isReadOnly}
                                                                defaultExpanded
                                                            />
                                                        </div>
                                                    )}
                                                    {action.id === 'questionari' && (
                                                        <button type="button" onClick={() => setShowQuestionariModal(true)} className="w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700">Apri modal Questionari</button>
                                                    )}
                                                    {action.id === 'modulistica' && (
                                                        <div className="space-y-2">
                                                            <p>Moduli clinici collegati alla visita.</p>
                                                            <button type="button" onClick={() => setShowModulisticaModal(true)} className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700">Apri modal Modulistica</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

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
                                setVisit(prev => prev ? { ...prev, ...data } : prev)
                                setLastSaved(new Date())
                            }}
                        />

                        {/* Esami Strumentali */}
                        <EsamiStrumentaliCard
                            visitId={visit.id}
                            personId={visit.personId || ''}
                            tenantId={visit.tenantId}
                            isReadOnly={isReadOnly}
                            defaultExpanded
                            patientData={patient ? {
                                nome: patient.firstName || '',
                                cognome: patient.lastName || '',
                                dataNascita: patient.birthDate || '',
                                codiceFiscale: patient.taxCode || '',
                                gender: patient.gender || '',
                                peso: String((patient as unknown as Record<string, string | number | null | undefined>).peso || (patient as unknown as Record<string, string | number | null | undefined>).weight || ''),
                                altezza: String((patient as unknown as Record<string, string | number | null | undefined>).altezza || (patient as unknown as Record<string, string | number | null | undefined>).height || ''),
                                etnia: String((patient as unknown as Record<string, string | number | null | undefined>).etnia || (patient as unknown as Record<string, string | number | null | undefined>).ethnicity || ''),
                            } : undefined}
                        />

                        {layoutMode === 'scroll' && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
                                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <LayoutList className="w-3.5 h-3.5 text-teal-600" />
                                    Sezioni visita
                                </h3>
                                <div className="space-y-1">
                                    {displaySections.map(section => {
                                        const isActive = activeSection === section.id
                                        return (
                                            <button
                                                key={section.id}
                                                type="button"
                                                onClick={() => changeSection(section.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${isActive ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                                            >
                                                {section.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Prestazioni Card */}
                        {(
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Euro className="w-3.5 h-3.5 text-teal-600" />
                                        Prestazioni
                                    </h3>
                                    {!isReadOnly && (
                                        <button type="button" onClick={() => setPrestazionePickerOpen(prev => !prev)} className="p-1 rounded text-gray-400 hover:bg-gray-50 hover:text-teal-700" title="Aggiungi prestazione">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                {prestazionePickerOpen && (
                                    <div className="mb-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
                                        <div className="relative mb-2">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                            <input value={prestazioneSearch} onChange={e => setPrestazioneSearch(e.target.value)} placeholder="Cerca prestazione..." className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-gray-200 text-xs" />
                                        </div>
                                        <div className="max-h-44 overflow-y-auto space-y-1">
                                            {filteredPrestazioniCatalog.slice(0, 30).map(p => (
                                                <button key={p.id} type="button" onClick={() => handleAddPrestazione(p)} className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-white">
                                                    {p.nome}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {(prestazioniAppt.length > 0 ? prestazioniAppt : (visit.prestazioneNome ? [{
                                        prestazioneId: visit.prestazioneId || visit.id,
                                        nome: visit.prestazioneNome || 'Visita',
                                        codice: visit.prestazioneCodice,
                                        tipo: null,
                                        prezzoCalcolato: null
                                    }] : [])).map(p => {
                                        const canEditTipoMdl = visit.isMDL === 1 && (
                                            p.prestazioneId === visit.prestazioneId ||
                                            /visita\s+medica\s+del\s+lavoro/i.test(p.nome) ||
                                            isMdlCatalogPrestazione(p)
                                        )
                                        return (
                                            <div key={p.prestazioneId} className="rounded-xl border border-gray-100 px-3 py-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-gray-900 truncate">{p.nome}</p>
                                                        {p.codice && <p className="text-[10px] text-gray-400 font-mono">{p.codice}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {p.prezzoCalcolato != null && (
                                                            <span className="text-xs font-semibold text-teal-700">
                                                                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p.prezzoCalcolato)}
                                                            </span>
                                                        )}
                                                        {!isReadOnly && prestazioniAppt.length > 1 && (
                                                            <button type="button" onClick={() => handleRemovePrestazione(p.prestazioneId)} className="p-1 rounded text-gray-300 hover:bg-red-50 hover:text-red-600" title="Rimuovi prestazione">
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {canEditTipoMdl && (
                                                    <div className="mt-2">
                                                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">Tipo visita</p>
                                                        <ElegantSelect
                                                            value={visit.tipoVisitaMDL || 'PERIODICA'}
                                                            onChange={handleChangeTipoVisitaMDL}
                                                            options={MDL_VISIT_TYPE_OPTIONS}
                                                            disabled={isReadOnly}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    {prestazioniAppt.length > 1 && (
                                        <div className="pt-1.5 border-t border-gray-100 flex justify-between text-xs">
                                            <span className="text-gray-500">Totale</span>
                                            <span className="font-semibold text-gray-900">
                                                {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(
                                                    prestazioniAppt.reduce((sum, p) => sum + (p.prezzoCalcolato || 0), 0)
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {prestazioniAppt.length === 0 && !visit.prestazioneNome && (
                                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessuna prestazione collegata. Usa + per aggiungerla dal catalogo.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Medico Refertante */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <UserCheck className="w-3.5 h-3.5 text-violet-600" />
                                    Medico refertante
                                </h3>
                                {visit.medicoRefertanteId && !isReadOnly && (
                                    <button type="button" onClick={() => handleChangeMedicoRefertante({ id: visit.medicoId || '', firstName: visit.medicoFirstName, lastName: visit.medicoLastName })} className="text-[11px] text-gray-500 hover:text-red-600">
                                        Ripristina
                                    </button>
                                )}
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                                {visit.medicoRefertanteId
                                    ? `Dott. ${visit.medicoRefertanteFirstName || ''} ${visit.medicoRefertanteLastName || ''}`
                                    : visit.medicoLastName ? `Dott. ${visit.medicoFirstName || ''} ${visit.medicoLastName}` : 'Non assegnato'}
                            </p>
                            {visit.medicoRefertanteId && (
                                <span className="mt-2 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                    Diverso dal visitante
                                </span>
                            )}
                            {!isReadOnly && permissions.canChangeRefertante() && (
                                <div className="relative mt-3">
                                    <button type="button" onClick={() => setMedicoPickerOpen(prev => !prev)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-700 hover:bg-violet-50">
                                        Cambia medico
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${medicoPickerOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {medicoPickerOpen && (
                                        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                                            <div className="p-2 border-b border-gray-100">
                                                <input value={medicoSearch} onChange={e => setMedicoSearch(e.target.value)} placeholder="Cerca medico..." className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs" autoFocus />
                                            </div>
                                            <div className="max-h-48 overflow-y-auto py-1">
                                                {filteredMediciOptions.map(m => (
                                                    <button key={m.id} type="button" onClick={() => handleChangeMedicoRefertante(m)} className="w-full px-3 py-2 text-left text-xs hover:bg-violet-50">
                                                        Dott. {m.firstName || ''} {m.lastName || ''}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* MDL Info Card */}
                        {visit.personId && visit.isMDL === 1 && (
                            <MDLInfoCardOffline personId={visit.personId} tenantId={visit.tenantId} isReadOnly={isReadOnly} />
                        )}

                        {visit.personId && visit.isMDL === 1 && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
                                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-teal-600" />
                                    Sorveglianza sanitaria
                                </h3>
                                {patientScadenze.length === 0 ? (
                                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessuna scadenza protocollo disponibile offline.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {patientScadenze.slice(0, 6).map(s => {
                                            const scadenzaPresets = [3, 6, 12, 24].map(months => {
                                                const iso = addMonthsIso(visit?.dataOra || new Date().toISOString(), months) || new Date().toISOString()
                                                return {
                                                    months,
                                                    label: months === 12 ? '1 anno' : months === 24 ? '2 anni' : `${months} mesi`,
                                                    date: new Date(iso)
                                                }
                                            })
                                            return (
                                            <div key={s.id} className="rounded-xl border border-teal-100 bg-teal-50/30 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-semibold text-gray-900">{s.prestazioneNome || 'Accertamento'}</p>
                                                        <p className="mt-0.5 text-[10px] text-gray-500">{s.mansione || 'Mansione non indicata'}</p>
                                                    </div>
                                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.eseguita ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {s.eseguita ? 'Eseguita' : (s.stato || 'Da programmare')}
                                                    </span>
                                                </div>
                                                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                                                    <div className="rounded-lg bg-white px-2 py-1.5">
                                                        <p className="uppercase tracking-wide text-gray-400">Scadenza</p>
                                                        <p className="font-medium text-gray-800">{s.dataScadenza ? new Date(s.dataScadenza).toLocaleDateString('it-IT') : 'Non impostata'}</p>
                                                    </div>
                                                    <div className="rounded-lg bg-white px-2 py-1.5">
                                                        <p className="uppercase tracking-wide text-gray-400">Periodicità</p>
                                                        <p className="font-medium text-gray-800">{s.periodicitaMesi ? `Ogni ${s.periodicitaMesi} mesi` : 'Non impostata'}</p>
                                                    </div>
                                                </div>
                                                {!isReadOnly && (
                                                    <div className="mt-2 space-y-2">
                                                        <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                                            Data scadenza
                                                            <DatePickerElegante
                                                                value={s.dataScadenza || null}
                                                                onChange={date => {
                                                                    const matchedPreset = date
                                                                        ? scadenzaPresets.find(p => p.date.toDateString() === date.toDateString())
                                                                        : null
                                                                    void handleUpdateScadenzaProtocollo(s.id, {
                                                                        dataScadenza: date ? date.toISOString() : null,
                                                                        periodicitaMesi: matchedPreset?.months ?? s.periodicitaMesi
                                                                    })
                                                                }}
                                                                quickPresets={scadenzaPresets.map(({ label, date }) => ({ label, date }))}
                                                                clearable
                                                                compact
                                                                size="sm"
                                                                className="mt-1 min-w-0"
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {visit.isMDL !== 1 && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-4">
                                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <CalendarClock className="w-3.5 h-3.5 text-teal-600" />
                                    Prossimo controllo
                                </h3>
                                <div className="space-y-1 text-xs text-gray-600">
                                    <p>Data: {(formValues.prossimoControllo as string) || 'Non impostata'}</p>
                                    <p>Periodicità: {formValues.periodicitaMesi ? `ogni ${formValues.periodicitaMesi} mesi` : 'Non impostata'}</p>
                                </div>
                            </div>
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

                        {/* Sync Status */}
                        <div className={`p-3 rounded-xl text-xs ${visit._syncStatus === 'SYNCED' ? 'bg-green-50 text-green-700' :
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
                        {/* Section Tabs — hidden in scroll mode */}
                        {layoutMode === 'tabs' && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-3">
                                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-700">Sezioni visita</h3>
                                <div className="flex gap-1 overflow-x-auto">
                                    {displaySections.map(section => {
                                        const staticSection = SECTIONS.find(s => s.id === section.id)
                                        const Icon = staticSection?.icon
                                        const isActive = activeSection === section.id
                                        return (
                                            <button
                                                key={section.id}
                                                onClick={() => changeSection(section.id)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${isActive
                                                    ? 'bg-teal-600 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {Icon && <Icon className="w-3.5 h-3.5" />}
                                                {section.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Form Content */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-card p-6">

                            {/* ===== TEMPLATE DINAMICO (P52): se il template ha campi per questa sezione, mostrali ===== */}
                            {templateFields && templateFields.some(f => f.section === activeSection) && (
                                    layoutMode === 'scroll'
                                    ? (
                                        <div className="space-y-8">
                                            {displaySections.map(section => {
                                                const fields = templateFields.filter(f => f.section === section.id)
                                                if (fields.length === 0) return null
                                                return (
                                                    <div key={section.id} ref={el => { sectionRefs.current[section.id] = el }} className="scroll-mt-28">
                                                        <DynamicSectionRenderer
                                                            fields={fields}
                                                            values={formValues}
                                                            onChange={updateField}
                                                            readOnly={isReadOnly}
                                                            sectionLabel={section.label}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                                    : (
                                        <DynamicSectionRenderer
                                            fields={templateFields.filter(f => f.section === activeSection)}
                                            values={formValues}
                                            onChange={updateField}
                                            readOnly={isReadOnly}
                                            sectionLabel={displaySections.find(s => s.id === activeSection)?.label || activeSection}
                                        />
                                    )
                            )}

                            {/* ===== SEZIONI STATICHE (solo se NON ci sono campi template per questa sezione) ===== */}
                            {(!templateFields || !templateFields.some(f => f.section === activeSection)) && (
                                <>

                                    {/* ===== ANAMNESI ===== */}
                                    {(layoutMode === 'scroll' || activeSection === 'anamnesi') && (
                                        <div ref={el => { sectionRefs.current.anamnesi = el }} className="space-y-4 scroll-mt-28">
                                            <SectionHeader icon={ClipboardList} label="Anamnesi" />

                                            <FormTextArea
                                                label={visit.isMDL === 1 ? 'Anamnesi Lavorativa' : 'Anamnesi'}
                                                value={(formValues.anamnesiLavorativa as string) || ''}
                                                onChange={(v) => updateField('anamnesiLavorativa', v)}
                                                placeholder={visit.isMDL === 1 ? 'Attività lavorativa, esposizione a rischi, DPI utilizzati...' : 'Situazione clinica attuale, sintomi, motivo della visita...'}
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
                                    {(layoutMode === 'scroll' || activeSection === 'vitali') && (
                                        <div ref={el => { sectionRefs.current.vitali = el }} className="space-y-4 scroll-mt-28">
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
                                    {(layoutMode === 'scroll' || activeSection === 'esame') && (
                                        <div ref={el => { sectionRefs.current.esame = el }} className="space-y-4 scroll-mt-28">
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
                                    {(layoutMode === 'scroll' || activeSection === 'diagnosi') && (
                                        <div ref={el => { sectionRefs.current.diagnosi = el }} className="space-y-4 scroll-mt-28">
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
                                    {(layoutMode === 'scroll' || activeSection === 'terapia') && (
                                        <div ref={el => { sectionRefs.current.terapia = el }} className="space-y-4 scroll-mt-28">
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
                                    {(layoutMode === 'scroll' || activeSection === 'note') && (
                                        <div ref={el => { sectionRefs.current.note = el }} className="space-y-4 scroll-mt-28">
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
                                        </div>
                                    )}

                                    {/* Close static sections conditional wrapper */}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <DocumentiVisitaModal
            isOpen={showQuestionariModal}
            onClose={() => setShowQuestionariModal(false)}
            mode="questionari"
            visitId={visit.id}
            personId={visit.personId || ''}
            tenantId={visit.tenantId}
            isReadOnly={isReadOnly}
        />

        <DocumentiVisitaModal
            isOpen={showModulisticaModal}
            onClose={() => setShowModulisticaModal(false)}
            mode="modulistica"
            visitId={visit.id}
            personId={visit.personId || ''}
            tenantId={visit.tenantId}
            isReadOnly={isReadOnly}
        />

        {pdfPreviewUrl && (
            <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
                <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Referto PDF</h2>
                            <p className="text-xs text-gray-500">Anteprima generata al salvataggio della visita</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={handleDownloadPdf} disabled={pdfGenerating} className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50">
                                <Download className="h-4 w-4" />
                                Scarica
                            </button>
                            <button type="button" onClick={() => setPdfPreviewUrl(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <iframe src={pdfPreviewUrl} title="Anteprima referto PDF" className="min-h-0 flex-1 border-0 bg-gray-100" />
                </div>
            </div>
        )}

        {showHistoryModal && (
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Storico visita</h2>
                            <p className="text-xs text-gray-500">Ultima visita e visite precedenti del paziente</p>
                        </div>
                        <button onClick={() => setShowHistoryModal(false)} className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50">Chiudi</button>
                    </div>
                    <div className="grid max-h-[70vh] grid-cols-12 overflow-hidden">
                      <div className="col-span-5 overflow-y-auto border-r border-gray-100 p-5">
                        <div className="mb-4 rounded-xl border border-teal-100 bg-teal-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Visita corrente</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">{visit.prestazioneNome || 'Visita'} · {visit.stato}</p>
                            <p className="text-xs text-gray-500">{visit.dataOra ? new Date(visit.dataOra).toLocaleString('it-IT') : 'Data non disponibile'}</p>
                        </div>
                        {patientVisits.length === 0 ? (
                            <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400">Nessuna visita precedente disponibile offline.</p>
                        ) : (
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
                                {patientVisits.map(v => (
                                    <button key={v.id} type="button" onClick={() => setSelectedHistoryVisit(v)} className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${selectedHistoryVisit?.id === v.id ? 'bg-purple-50' : ''}`}>
                                        <span className="block text-sm font-medium text-gray-900">{v.prestazioneNome || 'Visita'}</span>
                                        <span className="text-xs text-gray-500">{v.dataOra ? new Date(v.dataOra).toLocaleString('it-IT') : 'Data non disponibile'} · {v.stato || '—'}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                      </div>
                      <div className="col-span-7 overflow-y-auto p-5">
                        {selectedHistoryVisit ? (
                          <div className="space-y-4">
                            <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">Dettaglio visita</p>
                              <h3 className="mt-1 text-base font-semibold text-gray-900">{selectedHistoryVisit.prestazioneNome || 'Visita'}</h3>
                              <p className="text-sm text-gray-600">{selectedHistoryVisit.dataOra ? new Date(selectedHistoryVisit.dataOra).toLocaleString('it-IT') : 'Data non disponibile'} · {selectedHistoryVisit.stato || '—'}</p>
                              <p className="text-xs text-gray-500">Medico: {[selectedHistoryVisit.medicoFirstName, selectedHistoryVisit.medicoLastName].filter(Boolean).join(' ') || 'Non indicato'}</p>
                            </div>
                            <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-gray-700">
                              <dl className="grid grid-cols-2 gap-3">
                                <div>
                                  <dt className="text-xs uppercase tracking-wider text-gray-400">Prestazione</dt>
                                  <dd className="font-medium text-gray-900">{selectedHistoryVisit.prestazioneNome || 'Visita'}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs uppercase tracking-wider text-gray-400">Stato</dt>
                                  <dd className="font-medium text-gray-900">{selectedHistoryVisit.stato || '—'}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs uppercase tracking-wider text-gray-400">Medico</dt>
                                  <dd>{[selectedHistoryVisit.medicoFirstName, selectedHistoryVisit.medicoLastName].filter(Boolean).join(' ') || 'Non indicato'}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs uppercase tracking-wider text-gray-400">Tipo</dt>
                                  <dd>{selectedHistoryVisit.isMDL ? 'Medicina del lavoro' : 'Visita clinica'}</dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full min-h-80 items-center justify-center rounded-xl bg-gray-50 text-center text-sm text-gray-400">
                            Seleziona una visita precedente per visualizzarla nel modal.
                          </div>
                        )}
                      </div>
                    </div>
                </div>
            </div>
        )}

        {showPatientEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-gray-900">Modifica anagrafica paziente</h2>
                        <button type="button" onClick={() => setShowPatientEdit(false)} className="text-sm text-gray-500 hover:text-gray-700">Chiudi</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FormInput label="Nome" value={patientForm.firstName} onChange={v => setPatientForm(prev => ({ ...prev, firstName: v }))} />
                        <FormInput label="Cognome" value={patientForm.lastName} onChange={v => setPatientForm(prev => ({ ...prev, lastName: v }))} />
                        <FormInput label="Codice fiscale" value={patientForm.taxCode} onChange={v => setPatientForm(prev => ({ ...prev, taxCode: v.toUpperCase() }))} />
                        <FormInput label="Data nascita" type="date" value={patientForm.birthDate} onChange={v => setPatientForm(prev => ({ ...prev, birthDate: v }))} />
                        <FormInput label="Luogo nascita" value={patientForm.birthPlace} onChange={v => setPatientForm(prev => ({ ...prev, birthPlace: v }))} />
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Genere</label>
                            <ElegantSelect value={patientForm.gender} onChange={gender => setPatientForm(prev => ({ ...prev, gender }))} options={[
                                { value: '', label: 'Non indicato' },
                                { value: 'M', label: 'Maschio' },
                                { value: 'F', label: 'Femmina' },
                                { value: 'MALE', label: 'Maschio' },
                                { value: 'FEMALE', label: 'Femmina' },
                            ]} />
                        </div>
                        <FormInput label="Titolo" value={patientForm.title} onChange={v => setPatientForm(prev => ({ ...prev, title: v }))} />
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Stato</label>
                            <ElegantSelect value={patientForm.status} onChange={status => setPatientForm(prev => ({ ...prev, status }))} options={[
                                { value: '', label: 'Non indicato' },
                                { value: 'ACTIVE', label: 'Attivo' },
                                { value: 'INACTIVE', label: 'Non attivo' },
                            ]} />
                        </div>
                        <FormInput label="Email" value={patientForm.email} onChange={v => setPatientForm(prev => ({ ...prev, email: v }))} />
                        <FormInput label="Telefono" value={patientForm.phone} onChange={v => setPatientForm(prev => ({ ...prev, phone: v }))} />
                        <div className="col-span-2">
                            <FormInput label="Indirizzo" value={patientForm.residenceAddress} onChange={v => setPatientForm(prev => ({ ...prev, residenceAddress: v }))} />
                        </div>
                        <FormInput label="Comune" value={patientForm.residenceCity} onChange={v => setPatientForm(prev => ({ ...prev, residenceCity: v }))} />
                        <FormInput label="Provincia" value={patientForm.province} onChange={v => setPatientForm(prev => ({ ...prev, province: v }))} />
                        <FormInput label="CAP" value={patientForm.postalCode} onChange={v => setPatientForm(prev => ({ ...prev, postalCode: v }))} />
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setShowPatientEdit(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Annulla</button>
                        <button type="button" onClick={handleSavePatientProfile} className="px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg">Salva</button>
                    </div>
                </div>
            </div>
        )}

        {showExitDialog && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-5 py-4">
                        <div className="rounded-lg bg-amber-100 p-2">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Uscita dalla visita</h2>
                            <p className="text-sm text-gray-600">
                                {exitDiscardStep ? 'Indica il motivo prima di annullare la visita.' : 'Hai modifiche non salvate. Come vuoi procedere?'}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-3 p-5">
                        {exitError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {exitError}
                            </div>
                        )}
                        {!exitDiscardStep ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleExitAction('draft')}
                                    disabled={exitActionLoading}
                                    className="w-full flex items-center gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50"
                                >
                                    <div className="rounded-lg bg-teal-100 p-3"><Save className="h-5 w-5 text-teal-600" /></div>
                                    <div>
                                        <p className="font-medium text-gray-900">Salva come bozza</p>
                                        <p className="text-sm text-gray-500">Salva le modifiche e torna alla pagina precedente</p>
                                    </div>
                                    {exitActionLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-teal-600" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExitAction('complete')}
                                    disabled={exitActionLoading || isSaving}
                                    className="w-full flex items-center gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-green-300 hover:bg-green-50 disabled:opacity-50"
                                >
                                    <div className="rounded-lg bg-green-100 p-3"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                                    <div>
                                        <p className="font-medium text-gray-900">Completa visita</p>
                                        <p className="text-sm text-gray-500">Salva, chiude la visita e genera il referto PDF locale</p>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setExitDiscardStep(true); setExitError(null) }}
                                    disabled={exitActionLoading}
                                    className="w-full flex items-center gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                                >
                                    <div className="rounded-lg bg-red-100 p-3"><XCircle className="h-5 w-5 text-red-600" /></div>
                                    <div>
                                        <p className="font-medium text-gray-900">Annulla modifiche</p>
                                        <p className="text-sm text-gray-500">Richiede motivo GDPR, elimina la visita e ripristina l'appuntamento</p>
                                    </div>
                                </button>
                            </>
                        ) : (
                            <>
                                <label className="block text-xs font-medium text-gray-600">
                                    Motivo annullamento modifiche / visita
                                    <textarea
                                        value={discardReason}
                                        onChange={e => setDiscardReason(e.target.value)}
                                        rows={4}
                                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                        placeholder="Obbligatorio per registro GDPR, minimo 10 caratteri..."
                                    />
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setExitDiscardStep(false)}
                                        disabled={exitActionLoading}
                                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Indietro
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleExitAction('discard')}
                                        disabled={exitActionLoading || discardReason.trim().length < 10}
                                        className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Conferma annullamento
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                        <button
                            type="button"
                            onClick={() => handleExitAction('stay')}
                            disabled={exitActionLoading}
                            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Rimani in visita
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showHealthEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                <div className="flex h-[min(820px,calc(100vh-2rem))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-gray-100">
                        <div className="px-5 pt-5">
                            <h2 className="text-base font-semibold text-gray-900">Profilo di salute</h2>
                            <p className="text-xs text-gray-500">Clinica, abitudini, DPI, patente e malattie professionali</p>
                        </div>
                        <button type="button" onClick={() => setShowHealthEdit(false)} className="mr-5 mt-5 text-sm text-gray-500 hover:text-gray-700">Chiudi</button>
                    </div>
                    <div className="flex border-b border-gray-100 px-5">
                        {[
                            ['clinica', Heart, 'Clinica'],
                            ['abitudini', Activity, 'Abitudini'],
                            ['dpi', Shield, 'DPI'],
                            ['patente', Car, 'Patente'],
                            ['malattie', AlertTriangle, 'Malattie prof.'],
                        ].map(([key, Icon, label]) => (
                            <button
                                key={String(key)}
                                type="button"
                                onClick={() => setHealthTab(key as typeof healthTab)}
                                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium ${healthTab === key ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {String(label)}
                            </button>
                        ))}
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-5">
                        {healthTab === 'clinica' && (
                            <div className="space-y-4">
                              <div className="rounded-xl border border-gray-100 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Parametri vitali</p>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <FormInput label="Peso (kg)" type="number" value={healthForm.peso} onChange={v => updateHealthVital('peso', v)} />
                                <FormInput label="Altezza (cm)" type="number" value={healthForm.altezza} onChange={v => updateHealthVital('altezza', v)} />
                                <FormInput label="BMI" type="number" value={healthForm.bmi} onChange={v => setHealthForm(prev => ({ ...prev, bmi: v }))} />
                                <FormInput label="Temperatura" type="number" value={healthForm.temperatura} onChange={v => setHealthForm(prev => ({ ...prev, temperatura: v }))} />
                                <FormInput label="PA sistolica" type="number" value={healthForm.paSistolica} onChange={v => setHealthForm(prev => ({ ...prev, paSistolica: v }))} />
                                <FormInput label="PA diastolica" type="number" value={healthForm.paDiastolica} onChange={v => setHealthForm(prev => ({ ...prev, paDiastolica: v }))} />
                                <FormInput label="FC" type="number" value={healthForm.fc} onChange={v => setHealthForm(prev => ({ ...prev, fc: v }))} />
                                <FormInput label="SpO2" type="number" value={healthForm.spo2} onChange={v => setHealthForm(prev => ({ ...prev, spo2: v }))} />
                                <FormInput label="Prossimo controllo" type="date" value={healthForm.prossimoControllo} onChange={v => setHealthForm(prev => ({ ...prev, prossimoControllo: v }))} />
                                <FormInput label="Periodicità mesi" type="number" value={healthForm.periodicitaMesi} onChange={v => setHealthForm(prev => ({ ...prev, periodicitaMesi: v }))} />
                                </div>
                              </div>
                              <div className="rounded-xl border border-gray-100 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Condizioni cliniche</p>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                <CheckField label="Invalidità" checked={healthForm.hasInvalidita} onChange={v => setHealthForm(prev => ({ ...prev, hasInvalidita: v }))} />
                                <CheckField label="Legge 104" checked={healthForm.legge104} onChange={v => setHealthForm(prev => ({ ...prev, legge104: v }))} />
                                {healthForm.hasInvalidita && <FormInput label="Tipo invalidità" value={healthForm.tipoInvalidita} onChange={v => setHealthForm(prev => ({ ...prev, tipoInvalidita: v }))} />}
                                {healthForm.hasInvalidita && <FormInput label="Grado invalidità civile (%)" type="number" value={healthForm.gradoInvaliditaCivile} onChange={v => setHealthForm(prev => ({ ...prev, gradoInvaliditaCivile: v }))} />}
                                <CheckField label="Diabete" checked={healthForm.hasDiabete} onChange={v => setHealthForm(prev => ({ ...prev, hasDiabete: v }))} />
                                <CheckField label="Ipertensione" checked={healthForm.hasIpertensione} onChange={v => setHealthForm(prev => ({ ...prev, hasIpertensione: v }))} />
                                <CheckField label="Cardiopatie" checked={healthForm.hasCardiopatie} onChange={v => setHealthForm(prev => ({ ...prev, hasCardiopatie: v }))} />
                                <CheckField label="Asma" checked={healthForm.hasAsma} onChange={v => setHealthForm(prev => ({ ...prev, hasAsma: v }))} />
                                <CheckField label="Epilessia" checked={healthForm.hasEpilessia} onChange={v => setHealthForm(prev => ({ ...prev, hasEpilessia: v }))} />
                                <div className="md:col-span-3"><FormInput label="Farmaci" value={healthForm.farmaci} onChange={v => setHealthForm(prev => ({ ...prev, farmaci: v }))} /></div>
                                <div className="md:col-span-3"><FormInput label="Allergie farmaci" value={healthForm.allergieFarmaci} onChange={v => setHealthForm(prev => ({ ...prev, allergieFarmaci: v }))} /></div>
                                <div className="md:col-span-3"><FormInput label="Altre patologie" value={healthForm.altrePatologie} onChange={v => setHealthForm(prev => ({ ...prev, altrePatologie: v }))} /></div>
                                </div>
                              </div>
                            </div>
                        )}
                        {healthTab === 'abitudini' && (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-gray-100 p-4">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Stili di vita</p>
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                        <SelectField label="Fumatore" value={healthForm.fumatore} onChange={v => setHealthForm(prev => ({ ...prev, fumatore: v }))} options={['non_fumatore', 'ex_fumatore', 'fumatore']} />
                                        {healthForm.fumatore === 'fumatore' && <FormInput label="Sigarette/giorno" type="number" value={healthForm.sigaretteGiorno} onChange={v => setHealthForm(prev => ({ ...prev, sigaretteGiorno: v }))} />}
                                        {healthForm.fumatore && healthForm.fumatore !== 'non_fumatore' && <FormInput label="Tipo sigaretta" value={healthForm.tipoSigaretta} onChange={v => setHealthForm(prev => ({ ...prev, tipoSigaretta: v }))} />}
                                        {healthForm.fumatore && healthForm.fumatore !== 'non_fumatore' && <FormInput label="Età inizio fumo" type="number" value={healthForm.etaInizioFumo} onChange={v => setHealthForm(prev => ({ ...prev, etaInizioFumo: v }))} />}
                                        {healthForm.fumatore && healthForm.fumatore !== 'non_fumatore' && <FormInput label="Anni fumo" type="number" value={healthForm.anniFumo} onChange={v => setHealthForm(prev => ({ ...prev, anniFumo: v }))} />}
                                        <SelectField label="Alcol" value={healthForm.alcol} onChange={v => updateHealthLifestyle('alcol', v)} options={['no', 'occasionale', 'moderato', 'elevato']} />
                                        {healthForm.alcol && !['no', 'non_bevitore'].includes(healthForm.alcol) && <FormInput label="Unità/settimana" type="number" value={healthForm.unitaAlcolSettimana} onChange={v => setHealthForm(prev => ({ ...prev, unitaAlcolSettimana: v }))} />}
                                        <SelectField label="Attività fisica" value={healthForm.attivitaFisica} onChange={v => updateHealthLifestyle('attivitaFisica', v)} options={['nessuna', 'leggera', 'moderata', 'intensa']} />
                                        {healthForm.attivitaFisica && healthForm.attivitaFisica !== 'nessuna' && <FormInput label="Ore attività/settimana" type="number" value={healthForm.oreAttivitaSettimana} onChange={v => setHealthForm(prev => ({ ...prev, oreAttivitaSettimana: v }))} />}
                                        <FormInput label="Uso sostanze" value={healthForm.droghe} onChange={v => setHealthForm(prev => ({ ...prev, droghe: v }))} />
                                    </div>
                                </div>
                                <div className="rounded-xl border border-gray-100 p-4">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Alimentazione, sonno e contesto</p>
                                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                        <FormInput label="Alimentazione" value={healthForm.alimentazione} onChange={v => setHealthForm(prev => ({ ...prev, alimentazione: v }))} />
                                        <FormInput label="Porzioni frutta/verdura" type="number" value={healthForm.porzioniFruttaVerdure} onChange={v => setHealthForm(prev => ({ ...prev, porzioniFruttaVerdure: v }))} />
                                        <FormInput label="Stato civile" value={healthForm.statoCivile} onChange={v => setHealthForm(prev => ({ ...prev, statoCivile: v }))} />
                                        <FormInput label="Numero figli" type="number" value={healthForm.numeroFigli} onChange={v => setHealthForm(prev => ({ ...prev, numeroFigli: v }))} />
                                        <FormInput label="Professione" value={healthForm.professione} onChange={v => setHealthForm(prev => ({ ...prev, professione: v }))} />
                                        <SelectField label="Qualità sonno" value={healthForm.qualitaSonno} onChange={v => setHealthForm(prev => ({ ...prev, qualitaSonno: v }))} options={['buona', 'discreta', 'scarsa']} />
                                        <FormInput label="Ore sonno/notte" type="number" value={healthForm.oreSonnoNotte} onChange={v => setHealthForm(prev => ({ ...prev, oreSonnoNotte: v }))} />
                                        <CheckField label="Sonnolenza diurna" checked={healthForm.sonnolenzaDiurna} onChange={v => setHealthForm(prev => ({ ...prev, sonnolenzaDiurna: v }))} />
                                        <CheckField label="Apnea notturna" checked={healthForm.apneaNotturna} onChange={v => setHealthForm(prev => ({ ...prev, apneaNotturna: v }))} />
                                        <div className="md:col-span-3"><FormInput label="Note salute" value={healthForm.noteSalute} onChange={v => setHealthForm(prev => ({ ...prev, noteSalute: v }))} /></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {healthTab === 'dpi' && (
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                                <CheckField label="Usa DPI personali" checked={healthForm.usaDpiPersonali} onChange={v => setHealthForm(prev => ({ ...prev, usaDpiPersonali: v }))} />
                                <CheckField label="Usa mezzi aziendali" checked={healthForm.usaMezziAziendali} onChange={v => setHealthForm(prev => ({ ...prev, usaMezziAziendali: v }))} />
                                {healthForm.usaDpiPersonali && <FormInput label="DPI personali" value={healthForm.dpiPersonali} onChange={v => setHealthForm(prev => ({ ...prev, dpiPersonali: v }))} />}
                                <FormInput label="DPI azienda" value={healthForm.dpiAzienda} onChange={v => setHealthForm(prev => ({ ...prev, dpiAzienda: v }))} />
                                {healthForm.usaMezziAziendali && <FormInput label="Mezzi aziendali" value={healthForm.mezziAziendali} onChange={v => setHealthForm(prev => ({ ...prev, mezziAziendali: v }))} />}
                                <CheckField label="Formazione generale" checked={healthForm.formazioneGenerale} onChange={v => setHealthForm(prev => ({ ...prev, formazioneGenerale: v }))} />
                                <CheckField label="Formazione specifica" checked={healthForm.formazioneSpecifica} onChange={v => setHealthForm(prev => ({ ...prev, formazioneSpecifica: v }))} />
                                <CheckField label="Addestramento completato" checked={healthForm.addestramentoCompletato} onChange={v => setHealthForm(prev => ({ ...prev, addestramentoCompletato: v }))} />
                            </div>
                        )}
                        {healthTab === 'patente' && (
                            <div className="grid grid-cols-2 gap-3">
                                <FormInput label="Categorie patente" value={healthForm.patenteCategorie} onChange={v => setHealthForm(prev => ({ ...prev, patenteCategorie: v }))} />
                                <FormInput label="Scadenza patente" type="date" value={healthForm.patenteScadenza} onChange={v => setHealthForm(prev => ({ ...prev, patenteScadenza: v }))} />
                                <CheckField label="CQC" checked={healthForm.cqc} onChange={v => setHealthForm(prev => ({ ...prev, cqc: v }))} />
                                {healthForm.cqc && <FormInput label="Scadenza CQC" type="date" value={healthForm.cqcScadenza} onChange={v => setHealthForm(prev => ({ ...prev, cqcScadenza: v }))} />}
                            </div>
                        )}
                        {healthTab === 'malattie' && (
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">Malattie professionali, denunce, riconoscimenti e note INAIL</label>
                                    <textarea
                                        value={healthForm.malattieProfessionali}
                                        onChange={e => setHealthForm(prev => ({ ...prev, malattieProfessionali: e.target.value }))}
                                        rows={8}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        placeholder="Inserisci anamnesi professionale, sospette tecnopatie, denunce, riconoscimenti, esiti e note correlate."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
                        <button type="button" onClick={() => setShowHealthEdit(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Annulla</button>
                        <button type="button" onClick={handleSaveHealthProfile} className="px-3 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg">Salva</button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}

// ============================================================
// DynamicSectionRenderer — renders template fields for a section
// ============================================================

function DynamicSectionRenderer({
    fields,
    values,
    onChange,
    readOnly,
    sectionLabel,
}: {
    fields: VisitField[]
    values: FormValues
    onChange: (key: string, value: unknown) => void
    readOnly: boolean
    sectionLabel: string
}): JSX.Element {
    const sorted = [...fields].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    return (
        <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 font-heading">{sectionLabel}</h2>
            {sorted.map(field => (
                <DynamicFieldRenderer
                    key={field.name}
                    field={field}
                    value={values[field.name]}
                    onChange={onChange}
                    readOnly={readOnly}
                />
            ))}
        </div>
    )
}

function DynamicFieldRenderer({
    field,
    value,
    onChange,
    readOnly,
}: {
    field: VisitField
    value: unknown
    onChange: (key: string, value: unknown) => void
    readOnly: boolean
}): JSX.Element | null {
    if (!field.visible) return null

    const strVal = value != null ? String(value) : ''
    const numVal = value != null && value !== '' ? Number(value) : undefined

    switch (field.type) {
        case 'TEXT':
            return (
                <FormInput
                    label={field.label + (field.required ? ' *' : '')}
                    value={strVal}
                    onChange={(v) => onChange(field.name, v)}
                    placeholder={field.placeholder}
                    readOnly={readOnly}
                />
            )
        case 'TEXTAREA':
        case 'RICHTEXT':
            return (
                <FormTextArea
                    label={field.label + (field.required ? ' *' : '')}
                    value={strVal}
                    onChange={(v) => onChange(field.name, v)}
                    placeholder={field.placeholder}
                    readOnly={readOnly}
                    rows={4}
                />
            )
        case 'NUMBER':
            return (
                <FormNumber
                    label={field.label + (field.required ? ' *' : '')}
                    value={numVal}
                    onChange={(v) => onChange(field.name, v)}
                    placeholder={field.placeholder}
                    readOnly={readOnly}
                />
            )
        case 'DATE':
            return (
                <DatePickerElegante
                    label={field.label + (field.required ? ' *' : '')}
                    value={strVal || null}
                    onChange={(d) => onChange(field.name, d ? d.toISOString().split('T')[0] : '')}
                    disabled={readOnly}
                    clearable
                    placeholder={field.placeholder || 'Seleziona data'}
                />
            )
        case 'DROPDOWN': {
            const opts = field.options || []
            return (
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        {field.label}{field.required ? ' *' : ''}
                    </label>
                    <ElegantSelect
                        value={strVal}
                        onChange={(value) => onChange(field.name, value)}
                        disabled={readOnly}
                        options={[
                            { value: '', label: field.placeholder || '- Seleziona -' },
                            ...opts.map((opt) => {
                            const optVal = typeof opt === 'string' ? opt : opt.value
                            const optLabel = typeof opt === 'string' ? opt : opt.label
                                return { value: optVal, label: optLabel }
                            })
                        ]}
                    />
                </div>
            )
        }
        case 'MULTI_CHOICE': {
            const opts = field.options || []
            const selected: string[] = Array.isArray(value) ? value as string[] : (strVal ? strVal.split(',') : [])
            return (
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                        {field.label}{field.required ? ' *' : ''}
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {opts.map((opt, i) => {
                            const optVal = typeof opt === 'string' ? opt : opt.value
                            const optLabel = typeof opt === 'string' ? opt : opt.label
                            const checked = selected.includes(optVal)
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => {
                                        const next = checked ? selected.filter(s => s !== optVal) : [...selected, optVal]
                                        onChange(field.name, next)
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${checked ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-200 hover:border-teal-400'
                                        } ${readOnly ? 'cursor-default opacity-70' : ''}`}
                                >
                                    {optLabel}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )
        }
        case 'BOOLEAN':
            return (
                <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-700">
                        {field.label}{field.required ? ' *' : ''}
                    </label>
                    <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => onChange(field.name, !value)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-teal-600' : 'bg-gray-200'
                            } ${readOnly ? 'cursor-default opacity-70' : ''}`}
                    >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${value ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                </div>
            )
        case 'VITALS':
            {
                const vitalsValue = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, number | undefined> : {}
                const vitalsFields = [
                    ['sistolica', 'Sistolica (mmHg)'],
                    ['diastolica', 'Diastolica (mmHg)'],
                    ['frequenza', 'FC (bpm)'],
                    ['saturazione', 'SpO2 (%)'],
                    ['temperatura', 'Temp (°C)'],
                ] as const
                return (
                    <div>
                        <label className="mb-2 block text-xs font-medium text-gray-700">
                            {field.label}{field.required ? ' *' : ''}
                        </label>
                        <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-5">
                            {vitalsFields.map(([key, label]) => (
                                <label key={key} className="block text-xs text-gray-500">
                                    {label}
                                    <input
                                        type="number"
                                        value={vitalsValue[key] ?? ''}
                                        onChange={event => onChange(field.name, { ...vitalsValue, [key]: event.target.value ? Number(event.target.value) : undefined })}
                                        disabled={readOnly}
                                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100"
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                )
            }
        default:
            return null
    }
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
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y ${readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''
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
    if (type === 'date') {
        return (
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                <ElegantDateInput value={value} onChange={onChange} clearable={!readOnly} />
            </div>
        )
    }
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
                type={type === 'date' ? 'text' : type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                readOnly={readOnly}
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''
                    }`}
            />
        </div>
    )
}

function SelectField({ label, value, onChange, options }: {
    label: string
    value: string
    onChange: (v: string) => void
    options: string[]
}): JSX.Element {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <ElegantSelect value={value} onChange={onChange} options={[{ value: '', label: 'Non indicato' }, ...options.map(o => ({ value: o, label: o.replace(/_/g, ' ') }))]} />
        </div>
    )
}

function CheckField({ label, checked, onChange }: {
    label: string
    checked: boolean
    onChange: (v: boolean) => void
}): JSX.Element {
    return (
        <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
            {label}
        </label>
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
                className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''
                    }`}
            />
        </div>
    )
}
