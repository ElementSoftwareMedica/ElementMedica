/**
 * BookingCalendarIsland
 * 
 * "Island Architecture" component for medical booking.
 * Interactive booking widget with:
 * - Optional Sede selection (multi-sede support)
 * - Branca specialistica -> Prestazione -> Medico -> Weekly Calendar -> Patient form -> Confirm
 * - "Tutte le disponibilità" mode to see all doctors' slots at once
 * - Weekly calendar view Mon-Sat with libero/occupato status
 * - Configurable prestazioni filter and sede filter
 * - Prices from ListinoPrezzo/prezzoBase
 * - Real Appuntamento creation (P67)
 * 
 * API endpoints used:
 * - GET /api/public/booking/sedi -> sedi with opening hours
 * - GET /api/public/booking/prestazioni -> services grouped by brancheSpecialistiche
 * - GET /api/public/booking/times?medicoId=X&giorno=Y -> sub-slot times
 * - GET /api/public/booking/times-multi?prestazioneId=X&giorno=Y -> all medici times
 * - POST /api/public/booking/create -> creates real Appuntamento
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, User, Stethoscope, ChevronRight, ChevronLeft, Check,
  CreditCard, FileText, AlertCircle, Loader2, Tags, MapPin, Users
} from 'lucide-react';

// -----------------------------------------------
// Types
// -----------------------------------------------

interface MedicoDisponibile {
  id: string;
  nome: string;
  slotDisponibili: number;
  durataMedico: number;
  prezzo: number;
}

interface Prestazione {
  id: string;
  codice?: string;
  nome: string;
  descrizione?: string;
  tipo?: string;
  durataPrevista: number;
  prezzo: number;
  prezzoPrimaVisita?: number | null;
  prezzoControllo?: number | null;
  istruzioniPreparazione?: string | null;
  brancheSpecialistiche: string[];
  slotDisponibili: number;
  mediciDisponibili: MedicoDisponibile[];
}

interface SubSlot {
  oraInizio: string;
  oraFine: string;
  disponibile: boolean;
  stato: 'libero' | 'occupato';
  slotId?: string;
  ambulatorioId?: string | null;
  durata: number;
}

interface MedicoTimes {
  medicoId: string;
  medicoNome: string;
  orari: SubSlot[];
}

interface Sede {
  id: string;
  nome: string;
  indirizzo: string;
  citta: string;
  cap?: string;
  provincia?: string;
  telefono?: string;
  isPrincipale: boolean;
  giorniAperti: number[];
  orari: { giorno: number; fascia: number; oraInizio: string; oraFine: string }[];
}

interface BookingFormData {
  prestazioneId: string;
  medicoId: string;
  data: string;
  orario: string;
  nome: string;
  cognome: string;
  codiceFiscale: string;
  telefono: string;
  email: string;
  note: string;
}

type BookingStep = 'branca' | 'prestazione' | 'medico' | 'calendario' | 'dati' | 'conferma';

const STEPS: BookingStep[] = ['branca', 'prestazione', 'medico', 'calendario', 'dati', 'conferma'];

const STEP_LABELS: Record<BookingStep, string> = {
  branca: 'Specialità',
  prestazione: 'Prestazione',
  medico: 'Medico',
  calendario: 'Data e Orario',
  dati: 'I tuoi dati',
  conferma: 'Conferma',
};

const GIORNI_SETTIMANA = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const GIORNI_SETTIMANA_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

// -----------------------------------------------
// API helpers
// -----------------------------------------------

const API_BASE = '/api/public/booking';
const BRAND_ID = import.meta.env.VITE_BRAND_ID || 'element-sicurezza';
const BRAND_HEADERS: Record<string, string> = { 'X-Frontend-Id': BRAND_ID };

async function fetchSedi(): Promise<Sede[]> {
  const res = await fetch(`${API_BASE}/sedi`, { headers: BRAND_HEADERS });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function fetchPrestazioni(sedeId?: string): Promise<Prestazione[]> {
  const params = sedeId ? `?sedeId=${encodeURIComponent(sedeId)}` : '';
  const res = await fetch(`${API_BASE}/prestazioni${params}`, { headers: BRAND_HEADERS });
  if (!res.ok) throw new Error('Errore nel caricamento delle prestazioni');
  const data = await res.json();
  return data.data || data;
}

async function fetchDayTimes(medicoId: string, giorno: string, sedeId?: string): Promise<SubSlot[]> {
  let url = `${API_BASE}/times?medicoId=${encodeURIComponent(medicoId)}&giorno=${encodeURIComponent(giorno)}`;
  if (sedeId) url += `&sedeId=${encodeURIComponent(sedeId)}`;
  const res = await fetch(url, { headers: BRAND_HEADERS });
  if (!res.ok) return [];
  const result = await res.json();
  return result.data || [];
}

async function fetchMultiMedicoTimes(prestazioneId: string, giorno: string, sedeId?: string): Promise<MedicoTimes[]> {
  let url = `${API_BASE}/times-multi?prestazioneId=${encodeURIComponent(prestazioneId)}&giorno=${encodeURIComponent(giorno)}`;
  if (sedeId) url += `&sedeId=${encodeURIComponent(sedeId)}`;
  const res = await fetch(url, { headers: BRAND_HEADERS });
  if (!res.ok) return [];
  const result = await res.json();
  return result.data || [];
}

// -----------------------------------------------
// Utilities
// -----------------------------------------------

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toLocalDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekDates(monday: Date, openDays?: number[]): string[] {
  // Mon-Sat by default (indices 0-5 from monday), or filter by open days
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  })
    .filter(d => {
      if (!openDays || openDays.length === 0) return true;
      return openDays.includes(d.getDay());
    })
    .map(d => toLocalDateStr(d));
}

function formatDateShort(dateStr: string): { dayLabel: string; dayNum: number } {
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return {
    dayLabel: GIORNI_SETTIMANA[dayIndex] || GIORNI_SETTIMANA_FULL[dayOfWeek] || '',
    dayNum: d.getDate(),
  };
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatEuro(amount: number): string {
  return `€${amount.toFixed(2).replace('.', ',')}`;
}

function isValidCodiceFiscale(cf: string): boolean {
  return /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i.test(cf.trim());
}

// -----------------------------------------------
// Widget Configuration
// -----------------------------------------------

export interface BookingWidgetConfig {
  /** Filter to show only these prestazione IDs */
  prestazioniIds?: string[];
  /** Filter to show only these branche */
  brancheFilter?: string[];
  /** Filter to show only these sedi IDs */
  sediIds?: string[];
  /** Custom note to display (e.g., medicina del lavoro info) */
  infoNote?: string;
  /** Hide price display */
  hidePrice?: boolean;
}

