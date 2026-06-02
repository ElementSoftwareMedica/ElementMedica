/**
 * MobileQueueLanding - Pagina check-in paziente via QR
 * Progetto 53.1: Sistema gestione code pazienti - Mobile Landing
 * 
 * Flusso semplificato:
 * 1. Paziente scansiona QR → arriva su questa pagina
 * 2. Inserisce lastName/firstName per cercare la prenotazione
 * 3. Se trovato prenotato → Conferma e check-in
 * 4. Se trovato in DB → Propone walk-in con dati precompilati
 * 5. Se non trovato → Propone registrazione walk-in
 * 
 * @module pages/clinica/coda/MobileQueueLanding
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getOptionLabel, getOptionValue } from '@/utils/optionHelpers';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Search,
    User,
    Calendar,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    Building2,
    Stethoscope,
    ArrowRight,
    Phone,
    Mail,
    MapPin,
    CreditCard,
    UserCheck,
    FileText,
    ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerElegante } from '@/components/ui/DatePickerElegante';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { getMedicoTitle } from '@/utils/textFormatters';
import {
    extractGenderFromTaxCode,
    extractBirthDateFromTaxCode,
    extractBirthPlaceFromTaxCode,
    checkTaxCodeCompatibility,
    generateTaxCodeWithDetails
} from '@/utils/codiceFiscale';
import { loadComuni, getComuneByName } from '@/data/comuniItaliani';

// API helper (senza autenticazione per endpoint pubblici)
const publicApiGet = async (url: string) => {
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Errore nella richiesta');
    }
    return response.json();
};

const publicApiPost = async (url: string, data: object) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Errore nella richiesta');
    }
    return response.json();
};

// Tipi
interface AmbulatorioInfo {
    id?: string;
    codice?: string;
    nome: string;
    indicazioni?: string;
    isEsterno?: boolean;
    isPrimary?: boolean;
}

interface MedicoInfo {
    id?: string;
    personId?: string;
    firstName: string;
    lastName: string;
    gender?: string;
    isPrimary?: boolean;
    ambulatorio?: {
        id: string;
        nome: string;
        codice?: string;
        indicazioni?: string;
    };
}

interface SessionInfo {
    sessionId: string;
    date: string;
    mode: string;
    ambulatorio?: AmbulatorioInfo;
    medico?: MedicoInfo;
    // P53.2: Array completo per multi-medico e multi-ambulatorio
    medici?: MedicoInfo[];
    ambulatori?: AmbulatorioInfo[];
    patientAccessMode: 'ONLY_BOOKED' | 'ONLY_WALKIN' | 'BOTH';
    allowNewPatients: boolean;
    allowPatientChoosePrestazione?: boolean;
    prestazioniDisponibili?: string[];
    requiredPatientFields?: string[];
    durataMinutiDefault?: number;
    slotOrario?: { oraInizio: string; oraFine: string } | null;
    // Questionnaire configuration
    questionarioTemplateId?: string;
    questionarioTemplateNome?: string;
    questionarioMode?: 'ALL' | 'SORVEGLIANZA' | 'DISABLED';
}

interface SearchResult {
    found: boolean;
    type: 'BOOKED' | 'BOOKED_MULTIPLE' | 'KNOWN_WALKIN' | 'NEW_WALKIN' | 'NOT_FOUND';
    patient?: {
        id: string;
        firstName: string;
        lastName: string;
        taxCode?: string;
        birthDate?: string;
        birthPlace?: string;
        email?: string;
        phone?: string;
    };
    /** Multiple patient matches needing user selection */
    patients?: Array<{
        id: string;
        firstName: string;
        lastName: string;
        birthDate?: string;
        birthPlace?: string;
    }>;
    /** Multiple booked appointments needing user selection */
    appointments?: Array<{
        id: string;
        dataOra: string;
        prestazione?: { id: string; nome: string };
        medicoId: string;
    }>;
    /** True when patient identity needs confirmation */
    needsConfirmation?: boolean;
    appointment?: {
        id: string;
        dataOra: string;
        prestazione?: {
            nome: string;
        };
    };
    entry?: {
        id: string;
    };
    message?: string;
    allowWalkIn?: boolean;
}

interface CheckInResult {
    entry: {
        id: string;
        displayNumber: string;
        numero: number;
        checkInAt: string;
    };
    waiting: {
        positionInQueue: number;
        estimatedMinutes: number;
    };
    questionarioPending?: {
        templateId: string;
        templateNome: string;
        mode: string;
        appointmentId: string;
    } | null;
}

// Questionnaire field types (mirrored from CampoTemplate)
interface QuestionarioCampo {
    name: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect' | 'radio' | 'email' | 'phone' | 'signature';
    label: string;
    required: boolean;
    options?: string[];
    defaultValue?: string;
    placeholder?: string;
    helpText?: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
    condition?: {
        fieldName: string;
        operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
        value?: string | number | boolean;
    };
}

interface AvailableSlot {
    id: string;
    oraInizio: string;
    oraFine: string;
    slotId: string | null;
    durata: number;
    medico: string | null;
    medicoId?: string;
    disponibilitaId?: string;
}

interface OverbookingSlot {
    id: string;
    oraInizio: string;
    oraFine: string;
    durata: number;
    medico: string | null;
    medicoId: string;
    type: 'gap' | 'end_of_block';
    label: string;
}

type Step = 'loading' | 'error' | 'search' | 'confirm-booked' | 'select-appointment' | 'confirm-identity' | 'select-slot' | 'not-found' | 'cf-search' | 'questionario' | 'success';

