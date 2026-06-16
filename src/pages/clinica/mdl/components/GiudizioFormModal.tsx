/**
 * GiudizioFormModal - Modal per creare/modificare giudizi di idoneità.
 *
 * Il flusso di creazione è vincolato a una visita medica del lavoro:
 * azienda -> lavoratore -> visita MDL -> prefill campi clinici.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    Ban,
    Briefcase,
    Building2,
    Calendar,
    ClipboardList,
    Loader2,
    Search,
    Stethoscope,
    User
} from 'lucide-react';
import Modal from '../../../../design-system/molecules/Modal/Modal';
import {
    clinicaApi,
    mediciApi,
    type GiudizioIdoneita,
    type StatoGiudizio,
    type TipoGiudizioIdoneita
} from '../../../../services/clinicaApi';
import { apiGet } from '../../../../services/api';
import { useTenantFilter } from '../../../../context/TenantFilterContext';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import { getMedicoTitle } from '../../../../utils/textFormatters';

const TIPI_GIUDIZIO: { value: TipoGiudizioIdoneita; label: string; color: string }[] = [
    { value: 'IDONEO', label: 'Idoneo', color: 'bg-green-100 text-green-800' },
    { value: 'IDONEO_CON_PRESCRIZIONI', label: 'Idoneo parziale con prescrizioni', color: 'bg-blue-100 text-blue-800' },
    { value: 'IDONEO_CON_LIMITAZIONI', label: 'Idoneo parziale con limitazioni', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI', label: 'Idoneo parziale con limitazioni e prescrizioni', color: 'bg-amber-100 text-amber-800' },
    { value: 'NON_IDONEO_TEMPORANEO', label: 'Temporaneamente non idoneo', color: 'bg-orange-100 text-orange-800' },
    { value: 'NON_IDONEO_PERMANENTE', label: 'Non idoneo permanente', color: 'bg-red-100 text-red-800' }
];

const PRESCRIZIONI_OPTIONS: { value: string; label: string }[] = [
    { value: 'uso_dpi_guanti', label: 'Uso obbligatorio DPI: guanti protettivi' },
    { value: 'uso_dpi_scarpe', label: 'Uso obbligatorio DPI: scarpe antinfortunistiche' },
    { value: 'uso_dpi_cuffie', label: 'Uso obbligatorio DPI: cuffie / tappi antirumore' },
    { value: 'uso_dpi_mascherina', label: 'Uso obbligatorio DPI: mascherina FFP2/FFP3' },
    { value: 'uso_dpi_visiera', label: 'Uso obbligatorio DPI: visiera / occhiali protettivi' },
    { value: 'uso_dpi_imbracatura', label: 'Uso obbligatorio DPI: imbracatura di sicurezza' },
    { value: 'divieto_mmc_20', label: 'Divieto movimentazione manuale carichi > 20 kg' },
    { value: 'divieto_mmc_10', label: 'Divieto movimentazione manuale carichi > 10 kg' },
    { value: 'pause_vdt', label: 'Pause obbligatorie VDT: 15 minuti ogni 2 ore' },
    { value: 'limitazione_notturno', label: 'Limitazione turni notturni' },
    { value: 'controllo_oft_annuale', label: 'Controllo oftalmologico annuale' },
    { value: 'sorveg_rafforzata_semestrale', label: 'Sorveglianza sanitaria rafforzata semestrale' },
    { value: 'formazione_rischio_chimico', label: 'Obbligo formazione specifica rischio chimico' },
    { value: 'formazione_rischio_biologico', label: 'Obbligo formazione specifica rischio biologico' },
    { value: 'evitare_cancerogeni', label: 'Evitare esposizione a sostanze cancerogene / mutagene' },
    { value: 'esposizione_rumore_limitata', label: 'Limitazione esposizione a rumore' },
];

const LIMITAZIONI_OPTIONS: { value: string; label: string }[] = [
    { value: 'no_lavoro_quota', label: 'Non idoneo a lavori in quota' },
    { value: 'no_piattaforme_elevabili', label: 'Non idoneo a lavori su piattaforme elevabili / cestelli' },
    { value: 'no_guida_mezzi', label: 'Non idoneo alla conduzione di automezzi / mezzi operativi' },
    { value: 'no_spazi_confinati', label: 'Non idoneo a lavori in spazi confinati' },
    { value: 'limitazione_notturno_mansione', label: 'Limitata idoneità ai turni notturni' },
    { value: 'no_vibrazioni', label: 'Non idoneo a mansioni con esposizione a vibrazioni mano-braccio' },
    { value: 'no_rumore_85db', label: 'Non idoneo a mansioni con esposizione a rumore > 85 dB' },
    { value: 'limitazione_mmc', label: 'Limitata movimentazione manuale di carichi' },
    { value: 'no_cancerogeni', label: 'Non idoneo a mansioni con esposizione a cancerogeni / mutageni' },
    { value: 'limitazione_chimici', label: 'Limitata esposizione a sostanze chimiche pericolose' },
    { value: 'no_stress_termico', label: 'Non idoneo a lavori con stress termico' },
    { value: 'no_vdt_prolungato', label: 'Uso VDT limitato' },
];

interface GiudizioFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (giudizio: GiudizioIdoneita) => void;
    giudizio?: GiudizioIdoneita | null;
    mode: 'create' | 'edit';
    prefillData?: {
        personId?: string;
        visitaId?: string;
        medicoCompetenteId?: string;
        mansioneIds?: string[];
    };
}

interface FormState {
    personId: string;
    medicoCompetenteId: string;
    visitaId: string;
    mansioneIds: string[];
    tipoGiudizio: TipoGiudizioIdoneita;
    dataScadenza: string;
    prescrizioniIdoneita: string;
    limitazioni: string;
    motivazioni: string;
}

interface FormCompany {
    id: string;
    ragioneSociale: string;
    workerCount: number;
}

interface FormEmployee {
    id: string;
    firstName: string;
    lastName: string;
    taxCode?: string | null;
    companyTenantProfileId?: string | null;
    title?: string | null;
    reparto?: { id: string; nome: string } | null;
    protocolloSanitario?: { id: string; denominazione: string } | null;
    mansioneIds: string[];
}

interface VisitPrefill {
    tipoGiudizio: TipoGiudizioIdoneita;
    dataScadenza?: string | null;
    prescrizioniIdoneita?: string | null;
    limitazioni?: string | null;
    motivazioni?: string | null;
}

interface FormVisit {
    id: string;
    dataOra?: string | null;
    stato: string;
    tipoVisitaMDL?: string | null;
    medicoId?: string | null;
    prestazione?: { id: string; nome: string; tipo: string } | null;
    giudizioIdoneita?: { id: string } | null;
    isDraft: boolean;
    prefill: VisitPrefill;
}

interface GiudizioFormData {
    companies: FormCompany[];
    employees: FormEmployee[];
    visits: FormVisit[];
}

const emptyState: FormState = {
    personId: '',
    medicoCompetenteId: '',
    visitaId: '',
    mansioneIds: [],
    tipoGiudizio: 'IDONEO',
    dataScadenza: '',
    prescrizioniIdoneita: '',
    limitazioni: '',
    motivazioni: ''
};

const decodeOptionsToLabels = (
    stored: string,
    options: { value: string; label: string }[]
): string => {
    if (!stored) return '';
    const codeMap = new Map(options.map(option => [option.value, option.label]));
    return stored
        .split(/[,;\n]+/)
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => codeMap.get(item) ?? item)
        .join('\n');
};

const formatDate = (value?: string | null) => {
    if (!value) return 'Data non indicata';
    return new Date(value).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const toDateInput = (value?: string | null) => {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
};

const buildQuery = (params: Record<string, string | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.append(key, value);
    });
    return searchParams.toString();
};

const GiudizioFormModal: React.FC<GiudizioFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    giudizio,
    mode,
    prefillData
}) => {
    const { getTenantFilterParams, tenantFilterKey, isReady } = useTenantFilter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
    const [formState, setFormState] = useState<FormState>(emptyState);

    const { data: mediciResponse, isLoading: loadingMedici } = useQuery({
        queryKey: ['medici-for-giudizio', tenantFilterKey],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            return mediciApi.getAll({
                limit: 100,
                ...(tenantParams.tenantIds && { tenantIds: tenantParams.tenantIds.join(',') }),
                ...(tenantParams.allTenants && { allTenants: 'true' })
            });
        },
        enabled: isOpen && isReady
    });

    const { data: formDataResponse, isLoading: loadingFormData } = useQuery({
        queryKey: ['giudizio-form-data', tenantFilterKey, selectedCompanyId, formState.personId, search],
        queryFn: async () => {
            const tenantParams = getTenantFilterParams();
            const query = buildQuery({
                companyTenantProfileId: selectedCompanyId,
                personId: formState.personId,
                search: search.trim(),
                tenantIds: tenantParams.tenantIds?.join(','),
                allTenants: tenantParams.allTenants ? 'true' : undefined
            });
            return apiGet<{ success: boolean; data: GiudizioFormData }>(
                `/api/v1/clinica/giudizi-idoneita/form-data?${query}`
            );
        },
        enabled: isOpen && isReady
    });

    const formData = formDataResponse?.data;
    const companies = formData?.companies || [];
    const employees = formData?.employees || [];
    const visits = formData?.visits || [];
    const medici = useMemo(
        () => (mediciResponse?.data || []).filter(m =>
            m.personRoles?.some((r: { roleType: string }) => r.roleType === 'MEDICO_COMPETENTE')
        ),
        [mediciResponse]
    );

    const selectedEmployee = employees.find(employee => employee.id === formState.personId);
    const selectedVisit = visits.find(visit => visit.id === formState.visitaId);

    useEffect(() => {
        if (!isOpen) return;
        if (mode === 'edit' && giudizio) {
            setFormState({
                personId: giudizio.personId || '',
                medicoCompetenteId: giudizio.medicoCompetenteId || '',
                visitaId: giudizio.visitaId || '',
                mansioneIds: giudizio.mansioni?.map(item => item.mansioneId) || [],
                tipoGiudizio: giudizio.tipoGiudizio || 'IDONEO',
                dataScadenza: toDateInput(giudizio.dataScadenza),
                prescrizioniIdoneita: decodeOptionsToLabels(giudizio.prescrizioniIdoneita || '', PRESCRIZIONI_OPTIONS),
                limitazioni: decodeOptionsToLabels(giudizio.limitazioni || '', LIMITAZIONI_OPTIONS),
                motivazioni: giudizio.motivazioni || ''
            });
        } else {
            setFormState({
                ...emptyState,
                personId: prefillData?.personId || '',
                medicoCompetenteId: prefillData?.medicoCompetenteId || '',
                visitaId: prefillData?.visitaId || '',
                mansioneIds: prefillData?.mansioneIds || []
            });
        }
        setSearch('');
        setErrors({});
    }, [giudizio, isOpen, mode, prefillData]);

    useEffect(() => {
        if (!selectedCompanyId && companies.length > 0) {
            setSelectedCompanyId(companies[0].id);
        }
    }, [companies, selectedCompanyId]);

    const selectEmployee = (employee: FormEmployee) => {
        setFormState(prev => ({
            ...prev,
            personId: employee.id,
            visitaId: '',
            mansioneIds: employee.mansioneIds || []
        }));
        setErrors(prev => ({ ...prev, personId: '', visitaId: '' }));
    };

    const selectVisit = (visit: FormVisit) => {
        setFormState(prev => ({
            ...prev,
            visitaId: visit.id,
            medicoCompetenteId: visit.medicoId || prev.medicoCompetenteId,
            tipoGiudizio: visit.prefill.tipoGiudizio || 'IDONEO',
            dataScadenza: toDateInput(visit.prefill.dataScadenza),
            prescrizioniIdoneita: visit.prefill.prescrizioniIdoneita || '',
            limitazioni: visit.prefill.limitazioni || '',
            motivazioni: visit.prefill.motivazioni || ''
        }));
        setErrors(prev => ({ ...prev, visitaId: '' }));
    };

    const validate = (asBozza = false): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formState.personId) newErrors.personId = 'Seleziona un lavoratore';
        if (!formState.visitaId) newErrors.visitaId = 'Seleziona una visita medica del lavoro';
        if (!formState.medicoCompetenteId) newErrors.medicoCompetenteId = 'Seleziona il medico competente';
        if (!asBozza && !formState.tipoGiudizio) newErrors.tipoGiudizio = 'Seleziona il tipo di giudizio';
        if (!asBozza && formState.tipoGiudizio === 'IDONEO_CON_PRESCRIZIONI' && !formState.prescrizioniIdoneita.trim()) {
            newErrors.prescrizioniIdoneita = 'Le prescrizioni sono obbligatorie per questo tipo di giudizio';
        }
        if (!asBozza && formState.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI' && !formState.limitazioni.trim()) {
            newErrors.limitazioni = 'Le limitazioni sono obbligatorie per questo tipo di giudizio';
        }
        if (!asBozza && formState.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI') {
            if (!formState.prescrizioniIdoneita.trim()) newErrors.prescrizioniIdoneita = 'Le prescrizioni sono obbligatorie';
            if (!formState.limitazioni.trim()) newErrors.limitazioni = 'Le limitazioni sono obbligatorie';
        }
        if (!asBozza && formState.tipoGiudizio.startsWith('NON_IDONEO') && !formState.motivazioni.trim()) {
            newErrors.motivazioni = 'Le motivazioni sono obbligatorie per i giudizi di non idoneità';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (event: React.FormEvent, asBozza = false) => {
        event.preventDefault();
        if (!validate(asBozza)) return;

        setIsSubmitting(true);
        try {
            const payload: Partial<GiudizioIdoneita> & { mansioneIds?: string[]; stato?: StatoGiudizio } = {
                personId: formState.personId,
                visitaId: formState.visitaId,
                medicoCompetenteId: formState.medicoCompetenteId,
                tipoGiudizio: formState.tipoGiudizio,
                ...(asBozza && { stato: 'BOZZA' }),
                ...(formState.mansioneIds.length > 0 && { mansioneIds: formState.mansioneIds }),
                ...(formState.dataScadenza && { dataScadenza: new Date(formState.dataScadenza).toISOString() }),
                ...(formState.prescrizioniIdoneita && { prescrizioniIdoneita: formState.prescrizioniIdoneita }),
                ...(formState.limitazioni && { limitazioni: formState.limitazioni }),
                ...(formState.motivazioni && { motivazioni: formState.motivazioni })
            };

            const result = mode === 'edit' && giudizio
                ? await clinicaApi.giudiziIdoneita.update(giudizio.id, payload)
                : await clinicaApi.giudiziIdoneita.create(payload);
            onSuccess(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Errore durante il salvataggio. Riprova.';
            setErrors({ submit: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = loadingMedici || loadingFormData;
    const modalTitle = mode === 'create' ? 'Nuovo Giudizio di Idoneità' : 'Modifica Giudizio';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="xl">
            <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: '78vh' }}>
                <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-2 min-h-0">
                    {errors.submit && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            <p className="text-sm text-red-700">{errors.submit}</p>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                        </div>
                    ) : (
                        <>
                            {mode === 'create' && (
                                <section className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                        <Search className="h-4 w-4 text-gray-400" />
                                        <input
                                            type="search"
                                            value={search}
                                            onChange={event => setSearch(event.target.value)}
                                            placeholder="Cerca azienda, lavoratore o codice fiscale"
                                            className="w-full border-0 bg-transparent text-sm outline-none focus:ring-0"
                                        />
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                                        <div className="rounded-xl border border-gray-200 bg-white">
                                            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-800">
                                                <Building2 className="h-4 w-4 text-teal-600" />
                                                Aziende
                                            </div>
                                            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                                                {companies.length === 0 && (
                                                    <p className="px-2 py-6 text-center text-xs text-gray-400">
                                                        Nessuna azienda con visite MDL disponibili.
                                                    </p>
                                                )}
                                                {companies.map(company => (
                                                    <button
                                                        key={company.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedCompanyId(company.id);
                                                            setFormState(prev => ({ ...prev, personId: '', visitaId: '' }));
                                                        }}
                                                        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${selectedCompanyId === company.id
                                                            ? 'border border-teal-200 bg-teal-50 text-teal-900'
                                                            : 'border border-transparent hover:bg-gray-50 text-gray-700'
                                                            }`}
                                                    >
                                                        <span className="block truncate text-sm font-medium">{company.ragioneSociale}</span>
                                                        <span className="text-xs text-gray-500">{company.workerCount} lavoratori con visite MDL</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-gray-200 bg-white">
                                            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-800">
                                                <User className="h-4 w-4 text-teal-600" />
                                                Dipendenti
                                            </div>
                                            <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                                                {employees.length === 0 && (
                                                    <p className="px-2 py-6 text-center text-xs text-gray-400">
                                                        Nessun dipendente con visite MDL per il filtro selezionato.
                                                    </p>
                                                )}
                                                {employees.map(employee => (
                                                    <button
                                                        key={employee.id}
                                                        type="button"
                                                        onClick={() => selectEmployee(employee)}
                                                        className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${formState.personId === employee.id
                                                            ? 'border border-teal-200 bg-teal-50 text-teal-900'
                                                            : 'border border-transparent hover:bg-gray-50 text-gray-700'
                                                            }`}
                                                    >
                                                        <span className="block text-sm font-medium">
                                                            {employee.lastName} {employee.firstName}
                                                        </span>
                                                        <span className="block truncate font-mono text-[11px] text-gray-500">
                                                            {employee.taxCode || 'CF non indicato'}
                                                        </span>
                                                        <span className="block truncate text-[11px] text-gray-500">
                                                            {[employee.title, employee.reparto?.nome, employee.protocolloSanitario?.denominazione]
                                                                .filter(Boolean)
                                                                .join(' · ') || 'Profilo MDL'}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.personId && <p className="px-3 pb-2 text-sm text-red-600">{errors.personId}</p>}
                                        </div>
                                    </div>
                                </section>
                            )}

                            {selectedEmployee && (
                                <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3">
                                    <p className="text-sm font-semibold text-teal-900">
                                        {selectedEmployee.lastName} {selectedEmployee.firstName}
                                    </p>
                                    <p className="text-xs text-teal-700">
                                        {selectedEmployee.taxCode || 'CF non indicato'}
                                        {selectedEmployee.protocolloSanitario?.denominazione ? ` · ${selectedEmployee.protocolloSanitario.denominazione}` : ''}
                                    </p>
                                </div>
                            )}

                            <section>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Calendar className="h-4 w-4" />
                                    Visita medica del lavoro collegata *
                                </label>
                                <div className="grid gap-2 md:grid-cols-2">
                                    {visits.map(visit => (
                                        <button
                                            key={visit.id}
                                            type="button"
                                            onClick={() => selectVisit(visit)}
                                            disabled={!formState.personId}
                                            className={`rounded-xl border p-3 text-left transition-colors ${formState.visitaId === visit.id
                                                ? 'border-teal-300 bg-teal-50'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {formatDate(visit.dataOra)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {visit.prestazione?.nome || 'Visita Medica del Lavoro'}
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${visit.isDraft
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {visit.isDraft ? 'Bozza' : 'Completata'}
                                                </span>
                                            </div>
                                            {visit.tipoVisitaMDL && (
                                                <p className="mt-2 text-xs text-gray-500">Tipo visita: {visit.tipoVisitaMDL}</p>
                                            )}
                                        </button>
                                    ))}
                                    {formState.personId && visits.length === 0 && (
                                        <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500 md:col-span-2">
                                            Nessuna visita medica del lavoro disponibile per il lavoratore selezionato.
                                        </p>
                                    )}
                                </div>
                                {errors.visitaId && <p className="mt-1 text-sm text-red-600">{errors.visitaId}</p>}
                            </section>

                            {selectedVisit?.isDraft && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                    La visita selezionata è in bozza. Salvando il giudizio come definitivo, la visita collegata verrà allineata e salvata in modo definitivo.
                                </div>
                            )}

                            <section>
                                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Stethoscope className="h-4 w-4" />
                                    Medico competente *
                                </label>
                                <div className="grid gap-2 md:grid-cols-2">
                                    {medici.map(medico => (
                                        <button
                                            key={medico.id}
                                            type="button"
                                            onClick={() => setFormState(prev => ({ ...prev, medicoCompetenteId: medico.id }))}
                                            className={`rounded-xl border p-3 text-left text-sm transition-colors ${formState.medicoCompetenteId === medico.id
                                                ? 'border-teal-300 bg-teal-50 text-teal-900'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                                }`}
                                        >
                                            {getMedicoTitle(medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null)} {medico.lastName} {medico.firstName}
                                        </button>
                                    ))}
                                </div>
                                {errors.medicoCompetenteId && <p className="mt-1 text-sm text-red-600">{errors.medicoCompetenteId}</p>}
                            </section>

                            <section>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo Giudizio *</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {TIPI_GIUDIZIO.map(tipo => (
                                        <label
                                            key={tipo.value}
                                            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${formState.tipoGiudizio === tipo.value
                                                ? 'border-teal-500 bg-teal-50'
                                                : 'border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="tipoGiudizio"
                                                value={tipo.value}
                                                checked={formState.tipoGiudizio === tipo.value}
                                                onChange={() => setFormState(prev => ({ ...prev, tipoGiudizio: tipo.value }))}
                                                className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                                            />
                                            <span className={`rounded px-2 py-0.5 text-sm font-medium ${tipo.color}`}>{tipo.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.tipoGiudizio && <p className="mt-1 text-sm text-red-600">{errors.tipoGiudizio}</p>}
                            </section>

                            <section>
                                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Calendar className="h-4 w-4" />
                                    Data Scadenza
                                </label>
                                <DatePickerElegante
                                    value={formState.dataScadenza}
                                    onChange={(date) => setFormState(prev => ({
                                        ...prev,
                                        dataScadenza: date ? date.toISOString().split('T')[0] : ''
                                    }))}
                                    theme="teal"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Recuperata dalla scadenza “Visita Medica del Lavoro” della card Sorveglianza Sanitaria.
                                </p>
                            </section>

                            {(formState.tipoGiudizio === 'IDONEO_CON_PRESCRIZIONI' || formState.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI' || formState.prescrizioniIdoneita || mode === 'edit') && (
                                <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                                    <label className="mb-1 flex items-center gap-2 text-sm font-medium text-blue-800">
                                        <ClipboardList className="h-4 w-4" />
                                        Prescrizioni
                                    </label>
                                    <textarea
                                        value={formState.prescrizioniIdoneita}
                                        onChange={(event) => setFormState(prev => ({ ...prev, prescrizioniIdoneita: event.target.value }))}
                                        rows={3}
                                        className={`w-full rounded-lg border bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.prescrizioniIdoneita ? 'border-red-500' : 'border-blue-300'}`}
                                        placeholder="Prescrizioni ai sensi della normativa..."
                                    />
                                    {errors.prescrizioniIdoneita && <p className="mt-1 text-sm text-red-600">{errors.prescrizioniIdoneita}</p>}
                                </section>
                            )}

                            {(formState.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI' || formState.tipoGiudizio === 'IDONEO_CON_LIMITAZIONI_PRESCRIZIONI' || formState.limitazioni || mode === 'edit') && (
                                <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                    <label className="mb-1 flex items-center gap-2 text-sm font-medium text-yellow-800">
                                        <Ban className="h-4 w-4" />
                                        Limitazioni
                                    </label>
                                    <textarea
                                        value={formState.limitazioni}
                                        onChange={(event) => setFormState(prev => ({ ...prev, limitazioni: event.target.value }))}
                                        rows={3}
                                        className={`w-full rounded-lg border bg-white px-3 py-2 focus:ring-2 focus:ring-yellow-400 ${errors.limitazioni ? 'border-red-500' : 'border-yellow-300'}`}
                                        placeholder="Limitazioni alla mansione specifica..."
                                    />
                                    {errors.limitazioni && <p className="mt-1 text-sm text-red-600">{errors.limitazioni}</p>}
                                </section>
                            )}

                            {(formState.tipoGiudizio === 'NON_IDONEO_TEMPORANEO' || formState.tipoGiudizio === 'NON_IDONEO_PERMANENTE' || formState.motivazioni || mode === 'edit') && (
                                <section>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Motivazioni / tempistica</label>
                                    <textarea
                                        value={formState.motivazioni}
                                        onChange={(event) => setFormState(prev => ({ ...prev, motivazioni: event.target.value }))}
                                        rows={3}
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-teal-500"
                                        placeholder="Motivazioni del giudizio o durata della non idoneità temporanea..."
                                    />
                                    {errors.motivazioni && <p className="mt-1 text-sm text-red-600">{errors.motivazioni}</p>}
                                </section>
                            )}
                        </>
                    )}
                </div>

                <div className="flex flex-wrap justify-end gap-3 border-t pt-4 mt-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
                        disabled={isSubmitting}
                    >
                        Annulla
                    </button>
                    <button
                        type="button"
                        onClick={(event) => handleSubmit(event as unknown as React.FormEvent, true)}
                        className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Salva come Bozza
                    </button>
                    <button
                        type="submit"
                        className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {mode === 'create' ? 'Crea Giudizio' : 'Salva Modifiche'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default GiudizioFormModal;
