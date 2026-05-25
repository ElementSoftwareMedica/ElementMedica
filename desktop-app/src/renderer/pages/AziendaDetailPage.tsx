import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
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
  Stethoscope
  , ClipboardCheck,
  Briefcase,
  CalendarPlus,
  UserCheck,
  FileSignature,
  ClipboardList,
  FolderOpen,
  FileDown,
  MoreHorizontal
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useDesktopPermission } from '../hooks/useDesktopPermission'
import { formatProtocolloPeriodicity, parseProtocolloPrestazioni } from '../utils/protocolloSanitario'

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
  mediciCoordinati?: string | null
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
  prestazioni: string | null
}

interface VoceTariffario {
  nome: string | null
  tipo: string
  prezzoBase: number
  categoriaVisita: string | null
  attivo: boolean
}

interface Tariffario {
  id: string
  codice: string | null
  nome: string | null
  descrizione: string | null
  attivo: number
  validoDa: string | null
  validoA: string | null
  voci: string | null
  companyAssociations: string | null
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

const STATO_MOV_LABELS: Record<string, { label: string; cls: string }> = {
  BOZZA: { label: 'Bozza', cls: 'bg-gray-100 text-gray-600' },
  DA_FATTURARE: { label: 'Da fatturare', cls: 'bg-amber-100 text-amber-700' },
  FATTURATO: { label: 'Fatturato', cls: 'bg-blue-100 text-blue-700' },
  PAGATO: { label: 'Pagato', cls: 'bg-green-100 text-green-700' },
  ANNULLATO: { label: 'Annullato', cls: 'bg-red-100 text-red-600' },
}

function parseVoci(json: string | null): VoceTariffario[] {
  if (!json) return []
  try { return JSON.parse(json) as VoceTariffario[] } catch { return [] }
}

function parseAssoc(json: string | null): { companyTenantProfileId?: string }[] {
  if (!json) return []
  try { return JSON.parse(json) as { companyTenantProfileId?: string }[] } catch { return [] }
}

export function AziendaDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const permissions = useDesktopPermission()
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
  const [movimenti, setMovimenti] = useState<MovimentoContabile[]>([])
  const [protocolli, setProtocolli] = useState<Protocollo[]>([])
  const [lavoratoriMansioni, setLavoratoriMansioni] = useState<LavoratoreMansione[]>([])
  const [mansioniCatalog, setMansioniCatalog] = useState<Mansione[]>([])
  const [scadenze, setScadenze] = useState<Scadenza[]>([])
  const [companyVisits, setCompanyVisits] = useState<CompanyVisit[]>([])
  const [documenti, setDocumenti] = useState<AllegatoAzienda[]>([])
  const [documentActionMessage, setDocumentActionMessage] = useState<string | null>(null)
  const [companyAction, setCompanyAction] = useState<{ label: string; type: string } | null>(null)
  const [nominaModalOpen, setNominaModalOpen] = useState(false)
  const [expandedAccertamenti, setExpandedAccertamenti] = useState<Record<string, boolean>>({})
  const [booking, setBooking] = useState<BookingState | null>(null)
  const [bookingSaving, setBookingSaving] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const canViewBilling = permissions.canReadCompanyBilling()
  const companyBackTarget = (location.state as { from?: string } | null)?.from || '/aziende'
  const currentRoute = `/aziende/${id}?tab=${activeTab}`

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
      setProtocolli(allProtocolli.filter(p =>
        p.companyTenantProfileId === id ||
        (p.id && workerProtocolloIds.has(p.id)) ||
        (p.mansioneId && workerMansioneIds.has(p.mansioneId))
      ))

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

      // Load tariffari associated with this company
      const allTariffari = await window.desktopApi.db.query({
        table: 'tariffari',
        where: { _isDeleted: 0 }
      })
      const linkedTariffari = (allTariffari as Tariffario[]).filter(t => {
        const assoc = parseAssoc(t.companyAssociations)
        return assoc.some(a => a.companyTenantProfileId === id)
      })
      setTariffari(linkedTariffari)

