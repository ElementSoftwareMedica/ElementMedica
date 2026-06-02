import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    ArrowLeft,
    Search,
    UserPlus,
    Building2,
    Stethoscope,
    MapPin,
    Play,
    ChevronDown,
    Check
} from 'lucide-react'
import { useDesktopAuth } from '../context/DesktopAuthContext'
import { ElegantSelect } from '../components/ElegantControls'

interface Patient {
    id: string
    firstName: string | null
    lastName: string | null
    taxCode: string | null
    companyName: string | null
    companyTenantProfileId: string | null
}

interface Ambulatorio {
    id: string
    nome: string
}

interface Prestazione {
    id: string
    nome: string
    codice: string | null
    tipo: string | null
}

interface VisitTemplateRef {
    id: string
    medicoId: string | null
    prestazioneId: string | null
}

function isMdlPrestazione(prestazione?: Prestazione): boolean {
    if (!prestazione) return false
    const text = `${prestazione.tipo || ''} ${prestazione.nome || ''}`.toLowerCase()
    if (text.includes('sportiv') || text.includes('agonistic')) return false
    return text.includes('medicina_lavoro') ||
        text.includes('medicina lavoro') ||
        text.includes('mdl') ||
        text.includes('sorveglianza sanitaria') ||
        text.includes('idoneita lavorativa') ||
        text.includes('idoneità lavorativa')
}

