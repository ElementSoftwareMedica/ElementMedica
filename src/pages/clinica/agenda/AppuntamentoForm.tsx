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
    CheckCircle,
    Play,
    Ban,
    XCircle,
    RotateCcw,
    UserCheck,
    AlertCircle,
    Pencil,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

import {
    appuntamentiApi,
    visiteApi,
    pazientiApi,
    prestazioniApi,
    ambulatoriApi,
    mediciApi,
    slotsApi,
    convenzioniApi,
    Appuntamento,
    Paziente,
    SlotDisponibilita
} from '../../../services/clinicaApi';
import { DatePickerElegante } from '../../../components/ui/DatePickerElegante';
import { TimePickerElegante } from '../../../components/ui/TimePickerElegante';
import { ComuneAutocomplete } from '../../../components/ui/ComuneAutocomplete';
import ElegantSelect from '../../../components/ui/ElegantSelect';
import { CRUDButton, CRUDPrimaryButton } from '../../../components/shared/CRUDButton';
import { useBillingAccess } from '../../../hooks/useBillingAccess';
import { useToast } from '../../../hooks/useToast';
import { useSmartBack } from '../../../hooks/useSmartBack';
import QuickFatturazioneTab from '../../finance/billing/components/QuickFatturazioneTab';
import {
    extractGenderFromTaxCode,
    extractBirthDateFromTaxCode,
    isValidTaxCode
} from '../../../utils/codiceFiscale';
import { getCapByProvincia } from '../../../data/comuniItaliani';
import type { ComuneItaliano } from '../../../data/comuniItaliani';
import AvailabilitySlotTimeline from './components/AvailabilitySlotTimeline';
import { DEFAULT_ETHNICITY, ETHNICITY_OPTIONS } from '../../../constants/ethnicityOptions';

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
    etnia: string;
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
    etnia: DEFAULT_ETHNICITY,
    comuneNascita: '',
    provinciaNascita: '',
    indirizzo: '',
    cap: '',
    comune: '',
    provincia: '',
    telefono: '',
    email: ''
};

const toLocalDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const startOfWeek = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d;
};