      // Load movimenti contabili for this company
      const movimentiRows = await window.desktopApi.db.query({
        table: 'movimenti_contabili',
        where: { companyTenantProfileId: id, _isDeleted: 0 },
        orderBy: { column: 'dataMovimento', direction: 'DESC' }
      })
      setMovimenti(movimentiRows as MovimentoContabile[])

      const documentRows = await window.desktopApi.db.query({
        table: 'allegati',
        where: { companyTenantProfileId: id, _isDeleted: 0 },
        orderBy: { column: 'createdAt', direction: 'DESC' }
      }) as AllegatoAzienda[]
      setDocumenti([...documentRows].sort((a, b) =>
        String(a.tipo || '').localeCompare(String(b.tipo || ''), 'it') ||
        String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
      ))
    } catch {
      // silent
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

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

  const handleCreateCompanyDocument = async (name: string, type: string): Promise<void> => {
    if (!id || !azienda || !permissions.canUpdateAziende()) return
    const now = new Date().toISOString()
    const doc = {
      id: uuidv4(),
      tenantId: azienda.tenantId || '',
      companyTenantProfileId: id,
      visitaId: null,
      nome: name,
      tipo: type,
      dimensione: 0,
      localPath: null,
      serverUrl: null,
      createdAt: now,
      updatedAt: now,
    }
    await window.desktopApi.db.insert({ table: 'allegati', data: doc })
    await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'allegatoVisita', entityId: doc.id, payload: doc })
    setDocumenti(prev => [doc, ...prev].sort((a, b) => String(a.tipo || '').localeCompare(String(b.tipo || ''), 'it') || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))))
    setDocumentActionMessage(`${name} creato e accodato alla sincronizzazione`)
    setCompanyAction(null)
    setActiveTab('documenti')
  }

  const openBookingModal = (worker: Lavoratore, scadenza?: Scadenza): void => {
    const now = new Date()
    const rounded = new Date(now)
    rounded.setMinutes(now.getMinutes() < 30 ? 30 : 0, 0, 0)
    if (now.getMinutes() >= 30) rounded.setHours(now.getHours() + 1)
    setBooking({
      worker,
      scadenza,
      date: rounded.toISOString().slice(0, 10),
      time: `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`,
    })
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
      const prestazioneId = booking.scadenza?.prestazioneId || null
      const prestazioneNome = booking.scadenza?.prestazioneNome || 'Visita medica del lavoro'

      const appointmentPayload = {
        id: appointmentId,
        tenantId: azienda.tenantId || '',
        personId: booking.worker.id,
        medicoId: azienda.medicoCompetenteId || null,
        prestazioneId,
        companyTenantProfileId: id,
        dataOra,
        durata: 30,
        stato: 'CONFERMATO',
        tipo: 'MEDICINA_LAVORO',
        tipoVisitaMDL: 'PERIODICA',
        personFirstName: booking.worker.firstName,
        personLastName: booking.worker.lastName,
        personTaxCode: booking.worker.taxCode,
        companyName: azienda.ragioneSociale,
        prestazioneNome,
        noteInterne: 'Appuntamento MdL fissato da Sorveglianza Sanitaria desktop',
        createdAt: now,
        updatedAt: now,
      }

      await window.desktopApi.db.insert({ table: 'appointments', data: appointmentPayload })

      if (prestazioneId) {
        const inserted = await window.desktopApi.db.insert({
          table: 'appointment_prestazioni',
          data: {
            appuntamentoId: appointmentId,
            prestazioneId,
            prezzo: null,
            quantita: 1,
            note: 'Accertamento da protocollo sanitario',
          }
        }) as { id: string }
        await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'appointment_prestazioni', entityId: inserted.id, payload: { appuntamentoId: appointmentId, prestazioneId, prezzo: null, quantita: 1 } })
      }

      await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'appointments', entityId: appointmentId, payload: appointmentPayload })
      setBooking(null)
      await loadData()
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Errore durante la creazione dell’appuntamento.')
    } finally {
      setBookingSaving(false)
    }
  }

  const handleCreateDirectMdlVisit = async (worker: Lavoratore, scadenza?: Scadenza): Promise<void> => {
    if (!id || !azienda || !window.desktopApi || !permissions.canCreateVisite()) return
    const now = new Date().toISOString()
    const appointmentId = uuidv4()
    const visitId = uuidv4()
    const prestazioneId = scadenza?.prestazioneId || null
    const prestazioneNome = scadenza?.prestazioneNome || 'Visita medica del lavoro'
    const patientName = `${worker.lastName || ''} ${worker.firstName || ''}`.trim()

    await window.desktopApi.db.insert({
      table: 'appointments',
      data: {
        id: appointmentId,
        tenantId: azienda.tenantId || '',
        personId: worker.id,
        medicoId: azienda.medicoCompetenteId || null,
        prestazioneId,
        companyTenantProfileId: id,
        dataOra: now,
        durata: 30,
        stato: 'IN_CORSO',
        tipo: 'MEDICINA_LAVORO',
        personFirstName: worker.firstName,
        personLastName: worker.lastName,
        personTaxCode: worker.taxCode,
        companyName: azienda.ragioneSociale,
        prestazioneNome,
        noteInterne: 'Visita MdL creata direttamente da Sorveglianza Sanitaria desktop',
        createdAt: now,
        updatedAt: now,
      }
    })

    if (prestazioneId) {
      await window.desktopApi.db.insert({
        table: 'appointment_prestazioni',
        data: {
          appuntamentoId: appointmentId,
          prestazioneId,
          prezzo: null,
          quantita: 1,
          note: 'Accertamento da protocollo sanitario',
        }
      })
    }

    await window.desktopApi.db.insert({
      table: 'visits',
      data: {
        id: visitId,
        tenantId: azienda.tenantId || '',
        appuntamentoId: appointmentId,
        personId: worker.id,
        medicoId: azienda.medicoCompetenteId || null,
        dataOra: now,
        stato: 'IN_CORSO',
        tipoVisitaMDL: 'PERIODICA',
        isMDL: 1,
        personFirstName: worker.firstName,
        personLastName: worker.lastName,
        personTaxCode: worker.taxCode,
        companyName: azienda.ragioneSociale,
        prestazioneId,
        prestazioneNome,
        datiStrutturati: '{}',
        noteInterne: `Visita MdL avviata da Sorveglianza Sanitaria per ${patientName}`,
        createdAt: now,
        updatedAt: now,
      }
    })

    await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'appointments', entityId: appointmentId, payload: { personId: worker.id, companyTenantProfileId: id, dataOra: now, stato: 'IN_CORSO', tipoVisitaMDL: 'PERIODICA', prestazioneId } })
    await window.desktopApi.sync.enqueue({ type: 'CREATE', entity: 'visits', entityId: visitId, payload: { appuntamentoId: appointmentId, personId: worker.id, stato: 'IN_CORSO', tipoVisitaMDL: 'PERIODICA', isMDL: true, prestazioneId } })
    navigate(`/visite/${visitId}`, { state: { from: currentRoute } })
  }

  const visibleMovimenti = movimenti.filter(m => {
    if (movimentiTab === 'tutti') return true
    return (m.stato || '').toLowerCase() === movimentiTab
  })

  const mediciCoordinati = (() => {
    try {
      const raw = JSON.parse(azienda?.mediciCoordinati || '[]') as Array<{ nome?: string; firstName?: string; lastName?: string }>
      return raw.map(m => m.nome || [m.firstName, m.lastName].filter(Boolean).join(' ')).filter(Boolean).join(', ')
    } catch {
      return ''
    }
  })()

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-600" />
                Medicina del lavoro
              </h2>
            </div>
            {documentActionMessage && (
              <div className="mb-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-700">{documentActionMessage}</div>
            )}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Medico competente</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{azienda.medicoCompetenteNome || 'Non nominato'}</p>
                {permissions.canUpdateAziende() && (
                  <button type="button" onClick={() => setNominaModalOpen(true)} className="mt-2 w-full rounded-lg border border-teal-200 px-2 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50">
                    Gestisci nomina
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Medici coordinati</p>
                <p className="mt-1 text-sm text-gray-700">{mediciCoordinati || 'Nessun coordinato'}</p>
                {permissions.canUpdateAziende() && (
                  <input
                    defaultValue={mediciCoordinati}
                    onBlur={e => {
                      const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean).map(nome => ({ nome }))
                      void handleSaveCompanyMdlField({ mediciCoordinati: JSON.stringify(values) })
                    }}
                    placeholder="Nomi separati da virgola"
                    className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                )}
              </div>
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Successore</p>
                <p className="mt-1 text-sm text-gray-700">{azienda.medicoSuccessoreNome || 'Non indicato'}</p>
                {permissions.canUpdateAziende() && (
                  <input
                    value={azienda.medicoSuccessoreNome || ''}
                    onChange={e => setAzienda(prev => prev ? { ...prev, medicoSuccessoreNome: e.target.value } : prev)}
                    onBlur={e => { void handleSaveCompanyMdlField({ medicoSuccessoreNome: e.target.value }) }}
                    placeholder="Nomina successore"
                    className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                )}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
              {[
                ['Sopralluogo', 'SOPRALLUOGO', ClipboardCheck],
                ['Consulenza', 'CONSULENZA_MDL', UserCheck],
                ['DVR', 'DVR', ClipboardList],
                ['Risultati anonimi collettivi', 'RISULTATI_ANONIMI_COLLETTIVI', FileDown],
                ['Riunione periodica', 'VERBALE_RIUNIONE_PERIODICA', FileSignature],
              ].map(([label, type, Icon]) => (
                <button
                  key={String(type)}
                  type="button"
                  disabled={!permissions.canUpdateAziende()}
                  onClick={() => setCompanyAction({ label: String(label), type: String(type) })}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-xs text-gray-700 hover:bg-teal-50 disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5 text-teal-600" />
                  <span className="truncate">{String(label)}</span>
                </button>
              ))}
            </div>
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
                      const protocolPrestazioni = workerProtocols.flatMap(p => parseProtocolloPrestazioni(p.prestazioni).map(item => ({ ...item, protocolloNome: p.nome })))
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
                                  <button onClick={() => { void handleCreateDirectMdlVisit(l, nextScadenza) }} className="rounded-lg bg-teal-600 px-2 py-1 text-[11px] text-white hover:bg-teal-700"><Stethoscope className="inline h-3 w-3" /> Visita</button>
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
                      const prestazioni = parseProtocolloPrestazioni(protocollo.prestazioni)
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

          {canViewBilling && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Receipt className="h-4 w-4 text-teal-600" />
                  Tariffari
                </h2>
                <span className="text-xs text-gray-400">{tariffari.length} associati</span>
              </div>
              {tariffari.length === 0 ? (
                <p className="text-sm text-gray-400">Nessun tariffario associato a questa azienda</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {tariffari.map(t => {
                    const voci = parseVoci(t.voci).filter(v => v.attivo !== false)
                    return (
                      <div key={t.id} className="rounded-xl border border-gray-100 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{t.nome || t.codice || 'Tariffario'}</p>
                            {t.codice && <p className="font-mono text-[10px] text-gray-400">{t.codice}</p>}
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${t.attivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.attivo ? 'Attivo' : 'Non attivo'}</span>
                        </div>
                        <div className="mt-3 max-h-40 overflow-y-auto">
                          {voci.slice(0, 8).map((v, i) => (
                            <div key={i} className="flex items-center justify-between gap-2 border-t border-gray-50 py-1.5 text-xs">
                              <span className="truncate text-gray-700">{v.nome || v.tipo}</span>
                              <span className="font-mono font-semibold text-teal-700">€ {Number(v.prezzoBase || 0).toFixed(2)}</span>
                            </div>
                          ))}
                          {voci.length > 8 && <p className="pt-1 text-[10px] text-gray-400">+ {voci.length - 8} voci</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
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
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Nome</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Tipo</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-500">Data</th>
                      <th className="px-4 py-2.5 text-right font-medium text-gray-500">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {documenti.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{doc.nome}</td>
                        <td className="px-4 py-2.5 text-gray-500">{doc.tipo || 'Documento'}</td>
                        <td className="px-4 py-2.5 text-gray-500">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('it-IT') : '—'}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            Azioni
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {booking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Fissa appuntamento MdL</h2>
              <p className="text-xs text-gray-500">
                {`${booking.worker.lastName || ''} ${booking.worker.firstName || ''}`.trim() || 'Lavoratore'}
                {booking.scadenza?.prestazioneNome ? ` · ${booking.scadenza.prestazioneNome}` : ''}
              </p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-700">
                Data
                <input
                  type="date"
                  value={booking.date}
                  onChange={e => setBooking(prev => prev ? { ...prev, date: e.target.value } : prev)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Ora
                <input
                  type="time"
                  value={booking.time}
                  onChange={e => setBooking(prev => prev ? { ...prev, time: e.target.value } : prev)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="sm:col-span-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                Medico competente: {azienda?.medicoCompetenteNome || 'da nomina aziendale'}
              </div>
              {bookingError && <p className="sm:col-span-2 text-xs text-red-600">{bookingError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setBooking(null)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button type="button" onClick={() => { void handleCreateMdlAppointment() }} disabled={bookingSaving} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
                {bookingSaving ? 'Creazione...' : 'Fissa appuntamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {companyAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">{companyAction.label}</h2>
              <p className="text-xs text-gray-500">Crea il documento operativo aziendale e accodalo alla sincronizzazione.</p>
            </div>
            <div className="space-y-3 p-5">
              <label className="block text-xs font-medium text-gray-700">
                Nome documento
                <input value={companyAction.label} readOnly className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Tipologia
                <input value={companyAction.type} readOnly className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setCompanyAction(null)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button type="button" onClick={() => { void handleCreateCompanyDocument(companyAction.label, companyAction.type) }} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">Crea</button>
            </div>
          </div>
        </div>
      )}

      {nominaModalOpen && azienda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Nomina medico competente</h2>
              <p className="text-xs text-gray-500">Gestione offline di MC, coordinati e successore.</p>
            </div>
            <div className="grid gap-3 p-5">
              <label className="block text-xs font-medium text-gray-700">
                Medico competente
                <input value={azienda.medicoCompetenteNome || ''} onChange={e => setAzienda(prev => prev ? { ...prev, medicoCompetenteNome: e.target.value } : prev)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Medici competenti coordinati
                <input value={mediciCoordinati} onChange={e => {
                  const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean).map(nome => ({ nome }))
                  setAzienda(prev => prev ? { ...prev, mediciCoordinati: JSON.stringify(values) } : prev)
                }} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Nomi separati da virgola" />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Successore
                <input value={azienda.medicoSuccessoreNome || ''} onChange={e => setAzienda(prev => prev ? { ...prev, medicoSuccessoreNome: e.target.value } : prev)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={() => setNominaModalOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">Annulla</button>
              <button type="button" onClick={() => {
                void handleSaveCompanyMdlField({
                  medicoCompetenteNome: azienda.medicoCompetenteNome,
                  mediciCoordinati: azienda.mediciCoordinati,
                  medicoSuccessoreNome: azienda.medicoSuccessoreNome,
                }).then(() => setNominaModalOpen(false))
              }} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700">Salva nomina</button>
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
