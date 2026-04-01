/**
 * AppuntamentoForm — Pagina di creazione/modifica appuntamento
 *
 * Rimpiazza il vecchio wizard a 4 step con un form a tab unico e più completo,
 * che specchia le stesse opzioni del modal AccettazionePazienteModal:
 *   - Tab "Appuntamento": data/ora, medico, prestazione, ambulatorio, stato, convenzione, note
 *   - Tab "Paziente": anagrafica, residenza, contatti
 *   - Tab "Fatturazione": QuickFatturazioneTab
 *
 * @module pages/clinica/agenda/AppuntamentoForm
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Save,
    Loader2,
    Calendar,
    User,
    FileText,
    Clock,
    Stethoscope,
    Building2,
    Search,
    X,
    ChevronDown,
    CheckCircle,
    Play,
    Ban,
    XCircle,
    RotateCcw,
    UserCheck,
    AlertCircle,
    Pencil
} from 'lucide-react';

import {
    appuntamentiApi,
    pazientiApi,
    prestazioniApi,
    ambulatoriApi,
    mediciApi,
    convenzioniApi,
    Appuntamento,
    Paziente
} from '../../../services/clinicaApi';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { ComuneAutocomplete } from '../../../components/ui/ComuneAutocomplete';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { useBillingAccess } from '../../../hooks/useBillingAccess';
import { useToast } from '../../../hooks/useToast';
import QuickFatturazioneTab from '../../finance/billing/components/QuickFatturazioneTab';
import {
    extractGenderFromTaxCode,
    extractBirthDateFromTaxCode,
    isValidTaxCode
} from '../../../utils/codiceFiscale';
import { getCapByProvincia } from '../../../data/comuniItaliani';
import type { ComuneItaliano } from '../../../data/comuniItaliani';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = 'appuntamento' | 'paziente' | 'fatturazione';

interface AppFormData {
    // Appuntamento
    data: string;
    oraInizio: string;
    durataMinuti: number;
    medicoId: string;
    prestazioneId: string;
    ambulatorioId: string;
    stato: string;
    convenzioneId: string;
    note: string;
    noteInterne: string;
    // Paziente
    pazienteId: string;
    nome: string;
    cognome: string;
    codiceFiscale: string;
    sesso: 'MALE' | 'FEMALE' | '';
    dataNascita: string;
    comuneNascita: string;
    provinciaNascita: string;
    indirizzo: string;
    cap: string;
    comune: string;
    provincia: string;
    telefono: string;
    email: string;
}

const INITIAL_FORM: AppFormData = {
    data: '',
    oraInizio: '',
    durataMinuti: 30,
    medicoId: '',
    prestazioneId: '',
    ambulatorioId: '',
    stato: 'PRENOTATO',
    convenzioneId: '',
    note: '',
    noteInterne: '',
    pazienteId: '',
    nome: '',
    cognome: '',
    codiceFiscale: '',
    sesso: '',
    dataNascita: '',
    comuneNascita: '',
    provinciaNascita: '',
    indirizzo: '',
    cap: '',
    comune: '',
    provincia: '',
    telefono: '',
    email: ''
};

// ─── Stato config ─────────────────────────────────────────────────────────────

const STATO_CONFIG: Record<string, {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    tx: string;
    border: string;
}> = {
    PRENOTATO: { label: 'Prenotato', icon: Calendar, bg: 'bg-blue-50', tx: 'text-blue-700', border: 'border-blue-200' },
    CONFERMATO: { label: 'Confermato', icon: CheckCircle, bg: 'bg-emerald-50', tx: 'text-emerald-700', border: 'border-emerald-200' },
    IN_ATTESA: { label: 'In Attesa', icon: Clock, bg: 'bg-amber-50', tx: 'text-amber-700', border: 'border-amber-200' },
    IN_CORSO: { label: 'In Visita', icon: Play, bg: 'bg-purple-50', tx: 'text-purple-700', border: 'border-purple-200' },
    COMPLETATO: { label: 'Refertato', icon: UserCheck, bg: 'bg-green-50', tx: 'text-green-700', border: 'border-green-200' },
    ANNULLATO: { label: 'Annullato', icon: XCircle, bg: 'bg-red-50', tx: 'text-red-700', border: 'border-red-200' },
    NO_SHOW: { label: 'Non presentato', icon: Ban, bg: 'bg-gray-100', tx: 'text-gray-700', border: 'border-gray-300' },
    RINVIATO: { label: 'Rinviato', icon: RotateCcw, bg: 'bg-orange-50', tx: 'text-orange-700', border: 'border-orange-200' }
};

// ─── Field helpers ────────────────────────────────────────────────────────────

const InputField: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    error?: string;
    disabled?: boolean;
}> = ({ label, value, onChange, placeholder, type = 'text', required, error, disabled }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 transition-colors
                ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 dark:border-gray-600'}
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
);

const SelectField: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    required?: boolean;
    placeholder?: string;
}> = ({ label, value, onChange, options, required, placeholder = 'Seleziona\u2026' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 appearance-none pr-8"
            >
                <option value="">{placeholder}</option>
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const AppuntamentoForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();

    const isEditing = !!id;
    const [activeTab, setActiveTab] = useState<TabId>('appuntamento');
    const { hasBillingFeature } = useBillingAccess();
    const [form, setForm] = useState<AppFormData>({
        ...INITIAL_FORM,
        data: searchParams.get('data') || '',
        oraInizio: searchParams.get('ora') || '',
        medicoId: searchParams.get('medicoId') || ''
    });

    // CF validation state
    const [cfValid, setCfValid] = useState(false);
    const [cfError, setCfError] = useState('');

    // Prevents auto-overwriting durataMinuti when loading existing appointment:
    // set to existing.prestazioneId so the first selectedPrestazione match is skipped.
    const skipDurataAutoSetRef = useRef<string | null>(null);

    // Patient search UI
    const [pazSearch, setPazSearch] = useState('');
    const [showPazSearch, setShowPazSearch] = useState(false);

    // ── Queries ──────────────────────────────────────────────────────────────

    const { data: existing, isLoading: loadingExisting } = useQuery({
        queryKey: ['appuntamento', id],
        queryFn: () => appuntamentiApi.getById(id!),
        enabled: isEditing
    });

    const { data: prestazioniData } = useQuery({
        queryKey: ['prestazioni-list'],
        queryFn: () => prestazioniApi.getAll({ limit: 200, filters: { isActive: true } })
    });

    const { data: ambulatoriData } = useQuery({
        queryKey: ['ambulatori-list'],
        queryFn: () => ambulatoriApi.getAll({ limit: 100, filters: { isActive: true } })
    });

    const { data: mediciData } = useQuery({
        queryKey: ['medici-list'],
        queryFn: () => mediciApi.getAll({ limit: 100 })
    });

    const { data: convenzioniData } = useQuery({
        queryKey: ['convenzioni', 'active'],
        queryFn: () => convenzioniApi.getAll({ limit: 100 })
    });

    const { data: pazSearchData } = useQuery({
        queryKey: ['pazienti-search', pazSearch],
        queryFn: () => pazientiApi.getAll({ search: pazSearch, limit: 15 }),
        enabled: pazSearch.length >= 2
    });

    // ── Options ───────────────────────────────────────────────────────────────

    const prestazioniOptions = useMemo(() =>
        (prestazioniData?.data || []).map(p => ({ value: p.id, label: `${p.nome}${p.codice ? ` (${p.codice})` : ''}` }))
        , [prestazioniData]);

    const ambulatoriOptions = useMemo(() =>
        (ambulatoriData?.data || []).map(a => ({ value: a.id, label: a.nome }))
        , [ambulatoriData]);

    const mediciOptions = useMemo(() =>
        (mediciData?.data || []).map(m => ({
            value: m.id,
            label: `${m.cognome || m.lastName || ''} ${m.nome || m.firstName || ''}`.trim()
        }))
        , [mediciData]);

    const convenzioniOptions = useMemo(() =>
        (convenzioniData?.data || [])
            .filter(c => c.attiva !== false)
            .map(c => ({ value: c.id, label: `${c.nome}${c.codice ? ` \u2014 ${c.codice}` : ''}` }))
        , [convenzioniData]);

    const selectedPrestazione = useMemo(() =>
        (prestazioniData?.data || []).find(p => p.id === form.prestazioneId)
        , [prestazioniData, form.prestazioneId]);

    // ── Init from existing ────────────────────────────────────────────────────

    useEffect(() => {
        if (!existing) return;
        const dt = new Date(existing.dataOra);
        const paziente = existing.paziente;

        const formatBirthDate = (v?: string | null) => {
            if (!v) return '';
            try { return new Date(v).toISOString().split('T')[0]; } catch { return ''; }
        };

        // Mark the loaded prestazioneId so auto-set won't overwrite saved duration
        skipDurataAutoSetRef.current = existing.prestazioneId || null;

        setForm({
            data: dt.toISOString().split('T')[0],
            oraInizio: `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`,
            durataMinuti: existing.durataMinuti || 30,
            medicoId: existing.medicoId || '',
            prestazioneId: existing.prestazioneId || '',
            ambulatorioId: existing.ambulatorioId || '',
            stato: existing.stato || 'PRENOTATO',
            convenzioneId: existing.convenzioneId || '',
            note: existing.note || '',
            noteInterne: existing.noteInterne || '',
            pazienteId: existing.pazienteId || '',
            nome: paziente?.nome || paziente?.firstName || '',
            cognome: paziente?.cognome || paziente?.lastName || '',
            codiceFiscale: paziente?.codiceFiscale || paziente?.taxCode || '',
            sesso: (paziente?.gender || paziente?.sesso || '') as 'MALE' | 'FEMALE' | '',
            dataNascita: formatBirthDate(paziente?.dataNascita || paziente?.birthDate),
            comuneNascita: paziente?.birthPlace || paziente?.comuneNascita || '',
            provinciaNascita: paziente?.birthProvince || paziente?.provinciaNascita || '',
            indirizzo: paziente?.residenceAddress || paziente?.indirizzo || '',
            cap: paziente?.postalCode || paziente?.cap || '',
            comune: paziente?.residenceCity || paziente?.comune || '',
            provincia: paziente?.province || paziente?.provincia || '',
            telefono: paziente?.telefono || paziente?.phone || '',
            email: paziente?.email || ''
        });

        const cf = paziente?.codiceFiscale || paziente?.taxCode || '';
        if (cf && isValidTaxCode(cf)) setCfValid(true);
    }, [existing]);

    // Auto-set duration from prestazione — skips the initial load when editing
    useEffect(() => {
        if (!selectedPrestazione?.durataPrevista) return;
        // If this is the prestazione loaded from existing, skip once (preserve saved duration)
        if (skipDurataAutoSetRef.current === selectedPrestazione.id) {
            skipDurataAutoSetRef.current = null; // allow subsequent changes to auto-set
            return;
        }
        setForm(p => ({ ...p, durataMinuti: selectedPrestazione!.durataPrevista }));
    }, [selectedPrestazione]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const set = useCallback(<K extends keyof AppFormData>(field: K, value: AppFormData[K]) => {
        setForm(p => ({ ...p, [field]: value }));
    }, []);

    const handleCFChange = useCallback((cf: string) => {
        const upper = cf.toUpperCase();
        if (upper.length === 16 && isValidTaxCode(upper)) {
            setCfValid(true);
            setCfError('');
            const gender = extractGenderFromTaxCode(upper);
            const bDate = extractBirthDateFromTaxCode(upper);
            setForm(p => ({
                ...p,
                codiceFiscale: upper,
                sesso: gender === 'FEMALE' ? 'FEMALE' : gender === 'MALE' ? 'MALE' : p.sesso,
                dataNascita: bDate ? bDate.toISOString().split('T')[0] : p.dataNascita
            }));
        } else {
            setCfValid(false);
            setCfError(upper.length === 16 ? 'Codice fiscale non valido' : '');
            set('codiceFiscale', upper);
        }
    }, [set]);

    const handleComuneNascitaSelect = useCallback((comune: ComuneItaliano | null) => {
        if (comune) setForm(p => ({ ...p, comuneNascita: comune.nome, provinciaNascita: comune.provincia }));
    }, []);

    const handleComuneResidenzaSelect = useCallback((comune: ComuneItaliano | null) => {
        if (comune) {
            const cap = getCapByProvincia(comune.provincia) || '';
            setForm(p => ({ ...p, comune: comune.nome, provincia: comune.provincia, cap: cap || p.cap }));
        }
    }, []);

    const handleSelectPaziente = useCallback((paz: Paziente) => {
        const fmt = (v?: string | null) => {
            if (!v) return '';
            try { return new Date(v).toISOString().split('T')[0]; } catch { return ''; }
        };
        setForm(p => ({
            ...p,
            pazienteId: paz.id,
            nome: paz.nome || paz.firstName || '',
            cognome: paz.cognome || paz.lastName || '',
            codiceFiscale: paz.codiceFiscale || paz.taxCode || '',
            sesso: (paz.gender || paz.sesso || '') as 'MALE' | 'FEMALE' | '',
            dataNascita: fmt(paz.dataNascita || paz.birthDate),
            comuneNascita: paz.birthPlace || paz.comuneNascita || '',
            provinciaNascita: paz.birthProvince || paz.provinciaNascita || '',
            indirizzo: paz.residenceAddress || paz.indirizzo || '',
            cap: paz.postalCode || paz.cap || '',
            comune: paz.residenceCity || paz.comune || '',
            provincia: paz.province || paz.provincia || '',
            telefono: paz.telefono || paz.phone || '',
            email: paz.email || ''
        }));
        const cf = paz.codiceFiscale || paz.taxCode || '';
        if (cf && isValidTaxCode(cf)) setCfValid(true);
        setShowPazSearch(false);
        setPazSearch('');
    }, []);

    // ── Mutations ─────────────────────────────────────────────────────────────

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!form.data || !form.oraInizio) throw new Error('Data e ora obbligatori');
            const dataOra = `${form.data}T${form.oraInizio}:00`;

            // 1. Save / update patient data if name is provided
            if (form.nome && form.cognome) {
                await pazientiApi.findOrCreate({
                    existingPersonId: form.pazienteId || undefined,
                    firstName: form.nome,
                    lastName: form.cognome,
                    taxCode: form.codiceFiscale || '',
                    gender: form.sesso || undefined,
                    birthDate: form.dataNascita || undefined,
                    birthPlace: form.comuneNascita || undefined,
                    birthProvince: form.provinciaNascita || undefined,
                    email: form.email || undefined,
                    phone: form.telefono || undefined,
                    residenceAddress: form.indirizzo || undefined,
                    residenceCity: form.comune || undefined,
                    postalCode: form.cap || undefined,
                    province: form.provincia || undefined
                });
            }

            // 2. Save appointment
            const payload: Partial<Appuntamento> = {
                pazienteId: form.pazienteId || undefined,
                medicoId: form.medicoId || undefined,
                prestazioneId: form.prestazioneId || undefined,
                ambulatorioId: form.ambulatorioId || undefined,
                convenzioneId: form.convenzioneId || undefined,
                dataOra,
                durataMinuti: form.durataMinuti,
                stato: form.stato as Appuntamento['stato'],
                note: form.note || undefined,
                noteInterne: form.noteInterne || undefined
            };

            if (isEditing) {
                return appuntamentiApi.update(id!, payload);
            } else {
                return appuntamentiApi.create(payload);
            }
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            if (isEditing) {
                queryClient.invalidateQueries({ queryKey: ['appuntamento', id] });
            }
            showToast({ message: isEditing ? 'Appuntamento aggiornato' : 'Appuntamento creato', type: 'success' });
            const newId = isEditing ? id : (result as Appuntamento)?.id;
            navigate(newId ? `/clinica/agenda/appuntamenti/${newId}` : '/clinica/agenda/appuntamenti');
        },
        onError: () => {
            showToast({ message: 'Errore durante il salvataggio', type: 'error' });
        }
    });

    // ── Tab definitions ───────────────────────────────────────────────────────

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'appuntamento', label: 'Appuntamento', icon: <Calendar className="h-4 w-4" /> },
        { id: 'paziente', label: 'Paziente', icon: <User className="h-4 w-4" /> },
        ...(hasBillingFeature ? [{ id: 'fatturazione' as const, label: 'Fatturazione', icon: <FileText className="h-4 w-4" /> }] : [])
    ];

    useEffect(() => {
        if (!hasBillingFeature && activeTab === 'fatturazione') {
            setActiveTab('appuntamento');
        }
    }, [activeTab, hasBillingFeature]);

    // ── QuickFatturazione context ─────────────────────────────────────────────

    const fattContext = useMemo(() => ({
        tipoServizio: 'VISITA' as const,
        personaId: form.pazienteId || undefined,
        prezzoDefault: selectedPrestazione?.prezzoBase ? Number(selectedPrestazione.prezzoBase) : undefined,
        descrizioneDefault: selectedPrestazione?.nome,
        visitaId: undefined
    }), [form.pazienteId, selectedPrestazione]);

    // ── Loading ───────────────────────────────────────────────────────────────

    if (isEditing && loadingExisting) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

            {/* Sticky header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 flex-shrink-0"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {isEditing ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
                            </h1>
                            {existing && (
                                <p className="text-xs text-gray-500 truncate">#{existing.numero}</p>
                            )}
                        </div>
                    </div>

                    <CRUDPrimaryButton
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-2 flex-shrink-0"
                    >
                        {saveMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Save className="h-4 w-4" />}
                        {isEditing ? 'Salva modifiche' : 'Crea appuntamento'}
                    </CRUDPrimaryButton>
                </div>

                {/* Tab bar */}
                <div className="max-w-4xl mx-auto px-4 flex gap-0 border-t border-gray-100 dark:border-gray-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                                ${activeTab === tab.id
                                    ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* TAB: APPUNTAMENTO */}
                {activeTab === 'appuntamento' && (
                    <div className="space-y-6">

                        {/* Data / Ora / Durata */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Data e Orario
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Data <span className="text-red-500">*</span>
                                    </label>
                                    <DatePickerElegante
                                        value={form.data}
                                        onChange={v => set('data', v ? v.toISOString().split('T')[0] : '')}
                                        placeholder="Seleziona data"
                                    />
                                </div>
                                <InputField
                                    label="Ora inizio"
                                    value={form.oraInizio}
                                    onChange={v => set('oraInizio', v)}
                                    type="time"
                                    required
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Durata (min)
                                    </label>
                                    <input
                                        type="number"
                                        min={5}
                                        max={480}
                                        step={5}
                                        value={form.durataMinuti}
                                        onChange={e => set('durataMinuti', Number(e.target.value) || 30)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Medico / Prestazione / Ambulatorio / Convenzione */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Stethoscope className="h-4 w-4" />
                                Medico e Prestazione
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <SelectField
                                    label="Medico"
                                    value={form.medicoId}
                                    onChange={v => set('medicoId', v)}
                                    options={mediciOptions}
                                    required
                                    placeholder="Seleziona medico..."
                                />
                                <SelectField
                                    label="Prestazione"
                                    value={form.prestazioneId}
                                    onChange={v => set('prestazioneId', v)}
                                    options={prestazioniOptions}
                                    placeholder="Seleziona prestazione..."
                                />
                                <SelectField
                                    label="Ambulatorio"
                                    value={form.ambulatorioId}
                                    onChange={v => set('ambulatorioId', v)}
                                    options={ambulatoriOptions}
                                    required
                                    placeholder="Seleziona ambulatorio..."
                                />
                                <SelectField
                                    label="Convenzione"
                                    value={form.convenzioneId}
                                    onChange={v => set('convenzioneId', v)}
                                    options={convenzioniOptions}
                                    placeholder="Nessuna convenzione"
                                />
                            </div>
                        </div>

                        {/* Stato */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                Stato Appuntamento
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(STATO_CONFIG).map(([key, cfg]) => {
                                    const Icon = cfg.icon;
                                    const isActive = form.stato === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => set('stato', key)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                                                ${isActive
                                                    ? `${cfg.bg} ${cfg.tx} ${cfg.border} ring-2 ring-offset-1 ring-teal-400`
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <Icon className="h-3 w-3" />
                                            {cfg.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Note */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                Note
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Note (visibili al paziente)
                                    </label>
                                    <textarea
                                        value={form.note}
                                        onChange={e => set('note', e.target.value)}
                                        rows={3}
                                        placeholder="Istruzioni o informazioni per il paziente..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Note interne
                                    </label>
                                    <textarea
                                        value={form.noteInterne}
                                        onChange={e => set('noteInterne', e.target.value)}
                                        rows={3}
                                        placeholder="Note riservate al personale clinico..."
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: PAZIENTE */}
                {activeTab === 'paziente' && (
                    <div className="space-y-6">

                        {/* Cerca / seleziona paziente */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Paziente
                                </h2>
                                {form.pazienteId && (
                                    <button
                                        onClick={() => setShowPazSearch(v => !v)}
                                        className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
                                    >
                                        <Pencil className="h-3 w-3" />
                                        Cambia paziente
                                    </button>
                                )}
                            </div>

                            {form.pazienteId && !showPazSearch && (
                                <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg mb-4">
                                    <div className="w-9 h-9 rounded-full bg-teal-200 dark:bg-teal-700 flex items-center justify-center flex-shrink-0">
                                        <User className="h-5 w-5 text-teal-700 dark:text-teal-300" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                            {form.cognome} {form.nome}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                            {form.codiceFiscale || form.telefono || form.email || '\u2014'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { set('pazienteId', ''); setShowPazSearch(true); }}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {(!form.pazienteId || showPazSearch) && (
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={pazSearch}
                                        onChange={e => setPazSearch(e.target.value)}
                                        placeholder="Cerca paziente per nome, cognome o CF..."
                                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-gray-100"
                                        autoFocus
                                    />
                                    {pazSearch.length >= 2 && pazSearchData?.data && (
                                        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                                            {pazSearchData.data.length === 0 ? (
                                                <div className="p-3 text-sm text-gray-500 text-center">Nessun paziente trovato</div>
                                            ) : (
                                                pazSearchData.data.map(paz => (
                                                    <button
                                                        key={paz.id}
                                                        onClick={() => handleSelectPaziente(paz)}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                                            <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                                {paz.cognome || paz.lastName} {paz.nome || paz.firstName}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {paz.codiceFiscale || paz.taxCode || paz.telefono || paz.phone || '\u2014'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(!form.pazienteId || showPazSearch) && pazSearch.length < 2 && (
                                <p className="text-xs text-gray-400 text-center py-2">
                                    Inserisci almeno 2 caratteri per cercare, oppure compila i campi sotto per un nuovo paziente
                                </p>
                            )}
                        </div>

                        {/* Anagrafica */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                Anagrafica
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputField label="Cognome" value={form.cognome} onChange={v => set('cognome', v)} required />
                                <InputField label="Nome" value={form.nome} onChange={v => set('nome', v)} required />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Codice Fiscale
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={form.codiceFiscale}
                                            onChange={e => handleCFChange(e.target.value)}
                                            maxLength={16}
                                            placeholder="RSSMRA80A01H501Z"
                                            className={`w-full px-3 py-2 pr-8 border rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:text-gray-100 transition-colors
                                                ${cfError ? 'border-red-400' : cfValid ? 'border-green-400' : 'border-gray-300 dark:border-gray-600'}`}
                                        />
                                        {cfValid && (
                                            <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                                        )}
                                        {cfError && (
                                            <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                        )}
                                    </div>
                                    {cfError && <p className="mt-1 text-xs text-red-600">{cfError}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Sesso
                                    </label>
                                    <div className="flex gap-3">
                                        {(['MALE', 'FEMALE'] as const).map(s => (
                                            <label key={s} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border cursor-pointer text-sm transition-all
                                                ${form.sesso === s
                                                    ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-600'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
                                                <input type="radio" name="sesso" value={s} checked={form.sesso === s}
                                                    onChange={() => set('sesso', s)} className="sr-only" />
                                                {s === 'MALE' ? 'Maschio' : 'Femmina'}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Data di nascita
                                    </label>
                                    <DatePickerElegante
                                        value={form.dataNascita}
                                        onChange={v => set('dataNascita', v ? v.toISOString().split('T')[0] : '')}
                                        placeholder="gg/mm/aaaa"
                                        maxDate={new Date()}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Comune di nascita
                                    </label>
                                    <ComuneAutocomplete
                                        value={form.comuneNascita}
                                        onChange={v => set('comuneNascita', v)}
                                        onSelect={handleComuneNascitaSelect}
                                        placeholder="Cerca comune di nascita..."
                                    />
                                </div>
                                <InputField
                                    label="Provincia di nascita"
                                    value={form.provinciaNascita}
                                    onChange={v => set('provinciaNascita', v.toUpperCase())}
                                    placeholder="es. MI"
                                />
                            </div>
                        </div>

                        {/* Residenza */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                Residenza
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <InputField
                                        label="Indirizzo"
                                        value={form.indirizzo}
                                        onChange={v => set('indirizzo', v)}
                                        placeholder="Via Roma 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Comune di residenza
                                    </label>
                                    <ComuneAutocomplete
                                        value={form.comune}
                                        onChange={v => set('comune', v)}
                                        onSelect={handleComuneResidenzaSelect}
                                        placeholder="Cerca comune..."
                                    />
                                </div>
                                <InputField label="CAP" value={form.cap} onChange={v => set('cap', v)} placeholder="20100" />
                                <InputField
                                    label="Provincia"
                                    value={form.provincia}
                                    onChange={v => set('provincia', v.toUpperCase())}
                                    placeholder="MI"
                                />
                            </div>
                        </div>

                        {/* Contatti */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                Contatti
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InputField
                                    label="Telefono / Cellulare"
                                    value={form.telefono}
                                    onChange={v => set('telefono', v)}
                                    type="tel"
                                    placeholder="+39 333 1234567"
                                />
                                <InputField
                                    label="E-mail"
                                    value={form.email}
                                    onChange={v => set('email', v)}
                                    type="email"
                                    placeholder="paziente@email.it"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB: FATTURAZIONE */}
                {hasBillingFeature && activeTab === 'fatturazione' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                        {form.pazienteId ? (
                            <QuickFatturazioneTab context={fattContext} compact />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                                <FileText className="h-12 w-12 mb-4 text-gray-200" />
                                <p className="font-medium text-gray-500">Seleziona un paziente</p>
                                <p className="text-sm mt-1">Vai al tab Paziente per collegare un paziente all'appuntamento.</p>
                                <CRUDButton
                                    onClick={() => setActiveTab('paziente')}
                                    className="mt-4 flex items-center gap-2"
                                >
                                    <User className="h-4 w-4" />
                                    Vai a Paziente
                                </CRUDButton>
                            </div>
                        )}
                    </div>
                )}

                {/* Bottom save bar */}
                <div className="flex justify-end pt-2 pb-8">
                    <CRUDPrimaryButton
                        onClick={() => saveMutation.mutate()}
                        disabled={saveMutation.isPending}
                        className="flex items-center gap-2"
                    >
                        {saveMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Save className="h-4 w-4" />}
                        {isEditing ? 'Salva modifiche' : 'Crea appuntamento'}
                    </CRUDPrimaryButton>
                </div>
            </div>
        </div>
    );
};

export default AppuntamentoForm;
