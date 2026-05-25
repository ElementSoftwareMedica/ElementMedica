import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
import { useDesktopPermission } from '../hooks/useDesktopPermission'

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
    options?: (string | { value: string; label: string })[]
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
}

interface MedicoOption {
    id: string
    firstName: string | null
    lastName: string | null
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
    const [templateSectionLayout, setTemplateSectionLayout] = useState<'tabs' | 'sections' | 'continuous'>('tabs')

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
        prossimoControllo: '',
        periodicitaMesi: '',
        fumatore: '',
        sigaretteGiorno: '',
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

    useEffect(() => {
        if (!hasChanges) return
        const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
            event.preventDefault()
            event.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasChanges])

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
            prossimoControllo: (formValues.prossimoControllo as string) || '',
            periodicitaMesi: formValues.periodicitaMesi != null ? String(formValues.periodicitaMesi) : '',
            fumatore: (formValues.fumatore as string) || '',
            sigaretteGiorno: formValues.sigaretteGiorno != null ? String(formValues.sigaretteGiorno) : '',
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
            try {
                const parsed = JSON.parse(v.datiStrutturati || '{}')
                setFormValues(parsed)
            } catch {
                setFormValues({})
            }

            // Load visit template (P52): parse fields and build section list
            if (v.templateId) {
                try {
                    const templates = await window.desktopApi.db.query({
                        table: 'visit_templates',
                        where: { id: v.templateId, _isDeleted: 0 },
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
                if (patients.length > 0) setPatient(patients[0])
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
                    }) as Array<{ id: string; mansioneId: string | null; nome: string | null; prestazioni: string | null; mansioneNome: string | null }>
                    const fallbackScadenze = allProtocolli
                        .filter(p => p.mansioneId && mansioneIds.includes(p.mansioneId))
                        .flatMap(p => {
                            try {
                                return (JSON.parse(p.prestazioni || '[]') as Array<{ prestazioneId?: string; prestazioneNome?: string; prestazione?: { nome?: string }; periodicitaMesi?: number; periodicitaCustomMesi?: number; scadenzaDefaultMesi?: number }>).map((item, idx) => ({
                                    id: `protocollo:${p.id}:${item.prestazioneId || idx}`,
                                    prestazioneId: item.prestazioneId || null,
                                    prestazioneNome: item.prestazioneNome || item.prestazione?.nome || 'Accertamento',
                                    mansione: p.mansioneNome,
                                    dataScadenza: null,
                                    periodicitaMesi: item.periodicitaMesi || item.periodicitaCustomMesi || item.scadenzaDefaultMesi || null,
                                    eseguita: 0,
                                    stato: 'Da programmare',
                                }))
                            } catch {
                                return []
                            }
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
    }, [id])

    useEffect(() => { loadVisit() }, [loadVisit])

    useEffect(() => {
        if (!window.desktopApi) return
        void Promise.all([
            window.desktopApi.db.query({ table: 'prestazioni', where: { _isDeleted: 0 }, orderBy: { column: 'nome', direction: 'ASC' } }),
            window.desktopApi.db.query({ table: 'visits', where: { _isDeleted: 0 }, orderBy: { column: 'medicoLastName', direction: 'ASC' } })
        ]).then(([prestRows, visitRows]) => {
            setPrestazioniCatalog(prestRows as PrestazioneCatalogItem[])
            const map = new Map<string, MedicoOption>()
            if (visit?.medicoId) map.set(visit.medicoId, { id: visit.medicoId, firstName: visit.medicoFirstName, lastName: visit.medicoLastName })
            for (const v of visitRows as Array<{ medicoId: string | null; medicoFirstName: string | null; medicoLastName: string | null }>) {
                if (v.medicoId && !map.has(v.medicoId)) {
                    map.set(v.medicoId, { id: v.medicoId, firstName: v.medicoFirstName, lastName: v.medicoLastName })
                }
            }
            setMediciOptions([...map.values()].filter(m => m.lastName || m.firstName))
        }).catch(() => undefined)
    }, [visit?.medicoId, visit?.medicoFirstName, visit?.medicoLastName])

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
                    const tariffariRows = await window.desktopApi.db.query({
                        table: 'tariffari',
                        where: { _isDeleted: 0, attivo: 1 }
                    }) as Array<{ companyAssociations: string | null; voci: string | null }>
                    for (const t of tariffariRows) {
                        try {
                            const assoc = JSON.parse(t.companyAssociations || '[]') as Array<{ companyTenantProfileId: string }>
                            if (assoc.some(a => a.companyTenantProfileId === companyId)) {
                                const voci = JSON.parse(t.voci || '[]') as Array<{ prestazioneId: string | null; prezzoBase: number }>
                                for (const v of voci) {
                                    if (v.prestazioneId && v.prezzoBase > 0) tariffVoci.set(v.prestazioneId, v.prezzoBase)
                                }
                            }
                        } catch { /* skip malformed */ }
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

    const generatePdfPreview = useCallback(async (): Promise<void> => {
        const data = buildPdfData()
        if (!data) return
        setPdfGenerating(true)
        try {
            const { createVisitaReferroPdfBlob } = await import('../components/visita/VisitaReferroPdf')
            const blob = await createVisitaReferroPdfBlob(data)
            const url = URL.createObjectURL(blob)
            setPdfPreviewUrl(prev => {
                if (prev) URL.revokeObjectURL(prev)
                return url
            })
        } finally {
            setPdfGenerating(false)
        }
    }, [buildPdfData])

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

    // Save on section change
    const changeSection = useCallback(async (newSection: string) => {
        if (hasChanges && visit && window.desktopApi) {
            await doSave()
        }
        setActiveSection(newSection)
        if (layoutMode === 'scroll' || templateSectionLayout !== 'tabs') {
            requestAnimationFrame(() => {
                sectionRefs.current[newSection]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            })
        }
    }, [hasChanges, visit, doSave, layoutMode, templateSectionLayout])

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
                            const tariffariRows = await window.desktopApi.db.query({
                                table: 'tariffari',
                                where: { _isDeleted: 0, attivo: 1 }
                            }) as Array<{ id: string; companyAssociations: string | null; voci: string | null }>

                            for (const tariffario of tariffariRows) {
                                try {
                                    const assoc: Array<{ companyTenantProfileId: string }> = JSON.parse(tariffario.companyAssociations || '[]')
                                    if (assoc.some(a => a.companyTenantProfileId === companyTenantProfileId)) {
                                        const voci: Array<{ prestazioneId: string | null; prezzoBase: number }> = JSON.parse(tariffario.voci || '[]')
                                        const voce = voci.find(v => v.prestazioneId === prestazioneId)
                                        if (voce && voce.prezzoBase > 0) {
                                            importo = voce.prezzoBase
                                            break
                                        }
                                    }
                                } catch {
                                    // skip malformed JSON
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
                    }) as Array<{ id: string; mansioneId: string | null; prestazioni: string }>

                    const relevantProtocolli = allProtocolli.filter(
                        p => p.mansioneId && mansioneIds.includes(p.mansioneId)
                    )

                    for (const protocollo of relevantProtocolli) {
                        type ProtocolloPrestItem = {
                            prestazioneId?: string
                            scadenzaDefaultMesi?: number
                            periodicitaCustomMesi?: number
                            prestazione?: { nome?: string }
                        }
                        let prestazioniItems: ProtocolloPrestItem[]
                        try { prestazioniItems = JSON.parse(protocollo.prestazioni || '[]') }
                        catch { continue }

                        const mansioneId = mansioni.find(m => m.mansioneId === protocollo.mansioneId)?.mansioneId ?? null

                        for (const item of prestazioniItems) {
                            const periodicitaMesi = item.periodicitaCustomMesi ?? item.scadenzaDefaultMesi ?? 0
                            if (periodicitaMesi <= 0 || !item.prestazioneId) continue

                            // Skip if already pending scadenza for this person + prestazione
                            const existing = await window.desktopApi.db.query({
                                table: 'scadenze',
                                where: { personId: visit.personId!, prestazioneId: item.prestazioneId, eseguita: 0, _isDeleted: 0 }
                            }) as Array<{ id: string }>
                            if (existing.length > 0) continue

                            // Resolve prestazione name (from nested object or local table)
                            let prestazioneNome = item.prestazione?.nome || ''
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

        if (timerRef.current) clearInterval(timerRef.current)
        setVisit(prev => prev ? { ...prev, stato: 'COMPLETATA', dataFine: now, durataMinuti } : null)
        await generatePdfPreview()
    }, [visit, doSave, permissions, generatePdfPreview])

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
            const { downloadVisitaReferroPdf } = await import('../components/visita/VisitaReferroPdf')
            const data = buildPdfData()
            if (data) await downloadVisitaReferroPdf(data)
        } catch {
            // Silent: browser will show download progress
        } finally {
            setPdfGenerating(false)
        }
    }, [visit, pdfGenerating, buildPdfData])

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
            prossimoControllo: healthForm.prossimoControllo || '',
            periodicitaMesi: asNumber(healthForm.periodicitaMesi),
            fumatore: healthForm.fumatore || '',
            sigaretteGiorno: asNumber(healthForm.sigaretteGiorno),
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
        setFormValues(nextValues)
        formValuesRef.current = nextValues
        setHasChanges(false)
        setLastSaved(new Date())
        setShowHealthEdit(false)
    }, [visit, healthForm, isReadOnly])

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

    const handleAddPrestazione = useCallback(async (prestazione: PrestazioneCatalogItem) => {
        if (!visit || !window.desktopApi || isReadOnly) return
        const now = new Date().toISOString()
        if (!visit.appuntamentoId) {
            const data = {
                prestazioneId: prestazione.id,
                prestazioneNome: prestazione.nome,
                prestazioneCodice: prestazione.codice,
                isMDL: isMdlCatalogPrestazione(prestazione) ? 1 : 0,
                tipoVisitaMDL: isMdlCatalogPrestazione(prestazione) ? (visit.tipoVisitaMDL || 'PERIODICA') : null,
                updatedAt: now,
            }
            await window.desktopApi.db.update({ table: 'visits', id: visit.id, data })
            await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'visits', entityId: visit._serverId || visit.id, localId: visit._localId, payload: { prestazioneId: prestazione.id, tipoVisitaMDL: data.tipoVisitaMDL } })
            setVisit(prev => prev ? { ...prev, ...data } : prev)
        } else {
            const exists = prestazioniAppt.some(p => p.prestazioneId === prestazione.id)
            if (!exists) {
                const inserted = await window.desktopApi.db.insert({
                    table: 'appointment_prestazioni',
                    data: {
                        appuntamentoId: visit.appuntamentoId,
                        prestazioneId: prestazione.id,
                        prezzo: prestazione.prezzoBase,
                        quantita: 1,
                        note: null,
                    }
                }) as { id: string }
                await window.desktopApi.sync.enqueue({
                    type: 'CREATE',
                    entity: 'appointment_prestazioni',
                    entityId: inserted.id,
                    payload: { appuntamentoId: visit.appuntamentoId, prestazioneId: prestazione.id, prezzo: prestazione.prezzoBase, quantita: 1 }
                })
                setPrestazioniAppt(prev => [...prev, { prestazioneId: prestazione.id, nome: prestazione.nome, codice: prestazione.codice, tipo: prestazione.tipo, prezzoCalcolato: prestazione.prezzoBase }])
            }
        }
        setPrestazionePickerOpen(false)
        setPrestazioneSearch('')
    }, [visit, isReadOnly, prestazioniAppt])

    const handleRemovePrestazione = useCallback(async (prestazioneId: string) => {
        if (!visit || !window.desktopApi || isReadOnly) return
        if (visit.appuntamentoId) {
            await window.desktopApi.db.deleteWhere({ table: 'appointment_prestazioni', where: { appuntamentoId: visit.appuntamentoId, prestazioneId } })
            await window.desktopApi.sync.enqueue({ type: 'DELETE', entity: 'appointment_prestazioni', entityId: prestazioneId, payload: { appuntamentoId: visit.appuntamentoId, prestazioneId } })
            setPrestazioniAppt(prev => prev.filter(p => p.prestazioneId !== prestazioneId))
        }
    }, [visit, isReadOnly])

    const handleUpdateScadenzaProtocollo = useCallback(async (scadenzaId: string, data: Partial<PatientScadenzaItem>) => {
        if (!window.desktopApi || isReadOnly) return
        await window.desktopApi.db.update({ table: 'scadenze', id: scadenzaId, data })
        await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'scadenze', entityId: scadenzaId, payload: data })
        setPatientScadenze(prev => prev.map(s => s.id === scadenzaId ? { ...s, ...data } : s))
    }, [isReadOnly])

    const handleBackRequest = useCallback(() => {
        if (hasChanges && !isReadOnly) {
            setShowExitDialog(true)
            return
        }
        navigate(backTarget)
    }, [hasChanges, isReadOnly, navigate, backTarget])

    const handleExitAction = useCallback(async (action: 'draft' | 'discard' | 'stay') => {
        if (action === 'stay') {
            setShowExitDialog(false)
            return
        }
        setExitActionLoading(true)
        try {
            if (action === 'draft') await doSave()
            setShowExitDialog(false)
            navigate(backTarget)
        } finally {
            setExitActionLoading(false)
        }
    }, [doSave, navigate, backTarget])

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
                                    {patient.gender && <span>{patient.gender === 'M' ? 'Maschio' : patient.gender === 'F' ? 'Femmina' : patient.gender}</span>}
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
                                onClick={handleDownloadPdf}
                                disabled={pdfGenerating}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 transition-colors"
                                title="Scarica PDF del referto della visita"
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
                                                                <button key={v.id} type="button" onClick={() => navigate(`/visite/${v.id}`, { state: { from: `/visite/${visit.id}` } })} className="w-full rounded-lg bg-white px-2 py-2 text-left hover:bg-purple-50">
                                                                    <span className="block font-medium text-gray-800">{v.prestazioneNome || 'Visita'}</span>
                                                                    <span className="text-[10px] text-gray-500">{v.dataOra ? new Date(v.dataOra).toLocaleDateString('it-IT') : 'Data non disponibile'} · {v.stato || '—'}</span>
                                                                </button>
                                                            ))}
                                                            <button type="button" onClick={() => setShowHistoryModal(true)} className="w-full rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700">Visualizza storico visite</button>
                                                            {patient && <button type="button" onClick={() => navigate(`/pazienti/${patient.id}`, { state: { from: `/visite/${visit.id}` } })} className="w-full text-purple-700 hover:underline">Apri cartella lavoratore</button>}
                                                        </div>
                                                    )}
                                                    {(action.id === 'laboratorio' || action.id === 'microbio') && (
                                                        <div className="space-y-2">
                                                            <p>{action.id === 'laboratorio' ? 'Carica esami di laboratorio dalla card Esami Strumentali.' : 'Carica esami microbiologici dalla card Esami Strumentali.'}</p>
                                                            {!isReadOnly && <button type="button" onClick={() => setLayoutMode('scroll')} className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"><Upload className="h-3 w-3" /> Apri inserimento esami</button>}
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
                            } : undefined}
                        />

                        {templateSectionLayout !== 'tabs' && (
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
                                    }] : [])).map(p => (
                                        <div key={p.prestazioneId} className="flex items-start justify-between gap-2">
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
                                    ))}
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
                            {!isReadOnly && (
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
                                        {patientScadenze.slice(0, 6).map(s => (
                                            <div key={s.id} className="rounded-xl border border-gray-100 p-2">
                                                <p className="text-xs font-medium text-gray-900">{s.prestazioneNome || 'Accertamento'}</p>
                                                <p className="text-[10px] text-gray-500">{s.mansione || 'Mansione non indicata'} · {s.dataScadenza ? new Date(s.dataScadenza).toLocaleDateString('it-IT') : 'Scadenza non impostata'}</p>
                                                <p className="text-[10px] text-gray-400">{s.periodicitaMesi ? `Periodicità: ogni ${s.periodicitaMesi} mesi` : 'Periodicità non impostata'} · {s.eseguita ? 'Eseguita' : (s.stato || 'Da programmare')}</p>
                                                {!isReadOnly && (
                                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={120}
                                                            value={s.periodicitaMesi || ''}
                                                            onChange={e => { void handleUpdateScadenzaProtocollo(s.id, { periodicitaMesi: e.target.value ? Number(e.target.value) : null }) }}
                                                            className="rounded-lg border border-gray-200 px-2 py-1 text-[11px]"
                                                            placeholder="Mesi"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={s.dataScadenza ? s.dataScadenza.split('T')[0] : ''}
                                                            onChange={e => { void handleUpdateScadenzaProtocollo(s.id, { dataScadenza: e.target.value ? new Date(e.target.value).toISOString() : null }) }}
                                                            className="rounded-lg border border-gray-200 px-2 py-1 text-[11px]"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
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
                        {layoutMode === 'tabs' && templateSectionLayout === 'tabs' && (
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
                                layoutMode === 'scroll' || templateSectionLayout !== 'tabs'
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <DatePickerElegante
                                                    label="Prossimo Controllo"
                                                    value={(formValues.prossimoControllo as string) || null}
                                                    onChange={(date) => updateField('prossimoControllo', date ? date.toISOString().split('T')[0] : '')}
                                                    disabled={isReadOnly}
                                                    clearable
                                                    placeholder="Seleziona data"
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
                            <button type="button" onClick={() => navigate(`/visite/${selectedHistoryVisit.id}`, { state: { from: `/visite/${visit.id}`, secondaryVisit: true } })} className="w-full rounded-xl bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700">
                              Apri visita completa
                            </button>
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
                            <select value={patientForm.gender} onChange={e => setPatientForm(prev => ({ ...prev, gender: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                <option value="">Non indicato</option>
                                <option value="M">Maschio</option>
                                <option value="F">Femmina</option>
                                <option value="MALE">Maschio</option>
                                <option value="FEMALE">Femmina</option>
                            </select>
                        </div>
                        <FormInput label="Titolo" value={patientForm.title} onChange={v => setPatientForm(prev => ({ ...prev, title: v }))} />
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Stato</label>
                            <select value={patientForm.status} onChange={e => setPatientForm(prev => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                                <option value="">Non indicato</option>
                                <option value="ACTIVE">Attivo</option>
                                <option value="INACTIVE">Non attivo</option>
                            </select>
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
                            <p className="text-sm text-gray-600">Hai modifiche non salvate. Come vuoi procedere?</p>
                        </div>
                    </div>
                    <div className="space-y-3 p-5">
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
                            onClick={() => handleExitAction('discard')}
                            disabled={exitActionLoading}
                            className="w-full flex items-center gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                        >
                            <div className="rounded-lg bg-red-100 p-3"><XCircle className="h-5 w-5 text-red-600" /></div>
                            <div>
                                <p className="font-medium text-gray-900">Annulla modifiche</p>
                                <p className="text-sm text-gray-500">Esce senza salvare le modifiche correnti</p>
                            </div>
                        </button>
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
                <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl overflow-hidden">
                    <div className="mb-4 flex items-center justify-between">
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
                    <div className="max-h-[65vh] overflow-y-auto p-5">
                        {healthTab === 'clinica' && (
                            <div className="grid grid-cols-3 gap-3">
                                <FormInput label="Peso (kg)" type="number" value={healthForm.peso} onChange={v => setHealthForm(prev => ({ ...prev, peso: v }))} />
                                <FormInput label="Altezza (cm)" type="number" value={healthForm.altezza} onChange={v => setHealthForm(prev => ({ ...prev, altezza: v }))} />
                                <FormInput label="Temperatura" type="number" value={healthForm.temperatura} onChange={v => setHealthForm(prev => ({ ...prev, temperatura: v }))} />
                                <FormInput label="PA sistolica" type="number" value={healthForm.paSistolica} onChange={v => setHealthForm(prev => ({ ...prev, paSistolica: v }))} />
                                <FormInput label="PA diastolica" type="number" value={healthForm.paDiastolica} onChange={v => setHealthForm(prev => ({ ...prev, paDiastolica: v }))} />
                                <FormInput label="FC" type="number" value={healthForm.fc} onChange={v => setHealthForm(prev => ({ ...prev, fc: v }))} />
                                <FormInput label="SpO2" type="number" value={healthForm.spo2} onChange={v => setHealthForm(prev => ({ ...prev, spo2: v }))} />
                                <FormInput label="Prossimo controllo" type="date" value={healthForm.prossimoControllo} onChange={v => setHealthForm(prev => ({ ...prev, prossimoControllo: v }))} />
                                <FormInput label="Periodicità mesi" type="number" value={healthForm.periodicitaMesi} onChange={v => setHealthForm(prev => ({ ...prev, periodicitaMesi: v }))} />
                                <CheckField label="Invalidità" checked={healthForm.hasInvalidita} onChange={v => setHealthForm(prev => ({ ...prev, hasInvalidita: v }))} />
                                <CheckField label="Legge 104" checked={healthForm.legge104} onChange={v => setHealthForm(prev => ({ ...prev, legge104: v }))} />
                                <FormInput label="Tipo invalidità" value={healthForm.tipoInvalidita} onChange={v => setHealthForm(prev => ({ ...prev, tipoInvalidita: v }))} />
                                <FormInput label="Grado invalidità civile (%)" type="number" value={healthForm.gradoInvaliditaCivile} onChange={v => setHealthForm(prev => ({ ...prev, gradoInvaliditaCivile: v }))} />
                                <CheckField label="Diabete" checked={healthForm.hasDiabete} onChange={v => setHealthForm(prev => ({ ...prev, hasDiabete: v }))} />
                                <CheckField label="Ipertensione" checked={healthForm.hasIpertensione} onChange={v => setHealthForm(prev => ({ ...prev, hasIpertensione: v }))} />
                                <CheckField label="Cardiopatie" checked={healthForm.hasCardiopatie} onChange={v => setHealthForm(prev => ({ ...prev, hasCardiopatie: v }))} />
                                <CheckField label="Asma" checked={healthForm.hasAsma} onChange={v => setHealthForm(prev => ({ ...prev, hasAsma: v }))} />
                                <CheckField label="Epilessia" checked={healthForm.hasEpilessia} onChange={v => setHealthForm(prev => ({ ...prev, hasEpilessia: v }))} />
                                <div className="col-span-3"><FormInput label="Farmaci" value={healthForm.farmaci} onChange={v => setHealthForm(prev => ({ ...prev, farmaci: v }))} /></div>
                                <div className="col-span-3"><FormInput label="Allergie farmaci" value={healthForm.allergieFarmaci} onChange={v => setHealthForm(prev => ({ ...prev, allergieFarmaci: v }))} /></div>
                                <div className="col-span-3"><FormInput label="Altre patologie" value={healthForm.altrePatologie} onChange={v => setHealthForm(prev => ({ ...prev, altrePatologie: v }))} /></div>
                            </div>
                        )}
                        {healthTab === 'abitudini' && (
                            <div className="grid grid-cols-3 gap-3">
                                <SelectField label="Fumatore" value={healthForm.fumatore} onChange={v => setHealthForm(prev => ({ ...prev, fumatore: v }))} options={['non_fumatore', 'ex_fumatore', 'fumatore']} />
                                <FormInput label="Sigarette/giorno" type="number" value={healthForm.sigaretteGiorno} onChange={v => setHealthForm(prev => ({ ...prev, sigaretteGiorno: v }))} />
                                <FormInput label="Anni fumo" type="number" value={healthForm.anniFumo} onChange={v => setHealthForm(prev => ({ ...prev, anniFumo: v }))} />
                                <SelectField label="Alcol" value={healthForm.alcol} onChange={v => setHealthForm(prev => ({ ...prev, alcol: v }))} options={['non_bevitore', 'occasionale', 'moderato', 'elevato']} />
                                <FormInput label="Unità/settimana" type="number" value={healthForm.unitaAlcolSettimana} onChange={v => setHealthForm(prev => ({ ...prev, unitaAlcolSettimana: v }))} />
                                <SelectField label="Attività fisica" value={healthForm.attivitaFisica} onChange={v => setHealthForm(prev => ({ ...prev, attivitaFisica: v }))} options={['nessuna', 'leggera', 'moderata', 'intensa']} />
                                <FormInput label="Ore attività/settimana" type="number" value={healthForm.oreAttivitaSettimana} onChange={v => setHealthForm(prev => ({ ...prev, oreAttivitaSettimana: v }))} />
                                <FormInput label="Alimentazione" value={healthForm.alimentazione} onChange={v => setHealthForm(prev => ({ ...prev, alimentazione: v }))} />
                                <FormInput label="Stato civile" value={healthForm.statoCivile} onChange={v => setHealthForm(prev => ({ ...prev, statoCivile: v }))} />
                                <FormInput label="Numero figli" type="number" value={healthForm.numeroFigli} onChange={v => setHealthForm(prev => ({ ...prev, numeroFigli: v }))} />
                                <FormInput label="Professione" value={healthForm.professione} onChange={v => setHealthForm(prev => ({ ...prev, professione: v }))} />
                                <SelectField label="Qualità sonno" value={healthForm.qualitaSonno} onChange={v => setHealthForm(prev => ({ ...prev, qualitaSonno: v }))} options={['buona', 'discreta', 'scarsa']} />
                                <FormInput label="Ore sonno/notte" type="number" value={healthForm.oreSonnoNotte} onChange={v => setHealthForm(prev => ({ ...prev, oreSonnoNotte: v }))} />
                                <CheckField label="Sonnolenza diurna" checked={healthForm.sonnolenzaDiurna} onChange={v => setHealthForm(prev => ({ ...prev, sonnolenzaDiurna: v }))} />
                                <CheckField label="Apnea notturna" checked={healthForm.apneaNotturna} onChange={v => setHealthForm(prev => ({ ...prev, apneaNotturna: v }))} />
                                <div className="col-span-3"><FormInput label="Note salute" value={healthForm.noteSalute} onChange={v => setHealthForm(prev => ({ ...prev, noteSalute: v }))} /></div>
                            </div>
                        )}
                        {healthTab === 'dpi' && (
                            <div className="grid grid-cols-2 gap-3">
                                <CheckField label="Usa DPI personali" checked={healthForm.usaDpiPersonali} onChange={v => setHealthForm(prev => ({ ...prev, usaDpiPersonali: v }))} />
                                <CheckField label="Usa mezzi aziendali" checked={healthForm.usaMezziAziendali} onChange={v => setHealthForm(prev => ({ ...prev, usaMezziAziendali: v }))} />
                                <FormInput label="DPI personali" value={healthForm.dpiPersonali} onChange={v => setHealthForm(prev => ({ ...prev, dpiPersonali: v }))} />
                                <FormInput label="DPI azienda" value={healthForm.dpiAzienda} onChange={v => setHealthForm(prev => ({ ...prev, dpiAzienda: v }))} />
                                <FormInput label="Mezzi aziendali" value={healthForm.mezziAziendali} onChange={v => setHealthForm(prev => ({ ...prev, mezziAziendali: v }))} />
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
                                <FormInput label="Scadenza CQC" type="date" value={healthForm.cqcScadenza} onChange={v => setHealthForm(prev => ({ ...prev, cqcScadenza: v }))} />
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
                    <select
                        value={strVal}
                        onChange={(e) => onChange(field.name, e.target.value)}
                        disabled={readOnly}
                        className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''}`}
                    >
                        <option value="">{field.placeholder || '— Seleziona —'}</option>
                        {opts.map((opt, i) => {
                            const optVal = typeof opt === 'string' ? opt : opt.value
                            const optLabel = typeof opt === 'string' ? opt : opt.label
                            return <option key={i} value={optVal}>{optLabel}</option>
                        })}
                    </select>
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
            // VITALS is handled by static section fallback and inline form fields
            return (
                <FormTextArea
                    label={field.label}
                    value={strVal}
                    onChange={(v) => onChange(field.name, v)}
                    placeholder={field.placeholder || 'Parametri vitali...'}
                    readOnly={readOnly}
                    rows={2}
                />
            )
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
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
                type={type}
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
            <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="">Non indicato</option>
                {options.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select>
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