// -----------------------------------------------
// Component
// -----------------------------------------------

interface BookingCalendarIslandProps {
  accentColor?: string;
  accentHover?: string;
  initialMedicoId?: string;
  initialPrestazioneId?: string;
  initialBranca?: string;
  /** Widget configuration for filtering and customization */
  config?: BookingWidgetConfig;
  onBookingComplete?: (data: BookingFormData) => void;
}

const BookingCalendarIsland: React.FC<BookingCalendarIslandProps> = ({
  accentColor = 'bg-primary-600',
  accentHover = 'hover:bg-primary-700',
  initialMedicoId,
  initialPrestazioneId,
  initialBranca,
  config,
  onBookingComplete,
}) => {
  // State
  const [currentStep, setCurrentStep] = useState<BookingStep>('branca');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ numeroPrenotazione?: string; prestazione?: string } | null>(null);

  const [sedi, setSedi] = useState<Sede[]>([]);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('');
  const [prestazioni, setPrestazioni] = useState<Prestazione[]>([]);
  const [selectedBranca, setSelectedBranca] = useState<string>('');
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [weekSlots, setWeekSlots] = useState<Map<string, SubSlot[]>>(new Map());
  const [weekMultiSlots, setWeekMultiSlots] = useState<Map<string, MedicoTimes[]>>(new Map());
  const [weekLoading, setWeekLoading] = useState(false);
  const [allDoctorsMode, setAllDoctorsMode] = useState(false);

  const [formData, setFormData] = useState<BookingFormData>({
    prestazioneId: initialPrestazioneId || '',
    medicoId: initialMedicoId || '',
    data: '',
    orario: '',
    nome: '',
    cognome: '',
    codiceFiscale: '',
    telefono: '',
    email: '',
    note: '',
  });

  // Selected sede for opening days
  const selectedSede = useMemo(() => sedi.find(s => s.id === selectedSedeId), [sedi, selectedSedeId]);
  const openDays = useMemo(() => selectedSede?.giorniAperti || [], [selectedSede]);

  // Derived data
  const branche = useMemo(() => {
    let filtered = prestazioni;
    // When initialMedicoId is set, only show prestazioni this doctor offers
    if (initialMedicoId) {
      filtered = filtered.filter(p => p.mediciDisponibili.some(m => m.id === initialMedicoId));
    }
    if (config?.prestazioniIds?.length) {
      filtered = filtered.filter(p => config.prestazioniIds!.includes(p.id));
    }
    if (config?.brancheFilter?.length) {
      filtered = filtered.filter(p =>
        p.brancheSpecialistiche.some(b => config.brancheFilter!.includes(b))
      );
    }
    const brancaMap = new Map<string, { count: number; mediciIds: Set<string> }>();
    for (const p of filtered) {
      const branches = p.brancheSpecialistiche.length > 0 ? p.brancheSpecialistiche : ['Altro'];
      for (const b of branches) {
        if (config?.brancheFilter?.length && !config.brancheFilter.includes(b)) continue;
        if (!brancaMap.has(b)) brancaMap.set(b, { count: 0, mediciIds: new Set() });
        const entry = brancaMap.get(b)!;
        entry.count++;
        for (const m of p.mediciDisponibili) entry.mediciIds.add(m.id);
      }
    }
    return Array.from(brancaMap.entries())
      .map(([nome, { count, mediciIds }]) => ({ nome, prestazioniCount: count, mediciCount: mediciIds.size }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [prestazioni, config]);

  const filteredPrestazioni = useMemo(() => {
    // When initialMedicoId is set and only 1 branca, show all doctor's prestazioni without branca filter
    const needBrancaFilter = selectedBranca && !(initialMedicoId && branche.length <= 1);
    let filtered = prestazioni.filter(p => {
      // Filter by doctor if initialMedicoId is set
      if (initialMedicoId && !p.mediciDisponibili.some(m => m.id === initialMedicoId)) return false;
      if (needBrancaFilter) {
        const branches = p.brancheSpecialistiche.length > 0 ? p.brancheSpecialistiche : ['Altro'];
        if (!branches.includes(selectedBranca)) return false;
      }
      return true;
    });
    if (config?.prestazioniIds?.length) {
      filtered = filtered.filter(p => config.prestazioniIds!.includes(p.id));
    }
    return filtered;
  }, [prestazioni, selectedBranca, config, initialMedicoId, branche.length]);

  const selectedPrestazione = useMemo(
    () => prestazioni.find(p => p.id === formData.prestazioneId) || null,
    [prestazioni, formData.prestazioneId]
  );

  const selectedMedico = useMemo(
    () => selectedPrestazione?.mediciDisponibili.find(m => m.id === formData.medicoId) || null,
    [selectedPrestazione, formData.medicoId]
  );

  const currentStepIndex = STEPS.indexOf(currentStep);
  const showSedeSelector = sedi.length > 1;

  // Effects - Load sedi + prestazioni
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([fetchSedi(), fetchPrestazioni()])
      .then(([sediData, prestazioniData]) => {
        if (cancelled) return;

        // Filter sedi by config
        let filteredSedi = sediData;
        if (config?.sediIds?.length) {
          filteredSedi = sediData.filter(s => config.sediIds!.includes(s.id));
        }
        setSedi(filteredSedi);

        // Auto-select sede if only one
        if (filteredSedi.length === 1) {
          setSelectedSedeId(filteredSedi[0].id);
        } else if (filteredSedi.length > 0) {
          const principale = filteredSedi.find(s => s.isPrincipale);
          if (principale) setSelectedSedeId(principale.id);
        }

        setPrestazioni(prestazioniData);

        // Auto-skip logic for pre-filled props
        if (initialMedicoId && initialPrestazioneId) {
          // Both doctor and prestazione pre-selected → skip to calendario
          const prest = prestazioniData.find(p => p.id === initialPrestazioneId);
          if (prest) {
            const branca = prest.brancheSpecialistiche[0] || 'Altro';
            setSelectedBranca(branca);
            setCurrentStep('calendario');
          }
        } else if (initialMedicoId) {
          // Only doctor pre-selected → show only their prestazioni, skip branca
          const doctorPrestazioni = prestazioniData.filter(p =>
            p.mediciDisponibili.some(m => m.id === initialMedicoId)
          );
          if (doctorPrestazioni.length > 0) {
            const branche = [...new Set(doctorPrestazioni.flatMap(p =>
              p.brancheSpecialistiche.length > 0 ? p.brancheSpecialistiche : ['Altro']
            ))];
            if (branche.length === 1) {
              setSelectedBranca(branche[0]);
            }
            // Skip to prestazione selection (branca step bypassed)
            setCurrentStep('prestazione');
          }
        } else if (initialBranca) {
          // Auto-select branca if initialBranca
          const branches = prestazioniData.flatMap(p =>
            p.brancheSpecialistiche.length > 0 ? p.brancheSpecialistiche : ['Altro']
          );
          const match = [...new Set(branches)].find(b => b.toLowerCase() === initialBranca.toLowerCase());
          if (match) {
            setSelectedBranca(match);
            setCurrentStep('prestazione');
          }
        }
      })
      .catch(() => { if (!cancelled) setError('Impossibile caricare i dati. Riprova più tardi.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [initialBranca, config?.sediIds]);

  // Reload prestazioni when sede changes
  useEffect(() => {
    if (!selectedSedeId || sedi.length <= 1) return;
    let cancelled = false;
    setLoading(true);
    fetchPrestazioni(selectedSedeId)
      .then(data => { if (!cancelled) setPrestazioni(data); })
      .catch(() => { })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedSedeId, sedi.length]);

  // Load weekly availability
  useEffect(() => {
    if (currentStep !== 'calendario') return;
    if (!allDoctorsMode && !formData.medicoId) return;
    if (allDoctorsMode && !formData.prestazioneId) return;

    let cancelled = false;
    setWeekLoading(true);
    setError(null);

    const dates = getWeekDates(weekStart, openDays);
    const todayStr = toLocalDateStr(new Date());
    const futureDates = dates.filter(d => d >= todayStr);

    if (allDoctorsMode) {
      // Fetch for all medici
      Promise.all(futureDates.map(d =>
        fetchMultiMedicoTimes(formData.prestazioneId, d, selectedSedeId || undefined)
          .then(data => ({ date: d, data }))
      ))
        .then(results => {
          if (cancelled) return;
          const newMap = new Map<string, MedicoTimes[]>();
          for (const { date, data } of results) newMap.set(date, data);
          for (const d of dates) { if (!newMap.has(d)) newMap.set(d, []); }
          setWeekMultiSlots(newMap);
          setWeekSlots(new Map()); // Clear single-medico slots
        })
        .catch(() => { if (!cancelled) setError('Errore nel caricamento delle disponibilità.'); })
        .finally(() => { if (!cancelled) setWeekLoading(false); });
    } else {
      // Fetch for single medico
      Promise.all(futureDates.map(d =>
        fetchDayTimes(formData.medicoId, d, selectedSedeId || undefined)
          .then(slots => ({ date: d, slots }))
      ))
        .then(results => {
          if (cancelled) return;
          const newMap = new Map<string, SubSlot[]>();
          for (const { date, slots } of results) newMap.set(date, slots);
          for (const d of dates) { if (!newMap.has(d)) newMap.set(d, []); }
          setWeekSlots(newMap);
          setWeekMultiSlots(new Map()); // Clear multi slots
        })
        .catch(() => { if (!cancelled) setError('Errore nel caricamento degli orari.'); })
        .finally(() => { if (!cancelled) setWeekLoading(false); });
    }

    return () => { cancelled = true; };
  }, [formData.medicoId, formData.prestazioneId, weekStart, currentStep, allDoctorsMode, selectedSedeId, openDays]);

  // Navigation
  const goNext = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  }, [currentStep]);

  const goPrev = useCallback(() => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  }, [currentStep]);

  const goToStep = useCallback((step: BookingStep) => {
    const targetIdx = STEPS.indexOf(step);
    const curIdx = STEPS.indexOf(currentStep);
    if (targetIdx <= curIdx) setCurrentStep(step);
  }, [currentStep]);

  // Week Navigation
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const maxDate = new Date(todayDate);
  maxDate.setMonth(maxDate.getMonth() + 3);

  const canGoPrevWeek = weekStart > getMonday(todayDate);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const canGoNextWeek = nextWeekStart <= maxDate;

  const weekLabel = useMemo(() => {
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + 5);
    const monLabel = `${weekStart.getDate()} ${MESI[weekStart.getMonth()]}`;
    const satLabel = `${endDate.getDate()} ${MESI[endDate.getMonth()]}`;
    return `${monLabel} — ${satLabel}`;
  }, [weekStart]);

  // -----------------------------------------------
  // SEDE SELECTOR (shown above step indicator when multi-sede)
  // -----------------------------------------------
  const renderSedeSelector = () => {
    if (!showSedeSelector) return null;
    return (
      <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" />
          Sede
        </label>
        <div className="flex flex-wrap gap-2">
          {sedi.map(sede => (
            <button
              key={sede.id}
              onClick={() => {
                setSelectedSedeId(sede.id);
                // Reset downstream selections
                setFormData(prev => ({ ...prev, prestazioneId: '', medicoId: '', data: '', orario: '' }));
                setSelectedBranca('');
                if (currentStep !== 'branca') setCurrentStep('branca');
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedSedeId === sede.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300 hover:text-primary-700'
                }`}
            >
              {sede.nome}
              {sede.isPrincipale && <span className="ml-1 text-xs opacity-70">●</span>}
            </button>
          ))}
        </div>
        {selectedSede && (
          <p className="text-xs text-gray-500 mt-1.5">
            {selectedSede.indirizzo}, {selectedSede.citta}
            {selectedSede.telefono && <> · {selectedSede.telefono}</>}
          </p>
        )}
      </div>
    );
  };

  // Step Indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-6 overflow-x-auto py-1">
      {STEPS.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;
        const isClickable = index < currentStepIndex;
        return (
          <React.Fragment key={step}>
            {index > 0 && (
              <div className={`w-6 h-0.5 flex-shrink-0 ${isCompleted ? 'bg-primary-500' : 'bg-gray-200'}`} />
            )}
            <button
              onClick={() => isClickable && goToStep(step)}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${isActive
                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300'
                : isCompleted
                  ? 'bg-primary-500 text-white cursor-pointer hover:bg-primary-600'
                  : 'bg-gray-100 text-gray-400'
                }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-primary-600 text-white' : isCompleted ? 'bg-white text-primary-600' : 'bg-gray-300 text-white'
                }`}>
                {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[step]}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  // Step: Branca Specialistica
  const renderBrancaStep = () => (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Tags className="w-5 h-5 text-primary-600" />
        Scegli la specialità
      </h3>
      <p className="text-sm text-gray-500">Seleziona la branca specialistica per visualizzare le prestazioni disponibili.</p>
      {config?.infoNote && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <AlertCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          {config.infoNote}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Caricamento specialità...
        </div>
      ) : branche.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          Nessuna specialità disponibile al momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {branche.map(b => (
            <button
              key={b.nome}
              onClick={() => {
                setSelectedBranca(b.nome);
                setFormData(prev => ({ ...prev, prestazioneId: '', medicoId: '', data: '', orario: '' }));
                goNext();
              }}
              className={`p-4 rounded-xl border text-left transition-all hover:shadow-md group ${selectedBranca === b.nome
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                : 'border-gray-200 hover:border-primary-300 bg-white'
                }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                    {b.nome}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {b.prestazioniCount} {b.prestazioniCount === 1 ? 'prestazione' : 'prestazioni'} · {b.mediciCount} {b.mediciCount === 1 ? 'medico' : 'medici'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Step: Prestazione
  const renderPrestazioneStep = () => (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Stethoscope className="w-5 h-5 text-primary-600" />
        Scegli la prestazione
      </h3>
      <p className="text-sm text-gray-500">
        <button onClick={goPrev} className="text-primary-600 hover:text-primary-700 font-medium">
          {selectedBranca}
        </button>
        {' '} — Seleziona il servizio che desideri prenotare.
      </p>
      {config?.infoNote && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <AlertCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          {config.infoNote}
        </div>
      )}
      {filteredPrestazioni.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nessuna prestazione disponibile per questa specialità.</div>
      ) : (
        <div className="space-y-2">
          {filteredPrestazioni.map(p => (
            <button
              key={p.id}
              onClick={() => {
                if (initialMedicoId) {
                  // Doctor pre-selected: auto-set doctor and skip to calendario
                  setFormData(prev => ({ ...prev, prestazioneId: p.id, medicoId: initialMedicoId, data: '', orario: '' }));
                  setAllDoctorsMode(false);
                  setWeekStart(getMonday(new Date()));
                  setCurrentStep('calendario');
                } else {
                  setFormData(prev => ({ ...prev, prestazioneId: p.id, medicoId: '', data: '', orario: '' }));
                  setAllDoctorsMode(false);
                  goNext();
                }
              }}
              className={`w-full p-4 rounded-xl border text-left transition-all hover:shadow-md group ${formData.prestazioneId === p.id
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                : 'border-gray-200 hover:border-primary-300 bg-white'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                    {p.nome}
                  </h4>
                  {p.descrizione && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.descrizione}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {p.durataPrevista} min
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {p.mediciDisponibili.length} {p.mediciDisponibili.length === 1 ? 'medico' : 'medici'}
                    </span>
                    {p.istruzioniPreparazione && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <FileText className="w-3.5 h-3.5" />
                        Preparazione
                      </span>
                    )}
                  </div>
                </div>
                {!config?.hidePrice && (
                  <div className="flex flex-col items-end ml-3 flex-shrink-0">
                    <span className="text-lg font-bold text-primary-700">{formatEuro(p.prezzo)}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors mt-1" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Step: Medico
  const renderMedicoStep = () => {
    const medici = selectedPrestazione?.mediciDisponibili || [];
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" />
          Scegli il medico
        </h3>
        <p className="text-sm text-gray-500">
          Medici disponibili per <span className="font-medium text-gray-700">{selectedPrestazione?.nome}</span>
        </p>

        {/* ALL DOCTORS AVAILABILITY BUTTON */}
        {medici.length > 1 && (
          <button
            onClick={() => {
              setAllDoctorsMode(true);
              setFormData(prev => ({ ...prev, medicoId: '', data: '', orario: '' }));
              setWeekStart(getMonday(new Date()));
              setCurrentStep('calendario');
            }}
            className="w-full p-4 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/50 text-left transition-all hover:shadow-md hover:border-primary-400 hover:bg-primary-50 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-primary-800 group-hover:text-primary-900 transition-colors">
                  Tutte le disponibilità
                </h4>
                <p className="text-xs text-primary-600 mt-0.5">
                  Vedi tutti gli orari disponibili di tutti i {medici.length} medici in un unico calendario
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-primary-400 group-hover:text-primary-600 transition-colors" />
            </div>
          </button>
        )}

        {medici.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nessun medico disponibile per questa prestazione.</div>
        ) : (
          <>
            {medici.length > 1 && (
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold pt-2">Oppure scegli un medico specifico</p>
            )}
            <div className="space-y-2">
              {medici.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setAllDoctorsMode(false);
                    setFormData(prev => ({ ...prev, medicoId: m.id, data: '', orario: '' }));
                    setWeekStart(getMonday(new Date()));
                    goNext();
                  }}
                  className={`w-full p-4 rounded-xl border text-left transition-all hover:shadow-md group ${formData.medicoId === m.id
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-primary-300 bg-white'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                        {m.nome}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {m.slotDisponibili} {m.slotDisponibili === 1 ? 'slot disponibile' : 'slot disponibili'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {m.durataMedico} min
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {!config?.hidePrice && (
                        <span className="text-lg font-bold text-primary-700">{formatEuro(m.prezzo)}</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // Step: Calendario Settimanale
  const renderCalendarioStep = () => {
    const dates = getWeekDates(weekStart, openDays);
    const todayStr = toLocalDateStr(new Date());

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            {allDoctorsMode ? 'Disponibilità di tutti i medici' : 'Scegli data e orario'}
          </h3>
          {allDoctorsMode && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
              <Users className="w-3 h-3" />
              Tutti i medici
            </span>
          )}
        </div>

        {/* Week navigation */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <button
            onClick={() => { const prev = new Date(weekStart); prev.setDate(prev.getDate() - 7); setWeekStart(prev); }}
            disabled={!canGoPrevWeek}
            className={`p-2 rounded-lg transition-colors ${canGoPrevWeek ? 'hover:bg-gray-200 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
            aria-label="Settimana precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-gray-900 text-sm">{weekLabel}</span>
          <button
            onClick={() => { const next = new Date(weekStart); next.setDate(next.getDate() + 7); setWeekStart(next); }}
            disabled={!canGoNextWeek}
            className={`p-2 rounded-lg transition-colors ${canGoNextWeek ? 'hover:bg-gray-200 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
            aria-label="Settimana successiva"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Weekly grid */}
        {weekLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Caricamento disponibilità...
          </div>
        ) : allDoctorsMode ? (
          /* ALL DOCTORS MODE - show slots grouped by doctor */
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {dates.map(dateStr => {
              const { dayLabel, dayNum } = formatDateShort(dateStr);
              const isPast = dateStr < todayStr;
              const medicoTimesForDay = weekMultiSlots.get(dateStr) || [];
              const allSlots: Array<SubSlot & { medicoId: string; medicoNome: string }> = [];
              for (const mt of medicoTimesForDay) {
                for (const slot of mt.orari) {
                  allSlots.push({ ...slot, medicoId: mt.medicoId, medicoNome: mt.medicoNome });
                }
              }
              const freeSlots = allSlots.filter(s => s.disponibile);

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl border p-2 ${isPast ? 'bg-gray-50 border-gray-100 opacity-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className={`text-center pb-2 mb-2 border-b ${isPast ? 'border-gray-100' : 'border-gray-200'}`}>
                    <div className="text-xs font-medium text-gray-500 uppercase">{dayLabel}</div>
                    <div className={`text-lg font-bold ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>{dayNum}</div>
                  </div>

                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {!isPast && allSlots.length === 0 && (
                      <p className="text-[10px] text-gray-400 text-center py-2">Nessun orario</p>
                    )}
                    {isPast && <p className="text-[10px] text-gray-400 text-center py-2">Passato</p>}
                    {!isPast && allSlots.map(slot => (
                      <button
                        key={`${dateStr}-${slot.medicoId}-${slot.oraInizio}`}
                        disabled={!slot.disponibile}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            medicoId: slot.medicoId,
                            data: dateStr,
                            orario: slot.oraInizio
                          }));
                          setAllDoctorsMode(false);
                          goNext();
                        }}
                        className={`w-full text-left py-1.5 px-1.5 rounded-lg text-xs transition-all ${slot.disponibile
                          ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300 cursor-pointer'
                          : 'bg-gray-100 text-gray-400 line-through cursor-not-allowed border border-gray-100'
                          }`}
                        title={slot.disponibile ? `${slot.oraInizio.substring(0, 5)} — ${slot.medicoNome}` : 'Occupato'}
                      >
                        <span className="font-medium">{slot.oraInizio.substring(0, 5)}</span>
                        {slot.disponibile && (
                          <span className="block text-[9px] text-green-600 truncate">{slot.medicoNome.replace(/^(Dott\.|Dott\.ssa)\s*/, '')}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {!isPast && allSlots.length > 0 && (
                    <div className="text-center mt-2 pt-1 border-t border-gray-100">
                      <span className={`text-[10px] font-medium ${freeSlots.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {freeSlots.length} {freeSlots.length === 1 ? 'libero' : 'liberi'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* SINGLE DOCTOR MODE */
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {dates.map(dateStr => {
              const { dayLabel, dayNum } = formatDateShort(dateStr);
              const isPast = dateStr < todayStr;
              const slots = weekSlots.get(dateStr) || [];
              const freeSlots = slots.filter(s => s.disponibile);
              const hasSlots = slots.length > 0;

              return (
                <div
                  key={dateStr}
                  className={`rounded-xl border p-2 ${isPast ? 'bg-gray-50 border-gray-100 opacity-50' : 'border-gray-200 bg-white'}`}
                >
                  <div className={`text-center pb-2 mb-2 border-b ${isPast ? 'border-gray-100' : 'border-gray-200'}`}>
                    <div className="text-xs font-medium text-gray-500 uppercase">{dayLabel}</div>
                    <div className={`text-lg font-bold ${isPast ? 'text-gray-400' : 'text-gray-900'}`}>{dayNum}</div>
                  </div>

                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {!hasSlots && !isPast && (
                      <p className="text-[10px] text-gray-400 text-center py-2">Nessun orario</p>
                    )}
                    {isPast && (
                      <p className="text-[10px] text-gray-400 text-center py-2">Passato</p>
                    )}
                    {!isPast && slots.map(slot => (
                      <button
                        key={`${dateStr}-${slot.oraInizio}`}
                        disabled={!slot.disponibile}
                        onClick={() => {
                          setFormData(prev => ({ ...prev, data: dateStr, orario: slot.oraInizio }));
                          goNext();
                        }}
                        className={`w-full text-center py-1.5 px-1 rounded-lg text-xs font-medium transition-all ${formData.data === dateStr && formData.orario === slot.oraInizio
                          ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                          : slot.disponibile
                            ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 hover:border-green-300 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 line-through cursor-not-allowed border border-gray-100'
                          }`}
                        title={slot.disponibile ? `Prenota alle ${slot.oraInizio.substring(0, 5)}` : 'Occupato'}
                      >
                        {slot.oraInizio.substring(0, 5)}
                      </button>
                    ))}
                  </div>

                  {!isPast && hasSlots && (
                    <div className="text-center mt-2 pt-1 border-t border-gray-100">
                      <span className={`text-[10px] font-medium ${freeSlots.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {freeSlots.length} {freeSlots.length === 1 ? 'libero' : 'liberi'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-green-50 border border-green-200" />
            Disponibile
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
            Occupato
          </span>
        </div>
      </div>
    );
  };

  // Step: Dati Paziente
  const renderDatiStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary-600" />
        I tuoi dati
      </h3>
      <p className="text-sm text-gray-500">Inserisci i tuoi dati per completare la prenotazione. I campi con * sono obbligatori.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input
            type="text"
            value={formData.nome}
            onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Il tuo nome"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
          <input
            type="text"
            value={formData.cognome}
            onChange={e => setFormData(prev => ({ ...prev, cognome: e.target.value }))}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Il tuo cognome"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Codice Fiscale *</label>
          <input
            type="text"
            value={formData.codiceFiscale}
            onChange={e => setFormData(prev => ({ ...prev, codiceFiscale: e.target.value.toUpperCase() }))}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase tracking-wider ${formData.codiceFiscale && !isValidCodiceFiscale(formData.codiceFiscale)
              ? 'border-red-300 bg-red-50'
              : 'border-gray-200'
              }`}
            placeholder="RSSMRA85M01H501Z"
            maxLength={16}
          />
          {formData.codiceFiscale && !isValidCodiceFiscale(formData.codiceFiscale) && (
            <p className="text-xs text-red-500 mt-1">Formato codice fiscale non valido</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefono *</label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={e => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="+39 333 123 4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400">(opzionale)</span></label>
          <input
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="email@esempio.com"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note <span className="text-gray-400">(opzionale)</span></label>
        <textarea
          value={formData.note}
          onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          rows={3}
          placeholder="Eventuali informazioni aggiuntive..."
        />
      </div>
    </div>
  );

  // Step: Conferma
  const renderConfermaStep = () => {
    const prezzo = selectedMedico?.prezzo ?? selectedPrestazione?.prezzo ?? 0;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Check className="w-5 h-5 text-primary-600" />
          Riepilogo prenotazione
        </h3>
        <div className="bg-primary-50 rounded-xl p-5 space-y-3 border border-primary-100">
          {selectedSede && showSedeSelector && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sede:</span>
              <span className="font-medium text-gray-900">{selectedSede.nome}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Specialità:</span>
            <span className="font-medium text-gray-900">{selectedBranca}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Prestazione:</span>
            <span className="font-medium text-gray-900">{selectedPrestazione?.nome}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Medico:</span>
            <span className="font-medium text-gray-900">{selectedMedico?.nome || '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Data:</span>
            <span className="font-medium text-gray-900">{formData.data ? formatFullDate(formData.data) : '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Orario:</span>
            <span className="font-medium text-gray-900">{formData.orario?.substring(0, 5) || '—'}</span>
          </div>
          <hr className="border-primary-200" />
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Paziente:</span>
            <span className="font-medium text-gray-900">{formData.nome} {formData.cognome}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Codice Fiscale:</span>
            <span className="font-medium text-gray-900 uppercase tracking-wide text-sm">{formData.codiceFiscale}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Telefono:</span>
            <span className="font-medium text-gray-900">{formData.telefono}</span>
          </div>
          {formData.email && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{formData.email}</span>
            </div>
          )}
          {formData.note && (
            <div>
              <span className="text-gray-600">Note:</span>
              <p className="text-sm mt-1 text-gray-800">{formData.note}</p>
            </div>
          )}
          {!config?.hidePrice && (
            <>
              <hr className="border-primary-200" />
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-semibold flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  Costo prestazione:
                </span>
                <span className="text-xl font-bold text-primary-700">{formatEuro(prezzo)}</span>
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Cliccando &quot;Conferma prenotazione&quot; accetti i nostri termini di servizio e la nostra
          politica sulla privacy. Il pagamento avverrà in sede.
        </p>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'branca': return renderBrancaStep();
      case 'prestazione': return renderPrestazioneStep();
      case 'medico': return renderMedicoStep();
      case 'calendario': return renderCalendarioStep();
      case 'dati': return renderDatiStep();
      case 'conferma': return renderConfermaStep();
    }
  };

  // Validation
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'branca': return !!selectedBranca;
      case 'prestazione': return !!formData.prestazioneId;
      case 'medico': return !!formData.medicoId;
      case 'calendario': return !!(formData.data && formData.orario);
      case 'dati':
        return !!(
          formData.nome.trim().length >= 2 &&
          formData.cognome.trim().length >= 2 &&
          isValidCodiceFiscale(formData.codiceFiscale) &&
          formData.telefono.trim().length >= 6
        );
      case 'conferma': return true;
      default: return false;
    }
  };

  // Submit
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        prestazioneId: formData.prestazioneId,
        medicoId: formData.medicoId,
        data: formData.data,
        oraPrenotazione: formData.orario,
        nome: formData.nome.trim(),
        cognome: formData.cognome.trim(),
        codiceFiscale: formData.codiceFiscale.trim().toUpperCase(),
        telefono: formData.telefono.trim(),
        email: formData.email.trim() || undefined,
        note: formData.note.trim() || undefined,
      };

      const res = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...BRAND_HEADERS },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Errore nella prenotazione. Riprova più tardi.');
        return;
      }

      setSuccess(true);
      setSuccessData({
        numeroPrenotazione: data.data?.numeroPrenotazione,
        prestazione: data.data?.prestazione,
      });
      onBookingComplete?.(formData);
    } catch {
      setError('Si è verificato un errore di connessione. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="booking-calendar-island max-w-2xl mx-auto" data-island="booking-calendar" data-hydrated="true">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-green-600 text-white p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold font-heading">Prenotazione Confermata!</h2>
            <p className="text-white/90 text-sm mt-1">La tua prenotazione è stata registrata con successo</p>
          </div>
          <div className="p-6 text-center space-y-4">
            {successData?.numeroPrenotazione && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">Numero prenotazione</p>
                <p className="text-2xl font-bold text-gray-900 tracking-wider">{successData.numeroPrenotazione}</p>
              </div>
            )}
            <div className="bg-primary-50 rounded-xl p-4 space-y-2 text-sm">
              <p><span className="text-gray-600">Prestazione:</span> <strong>{successData?.prestazione || selectedPrestazione?.nome}</strong></p>
              <p><span className="text-gray-600">Data:</span> <strong>{formData.data ? formatFullDate(formData.data) : ''}</strong></p>
              <p><span className="text-gray-600">Orario:</span> <strong>{formData.orario?.substring(0, 5)}</strong></p>
              <p><span className="text-gray-600">Medico:</span> <strong>{selectedMedico?.nome}</strong></p>
            </div>
            <p className="text-sm text-gray-500">Ti aspettiamo! Presenta questo numero alla reception.</p>
            <button
              onClick={() => {
                setSuccess(false);
                setSuccessData(null);
                setCurrentStep('branca');
                setSelectedBranca('');
                setAllDoctorsMode(false);
                setFormData({ prestazioneId: '', medicoId: '', data: '', orario: '', nome: '', cognome: '', codiceFiscale: '', telefono: '', email: '', note: '' });
              }}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${accentColor} ${accentHover}`}
            >
              Prenota un&apos;altra visita
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render
  return (
    <div
      className="booking-calendar-island max-w-2xl mx-auto"
      data-island="booking-calendar"
      data-hydrated="true"
    >
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className={`${accentColor} text-white p-6`}>
          <h2 className="text-xl font-bold font-heading">Prenota la tua visita</h2>
          <p className="text-white/80 text-sm mt-1">
            Seleziona specialità, prestazione, medico e orario preferiti
          </p>
        </div>

        <div className="p-6">
          {renderSedeSelector()}
          {renderStepIndicator()}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {renderCurrentStep()}

          <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
            <button
              onClick={goPrev}
              disabled={currentStepIndex === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentStepIndex === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Indietro
            </button>

            {currentStep === 'conferma' ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-colors ${accentColor} ${accentHover} disabled:opacity-50`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    Conferma prenotazione
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              currentStep !== 'calendario' && (
                <button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium transition-colors ${accentColor} ${accentHover} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Avanti
                  <ChevronRight className="w-4 h-4" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendarIsland;
