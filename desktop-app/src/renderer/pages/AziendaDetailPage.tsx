import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  Building2,
  ArrowLeft,
  Save,
  MapPin,
  Phone,
  Mail,
  FileText,
  Users,
  Globe,
  StickyNote,
  UserPlus,
  Receipt,
  Euro,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Stethoscope,
  ClipboardCheck,
  Briefcase,
  CalendarPlus,
  UserCheck,
  FileSignature,
  ClipboardList,
  FolderOpen,
  FileDown,
  Eye,
  ChevronDown,
  Upload
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useDesktopPermission } from '../hooks/useDesktopPermission'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { formatProtocolloPeriodicity, normalizeProtocolloPrestazioni, type PrestazioneProtocollo, type ProtocolloPrestazioneRow } from '../utils/protocolloSanitario'
import { ElegantDateInput, ElegantSelect, ElegantTimeInput } from '../components/ElegantControls'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4001'

interface Azienda {
  id: string
  ragioneSociale: string | null
  piva: string | null
  codiceFiscale: string | null
  codiceAteco: string | null
  settore: string | null
  sedeLegaleIndirizzo: string | null
  sedeLegaleCitta: string | null
  sedeLegaleCap: string | null
  sedeLegaleProvincia: string | null
  emailGenerale: string | null
  telefonoGenerale: string | null
  pec: string | null
  sdi: string | null
  status: string | null
  noteCommerciali: string | null
  noteOperative: string | null
  noteInterne: string | null
  tenantId?: string | null
  medicoCompetenteId?: string | null
  medicoCompetenteNome?: string | null
  rsppId?: string | null
  rsppNome?: string | null
  medicoSuccessoreId?: string | null
  medicoSuccessoreNome?: string | null
  ultimoSopralluogo?: string | null
  prossimoSopralluogo?: string | null
  dvr?: string | null
}

interface CompanySite {
  id: string
  siteName: string | null
  indirizzo: string | null
  citta: string | null
  cap: string | null
  provincia: string | null
  medicoCompetenteId?: string | null
  rsppId?: string | null
  referenteId?: string | null
  dvr?: string | null
  ultimoSopralluogo?: string | null
  prossimoSopralluogo?: string | null
}

interface Lavoratore {
  id: string
  firstName: string | null
  lastName: string | null
  taxCode: string | null
  protocolloSanitarioId: string | null
}

interface LavoratoreMansione {
  personId: string
  mansioneId: string | null
}

interface Mansione {
  id: string
  nome: string | null
  descrizione: string | null
}

interface Protocollo {
  id: string
  nome: string | null
  descrizione: string | null
  mansioneNome: string | null
  mansioneId: string | null
  companyTenantProfileId: string | null
  isActive: number
}

interface VoceTariffario {
  id?: string
  tariffarioAziendaleId?: string
  prestazioneId?: string | null
  nome: string | null
  tipo: string
  prezzoBase: number
  durataMinimaMinuti?: number | null
  unitaCalcolo?: string | null
  categoriaVisita: string | null
  attivo: boolean | number
}

interface Tariffario {
  id: string
  codice: string | null
  nome: string | null
  descrizione: string | null
  attivo: number
  validoDa: string | null
  validoA: string | null
}

interface TariffarioCompanyAssociation {
  id: string
  tariffarioId: string
  companyTenantProfileId: string
  validoDa?: string | null
  validoA?: string | null
  attivo: number
  note?: string | null
}

interface NominaRuolo {
  id: string
  tenantId?: string | null
  companyTenantProfileId: string | null
  siteId?: string | null
  personId: string | null
  tipoRuolo: string | null
  stato: string | null
  dataInizio?: string | null
  dataFine?: string | null
  dataScadenza?: string | null
  note?: string | null
  firstName?: string | null
  lastName?: string | null
  nome?: string | null
}

interface MovimentoContabile {
  id: string
  tipo: string | null
  descrizione: string | null
  importo: number
  iva: number
  importoNetto: number
  stato: string | null
  dataMovimento: string | null
  dataScadenza: string | null
  dataPagamento: string | null
  metodoPagamento: string | null
  riferimentoFattura: string | null
  note: string | null
  visitaId: string | null
  personId: string | null
  appuntamentoId?: string | null
}

interface Scadenza {
  id: string
  personId: string | null
  prestazioneId: string | null
  personFirstName: string | null
  personLastName: string | null
  prestazioneNome: string | null
  mansione: string | null
  dataScadenza: string | null
  periodicitaMesi: number | null
  stato: string | null
  eseguita: number | null
}

interface BookingState {
  worker: Lavoratore
  scadenza?: Scadenza
  date: string
  time: string
  durata: number
  medicoId: string
  ambulatorioId: string
  siteId: string
  tipoVisitaMDL: string
  prestazioneId: string
  selectedAccertamenti: string[]
  note: string
}

interface CompanyVisit {
  id: string
  personId: string | null
  dataOra: string | null
  prestazioneNome: string | null
  stato: string | null
}

interface AllegatoAzienda {
  id: string
  nome: string
  tipo: string | null
  dimensione: number | null
  serverUrl: string | null
  localPath: string | null
  createdAt: string | null
}

interface SopralluogoRow {
  id: string
  siteId: string | null
  esecutoreId: string | null
  dataEsecuzione: string | null
  dataProssimoSopralluogo: string | null
  valutazione: string | null
  esito: string | null
  note: string | null
  documentoUrl: string | null
  documentoNome: string | null
}

interface DvrRow {
  id: string
  siteId: string | null
  effettuatoDa: string | null
  dataEsecuzione: string | null
  dataScadenza: string | null
  rischiRilevati: string | null
  note: string | null
  tipoDVR: string | null
  documentoUrl: string | null
  documentoNome: string | null
}

interface ConsulenzaMdlRow {
  id: string
  siteId: string | null
  professionistaId: string | null
  data: string | null
  durataMinuti: number | null
  oggetto: string | null
  note: string | null
  importo: number | null
  stato: string | null
}

interface Allegato3BRow {
  id: string
  medicoCompetenteId: string
  companyTenantProfileId: string
  anno: number
  stato: string | null
  totLavoratoriSorvegliati: number | null
  totVisiteEffettuate: number | null
  totGiudiziIdoneita: number | null
  dataCompilazione: string | null
  dataInvio: string | null
  protocolloInvio: string | null
  note: string | null
}

interface MedicoOption {
  id: string
  firstName: string | null
  lastName: string | null
  gender?: string | null
  specializzazione?: string | null
  roleTypes?: string | null
}

interface AmbulatorioOption {
  id: string
  nome: string | null
}

interface SlotDisponibilitaRow {
  id: string
  ambulatorioId: string | null
  medicoId: string | null
  appuntamentoId: string | null
  data: string
  oraInizio: string
  oraFine: string
  stato: string | null
  disponibile: number | boolean | null
  durataSlotMinuti?: number | null
}

interface ExistingAppointmentSlot {
  id: string
  _localId?: string | null
  _serverId?: string | null
  personId?: string | null
  medicoId: string | null
  ambulatorioId: string | null
  dataOra: string | null
  durata: number | null
  tipo?: string | null
  stato?: string | null
  noteInterne?: string | null
  prestazioneNome?: string | null
  personFirstName: string | null
  personLastName: string | null
}

const STATO_MOV_LABELS: Record<string, { label: string; cls: string }> = {
  BOZZA: { label: 'Bozza', cls: 'bg-gray-100 text-gray-600' },
  DA_FATTURARE: { label: 'Da fatturare', cls: 'bg-amber-100 text-amber-700' },
  FATTURATO: { label: 'Fatturato', cls: 'bg-blue-100 text-blue-700' },
  PAGATO: { label: 'Pagato', cls: 'bg-green-100 text-green-700' },
  ANNULLATO: { label: 'Annullato', cls: 'bg-red-100 text-red-600' },
}

const DVR_RISK_GROUPS = [
  { group: 'Fisici', items: ['Rumore', 'Vibrazioni', 'Microclima', 'Radiazioni ottiche artificiali', 'Campi elettromagnetici'] },
  { group: 'Chimici', items: ['Agenti chimici', 'Cancerogeni', 'Polveri', 'Amianto'] },
  { group: 'Biologici', items: ['Agenti biologici', 'Rischio infettivo', 'Punture e tagli'] },
  { group: 'Ergonomici', items: ['Movimentazione carichi', 'Movimenti ripetitivi', 'Posture incongrue', 'Videoterminali'] },
  { group: 'Organizzativi', items: ['Stress lavoro-correlato', 'Lavoro notturno', 'Lavoro isolato'] },
  { group: 'Sicurezza', items: ['Incendio', 'Macchine e attrezzature', 'Elettrico', 'Caduta dall alto'] },
]

const TIME_ROWS = Array.from({ length: 73 }, (_, idx) => {
  const mins = 7 * 60 + idx * 10
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
})

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function timeToMinutes(time: string | null | undefined): number {
  if (!time) return 0
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

function parseRoleTypes(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(item => String(item)).filter(Boolean) : []
  } catch {
    return []
  }
}

const emptyOption = (label: string): { value: string; label: string } => ({ value: '', label })

const formatMedicoLabel = (m: MedicoOption): string =>
  [m.lastName, m.firstName].filter(Boolean).join(' ') || m.id