const MobileQueueLanding: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // State
    const [step, setStep] = useState<Step>('loading');
    const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Form state
    const [lastName, setLastName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    // Result state
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);

    // Slot availability picker
    const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
    const [overbookingSlots, setOverbookingSlots] = useState<OverbookingSlot[]>([]);
    const [slotsEmptyReason, setSlotsEmptyReason] = useState<string | null>(null);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
    const [selectedMedicoFilter, setSelectedMedicoFilter] = useState<string | null>(null); // null = all

    // Extra patient data for NEW_WALKIN
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [taxCode, setTaxCode] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [birthPlace, setBirthPlace] = useState('');
    const [provinciaNascita, setProvinciaNascita] = useState('');
    const [residenza, setResidenza] = useState('');
    const [comuneResidenza, setComuneResidenza] = useState('');

    // CF validation and auto-calculation
    const [sesso, setSesso] = useState<'M' | 'F' | ''>('');
    const [cfAutoCalculated, setCfAutoCalculated] = useState(false);

    // Questionnaire state
    const [questionarioCampi, setQuestionarioCampi] = useState<QuestionarioCampo[]>([]);
    const [questionarioRisposte, setQuestionarioRisposte] = useState<Record<string, unknown>>({});
    const [questionarioPendingData, setQuestionarioPendingData] = useState<CheckInResult['questionarioPending']>(null);
    const [isLoadingQuestionario, setIsLoadingQuestionario] = useState(false);
    const [isSubmittingQuestionario, setIsSubmittingQuestionario] = useState(false);
    const [questionarioRichiedeFirma, setQuestionarioRichiedeFirma] = useState(false);

    const [cfMismatch, setCfMismatch] = useState<{
        isCompatible: boolean;
        surnameMatch: boolean;
        nameMatch: boolean;
    } | null>(null);

    // Helper: check if a field is required by session config
    const isFieldRequired = useCallback((fieldKey: string) => {
        const fields = sessionInfo?.requiredPatientFields || ['lastName', 'firstName'];
        return fields.includes(fieldKey);
    }, [sessionInfo]);

    // Preload comuni dataset for CF → birthPlace resolution
    useEffect(() => { loadComuni(); }, []);

    // Auto-fill birth data from CF when it reaches 16 chars + validate against name
    const handleTaxCodeChange = useCallback((value: string) => {
        const upper = value.toUpperCase();
        setTaxCode(upper);
        setCfAutoCalculated(false);

        if (upper.length === 16) {
            // Extract birthDate from CF
            const birthDateFromCF = extractBirthDateFromTaxCode(upper);
            if (birthDateFromCF) {
                const y = birthDateFromCF.getUTCFullYear();
                const m = String(birthDateFromCF.getUTCMonth() + 1).padStart(2, '0');
                const d = String(birthDateFromCF.getUTCDate()).padStart(2, '0');
                setBirthDate(`${y}-${m}-${d}`);
            }

            // Extract birthPlace + provincia from codice catastale
            const birthPlaceInfo = extractBirthPlaceFromTaxCode(upper);
            if (birthPlaceInfo) {
                setBirthPlace(birthPlaceInfo.comune);
                setProvinciaNascita(birthPlaceInfo.provincia);
            }

            // Extract gender
            const genderFromCF = extractGenderFromTaxCode(upper);
            if (genderFromCF === 'MALE') setSesso('M');
            else if (genderFromCF === 'FEMALE') setSesso('F');

            // Validate CF against entered lastName/firstName
            if (lastName || firstName) {
                const compat = checkTaxCodeCompatibility(firstName, lastName, upper);
                setCfMismatch(compat.isCompatible ? null : compat);
            }
        } else {
            setCfMismatch(null);
        }
    }, [lastName, firstName]);

    // Auto-fill provincia when birthPlace changes
    const handleBirthPlaceChange = useCallback((value: string) => {
        setBirthPlace(value);
        if (value.trim().length >= 2) {
            const comuneInfo = getComuneByName(value.trim());
            if (comuneInfo) {
                setProvinciaNascita(comuneInfo.provincia);
            }
        }
    }, []);

    // Auto-calculate CF when all required fields are filled
    useEffect(() => {
        // Only auto-calc if CF is empty or was previously auto-calculated
        if (taxCode && !cfAutoCalculated) return;
        if (!lastName.trim() || !firstName.trim() || !birthDate || !sesso || !birthPlace.trim()) return;

        const sessoFull = sesso === 'M' ? 'MALE' as const : 'FEMALE' as const;
        const result = generateTaxCodeWithDetails({
            cognome: lastName.trim(),
            nome: firstName.trim(),
            dataNascita: birthDate,
            sesso: sessoFull,
            comuneNascita: birthPlace.trim()
        });

        if (result.taxCode) {
            setTaxCode(result.taxCode);
            setCfAutoCalculated(true);
            setCfMismatch(null);

            // Auto-fill provincia from comune info if found
            if (result.comuneInfo) {
                setProvinciaNascita(result.comuneInfo.provincia);
            }
        }
    }, [lastName, firstName, birthDate, sesso, birthPlace, cfAutoCalculated, taxCode]);

    // Re-validate CF against name when lastName/firstName change (manual CF entry)
    useEffect(() => {
        if (!taxCode || taxCode.length !== 16 || cfAutoCalculated) return;
        if (!lastName && !firstName) return;
        const compat = checkTaxCodeCompatibility(firstName, lastName, taxCode);
        setCfMismatch(compat.isCompatible ? null : compat);
    }, [lastName, firstName, taxCode, cfAutoCalculated]);

    // Carica info sessione
    const loadSessionInfo = useCallback(async () => {
        if (!token) {
            setErrorMessage('Link non valido');
            setStep('error');
            return;
        }

        try {
            const response = await publicApiGet(`/api/v1/public/queue/${token}`);
            setSessionInfo(response.data);
            setStep('search');
        } catch (error) {
            const err = error as Error;
            setErrorMessage('Impossibile caricare le informazioni della sessione');
            setStep('error');
        }
    }, [token]);

    useEffect(() => {
        loadSessionInfo();
    }, [loadSessionInfo]);

    // Carica slot disponibili quando si entra nello step select-slot
    const loadAvailableSlots = useCallback(async () => {
        if (!token) return;
        setIsLoadingSlots(true);
        setSelectedSlot(null);
        try {
            const response = await publicApiGet(`/api/v1/public/queue/${token}/available-times`);
            setAvailableSlots(response.data || []);
            setOverbookingSlots(response.overbookingSlots || []);
            setSlotsEmptyReason(response.emptyReason || null);
        } catch {
            // Silently fallback to empty slots (non-critical)
            setAvailableSlots([]);
            setOverbookingSlots([]);
            setSlotsEmptyReason(null);
        } finally {
            setIsLoadingSlots(false);
        }
    }, [token]);

    useEffect(() => {
        if (step === 'select-slot') {
            loadAvailableSlots();
        }
    }, [step, loadAvailableSlots]);

    // Cerca paziente
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!lastName.trim() || lastName.trim().length < 2) {
            showToast({ message: 'Inserisci almeno 2 caratteri del cognome', type: 'warning' });
            return;
        }

        setIsSearching(true);
        try {
            const response = await publicApiPost(`/api/v1/public/queue/${token}/search`, {
                lastName: lastName.trim(),
                firstName: firstName.trim()
            });

            setSearchResult(response.data);

            // Determina prossimo step in base al risultato
            switch (response.data.type) {
                case 'BOOKED':
                    setStep('confirm-booked');
                    break;
                case 'BOOKED_MULTIPLE':
                    setStep('select-appointment');
                    break;
                case 'KNOWN_WALKIN':
                    if (response.data.allowWalkIn !== false) {
                        // Smart search: if confirmation needed, show confirmation step
                        if (response.data.needsConfirmation) {
                            setStep('confirm-identity');
                        } else {
                            setStep('select-slot');
                        }
                    } else {
                        showToast({ message: 'Accesso walk-in non disponibile per questa struttura', type: 'error' });
                    }
                    break;
                case 'NEW_WALKIN':
                    if (response.data.allowWalkIn !== false) {
                        setStep('select-slot');
                    } else {
                        showToast({ message: 'Accesso walk-in non disponibile per questa struttura', type: 'error' });
                    }
                    break;
                case 'NOT_FOUND':
                    setStep('not-found');
                    break;
            }
        } catch (error) {
            const err = error as Error;
            showToast({ message: 'Errore nella ricerca', type: 'error' });
        } finally {
            setIsSearching(false);
        }
    };

    // Helper: load questionnaire template and transition to questionario step
    const startQuestionario = useCallback(async (pending: NonNullable<CheckInResult['questionarioPending']>) => {
        setQuestionarioPendingData(pending);
        setIsLoadingQuestionario(true);
        try {
            const templateRes = await publicApiGet(`/api/v1/public/queue/${token}/questionario/${pending.templateId}`);
            const template = templateRes.data;
            setQuestionarioCampi(template.campi || []);
            setQuestionarioRichiedeFirma(template.richiedeFirma || false);
            // Initialize default values
            const defaults: Record<string, unknown> = {};
            for (const campo of (template.campi || [])) {
                if (campo.defaultValue !== undefined && campo.defaultValue !== '') {
                    defaults[campo.name] = campo.type === 'boolean' ? campo.defaultValue === 'true' : campo.defaultValue;
                } else if (campo.type === 'boolean') {
                    defaults[campo.name] = false;
                } else if (campo.type === 'multiselect') {
                    defaults[campo.name] = [];
                }
            }
            setQuestionarioRisposte(defaults);
            setStep('questionario');
        } catch (error) {
            const err = error as Error;
            showToast({ message: 'Errore nel caricamento del questionario', type: 'error' });
            // Fall back to success if questionnaire is not mandatory (ALL = mandatory for all patients)
            if (pending.mode !== 'ALL') {
                setStep('success');
            }
        } finally {
            setIsLoadingQuestionario(false);
        }
    }, [token, showToast]);

    // Check-in paziente prenotato
    const handleCheckInBooked = async () => {
        if (!searchResult?.appointment?.id) return;

        setIsCheckingIn(true);
        try {
            const response = await publicApiPost(`/api/v1/public/queue/${token}/checkin`, {
                appointmentId: searchResult.appointment.id,
                entryId: searchResult.entry?.id
            });

            setCheckInResult(response.data);

            // Check for pending questionnaire
            if (response.data.questionarioPending) {
                await startQuestionario(response.data.questionarioPending);
            } else {
                setStep('success');
            }
        } catch (error) {
            const err = error as Error;
            showToast({ message: 'Errore nel check-in', type: 'error' });
        } finally {
            setIsCheckingIn(false);
        }
    };

    // Seleziona uno degli appuntamenti multipli e procedi a conferma
    const handleSelectAppointment = (appointment: { id: string; dataOra: string; prestazione?: { id: string; nome: string }; medicoId: string }) => {
        if (!searchResult) return;
        // Update searchResult with the selected appointment, switch to confirm-booked
        setSearchResult({
            ...searchResult,
            type: 'BOOKED',
            appointment: {
                id: appointment.id,
                dataOra: appointment.dataOra,
                prestazione: appointment.prestazione
            }
        });
        setStep('confirm-booked');
    };

    // Registra walk-in con appuntamento
    const handleWalkIn = async () => {
        const isNewPatient = !searchResult?.patient?.id;

        // Validazione campi obbligatori per nuovo paziente (dinamica da config)
        if (isNewPatient) {
            if (!lastName.trim() || !firstName.trim()) {
                showToast({ message: 'Cognome e nome sono obbligatori', type: 'warning' });
                return;
            }
            if (isFieldRequired('phone') && !phone.trim()) {
                showToast({ message: 'Inserisci il numero di telefono', type: 'warning' });
                return;
            }
            if (isFieldRequired('taxCode') && !taxCode.trim()) {
                showToast({ message: 'Inserisci il codice fiscale', type: 'warning' });
                return;
            }
            if (isFieldRequired('birthDate') && !birthDate) {
                showToast({ message: 'Inserisci la data di nascita', type: 'warning' });
                return;
            }
        }

        setIsCheckingIn(true);
        try {
            const body: Record<string, unknown> = {
                patientId: searchResult?.patient?.id || undefined,
            };

            // Pass slot selection: pre-generated slotId OR computed time+medico
            if (selectedSlot) {
                // Build proper UTC ISO string from session date + slot time (Italian local)
                // The browser is in Italian timezone, so new Date("YYYY-MM-DDTHH:mm:00") correctly
                // interprets the naive string as Italian local time, then .toISOString() converts to UTC.
                // This matches the convention used by AppuntamentoForm (appointmentDate.toISOString()).
                if (sessionInfo?.date && selectedSlot.oraInizio) {
                    const sessionDate = new Date(sessionInfo.date);
                    const dateStr = `${sessionDate.getUTCFullYear()}-${String(sessionDate.getUTCMonth() + 1).padStart(2, '0')}-${String(sessionDate.getUTCDate()).padStart(2, '0')}`;
                    body.selectedDateTime = new Date(`${dateStr}T${selectedSlot.oraInizio}:00`).toISOString();
                }

                if (selectedSlot.slotId) {
                    body.slotId = selectedSlot.slotId;
                } else {
                    // Computed slot - send time and medico for backend to create appointment
                    body.selectedTime = selectedSlot.oraInizio;
                    body.selectedMedicoId = selectedSlot.medicoId;
                }
            }

            // Invia sempre walkInData per nuovi pazienti
            if (isNewPatient) {
                body.walkInData = {
                    lastName: lastName.trim(),
                    firstName: firstName.trim(),
                    phone: phone.trim() || undefined,
                    email: email.trim() || undefined,
                    taxCode: taxCode.trim() || undefined,
                    birthDate: birthDate || undefined,
                    birthPlace: birthPlace.trim() || undefined,
                    provinciaNascita: provinciaNascita.trim() || undefined,
                    sesso: sesso === 'M' ? 'MALE' : sesso === 'F' ? 'FEMALE' : undefined,
                    residenza: residenza.trim() || undefined,
                    comuneResidenza: comuneResidenza.trim() || undefined,
                };
            }

            const response = await publicApiPost(`/api/v1/public/queue/${token}/walkin`, body);

            setCheckInResult(response.data);

            // Check for pending questionnaire
            if (response.data.questionarioPending) {
                await startQuestionario(response.data.questionarioPending);
            } else {
                setStep('success');
            }
        } catch (error) {
            const err = error as Error;
            showToast({ message: 'Errore nella registrazione', type: 'error' });
        } finally {
            setIsCheckingIn(false);
        }
    };

    // Vai alla pagina status
    const goToStatusPage = () => {
        if (checkInResult?.entry?.id) {
            navigate(`/queue/${token}/status/${checkInResult.entry.id}`);
        }
    };

    // === QUESTIONNAIRE LOGIC ===

    // Evaluate conditional visibility for a field
    const isFieldVisible = useCallback((campo: QuestionarioCampo): boolean => {
        if (!campo.condition) return true;
        const { fieldName, operator, value } = campo.condition;
        const currentValue = questionarioRisposte[fieldName];

        // Helper: normalize boolean-like values for comparison
        // Boolean fields store true/false but conditions may use "Sì"/"No" or "true"/"false"
        const normalizeBooleanValue = (v: unknown): string => {
            if (v === true || v === 'true') return 'true';
            if (v === false || v === 'false') return 'false';
            const str = String(v ?? '').toLowerCase().trim();
            if (str === 'sì' || str === 'si' || str === 'yes' || str === '1') return 'true';
            if (str === 'no' || str === 'false' || str === '0') return 'false';
            return String(v ?? '');
        };

        // Find the source field type to determine comparison strategy
        const sourceField = questionarioCampi.find(c => c.name === fieldName);
        const isBooleanSource = sourceField?.type === 'boolean' || typeof currentValue === 'boolean';

        switch (operator) {
            case 'equals': {
                if (isBooleanSource) {
                    return normalizeBooleanValue(currentValue) === normalizeBooleanValue(value);
                }
                return String(currentValue ?? '') === String(value ?? '');
            }
            case 'notEquals': {
                if (isBooleanSource) {
                    return normalizeBooleanValue(currentValue) !== normalizeBooleanValue(value);
                }
                return String(currentValue ?? '') !== String(value ?? '');
            }
            case 'contains': return String(currentValue ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
            case 'greaterThan': return Number(currentValue) > Number(value);
            case 'lessThan': return Number(currentValue) < Number(value);
            case 'isEmpty': return !currentValue || currentValue === '' || (Array.isArray(currentValue) && currentValue.length === 0);
            case 'isNotEmpty': return !!currentValue && currentValue !== '' && !(Array.isArray(currentValue) && currentValue.length === 0);
            default: return true;
        }
    }, [questionarioRisposte, questionarioCampi]);

    // Update a questionnaire answer
    const handleQuestionarioChange = useCallback((fieldName: string, value: unknown) => {
        setQuestionarioRisposte(prev => ({ ...prev, [fieldName]: value }));
    }, []);

    // Submit questionnaire
    const handleSubmitQuestionario = async () => {
        if (!questionarioPendingData) return;

        // Validate required fields
        for (const campo of questionarioCampi) {
            if (!isFieldVisible(campo)) continue;
            if (!campo.required) continue;
            const value = questionarioRisposte[campo.name];
            if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
                showToast({ message: `Il campo "${campo.label}" è obbligatorio`, type: 'warning' });
                return;
            }
        }

        setIsSubmittingQuestionario(true);
        try {
            await publicApiPost(
                `/api/v1/public/queue/${token}/questionario/${questionarioPendingData.templateId}/submit`,
                {
                    appointmentId: questionarioPendingData.appointmentId,
                    risposte: questionarioRisposte
                }
            );
            showToast({ message: 'Questionario completato', type: 'success' });
            setStep('success');
        } catch (error) {
            const err = error as Error;
            showToast({ message: 'Errore nell\'invio del questionario', type: 'error' });
        } finally {
            setIsSubmittingQuestionario(false);
        }
    };

    // Skip optional questionnaire — transitions CONFERMATO → IN_ATTESA on backend
    const handleSkipQuestionario = async () => {
        if (questionarioPendingData?.appointmentId) {
            try {
                await publicApiPost(`/api/v1/public/queue/${token}/questionario/skip`, {
                    appointmentId: questionarioPendingData.appointmentId
                });
            } catch {
                // Non-critical — even if skip API fails, proceed to success
            }
        }
        setStep('success');
    };

    // Conferma identità paziente trovato (smart search)
    const handleConfirmIdentity = (patient: SearchResult['patient']) => {
        if (!patient) return;
        setSearchResult(prev => prev ? { ...prev, patient, needsConfirmation: false } : prev);
        setStep('select-slot');
    };

    // Ricerca per codice fiscale (fallback)
    const handleSearchByCF = async () => {
        if (!taxCode.trim() || taxCode.trim().length < 6) {
            showToast({ message: 'Inserisci almeno 6 caratteri del codice fiscale', type: 'warning' });
            return;
        }
        setIsSearching(true);
        try {
            const response = await publicApiPost(`/api/v1/public/queue/${token}/search-cf`, {
                taxCode: taxCode.trim()
            });
            if (response.data.found && response.data.patient) {
                setSearchResult(response.data);
                if (response.data.type === 'BOOKED') {
                    setStep('confirm-booked');
                } else if (response.data.type === 'BOOKED_MULTIPLE') {
                    setStep('select-appointment');
                } else {
                    setStep('select-slot');
                }
            } else {
                // CF non trovato - proceed as new patient
                setSearchResult({ found: false, type: 'NEW_WALKIN', allowWalkIn: true });
                setStep('select-slot');
                showToast({ message: 'Nessun paziente trovato. Procedi come nuovo paziente.', type: 'info' });
            }
        } catch (error) {
            const err = error as Error;
            showToast({ message: 'Errore nella ricerca', type: 'error' });
        } finally {
            setIsSearching(false);
        }
    };

    // Torna alla ricerca
    const goBack = () => {
        setSearchResult(null);
        setSelectedSlot(null);
        setPhone('');
        setEmail('');
        setTaxCode('');
        setBirthDate('');
        setBirthPlace('');
        setProvinciaNascita('');
        setResidenza('');
        setComuneResidenza('');
        setStep('search');
    };

    // Formatta titolo medico
    const getMedicoFullName = () => {
        if (!sessionInfo?.medico) return '';
        const gender = sessionInfo.medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | undefined;
        const title = getMedicoTitle(gender);
        return `${title} ${sessionInfo.medico.lastName} ${sessionInfo.medico.firstName}`;
    };

    // Multi-medico: check if session has multiple doctors
    const isMultiMedico = sessionInfo?.medici && sessionInfo.medici.length > 1;

    // Filtered slots by selected medico
    const filteredSlots = useMemo(() => {
        if (!selectedMedicoFilter) return availableSlots;
        return availableSlots.filter(s => s.medicoId === selectedMedicoFilter);
    }, [availableSlots, selectedMedicoFilter]);

    // Render loading
    if (step === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
                    <p className="text-gray-600">Caricamento in corso...</p>
                </div>
            </div>
        );
    }

    // Render error
    if (step === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Errore</h2>
                        <p className="text-gray-600">{errorMessage}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render questionario
    if (step === 'questionario') {
        if (isLoadingQuestionario) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-4">
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
                        <p className="text-gray-600">Caricamento questionario...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-4">
                <Card className="max-w-md w-full max-h-[90vh] flex flex-col">
                    <CardHeader className="text-center pb-3 flex-shrink-0">
                        <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <ClipboardList className="w-7 h-7 text-teal-600" />
                        </div>
                        <CardTitle className="text-lg">
                            {questionarioPendingData?.templateNome || 'Questionario'}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            Compila il questionario per completare la registrazione
                        </p>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto space-y-4 pb-4">
                        {questionarioCampi.map((campo) => {
                            if (!isFieldVisible(campo)) return null;

                            return (
                                <div key={campo.name} className="space-y-1.5">
                                    <Label htmlFor={`q-${campo.name}`} className="text-sm font-medium">
                                        {campo.label}
                                        {campo.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>

                                    {campo.helpText && (
                                        <p className="text-xs text-gray-500">{campo.helpText}</p>
                                    )}

                                    {/* TEXT */}
                                    {campo.type === 'text' && (
                                        <Input
                                            id={`q-${campo.name}`}
                                            value={(questionarioRisposte[campo.name] as string) || ''}
                                            onChange={(e) => handleQuestionarioChange(campo.name, e.target.value)}
                                            placeholder={campo.placeholder}
                                            required={campo.required}
                                        />
                                    )}

                                    {/* EMAIL */}
                                    {campo.type === 'email' && (
                                        <Input
                                            id={`q-${campo.name}`}
                                            type="email"
                                            value={(questionarioRisposte[campo.name] as string) || ''}
                                            onChange={(e) => handleQuestionarioChange(campo.name, e.target.value)}
                                            placeholder={campo.placeholder || 'email@esempio.it'}
                                            required={campo.required}
                                        />
                                    )}

                                    {/* PHONE */}
                                    {campo.type === 'phone' && (
                                        <Input
                                            id={`q-${campo.name}`}
                                            type="tel"
                                            value={(questionarioRisposte[campo.name] as string) || ''}
                                            onChange={(e) => handleQuestionarioChange(campo.name, e.target.value)}
                                            placeholder={campo.placeholder || '+39 ...'}
                                            required={campo.required}
                                        />
                                    )}

                                    {/* TEXTAREA */}
                                    {campo.type === 'textarea' && (
                                        <Textarea
                                            id={`q-${campo.name}`}
                                            value={(questionarioRisposte[campo.name] as string) || ''}
                                            onChange={(e) => handleQuestionarioChange(campo.name, e.target.value)}
                                            placeholder={campo.placeholder}
                                            rows={3}
                                            required={campo.required}
                                        />
                                    )}

                                    {/* NUMBER */}
                                    {campo.type === 'number' && (
                                        <Input
                                            id={`q-${campo.name}`}
                                            type="number"
                                            value={(questionarioRisposte[campo.name] as string) || ''}
                                            onChange={(e) => handleQuestionarioChange(campo.name, e.target.value)}
                                            placeholder={campo.placeholder}
                                            min={campo.validation?.min}
                                            max={campo.validation?.max}
                                            required={campo.required}
                                        />
                                    )}

                                    {/* DATE */}
                                    {campo.type === 'date' && (
                                        <DatePickerElegante
                                            value={(questionarioRisposte[campo.name] as string) || ''}
                                            onChange={(date) => handleQuestionarioChange(campo.name, date ? date.toISOString().split('T')[0] : '')}
                                            label=""
                                        />
                                    )}

                                    {/* BOOLEAN (Sì/No radio) */}
                                    {campo.type === 'boolean' && (
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-1">
                                                <input
                                                    type="radio"
                                                    name={`q-boolean-${campo.name}`}
                                                    checked={questionarioRisposte[campo.name] === true}
                                                    onChange={() => handleQuestionarioChange(campo.name, true)}
                                                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                                                />
                                                <span className="text-sm text-gray-700">Sì</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex-1">
                                                <input
                                                    type="radio"
                                                    name={`q-boolean-${campo.name}`}
                                                    checked={questionarioRisposte[campo.name] === false}
                                                    onChange={() => handleQuestionarioChange(campo.name, false)}
                                                    className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                                                />
                                                <span className="text-sm text-gray-700">No</span>
                                            </label>
                                        </div>
                                    )}

                                    {/* SELECT */}
                                    {campo.type === 'select' && (
                                        <select
                                            id={`q-${campo.name}`}
                                            value={(questionarioRisposte[campo.name] as string) || ''}
                                            onChange={(e) => handleQuestionarioChange(campo.name, e.target.value)}
                                            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                            required={campo.required}
                                        >
                                            <option value="">{campo.placeholder || 'Seleziona...'}</option>
                                            {campo.options?.map((opt, idx) => (
                                                <option key={idx} value={getOptionValue(opt)}>{getOptionLabel(opt)}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* MULTISELECT (checkboxes) */}
                                    {campo.type === 'multiselect' && (
                                        <div className="space-y-1.5 pl-1">
                                            {campo.options?.map((opt, idx) => {
                                                const optVal = getOptionValue(opt);
                                                const selected = Array.isArray(questionarioRisposte[campo.name])
                                                    ? (questionarioRisposte[campo.name] as string[]).includes(optVal)
                                                    : false;
                                                return (
                                                    <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => {
                                                                const current = Array.isArray(questionarioRisposte[campo.name])
                                                                    ? [...(questionarioRisposte[campo.name] as string[])]
                                                                    : [];
                                                                if (selected) {
                                                                    handleQuestionarioChange(campo.name, current.filter(v => v !== optVal));
                                                                } else {
                                                                    handleQuestionarioChange(campo.name, [...current, optVal]);
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                                        />
                                                        {getOptionLabel(opt)}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* RADIO */}
                                    {campo.type === 'radio' && (
                                        <div className="space-y-1.5 pl-1">
                                            {campo.options?.map((opt, idx) => (
                                                <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`q-${campo.name}`}
                                                        checked={questionarioRisposte[campo.name] === getOptionValue(opt)}
                                                        onChange={() => handleQuestionarioChange(campo.name, getOptionValue(opt))}
                                                        className="w-4 h-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                                                    />
                                                    {getOptionLabel(opt)}
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {/* SIGNATURE - simplified for mobile (text input as placeholder) */}
                                    {campo.type === 'signature' && (
                                        <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
                                            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">
                                                La firma verrà raccolta dal personale medico
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>

                    {/* Sticky footer - always visible */}
                    <div className="flex-shrink-0 border-t border-gray-200 p-4 space-y-3">
                        <Button
                            onClick={handleSubmitQuestionario}
                            disabled={isSubmittingQuestionario}
                            className="w-full bg-teal-600 hover:bg-teal-700"
                        >
                            {isSubmittingQuestionario ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Invio in corso...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Invia questionario
                                </>
                            )}
                        </Button>

                        {questionarioPendingData?.mode !== 'ALL' && (
                            <Button
                                variant="ghost"
                                onClick={handleSkipQuestionario}
                                className="w-full text-gray-500"
                            >
                                Salta questionario
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    // Render success
    if (step === 'success' && checkInResult) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-8 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-12 h-12 text-green-600" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Check-in completato!
                        </h2>

                        <div className="bg-white rounded-xl p-6 shadow-inner my-6">
                            <p className="text-gray-500 text-sm mb-2">Il tuo numero</p>
                            <p className="text-5xl font-bold text-teal-600">
                                {checkInResult.entry.displayNumber}
                            </p>
                        </div>

                        <div className="flex items-center justify-center gap-6 text-gray-600 mb-6">
                            <div className="text-center">
                                <User className="w-5 h-5 mx-auto mb-1" />
                                <span className="text-sm">
                                    {checkInResult.waiting.positionInQueue}° in coda
                                </span>
                            </div>
                            <div className="text-center">
                                <Clock className="w-5 h-5 mx-auto mb-1" />
                                <span className="text-sm">
                                    ~{checkInResult.waiting.estimatedMinutes} min
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={goToStatusPage}
                            className="w-full bg-teal-600 hover:bg-teal-700"
                        >
                            Segui il tuo turno
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render main content
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
                {/* Header */}
                <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Stethoscope className="w-8 h-8 text-teal-600" />
                    </div>
                    <CardTitle className="text-xl">
                        {isMultiMedico ? (
                            <span>
                                Benvenuto alla visita
                                <div className="flex flex-col items-center gap-1 mt-2">
                                    {sessionInfo!.medici!.map((m, idx) => {
                                        const gender = m.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | undefined;
                                        const title = getMedicoTitle(gender);
                                        return (
                                            <div key={idx} className="flex flex-col items-center">
                                                <span className="text-base font-medium text-teal-700">
                                                    {title} {m.lastName} {m.firstName}
                                                </span>
                                                {m.ambulatorio && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Building2 className="w-3 h-3" />
                                                        {m.ambulatorio.nome}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </span>
                        ) : sessionInfo?.medico ? (
                            <span>Benvenuto alla visita di<br />{getMedicoFullName()}</span>
                        ) : (
                            'Check-in Visita'
                        )}
                    </CardTitle>
                    {/* P53.2: Mostra ambulatorio/i con indicazioni */}
                    {sessionInfo?.ambulatori && sessionInfo.ambulatori.length > 0 ? (
                        <div className="mt-2">
                            {sessionInfo.ambulatori.map((amb, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-1 mt-1 text-sm text-gray-600">
                                    <span className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        <span>{amb.nome}</span>
                                        {amb.isEsterno && (
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Esterno</span>
                                        )}
                                    </span>
                                    {amb.indicazioni && (
                                        <span className="text-xs text-gray-500 text-center max-w-xs">
                                            📍 {amb.indicazioni}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : sessionInfo?.ambulatorio && (
                        <div className="flex flex-col items-center gap-1 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {sessionInfo.ambulatorio.nome}
                                {sessionInfo.ambulatorio.isEsterno && (
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Esterno</span>
                                )}
                            </span>
                            {sessionInfo.ambulatorio.indicazioni && (
                                <span className="text-xs text-gray-500 text-center max-w-xs">
                                    📍 {sessionInfo.ambulatorio.indicazioni}
                                </span>
                            )}
                        </div>
                    )}
                </CardHeader>

                <CardContent>
                    {/* Step: Search */}
                    {step === 'search' && (
                        <form onSubmit={handleSearch} className="space-y-4">
                            <p className="text-center text-gray-600 mb-4">
                                Inserisci i tuoi dati per il check-in
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Cognome *
                                    </label>
                                    <Input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Inserisci il tuo cognome"
                                        className="h-12"
                                        autoComplete="family-name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                        Nome
                                    </label>
                                    <Input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Inserisci il tuo nome"
                                        className="h-12"
                                        autoComplete="given-name"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-teal-600 hover:bg-teal-700"
                                disabled={isSearching || lastName.trim().length < 2}
                            >
                                {isSearching ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Search className="w-5 h-5 mr-2" />
                                )}
                                Cerca Prenotazione
                            </Button>
                        </form>
                    )}

                    {/* Step: Confirm Booked Appointment */}
                    {step === 'confirm-booked' && searchResult && (
                        <div className="space-y-4">
                            <Alert className="bg-green-50 border-green-200">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <AlertDescription className="text-green-800">
                                    Prenotazione trovata!
                                </AlertDescription>
                            </Alert>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium">
                                            {searchResult.patient?.lastName} {searchResult.patient?.firstName}
                                        </p>
                                        {searchResult.patient?.taxCode && (
                                            <p className="text-sm text-gray-500">
                                                CF: {searchResult.patient.taxCode}
                                            </p>
                                        )}
                                        {searchResult.patient?.birthDate && (
                                            <p className="text-sm text-gray-500">
                                                Nato/a il: {new Date(searchResult.patient.birthDate).toLocaleDateString('it-IT', { timeZone: 'UTC' })}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {searchResult.appointment && (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-5 h-5 text-gray-400" />
                                            <span>
                                                {new Date(searchResult.appointment.dataOra).toLocaleTimeString('it-IT', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        {searchResult.appointment.prestazione && (
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-5 h-5 text-gray-400" />
                                                <span>{searchResult.appointment.prestazione.nome}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={goBack}
                                    className="flex-1"
                                >
                                    Indietro
                                </Button>
                                <Button
                                    onClick={handleCheckInBooked}
                                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                                    disabled={isCheckingIn}
                                >
                                    {isCheckingIn ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Confermo ✓'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step: Confirm Walk-in (KNOWN_WALKIN / NEW_WALKIN) */}
                    {step === 'select-appointment' && searchResult?.appointments && (
                        <div className="space-y-4">
                            <Alert className="bg-blue-50 border-blue-200">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <AlertDescription className="text-blue-800">
                                    Trovate più prenotazioni per oggi. Seleziona la tua.
                                </AlertDescription>
                            </Alert>

                            {searchResult.patient && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <p className="font-medium text-sm">
                                            {searchResult.patient.lastName} {searchResult.patient.firstName}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {searchResult.appointments.map((appt) => {
                                    const medico = sessionInfo?.medici?.find(m =>
                                        m.personId === appt.medicoId || m.id === appt.medicoId
                                    );
                                    const medicoName = medico
                                        ? `${getMedicoTitle(medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | undefined)} ${medico.lastName} ${medico.firstName}`
                                        : '';
                                    return (
                                        <button
                                            key={appt.id}
                                            onClick={() => handleSelectAppointment(appt)}
                                            className="w-full text-left border rounded-lg p-4 hover:bg-teal-50 hover:border-teal-400 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-teal-600" />
                                                        <span className="font-bold text-lg">
                                                            {new Date(appt.dataOra).toLocaleTimeString('it-IT', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                    {appt.prestazione?.nome && (
                                                        <p className="text-sm text-gray-600 ml-6">{appt.prestazione.nome}</p>
                                                    )}
                                                    {medicoName && (
                                                        <p className="text-sm text-gray-500 ml-6">{medicoName}</p>
                                                    )}
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-gray-400" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                onClick={goBack}
                                className="w-full"
                            >
                                Indietro
                            </Button>
                        </div>
                    )}

                    {/* Step: Confirm Walk-in - Select Slot (KNOWN_WALKIN / NEW_WALKIN) */}
                    {step === 'select-slot' && (
                        <div className="space-y-4">
                            {/* Patient info header */}
                            {searchResult?.type === 'KNOWN_WALKIN' && searchResult?.patient && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <User className="w-5 h-5 text-gray-400" />
                                        <p className="font-medium">
                                            {searchResult.patient.lastName} {searchResult.patient.firstName}
                                        </p>
                                    </div>
                                    <p className="text-gray-600 text-sm">
                                        Non hai una prenotazione per oggi. Scegli un orario per metterti in coda.
                                    </p>
                                </div>
                            )}

                            {searchResult?.type === 'NEW_WALKIN' && (
                                <>
                                    <Alert className="bg-blue-50 border-blue-200">
                                        <AlertCircle className="w-4 h-4 text-blue-600" />
                                        <AlertDescription className="text-blue-800">
                                            Completa i tuoi dati per registrarti
                                        </AlertDescription>
                                    </Alert>

                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                        {/* Cognome/Nome — always editable when cfMismatch, otherwise static display */}
                                        {cfMismatch ? (
                                            <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                <p className="text-xs font-medium text-amber-800 flex items-center gap-1">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    Verifica e correggi cognome/nome se necessario:
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-0.5 block">Cognome</label>
                                                        <Input
                                                            value={lastName}
                                                            onChange={(e) => setLastName(e.target.value)}
                                                            className={`h-10 ${!cfMismatch.surnameMatch ? 'border-amber-400 bg-amber-50' : 'border-green-400 bg-green-50'}`}
                                                        />
                                                        {!cfMismatch.surnameMatch && (
                                                            <p className="text-[10px] text-amber-600 mt-0.5">Non compatibile con CF</p>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-gray-700 mb-0.5 block">Nome</label>
                                                        <Input
                                                            value={firstName}
                                                            onChange={(e) => setFirstName(e.target.value)}
                                                            className={`h-10 ${!cfMismatch.nameMatch ? 'border-amber-400 bg-amber-50' : 'border-green-400 bg-green-50'}`}
                                                        />
                                                        {!cfMismatch.nameMatch && (
                                                            <p className="text-[10px] text-amber-600 mt-0.5">Non compatibile con CF</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-700 mb-1">
                                                {lastName} {firstName}
                                            </p>
                                        )}

                                        {/* Dynamic fields based on requiredPatientFields */}
                                        {isFieldRequired('phone') && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                    <Phone className="w-3.5 h-3.5 inline mr-1" />
                                                    Telefono *
                                                </label>
                                                <Input
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="Es. 333 1234567"
                                                    type="tel"
                                                    className="h-11"
                                                    autoComplete="tel"
                                                />
                                            </div>
                                        )}

                                        {isFieldRequired('email') && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                    <Mail className="w-3.5 h-3.5 inline mr-1" />
                                                    Email {isFieldRequired('email') ? '*' : ''}
                                                </label>
                                                <Input
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Es. mario.rossi@email.it"
                                                    type="email"
                                                    className="h-11"
                                                    autoComplete="email"
                                                />
                                            </div>
                                        )}

                                        {isFieldRequired('taxCode') && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                    <CreditCard className="w-3.5 h-3.5 inline mr-1" />
                                                    Codice Fiscale *
                                                </label>
                                                <Input
                                                    value={taxCode}
                                                    onChange={(e) => handleTaxCodeChange(e.target.value)}
                                                    placeholder="Es. RSSMRA80A01H501Z"
                                                    className={`h-11 uppercase ${cfMismatch ? 'border-amber-500 focus:ring-amber-500' : ''}`}
                                                    maxLength={16}
                                                    autoComplete="off"
                                                />
                                                {cfAutoCalculated && taxCode && (
                                                    <p className="text-xs text-teal-600 mt-1">
                                                        <CheckCircle className="w-3 h-3 inline mr-1" />
                                                        Codice fiscale calcolato automaticamente
                                                    </p>
                                                )}
                                                {cfMismatch && (
                                                    <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md">
                                                        <p className="text-xs font-medium text-amber-800">
                                                            <AlertCircle className="w-3 h-3 inline mr-1" />
                                                            CF non corrisponde — correggi cognome/nome sopra
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {isFieldRequired('birthDate') && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                        <Calendar className="w-3.5 h-3.5 inline mr-1" />
                                                        Data di Nascita *
                                                    </label>
                                                    <DatePickerElegante
                                                        value={birthDate}
                                                        onChange={(date) => setBirthDate(date ? date.toISOString().split('T')[0] : '')}
                                                        label=""
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                        <User className="w-3.5 h-3.5 inline mr-1" />
                                                        Sesso *
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSesso('M')}
                                                            className={`flex-1 h-11 rounded-md border text-sm font-medium transition-colors ${sesso === 'M'
                                                                ? 'bg-teal-600 text-white border-teal-600'
                                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            M
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSesso('F')}
                                                            className={`flex-1 h-11 rounded-md border text-sm font-medium transition-colors ${sesso === 'F'
                                                                ? 'bg-teal-600 text-white border-teal-600'
                                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            F
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {isFieldRequired('birthPlace') && (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                        <MapPin className="w-3.5 h-3.5 inline mr-1" />
                                                        Luogo di Nascita *
                                                    </label>
                                                    <Input
                                                        value={birthPlace}
                                                        onChange={(e) => handleBirthPlaceChange(e.target.value)}
                                                        placeholder="Es. Roma"
                                                        className="h-11"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                        Provincia
                                                    </label>
                                                    <Input
                                                        value={provinciaNascita}
                                                        onChange={(e) => setProvinciaNascita(e.target.value.toUpperCase())}
                                                        placeholder="RM"
                                                        className="h-11 uppercase"
                                                        maxLength={2}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Hint: CF auto-calculation when all birth data filled */}
                                        {!taxCode && birthDate && sesso && birthPlace && (
                                            <p className="text-xs text-gray-500 -mt-1">
                                                <CreditCard className="w-3 h-3 inline mr-1" />
                                                Il codice fiscale verrà calcolato automaticamente
                                            </p>
                                        )}

                                        {isFieldRequired('provinciaNascita') && !isFieldRequired('birthPlace') && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                    <MapPin className="w-3.5 h-3.5 inline mr-1" />
                                                    Provincia di Nascita *
                                                </label>
                                                <Input
                                                    value={provinciaNascita}
                                                    onChange={(e) => setProvinciaNascita(e.target.value.toUpperCase())}
                                                    placeholder="Es. RM"
                                                    className="h-11 uppercase"
                                                    maxLength={2}
                                                />
                                            </div>
                                        )}

                                        {isFieldRequired('residenza') && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                    Indirizzo di Residenza *
                                                </label>
                                                <Input
                                                    value={residenza}
                                                    onChange={(e) => setResidenza(e.target.value)}
                                                    placeholder="Es. Via Roma 1"
                                                    className="h-11"
                                                />
                                            </div>
                                        )}

                                        {isFieldRequired('comuneResidenza') && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                                    Comune di Residenza *
                                                </label>
                                                <Input
                                                    value={comuneResidenza}
                                                    onChange={(e) => setComuneResidenza(e.target.value)}
                                                    placeholder="Es. Roma"
                                                    className="h-11"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Available time slots picker */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    Scegli un orario disponibile
                                </label>

                                {/* Multi-medico: doctor filter tabs */}
                                {isMultiMedico && !isLoadingSlots && availableSlots.length > 0 && (
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedMedicoFilter(null); setSelectedSlot(null); }}
                                            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedMedicoFilter === null
                                                ? 'bg-teal-600 text-white border-teal-600'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                                                }`}
                                        >
                                            Tutti ({availableSlots.length})
                                        </button>
                                        {sessionInfo!.medici!.map((m) => {
                                            const gender = m.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | undefined;
                                            const title = getMedicoTitle(gender);
                                            const count = availableSlots.filter(s => s.medicoId === m.personId).length;
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => { setSelectedMedicoFilter(m.personId || m.id || null); setSelectedSlot(null); }}
                                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedMedicoFilter === (m.personId || m.id)
                                                        ? 'bg-teal-600 text-white border-teal-600'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
                                                        }`}
                                                >
                                                    {title} {m.lastName} ({count})
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {isLoadingSlots ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                                        <span className="ml-2 text-sm text-gray-500">Caricamento orari...</span>
                                    </div>
                                ) : filteredSlots.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                                        {filteredSlots.map((slot) => (
                                            <button
                                                key={slot.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedSlot(slot);
                                                }}
                                                className={`
                                                    relative flex flex-col items-center justify-center
                                                    rounded-lg border-2 p-2.5 text-center transition-all
                                                    ${selectedSlot?.id === slot.id
                                                        ? 'border-teal-600 bg-teal-50 ring-1 ring-teal-600'
                                                        : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
                                                    }
                                                `}
                                            >
                                                <span className={`text-base font-semibold ${selectedSlot?.id === slot.id ? 'text-teal-700' : 'text-gray-800'
                                                    }`}>
                                                    {slot.oraInizio}
                                                </span>
                                                <span className="text-[11px] text-gray-400">
                                                    {slot.durata} min
                                                </span>
                                                {isMultiMedico && !selectedMedicoFilter && slot.medico && (
                                                    <span className="text-[9px] text-teal-500 truncate max-w-full">
                                                        {slot.medico}
                                                    </span>
                                                )}
                                                {selectedSlot?.id === slot.id && (
                                                    <CheckCircle className="absolute top-1 right-1 w-3.5 h-3.5 text-teal-600" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                                        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        {slotsEmptyReason === 'all_past' ? (
                                            <>
                                                <p className="text-sm font-medium">Orari non più disponibili</p>
                                                <p className="text-xs mt-1">
                                                    La fascia oraria {sessionInfo?.slotOrario?.oraInizio} – {sessionInfo?.slotOrario?.oraFine} è già passata.
                                                </p>
                                                <p className="text-xs mt-0.5 text-gray-400">
                                                    Contatta la struttura per prenotare un nuovo appuntamento.
                                                </p>
                                            </>
                                        ) : slotsEmptyReason === 'all_booked' ? (
                                            <>
                                                <p className="text-sm font-medium">Tutti gli orari sono occupati</p>
                                                <p className="text-xs mt-1">
                                                    La fascia oraria {sessionInfo?.slotOrario?.oraInizio} – {sessionInfo?.slotOrario?.oraFine} è al completo.
                                                </p>
                                                {overbookingSlots.length > 0 && (
                                                    <div className="mt-4 text-left">
                                                        <p className="text-xs font-medium text-amber-600 mb-2 text-center">Opzioni disponibili (non garantite):</p>
                                                        <div className="space-y-2">
                                                            {overbookingSlots.map((ob) => (
                                                                <button
                                                                    key={ob.id}
                                                                    onClick={() => setSelectedSlot({
                                                                        id: ob.id,
                                                                        oraInizio: ob.oraInizio,
                                                                        oraFine: ob.oraFine,
                                                                        slotId: null,
                                                                        durata: ob.durata,
                                                                        medico: ob.medico,
                                                                        medicoId: ob.medicoId
                                                                    })}
                                                                    className={`w-full flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all text-xs ${selectedSlot?.id === ob.id
                                                                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                                        : 'border-amber-200 bg-amber-50/50 text-gray-600 hover:border-amber-400'
                                                                        }`}
                                                                >
                                                                    <span className="font-semibold">{ob.oraInizio} – {ob.oraFine}</span>
                                                                    <span className="text-[10px] text-amber-600">{ob.label}</span>
                                                                    {ob.medico && <span className="text-[9px] text-amber-500">{ob.medico}</span>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm">Nessun orario disponibile</p>
                                                <p className="text-xs mt-1">Puoi comunque metterti in coda</p>
                                            </>
                                        )}
                                    </div>
                                )}

                                {selectedSlot?.medico && (
                                    <div className="flex items-center gap-2 text-sm text-teal-600 bg-teal-50 rounded px-3 py-1.5">
                                        <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{selectedSlot.medico}</span>
                                        <span className="text-teal-400">•</span>
                                        <span>{selectedSlot.oraInizio} - {selectedSlot.oraFine}</span>
                                    </div>
                                )}
                            </div>

                            {/* Session info summary */}
                            {sessionInfo && (
                                <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
                                    <div className="flex items-center gap-2 text-teal-700 text-sm">
                                        <Building2 className="w-4 h-4 flex-shrink-0" />
                                        <span>
                                            {sessionInfo.ambulatorio?.nome ||
                                                sessionInfo.ambulatori?.[0]?.nome ||
                                                'Ambulatorio'}
                                        </span>
                                    </div>
                                    {(sessionInfo.medico || sessionInfo.medici?.[0]) && (
                                        <div className="flex items-center gap-2 text-teal-600 text-sm mt-1">
                                            <Stethoscope className="w-4 h-4 flex-shrink-0" />
                                            <span>{getMedicoFullName()}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={goBack}
                                    className="flex-1"
                                >
                                    Indietro
                                </Button>
                                <Button
                                    onClick={handleWalkIn}
                                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                                    disabled={
                                        isCheckingIn ||
                                        (searchResult?.type === 'NEW_WALKIN' && isFieldRequired('phone') && !phone.trim()) ||
                                        // When session has a time window (slotOrario), require slot selection
                                        // to prevent blind walk-ins that land on wrong medico/ambulatorio
                                        (!!sessionInfo?.slotOrario && !selectedSlot)
                                    }
                                >
                                    {isCheckingIn ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : selectedSlot ? (
                                        `Prenota ${selectedSlot.oraInizio}`
                                    ) : (
                                        'Mettiti in coda'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step: Confirm Identity (smart search) */}
                    {step === 'confirm-identity' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-teal-700 bg-teal-50 rounded-lg p-3">
                                <UserCheck className="w-5 h-5" />
                                <p className="text-sm font-medium">
                                    {searchResult?.patients ? 'Seleziona il tuo profilo' : 'Conferma la tua identità'}
                                </p>
                            </div>

                            {/* Multiple matches - user selects one */}
                            {searchResult?.patients && searchResult.patients.length > 1 ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">
                                        Abbiamo trovato più pazienti con questo nome. Quale sei?
                                    </p>
                                    {searchResult.patients.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleConfirmIdentity(p as SearchResult['patient'])}
                                            className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-colors text-left"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">
                                                    {p.lastName} {p.firstName}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    {p.birthDate && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(p.birthDate).toLocaleDateString('it-IT', { timeZone: 'UTC' })}
                                                        </span>
                                                    )}
                                                    {p.birthPlace && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {p.birthPlace}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-teal-600" />
                                        </button>
                                    ))}
                                </div>
                            ) : searchResult?.patient ? (
                                /* Single match - confirm with birth data */
                                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                                    <p className="font-medium text-gray-900">
                                        {searchResult.patient.lastName} {searchResult.patient.firstName}
                                    </p>
                                    <div className="space-y-1.5 text-xs">
                                        {searchResult.patient.taxCode && (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                                                <span>CF: <strong>{searchResult.patient.taxCode}</strong></span>
                                            </div>
                                        )}
                                        {searchResult.patient.birthDate && (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                                <span>Nato/a il: <strong>{new Date(searchResult.patient.birthDate).toLocaleDateString('it-IT', { timeZone: 'UTC' })}</strong></span>
                                            </div>
                                        )}
                                        {searchResult.patient.birthPlace && (
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <MapPin className="w-3.5 h-3.5 text-teal-600" />
                                                <span>Luogo: <strong>{searchResult.patient.birthPlace}</strong></span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            onClick={() => handleConfirmIdentity(searchResult.patient!)}
                                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                                        >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Sono io
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setTaxCode('');
                                                setStep('cf-search');
                                            }}
                                            className="flex-1"
                                        >
                                            Non sono io
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setTaxCode('');
                                        setStep('cf-search');
                                    }}
                                    className="flex-1 text-xs"
                                >
                                    <CreditCard className="w-3.5 h-3.5 mr-1" />
                                    Cerca per Codice Fiscale
                                </Button>
                                <Button variant="ghost" onClick={goBack} className="text-xs">
                                    Indietro
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step: CF Search (fallback) */}
                    {step === 'cf-search' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-blue-700 bg-blue-50 rounded-lg p-3">
                                <CreditCard className="w-5 h-5" />
                                <p className="text-sm font-medium">Ricerca per Codice Fiscale</p>
                            </div>
                            <p className="text-xs text-gray-500">
                                Inserisci il tuo codice fiscale per verificare se sei già registrato nel sistema.
                            </p>
                            <div className="space-y-3">
                                <Input
                                    placeholder="Codice Fiscale (es. RSSMRA80A01H501Z)"
                                    value={taxCode}
                                    onChange={(e) => handleTaxCodeChange(e.target.value)}
                                    maxLength={16}
                                    className="uppercase font-mono text-sm"
                                />

                                {/* Show parsed CF data preview */}
                                {taxCode.length === 16 && (() => {
                                    const cfBirthDate = extractBirthDateFromTaxCode(taxCode);
                                    const cfGender = extractGenderFromTaxCode(taxCode);
                                    const cfBirthPlace = extractBirthPlaceFromTaxCode(taxCode);
                                    if (!cfBirthDate) return null;
                                    return (
                                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 space-y-1">
                                            <p className="text-xs font-medium text-teal-700">Dati estratti dal CF:</p>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-teal-600">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {cfBirthDate.toLocaleDateString('it-IT', { timeZone: 'UTC' })}
                                                </span>
                                                <span>•</span>
                                                <span>{cfGender === 'MALE' ? 'Maschio' : 'Femmina'}</span>
                                                {cfBirthPlace && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {cfBirthPlace.comune} ({cfBirthPlace.provincia})
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <Button
                                    onClick={handleSearchByCF}
                                    disabled={isSearching || taxCode.trim().length < 6}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                                >
                                    {isSearching ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Search className="w-4 h-4 mr-2" />
                                    )}
                                    Cerca
                                </Button>
                                <Button variant="outline" onClick={goBack} className="w-full">
                                    Torna indietro
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step: Not Found */}
                    {step === 'not-found' && (
                        <div className="space-y-4">
                            <Alert className="bg-red-50 border-red-200">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                                <AlertDescription className="text-red-800">
                                    {searchResult?.message || 'Non sei in lista per questa sessione.'}
                                </AlertDescription>
                            </Alert>

                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                                <p className="text-gray-600 text-sm">
                                    Il tuo nome non risulta tra i pazienti prenotati per questa sessione.
                                </p>
                                <p className="text-gray-500 text-xs mt-2">
                                    Se ritieni sia un errore, rivolgiti alla segreteria o alla reception.
                                </p>
                            </div>

                            <Button
                                variant="outline"
                                onClick={goBack}
                                className="w-full"
                            >
                                Riprova con altri dati
                            </Button>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
};

export default MobileQueueLanding;