export function NuovaVisitaPage(): JSX.Element {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { user, currentTenantId } = useDesktopAuth()

    const [patients, setPatients] = useState<Patient[]>([])
    const [ambulatori, setAmbulatori] = useState<Ambulatorio[]>([])
    const [prestazioni, setPrestazioni] = useState<Prestazione[]>([])
    const [visitTemplates, setVisitTemplates] = useState<VisitTemplateRef[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [prestazioneSearchTerm, setPrestazioneSearchTerm] = useState('')
    const [showAllPrestazioni, setShowAllPrestazioni] = useState(false)
    const [prestazioneDropdownOpen, setPrestazioneDropdownOpen] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [selectedAmbulatorioId, setSelectedAmbulatorioId] = useState('')
    const [selectedPrestazioneId, setSelectedPrestazioneId] = useState('')
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    // Load reference data
    useEffect(() => {
        if (!window.desktopApi) return
        const load = async (): Promise<void> => {
            const [amb, prest, templates] = await Promise.all([
                window.desktopApi.db.query({ table: 'ambulatori', where: { _isDeleted: 0 } }),
                window.desktopApi.db.query({ table: 'prestazioni', where: { _isDeleted: 0 }, orderBy: { column: 'nome', direction: 'ASC' } }),
                window.desktopApi.db.query({ table: 'visit_templates', where: { _isDeleted: 0 } })
            ])
            setAmbulatori(amb as Ambulatorio[])
            setPrestazioni((prest as Prestazione[]).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it')))
            setVisitTemplates((templates as VisitTemplateRef[]).filter(t => !!t.prestazioneId))
            // Default to first ambulatorio
            if ((amb as Ambulatorio[]).length > 0) {
                setSelectedAmbulatorioId((amb as Ambulatorio[])[0].id)
            }
        }
        load()
    }, [])

    const filteredPrestazioni = useMemo(() => {
        const medicoSpecificIds = new Set(
            visitTemplates
                .filter(t => t.medicoId === user?.id && t.prestazioneId)
                .map(t => t.prestazioneId as string)
        )
        const globalIds = new Set(
            visitTemplates
                .filter(t => !t.medicoId && t.prestazioneId)
                .map(t => t.prestazioneId as string)
        )
        const allowedIds = medicoSpecificIds.size > 0 ? medicoSpecificIds : globalIds
        const term = prestazioneSearchTerm.trim().toLowerCase()

        return prestazioni
            .filter(p => showAllPrestazioni || allowedIds.size === 0 || allowedIds.has(p.id))
            .filter(p => !term || [p.nome, p.codice, p.tipo].some(value => value?.toLowerCase().includes(term)))
            .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it'))
    }, [prestazioni, prestazioneSearchTerm, showAllPrestazioni, user?.id, visitTemplates])

    useEffect(() => {
        if (selectedPrestazioneId && !filteredPrestazioni.some(p => p.id === selectedPrestazioneId)) {
            setSelectedPrestazioneId('')
        }
    }, [filteredPrestazioni, selectedPrestazioneId])

    useEffect(() => {
        const patientId = searchParams.get('patientId')
        if (!patientId || !window.desktopApi || selectedPatient) return
        void window.desktopApi.db.query({
            table: 'patients',
            where: { id: patientId, _isDeleted: 0 },
            limit: 1
        }).then(rows => {
            const patient = (rows as Patient[])[0]
            if (patient) {
                setSelectedPatient(patient)
                setSearchTerm(`${patient.lastName || ''} ${patient.firstName || ''}`.trim())
            }
        })
    }, [searchParams, selectedPatient])

    // Search patients
    useEffect(() => {
        if (!window.desktopApi || searchTerm.length < 2) {
            setPatients([])
            return
        }
        const timeout = setTimeout(async () => {
            const rows = await window.desktopApi!.db.query({
                table: 'patients',
                where: { _isDeleted: 0 },
                orderBy: { column: 'lastName', direction: 'ASC' }
            }) as Patient[]
            const term = searchTerm.toLowerCase()
            const filtered = rows.filter(p =>
                [p.firstName, p.lastName, p.taxCode, p.companyName]
                    .some(f => f?.toLowerCase().includes(term))
            )
            setPatients(filtered.slice(0, 50))
        }, 300)
        return () => clearTimeout(timeout)
    }, [searchTerm])

    const handleCreate = useCallback(async () => {
        if (!window.desktopApi || !selectedPatient || !user) return
        if (!selectedPrestazioneId) {
            setCreateError('Seleziona una prestazione eseguibile dal medico prima di avviare la visita.')
            return
        }
        setCreating(true)
        setCreateError(null)
        const effectiveTenantId = currentTenantId ?? user.tenantId
        try {
            const now = new Date().toISOString()

            // Find selected prestazione details
            const prest = prestazioni.find(p => p.id === selectedPrestazioneId)
            const isMdl = isMdlPrestazione(prest)

            // 1. Create appointment
            const apptResult = await window.desktopApi.db.insert({
                table: 'appointments',
                data: {
                    tenantId: effectiveTenantId,
                    personId: selectedPatient.id,
                    medicoId: user.id,
                    ambulatorioId: selectedAmbulatorioId || null,
                    prestazioneId: selectedPrestazioneId || null,
                    dataOra: now,
                    stato: 'IN_CORSO',
                    tipo: 'NON_PROGRAMMATA',
                    personFirstName: selectedPatient.firstName,
                    personLastName: selectedPatient.lastName,
                    personTaxCode: selectedPatient.taxCode,
                    medicoFirstName: user.firstName,
                    medicoLastName: user.lastName,
                    companyName: selectedPatient.companyName,
                    prestazioneNome: prest?.nome || null,
                    prestazioneCodice: prest?.codice || null,
                    createdAt: now,
                    updatedAt: now,
                }
            }) as { id: string; _localId: string }

            // Enqueue appointment sync
            await window.desktopApi.sync.enqueue({
                type: 'CREATE',
                entity: 'appointments',
                entityId: apptResult.id,
                localId: apptResult._localId,
                payload: {
                    tenantId: effectiveTenantId,
                    pazienteId: selectedPatient.id,   // Prisma: pazienteId (local: personId)
                    medicoId: user.id,
                    ambulatorioId: selectedAmbulatorioId || null,
                    prestazioneId: selectedPrestazioneId || null,
                    dataOra: now,
                    stato: 'IN_CORSO',
                    // tipo: 'NON_PROGRAMMATA' stripped — not a valid TipoVisitaMDL enum value
                    // numeroPrenotazione will be generated server-side by the transformer
                }
            })

            // 2. Create visit
            // Look up a visit template for this medico + prestazione combination
            let templateId: string | null = null
            if (selectedPrestazioneId) {
                try {
                    // Priority 1: personal template for this medico+prestazione
                    const byMedico = await window.desktopApi.db.query({
                        table: 'visit_templates',
                        where: { _isDeleted: 0, medicoId: user.id, prestazioneId: selectedPrestazioneId },
                        limit: 1,
                    }) as Array<{ id: string }>
                    if (byMedico.length > 0) {
                        templateId = byMedico[0].id
                    } else {
                        // Priority 2: prestazione-scope template (medicoId NULL, linked to prestazione)
                        const byPrest = await window.desktopApi.db.query({
                            table: 'visit_templates',
                            where: { _isDeleted: 0, prestazioneId: selectedPrestazioneId },
                            limit: 1,
                        }) as Array<{ id: string }>
                        if (byPrest.length > 0) templateId = byPrest[0].id
                    }
                } catch {
                    // template lookup failure is non-blocking
                }
            }

            const visitResult = await window.desktopApi.db.insert({
                table: 'visits',
                data: {
                    tenantId: effectiveTenantId,
                    personId: selectedPatient.id,
                    appuntamentoId: apptResult.id,
                    medicoId: user.id,
                    ambulatorioId: selectedAmbulatorioId || null,
                    prestazioneId: selectedPrestazioneId || null,
                    stato: 'IN_CORSO',
                    templateId: templateId,
                    dataOra: now,
                    dataInizio: now,
                    datiStrutturati: '{}',
                    isMDL: isMdl ? 1 : 0,
                    personFirstName: selectedPatient.firstName,
                    personLastName: selectedPatient.lastName,
                    personTaxCode: selectedPatient.taxCode,
                    medicoFirstName: user.firstName,
                    medicoLastName: user.lastName,
                    companyName: selectedPatient.companyName,
                    prestazioneNome: prest?.nome || null,
                    prestazioneCodice: prest?.codice || null,
                    createdAt: now,
                    updatedAt: now,
                }
            }) as { id: string; _localId: string }

            // Enqueue visit sync
            await window.desktopApi.sync.enqueue({
                type: 'CREATE',
                entity: 'visits',
                entityId: visitResult.id,
                localId: visitResult._localId,
                payload: {
                    tenantId: effectiveTenantId,
                    pazienteId: selectedPatient.id,   // Prisma: pazienteId (local: personId)
                    appuntamentoId: apptResult.id,
                    medicoId: user.id,
                    ambulatorioId: selectedAmbulatorioId || null,
                    prestazioneId: selectedPrestazioneId || null,
                    stato: 'IN_CORSO',
                    tipoVisitaMDL: isMdl ? 'PERIODICA' : null,
                    dataOra: now,
                    // dataInizio and isMDL are local-only, not in Prisma Visita schema
                }
            })

            navigate(`/visite/${visitResult.id}`, { state: { from: searchParams.get('from') || '/visite/nuova' } })
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Errore durante la creazione della visita. Riprova.')
        } finally {
            setCreating(false)
        }
    }, [selectedPatient, user, currentTenantId, selectedAmbulatorioId, selectedPrestazioneId, prestazioni, navigate, searchParams])

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 font-heading flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-teal-600" />
                        Nuova Visita Non Programmata
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Seleziona un paziente e avvia una visita
                    </p>
                </div>
            </div>

            {/* Step 1: Search Patient */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-teal-600" />
                    1. Cerca Paziente
                </h2>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cerca per nome, cognome o codice fiscale..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />

                {/* Patient Results */}
                {patients.length > 0 && !selectedPatient && (
                    <div className="mt-3 max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                        {patients.map(p => (
                            <button
                                key={p.id}
                                onClick={() => { setSelectedPatient(p); setSearchTerm(`${p.lastName} ${p.firstName}`) }}
                                className="w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        {p.lastName} {p.firstName}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        {p.taxCode && (
                                            <span className="text-xs text-gray-400 font-mono">{p.taxCode}</span>
                                        )}
                                        {p.companyName && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Building2 className="w-3 h-3" />
                                                {p.companyName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-teal-600 font-medium">Seleziona</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Selected Patient Badge */}
                {selectedPatient && (
                    <div className="mt-3 flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
                        <div>
                            <p className="text-sm font-medium text-teal-800">
                                {selectedPatient.lastName} {selectedPatient.firstName}
                            </p>
                            <div className="flex items-center gap-3 mt-0.5">
                                {selectedPatient.taxCode && (
                                    <span className="text-xs text-teal-600 font-mono">{selectedPatient.taxCode}</span>
                                )}
                                {selectedPatient.companyName && (
                                    <span className="text-xs text-teal-600 flex items-center gap-1">
                                        <Building2 className="w-3 h-3" />
                                        {selectedPatient.companyName}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => { setSelectedPatient(null); setSearchTerm('') }}
                            className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                        >
                            Cambia
                        </button>
                    </div>
                )}

                {searchTerm.length > 0 && searchTerm.length < 2 && (
                    <p className="text-xs text-gray-400 mt-2">Digita almeno 2 caratteri per cercare...</p>
                )}
                {searchTerm.length >= 2 && patients.length === 0 && !selectedPatient && (
                    <p className="text-xs text-gray-400 mt-2">Nessun paziente trovato.</p>
                )}
            </div>

            {/* Step 2: Options */}
            {selectedPatient && (
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                    <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-teal-600" />
                        2. Dettagli Visita
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Ambulatorio */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                Ambulatorio
                            </label>
                            <ElegantSelect
                                value={selectedAmbulatorioId}
                                onChange={setSelectedAmbulatorioId}
                                options={[{ value: '', label: '-- Nessuno --' }, ...ambulatori.map(a => ({ value: a.id, label: a.nome }))]}
                            />
                        </div>

                        {/* Prestazione */}
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <label className="block text-xs font-medium text-gray-600">
                                    <Stethoscope className="w-3 h-3 inline mr-1" />
                                    Prestazione
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowAllPrestazioni(prev => !prev)}
                                    className="text-[11px] font-medium text-teal-700 hover:text-teal-800"
                                >
                                    {showAllPrestazioni ? 'Solo medico' : 'Visualizza tutte'}
                                </button>
                            </div>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setPrestazioneDropdownOpen(prev => !prev)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <span className={selectedPrestazioneId ? 'truncate text-gray-900' : 'text-gray-400'}>
                                        {prestazioni.find(p => p.id === selectedPrestazioneId)?.nome || '-- Seleziona --'}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${prestazioneDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {prestazioneDropdownOpen && (
                                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                                        <div className="border-b border-gray-100 p-2">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={prestazioneSearchTerm}
                                                    onChange={e => setPrestazioneSearchTerm(e.target.value)}
                                                    placeholder="Cerca prestazione..."
                                                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto py-1">
                                            {filteredPrestazioni.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedPrestazioneId(p.id)
                                                        setPrestazioneDropdownOpen(false)
                                                        setPrestazioneSearchTerm('')
                                                    }}
                                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-teal-50"
                                                >
                                                    <span className="truncate">{p.nome}</span>
                                                    {selectedPrestazioneId === p.id && <Check className="w-4 h-4 text-teal-600" />}
                                                </button>
                                            ))}
                                            {filteredPrestazioni.length === 0 && (
                                                <div className="px-3 py-3 text-xs text-amber-600">
                                                    Nessuna prestazione disponibile per questo medico con il filtro corrente.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {filteredPrestazioni.length === 0 && (
                                <p className="mt-1 text-[11px] text-amber-600">
                                    Nessuna prestazione disponibile per questo medico con il filtro corrente.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Confirm */}
            {selectedPatient && (
                <div className="space-y-3">
                    {createError && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                            <span>{createError}</span>
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button
                            onClick={handleCreate}
                            disabled={creating || !selectedPrestazioneId}
                            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium shadow-sm transition-all disabled:opacity-50"
                        >
                            {creating ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            Avvia Visita
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