const documentGroupStyle = (tipo: string): { bg: string; text: string; border: string; icon: string } => {
  if (tipo.includes('DVR')) return { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100', icon: 'bg-violet-600' }
  if (tipo.includes('SOPRALLUOGO')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: 'bg-blue-600' }
  if (tipo.includes('RIUNIONE')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'bg-amber-600' }
  if (tipo.includes('RISULTATI')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: 'bg-emerald-600' }
  return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', icon: 'bg-gray-500' }
}

export function AziendaDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const permissions = useDesktopPermission()
  const { accessToken } = useDesktopAuth()
  const [azienda, setAzienda] = useState<Azienda | null>(null)
  const [sites, setSites] = useState<CompanySite[]>([])
  const [lavoratori, setLavoratori] = useState<Lavoratore[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const initialTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'dati' | 'sicurezza' | 'movimenti' | 'documenti'>(
    initialTab === 'sicurezza' || initialTab === 'movimenti' || initialTab === 'documenti' ? initialTab : 'dati'
  )
  const [movimentiTab, setMovimentiTab] = useState<'tutti' | 'bozza' | 'da_fatturare' | 'fatturato' | 'pagato'>('tutti')
  const [tariffari, setTariffari] = useState<Tariffario[]>([])
  const [allTariffariCatalog, setAllTariffariCatalog] = useState<Tariffario[]>([])
  const [tariffarioVoci, setTariffarioVoci] = useState<VoceTariffario[]>([])
  const [nomineRuolo, setNomineRuolo] = useState<NominaRuolo[]>([])
  const [movimenti, setMovimenti] = useState<MovimentoContabile[]>([])
  const [protocolli, setProtocolli] = useState<Protocollo[]>([])
  const [protocolloPrestazioni, setProtocolloPrestazioni] = useState<Map<string, ProtocolloPrestazioneRow[]>>(new Map())
  const [lavoratoriMansioni, setLavoratoriMansioni] = useState<LavoratoreMansione[]>([])
  const [mansioniCatalog, setMansioniCatalog] = useState<Mansione[]>([])
  const [scadenze, setScadenze] = useState<Scadenza[]>([])
  const [companyVisits, setCompanyVisits] = useState<CompanyVisit[]>([])
  const [documenti, setDocumenti] = useState<AllegatoAzienda[]>([])
  const [sopralluoghiRows, setSopralluoghiRows] = useState<SopralluogoRow[]>([])
  const [dvrRows, setDvrRows] = useState<DvrRow[]>([])
  const [consulenzeRows, setConsulenzeRows] = useState<ConsulenzaMdlRow[]>([])
  const [allegati3BRows, setAllegati3BRows] = useState<Allegato3BRow[]>([])
  const [mediciCatalog, setMediciCatalog] = useState<MedicoOption[]>([])
  const [ambulatoriCatalog, setAmbulatoriCatalog] = useState<AmbulatorioOption[]>([])
  const [slotDisponibilitaRows, setSlotDisponibilitaRows] = useState<SlotDisponibilitaRow[]>([])
  const [existingAppointmentSlots, setExistingAppointmentSlots] = useState<ExistingAppointmentSlot[]>([])
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null)
  const [mdlServicesCollapsed, setMdlServicesCollapsed] = useState(false)
  const [expandedMdlSections, setExpandedMdlSections] = useState<Record<string, boolean>>({
    nomine: true,
    dvr: true,
    sopralluoghi: true,
    consulenze: true,
    tariffario: true,
    documentiPeriodici: true,
  })
  const [expandedDocumentGroups, setExpandedDocumentGroups] = useState<Record<string, boolean>>({})
  const [companyAction, setCompanyAction] = useState<{ label: string; type: string } | null>(null)
  const [companyActionAttachment, setCompanyActionAttachment] = useState<File | null>(null)
  const [nominaAttachment, setNominaAttachment] = useState<File | null>(null)
  const [consulenzaImportoAutocalc, setConsulenzaImportoAutocalc] = useState(true)
  const [companyActionForm, setCompanyActionForm] = useState({
    periodoDa: `${new Date().getFullYear()}-01-01`,
    periodoA: new Date().toISOString().slice(0, 10),
    data: new Date().toISOString().slice(0, 10),
    oraInizio: '09:00',
    oraFine: '10:00',
    siteId: '',
    esecutore: '',
    tipoDvr: 'NUOVO',
    anno: String(new Date().getFullYear()),
    categoriaEsecutore: 'MC',
    tipoSopralluogo: 'ORDINARIO',
    statoSopralluogo: 'PROGRAMMATO',
    prescrizioniNote: '',
    dataRedazione: new Date().toISOString().slice(0, 10),
    dataScadenza: '',
    numeroRevisione: '1',
    rischiValutati: [] as string[],
    durataMinuti: '60',
    importo: '',
    oggetto: '',
    modalitaConsulenza: 'IN_PRESENZA',
    referenteAziendale: '',
    descrizioneAttivita: '',
    note: '',
  })
  const [nominaModalOpen, setNominaModalOpen] = useState(false)
  const [tariffarioModalOpen, setTariffarioModalOpen] = useState(false)
  const [tariffarioSaving, setTariffarioSaving] = useState(false)
  const [tariffarioError, setTariffarioError] = useState<string | null>(null)
  const [tariffarioForm, setTariffarioForm] = useState({
    tariffarioId: '',
    validoDa: new Date().toISOString().slice(0, 10),
    validoA: '',
    note: '',
  })
  const [nominaForm, setNominaForm] = useState({
    tipoRuolo: 'MEDICO_COMPETENTE',
    personId: '',
    siteId: '',
    dataInizio: new Date().toISOString().slice(0, 10),
    dataScadenza: '',
    note: '',
  })
  const [nominaSaving, setNominaSaving] = useState(false)
  const [nominaError, setNominaError] = useState<string | null>(null)
  const [expandedAccertamenti, setExpandedAccertamenti] = useState<Record<string, boolean>>({})
  const [booking, setBooking] = useState<BookingState | null>(null)
  const [bookingWeekStart, setBookingWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [bookingActivePersonSelected, setBookingActivePersonSelected] = useState(true)
  const [bookingTimeRange, setBookingTimeRange] = useState<'all' | 'morning' | 'afternoon'>('all')
  const [directVisit, setDirectVisit] = useState<BookingState | null>(null)
  const [bookingSaving, setBookingSaving] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const canViewBilling = permissions.canReadCompanyBilling()
  const companyBackTarget = (location.state as { from?: string } | null)?.from || '/aziende'
  const currentRoute = `/aziende/${id}?tab=${activeTab}`
  const medicalProfessionalOptions = useMemo(
    () => mediciCatalog.filter(m => {
      const roles = parseRoleTypes(m.roleTypes)
      return roles.length === 0 || roles.some(role => ['MEDICO', 'MEDICO_COMPETENTE'].includes(role))
    }),
    [mediciCatalog]
  )
  const effectiveMedicalProfessionals = medicalProfessionalOptions.length > 0 ? medicalProfessionalOptions : mediciCatalog
  const safetyProfessionalOptions = useMemo(
    () => mediciCatalog.filter(m => {
      const roles = parseRoleTypes(m.roleTypes)
      return roles.length === 0 || roles.some(role => ['RSPP', 'ASPP', 'CONSULENTE_SICUREZZA', 'TECNICO_SICUREZZA', 'MEDICO_COMPETENTE'].includes(role))
    }),
    [mediciCatalog]
  )
  const effectiveSafetyProfessionals = safetyProfessionalOptions.length > 0 ? safetyProfessionalOptions : mediciCatalog
  const rsppOptions = useMemo(
    () => mediciCatalog.filter(m => {
      const roles = parseRoleTypes(m.roleTypes)
      return roles.length === 0 || roles.some(role => ['RSPP', 'ASPP', 'CONSULENTE_SICUREZZA', 'TECNICO_SICUREZZA'].includes(role))
    }),
    [mediciCatalog]
  )
  const effectiveRsppOptions = rsppOptions.length > 0 ? rsppOptions : mediciCatalog
  const nominaCandidates = nominaForm.tipoRuolo === 'RSPP' ? effectiveRsppOptions : effectiveMedicalProfessionals
  const siteSelectOptions = [
    emptyOption('Sede non indicata'),
    ...sites.map(s => ({ value: s.id, label: s.siteName || [s.indirizzo, s.citta].filter(Boolean).join(' - ') || 'Sede' })),
  ]
  const allSitesSelectOptions = [
    emptyOption('Tutte le sedi'),
    ...sites.map(s => ({ value: s.id, label: s.siteName || [s.indirizzo, s.citta].filter(Boolean).join(' - ') || 'Sede' })),
  ]
  const medicalSelectOptions = [
    emptyOption('Da nomina aziendale'),
    ...effectiveMedicalProfessionals.map(m => ({ value: m.id, label: formatMedicoLabel(m) })),
  ]
  const safetySelectOptions = [
    emptyOption('Non indicato'),
    ...effectiveSafetyProfessionals.map(m => ({ value: m.id, label: formatMedicoLabel(m) })),
  ]
  const rsppSelectOptions = [
    emptyOption('Non indicato'),
    ...effectiveRsppOptions.map(m => ({ value: m.id, label: formatMedicoLabel(m) })),
  ]
  const ambulatorioSelectOptions = [
    emptyOption('Non indicato'),
    ...ambulatoriCatalog.map(a => ({ value: a.id, label: a.nome || 'Ambulatorio' })),
  ]
  const visitTypeOptions = [
    { value: 'PREVENTIVA', label: 'Preventiva' },
    { value: 'PREVENTIVA_PREASSUNTIVA', label: 'Preventiva preassuntiva' },
    { value: 'PERIODICA', label: 'Periodica' },
    { value: 'STRAORDINARIA', label: 'Straordinaria' },
    { value: 'CAMBIO_MANSIONE', label: 'Cambio mansione' },
    { value: 'PRECEDENTE_ASSENZA', label: 'Precedente assenza' },
    { value: 'SU_RICHIESTA_LAVORATORE', label: 'Su richiesta lavoratore' },
    { value: 'CESSAZIONE_RAPPORTO', label: 'Cessazione rapporto' },
  ]

  // Site management state
  const [showAddSite, setShowAddSite] = useState(false)
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null)
  const [siteForm, setSiteForm] = useState({ siteName: '', indirizzo: '', citta: '', cap: '', provincia: '' })
  const [savingSite, setSavingSite] = useState(false)
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null)
  const deletingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Editable fields
  const [noteCommerciali, setNoteCommerciali] = useState('')
  const [noteOperative, setNoteOperative] = useState('')
  const [noteInterne, setNoteInterne] = useState('')

  const loadData = useCallback(async () => {
    if (!id || !window.desktopApi) return
    setLoading(true)
    try {
      const [companyRows, siteRows, workerRows] = await Promise.all([
        window.desktopApi.db.query({
          table: 'companies',
          where: { id, _isDeleted: 0 },
          limit: 1
        }),
        window.desktopApi.db.query({
          table: 'company_sites',
          where: { companyTenantProfileId: id, _isDeleted: 0 }
        }),
        window.desktopApi.db.query({
          table: 'patients',
          where: { companyTenantProfileId: id, _isDeleted: 0 },
          orderBy: { column: 'lastName', direction: 'ASC' }
        })
      ])

      const rows = companyRows as Azienda[]
      if (rows.length > 0) {
        const c = rows[0]
        setAzienda(c)
        setNoteCommerciali(c.noteCommerciali || '')
        setNoteOperative(c.noteOperative || '')
        setNoteInterne(c.noteInterne || '')
      }
      setSites(siteRows as CompanySite[])
      const companyWorkers = workerRows as Lavoratore[]
      setLavoratori(companyWorkers)

      const nomineRows = await window.desktopApi.db.query({
        table: 'nomine_ruolo',
        where: { companyTenantProfileId: id, _isDeleted: 0 },
        orderBy: { column: 'dataInizio', direction: 'DESC' }
      }).catch(() => []) as NominaRuolo[]
      setNomineRuolo(nomineRows)

      const workerIds = new Set(companyWorkers.map(w => w.id))
      const allMansioniRows = await window.desktopApi.db.query({
        table: 'lavoratore_mansioni',
        where: { _isDeleted: 0 }
      }) as LavoratoreMansione[]
      const mansioniRows = await window.desktopApi.db.query({
        table: 'mansioni',
        where: { _isDeleted: 0 },
        orderBy: { column: 'nome', direction: 'ASC' }
      }) as Mansione[]
      setMansioniCatalog(mansioniRows)
      const companyMansioni = allMansioniRows.filter(m => workerIds.has(m.personId))
      setLavoratoriMansioni(companyMansioni)

      const workerMansioneIds = new Set(companyMansioni.map(m => m.mansioneId).filter(Boolean))
      const workerProtocolloIds = new Set(companyWorkers.map(w => w.protocolloSanitarioId).filter(Boolean))
      const workerIdList = Array.from(workerIds)
      const allProtocolli = await window.desktopApi.db.query({
        table: 'protocolli',
        where: { _isDeleted: 0 },
        orderBy: { column: 'nome', direction: 'ASC' }
      }) as Protocollo[]
      const linkedProtocolli = allProtocolli.filter(p =>
        p.companyTenantProfileId === id ||
        (p.id && workerProtocolloIds.has(p.id)) ||
        (p.mansioneId && workerMansioneIds.has(p.mansioneId))
      )
      setProtocolli(linkedProtocolli)
      const linkedProtocolloIds = new Set(linkedProtocolli.map(p => p.id))
      const protocolloPrestazioniRows = await window.desktopApi.db.query({
        table: 'protocollo_prestazioni',
        where: { _isDeleted: 0 }
      }).catch(() => []) as Array<ProtocolloPrestazioneRow & { protocolloId: string }>
      const groupedProtocolloPrestazioni = new Map<string, ProtocolloPrestazioneRow[]>()
      for (const row of protocolloPrestazioniRows) {
        if (!linkedProtocolloIds.has(row.protocolloId)) continue
        const rows = groupedProtocolloPrestazioni.get(row.protocolloId) || []
        rows.push(row)
        groupedProtocolloPrestazioni.set(row.protocolloId, rows)
      }
      setProtocolloPrestazioni(groupedProtocolloPrestazioni)

      const allScadenze = await window.desktopApi.db.query({
        table: 'scadenze',
        where: { _isDeleted: 0 },
        orderBy: { column: 'dataScadenza', direction: 'ASC' }
      }) as Scadenza[]
      setScadenze(allScadenze.filter(s => !!s.personId && workerIdList.includes(s.personId)))

      const allVisits = await window.desktopApi.db.query({
        table: 'visits',
        where: { _isDeleted: 0 },
        orderBy: { column: 'dataOra', direction: 'DESC' }
      }) as CompanyVisit[]
      setCompanyVisits(allVisits.filter(v => !!v.personId && workerIdList.includes(v.personId)))

      const [slotRows, appointmentSlotRows] = await Promise.all([
        window.desktopApi.db.query({
          table: 'slot_disponibilita',
          where: { _isDeleted: 0 },
          orderBy: { column: 'data', direction: 'ASC' }
        }).catch(() => []) as Promise<SlotDisponibilitaRow[]>,
        window.desktopApi.db.query({
          table: 'appointments',
          where: { _isDeleted: 0 },
          orderBy: { column: 'dataOra', direction: 'ASC' }
        }).catch(() => []) as Promise<ExistingAppointmentSlot[]>,
      ])
      setSlotDisponibilitaRows(slotRows)
      setExistingAppointmentSlots(appointmentSlotRows)

      // Load tariffari associated with this company through dedicated local tables.
      const [allTariffari, allTariffarioAssociations, allTariffarioVoci] = await Promise.all([
        window.desktopApi.db.query({
        table: 'tariffari',
        where: { _isDeleted: 0 }
        }),
        window.desktopApi.db.query({
          table: 'tariffario_company_associations',
          where: { companyTenantProfileId: id, _isDeleted: 0 }
        }).catch(() => []) as Promise<TariffarioCompanyAssociation[]>,
        window.desktopApi.db.query({
          table: 'tariffario_voci',
          where: { _isDeleted: 0 },
          orderBy: { column: 'ordine', direction: 'ASC' }
        }).catch(() => []) as Promise<VoceTariffario[]>,
      ])
      const linkedTariffarioIds = new Set((allTariffarioAssociations as TariffarioCompanyAssociation[])
        .filter(a => a.attivo !== 0)
        .map(a => a.tariffarioId))
      setAllTariffariCatalog(allTariffari as Tariffario[])
      const linkedTariffari = (allTariffari as Tariffario[]).filter(t => linkedTariffarioIds.has(t.id))
      setTariffari(linkedTariffari)
      setTariffarioVoci((allTariffarioVoci as VoceTariffario[]).filter(v => !!v.tariffarioAziendaleId && linkedTariffarioIds.has(v.tariffarioAziendaleId)))

      // Load movimenti contabili for this company
      const movimentiRows = await window.desktopApi.db.query({
        table: 'movimenti_contabili',
        where: { companyTenantProfileId: id, _isDeleted: 0 },
        orderBy: { column: 'dataMovimento', direction: 'DESC' }
      })
      setMovimenti(movimentiRows as MovimentoContabile[])

      const companySiteIds = (siteRows as CompanySite[]).map(s => s.id)
      const [sopralluoghiLocal, dvrLocal, consulenzeLocal, allegati3BLocal] = await Promise.all([
        window.desktopApi.db.query({ table: 'sopralluoghi', where: { _isDeleted: 0 }, orderBy: { column: 'dataEsecuzione', direction: 'DESC' } }).catch(() => []) as Promise<SopralluogoRow[]>,
        window.desktopApi.db.query({ table: 'dvr', where: { _isDeleted: 0 }, orderBy: { column: 'dataEsecuzione', direction: 'DESC' } }).catch(() => []) as Promise<DvrRow[]>,
        window.desktopApi.db.query({ table: 'consulenze_mdl', where: { companyTenantProfileId: id, _isDeleted: 0 }, orderBy: { column: 'data', direction: 'DESC' } }).catch(() => []) as Promise<ConsulenzaMdlRow[]>,
        window.desktopApi.db.query({ table: 'allegati_3b', where: { companyTenantProfileId: id, _isDeleted: 0 }, orderBy: { column: 'anno', direction: 'DESC' } }).catch(() => []) as Promise<Allegato3BRow[]>,
      ])
      setSopralluoghiRows(sopralluoghiLocal.filter(s => !!s.siteId && companySiteIds.includes(s.siteId)))
      setDvrRows(dvrLocal.filter(d => !!d.siteId && companySiteIds.includes(d.siteId)))
      setConsulenzeRows(consulenzeLocal)
      setAllegati3BRows(allegati3BLocal)

      const documentRows = await window.desktopApi.db.query({
        table: 'allegati',
        where: { companyTenantProfileId: id, _isDeleted: 0 },
        orderBy: { column: 'createdAt', direction: 'DESC' }
      }) as AllegatoAzienda[]
      setDocumenti([...documentRows].sort((a, b) =>
        String(a.tipo || '').localeCompare(String(b.tipo || ''), 'it') ||
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      ))

      const [mediciRows, ambulatoriRows] = await Promise.all([
        window.desktopApi.db.query({ table: 'medici', where: { _isDeleted: 0 }, orderBy: { column: 'lastName', direction: 'ASC' } }).catch(() => []) as Promise<MedicoOption[]>,
        window.desktopApi.db.query({ table: 'ambulatori', where: { _isDeleted: 0 }, orderBy: { column: 'nome', direction: 'ASC' } }).catch(() => []) as Promise<AmbulatorioOption[]>,
      ])
      setMediciCatalog(mediciRows)
      setAmbulatoriCatalog(ambulatoriRows)
    } catch {
      // silent
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!id) return
    setMdlServicesCollapsed(localStorage.getItem(`desktop-mdl-services-collapsed-${id}`) === 'true')
  }, [id])

  useEffect(() => {
    if (!id) return
    localStorage.setItem(`desktop-mdl-services-collapsed-${id}`, String(mdlServicesCollapsed))
  }, [id, mdlServicesCollapsed])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'sicurezza' || tab === 'movimenti' || tab === 'documenti') setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (!canViewBilling && activeTab === 'movimenti') setActiveTab('dati')
  }, [activeTab, canViewBilling])

  const handleSave = async (): Promise<void> => {
    if (!id || !azienda) return
    if (!permissions.canUpdateAziende()) return
    setSaving(true)
    setSaveError(null)
    try {
      const updateData = {
        noteCommerciali,
        noteOperative,
        noteInterne
      }

      await window.desktopApi.db.update({
        table: 'companies',
        id,
        data: updateData
      })

      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'companies',
        entityId: id,
        payload: updateData
      })

      setDirty(false)
    } catch {
      setSaveError('Errore nel salvataggio. Riprova.')
    }
    setSaving(false)
  }

  const handleStartEditSite = (site: CompanySite): void => {
    if (!permissions.canUpdateAziende()) return
    setEditingSiteId(site.id)
    setSiteForm({
      siteName: site.siteName || '',
      indirizzo: site.indirizzo || '',
      citta: site.citta || '',
      cap: site.cap || '',
      provincia: site.provincia || ''
    })
  }

  const handleCancelSiteEdit = (): void => {
    setEditingSiteId(null)
    setShowAddSite(false)
    setSiteForm({ siteName: '', indirizzo: '', citta: '', cap: '', provincia: '' })
  }

  const handleSaveSite = async (): Promise<void> => {
    if (!id || !siteForm.siteName.trim()) return
    if (!permissions.canUpdateAziende()) return
    setSavingSite(true)
    try {
      if (editingSiteId) {
        // UPDATE existing site
        await window.desktopApi.db.update({
          table: 'company_sites',
          id: editingSiteId,
          data: { siteName: siteForm.siteName, indirizzo: siteForm.indirizzo, citta: siteForm.citta, cap: siteForm.cap, provincia: siteForm.provincia }
        })
        await window.desktopApi.sync.enqueue({
          type: 'UPDATE',
          entity: 'companySite',
          entityId: editingSiteId,
          payload: { siteName: siteForm.siteName, indirizzo: siteForm.indirizzo, citta: siteForm.citta, cap: siteForm.cap, provincia: siteForm.provincia }
        })
        setSites(prev => prev.map(s => s.id === editingSiteId ? { ...s, ...siteForm } : s))
        setEditingSiteId(null)
      } else {
        // CREATE new site
        const newId = uuidv4()
        const now = new Date().toISOString()
        await window.desktopApi.db.insert({
          table: 'company_sites',
          data: {
            id: newId,
            companyTenantProfileId: id,
            siteName: siteForm.siteName,
            indirizzo: siteForm.indirizzo,
            citta: siteForm.citta,
            cap: siteForm.cap,
            provincia: siteForm.provincia,
            _syncStatus: 'pending',
            _isDeleted: 0,
            createdAt: now,
            updatedAt: now
          }
        })
        await window.desktopApi.sync.enqueue({
          type: 'CREATE',
          entity: 'companySite',
          entityId: newId,
          payload: {
            id: newId,
            companyTenantProfileId: id,
            siteName: siteForm.siteName,
            indirizzo: siteForm.indirizzo,
            citta: siteForm.citta,
            cap: siteForm.cap,
            provincia: siteForm.provincia
          }
        })
        setSites(prev => [...prev, { id: newId, ...siteForm }])
        setShowAddSite(false)
      }
      setSiteForm({ siteName: '', indirizzo: '', citta: '', cap: '', provincia: '' })
    } catch {
      // silent — the local state already reflects the change optimistically on UPDATE
    }
    setSavingSite(false)
  }

  const handleDeleteSite = async (siteId: string): Promise<void> => {
    if (!permissions.canUpdateAziende()) return
    if (deletingSiteId !== siteId) {
      // First click: ask for confirmation
      setDeletingSiteId(siteId)
      if (deletingTimerRef.current) clearTimeout(deletingTimerRef.current)
      deletingTimerRef.current = setTimeout(() => setDeletingSiteId(null), 4000)
      return
    }
    // Second click: confirmed delete
    setDeletingSiteId(null)
    if (deletingTimerRef.current) clearTimeout(deletingTimerRef.current)
    try {
      await window.desktopApi.db.softDelete({ table: 'company_sites', id: siteId })
      await window.desktopApi.sync.enqueue({
        type: 'DELETE',
        entity: 'companySite',
        entityId: siteId,
        payload: {}
      })
      setSites(prev => prev.filter(s => s.id !== siteId))
    } catch {
      // silent
    }
  }

  const handleSaveCompanyMdlField = async (data: Partial<Azienda>): Promise<void> => {
    if (!id || !permissions.canUpdateAziende()) return
    await window.desktopApi.db.update({ table: 'companies', id, data })
    await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'companies', entityId: id, payload: data })
    setAzienda(prev => prev ? { ...prev, ...data } : prev)
  }

  const openCompanyAction = (label: string, type: string): void => {
    const modalTitles: Record<string, string> = {
      VERBALE_RIUNIONE_PERIODICA: 'Verbale Riunione Periodica',
      RISULTATI_ANONIMI_COLLETTIVI: 'Risultati Anonimi Collettivi',
      SOPRALLUOGO: 'Programma Sopralluogo',
      DVR: 'Nuovo DVR',
      CONSULENZA_MDL: 'Nuova Consulenza MDL',
      ALLEGATO_3B: 'Nuovo Allegato 3B',
    }
    const defaultEsecutore = type === 'DVR'
      ? (azienda?.rsppId || effectiveRsppOptions[0]?.id || effectiveSafetyProfessionals[0]?.id || azienda?.medicoCompetenteId || effectiveMedicalProfessionals[0]?.id || '')
      : type === 'CONSULENZA_MDL'
        ? (effectiveSafetyProfessionals[0]?.id || effectiveMedicalProfessionals[0]?.id || '')
        : (azienda?.medicoCompetenteId || effectiveMedicalProfessionals[0]?.id || effectiveSafetyProfessionals[0]?.id || '')
    setCompanyActionForm(prev => ({
      ...prev,
      data: new Date().toISOString().slice(0, 10),
      periodoDa: `${new Date().getFullYear()}-01-01`,
      periodoA: new Date().toISOString().slice(0, 10),
      siteId: sites[0]?.id || '',
      esecutore: defaultEsecutore,
      anno: String(new Date().getFullYear()),
      categoriaEsecutore: 'MC',
      tipoSopralluogo: 'ORDINARIO',
      statoSopralluogo: 'PROGRAMMATO',
      prescrizioniNote: '',
      dataRedazione: new Date().toISOString().slice(0, 10),
      dataScadenza: '',
      numeroRevisione: '1',
      rischiValutati: [],
      durataMinuti: '60',
      importo: type === 'CONSULENZA_MDL' && consulenzaVoce ? String(Number(consulenzaVoce.prezzoBase || 0).toFixed(2)) : '',
      oggetto: modalTitles[type] || label,
      modalitaConsulenza: 'IN_PRESENZA',
      referenteAziendale: '',
      descrizioneAttivita: '',
      note: '',
    }))
    setCompanyActionAttachment(null)
    setConsulenzaImportoAutocalc(type === 'CONSULENZA_MDL')
    setCompanyAction({ label: modalTitles[type] || label, type })
  }

  const handleCreateCompanyDocument = async (name: string, type: string): Promise<void> => {
    if (!id || !azienda || !permissions.canUpdateAziende()) return
    const now = new Date().toISOString()
    if (['SOPRALLUOGO', 'DVR', 'CONSULENZA_MDL', 'ALLEGATO_3B'].includes(type)) {
      const entityId = uuidv4()
      const siteId = companyActionForm.siteId || sites[0]?.id || ''
      if (type === 'SOPRALLUOGO') {
        const payload = {
          id: entityId,
          tenantId: azienda.tenantId || '',
          siteId,
          esecutoreId: companyActionForm.esecutore || null,
          dataEsecuzione: `${companyActionForm.data}T${companyActionForm.oraInizio || '09:00'}:00`,
          dataProssimoSopralluogo: null,
          valutazione: `${companyActionForm.categoriaEsecutore} - ${companyActionForm.tipoSopralluogo}`,
          esito: `${companyActionForm.statoSopralluogo}${companyActionForm.prescrizioniNote ? `|${companyActionForm.prescrizioniNote}` : ''}`,
          note: [companyActionForm.referenteAziendale && `Referente aziendale: ${companyActionForm.referenteAziendale}`, companyActionForm.descrizioneAttivita, companyActionForm.note].filter(Boolean).join('\n\n'),
          documentoNome: companyActionAttachment?.name || null,
          documentoUrl: null,
          createdAt: now,
          updatedAt: now,
        }
        await window.desktopApi.db.insert({ table: 'sopralluoghi', data: payload })
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'sopralluoghi', entityId, payload })
        setSopralluoghiRows(prev => [payload, ...prev])
      } else if (type === 'DVR') {
        const dvrEsecutore = selectedMedico(companyActionForm.esecutore)
        const payload = {
          id: entityId,
          tenantId: azienda.tenantId || '',
          siteId,
          effettuatoDa: dvrEsecutore ? medicoLabel(dvrEsecutore) : companyActionForm.esecutore || azienda.medicoCompetenteNome || '',
          dataEsecuzione: companyActionForm.dataRedazione || companyActionForm.data,
          dataScadenza: companyActionForm.dataScadenza || null,
          rischiRilevati: JSON.stringify(companyActionForm.rischiValutati),
          note: [companyActionForm.referenteAziendale && `Referente aziendale: ${companyActionForm.referenteAziendale}`, companyActionForm.note].filter(Boolean).join('\n\n'),
          tipoDVR: companyActionForm.tipoDvr,
          documentoNome: companyActionAttachment?.name || null,
          documentoUrl: null,
          createdAt: now,
          updatedAt: now,
        }
        await window.desktopApi.db.insert({ table: 'dvr', data: payload })
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'dvr', entityId, payload })
        setDvrRows(prev => [payload, ...prev])
      } else if (type === 'ALLEGATO_3B') {
        const payload = {
          id: entityId,
          tenantId: azienda.tenantId || '',
          medicoCompetenteId: companyActionForm.esecutore || azienda.medicoCompetenteId || effectiveMedicalProfessionals[0]?.id || '',
          companyTenantProfileId: id,
          anno: Number(companyActionForm.anno || new Date().getFullYear() - 1),
          stato: 'DA_COMPILARE',
          totLavoratoriSorvegliati: lavoratori.length,
          totVisiteEffettuate: companyVisits.length,
          totGiudiziIdoneita: 0,
          totGiudiziConLimitazioni: 0,
          totGiudiziConPrescrizioni: 0,
          totInidoneita: 0,
          statistichePerRischio: '{}',
          malattieProf: '{}',
          lavoratoriPerGenere: '{}',
          lavoratoriPerFasciaEta: '{}',
          visitePerTipologia: '{}',
          giudiziPerTipologia: '{}',
          giudiziPerRischio: '{}',
          accertamentiIntegrativi: '{}',
          dataCompilazione: null,
          dataInvio: null,
          dataConferma: null,
          protocolloInvio: null,
          ricevutaInvio: null,
          note: companyActionForm.note || null,
          createdAt: now,
          updatedAt: now,
        }
        await window.desktopApi.db.insert({ table: 'allegati_3b', data: payload })
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'allegati_3b', entityId, payload })
        setAllegati3BRows(prev => [payload, ...prev])
      } else {
        const payload = {
          id: entityId,
          tenantId: azienda.tenantId || '',
          companyTenantProfileId: id,
          siteId: siteId || null,
          professionistaId: companyActionForm.esecutore || null,
          data: `${companyActionForm.data}T${companyActionForm.oraInizio || '09:00'}:00`,
          durataMinuti: Number(companyActionForm.durataMinuti || consulenzaBillableMinutes || 60),
          oggetto: companyActionForm.oggetto || 'Consulenza MDL',
          note: [companyActionForm.modalitaConsulenza && `Modalita: ${companyActionForm.modalitaConsulenza}`, companyActionForm.referenteAziendale && `Referente aziendale: ${companyActionForm.referenteAziendale}`, companyActionForm.descrizioneAttivita, companyActionForm.note].filter(Boolean).join('\n\n'),
          importo: companyActionForm.importo ? Number(companyActionForm.importo) : (consulenzaCalculatedAmount ?? null),
          stato: 'DA_RENDICONTARE',
          createdAt: now,
          updatedAt: now,
        }
        await window.desktopApi.db.insert({ table: 'consulenze_mdl', data: payload })
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'consulenze_mdl', entityId, payload })
        const importoNetto = Number(payload.importo || 0)
        const movimentoEntrataId = uuidv4()
        const movimentoEntrata = {
          id: movimentoEntrataId,
          tenantId: azienda.tenantId || '',
          companyTenantProfileId: id,
          tipo: 'CONSULENZA',
          descrizione: `Consulenza MDL - ${payload.oggetto} (${payload.durataMinuti} min)`,
          importo: importoNetto,
          iva: 0,
          importoNetto,
          stato: 'DA_FATTURARE',
          dataMovimento: payload.data,
          createdAt: now,
          updatedAt: now,
        }
        await window.desktopApi.db.insert({ table: 'movimenti_contabili', data: movimentoEntrata }).catch(() => undefined)
        await window.desktopApi.sync.enqueue({
          type: 'CREATE',
          entity: 'movimentoContabile',
          entityId: movimentoEntrataId,
          payload: {
            consulenzaId: entityId,
            direzione: 'ENTRATA',
            tipo: 'CONSULENZA',
            tipoSoggetto: 'AZIENDA',
            companyTenantProfileId: id,
            siteId: siteId || null,
            voceTariffarioId: consulenzaVoce?.id || null,
            importoNetto,
            importoLordo: importoNetto,
            aliquotaIva: 0,
            importoIva: 0,
            stato: 'DA_FATTURARE',
            dataEsecuzione: payload.data,
            descrizione: movimentoEntrata.descrizione,
            branchType: 'MEDICA',
          }
        })
        if (payload.professionistaId) {
          const movimentoUscitaId = uuidv4()
          const movimentoUscita = {
            id: movimentoUscitaId,
            tenantId: azienda.tenantId || '',
            personId: payload.professionistaId,
            companyTenantProfileId: id,
            tipo: 'CONSULENZA_COMPENSO',
            descrizione: `Compenso consulenza MDL - ${payload.oggetto}`,
            importo: 0,
            iva: 0,
            importoNetto: 0,
            stato: 'DA_FATTURARE',
            dataMovimento: payload.data,
            createdAt: now,
            updatedAt: now,
          }
          await window.desktopApi.db.insert({ table: 'movimenti_contabili', data: movimentoUscita }).catch(() => undefined)
          await window.desktopApi.sync.enqueue({
            type: 'CREATE',
            entity: 'movimentoContabile',
            entityId: movimentoUscitaId,
            payload: {
              consulenzaId: entityId,
              direzione: 'USCITA',
              tipo: 'CONSULENZA',
              tipoSoggetto: 'MEDICO',
              personId: payload.professionistaId,
              companyTenantProfileId: id,
              voceTariffarioId: consulenzaVoce?.id || null,
              importoNetto: 0,
              importoLordo: 0,
              aliquotaIva: 0,
              importoIva: 0,
              stato: 'DA_FATTURARE',
              dataEsecuzione: payload.data,
              descrizione: movimentoUscita.descrizione,
              branchType: 'MEDICA',
            }
          })
        }
        setConsulenzeRows(prev => [payload, ...prev])
      }
    }
    const shouldGeneratePdf = ['VERBALE_RIUNIONE_PERIODICA', 'RISULTATI_ANONIMI_COLLETTIVI'].includes(type)
    let localPath: string | null = null
    let pdfSize: number | null = null
    let fileTipo = type
    if (shouldGeneratePdf) {
      const pdfBlob = await generateCompanyDocumentPdf(name, type)
      const fileName = `${type}_${(azienda.ragioneSociale || 'azienda').replace(/[^a-z0-9]+/gi, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
      const saved = await saveDocumentBlob(pdfBlob, fileName)
      localPath = saved.localPath
      pdfSize = saved.dimensione || pdfBlob.size
      fileTipo = 'pdf'
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } else if (companyActionAttachment) {
      const saved = await saveDocumentBlob(companyActionAttachment, companyActionAttachment.name)
      localPath = saved.localPath
      pdfSize = saved.dimensione
      fileTipo = saved.tipo || type
    }
    if (shouldGeneratePdf || companyActionAttachment) {
      const doc = {
        id: uuidv4(),
        tenantId: azienda.tenantId || '',
        companyTenantProfileId: id,
        visitaId: null,
        nome: companyActionAttachment?.name || name,
        tipo: fileTipo,
        dimensione: pdfSize,
        localPath,
        serverUrl: null,
        createdAt: now,
        updatedAt: now,
      }
      await window.desktopApi.db.insert({ table: 'allegati', data: doc })
      setDocumenti(prev => [doc, ...prev].sort((a, b) => String(a.tipo || '').localeCompare(String(b.tipo || ''), 'it') || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))))
    }
    setDocumentActionMessage(`${name} ${shouldGeneratePdf ? 'creato' : 'salvato'} localmente${['SOPRALLUOGO', 'DVR', 'CONSULENZA_MDL', 'ALLEGATO_3B'].includes(type) ? ' e servizio accodato alla sincronizzazione' : ''}`)
    setCompanyAction(null)
    if (shouldGeneratePdf) setActiveTab('documenti')
  }

  const generateCompanyDocumentPdf = async (name: string, type: string): Promise<Blob> => {
    const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer')
    const styles = StyleSheet.create({
      page: { padding: 36, fontSize: 11, fontFamily: 'Helvetica', color: '#111827' },
      title: { fontSize: 18, marginBottom: 12, fontWeight: 700 },
      section: { marginTop: 10, padding: 10, border: '1 solid #E5E7EB' },
      label: { color: '#6B7280', marginBottom: 2 },
      value: { marginBottom: 6 },
    })
    const isPeriodDoc = type === 'VERBALE_RIUNIONE_PERIODICA' || type === 'RISULTATI_ANONIMI_COLLETTIVI'
    return pdf(
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>{name}</Text>
          <View style={styles.section}>
            <Text style={styles.label}>Azienda</Text>
            <Text style={styles.value}>{azienda?.ragioneSociale || 'Azienda'}</Text>
            <Text style={styles.label}>Tipologia</Text>
            <Text style={styles.value}>{type}</Text>
            {isPeriodDoc ? (
              <>
                <Text style={styles.label}>{type === 'VERBALE_RIUNIONE_PERIODICA' ? 'Anno di riferimento' : 'Periodo dati'}</Text>
                <Text style={styles.value}>{type === 'VERBALE_RIUNIONE_PERIODICA' ? companyActionForm.anno : `${companyActionForm.periodoDa} - ${companyActionForm.periodoA}`}</Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Data</Text>
                <Text style={styles.value}>{companyActionForm.data} {companyActionForm.oraInizio} - {companyActionForm.oraFine}</Text>
                <Text style={styles.label}>Sede</Text>
                <Text style={styles.value}>{sites.find(s => s.id === companyActionForm.siteId)?.siteName || sites.find(s => s.id === companyActionForm.siteId)?.indirizzo || 'Non indicata'}</Text>
                <Text style={styles.label}>Esecutore / oggetto</Text>
                <Text style={styles.value}>{selectedMedico(companyActionForm.esecutore) ? medicoLabel(selectedMedico(companyActionForm.esecutore)!) : (companyActionForm.esecutore || companyActionForm.oggetto || 'Non indicato')}</Text>
              </>
            )}
            {type === 'DVR' && (
              <>
                <Text style={styles.label}>Tipo DVR</Text>
                <Text style={styles.value}>{companyActionForm.tipoDvr}</Text>
                <Text style={styles.label}>Revisione / scadenza</Text>
                <Text style={styles.value}>Rev. {companyActionForm.numeroRevisione || '1'} · {companyActionForm.dataScadenza || 'Non indicata'}</Text>
                <Text style={styles.label}>Rischi valutati</Text>
                <Text style={styles.value}>{companyActionForm.rischiValutati.join(', ') || 'Non indicati'}</Text>
              </>
            )}
            {type === 'SOPRALLUOGO' && (
              <>
                <Text style={styles.label}>Tipo / stato sopralluogo</Text>
                <Text style={styles.value}>{companyActionForm.tipoSopralluogo} · {companyActionForm.statoSopralluogo}</Text>
                <Text style={styles.label}>Prescrizioni</Text>
                <Text style={styles.value}>{companyActionForm.prescrizioniNote || 'Nessuna prescrizione'}</Text>
              </>
            )}
            {type === 'CONSULENZA_MDL' && (
              <>
                <Text style={styles.label}>Durata / importo</Text>
                <Text style={styles.value}>{companyActionForm.durataMinuti || '0'} minuti · {companyActionForm.importo || '0'} EUR</Text>
              </>
            )}
            <Text style={styles.label}>Note</Text>
            <Text style={styles.value}>{companyActionForm.note || 'Nessuna nota'}</Text>
          </View>
        </Page>
      </Document>
    ).toBlob()
  }

  type WorkerAccertamento = PrestazioneProtocollo & { protocolloNome?: string | null }
  const isMdlMainPrestazioneName = (value: string | null | undefined): boolean =>
    /visita\s+medica.*lavoro|medicina\s+del\s+lavoro|visita.*lavoro/i.test(value || '')
  const isScadenzaInMdlWindow = (value: string | null | undefined, referenceDate = new Date()): boolean => {
    if (!value) return false
    const due = new Date(value)
    if (Number.isNaN(due.getTime())) return false
    due.setHours(0, 0, 0, 0)
    const start = new Date(referenceDate)
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - 60)
    const end = new Date(referenceDate)
    end.setHours(23, 59, 59, 999)
    end.setDate(end.getDate() + 30)
    return due >= start && due <= end
  }
  const getWorkerAccertamenti = (worker: Lavoratore): WorkerAccertamento[] => {
    const workerMansioni = lavoratoriMansioni.filter(m => m.personId === worker.id)
    const workerProtocols = protocolli.filter(p =>
      p.id === worker.protocolloSanitarioId ||
      workerMansioni.some(m => m.mansioneId && m.mansioneId === p.mansioneId)
    )
    const seen = new Set<string>()
    return workerProtocols
      .flatMap(p => normalizeProtocolloPrestazioni(protocolloPrestazioni.get(p.id) || []).map(item => ({
        ...item,
        protocolloNome: p.nome
      })))
      .filter(item => {
        const key = item.prestazioneId || item.prestazioneNome
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => {
        const mainDiff = Number(isMdlMainPrestazioneName(b.prestazioneNome)) - Number(isMdlMainPrestazioneName(a.prestazioneNome))
        if (mainDiff !== 0) return mainDiff
        const requiredDiff = Number(b.obbligatoria) - Number(a.obbligatoria)
        if (requiredDiff !== 0) return requiredDiff
        return (a.prestazioneNome || '').localeCompare(b.prestazioneNome || '', 'it')
      })
  }

  const getPrestazioneLabel = (prestazioneId: string): string => {
    const accertamento = [...protocolloPrestazioni.values()].flat().find(p => p.prestazioneId === prestazioneId)
    return accertamento?.prestazioneNome || scadenze.find(s => s.prestazioneId === prestazioneId)?.prestazioneNome || 'Prestazione'
  }

  const activeTariffarioIds = new Set(tariffari.map(t => t.id))
  const activeCompanyVoci = tariffarioVoci.filter(v =>
    v.attivo !== 0 &&
    v.attivo !== false &&
    (!v.tariffarioAziendaleId || activeTariffarioIds.size === 0 || activeTariffarioIds.has(v.tariffarioAziendaleId))
  )
  const getMdlMainPrestazioneId = (accertamenti: WorkerAccertamento[], fallback?: string | null): string => {
    const fromProtocol = accertamenti.find(a => isMdlMainPrestazioneName(a.prestazioneNome))?.prestazioneId
    if (fromProtocol) return fromProtocol
    const fromTariffario = activeCompanyVoci.find(v => isMdlMainPrestazioneName(`${v.nome || ''} ${v.tipo || ''}`))?.prestazioneId
    return fromTariffario || fallback || accertamenti[0]?.prestazioneId || ''
  }
  const ensureMdlMainAccertamento = (accertamenti: WorkerAccertamento[], mainPrestazioneId: string): WorkerAccertamento[] => {
    if (accertamenti.some(acc => isMdlMainPrestazioneName(acc.prestazioneNome) || (!!mainPrestazioneId && acc.prestazioneId === mainPrestazioneId))) {
      return accertamenti
    }
    if (!mainPrestazioneId) return accertamenti
    return [
      {
        prestazioneId: mainPrestazioneId,
        prestazioneNome: 'Visita Medica del Lavoro',
        periodicitaMesi: 12,
        obbligatoria: true,
        protocolloNome: 'Prestazione principale',
      },
      ...accertamenti,
    ]
  }
  const getDueAccertamentoIds = (worker: Lavoratore, accertamenti: WorkerAccertamento[], mainPrestazioneId: string): string[] => {
    const workerScadenze = scadenze.filter(s => s.personId === worker.id)
    const dueIds = new Set<string>()
    if (mainPrestazioneId) dueIds.add(mainPrestazioneId)
    accertamenti.forEach(acc => {
      if (!acc.prestazioneId || !acc.obbligatoria) return
      const dueScadenza = workerScadenze.find(s =>
        s.prestazioneId === acc.prestazioneId &&
        !s.eseguita &&
        isScadenzaInMdlWindow(s.dataScadenza)
      )
      if (dueScadenza) dueIds.add(acc.prestazioneId)
    })
    return [...dueIds]
  }
  const getDefaultTipoVisitaMDL = (worker: Lavoratore): string => {
    const hasPreviousVisit = companyVisits.some(v => v.personId === worker.id && v.dataOra)
    if (!hasPreviousVisit) return 'PREVENTIVA'
    const hasDueScadenza = scadenze.some(s =>
      s.personId === worker.id &&
      !s.eseguita &&
      isScadenzaInMdlWindow(s.dataScadenza)
    )
    return hasDueScadenza ? 'PERIODICA' : 'STRAORDINARIA'
  }
  const getTariffarioPriceForPrestazione = (prestazioneId: string | null | undefined, categoriaVisita?: string | null): number | null => {
    if (!prestazioneId) return null
    const voce =
      (categoriaVisita ? activeCompanyVoci.find(v => v.prestazioneId === prestazioneId && v.categoriaVisita === categoriaVisita) : null) ||
      activeCompanyVoci.find(v => v.prestazioneId === prestazioneId && !v.categoriaVisita) ||
      activeCompanyVoci.find(v => v.prestazioneId === prestazioneId)
    return voce ? Number(voce.prezzoBase || 0) : null
  }
  const getDurationForPrestazione = (prestazioneId: string | null | undefined, slotDuration?: number | null): number => {
    if (slotDuration && slotDuration > 0) return slotDuration
    const voce = prestazioneId ? activeCompanyVoci.find(v => v.prestazioneId === prestazioneId && Number(v.durataMinimaMinuti || 0) > 0) : null
    return Number(voce?.durataMinimaMinuti || 10)
  }

  const toggleBookingAccertamento = (target: 'booking' | 'directVisit', prestazioneId: string, checked: boolean): void => {
    const updater = (prev: BookingState | null): BookingState | null => {
      if (!prev) return prev
      const nextSet = new Set(prev.selectedAccertamenti)
      checked ? nextSet.add(prestazioneId) : nextSet.delete(prestazioneId)
      return { ...prev, selectedAccertamenti: [...nextSet], prestazioneId: prev.prestazioneId || prestazioneId }
    }
    if (target === 'booking') setBooking(updater)
    else setDirectVisit(updater)
  }

  const bookingWeekDays = useMemo(
    () => Array.from({ length: 6 }, (_, index) => addDays(bookingWeekStart, index)),
    [bookingWeekStart]
  )

  const filteredBookingTimeRows = useMemo(() => TIME_ROWS.filter(time => {
    if (bookingTimeRange === 'all') return time >= '08:00' && time <= '18:00'
    const mins = timeToMinutes(time)
    if (bookingTimeRange === 'morning') return mins >= 7 * 60 && mins < 13 * 60
    return mins >= 13 * 60 && mins < 20 * 60
  }), [bookingTimeRange])

  const getSlotForBookingCell = (date: string, time: string, currentBooking: BookingState): SlotDisponibilitaRow | undefined => {
    return slotDisponibilitaRows.find(slot =>
      String(slot.data).slice(0, 10) === date &&
      slot.medicoId === currentBooking.medicoId &&
      timeToMinutes(slot.oraInizio) <= timeToMinutes(time) &&
      timeToMinutes(slot.oraFine) > timeToMinutes(time) &&
      (slot.disponibile === true || slot.disponibile === 1) &&
      String(slot.stato || 'LIBERO').toUpperCase() === 'LIBERO'
    )
  }

  const getAppointmentForBookingCell = (date: string, time: string, currentBooking: BookingState): ExistingAppointmentSlot | undefined => {
    return existingAppointmentSlots.find(appt => {
      if (!appt.dataOra || appt.medicoId !== currentBooking.medicoId) return false
      const start = new Date(appt.dataOra)
      const apptDate = toLocalDateKey(start)
      if (apptDate !== date) return false
      const startTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
      const startMins = timeToMinutes(startTime)
      const endMins = startMins + Number(appt.durata || 30)
      const cellMins = timeToMinutes(time)
      return cellMins >= startMins && cellMins < endMins
    })
  }

  const assignBookingSlot = (slot: SlotDisponibilitaRow, date: string, time: string): void => {
    setBooking(prev => prev ? {
      ...prev,
      date,
      time,
      ambulatorioId: slot.ambulatorioId || prev.ambulatorioId,
      medicoId: slot.medicoId || prev.medicoId,
    } : prev)
    setBookingActivePersonSelected(true)
  }

  const assignBookingManualCell = (date: string, time: string): void => {
    setBooking(prev => prev ? {
      ...prev,
      date,
      time,
      ambulatorioId: prev.ambulatorioId || ambulatoriCatalog[0]?.id || '',
    } : prev)
    setBookingActivePersonSelected(true)
  }

  const createDefaultVisitState = (worker: Lavoratore, scadenza?: Scadenza): BookingState => {
    const now = new Date()
    const rounded = new Date(now)
    rounded.setMinutes(now.getMinutes() < 30 ? 30 : 0, 0, 0)
    if (now.getMinutes() >= 30) rounded.setHours(now.getHours() + 1)
    const rawAccertamenti = getWorkerAccertamenti(worker)
    const defaultPrestazioneId = getMdlMainPrestazioneId(rawAccertamenti, scadenza?.prestazioneId)
    const accertamenti = ensureMdlMainAccertamento(rawAccertamenti, defaultPrestazioneId)
    const defaultMedicoId = azienda?.medicoCompetenteId || effectiveMedicalProfessionals[0]?.id || ''
    const todayKey = toLocalDateKey(now)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()
    const activeSlot = slotDisponibilitaRows.find(slot =>
      String(slot.data).slice(0, 10) === todayKey &&
      slot.medicoId === defaultMedicoId &&
      timeToMinutes(slot.oraInizio) <= nowMinutes &&
      timeToMinutes(slot.oraFine) > nowMinutes &&
      (slot.disponibile === true || slot.disponibile === 1) &&
      String(slot.stato || 'LIBERO').toUpperCase() === 'LIBERO'
    )
    return {
      worker,
      scadenza,
      date: activeSlot ? todayKey : toLocalDateKey(rounded),
      time: activeSlot ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`,
      durata: 10,
      medicoId: defaultMedicoId,
      ambulatorioId: activeSlot?.ambulatorioId || ambulatoriCatalog[0]?.id || '',
      siteId: sites[0]?.id || '',
      tipoVisitaMDL: getDefaultTipoVisitaMDL(worker),
      prestazioneId: defaultPrestazioneId,
      selectedAccertamenti: getDueAccertamentoIds(worker, accertamenti, defaultPrestazioneId),
      note: '',
    }
  }

  const openBookingModal = (worker: Lavoratore, scadenza?: Scadenza): void => {
    const next = createDefaultVisitState(worker, scadenza)
    setBooking(next)
    setBookingWeekStart(getMonday(next.date ? new Date(`${next.date}T00:00:00`) : new Date()))
    setBookingActivePersonSelected(true)
    setBookingError(null)
  }

  const openDirectVisitModal = (worker: Lavoratore, scadenza?: Scadenza): void => {
    setDirectVisit(createDefaultVisitState(worker, scadenza))
    setBookingError(null)
  }

  const handleCreateMdlAppointment = async (): Promise<void> => {
    if (!id || !azienda || !booking || !window.desktopApi || !permissions.canCreateVisite()) return
    if (!booking.date || !booking.time) {
      setBookingError('Seleziona data e ora dell’appuntamento.')
      return
    }
    setBookingSaving(true)
    setBookingError(null)
    try {
      const now = new Date().toISOString()
      const dataOra = new Date(`${booking.date}T${booking.time}:00`).toISOString()
      const appointmentId = uuidv4()
      const prestazioneIds = Array.from(new Set([booking.prestazioneId, ...booking.selectedAccertamenti].filter(Boolean)))
      const prestazioneId = booking.prestazioneId || booking.scadenza?.prestazioneId || prestazioneIds[0] || null
      const prestazioneNome = booking.scadenza?.prestazioneNome || (prestazioneId ? getPrestazioneLabel(prestazioneId) : 'Visita medica del lavoro')

      const appointmentLocalPayload = {
        id: appointmentId,
        tenantId: azienda.tenantId || '',
        personId: booking.worker.id,
        medicoId: booking.medicoId || azienda.medicoCompetenteId || null,
        ambulatorioId: booking.ambulatorioId || null,
        prestazioneId,
        companyTenantProfileId: id,
        dataOra,
        durata: booking.durata,
        durataPrevista: booking.durata,
        stato: 'PRENOTATO',
        tipo: 'MEDICINA_LAVORO',
        personFirstName: booking.worker.firstName,
        personLastName: booking.worker.lastName,
        personTaxCode: booking.worker.taxCode,
        companyName: azienda.ragioneSociale,
        prestazioneNome,
        siteId: booking.siteId || null,
        noteInterne: booking.note || 'Appuntamento MdL fissato da Sorveglianza Sanitaria desktop',
        createdAt: now,
        updatedAt: now,
      }
      const appointmentSyncPayload = {
        ...appointmentLocalPayload,
        tipoVisitaMDL: booking.tipoVisitaMDL || 'PERIODICA',
        durataMinuti: booking.durata,
        createdFromSorveglianzaSanitaria: true,
        promemoriaEmail: false,
        promemoriaSms: false,
      }

      await window.desktopApi.db.insert({ table: 'appointments', data: appointmentLocalPayload })

      for (const selectedPrestazioneId of prestazioneIds) {
        const prezzo = getTariffarioPriceForPrestazione(selectedPrestazioneId, booking.tipoVisitaMDL)
        const inserted = await window.desktopApi.db.insert({
          table: 'appointment_prestazioni',
          data: {
            appuntamentoId: appointmentId,
            prestazioneId: selectedPrestazioneId,
            prezzo,
            quantita: 1,
            note: 'Accertamento da protocollo sanitario',
          }
        }) as { id: string }
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'appointment_prestazioni', entityId: inserted.id, payload: { appuntamentoId: appointmentId, prestazioneId: selectedPrestazioneId, prezzo, quantita: 1 } })
      }

      await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'appointments', entityId: appointmentId, payload: appointmentSyncPayload })
      setBooking(null)
      await loadData()
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Errore durante la creazione dell’appuntamento.')
    } finally {
      setBookingSaving(false)
    }
  }

  const handleCreateDirectMdlVisit = async (): Promise<void> => {
    if (!id || !azienda || !directVisit || !window.desktopApi || !permissions.canCreateVisite()) return
    const now = new Date().toISOString()
    const dataOra = new Date(`${directVisit.date}T${directVisit.time}:00`).toISOString()
    const worker = directVisit.worker
    const prestazioneIds = Array.from(new Set([directVisit.prestazioneId, ...directVisit.selectedAccertamenti].filter(Boolean)))
    const prestazioneId = directVisit.prestazioneId || directVisit.scadenza?.prestazioneId || prestazioneIds[0] || null
    const prestazioneNome = directVisit.scadenza?.prestazioneNome || (prestazioneId ? getPrestazioneLabel(prestazioneId) : 'Visita medica del lavoro')
    const patientName = `${worker.lastName || ''} ${worker.firstName || ''}`.trim()
    const directDateKey = toLocalDateKey(new Date(dataOra))
    const existingMdlAppointment = existingAppointmentSlots.find(appt => {
      if (appt.personId !== worker.id || !appt.dataOra) return false
      if (['ANNULLATO', 'CANCELLATO'].includes(String(appt.stato || '').toUpperCase())) return false
      const sameDay = toLocalDateKey(new Date(appt.dataOra)) === directDateKey
      if (!sameDay) return false
      const descriptor = `${appt.tipo || ''} ${appt.prestazioneNome || ''}`.toLowerCase()
      return descriptor.includes('medicina_lavoro') ||
        descriptor.includes('medicina lavoro') ||
        descriptor.includes('visita medica del lavoro') ||
        descriptor.includes('lavoro')
    })
    const appointmentId = existingMdlAppointment?.id || uuidv4()
    const appointmentUpdatePayload = {
      stato: existingMdlAppointment?.stato === 'COMPLETATO' ? existingMdlAppointment.stato : 'IN_CORSO',
      tipo: 'MEDICINA_LAVORO',
      companyTenantProfileId: id,
      medicoId: existingMdlAppointment?.medicoId || directVisit.medicoId || azienda.medicoCompetenteId || null,
      ambulatorioId: existingMdlAppointment?.ambulatorioId || directVisit.ambulatorioId || null,
      prestazioneId,
      prestazioneNome,
      noteInterne: [
        existingMdlAppointment?.noteInterne,
        directVisit.note || (existingMdlAppointment ? 'Visita MdL collegata da Sorveglianza Sanitaria usando appuntamento già presente oggi' : 'Visita MdL creata direttamente da Sorveglianza Sanitaria desktop'),
      ].filter(Boolean).join('\n'),
      updatedAt: now,
    }

    if (existingMdlAppointment) {
      await window.desktopApi.db.update({ table: 'appointments', id: appointmentId, data: appointmentUpdatePayload })
      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'appointments',
        entityId: existingMdlAppointment._serverId || appointmentId,
        localId: existingMdlAppointment._localId || undefined,
        payload: {
          ...appointmentUpdatePayload,
          tipoVisitaMDL: directVisit.tipoVisitaMDL || 'PERIODICA',
          companyTenantProfileId: id,
          durataMinuti: existingMdlAppointment.durata || directVisit.durata,
          createdFromSorveglianzaSanitaria: true,
        }
      })
    } else {
      await window.desktopApi.db.insert({
        table: 'appointments',
        data: {
          id: appointmentId,
          tenantId: azienda.tenantId || '',
          personId: worker.id,
          medicoId: directVisit.medicoId || azienda.medicoCompetenteId || null,
          ambulatorioId: directVisit.ambulatorioId || null,
          prestazioneId,
          companyTenantProfileId: id,
          dataOra,
          durata: directVisit.durata,
          durataPrevista: directVisit.durata,
          stato: 'IN_CORSO',
          tipo: 'MEDICINA_LAVORO',
          personFirstName: worker.firstName,
          personLastName: worker.lastName,
          personTaxCode: worker.taxCode,
          companyName: azienda.ragioneSociale,
          prestazioneNome,
          siteId: directVisit.siteId || null,
          noteInterne: directVisit.note || 'Visita MdL creata direttamente da Sorveglianza Sanitaria desktop',
          createdAt: now,
          updatedAt: now,
        }
      })
      await window.desktopApi.sync.enqueue({
        type: 'CREATE',
        entity: 'appointments',
        entityId: appointmentId,
        payload: {
          personId: worker.id,
          companyTenantProfileId: id,
          dataOra,
          durataMinuti: directVisit.durata,
          stato: 'IN_CORSO',
          tipoVisitaMDL: directVisit.tipoVisitaMDL || 'PERIODICA',
          prestazioneId,
          medicoId: directVisit.medicoId || azienda.medicoCompetenteId || null,
          ambulatorioId: directVisit.ambulatorioId || null,
          createdFromSorveglianzaSanitaria: true,
          promemoriaEmail: false,
          promemoriaSms: false,
          isOverbooking: !directVisit.ambulatorioId,
        }
      })
    }

    const currentAppointmentPrestazioni = await window.desktopApi.db.query({
      table: 'appointment_prestazioni',
      where: { appuntamentoId: appointmentId, _isDeleted: 0 }
    }).catch(() => []) as Array<{ prestazioneId: string | null }>
    const currentPrestazioneIds = new Set(currentAppointmentPrestazioni.map(p => p.prestazioneId).filter(Boolean) as string[])
    for (const selectedPrestazioneId of prestazioneIds) {
      if (currentPrestazioneIds.has(selectedPrestazioneId)) continue
      const prezzo = getTariffarioPriceForPrestazione(selectedPrestazioneId, directVisit.tipoVisitaMDL)
      const inserted = await window.desktopApi.db.insert({
        table: 'appointment_prestazioni',
        data: {
          appuntamentoId: appointmentId,
          prestazioneId: selectedPrestazioneId,
          prezzo,
          quantita: 1,
          note: 'Accertamento da protocollo sanitario',
        }
      }) as { id: string }
      await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'appointment_prestazioni', entityId: inserted.id, payload: { appuntamentoId: appointmentId, prestazioneId: selectedPrestazioneId, prezzo, quantita: 1 } })
    }

    const existingVisits = await window.desktopApi.db.query({
      table: 'visits',
      where: { appuntamentoId: appointmentId, _isDeleted: 0 },
      limit: 1
    }).catch(() => []) as Array<{ id: string; _localId?: string | null; _serverId?: string | null }>
    if (existingVisits[0]) {
      const existingVisit = existingVisits[0]
      await window.desktopApi.db.update({
        table: 'visits',
        id: existingVisit.id,
        data: {
          stato: 'IN_CORSO',
          tipoVisitaMDL: directVisit.tipoVisitaMDL || 'PERIODICA',
          isMDL: 1,
          prestazioneId,
          prestazioneNome,
          datiStrutturati: JSON.stringify({ accertamentiCollegati: prestazioneIds }),
          updatedAt: now,
        }
      })
      await window.desktopApi.sync.enqueue({
        type: 'UPDATE',
        entity: 'visits',
        entityId: existingVisit._serverId || existingVisit.id,
        localId: existingVisit._localId || undefined,
        payload: { stato: 'IN_CORSO', tipoVisitaMDL: directVisit.tipoVisitaMDL || 'PERIODICA', isMDL: true, prestazioneId, datiStrutturati: { accertamentiCollegati: prestazioneIds } }
      })
      setDirectVisit(null)
      navigate(`/visite/${existingVisit.id}`, { state: { from: currentRoute } })
      return
    }

    const visitId = uuidv4()
    await window.desktopApi.db.insert({
      table: 'visits',
      data: {
        id: visitId,
        tenantId: azienda.tenantId || '',
        appuntamentoId: appointmentId,
        personId: worker.id,
        medicoId: directVisit.medicoId || azienda.medicoCompetenteId || null,
        ambulatorioId: directVisit.ambulatorioId || null,
        dataOra,
        stato: 'IN_CORSO',
        tipoVisitaMDL: directVisit.tipoVisitaMDL || 'PERIODICA',
        isMDL: 1,
        personFirstName: worker.firstName,
        personLastName: worker.lastName,
        personTaxCode: worker.taxCode,
        companyName: azienda.ragioneSociale,
        prestazioneId,
        prestazioneNome,
        datiStrutturati: JSON.stringify({ accertamentiCollegati: prestazioneIds }),
        noteInterne: directVisit.note || `Visita MdL avviata da Sorveglianza Sanitaria per ${patientName}`,
        createdAt: now,
        updatedAt: now,
      }
    })

    await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'visits', entityId: visitId, payload: { appuntamentoId: appointmentId, personId: worker.id, stato: 'IN_CORSO', tipoVisitaMDL: directVisit.tipoVisitaMDL || 'PERIODICA', isMDL: true, prestazioneId, datiStrutturati: { accertamentiCollegati: prestazioneIds } } })
    setDirectVisit(null)
    navigate(`/visite/${visitId}`, { state: { from: currentRoute } })
  }

  const visibleMovimenti = movimenti.filter(m => {
    if (movimentiTab === 'tutti') return true
    return (m.stato || '').toLowerCase() === movimentiTab
  })

  const medicoLabel = (m: MedicoOption): string =>
    formatMedicoLabel(m)

  const selectedMedico = (medicoId: string | null | undefined): MedicoOption | undefined =>
    mediciCatalog.find(m => m.id === medicoId)

  const blobToBase64 = async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  const saveDocumentBlob = async (blob: Blob, fileName: string): Promise<{ localPath: string; dimensione: number; tipo: string }> => {
    const saved = await window.desktopApi.file.saveGeneratedDocument({
      bufferBase64: await blobToBase64(blob),
      fileName,
      scopeId: id || 'azienda'
    }) as { localPath: string; dimensione: number; tipo: string }
    return saved
  }

  const openCompanyDocument = async (doc: AllegatoAzienda): Promise<void> => {
    try {
      if (doc.localPath) {
        await window.desktopApi.file.openLocalFile(doc.localPath)
        return
      }
      if (doc.serverUrl) {
        const url = doc.serverUrl.startsWith('http') ? doc.serverUrl : `https://www.elementmedica.com${doc.serverUrl}`
        await window.desktopApi.app.openExternal(url)
        return
      }
      setDocumentActionMessage('Documento non disponibile offline')
    } catch {
      setDocumentActionMessage('Impossibile aprire il documento')
    }
  }

  const downloadCompanyDocument = async (doc: AllegatoAzienda): Promise<void> => {
    if (doc.localPath) {
      try {
        await window.desktopApi.file.exportLocalFile({ localPath: doc.localPath, fileName: doc.nome || 'documento' })
      } catch {
        setDocumentActionMessage('Impossibile esportare il documento')
      }
      return
    }
    if (!doc.serverUrl) {
      setDocumentActionMessage('Documento non disponibile per il download')
      return
    }
    try {
      const url = doc.serverUrl.startsWith('http') ? doc.serverUrl : `${API_BASE}${doc.serverUrl}`
      const response = await fetch(url, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined })
      if (!response.ok) throw new Error('download failed')
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = doc.nome || 'documento'
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      setDocumentActionMessage('Impossibile scaricare il documento')
    }
  }

  const deleteCompanyDocument = async (doc: AllegatoAzienda): Promise<void> => {
    if (!permissions.canUpdateAziende()) return
    const confirmed = await window.desktopApi.app.confirmDialog({
      title: 'Elimina documento',
      message: `Eliminare "${doc.nome}"?`,
      detail: 'Il documento verra rimosso dal database locale e accodato per la sincronizzazione.',
      buttons: ['Annulla', 'Elimina'],
      defaultId: 0,
      type: 'warning'
    })
    if (!confirmed) return
    await window.desktopApi.db.softDelete({ table: 'allegati', id: doc.id, reason: 'Eliminazione documento aziendale da desktop' })
    await window.desktopApi.sync.enqueue({ type: 'DELETE', entity: 'allegatoVisita', entityId: doc.id, payload: { deletionReason: 'Eliminazione documento aziendale da desktop' } })
    setDocumenti(prev => prev.filter(item => item.id !== doc.id))
    setDocumentActionMessage('Documento eliminato e accodato alla sincronizzazione')
  }

  const documentGroups = documenti.reduce<Record<string, AllegatoAzienda[]>>((acc, doc) => {
    const key = doc.tipo || 'Documento'
    if (!acc[key]) acc[key] = []
    acc[key].push(doc)
    return acc
  }, {})
  const documentsByType = (tipo: string): AllegatoAzienda[] =>
    documenti.filter(doc => (doc.tipo || '').toUpperCase() === tipo.toUpperCase())
  const serviceDocumentList = (tipo: string): JSX.Element | null => {
    const docs = documentsByType(tipo)
    if (docs.length === 0) return null
    return (
      <div className="mt-2 space-y-1">
        {docs.slice(0, 3).map(doc => (
          <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5 text-xs">
            <span className="truncate text-gray-700">{doc.nome}</span>
            <span className="inline-flex gap-1">
              <button type="button" title="Apri" onClick={() => { void openCompanyDocument(doc) }} className="rounded-md p-1 text-gray-500 hover:bg-gray-50"><Eye className="h-3.5 w-3.5" /></button>
              <button type="button" title="Scarica" onClick={() => { void downloadCompanyDocument(doc) }} className="rounded-md p-1 text-teal-700 hover:bg-teal-50"><FileDown className="h-3.5 w-3.5" /></button>
            </span>
          </div>
        ))}
      </div>
    )
  }

  const rowDocumentActions = (documentoNome: string | null | undefined, documentoUrl: string | null | undefined, tipo: string): JSX.Element | null => {
    if (!documentoNome && !documentoUrl) return null
    const doc = documentsByType(tipo).find(item =>
      (documentoNome && item.nome === documentoNome) ||
      (documentoUrl && item.serverUrl === documentoUrl)
    ) || {
      id: `${tipo}-${documentoNome || documentoUrl}`,
      nome: documentoNome || 'Documento',
      tipo,
      dimensione: null,
      serverUrl: documentoUrl || null,
      localPath: null,
      createdAt: null,
    }
    return (
      <span className="inline-flex shrink-0 gap-1">
        <button type="button" title="Quicklook" onClick={() => { void openCompanyDocument(doc) }} className="rounded-md p-1 text-gray-500 hover:bg-white">
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Scarica" onClick={() => { void downloadCompanyDocument(doc) }} className="rounded-md p-1 text-teal-700 hover:bg-white">
          <FileDown className="h-3.5 w-3.5" />
        </button>
      </span>
    )
  }

  const activeNomineRuolo = nomineRuolo.filter(n => n.stato !== 'CESSATA')
  const nominaName = (n: NominaRuolo): string =>
    n.nome || [n.firstName, n.lastName].filter(Boolean).join(' ') || n.personId || 'Persona non indicata'
  const formatDate = (value: string | null | undefined): string =>
    value ? new Date(value).toLocaleDateString('it-IT') : 'Non indicata'
  const activeMcNomina = [...activeNomineRuolo]
    .filter(n => n.tipoRuolo === 'MEDICO_COMPETENTE')
    .sort((a, b) => String(b.dataInizio || '').localeCompare(String(a.dataInizio || '')))[0]
  const activeSuccessorNomina = [...activeNomineRuolo]
    .filter(n => n.tipoRuolo === 'MEDICO_COMPETENTE_SUCCESSORE')
    .sort((a, b) => String(b.dataInizio || '').localeCompare(String(a.dataInizio || '')))[0]
  const mediciCoordinati = activeNomineRuolo
    .filter(n => n.tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO')
    .map(nominaName)
    .filter(Boolean)
    .join(', ')
  const nomineAttive = activeNomineRuolo
  const getTariffarioVoci = (tariffarioId: string): VoceTariffario[] => {
    return tariffarioVoci.filter(v => v.tariffarioAziendaleId === tariffarioId && v.attivo !== 0 && v.attivo !== false)
  }
  const consulenzaVoce = useMemo(() => {
    const normalized = (value: string | null | undefined): string =>
      String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const candidates = activeCompanyVoci.filter(v => {
      const tipo = String(v.tipo || '').toUpperCase()
      const categoria = String(v.categoriaVisita || '').toUpperCase()
      const nome = normalized(v.nome)
      return tipo === 'CONSULENZA' ||
        tipo === 'CONSULENZA_MDL' ||
        categoria === 'CONSULENZA' ||
        nome.includes('consulenza')
    })
    return candidates.sort((a, b) => {
      const score = (v: VoceTariffario): number => {
        const nome = normalized(v.nome)
        const tipo = String(v.tipo || '').toUpperCase()
        if (nome.includes('consulenza medico competente')) return 0
        if (tipo === 'CONSULENZA') return 1
        if (tipo === 'CONSULENZA_MDL') return 2
        if (nome.includes('consulenza')) return 3
        return 9
      }
      return score(a) - score(b)
    })[0] || null
  }, [activeCompanyVoci])
  const consulenzaFrazioneMinuti = Number(consulenzaVoce?.durataMinimaMinuti || 60)
  const consulenzaActualMinutes = useMemo(() => {
    const start = timeToMinutes(companyActionForm.oraInizio)
    const end = timeToMinutes(companyActionForm.oraFine)
    return end > start ? end - start : 0
  }, [companyActionForm.oraInizio, companyActionForm.oraFine])
  const consulenzaBillableMinutes = consulenzaActualMinutes > 0
    ? Math.ceil(consulenzaActualMinutes / consulenzaFrazioneMinuti) * consulenzaFrazioneMinuti
    : Number(companyActionForm.durataMinuti || 0)
  const consulenzaCalculatedAmount = consulenzaVoce && consulenzaBillableMinutes > 0
    ? Math.round((Number(consulenzaVoce.prezzoBase || 0) / 60) * consulenzaBillableMinutes * 100) / 100
    : null
  const tariffarioSelectOptions = allTariffariCatalog
    .filter(t => t.attivo !== 0)
    .map(t => ({ value: t.id, label: t.nome || t.codice || 'Tariffario' }))

  useEffect(() => {
    if (companyAction?.type !== 'CONSULENZA_MDL') return
    setCompanyActionForm(prev => {
      const nextDurata = consulenzaBillableMinutes > 0 ? String(consulenzaBillableMinutes) : prev.durataMinuti
      const nextImporto = consulenzaImportoAutocalc && consulenzaCalculatedAmount != null ? String(consulenzaCalculatedAmount.toFixed(2)) : prev.importo
      if (prev.durataMinuti === nextDurata && prev.importo === nextImporto) return prev
      return { ...prev, durataMinuti: nextDurata, importo: nextImporto }
    })
  }, [companyAction?.type, consulenzaBillableMinutes, consulenzaCalculatedAmount, consulenzaImportoAutocalc])

  const openTariffarioModal = (): void => {
    const current = tariffari[0]
    setTariffarioError(null)
    setTariffarioForm({
      tariffarioId: current?.id || tariffarioSelectOptions[0]?.value || '',
      validoDa: new Date().toISOString().slice(0, 10),
      validoA: '',
      note: '',
    })
    setTariffarioModalOpen(true)
  }

  const handleSaveTariffarioAssociation = async (): Promise<void> => {
    if (!id || !azienda || !permissions.canUpdateAziende()) return
    if (!tariffarioForm.tariffarioId) {
      setTariffarioError('Seleziona un tariffario.')
      return
    }
    setTariffarioSaving(true)
    setTariffarioError(null)
    try {
      const now = new Date().toISOString()
      const activeAssociations = await window.desktopApi.db.query({
        table: 'tariffario_company_associations',
        where: { companyTenantProfileId: id, _isDeleted: 0 }
      }).catch(() => []) as TariffarioCompanyAssociation[]
      const existingSelected = activeAssociations.find(a => a.tariffarioId === tariffarioForm.tariffarioId)
      for (const assoc of activeAssociations.filter(a => a.attivo !== 0 && a.id !== existingSelected?.id)) {
        const updatePayload = { attivo: 0, updatedAt: now }
        await window.desktopApi.db.update({ table: 'tariffario_company_associations', id: assoc.id, data: updatePayload })
        await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'tariffario_company_associations', entityId: assoc.id, payload: updatePayload })
      }
      const payload = {
        id: existingSelected?.id || uuidv4(),
        tenantId: azienda.tenantId || '',
        tariffarioId: tariffarioForm.tariffarioId,
        companyTenantProfileId: id,
        validoDa: tariffarioForm.validoDa,
        validoA: tariffarioForm.validoA || null,
        attivo: 1,
        note: tariffarioForm.note || null,
        createdAt: now,
        updatedAt: now,
      }
      if (existingSelected) {
        await window.desktopApi.db.update({ table: 'tariffario_company_associations', id: existingSelected.id, data: payload })
        await window.desktopApi.sync.enqueue({ type: 'UPDATE', entity: 'tariffario_company_associations', entityId: existingSelected.id, payload })
      } else {
        await window.desktopApi.db.insert({ table: 'tariffario_company_associations', data: payload })
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'tariffario_company_associations', entityId: payload.id, payload })
      }
      const selected = allTariffariCatalog.find(t => t.id === tariffarioForm.tariffarioId)
      const selectedVoci = await window.desktopApi.db.query({
        table: 'tariffario_voci',
        where: { tariffarioAziendaleId: tariffarioForm.tariffarioId, _isDeleted: 0 },
        orderBy: { column: 'ordine', direction: 'ASC' }
      }).catch(() => []) as VoceTariffario[]
      setTariffari(selected ? [selected] : [])
      setTariffarioVoci(selectedVoci.filter(v => v.attivo !== 0 && v.attivo !== false))
      setTariffarioModalOpen(false)
      setDocumentActionMessage('Tariffario aziendale aggiornato e accodato alla sincronizzazione')
    } finally {
      setTariffarioSaving(false)
    }
  }

  const openNominaModal = (): void => {
    setNominaError(null)
    setNominaAttachment(null)
    setNominaForm({
      tipoRuolo: 'MEDICO_COMPETENTE',
      personId: azienda?.medicoCompetenteId || effectiveMedicalProfessionals[0]?.id || '',
      siteId: '',
      dataInizio: new Date().toISOString().slice(0, 10),
      dataScadenza: '',
      note: '',
    })
    setNominaModalOpen(true)
  }

  const handleSaveNomina = async (): Promise<void> => {
    if (!id || !azienda || !permissions.canUpdateAziende()) return
    if (!nominaForm.personId) {
      setNominaError('Seleziona una figura da nominare.')
      return
    }
    setNominaSaving(true)
    setNominaError(null)
    const selected = selectedMedico(nominaForm.personId)
    const personName = selected ? medicoLabel(selected) : nominaForm.personId
    const localNominaId = `local-nomina-${uuidv4()}`
    let savedNominaId = localNominaId
    const patch: Partial<Azienda> = {}
    if (nominaForm.tipoRuolo === 'MEDICO_COMPETENTE') {
      patch.medicoCompetenteId = nominaForm.personId
      patch.medicoCompetenteNome = personName
    }
    if (nominaForm.tipoRuolo === 'RSPP') {
      patch.rsppId = nominaForm.personId
      patch.rsppNome = personName
    }
    try {
      if (accessToken) {
        const response = await axios.post(`${API_BASE}/api/v1/clinica/nomine-ruolo`, {
          companyTenantProfileId: id,
          siteId: nominaForm.siteId || undefined,
          personId: nominaForm.personId,
          tipoRuolo: nominaForm.tipoRuolo,
          dataInizio: nominaForm.dataInizio,
          dataScadenza: nominaForm.dataScadenza || undefined,
          note: nominaForm.note || undefined,
        }, { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 30000 })
        const responseData = response.data as { id?: string; data?: { id?: string } }
        savedNominaId = responseData.id || responseData.data?.id || localNominaId
      }
    } catch {
      await window.desktopApi.sync.enqueue({
        type: 'CREATE',
        entity: 'nominaRuolo',
        entityId: localNominaId,
        payload: { companyTenantProfileId: id, ...nominaForm },
      })
    }
    const localNomina: NominaRuolo = {
      id: savedNominaId,
      tenantId: azienda.tenantId || null,
      companyTenantProfileId: id,
      siteId: nominaForm.siteId || null,
      personId: nominaForm.personId,
      tipoRuolo: nominaForm.tipoRuolo,
      stato: 'ATTIVA',
      dataInizio: nominaForm.dataInizio,
      dataScadenza: nominaForm.dataScadenza || null,
      note: nominaForm.note || null,
      firstName: selected?.firstName || null,
      lastName: selected?.lastName || null,
      nome: personName,
    }
    await window.desktopApi.db.insert({ table: 'nomine_ruolo', data: { ...localNomina } }).catch(() => undefined)
    if (nominaAttachment) {
      const saved = await saveDocumentBlob(nominaAttachment, nominaAttachment.name)
      const doc = {
        id: uuidv4(),
        tenantId: azienda.tenantId || '',
        companyTenantProfileId: id,
        visitaId: null,
        nome: nominaAttachment.name,
        tipo: 'NOMINA',
        dimensione: saved.dimensione,
        localPath: saved.localPath,
        serverUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await window.desktopApi.db.insert({ table: 'allegati', data: doc })
      setDocumenti(prev => [doc, ...prev])
    }
    setNomineRuolo(prev => [
      localNomina,
      ...prev.filter(n => !(n.tipoRuolo === localNomina.tipoRuolo && n.personId === localNomina.personId && n.companyTenantProfileId === id))
    ])
    await handleSaveCompanyMdlField(patch)
    setNominaSaving(false)
    setNominaModalOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  if (!azienda) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Azienda non trovata</p>
        <button onClick={() => navigate(companyBackTarget)} className="mt-3 text-sm text-teal-600 hover:underline">
          Torna alle aziende
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(companyBackTarget)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 font-heading truncate">
            {azienda.ragioneSociale || 'Azienda'}
          </h1>
          <p className="text-xs text-gray-500">
            {azienda.settore && `${azienda.settore} · `}
            {azienda.status === 'ACTIVE' ? 'Attiva' : azienda.status}
          </p>
        </div>
        {dirty && permissions.canUpdateAziende() && (
          <div className="flex items-center gap-2">
            {saveError && (
              <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">{saveError}</p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salva'}
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dati')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dati'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Dati Azienda
        </button>
        <button
          onClick={() => setActiveTab('sicurezza')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'sicurezza'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Sicurezza
          {protocolli.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
              {protocolli.length}
            </span>
          )}
        </button>
        {canViewBilling && (
          <button
            onClick={() => setActiveTab('movimenti')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'movimenti'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Fatturazione
            {movimenti.length > 0 && (
              <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">
                {movimenti.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('documenti')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'documenti'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Documenti
          {documenti.length > 0 && (
            <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">{documenti.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'dati' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Company Details Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                Dati Azienda
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="P.IVA" value={azienda.piva} icon={FileText} mono />
                <InfoRow label="Codice Fiscale" value={azienda.codiceFiscale} icon={FileText} mono />
                <InfoRow label="ATECO" value={azienda.codiceAteco} mono />
                <InfoRow label="SDI" value={azienda.sdi} mono />
                <InfoRow label="Email" value={azienda.emailGenerale} icon={Mail} />
                <InfoRow label="Telefono" value={azienda.telefonoGenerale} icon={Phone} />
                <InfoRow label="PEC" value={azienda.pec} icon={Mail} />
              </div>
              {azienda.sedeLegaleCitta && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    Sede legale: {[azienda.sedeLegaleIndirizzo, azienda.sedeLegaleCap, azienda.sedeLegaleCitta, azienda.sedeLegaleProvincia ? `(${azienda.sedeLegaleProvincia})` : null].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Sedi */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-600" />
                  Sedi ({sites.length})
                </span>
                {!showAddSite && !editingSiteId && permissions.canUpdateAziende() && (
                  <button
                    onClick={() => setShowAddSite(true)}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] text-teal-600 hover:bg-teal-50 border border-teal-200 rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Aggiungi
                  </button>
                )}
              </h3>

              {/* Add site form */}
              {showAddSite && (
                <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                  <input
                    type="text"
                    value={siteForm.siteName}
                    onChange={e => setSiteForm(p => ({ ...p, siteName: e.target.value }))}
                    placeholder="Nome sede *"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={siteForm.indirizzo}
                    onChange={e => setSiteForm(p => ({ ...p, indirizzo: e.target.value }))}
                    placeholder="Indirizzo"
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={siteForm.citta}
                      onChange={e => setSiteForm(p => ({ ...p, citta: e.target.value }))}
                      placeholder="Città"
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      value={siteForm.cap}
                      onChange={e => setSiteForm(p => ({ ...p, cap: e.target.value }))}
                      placeholder="CAP"
                      className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="text"
                      value={siteForm.provincia}
                      onChange={e => setSiteForm(p => ({ ...p, provincia: e.target.value.toUpperCase().slice(0, 2) }))}
                      placeholder="PR"
                      className="w-14 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={handleCancelSiteEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                      Annulla
                    </button>
                    <button
                      onClick={handleSaveSite}
                      disabled={savingSite || !siteForm.siteName.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      Salva
                    </button>
                  </div>
                </div>
              )}

              {sites.length === 0 && !showAddSite ? (
                <p className="text-xs text-gray-400">Nessuna sede registrata</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sites.map(s => (
                    <div key={s.id}>
                      {editingSiteId === s.id ? (
                        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                          <input
                            type="text"
                            value={siteForm.siteName}
                            onChange={e => setSiteForm(p => ({ ...p, siteName: e.target.value }))}
                            placeholder="Nome sede *"
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={siteForm.indirizzo}
                            onChange={e => setSiteForm(p => ({ ...p, indirizzo: e.target.value }))}
                            placeholder="Indirizzo"
                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={siteForm.citta}
                              onChange={e => setSiteForm(p => ({ ...p, citta: e.target.value }))}
                              placeholder="Città"
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            <input
                              type="text"
                              value={siteForm.cap}
                              onChange={e => setSiteForm(p => ({ ...p, cap: e.target.value }))}
                              placeholder="CAP"
                              className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                            <input
                              type="text"
                              value={siteForm.provincia}
                              onChange={e => setSiteForm(p => ({ ...p, provincia: e.target.value.toUpperCase().slice(0, 2) }))}
                              placeholder="PR"
                              className="w-14 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button onClick={handleCancelSiteEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
                              Annulla
                            </button>
                            <button
                              onClick={handleSaveSite}
                              disabled={savingSite || !siteForm.siteName.trim()}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" />
                              Salva
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="group flex items-start gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-transparent hover:border-gray-200">
                          <MapPin className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{s.siteName || 'Sede'}</p>
                            {(s.indirizzo || s.citta) && (
                              <p className="text-[10px] text-gray-500 truncate">
                                {[s.indirizzo, s.citta, s.provincia ? `(${s.provincia})` : null].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                          {permissions.canUpdateAziende() && (
                          <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                            <button
                              onClick={() => handleStartEditSite(s)}
                              className="p-1 text-gray-400 hover:text-teal-600 rounded"
                              title="Modifica"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => { void handleDeleteSite(s.id) }}
                              className={`p-1 rounded transition-colors ${deletingSiteId === s.id
                                  ? 'text-red-600 bg-red-50'
                                  : 'text-gray-400 hover:text-red-500'
                                }`}
                              title={deletingSiteId === s.id ? 'Conferma eliminazione' : 'Elimina'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lavoratori */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  Lavoratori ({lavoratori.length})
                </span>
                {permissions.canCreatePazienti() && (
                <button
                  onClick={() => navigate(`/pazienti/nuovo?companyId=${id}&companyName=${encodeURIComponent(azienda?.ragioneSociale || '')}`, { state: { from: currentRoute } })}
                  className="flex items-center gap-1 px-2 py-0.5 text-[11px] bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  Aggiungi
                </button>
                )}
              </h3>
              {lavoratori.length === 0 ? (
                <p className="text-xs text-gray-400">Nessun lavoratore associato</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {lavoratori.slice(0, 20).map(l => (
                    <button
                      key={l.id}
                      onClick={() => navigate(`/pazienti/${l.id}`, { state: { from: currentRoute } })}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-between border border-transparent hover:border-gray-200"
                    >
                      <span className="truncate font-medium">{l.lastName} {l.firstName}</span>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">{l.taxCode?.slice(0, 6)}</span>
                    </button>
                  ))}
                  {lavoratori.length > 20 && (
                    <p className="text-[10px] text-gray-400 text-center pt-1 col-span-2">
                      + altri {lavoratori.length - 20}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-teal-600" />
                Note
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Note Operative</label>
                  <textarea
                    rows={4}
                    value={noteOperative}
                    onChange={(e) => { setNoteOperative(e.target.value); setDirty(true) }}
                    disabled={!permissions.canUpdateAziende()}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Note operative per la giornata di visite..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Note Commerciali</label>
                  <textarea
                    rows={4}
                    value={noteCommerciali}
                    onChange={(e) => { setNoteCommerciali(e.target.value); setDirty(true) }}
                    disabled={!permissions.canUpdateAziende()}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Note commerciali..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Note Interne</label>
                  <textarea
                    rows={4}
                    value={noteInterne}
                    onChange={(e) => { setNoteInterne(e.target.value); setDirty(true) }}
                    disabled={!permissions.canUpdateAziende()}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    placeholder="Note interne riservate..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sicurezza' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <button type="button" onClick={() => setMdlServicesCollapsed(prev => !prev)} className="flex items-center gap-2 text-left text-sm font-semibold text-gray-900">
                  <Briefcase className="w-4 h-4 text-teal-600" />
                  <span>Servizi Medicina del Lavoro</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${mdlServicesCollapsed ? '' : 'rotate-180'}`} />
                </button>
                <p className="mt-1 text-xs text-gray-500">Nomine, sopralluoghi, DVR, consulenze e documenti periodici allineati alla webapp.</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ['MC', azienda.medicoCompetenteId || azienda.medicoCompetenteNome],
                  ['RSPP', azienda.rsppId || azienda.rsppNome || sites.some(s => s.rsppId)],
                  ['DVR', azienda.dvr || sites.some(s => s.dvr)],
                  ['Sopralluoghi', azienda.ultimoSopralluogo || azienda.prossimoSopralluogo || sites.some(s => s.ultimoSopralluogo || s.prossimoSopralluogo)],
                ].map(([label, active]) => (
                  <span key={String(label)} className={`rounded-full px-2 py-1 text-[10px] font-semibold ${active ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                    {String(label)}
                  </span>
                ))}
              </div>
            </div>
            {documentActionMessage && (
              <div className="mb-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-700">{documentActionMessage}</div>
            )}
            {!mdlServicesCollapsed && (
              <>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 lg:col-span-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Medico competente</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{azienda.medicoCompetenteNome || 'Non nominato'}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Inizio nomina</p>
                    <p className="truncate text-xs text-gray-700">{formatDate(activeMcNomina?.dataInizio)}</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Scadenza</p>
                    <p className="truncate text-xs text-gray-700">{formatDate(activeMcNomina?.dataScadenza)}</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Medici coordinati</p>
                    <p className="truncate text-xs text-gray-700">{mediciCoordinati || 'Nessun coordinato'}</p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400">Successore</p>
                    <p className="truncate text-xs text-gray-700">{azienda.medicoSuccessoreNome || (activeSuccessorNomina ? nominaName(activeSuccessorNomina) : 'Non indicato')}</p>
                  </div>
                </div>
                {activeMcNomina?.dataScadenza && !azienda.medicoSuccessoreId && !activeSuccessorNomina && (
                  <div className="mt-2 rounded-lg border border-teal-100 bg-white px-2 py-1.5 text-[11px] text-teal-700">
                    Auto-rinnovo attivo alla scadenza se non viene nominato un successore.
                  </div>
                )}
                {permissions.canUpdateAziende() && (
                  <button type="button" onClick={openNominaModal} className="mt-2 w-full rounded-lg border border-teal-200 px-2 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
                    Gestisci nomine MC, coordinati e successore
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">RSPP</p>
                <p className="mt-1 text-sm text-gray-700">{azienda.rsppNome || (selectedMedico(azienda.rsppId) ? medicoLabel(selectedMedico(azienda.rsppId)!) : 'Non nominato')}</p>
                {permissions.canUpdateAziende() && (
                  <button type="button" onClick={() => {
                    setNominaForm(prev => ({ ...prev, tipoRuolo: 'RSPP', personId: azienda.rsppId || effectiveRsppOptions[0]?.id || '' }))
                    setNominaModalOpen(true)
                  }} className="mt-2 w-full rounded-lg border border-teal-200 px-2 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
                    Nomina RSPP
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {[
                { key: 'nomine', title: 'Nomine Figure di Sicurezza', icon: UserPlus, tone: 'teal', body: 'Medico competente, coordinati, RSPP e successori.', actions: [['Gestisci nomina', 'NOMINA', UserPlus]] },
                { key: 'dvr', title: 'DVR - Documento di Valutazione dei Rischi', icon: ClipboardList, tone: 'violet', body: azienda.dvr || 'Gestisci nuovo DVR, revisione, rischi e allegato PDF.', actions: [['Nuovo DVR', 'DVR', ClipboardList]] },
                { key: 'sopralluoghi', title: 'Sopralluoghi', icon: ClipboardCheck, tone: 'blue', body: azienda.prossimoSopralluogo ? `Prossimo: ${new Date(azienda.prossimoSopralluogo).toLocaleDateString('it-IT')}` : 'Programma sopralluogo MC/RSPP con esecutore e prescrizioni.', actions: [['Programma sopralluogo', 'SOPRALLUOGO', ClipboardCheck]] },
                { key: 'consulenze', title: 'Consulenze MDL', icon: UserCheck, tone: 'emerald', body: 'Registra consulenza, professionista, durata, importo e note operative.', actions: [['Nuova consulenza', 'CONSULENZA_MDL', UserCheck]] },
                { key: 'tariffario', title: 'Tariffari MDL', icon: Receipt, tone: 'amber', body: tariffari.length > 0 ? `${tariffari.length} tariffari associati` : 'Nessun tariffario aziendale associato.', actions: [] },
                { key: 'documentiPeriodici', title: 'Documenti periodici', icon: FileSignature, tone: 'amber', body: 'Verbale riunione periodica, risultati anonimi collettivi e Allegato 3B.', actions: [['Risultati anonimi collettivi', 'RISULTATI_ANONIMI_COLLETTIVI', FileDown], ['Riunione periodica', 'VERBALE_RIUNIONE_PERIODICA', FileSignature], ['Allegato 3B', 'ALLEGATO_3B', FileText]] },
              ].map(section => {
                const expanded = expandedMdlSections[section.key] ?? true
                const toneClass = section.tone === 'violet' ? 'bg-violet-50 text-violet-700 border-violet-100'
                  : section.tone === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-100'
                    : section.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : section.tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-teal-50 text-teal-700 border-teal-100'
                const Icon = section.icon
                return (
                  <section key={section.key} className={`rounded-2xl border ${toneClass}`}>
                    <button type="button" onClick={() => setExpandedMdlSections(prev => ({ ...prev, [section.key]: !expanded }))} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate text-xs font-semibold uppercase tracking-wide">{section.title}</span>
                      </span>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <div className="border-t border-white/70 bg-white px-4 py-3">
                        <p className="mb-3 text-xs text-gray-500">{section.body}</p>
                        {section.key === 'nomine' && (
                          <div className="mb-3 grid gap-2">
                            {nomineAttive.length === 0 ? <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessuna nomina attiva disponibile offline</p> : nomineAttive.slice(0, 4).map(n => (
                              <div key={n.id || `${n.tipoRuolo}-${n.personId}`} className="rounded-lg border border-gray-100 px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-800">{(n.tipoRuolo || '').replace(/_/g, ' ')}</p>
                                <p className="text-gray-500">{n.nome || [n.firstName, n.lastName].filter(Boolean).join(' ') || 'Persona non indicata'}{n.dataScadenza ? ` · scade ${new Date(n.dataScadenza).toLocaleDateString('it-IT')}` : ''}</p>
                              </div>
                            ))}
                            {serviceDocumentList('NOMINA')}
                          </div>
                        )}
                        {section.key === 'dvr' && (
                          <div className="mb-3 grid gap-2 sm:grid-cols-2">
                            {dvrRows.length > 0 && dvrRows.slice(0, 4).map(row => (
                              <div key={row.id} className="rounded-lg border border-violet-100 bg-violet-50/30 px-3 py-2 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-800">{row.tipoDVR || 'DVR'} · {row.dataEsecuzione ? new Date(row.dataEsecuzione).toLocaleDateString('it-IT') : 'Data non indicata'}</p>
                                    <p className="truncate text-gray-500">{row.effettuatoDa || 'Esecutore non indicato'}{row.documentoNome ? ` · ${row.documentoNome}` : ''}</p>
                                  </div>
                                  {rowDocumentActions(row.documentoNome, row.documentoUrl, 'DVR')}
                                </div>
                              </div>
                            ))}
                            {serviceDocumentList('DVR')}
                            {sites.length === 0 && dvrRows.length === 0 ? <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessuna sede aziendale</p> : sites.map(site => (
                              <div key={site.id} className="rounded-lg border border-gray-100 px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-800">{site.siteName || site.indirizzo || 'Sede'}</p>
                                <p className="text-gray-500">{site.dvr || 'DVR non caricato'}{site.ultimoSopralluogo ? ` · ultimo sopralluogo ${new Date(site.ultimoSopralluogo).toLocaleDateString('it-IT')}` : ''}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {section.key === 'sopralluoghi' && (
                          <div className="mb-3 grid gap-2 sm:grid-cols-2">
                            {sopralluoghiRows.length > 0 && sopralluoghiRows.slice(0, 4).map(row => (
                              <div key={row.id} className="rounded-lg border border-blue-100 bg-blue-50/30 px-3 py-2 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-800">{row.dataEsecuzione ? new Date(row.dataEsecuzione).toLocaleDateString('it-IT') : 'Sopralluogo'}</p>
                                    <p className="truncate text-gray-500">{row.valutazione || row.esito || 'Dettagli non indicati'}{row.documentoNome ? ` · ${row.documentoNome}` : ''}</p>
                                  </div>
                                  {rowDocumentActions(row.documentoNome, row.documentoUrl, 'SOPRALLUOGO')}
                                </div>
                              </div>
                            ))}
                            {serviceDocumentList('SOPRALLUOGO')}
                            {(azienda.ultimoSopralluogo || azienda.prossimoSopralluogo || sites.some(s => s.ultimoSopralluogo || s.prossimoSopralluogo)) ? sites.map(site => (
                              <div key={site.id} className="rounded-lg border border-gray-100 px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-800">{site.siteName || site.indirizzo || 'Sede'}</p>
                                <p className="text-gray-500">Ultimo: {site.ultimoSopralluogo ? new Date(site.ultimoSopralluogo).toLocaleDateString('it-IT') : '—'} · Prossimo: {site.prossimoSopralluogo ? new Date(site.prossimoSopralluogo).toLocaleDateString('it-IT') : '—'}</p>
                              </div>
                            )) : sopralluoghiRows.length === 0 ? <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessun sopralluogo disponibile offline</p> : null}
                          </div>
                        )}
                        {section.key === 'consulenze' && (
                          <div className="mb-3 grid gap-2">
                            {consulenzeRows.length === 0 ? <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessuna consulenza MDL disponibile offline</p> : consulenzeRows.slice(0, 4).map(row => (
                              <div key={row.id} className="rounded-lg border border-emerald-100 bg-emerald-50/30 px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-800">{row.oggetto || 'Consulenza MDL'}</p>
                                <p className="text-gray-500">{row.data ? new Date(row.data).toLocaleDateString('it-IT') : 'Data non indicata'}{row.durataMinuti ? ` · ${row.durataMinuti} min` : ''}{row.importo ? ` · € ${Number(row.importo).toFixed(2)}` : ''}</p>
                              </div>
                            ))}
                            {serviceDocumentList('CONSULENZA_MDL')}
                          </div>
                        )}
                        {section.key === 'documentiPeriodici' && (
                          <div className="mb-3 grid gap-2">
                            {allegati3BRows.length === 0 ? <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessun Allegato 3B disponibile offline</p> : allegati3BRows.slice(0, 4).map(row => (
                              <div key={row.id} className="rounded-lg border border-amber-100 bg-amber-50/30 px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-800">Allegato 3B · {row.anno}</p>
                                <p className="text-gray-500">{row.stato || 'DA_COMPILARE'} · {row.totVisiteEffettuate || 0} visite · {row.totLavoratoriSorvegliati || 0} lavoratori</p>
                              </div>
                            ))}
                            {serviceDocumentList('ALLEGATO_3B')}
                            {serviceDocumentList('VERBALE_RIUNIONE_PERIODICA')}
                            {serviceDocumentList('RISULTATI_ANONIMI_COLLETTIVI')}
                          </div>
                        )}
                        {section.key === 'tariffario' && (
                          <div className="mb-3 grid gap-2">
                            {tariffari.length === 0 ? <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessun tariffario associato</p> : tariffari.slice(0, 3).map(t => (
                              <div key={t.id} className="rounded-lg border border-amber-100 bg-amber-50/40 px-3 py-2 text-xs">
                                <p className="font-semibold text-gray-800">{t.nome || t.codice || 'Tariffario'}</p>
                                <p className="text-gray-500">{getTariffarioVoci(t.id).length} voci attive{t.validoDa ? ` · da ${new Date(t.validoDa).toLocaleDateString('it-IT')}` : ''}</p>
                                <div className="mt-2 grid gap-1">
                                  {getTariffarioVoci(t.id).slice(0, 6).map((voce, index) => (
                                    <div key={`${voce.tipo}-${voce.nome || index}`} className="flex items-center justify-between gap-2 rounded-md bg-white/75 px-2 py-1">
                                      <span className="truncate text-gray-700">{voce.nome || voce.tipo}</span>
                                      <span className="shrink-0 font-semibold text-amber-700">€ {Number(voce.prezzoBase || 0).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {permissions.canUpdateAziende() && (
                              <button
                                type="button"
                                onClick={openTariffarioModal}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50"
                              >
                                <Receipt className="h-3.5 w-3.5" />
                                {tariffari.length > 0 ? 'Cambia tariffario aziendale' : 'Associa tariffario aziendale'}
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {section.actions.map(([label, type, ActionIcon]) => (
                            <button
                              key={String(type)}
                              type="button"
                              disabled={!permissions.canUpdateAziende()}
                              onClick={() => type === 'NOMINA' ? openNominaModal() : openCompanyAction(String(label), String(type))}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-teal-50 disabled:opacity-50"
                            >
                              <ActionIcon className="h-3.5 w-3.5 text-teal-600" />
                              <span>{String(label)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-600" />
                Sorveglianza Sanitaria
              </h2>
              {permissions.canCreateVisite() && (
                <button
                  onClick={() => navigate(`/visite/nuova?from=${encodeURIComponent(`/aziende/${id}?tab=sicurezza`)}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  Nuova visita
                </button>
              )}
            </div>

            {lavoratori.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">Nessun lavoratore associato</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Lavoratore</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Mansione</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Protocollo</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Accertamenti</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Ultima visita</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Prossima</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {lavoratori.map(l => {
                      const workerMansioni = lavoratoriMansioni.filter(m => m.personId === l.id)
                      const mansioneNames = workerMansioni.map(m => mansioniCatalog.find(mc => mc.id === m.mansioneId)?.nome).filter(Boolean) as string[]
                      const workerProtocols = protocolli.filter(p =>
                        p.id === l.protocolloSanitarioId ||
                        workerMansioni.some(m => m.mansioneId && m.mansioneId === p.mansioneId)
                      )
                      const protocolPrestazioni = workerProtocols.flatMap(p => {
                        const prestazioni = normalizeProtocolloPrestazioni(protocolloPrestazioni.get(p.id) || [])
                        return prestazioni.map(item => ({ ...item, protocolloNome: p.nome }))
                      })
                      const nextScadenza = scadenze.find(s => s.personId === l.id && !s.eseguita)
                      const lastVisit = companyVisits.find(v => v.personId === l.id && v.stato !== 'ANNULLATA')
                      return (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <button onClick={() => navigate(`/pazienti/${l.id}`, { state: { from: currentRoute } })} className="text-left">
                              <p className="font-medium text-gray-800">{l.lastName} {l.firstName}</p>
                              <p className="font-mono text-[10px] text-gray-400">{l.taxCode || '—'}</p>
                            </button>
                          </td>
                          <td className="px-3 py-2 text-gray-600">{mansioneNames.length > 0 ? mansioneNames.join(', ') : nextScadenza?.mansione || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{workerProtocols.length > 0 ? workerProtocols.map(p => p.nome || 'Protocollo').join(', ') : '—'}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {protocolPrestazioni.length > 0 ? (
                              <div className="space-y-0.5">
                                {(expandedAccertamenti[l.id] ? protocolPrestazioni : protocolPrestazioni.slice(0, 3)).map((p, idx) => (
                                  <p key={`${p.prestazioneId || idx}`} className="truncate max-w-48">{p.prestazioneNome || 'Accertamento'} <span className="text-gray-400">({formatProtocolloPeriodicity(p.periodicitaMesi)})</span></p>
                                ))}
                                {protocolPrestazioni.length > 3 && (
                                  <button type="button" onClick={() => setExpandedAccertamenti(prev => ({ ...prev, [l.id]: !prev[l.id] }))} className="text-[10px] font-medium text-teal-700 hover:underline">
                                    {expandedAccertamenti[l.id] ? 'Mostra meno' : `+${protocolPrestazioni.length - 3} altri`}
                                  </button>
                                )}
                              </div>
                            ) : nextScadenza?.prestazioneNome || '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {lastVisit?.dataOra ? new Date(lastVisit.dataOra).toLocaleDateString('it-IT') : '—'}
                            {lastVisit?.prestazioneNome && <p className="text-[10px] text-gray-400 truncate max-w-32">{lastVisit.prestazioneNome}</p>}
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            {nextScadenza?.dataScadenza ? new Date(nextScadenza.dataScadenza).toLocaleDateString('it-IT') : '—'}
                            {nextScadenza?.periodicitaMesi ? <span className="ml-1 text-gray-400">({formatProtocolloPeriodicity(nextScadenza.periodicitaMesi)})</span> : null}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button onClick={() => navigate(`/pazienti/${l.id}`, { state: { from: currentRoute } })} className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">Apri</button>
                              {permissions.canCreateVisite() && (
                                <>
                                  <button onClick={() => openBookingModal(l, nextScadenza)} className="rounded-lg border border-teal-200 px-2 py-1 text-[11px] text-teal-700 hover:bg-teal-50"><CalendarPlus className="inline h-3 w-3" /> App.</button>
                                  <button onClick={() => openDirectVisitModal(l, nextScadenza)} className="rounded-lg bg-teal-600 px-2 py-1 text-[11px] text-white hover:bg-teal-700"><Stethoscope className="inline h-3 w-3" /> Visita</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
            <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-700">Protocolli sanitari</p>
                </div>
                {protocolli.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400">Nessun protocollo sanitario disponibile offline per questa azienda.</p>
                ) : (
                  <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                    {protocolli.map(protocollo => {
                      const prestazioni = normalizeProtocolloPrestazioni(protocolloPrestazioni.get(protocollo.id) || [])
                      return (
                        <div key={protocollo.id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{protocollo.nome || 'Protocollo'}</p>
                              {protocollo.mansioneNome && (
                                <p className="text-[10px] text-gray-500 mt-0.5">Mansione: {protocollo.mansioneNome}</p>
                              )}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${protocollo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {protocollo.isActive ? 'Attivo' : 'Non attivo'}
                            </span>
                          </div>
                          {prestazioni.length > 0 ? (
                            <div className="mt-3 space-y-1.5">
                              {prestazioni.map((prestazione, index) => (
                                <div key={`${protocollo.id}-${prestazione.prestazioneId || index}`} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="text-gray-700 truncate">{prestazione.prestazioneNome}</span>
                                  <span className="text-gray-400 shrink-0">{formatProtocolloPeriodicity(prestazione.periodicitaMesi)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-gray-400">Nessuna prestazione associata</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
          </div>

        </div>
      )}

      {/* Movimenti Contabili Tab */}
      {activeTab === 'movimenti' && (
        <div className="space-y-4">
          {/* Summary cards */}
          {movimenti.length > 0 && (() => {
            const totDaFatturare = movimenti.filter(m => m.stato === 'DA_FATTURARE').reduce((s, m) => s + (m.importo || 0), 0)
            const totPagato = movimenti.filter(m => m.stato === 'PAGATO').reduce((s, m) => s + (m.importo || 0), 0)
            const totFatturato = movimenti.filter(m => m.stato === 'FATTURATO').reduce((s, m) => s + (m.importo || 0), 0)
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[10px] text-amber-600 font-medium uppercase tracking-wider mb-1">Da Fatturare</p>
                  <p className="text-lg font-bold text-amber-800">€ {totDaFatturare.toFixed(2)}</p>
                  <p className="text-xs text-amber-600">{movimenti.filter(m => m.stato === 'DA_FATTURARE').length} movimenti</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider mb-1">Fatturati</p>
                  <p className="text-lg font-bold text-blue-800">€ {totFatturato.toFixed(2)}</p>
                  <p className="text-xs text-blue-600">{movimenti.filter(m => m.stato === 'FATTURATO').length} movimenti</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-[10px] text-green-600 font-medium uppercase tracking-wider mb-1">Incassati</p>
                  <p className="text-lg font-bold text-green-800">€ {totPagato.toFixed(2)}</p>
                  <p className="text-xs text-green-600">{movimenti.filter(m => m.stato === 'PAGATO').length} movimenti</p>
                </div>
              </div>
            )
          })()}

          {/* Movements list */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                Fatturazione
              </h3>
              <div className="flex items-center gap-1">
                {[
                  ['tutti', 'Tutti'],
                  ['bozza', 'Bozze'],
                  ['da_fatturare', 'Da fatturare'],
                  ['fatturato', 'Fatturati'],
                  ['pagato', 'Pagati'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMovimentiTab(key as typeof movimentiTab)}
                    className={`rounded-lg px-2 py-1 text-[11px] ${movimentiTab === key ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {visibleMovimenti.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nessun movimento contabile</p>
                <p className="text-xs text-gray-300 mt-1">I movimenti vengono generati automaticamente al completamento delle visite</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Data</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Descrizione</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Stato</th>
                      <th className="text-right px-4 py-2.5 text-gray-500 font-medium">Importo</th>
                      <th className="text-left px-4 py-2.5 text-gray-500 font-medium">Fattura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleMovimenti.map((m) => {
                      const statoInfo = STATO_MOV_LABELS[m.stato || ''] || { label: m.stato || '—', cls: 'bg-gray-100 text-gray-500' }
                      const dataFmt = m.dataMovimento
                        ? new Date(m.dataMovimento).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
                        : '—'
                      return (
                        <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-300" />
                              {dataFmt}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 max-w-[200px] truncate">{m.descrizione || '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statoInfo.cls}`}>
                              {m.stato === 'PAGATO' && <CheckCircle2 className="w-3 h-3" />}
                              {m.stato === 'DA_FATTURARE' && <AlertCircle className="w-3 h-3" />}
                              {statoInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-teal-700 whitespace-nowrap">
                            € {Number(m.importo || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-gray-400">{m.riferimentoFattura || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'documenti' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FolderOpen className="h-4 w-4 text-teal-600" />
                Documenti
              </h3>
            </div>
            {documenti.length === 0 ? (
              <div className="py-12 text-center">
                <FolderOpen className="mx-auto mb-2 h-8 w-8 text-gray-200" />
                <p className="text-sm text-gray-400">Nessun documento aziendale offline</p>
              </div>
            ) : (
              <div className="space-y-3 p-4">
                {Object.entries(documentGroups).map(([tipo, docs]) => {
                  const style = documentGroupStyle(tipo)
                  const expanded = expandedDocumentGroups[tipo] ?? true
                  return (
                    <section key={tipo} className={`overflow-hidden rounded-2xl border ${style.border}`}>
                      <button
                        type="button"
                        onClick={() => setExpandedDocumentGroups(prev => ({ ...prev, [tipo]: !expanded }))}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left ${style.bg}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${style.icon}`} />
                          <span>
                            <span className={`block text-xs font-semibold uppercase tracking-wide ${style.text}`}>{tipo.replace(/_/g, ' ')}</span>
                            <span className="text-[11px] text-gray-500">{docs.length} document{docs.length === 1 ? 'o' : 'i'}</span>
                          </span>
                        </span>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      {expanded && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-white">
                              <tr className="border-b border-gray-100">
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500">Nome</th>
                                <th className="px-4 py-2.5 text-left font-medium text-gray-500">Data</th>
                                <th className="px-4 py-2.5 text-right font-medium text-gray-500">Azioni</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {docs.map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2.5 font-medium text-gray-800">{doc.nome}</td>
                                  <td className="px-4 py-2.5 text-gray-500">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('it-IT') : '-'}</td>
                                  <td className="px-4 py-2.5 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <button type="button" title="Apri" aria-label="Apri documento" onClick={() => { void openCompanyDocument(doc) }} className="rounded-lg border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50">
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                      <button type="button" title="Download" aria-label="Scarica documento" onClick={() => { void downloadCompanyDocument(doc) }} className="rounded-lg border border-teal-200 p-1.5 text-teal-700 hover:bg-teal-50">
                                        <FileDown className="h-3.5 w-3.5" />
                                      </button>
                                      {permissions.canUpdateAziende() && (
                                        <button type="button" title="Elimina" aria-label="Elimina documento" onClick={() => { void deleteCompanyDocument(doc) }} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {booking && (() => {
        const accertamenti = ensureMdlMainAccertamento(getWorkerAccertamenti(booking.worker), booking.prestazioneId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Programma visite mediche</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>1 persona selezionata</span>
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700">
                      {`${booking.worker.lastName || ''} ${booking.worker.firstName || ''}`.trim() || 'Lavoratore'}
                    </span>
                    <span className="font-mono text-[10px] text-teal-600">{booking.worker.taxCode || 'CF non disponibile'}</span>
                    {booking.scadenza?.dataScadenza && <span>Scadenza {new Date(booking.scadenza.dataScadenza).toLocaleDateString('it-IT')}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => setBooking(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid min-h-0 flex-1 md:grid-cols-[17rem_1fr]">
                <aside className="space-y-3 overflow-y-auto border-b border-gray-100 p-4 md:border-b-0 md:border-r">
                  <label className="block rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-xs font-medium text-teal-800">
                    Medico competente
                    <ElegantSelect value={booking.medicoId} onChange={medicoId => { setBooking(prev => prev ? { ...prev, medicoId } : prev); setBookingActivePersonSelected(true) }} options={medicalSelectOptions} className="mt-2" />
                  </label>
                  <div className="rounded-xl border border-gray-100 bg-white p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Prestazione principale</p>
                    <p className="mt-1 text-xs font-medium text-gray-800">Visita Medica del Lavoro</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
                      <span className="shrink-0">Durata impostata</span>
                      <ElegantSelect
                        value={String(booking.durata)}
                        onChange={durata => setBooking(prev => prev ? { ...prev, durata: Number(durata || 10) } : prev)}
                        options={[5, 10, 15, 20, 30, 45, 60].map(value => ({ value: String(value), label: `${value} min` }))}
                        className="min-w-24 flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium text-gray-700">Accertamenti da collegare</p>
                    <div className="space-y-1.5">
                      {accertamenti.length === 0 ? (
                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">Nessun accertamento associato al protocollo.</p>
                      ) : accertamenti.map((acc, index) => {
                        const isMain = !!acc.prestazioneId && acc.prestazioneId === booking.prestazioneId
                        return (
                        <label key={`${acc.prestazioneId || index}`} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${isMain ? 'border-teal-200 bg-teal-50/60' : 'border-gray-100'}`}>
                          <input
                            type="checkbox"
                            checked={isMain || (!!acc.prestazioneId && booking.selectedAccertamenti.includes(acc.prestazioneId))}
                            disabled={isMain}
                            onChange={event => acc.prestazioneId && toggleBookingAccertamento('booking', acc.prestazioneId, event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 disabled:opacity-60"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-gray-700">{acc.prestazioneNome || 'Accertamento'}</span>
                            <span className="text-[10px] text-gray-400">{acc.protocolloNome || 'Protocollo'} · {acc.obbligatoria ? formatProtocolloPeriodicity(acc.periodicitaMesi) : 'facoltativo'}</span>
                            {isMain && (
                              <span className="mt-2 block">
                                <ElegantSelect value={booking.tipoVisitaMDL} onChange={tipoVisitaMDL => setBooking(prev => prev ? { ...prev, tipoVisitaMDL } : prev)} options={visitTypeOptions} />
                              </span>
                            )}
                          </span>
                        </label>
                      )})}
                    </div>
                  </div>
                </aside>
                <section className="flex min-h-0 flex-col overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
                    <div className="flex items-center gap-1">
                      {(['all', 'morning', 'afternoon'] as const).map(range => (
                        <button key={range} type="button" onClick={() => setBookingTimeRange(range)} className={`rounded-lg px-2 py-1 text-[11px] font-medium ${bookingTimeRange === range ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {range === 'all' ? 'Tutto' : range === 'morning' ? 'Mattina' : 'Pomeriggio'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setBookingWeekStart(prev => addDays(prev, -7))} className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50">‹</button>
                      <span className="text-xs font-semibold text-gray-700">
                        {bookingWeekDays[0].toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} - {bookingWeekDays[5].toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      </span>
                      <button type="button" onClick={() => setBookingWeekStart(prev => addDays(prev, 7))} className="rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50">›</button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    <table className="w-full min-w-[760px] border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-white">
                        <tr>
                          <th className="w-14 border-b border-r border-gray-100 px-2 py-2 text-left font-normal text-gray-400">
                            <Clock className="h-3 w-3" />
                          </th>
                          {bookingWeekDays.map(day => {
                            const iso = toLocalDateKey(day)
                            const hasSlots = slotDisponibilitaRows.some(slot => String(slot.data).slice(0, 10) === iso && slot.medicoId === booking.medicoId)
                            return (
                              <th key={iso} className={`min-w-[98px] border-b border-r border-gray-100 px-2 py-1.5 text-center font-medium ${iso === toLocalDateKey(new Date()) ? 'bg-teal-50 text-teal-700' : 'text-gray-600'}`}>
                                <div>{day.toLocaleDateString('it-IT', { weekday: 'short' })}</div>
                                <div className="font-mono text-[10px] opacity-70">{day.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</div>
                                {hasSlots && <div className="mx-auto mt-0.5 h-1 w-1 rounded-full bg-teal-500" />}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookingTimeRows.map(time => (
                          <tr key={time} className="h-8 hover:bg-gray-50/40">
                            <td className="border-b border-r border-gray-100 px-2 py-1 text-right font-mono text-gray-400">{time}</td>
                            {bookingWeekDays.map(day => {
                              const iso = toLocalDateKey(day)
                              const slot = getSlotForBookingCell(iso, time, booking)
                              const occupied = getAppointmentForBookingCell(iso, time, booking)
                              const isSelected = booking.date === iso && booking.time === time
                              const slotAmbulatorio = slot?.ambulatorioId ? ambulatoriCatalog.find(a => a.id === slot.ambulatorioId)?.nome : null
                              return (
                                <td key={`${iso}-${time}`} className="border-b border-r border-gray-100 p-1">
                                  {isSelected ? (
                                    <button type="button" onClick={() => setBookingActivePersonSelected(true)} className="h-7 w-full rounded bg-teal-600 px-1 text-left text-[10px] font-semibold text-white ring-2 ring-teal-200">
                                      {booking.worker.lastName} {booking.worker.firstName?.charAt(0)}. <span className="float-right font-mono opacity-80">{booking.durata}′</span>
                                    </button>
                                  ) : occupied ? (
                                    <button type="button" onClick={() => assignBookingManualCell(iso, time)} className="h-7 w-full rounded bg-gray-200 px-1 py-0.5 text-left text-[10px] text-gray-600 hover:bg-amber-100 hover:text-amber-700" title={`${occupied.personLastName || ''} ${occupied.personFirstName || ''} - clicca per overbooking`}>
                                      <span className="block truncate">{occupied.personLastName || 'Occupato'} {occupied.personFirstName || ''}</span>
                                    </button>
                                  ) : slot ? (
                                    <button type="button" onClick={() => assignBookingSlot(slot, iso, time)} className="h-7 w-full rounded border-l-2 border-teal-500 bg-teal-100 px-1 text-left text-[10px] text-teal-700 transition hover:bg-teal-600 hover:text-white" title={slotAmbulatorio || 'Disponibilita medico'}>
                                      {time}{slotAmbulatorio ? <span className="ml-1 opacity-70">{slotAmbulatorio}</span> : null}
                                    </button>
                                  ) : (
                                    <button type="button" onClick={() => assignBookingManualCell(iso, time)} className="h-7 w-full rounded bg-gray-50/60 px-1 text-left text-[10px] text-gray-300 hover:bg-blue-50 hover:text-blue-600" title="Clicca per impostare un orario manuale / overbooking">
                                      {time}
                                    </button>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="grid gap-3 border-t border-gray-100 p-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                      <p className="font-medium text-gray-800">Slot selezionato</p>
                      <p>{booking.date ? new Date(`${booking.date}T00:00:00`).toLocaleDateString('it-IT') : 'Nessuna data'} · {booking.time || 'nessun orario'} · {booking.ambulatorioId ? (ambulatoriCatalog.find(a => a.id === booking.ambulatorioId)?.nome || 'Ambulatorio') : 'Ambulatorio da slot/default'}</p>
                    </div>
                    <label className="block text-xs font-medium text-gray-700">
                      Note interne
                      <textarea value={booking.note} onChange={e => setBooking(prev => prev ? { ...prev, note: e.target.value } : prev)} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    </label>
                    {bookingError && <p className="sm:col-span-2 text-xs text-red-600">{bookingError}</p>}
                  </div>
                </section>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
                <button type="button" onClick={() => setBooking(null)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
                <button type="button" onClick={() => { void handleCreateMdlAppointment() }} disabled={bookingSaving} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                  {bookingSaving ? 'Creazione...' : 'Programma visita'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {directVisit && (() => {
        const accertamenti = ensureMdlMainAccertamento(getWorkerAccertamenti(directVisit.worker), directVisit.prestazioneId)
        const prestazioneOptions = [
          { value: '', label: 'Seleziona prestazione' },
          ...accertamenti.filter(a => a.prestazioneId).map(a => ({ value: String(a.prestazioneId), label: a.prestazioneNome || 'Accertamento' })),
        ]
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Crea Visita Medica del Lavoro</h2>
                  <p className="text-xs text-gray-500">{`${directVisit.worker.lastName || ''} ${directVisit.worker.firstName || ''}`.trim() || 'Lavoratore'}</p>
                </div>
                <button type="button" onClick={() => setDirectVisit(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4 overflow-y-auto p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-medium text-gray-700">
                    Tipo visita
                    <ElegantSelect value={directVisit.tipoVisitaMDL} onChange={tipoVisitaMDL => setDirectVisit(prev => prev ? { ...prev, tipoVisitaMDL } : prev)} options={visitTypeOptions} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Prestazione principale
                    <ElegantSelect value={directVisit.prestazioneId} onChange={prestazioneId => setDirectVisit(prev => prev ? { ...prev, prestazioneId } : prev)} options={prestazioneOptions} className="mt-1" />
                  </label>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  La visita usa lo slot disponibilità attivo del medico competente quando presente. In assenza di slot viene creata come overbooking, come nella webapp.
                  <p className="mt-1 text-amber-700">
                    {directVisit.date ? new Date(`${directVisit.date}T00:00:00`).toLocaleDateString('it-IT') : 'Oggi'} · {directVisit.time} · {directVisit.durata} minuti · {directVisit.ambulatorioId ? (ambulatoriCatalog.find(a => a.id === directVisit.ambulatorioId)?.nome || 'Ambulatorio') : 'ambulatorio fallback'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <p className="mb-2 text-sm font-semibold text-gray-800">Accertamenti da collegare</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {accertamenti.length === 0 ? (
                      <p className="text-sm text-gray-400">Nessun accertamento associato al protocollo.</p>
                    ) : accertamenti.map((acc, index) => {
                      const isMain = !!acc.prestazioneId && acc.prestazioneId === directVisit.prestazioneId
                      return (
                      <label key={`${acc.prestazioneId || index}`} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isMain ? 'border-teal-200 bg-teal-50/60' : 'border-gray-100'}`}>
                        <input
                          type="checkbox"
                          checked={isMain || (!!acc.prestazioneId && directVisit.selectedAccertamenti.includes(acc.prestazioneId))}
                          disabled={isMain}
                          onChange={event => acc.prestazioneId && toggleBookingAccertamento('directVisit', acc.prestazioneId, event.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 disabled:opacity-60"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{isMain ? 'Visita Medica del Lavoro' : (acc.prestazioneNome || 'Accertamento')}</span>
                          {!acc.obbligatoria && <span className="text-[10px] text-gray-400">facoltativo</span>}
                        </span>
                      </label>
                    )})}
                  </div>
                </div>
                <label className="block text-xs font-medium text-gray-700">
                  Note interne
                  <textarea value={directVisit.note} onChange={e => setDirectVisit(prev => prev ? { ...prev, note: e.target.value } : prev)} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
                <button type="button" onClick={() => setDirectVisit(null)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
                <button type="button" onClick={() => { void handleCreateDirectMdlVisit() }} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">Crea e apri visita</button>
              </div>
            </div>
          </div>
        )
      })()}

      {tariffarioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Tariffario aziendale</h2>
              <p className="text-xs text-gray-500">Associa o sostituisci il tariffario MDL usato per prestazioni, sopralluoghi e consulenze.</p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                Tariffario
                <ElegantSelect
                  value={tariffarioForm.tariffarioId}
                  onChange={tariffarioId => setTariffarioForm(prev => ({ ...prev, tariffarioId }))}
                  options={tariffarioSelectOptions}
                  className="mt-1"
                />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Valido dal
                <ElegantDateInput value={tariffarioForm.validoDa} onChange={validoDa => setTariffarioForm(prev => ({ ...prev, validoDa }))} className="mt-1" />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Valido al
                <ElegantDateInput value={tariffarioForm.validoA} onChange={validoA => setTariffarioForm(prev => ({ ...prev, validoA }))} clearable className="mt-1" />
              </label>
              <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                Note
                <textarea value={tariffarioForm.note} onChange={e => setTariffarioForm(prev => ({ ...prev, note: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </label>
              {tariffarioError && <p className="text-xs text-red-600 sm:col-span-2">{tariffarioError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setTariffarioModalOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button type="button" onClick={() => { void handleSaveTariffarioAssociation() }} disabled={tariffarioSaving || tariffarioSelectOptions.length === 0} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {tariffarioSaving ? 'Salvataggio...' : 'Salva tariffario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {companyAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">{companyAction.label}</h2>
              <p className="text-xs text-gray-500">
                {companyAction.type === 'CONSULENZA_MDL' ? 'Registra la consulenza MDL e accodala alla sincronizzazione.' : 'Compila i campi operativi come nella webapp, scarica il PDF e accoda il documento alla sincronizzazione.'}
              </p>
            </div>
            <div className="grid max-h-[70vh] gap-3 overflow-y-auto p-5 sm:grid-cols-2">
              {companyAction.type === 'VERBALE_RIUNIONE_PERIODICA' ? (
                <>
                  <label className="block text-xs font-medium text-gray-700">
                    Anno di riferimento
                    <ElegantSelect
                      value={companyActionForm.anno}
                      onChange={anno => setCompanyActionForm(prev => ({ ...prev, anno, periodoDa: `${anno}-01-01`, periodoA: `${anno}-12-31` }))}
                      options={Array.from({ length: 6 }, (_, idx) => String(new Date().getFullYear() - idx)).map(year => ({ value: year, label: year }))}
                      className="mt-1"
                    />
                  </label>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 sm:col-span-2">
                    Il verbale usa i dati annuali di sorveglianza sanitaria, sopralluoghi, scadenze e nomine disponibili nel database offline sincronizzato.
                  </div>
                </>
              ) : companyAction.type === 'RISULTATI_ANONIMI_COLLETTIVI' ? (
                <>
                  <label className="block text-xs font-medium text-gray-700">
                    Periodo dal
                    <ElegantDateInput value={companyActionForm.periodoDa} onChange={periodoDa => setCompanyActionForm(prev => ({ ...prev, periodoDa }))} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Periodo al
                    <ElegantDateInput value={companyActionForm.periodoA} onChange={periodoA => setCompanyActionForm(prev => ({ ...prev, periodoA }))} className="mt-1" />
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="button" onClick={() => setCompanyActionForm(prev => ({ ...prev, periodoDa: `${new Date().getFullYear()}-01-01`, periodoA: `${new Date().getFullYear()}-12-31` }))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Anno corrente</button>
                    <button type="button" onClick={() => setCompanyActionForm(prev => ({ ...prev, periodoDa: `${new Date().getFullYear() - 1}-01-01`, periodoA: `${new Date().getFullYear() - 1}-12-31` }))} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">Anno precedente</button>
                  </div>
                </>
              ) : companyAction.type === 'ALLEGATO_3B' ? (
                <>
                  <label className="block text-xs font-medium text-gray-700">
                    Anno di riferimento
                    <ElegantSelect
                      value={companyActionForm.anno}
                      onChange={anno => setCompanyActionForm(prev => ({ ...prev, anno }))}
                      options={Array.from({ length: 8 }, (_, idx) => String(new Date().getFullYear() - idx)).map(year => ({ value: year, label: year }))}
                      className="mt-1"
                    />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Medico competente
                    <ElegantSelect value={companyActionForm.esecutore} onChange={esecutore => setCompanyActionForm(prev => ({ ...prev, esecutore }))} options={medicalSelectOptions} className="mt-1" />
                  </label>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800 sm:col-span-2">
                    L'Allegato 3B viene salvato come record dedicato offline e sincronizzato con la webapp. Le statistiche complete restano calcolate dal backend online.
                  </div>
                </>
              ) : companyAction.type === 'SOPRALLUOGO' ? (
                <>
                  <label className="block text-xs font-medium text-gray-700">
                    Sede *
                    <ElegantSelect value={companyActionForm.siteId} onChange={siteId => setCompanyActionForm(prev => ({ ...prev, siteId }))} options={siteSelectOptions} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Data programmata
                    <ElegantDateInput value={companyActionForm.data} onChange={data => setCompanyActionForm(prev => ({ ...prev, data }))} className="mt-1" />
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Ora inizio
                      <ElegantTimeInput value={companyActionForm.oraInizio} onChange={oraInizio => setCompanyActionForm(prev => ({ ...prev, oraInizio }))} className="mt-1" />
                    </label>
                    <label className="block text-xs font-medium text-gray-700">
                      Ora fine
                      <ElegantTimeInput value={companyActionForm.oraFine} onChange={oraFine => setCompanyActionForm(prev => ({ ...prev, oraFine }))} className="mt-1" />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-gray-700">
                    Esecutore
                    <ElegantSelect value={companyActionForm.categoriaEsecutore} onChange={categoria => {
                      const options = categoria === 'RSPP' ? effectiveRsppOptions : effectiveMedicalProfessionals
                      setCompanyActionForm(prev => ({ ...prev, categoriaEsecutore: categoria, esecutore: options[0]?.id || prev.esecutore }))
                    }} options={[{ value: 'MC', label: 'Medico competente' }, { value: 'RSPP', label: 'RSPP' }, { value: 'ALTRO', label: 'Altro referente' }]} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Tipo sopralluogo
                    <ElegantSelect value={companyActionForm.tipoSopralluogo} onChange={tipoSopralluogo => setCompanyActionForm(prev => ({ ...prev, tipoSopralluogo }))} options={[{ value: 'ORDINARIO', label: 'Ordinario' }, { value: 'STRAORDINARIO', label: 'Straordinario' }, { value: 'VERIFICA', label: 'Verifica prescrizioni' }]} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Stato sopralluogo
                    <ElegantSelect value={companyActionForm.statoSopralluogo} onChange={statoSopralluogo => setCompanyActionForm(prev => ({ ...prev, statoSopralluogo }))} options={[{ value: 'PROGRAMMATO', label: 'Programmato' }, { value: 'ESEGUITO', label: 'Eseguito' }, { value: 'CONFORME', label: 'Conforme' }, { value: 'CON_PRESCRIZIONI', label: 'Con prescrizioni' }, { value: 'NON_CONFORME', label: 'Non conforme' }]} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Eseguito da
                    <ElegantSelect value={companyActionForm.esecutore} onChange={esecutore => setCompanyActionForm(prev => ({ ...prev, esecutore }))} options={companyActionForm.categoriaEsecutore === 'RSPP' ? rsppSelectOptions : medicalSelectOptions} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Referente aziendale
                    <input value={companyActionForm.referenteAziendale} onChange={e => setCompanyActionForm(prev => ({ ...prev, referenteAziendale: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Verbale sopralluogo
                    <input type="file" accept="application/pdf,image/*" onChange={e => setCompanyActionAttachment(e.target.files?.[0] || null)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-teal-700" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                    Attivita svolta
                    <textarea value={companyActionForm.descrizioneAttivita} onChange={e => setCompanyActionForm(prev => ({ ...prev, descrizioneAttivita: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                    Prescrizioni / note
                    <textarea value={companyActionForm.prescrizioniNote} onChange={e => setCompanyActionForm(prev => ({ ...prev, prescrizioniNote: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </label>
                </>
              ) : companyAction.type === 'DVR' ? (
                <>
                  <label className="block text-xs font-medium text-gray-700">
                    Sede *
                    <ElegantSelect value={companyActionForm.siteId} onChange={siteId => setCompanyActionForm(prev => ({ ...prev, siteId }))} options={siteSelectOptions} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    RSPP / esecutore
                    <ElegantSelect value={companyActionForm.esecutore} onChange={esecutore => setCompanyActionForm(prev => ({ ...prev, esecutore }))} options={safetySelectOptions} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Tipo DVR
                    <ElegantSelect value={companyActionForm.tipoDvr} onChange={tipoDvr => setCompanyActionForm(prev => ({ ...prev, tipoDvr }))} options={[{ value: 'NUOVO', label: 'Nuovo DVR' }, { value: 'AGGIORNAMENTO_CON_MODIFICHE', label: 'Aggiornamento con modifiche' }, { value: 'AGGIORNAMENTO_SENZA_MODIFICHE', label: 'Aggiornamento senza modifiche' }]} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Numero revisione
                    <input value={companyActionForm.numeroRevisione} onChange={e => setCompanyActionForm(prev => ({ ...prev, numeroRevisione: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Documento DVR
                    <input type="file" accept="application/pdf" onChange={e => setCompanyActionAttachment(e.target.files?.[0] || null)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-teal-700" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Data redazione
                    <ElegantDateInput value={companyActionForm.dataRedazione} onChange={dataRedazione => setCompanyActionForm(prev => ({ ...prev, dataRedazione, data: dataRedazione }))} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Data scadenza
                    <ElegantDateInput value={companyActionForm.dataScadenza} onChange={dataScadenza => setCompanyActionForm(prev => ({ ...prev, dataScadenza }))} clearable className="mt-1" />
                  </label>
                  <div className="space-y-3 rounded-xl border border-gray-100 p-3 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Rischi valutati</p>
                    {DVR_RISK_GROUPS.map(group => (
                      <div key={group.group}>
                        <p className="mb-1 text-xs font-medium text-gray-600">{group.group}</p>
                        <div className="grid gap-1 sm:grid-cols-2">
                          {group.items.map(item => (
                            <label key={item} className="flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={companyActionForm.rischiValutati.includes(item)}
                                onChange={e => setCompanyActionForm(prev => ({ ...prev, rischiValutati: e.target.checked ? [...prev.rischiValutati, item] : prev.rischiValutati.filter(r => r !== item) }))}
                                className="h-4 w-4 rounded border-gray-300 text-teal-600"
                              />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label className="block text-xs font-medium text-gray-700">
                    Sede
                    <ElegantSelect value={companyActionForm.siteId} onChange={siteId => setCompanyActionForm(prev => ({ ...prev, siteId }))} options={siteSelectOptions} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Data
                    <ElegantDateInput value={companyActionForm.data} onChange={data => setCompanyActionForm(prev => ({ ...prev, data }))} className="mt-1" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Ora inizio
                      <ElegantTimeInput value={companyActionForm.oraInizio} onChange={oraInizio => setCompanyActionForm(prev => ({ ...prev, oraInizio }))} className="mt-1" />
                    </label>
                    <label className="block text-xs font-medium text-gray-700">
                      Ora fine
                      <ElegantTimeInput value={companyActionForm.oraFine} onChange={oraFine => setCompanyActionForm(prev => ({ ...prev, oraFine }))} className="mt-1" />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                    Professionista
                    <ElegantSelect value={companyActionForm.esecutore} onChange={esecutore => setCompanyActionForm(prev => ({ ...prev, esecutore }))} options={safetySelectOptions} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Modalita
                    <ElegantSelect value={companyActionForm.modalitaConsulenza} onChange={modalitaConsulenza => setCompanyActionForm(prev => ({ ...prev, modalitaConsulenza }))} options={[{ value: 'IN_PRESENZA', label: 'In presenza' }, { value: 'REMOTO', label: 'Da remoto' }, { value: 'TELEFONICA', label: 'Telefonica' }]} className="mt-1" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Referente aziendale
                    <input value={companyActionForm.referenteAziendale} onChange={e => setCompanyActionForm(prev => ({ ...prev, referenteAziendale: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                    Oggetto consulenza
                    <input value={companyActionForm.oggetto} onChange={e => setCompanyActionForm(prev => ({ ...prev, oggetto: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                    Descrizione attivita
                    <textarea value={companyActionForm.descrizioneAttivita} onChange={e => setCompanyActionForm(prev => ({ ...prev, descrizioneAttivita: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Durata fatturabile
                    <input type="number" min={0} value={companyActionForm.durataMinuti} readOnly className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" />
                    <span className="mt-1 block text-[10px] text-gray-400">
                      {consulenzaActualMinutes > 0 ? `${consulenzaActualMinutes} min effettivi` : 'Imposta ora inizio/fine'} · frazioni da {consulenzaFrazioneMinuti} min
                    </span>
                  </label>
                  <label className="block text-xs font-medium text-gray-700">
                    Importo
                    <input type="number" min={0} step="0.01" value={companyActionForm.importo} onChange={e => { setConsulenzaImportoAutocalc(false); setCompanyActionForm(prev => ({ ...prev, importo: e.target.value })) }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                    <span className="mt-1 block text-[10px] text-gray-400">
                      {consulenzaVoce ? `Tariffario: ${consulenzaVoce.nome || consulenzaVoce.tipo} · € ${Number(consulenzaVoce.prezzoBase || 0).toFixed(2)}/h` : 'Nessuna voce consulenza nel tariffario aziendale'}
                    </span>
                  </label>
                  {!consulenzaImportoAutocalc && (
                    <button type="button" onClick={() => setConsulenzaImportoAutocalc(true)} className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50">
                      Ripristina calcolo tariffario
                    </button>
                  )}
                </>
              )}
              <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                Note
                <textarea value={companyActionForm.note} onChange={e => setCompanyActionForm(prev => ({ ...prev, note: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setCompanyAction(null)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button type="button" onClick={() => { void handleCreateCompanyDocument(companyAction.label, companyAction.type) }} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">
                {companyAction.type === 'CONSULENZA_MDL' ? 'Salva consulenza' : companyAction.type === 'SOPRALLUOGO' ? 'Programma sopralluogo' : companyAction.type === 'DVR' ? 'Salva DVR' : companyAction.type === 'ALLEGATO_3B' ? 'Crea Allegato 3B' : 'Crea e scarica PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {nominaModalOpen && azienda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Nomina Figure di Sicurezza</h2>
              <p className="text-xs text-gray-500">Crea la nomina come in webapp e sincronizza MC, coordinati o RSPP.</p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-700">
                Figura
                <ElegantSelect
                  value={nominaForm.tipoRuolo}
                  onChange={tipoRuolo => {
                    const options = tipoRuolo === 'RSPP' ? effectiveRsppOptions : effectiveMedicalProfessionals
                    setNominaForm(prev => ({ ...prev, tipoRuolo, personId: options[0]?.id || '' }))
                  }}
                  options={[
                    { value: 'MEDICO_COMPETENTE', label: 'Medico Competente' },
                    { value: 'MEDICO_COMPETENTE_COORDINATO', label: 'Medico Competente Coordinato' },
                    { value: 'MEDICO_COMPETENTE_SUCCESSORE', label: 'Successore Medico Competente' },
                    { value: 'RSPP', label: 'RSPP' },
                  ]}
                  className="mt-1"
                />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Persona
                <ElegantSelect value={nominaForm.personId} onChange={personId => setNominaForm(prev => ({ ...prev, personId }))} options={[emptyOption('Seleziona figura'), ...nominaCandidates.map(m => ({ value: m.id, label: medicoLabel(m) }))]} className="mt-1" />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Sede
                <ElegantSelect value={nominaForm.siteId} onChange={siteId => setNominaForm(prev => ({ ...prev, siteId }))} options={allSitesSelectOptions} className="mt-1" />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Data inizio
                <ElegantDateInput value={nominaForm.dataInizio} onChange={dataInizio => setNominaForm(prev => ({ ...prev, dataInizio }))} className="mt-1" />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Data scadenza
                <ElegantDateInput value={nominaForm.dataScadenza} onChange={dataScadenza => setNominaForm(prev => ({ ...prev, dataScadenza }))} clearable className="mt-1" />
              </label>
              <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                PDF nomina firmata
                <input type="file" accept="application/pdf" onChange={e => setNominaAttachment(e.target.files?.[0] || null)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-teal-700" />
              </label>
              {nominaAttachment && (
                <div className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-700 sm:col-span-2">
                  <Upload className="h-3.5 w-3.5" />
                  <span className="truncate">{nominaAttachment.name}</span>
                </div>
              )}
              <label className="block text-xs font-medium text-gray-700 sm:col-span-2">
                Note
                <textarea value={nominaForm.note} onChange={e => setNominaForm(prev => ({ ...prev, note: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </label>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 sm:col-span-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Nomine attive sincronizzate</p>
                <div className="mt-2 grid gap-1">
                  {nomineAttive.length === 0 ? (
                    <p className="text-xs text-gray-500">Nessuna nomina sincronizzata nel DB desktop.</p>
                  ) : nomineAttive.map(n => (
                    <p key={`${n.tipoRuolo}-${n.personId}-${n.id}`} className="text-xs text-gray-700">
                      <span className="font-medium">{n.tipoRuolo}</span> · {n.nome || [n.firstName, n.lastName].filter(Boolean).join(' ') || n.personId}
                      {n.dataInizio ? <span className="text-gray-400"> dal {n.dataInizio.slice(0, 10)}</span> : null}
                    </p>
                  ))}
                </div>
              </div>
              {nominaCandidates.length === 0 && <p className="text-xs text-amber-700 sm:col-span-2">Nessuna figura sincronizzata per questo ruolo. Scarica nuovamente il DB desktop.</p>}
              {nominaError && <p className="text-xs text-red-600 sm:col-span-2">{nominaError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setNominaModalOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button type="button" onClick={() => { void handleSaveNomina() }} disabled={nominaSaving} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {nominaSaving ? 'Salvataggio...' : 'Salva nomina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  icon: Icon,
  mono
}: {
  label: string
  value: string | null | undefined
  icon?: React.ComponentType<{ className?: string }>
  mono?: boolean
}): JSX.Element | null {
  if (!value) return null
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm text-gray-700 flex items-center gap-1 ${mono ? 'font-mono' : ''}`}>
        {Icon && <Icon className="w-3 h-3 text-gray-400 shrink-0" />}
        {value}
      </p>
    </div>
  )
}