const getTimeFromDateTime = (value?: string | Date | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const timeToMinutes = (time?: string | null) => {
    if (!time) return 0;
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return (hours * 60) + minutes;
};

const minutesToTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const rangesOverlap = (startA: number, endA: number, startB: number, endB: number) =>
    startA < endB && startB < endA;

const getSlotTimeOptions = (slot: SlotDisponibilita, occupied: Appuntamento[], durationMinutes: number) => {
    const start = timeToMinutes(slot.oraInizio);
    const end = Math.max(timeToMinutes(slot.oraFine), start + durationMinutes);
    const latestStart = Math.max(start, end - durationMinutes);
    const step = 15;
    const times: number[] = [];

    for (let current = start; current <= latestStart; current += step) {
        times.push(current);
    }
    if (!times.length) times.push(start);

    return times.map(minutes => {
        const appointment = occupied.find(app => {
            if (app.medicoId !== slot.medicoId) return false;
            const appStart = timeToMinutes(getTimeFromDateTime(app.dataOra));
            const appEnd = appStart + (app.durataMinuti || durationMinutes || 30);
            return rangesOverlap(minutes, minutes + durationMinutes, appStart, appEnd);
        });
        return {
            time: minutesToTime(minutes),
            occupied: Boolean(appointment),
            appointment
        };
    });
};

const ACTIVE_APPOINTMENT_STATES = 'PRENOTATO,CONFERMATO,IN_ATTESA,IN_CORSO';

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
        <ElegantSelect
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            options={[{ value: '', label: placeholder }, ...options]}
        />
    </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const AppuntamentoForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const goBack = useSmartBack('/poliambulatorio/appuntamenti');
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();

    const isEditing = !!id;
    const shouldCreateDirectVisit = searchParams.get('directVisit') === '1';
    const [activeTab, setActiveTab] = useState<TabId>('appuntamento');
    const { hasBillingFeature } = useBillingAccess();
    const [form, setForm] = useState<AppFormData>({
        ...INITIAL_FORM,
        data: searchParams.get('data') || '',
        oraInizio: searchParams.get('ora') || '',
        medicoId: searchParams.get('medicoId') || '',
        pazienteId: searchParams.get('pazienteId') || searchParams.get('paziente') || ''
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
    const [slotWeekStart, setSlotWeekStart] = useState(() => startOfWeek(searchParams.get('data') ? new Date(`${searchParams.get('data')}T00:00:00`) : new Date()));

    // ── Queries ──────────────────────────────────────────────────────────────

    const { data: existing, isLoading: loadingExisting } = useQuery({
        queryKey: ['appuntamento', id],
        queryFn: () => appuntamentiApi.getById(id!),
        enabled: isEditing
    });

    const preselectedPazienteId = searchParams.get('pazienteId') || searchParams.get('paziente') || '';
    const { data: preselectedPaziente } = useQuery({
        queryKey: ['paziente', preselectedPazienteId],
        queryFn: () => pazientiApi.getById(preselectedPazienteId),
        enabled: !isEditing && !!preselectedPazienteId,
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

    const slotRange = useMemo(() => {
        const start = new Date(slotWeekStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start, end };
    }, [slotWeekStart]);

    const { data: availableSlotsResponse, isFetching: loadingAvailableSlots } = useQuery({
        queryKey: ['appointment-form-slots', form.medicoId, form.prestazioneId, slotRange.start.toISOString()],
        queryFn: () => slotsApi.getAll({
            filters: {
                dataInizio: toLocalDateString(slotRange.start),
                dataFine: toLocalDateString(slotRange.end),
                disponibile: true,
                ...(form.medicoId && { medicoId: form.medicoId }),
                ...(form.prestazioneId && { prestazioneId: form.prestazioneId }),
            },
            limit: 200,
        }),
        enabled: !isEditing && (!!form.medicoId || !!form.prestazioneId),
        staleTime: 30_000,
    });
    const availableSlots = availableSlotsResponse?.data || [];

    const { data: occupiedAppointmentsResponse, isFetching: loadingOccupiedSlots } = useQuery({
        queryKey: ['appointment-form-occupied-slots', form.medicoId, form.prestazioneId, slotRange.start.toISOString()],
        queryFn: () => appuntamentiApi.getAll({
            page: 1,
            limit: 500,
            filters: {
                dataInizio: toLocalDateString(slotRange.start),
                dataFine: toLocalDateString(slotRange.end),
                stato: ACTIVE_APPOINTMENT_STATES,
                ...(form.medicoId && { medicoId: form.medicoId }),
            },
        }),
        enabled: !isEditing && (!!form.medicoId || !!form.prestazioneId),
        staleTime: 15_000,
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

    const prestazioniOptions = useMemo(() => {
        const slotPrestazioneIds = new Set(availableSlots.map((slot: SlotDisponibilita) => slot.prestazioneId).filter(Boolean));
        const shouldFilter = !isEditing && form.medicoId && slotPrestazioneIds.size > 0;
        return (prestazioniData?.data || [])
            .filter(p => !shouldFilter || slotPrestazioneIds.has(p.id))
            .map(p => ({ value: p.id, label: `${p.nome}${p.codice ? ` (${p.codice})` : ''}` }));
    }, [availableSlots, form.medicoId, isEditing, prestazioniData]);

    const ambulatoriOptions = useMemo(() =>
        (ambulatoriData?.data || []).map(a => ({ value: a.id, label: a.nome }))
        , [ambulatoriData]);

    const mediciOptions = useMemo(() => {
        const slotMedicoIds = new Set(availableSlots.map((slot: SlotDisponibilita) => slot.medicoId).filter(Boolean));
        const shouldFilter = !isEditing && form.prestazioneId && slotMedicoIds.size > 0;
        return (mediciData?.data || []).filter(m => !shouldFilter || slotMedicoIds.has(m.id)).map(m => ({
            value: m.id,
            label: `${m.cognome || m.lastName || ''} ${m.nome || m.firstName || ''}`.trim()
        }));
    }, [availableSlots, form.prestazioneId, isEditing, mediciData]);

    const convenzioniOptions = useMemo(() =>
        (convenzioniData?.data || [])
            .filter(c => c.attiva !== false)
            .map(c => ({ value: c.id, label: `${c.nome}${c.codice ? ` \u2014 ${c.codice}` : ''}` }))
        , [convenzioniData]);

    const selectedPrestazione = useMemo(() =>
        (prestazioniData?.data || []).find(p => p.id === form.prestazioneId)
        , [prestazioniData, form.prestazioneId]);

    const selectedAmbulatorio = useMemo(() =>
        ambulatoriOptions.find(a => a.value === form.ambulatorioId)
        , [ambulatoriOptions, form.ambulatorioId]);

    const slotsByDay = useMemo(() => {
        const slotMedicoIds = new Set(availableSlots.map((slot: SlotDisponibilita) => slot.medicoId).filter(Boolean));
        const occupiedAppointments = (occupiedAppointmentsResponse?.data || []).filter(app => {
            if (form.medicoId) return app.medicoId === form.medicoId;
            if (slotMedicoIds.size > 0) return !!app.medicoId && slotMedicoIds.has(app.medicoId);
            return true;
        });
        const days = Array.from({ length: 7 }, (_, index) => {
            const day = new Date(slotRange.start);
            day.setDate(slotRange.start.getDate() + index);
            const key = toLocalDateString(day);
            return { key, date: day, slots: [] as SlotDisponibilita[], occupied: [] as Appuntamento[] };
        });
        for (const slot of availableSlots) {
            const key = String(slot.data).split('T')[0];
            const day = days.find(item => item.key === key);
            if (day) day.slots.push(slot);
        }
        for (const appointment of occupiedAppointments) {
            const key = String(appointment.dataOra).split('T')[0];
            const day = days.find(item => item.key === key);
            if (day) day.occupied.push(appointment);
        }
        return days;
    }, [availableSlots, form.medicoId, occupiedAppointmentsResponse?.data, slotRange.start]);
    const selectedSlotWindow = useMemo(() => {
        if (!form.data) return null;
        const day = slotsByDay.find(item => item.key === form.data);
        if (!day) return null;
        const selectedTime = timeToMinutes(form.oraInizio);
        return day.slots.find(slot => {
            if (form.medicoId && slot.medicoId !== form.medicoId) return false;
            if (form.ambulatorioId && slot.ambulatorioId !== form.ambulatorioId) return false;
            const start = timeToMinutes(slot.oraInizio);
            const end = timeToMinutes(slot.oraFine);
            return selectedTime >= start && selectedTime <= end;
        }) || day.slots.find(slot => !form.medicoId || slot.medicoId === form.medicoId) || null;
    }, [form.ambulatorioId, form.data, form.medicoId, form.oraInizio, slotsByDay]);

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
            etnia: paziente?.etnia || DEFAULT_ETHNICITY,
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
            etnia: paz.etnia || DEFAULT_ETHNICITY,
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

    const handleSelectSlot = useCallback((slot: SlotDisponibilita, time = slot.oraInizio) => {
        setForm(prev => ({
            ...prev,
            data: String(slot.data).split('T')[0],
            oraInizio: time,
            ambulatorioId: slot.ambulatorioId,
            medicoId: slot.medicoId || prev.medicoId,
            prestazioneId: slot.prestazioneId || prev.prestazioneId,
        }));
    }, []);

    const shiftSlotWeek = useCallback((days: number) => {
        setSlotWeekStart(prev => {
            const next = new Date(prev);
            next.setDate(prev.getDate() + days);
            return startOfWeek(next);
        });
    }, []);

    const handleDateChange = useCallback((date: Date | null) => {
        const value = date ? toLocalDateString(date) : '';
        set('data', value);
        if (date) setSlotWeekStart(startOfWeek(date));
    }, [set]);

    useEffect(() => {
        if (isEditing || !preselectedPaziente) return;
        handleSelectPaziente(preselectedPaziente);
        setShowPazSearch(false);
    }, [handleSelectPaziente, isEditing, preselectedPaziente]);

    // ── Mutations ─────────────────────────────────────────────────────────────

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!form.data || !form.oraInizio) throw new Error('Data e ora obbligatori');
            if (!form.medicoId) throw new Error('Medico obbligatorio');
            if (!form.ambulatorioId) throw new Error(isEditing ? 'Ambulatorio obbligatorio' : 'Seleziona uno slot disponibilità');
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
                    etnia: form.etnia || DEFAULT_ETHNICITY,
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
        onSuccess: async (result) => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
            if (isEditing) {
                queryClient.invalidateQueries({ queryKey: ['appuntamento', id] });
            }
            showToast({ message: isEditing ? 'Appuntamento aggiornato' : 'Appuntamento creato', type: 'success' });
            const newId = isEditing ? id : (result as Appuntamento)?.id;
            if (!isEditing && shouldCreateDirectVisit && newId) {
                try {
                    const response = await visiteApi.getOrCreateByAppuntamento(newId);
                    const visitaId = response?.data?.id;
                    if (visitaId) {
                        navigate(`/poliambulatorio/visite/${visitaId}`);
                        return;
                    }
                } catch {
                    showToast({ message: 'Appuntamento creato, ma apertura visita non riuscita', type: 'warning' });
                }
            }
            navigate(newId ? `/poliambulatorio/agenda/appuntamenti/${newId}` : '/poliambulatorio/agenda/appuntamenti');
        },
        onError: (error: unknown) => {
            showToast({ message: error instanceof Error ? error.message : 'Errore durante il salvataggio', type: 'error' });
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
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={goBack}
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
                <div className="max-w-7xl mx-auto px-4 flex gap-0 border-t border-gray-100 dark:border-gray-700">
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
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

                {/* TAB: APPUNTAMENTO */}
                {activeTab === 'appuntamento' && (
                    <div className="space-y-6">

                        {/* Medico / Prestazione / Convenzione */}
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
                                    label="Convenzione"
                                    value={form.convenzioneId}
                                    onChange={v => set('convenzioneId', v)}
                                    options={convenzioniOptions}
                                    placeholder="Nessuna convenzione"
                                />
                                {isEditing ? (
                                    <SelectField
                                        label="Ambulatorio"
                                        value={form.ambulatorioId}
                                        onChange={v => set('ambulatorioId', v)}
                                        options={ambulatoriOptions}
                                        required
                                        placeholder="Seleziona ambulatorio..."
                                    />
                                ) : (
                                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900/30">
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Ambulatorio</p>
                                        <p className="mt-1 font-medium text-gray-700 dark:text-gray-200">
                                            {selectedAmbulatorio?.label || 'Seleziona uno slot disponibilità'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {!isEditing && (
                                <p className="mt-3 text-xs text-gray-500">
                                    Medico e prestazione si filtrano in base agli slot disponibili. L'ambulatorio viene compilato automaticamente dallo slot.
                                </p>
                            )}
                        </div>

                        {/* Data / Ora / Durata */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Data e Orario
                            </h2>
                            {!isEditing && (
                                <div className="mb-5">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Slot disponibilità</p>
                                            <p className="text-xs text-gray-500">Scegli uno slot del medico selezionato e controlla gli orari già occupati.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => shiftSlotWeek(-7)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-teal-300 hover:text-teal-700 dark:border-gray-700 dark:bg-gray-800"
                                                title="Settimana precedente"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <span className="hidden text-xs font-semibold text-gray-500 sm:inline">
                                                {slotRange.start.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                                {' - '}
                                                {slotRange.end.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => shiftSlotWeek(7)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-teal-300 hover:text-teal-700 dark:border-gray-700 dark:bg-gray-800"
                                                title="Settimana successiva"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                            {(loadingAvailableSlots || loadingOccupiedSlots) && <Loader2 className="h-4 w-4 animate-spin text-teal-600" />}
                                        </div>
                                    </div>
                                    {form.medicoId || form.prestazioneId ? (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
                                            {slotsByDay.map(day => (
                                                <div key={day.key} className="min-h-[160px] min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/30">
                                                    <div className="mb-2">
                                                        <p className="text-[11px] font-semibold uppercase text-gray-400">
                                                            {day.date.toLocaleDateString('it-IT', { weekday: 'short' })}
                                                        </p>
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                                            {day.date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                                        {day.slots.length === 0 ? (
                                                            <p className="rounded-lg bg-white px-2 py-2 text-center text-[11px] text-gray-400 dark:bg-gray-800">Nessuno slot</p>
                                                        ) : (
                                                            <>
                                                                {day.slots.map(slot => {
                                                                    const ambulatorio = ambulatoriOptions.find(a => a.value === slot.ambulatorioId)?.label;
                                                                    const doctorName = mediciOptions.find(m => m.value === slot.medicoId)?.label;
                                                                    return (
                                                                        <AvailabilitySlotTimeline
                                                                            key={slot.id}
                                                                            slot={slot}
                                                                            appointments={day.occupied}
                                                                            durationMinutes={form.durataMinuti || 30}
                                                                            selectedDate={form.data}
                                                                            selectedTime={form.oraInizio}
                                                                            selectedMedicoId={form.medicoId}
                                                                            selectedAmbulatorioId={form.ambulatorioId}
                                                                            dayKey={day.key}
                                                                            label={ambulatorio}
                                                                            meta="clicca nello slot"
                                                                            doctorLabel={doctorName}
                                                                            onSelect={handleSelectSlot}
                                                                        />
                                                                    );
                                                                })}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30">
                                            Seleziona un medico o una prestazione per vedere gli slot disponibili.
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Data <span className="text-red-500">*</span>
                                    </label>
                                    <DatePickerElegante
                                        value={form.data}
                                        onChange={handleDateChange}
                                        placeholder="Seleziona data"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Ora inizio <span className="text-red-500">*</span>
                                    </label>
                                        <TimePickerElegante
                                            value={form.oraInizio}
                                            onChange={v => set('oraInizio', v)}
                                            minuteStep={5}
                                            minTime={selectedSlotWindow?.oraInizio}
                                            maxTime={selectedSlotWindow?.oraFine}
                                            placeholder="Seleziona ora"
                                        />
                                </div>
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Etnia
                                    </label>
                                    <ElegantSelect
                                        value={form.etnia}
                                        onChange={value => set('etnia', value)}
                                        options={[...ETHNICITY_OPTIONS]}
                                    />
                                </div>
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
