/**
 * AccettazionePazienteModal - Modal per accettazione completa paziente
 * 
 * Permette inserimento/modifica dati anagrafici, codice fiscale,
 * indirizzo di residenza, contatti, e lettura tessera sanitaria.
 * 
 * Features:
 * - Estrazione automatica dati da CF (sesso, data nascita, comune)
 * - Autocomplete comuni italiani con selezione automatica provincia
 * - Generazione automatica CF da dati anagrafici
 * - Verifica compatibilità nome/cognome con CF
 * 
 * @module pages/clinica/agenda/components/AccettazionePazienteModal
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    X,
    User,
    CreditCard,
    MapPin,
    Phone,
    Mail,
    Stethoscope,
    Building2,
    Euro,
    Save,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Scan,
    Calculator,
    Calendar,
    Wand2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    FileText,
    UserPlus,
    Download,
    Shield,
    Clock,
    Play,
    XCircle,
    UserCheck,
    Ban,
    RotateCcw,
    Info,
    Banknote,
    MessageSquare,
    Copy,
    Users,
    ShieldCheck,
    Pencil,
    Settings,
    Tablet
} from 'lucide-react';
import { apiGet, apiPost, apiDownload } from '../../../../services/api';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ComuneAutocomplete } from '@/components/ui/ComuneAutocomplete';
import { useToast } from '../../../../hooks/useToast';
import { useTenantMode } from '../../../../contexts/TenantModeContext';
import { pazientiApi, convenzioniApi, appuntamentiApi, prestazioniApi, Appuntamento, Convenzione } from '../../../../services/clinicaApi';
import {
    extractGenderFromTaxCode,
    extractBirthDateFromTaxCode,
    extractBirthPlaceFromTaxCode,
    checkTaxCodeCompatibility,
    isValidTaxCode,
    generateTaxCode,
    getDoctorTitle
} from '../../../../utils/codiceFiscale';
import type { ComuneItaliano } from '../../../../data/comuniItaliani';
import { getCapByProvincia } from '../../../../data/comuniItaliani';
import { DatePickerElegante } from '../../../../components/ui/DatePickerElegante';
import { useBillingAccess } from '../../../../hooks/useBillingAccess';
import QuickFatturazioneTab, { QuickFatturaContext } from '../../../finance/billing/components/QuickFatturazioneTab';

// ============================================
// TYPES
// ============================================

export interface AccettazionePazienteModalProps {
    appuntamento: Appuntamento;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (patientData: PatientFormData) => void;
    /** Callback per iniziare la visita (chiama paziente) */
    onVisita?: () => void;
    isLoading?: boolean;
}

export interface PatientFormData {
    // ID paziente (popolato dopo creazione/update)
    pazienteId?: string;

    // Anagrafica
    nome: string;
    cognome: string;
    codiceFiscale: string;
    sesso: 'MALE' | 'FEMALE' | '';
    dataNascita: string;
    comuneNascita: string;
    provinciaNascita: string;

    // Documento d'identità
    numeroCi?: string;
    tipoCi?: 'CI' | 'PASSAPORTO' | 'PATENTE' | 'PERMESSO_SOGGIORNO';

    // Soggetto vulnerabile (minore o non autonomo)
    isMinore?: boolean;
    isNonAutonomo?: boolean;
    tutelareTipo?: 'GENITORE' | 'TUTORE_LEGALE' | 'CURATORE';
    tutelareNome?: string;
    tutelareCognome?: string;
    tutelareCF?: string;

    // Consensi
    consensoGdpr?: boolean;
    consensoDatiSanitari?: boolean;
    consensoPrestazione?: boolean;

    // Residenza
    indirizzo: string;
    cap: string;
    comune: string;
    provincia: string;

    // Contatti
    telefono: string;
    email: string;

    // Appuntamento (editabile nella tab appuntamento)
    convenzioneId: string;
    prezzo: number;
    medicoId: string;
    prestazioneId: string;
    dataOraModificata?: string;         // Se l'utente modifica la data/ora dell'appuntamento
    prestazioneModificataId?: string;   // Se l'utente cambia la prestazione

    // Stato appuntamento (modificabile)
    stato: string;

    // P61: Note appuntamento
    note?: string;
    noteInterne?: string;
}

// ============================================
// CONSTANTS
// ============================================

const PROVINCE_ITALIANE = [
    'AG', 'AL', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AT', 'AV', 'BA', 'BG', 'BI', 'BL', 'BN', 'BO',
    'BR', 'BS', 'BT', 'BZ', 'CA', 'CB', 'CE', 'CH', 'CL', 'CN', 'CO', 'CR', 'CS', 'CT', 'CZ',
    'EN', 'FC', 'FE', 'FG', 'FI', 'FM', 'FR', 'GE', 'GO', 'GR', 'IM', 'IS', 'KR', 'LC', 'LE',
    'LI', 'LO', 'LT', 'LU', 'MB', 'MC', 'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NA', 'NO', 'NU',
    'OR', 'PA', 'PC', 'PD', 'PE', 'PG', 'PI', 'PN', 'PO', 'PR', 'PT', 'PU', 'PV', 'PZ', 'RA',
    'RC', 'RE', 'RG', 'RI', 'RM', 'RN', 'RO', 'SA', 'SI', 'SO', 'SP', 'SR', 'SS', 'SU', 'SV',
    'TA', 'TE', 'TN', 'TO', 'TP', 'TR', 'TS', 'TV', 'UD', 'VA', 'VB', 'VC', 'VE', 'VI', 'VR', 'VT', 'VV'
];

/**
 * Configurazione stati appuntamento con icone e stili eleganti
 */
const STATO_CONFIG: Record<string, {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bgColor: string;
    textColor: string;
    borderColor: string;
    description: string;
}> = {
    PRENOTATO: {
        label: 'Prenotato',
        icon: Calendar,
        bgColor: 'bg-blue-50 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
        borderColor: 'border-blue-200 dark:border-blue-700',
        description: 'Appuntamento prenotato, in attesa di conferma'
    },
    CONFERMATO: {
        label: 'Confermato',
        icon: CheckCircle,
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        borderColor: 'border-emerald-200 dark:border-emerald-700',
        description: 'Appuntamento confermato dal paziente'
    },
    IN_ATTESA: {
        label: 'In Attesa',
        icon: Clock,
        bgColor: 'bg-amber-50 dark:bg-amber-900/30',
        textColor: 'text-amber-700 dark:text-amber-300',
        borderColor: 'border-amber-200 dark:border-amber-700',
        description: 'Paziente arrivato, in attesa di essere chiamato'
    },
    IN_CORSO: {
        label: 'In Visita',
        icon: Play,
        bgColor: 'bg-purple-50 dark:bg-purple-900/30',
        textColor: 'text-purple-700 dark:text-purple-300',
        borderColor: 'border-purple-200 dark:border-purple-700',
        description: 'Visita in corso'
    },
    COMPLETATO: {
        label: 'Refertato',
        icon: UserCheck,
        bgColor: 'bg-green-50 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-300',
        borderColor: 'border-green-200 dark:border-green-700',
        description: 'Visita completata con referto'
    },
    FATTURATO: {
        label: 'Fatturato',
        icon: CheckCircle,
        bgColor: 'bg-teal-50 dark:bg-teal-900/30',
        textColor: 'text-teal-700 dark:text-teal-300',
        borderColor: 'border-teal-200 dark:border-teal-700',
        description: 'Visita fatturata e pagata'
    },
    ANNULLATO: {
        label: 'Annullato',
        icon: XCircle,
        bgColor: 'bg-red-50 dark:bg-red-900/30',
        textColor: 'text-red-700 dark:text-red-300',
        borderColor: 'border-red-200 dark:border-red-700',
        description: 'Appuntamento annullato'
    },
    NO_SHOW: {
        label: 'Non Presentato',
        icon: Ban,
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        textColor: 'text-gray-700 dark:text-gray-300',
        borderColor: 'border-gray-300 dark:border-gray-600',
        description: 'Paziente non si è presentato'
    },
    RINVIATO: {
        label: 'Rinviato',
        icon: RotateCcw,
        bgColor: 'bg-orange-50 dark:bg-orange-900/30',
        textColor: 'text-orange-700 dark:text-orange-300',
        borderColor: 'border-orange-200 dark:border-orange-700',
        description: 'Appuntamento rinviato a data successiva'
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse health card (tessera sanitaria) barcode/magnetic data
 * Format varies by region, but commonly contains CF
 */
const parseHealthCard = (cardData: string): Partial<PatientFormData> | null => {
    // Clean the input
    const cleaned = cardData.trim().toUpperCase();

    // Try to extract codice fiscale (16 alphanumeric chars)
    const cfMatch = cleaned.match(/[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/);

    if (cfMatch) {
        const cf = cfMatch[0];
        const gender = extractGenderFromTaxCode(cf);
        const birthDate = extractBirthDateFromTaxCode(cf);

        return {
            codiceFiscale: cf,
            sesso: gender === 'FEMALE' ? 'FEMALE' : gender === 'MALE' ? 'MALE' : '',
            dataNascita: birthDate ? birthDate.toISOString().split('T')[0] : ''
        };
    }

    return null;
};

/**
 * Calculate codice fiscale from personal data
 * This is a simplified version - full implementation requires comune codes database
 */
const calculateCodiceFiscale = (
    cognome: string,
    nome: string,
    dataNascita: string,
    sesso: 'MALE' | 'FEMALE',
    comuneNascita: string
): string => {
    // This is a placeholder - real implementation needs:
    // 1. Consonant/vowel extraction for cognome/nome
    // 2. Date encoding with month letter
    // 3. Comune code lookup (catastale)
    // 4. Control character calculation

    // For now, return empty to indicate manual entry is needed
    return '';
};

// ============================================
// SUB-COMPONENTS
// ============================================

/** Box "Firmato digitalmente" con download autenticato del PDF consenso */
const ConsensoFirmatoBox: React.FC<{
    appuntamentoId: string;
    firmatoPazienteNome: string | null | undefined;
    firmatoAt: string | null | undefined;
}> = ({ appuntamentoId, firmatoPazienteNome, firmatoAt }) => {
    const { showToast } = useToast();
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const blob = await apiDownload(`/api/v1/clinica/appuntamenti/${appuntamentoId}/consenso-pdf`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `consenso-firmato-${appuntamentoId.slice(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            showToast({ type: 'error', message: 'Impossibile scaricare il PDF del consenso' });
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <p className="text-xs font-semibold text-teal-700 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                Firmato digitalmente
                {firmatoPazienteNome && <span className="font-normal">da {firmatoPazienteNome}</span>}
                {firmatoAt && <span className="font-normal text-teal-500">· {new Date(firmatoAt).toLocaleString('it-IT')}</span>}
            </p>
            <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800 bg-white border border-teal-300 rounded px-2.5 py-1 hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {downloading
                    ? <><span className="h-3.5 w-3.5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" /> Scaricamento…</>
                    : <><Download className="h-3.5 w-3.5" /> Scarica PDF consenso firmato</>
                }
            </button>
        </div>
    );
};

// ============================================
// COMPONENT
// ============================================

export const AccettazionePazienteModal: React.FC<AccettazionePazienteModalProps> = ({
    appuntamento,
    isOpen,
    onClose,
    onConfirm,
    onVisita,
    isLoading = false
}) => {
    const { showToast } = useToast();
    const { getOperateHeaders } = useTenantMode();

    // ============================================
    // STATE: TABLET FISSO (link permanente per segretaria — stesso link per tutti i pazienti)
    // ============================================

    const [tabletKey, setTabletKey] = useState<string | null>(null);
    const [tabletKeyCopied, setTabletKeyCopied] = useState(false);
    const [tabletKeyLoading, setTabletKeyLoading] = useState(false);

    // Auto-carica il link tablet permanente all'apertura del modal
    useEffect(() => {
        if (!isOpen) return;
        if (tabletKey) return; // già caricato
        setTabletKeyLoading(true);
        apiGet<{ key: string; url: string }>(
            '/api/v1/clinica/tablet/key',
            {},
            { headers: getOperateHeaders() }
        )
            .then((res) => {
                setTabletKey(`${window.location.origin}/tablet?k=${res.key}`);
            })
            .catch(() => { /* silenzioso - il tablet link sarà disponibile al retry */ })
            .finally(() => setTabletKeyLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
    const queryClient = useQueryClient();

    // ============================================
    // STATE
    // ============================================

    const [formData, setFormData] = useState<PatientFormData>({
        nome: '',
        cognome: '',
        codiceFiscale: '',
        sesso: '',
        dataNascita: '',
        comuneNascita: '',
        provinciaNascita: '',
        numeroCi: '',
        tipoCi: 'CI',
        isMinore: false,
        isNonAutonomo: false,
        tutelareTipo: 'GENITORE',
        tutelareNome: '',
        tutelareCognome: '',
        tutelareCF: '',
        consensoGdpr: false,
        consensoDatiSanitari: false,
        consensoPrestazione: false,
        indirizzo: '',
        cap: '',
        comune: '',
        provincia: '',
        telefono: '',
        email: '',
        convenzioneId: '',
        prezzo: 0,
        medicoId: '',
        prestazioneId: '',
        stato: 'PRENOTATO',
        note: '',
        noteInterne: ''
    });

    const [cardInput, setCardInput] = useState('');
    const [cfValid, setCfValid] = useState<boolean | null>(null);
    const [cfCompatibility, setCfCompatibility] = useState<{
        isCompatible: boolean;
        surnameMatch: boolean;
        nameMatch: boolean;
        expectedSurnameCode: string;
        expectedNameCode: string;
        actualSurnameCode: string;
        actualNameCode: string;
    } | null>(null);
    const [activeTab, setActiveTab] = useState<'anagrafica' | 'residenza' | 'appuntamento' | 'fatturazione'>('anagrafica');
    const { hasBillingFeature } = useBillingAccess();
    // Appuntamento tab: inline editing per campo
    const [editingAppField, setEditingAppField] = useState<null | 'prestazione' | 'dataora'>(null);

    // CF search state
    const [cfSearchResult, setCfSearchResult] = useState<{
        found: boolean;
        isPazienteInTenant?: boolean;
        person?: {
            id: string;
            firstName: string;
            lastName: string;
            taxCode: string;
            email?: string;
            phone?: string;
            birthDate?: string;
            residenceAddress?: string;
            residenceCity?: string;
            postalCode?: string;
            province?: string;
            isFromOtherTenant: boolean;
            roles: string[];
        };
    } | null>(null);
    const [showConsentDialog, setShowConsentDialog] = useState(false);
    const [consentGiven, setConsentGiven] = useState(false);
    const [isSearchingCF, setIsSearchingCF] = useState(false);
    const [existingPersonId, setExistingPersonId] = useState<string | null>(null);
    const [isRegistraingPayment, setIsRegisteringPayment] = useState(false);

    // P52 Session #10: Warning per dati residenza/contatti incompleti
    const [showIncompleteDataWarning, setShowIncompleteDataWarning] = useState(false);
    const [incompleteDataConfirmed, setIncompleteDataConfirmed] = useState(false);

    // Consenso firma tablet
    const [consensoLink, setConsensoLink] = useState<{
        token: string | null;
        url: string | null;
        expiresAt: string | null;
        firmato: boolean;
        firmatoPazienteNome: string | null;
        firmatoAt: string | null;
        firmatoConsensi: string[];
        copied: boolean;
        documentiSelezionati: string[];
        showDocConfig: boolean;
        isGenerating: boolean;
    }>(() => {
        const nome = appuntamento.prestazione?.nome?.toLowerCase() ?? '';
        const docs: string[] = ['gdpr', 'sanitari'];
        if (nome.includes('chirurg') || nome.includes('intervento')) docs.push('chirurgico');
        else if (nome.includes('esame') || nome.includes('diagnostica')) docs.push('prestazione');
        return {
            token: null,
            url: null,
            expiresAt: null,
            firmato: false,
            firmatoPazienteNome: null,
            firmatoAt: null,
            firmatoConsensi: [],
            copied: false,
            documentiSelezionati: docs,
            showDocConfig: false,
            isGenerating: false,
        };
    });

    // Consensi validi da visite precedenti (cross-appointment, basati su validitaGiorni)
    const [validConsensiPerPaziente, setValidConsensiPerPaziente] = useState<Record<string, string>>({});
    // Consensi per cui si forza una nuova firma (override dei validConsensiPerPaziente)
    const [forzaNuovaFirmaSet, setForzaNuovaFirmaSet] = useState<Set<string>>(new Set());

    // visitaId locale: aggiornato al volo quando si apre il tab fatturazione
    // (l'appuntamento prop è statico e potrebbe non avere ancora visita.id al momento dell'apertura)
    const [localVisitaId, setLocalVisitaId] = useState<string | undefined>(appuntamento.visita?.id);

    // Tab navigation helpers
    const TABS_ORDER: Array<'anagrafica' | 'residenza' | 'appuntamento' | 'fatturazione'> = hasBillingFeature
        ? ['anagrafica', 'residenza', 'appuntamento', 'fatturazione']
        : ['anagrafica', 'residenza', 'appuntamento'];

    useEffect(() => {
        if (!hasBillingFeature && activeTab === 'fatturazione') {
            setActiveTab('appuntamento');
        }
    }, [activeTab, hasBillingFeature]);
    const currentTabIndex = TABS_ORDER.indexOf(activeTab);
    const isFirstTab = currentTabIndex === 0;
    const isLastTab = currentTabIndex === TABS_ORDER.length - 1;

    const handlePreviousTab = useCallback(() => {
        if (!isFirstTab) {
            setActiveTab(TABS_ORDER[currentTabIndex - 1]);
        }
    }, [currentTabIndex, isFirstTab]);

    const handleNextTab = useCallback(() => {
        if (!isLastTab) {
            setActiveTab(TABS_ORDER[currentTabIndex + 1]);
        }
    }, [currentTabIndex, isLastTab]);

    // ============================================
    // QUERIES
    // ============================================

    // Load available conventions
    const { data: convenzioniData } = useQuery({
        queryKey: ['convenzioni', 'active'],
        queryFn: () => convenzioniApi.getAll({ limit: 100 }),
        enabled: isOpen && activeTab === 'appuntamento'
    });

    // Load prestazioni for the prestazione selector in appuntamento tab
    const { data: prestazioniData } = useQuery({
        queryKey: ['prestazioni-accettazione'],
        queryFn: () => prestazioniApi.getAll({ limit: 200, isActive: true }),
        enabled: isOpen && activeTab === 'appuntamento',
        staleTime: 5 * 60_000
    });
    const prestazioniList = useMemo(() => {
        if (!prestazioniData?.data) return [];
        return prestazioniData.data as Array<{ id: string; nome: string; codice?: string; prezzoBase?: number | null }>;
    }, [prestazioniData?.data]);

    const convenzioni = useMemo(() => {
        if (!convenzioniData?.data) return [];
        return convenzioniData.data.filter(c => c.attiva !== false);
    }, [convenzioniData]);

    // Contesto pre-compilato per QuickFatturazioneTab
    // MDL: il cliente è l'azienda, sistemaTsDefault=0
    // Non-MDL: il cliente è il paziente, sistemaTsDefault=1 (detraibile)
    const fatturaContext = useMemo((): QuickFatturaContext => {
        const isMDL = !!appuntamento.tipoVisitaMDL;
        const cessionarioNome = [formData.nome, formData.cognome].filter(Boolean).join(' ');
        if (isMDL) {
            return {
                tipoServizio: 'VISITA_MDL',
                aziendaId: appuntamento.companyTenantProfileId || undefined,
                personaId: appuntamento.pazienteId,
                visitaId: localVisitaId,
                descrizioneDefault: `${appuntamento.prestazione?.nome || 'Visita MDL'} — ${appuntamento.tipoVisitaMDL}`,
                prezzoDefault: formData.prezzo,
                sistemaTsDefault: 0,
            };
        }
        // Visita ambulatoriale non-MDL: detraibile, cessionario = paziente
        return {
            tipoServizio: 'VISITA',
            personaId: appuntamento.pazienteId,
            visitaId: localVisitaId,
            descrizioneDefault: appuntamento.prestazione?.nome || 'Visita medica',
            prezzoDefault: formData.prezzo,
            sistemaTsDefault: 1,
            ...(cessionarioNome ? { cessionarioDenominazione: cessionarioNome } : {}),
            ...(formData.codiceFiscale ? { cessionarioCF: formData.codiceFiscale } : {}),
            ...(formData.indirizzo ? { cessionarioIndirizzo: formData.indirizzo } : {}),
            ...(formData.cap ? { cessionarioCAP: formData.cap } : {}),
            ...(formData.comune ? { cessionarioCitta: formData.comune } : {}),
            ...(formData.provincia ? { cessionarioProvincia: formData.provincia } : {}),
        };
    }, [appuntamento, formData, localVisitaId]);

    // ============================================
    // EFFECTS
    // ============================================

    // Initialize form from appointment patient data
    useEffect(() => {
        if (isOpen && appuntamento) {
            const paziente = appuntamento.paziente;

            // Formatta la data di nascita se presente
            let formattedBirthDate = '';
            const birthDateValue = paziente?.dataNascita || paziente?.birthDate;
            if (birthDateValue) {
                try {
                    const date = new Date(birthDateValue);
                    formattedBirthDate = date.toISOString().split('T')[0];
                } catch {
                    formattedBirthDate = '';
                }
            }

            setFormData({
                nome: paziente?.nome || paziente?.firstName || '',
                cognome: paziente?.cognome || paziente?.lastName || '',
                codiceFiscale: paziente?.codiceFiscale || paziente?.taxCode || '',
                sesso: paziente?.gender || paziente?.sesso || '',
                dataNascita: formattedBirthDate,
                comuneNascita: paziente?.birthPlace || paziente?.comuneNascita || '',
                provinciaNascita: paziente?.birthProvince || paziente?.provinciaNascita || '',
                indirizzo: paziente?.residenceAddress || paziente?.indirizzo || '',
                cap: paziente?.postalCode || paziente?.cap || '',
                comune: paziente?.residenceCity || paziente?.comune || '',
                provincia: paziente?.province || paziente?.provincia || '',
                telefono: paziente?.telefono || paziente?.phone || '',
                email: paziente?.email || '',
                convenzioneId: appuntamento.convenzioneId || '',
                prezzo: appuntamento.prestazione?.prezzoBase || 0,
                medicoId: appuntamento.medicoId || '',
                prestazioneId: appuntamento.prestazioneId || '',
                // Accettazione modal: auto-imposta "IN_ATTESA" per stati pre-accettazione
                // Il paziente viene accettato, quindi lo stato target è IN_ATTESA
                // Se l'utente cambia manualmente, la scelta viene rispettata (Session 10 fix)
                stato: (['PRENOTATO', 'CONFERMATO'].includes(appuntamento.stato))
                    ? 'IN_ATTESA'
                    : (appuntamento.stato || 'IN_ATTESA'),
                // P61: Note appuntamento
                note: appuntamento.note || '',
                noteInterne: appuntamento.noteInterne || ''
            });

            // Validate existing CF and extract data if not already present
            const cf = paziente?.codiceFiscale || paziente?.taxCode || '';
            if (cf && isValidTaxCode(cf)) {
                setCfValid(true);
                // Solo estrai dal CF se i campi non sono già popolati dal backend
                const gender = paziente?.gender || extractGenderFromTaxCode(cf);
                const birthDate = formattedBirthDate || (extractBirthDateFromTaxCode(cf)?.toISOString().split('T')[0] || '');
                setFormData(prev => ({
                    ...prev,
                    sesso: gender === 'FEMALE' ? 'FEMALE' : gender === 'MALE' ? 'MALE' : prev.sesso,
                    dataNascita: birthDate || prev.dataNascita
                }));
            }
        }
    }, [isOpen, appuntamento]);

    // Re-check CF compatibility when nome/cognome change
    useEffect(() => {
        if (formData.codiceFiscale && formData.codiceFiscale.length === 16 && cfValid) {
            const compatibility = checkTaxCodeCompatibility(
                formData.nome,
                formData.cognome,
                formData.codiceFiscale
            );
            setCfCompatibility(compatibility);
        }
    }, [formData.nome, formData.cognome, formData.codiceFiscale, cfValid]);

    // Fetch existing consent status when modal opens (so state survives close/reopen)
    useEffect(() => {
        if (!isOpen || !appuntamento?.id) return;
        apiGet<{
            firmato: boolean;
            firmatoAt?: string;
            firmatoConsensi?: string[];
            firmatoPazienteNome?: string;
            tokenAttivo?: boolean;
            validConsensiPerPaziente?: Record<string, string>;
            moduliApplicabili?: string[];
        }>(`/api/v1/clinica/appuntamenti/${appuntamento.id}/consenso-status`, {}, { headers: getOperateHeaders() })
            .then((status) => {
                if (status?.firmato) {
                    setConsensoLink(prev => ({
                        ...prev,
                        firmato: true,
                        firmatoAt: status.firmatoAt ?? null,
                        firmatoConsensi: status.firmatoConsensi ?? [],
                        firmatoPazienteNome: status.firmatoPazienteNome ?? null,
                    }));
                    const consensi = status.firmatoConsensi ?? [];
                    if (consensi.includes('gdpr')) setFormData(prev => ({ ...prev, consensoGdpr: true }));
                    if (consensi.includes('sanitari')) setFormData(prev => ({ ...prev, consensoDatiSanitari: true }));
                    if (consensi.includes('prestazione')) setFormData(prev => ({ ...prev, consensoPrestazione: true }));
                }
                // Consensi validi (da questo appuntamento o da visite precedenti)
                if (status?.validConsensiPerPaziente && Object.keys(status.validConsensiPerPaziente).length > 0) {
                    setValidConsensiPerPaziente(status.validConsensiPerPaziente);
                    // Auto-check consent checkboxes for valid consents
                    const vk = Object.keys(status.validConsensiPerPaziente);
                    if (vk.includes('gdpr')) setFormData(prev => ({ ...prev, consensoGdpr: true }));
                    if (vk.includes('sanitari')) setFormData(prev => ({ ...prev, consensoDatiSanitari: true }));
                    if (vk.includes('prestazione')) setFormData(prev => ({ ...prev, consensoPrestazione: true }));

                    // Filtra documentiSelezionati per escludere consensi già validi
                    // (così il tablet non li ripresenta al paziente)
                    const alreadyValid = new Set(vk);
                    setConsensoLink(prev => {
                        const filtered = prev.documentiSelezionati.filter(c => !alreadyValid.has(c));
                        return { ...prev, documentiSelezionati: filtered.length > 0 ? filtered : prev.documentiSelezionati };
                    });
                }
                // Aggiorna documentiSelezionati in base ai moduli applicabili configurati
                if (status?.moduliApplicabili && status.moduliApplicabili.length > 0) {
                    const alreadyValid = new Set(Object.keys(status.validConsensiPerPaziente ?? {}));
                    const docsNecessari = status.moduliApplicabili.filter(c => !alreadyValid.has(c));
                    if (docsNecessari.length > 0) {
                        setConsensoLink(prev => ({ ...prev, documentiSelezionati: docsNecessari }));
                    }
                }
            })
            .catch(() => { /* silenzioso */ });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, appuntamento?.id]);

    // Aggiorna visitaId locale quando si apre il tab fatturazione
    // (la visita viene creata durante l'accettazione, ma il prop è statico)
    useEffect(() => {
        if (activeTab !== 'fatturazione' || !appuntamento?.id) return;
        if (localVisitaId) return; // già disponibile
        apiGet<{ data: { visita?: { id: string } } }>(
            `/api/v1/clinica/appuntamenti/${appuntamento.id}`,
            {},
            { headers: getOperateHeaders() }
        ).then(res => {
            const vid = res?.data?.visita?.id;
            if (vid) setLocalVisitaId(vid);
        }).catch(() => { /* silenzioso */ });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, appuntamento?.id]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleInputChange = useCallback((field: keyof PatientFormData, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    /**
     * Handler per selezione comune nascita da autocomplete
     */
    const handleComuneNascitaSelect = useCallback((comune: ComuneItaliano | null) => {
        if (comune) {
            setFormData(prev => ({
                ...prev,
                comuneNascita: comune.nome,
                provinciaNascita: comune.provincia
            }));
        }
    }, []);

    /**
     * Handler per selezione comune di residenza da autocomplete
     * Auto-compila provincia e CAP (generico del capoluogo, modificabile dall'utente)
     */
    const handleComuneResidenzaSelect = useCallback((comune: ComuneItaliano | null) => {
        if (comune) {
            const cap = getCapByProvincia(comune.provincia);
            setFormData(prev => ({
                ...prev,
                comune: comune.nome,
                provincia: comune.provincia,
                ...(cap && !prev.cap ? { cap } : {})
            }));
        }
    }, []);

    /**
     * Handler per generazione automatica CF
     * Richiede: cognome, nome, sesso, data nascita, comune nascita
     */
    const handleGenerateCF = useCallback(() => {
        const { cognome, nome, sesso, dataNascita, comuneNascita } = formData;

        if (!cognome || !nome || !sesso || !dataNascita || !comuneNascita) {
            const missing = [];
            if (!cognome) missing.push('cognome');
            if (!nome) missing.push('nome');
            if (!sesso) missing.push('sesso');
            if (!dataNascita) missing.push('data di nascita');
            if (!comuneNascita) missing.push('comune di nascita');

            showToast({
                message: `Compila tutti i campi: ${missing.join(', ')}`,
                type: 'warning'
            });
            return;
        }

        const generated = generateTaxCode(cognome, nome, dataNascita, sesso as 'MALE' | 'FEMALE', comuneNascita);

        if (generated) {
            setFormData(prev => ({ ...prev, codiceFiscale: generated }));
            setCfValid(true);
            setCfCompatibility({
                isCompatible: true,
                surnameMatch: true,
                nameMatch: true,
                expectedSurnameCode: generated.substring(0, 3),
                expectedNameCode: generated.substring(3, 6),
                actualSurnameCode: generated.substring(0, 3),
                actualNameCode: generated.substring(3, 6)
            });
            showToast({ message: 'Codice fiscale generato correttamente', type: 'success' });
        } else {
            showToast({
                message: 'Impossibile generare il codice fiscale. Verifica il comune di nascita.',
                type: 'error'
            });
        }
    }, [formData, showToast]);

    /**
     * Verifica se è possibile generare il CF (tutti i campi necessari compilati)
     * P52 Session #11: Mostra anche se CF presente ma non compatibile con nome/cognome
     */
    const canGenerateCF = useMemo(() => {
        const { cognome, nome, sesso, dataNascita, comuneNascita, codiceFiscale } = formData;
        const hasRequiredFields = !!(cognome && nome && sesso && dataNascita && comuneNascita);

        // Mostra pulsante se: 
        // 1. Non c'è CF
        // 2. Oppure c'è CF ma non è compatibile con nome/cognome
        const shouldShowGenerateButton = !codiceFiscale ||
            (cfCompatibility && !cfCompatibility.isCompatible);

        return hasRequiredFields && shouldShowGenerateButton;
    }, [formData, cfCompatibility]);

    const handleCodiceFiscaleChange = useCallback(async (value: string) => {
        const cf = value.toUpperCase().slice(0, 16);
        setFormData(prev => ({ ...prev, codiceFiscale: cf }));

        // Reset search state
        setCfSearchResult(null);
        setShowConsentDialog(false);
        setConsentGiven(false);
        setExistingPersonId(null);

        if (cf.length === 16) {
            const valid = isValidTaxCode(cf);
            setCfValid(valid);

            if (valid) {
                // Extract data from CF
                const gender = extractGenderFromTaxCode(cf);
                const birthDate = extractBirthDateFromTaxCode(cf);
                const birthPlace = extractBirthPlaceFromTaxCode(cf);

                // Format birthDate as YYYY-MM-DD using UTC to avoid timezone issues
                let birthDateStr = '';
                if (birthDate) {
                    const year = birthDate.getUTCFullYear();
                    const month = String(birthDate.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(birthDate.getUTCDate()).padStart(2, '0');
                    birthDateStr = `${year}-${month}-${day}`;
                }

                setFormData(prev => ({
                    ...prev,
                    codiceFiscale: cf,
                    sesso: gender === 'FEMALE' ? 'FEMALE' : gender === 'MALE' ? 'MALE' : prev.sesso,
                    dataNascita: birthDateStr || prev.dataNascita,
                    // Popola comune e provincia se trovati nel dataset
                    comuneNascita: birthPlace?.comune || prev.comuneNascita,
                    provinciaNascita: birthPlace?.provincia || prev.provinciaNascita
                }));

                // Check compatibility with nome/cognome
                const compatibility = checkTaxCodeCompatibility(
                    formData.nome,
                    formData.cognome,
                    cf
                );
                setCfCompatibility(compatibility);

                // Search in backend for existing person
                setIsSearchingCF(true);
                try {
                    const searchResult = await pazientiApi.searchByTaxCode(cf);
                    setCfSearchResult(searchResult);

                    if (searchResult.found && searchResult.person) {
                        setExistingPersonId(searchResult.person.id);

                        if (searchResult.person.isFromOtherTenant) {
                            // Persona trovata in altro tenant - mostra dialog consent
                            setShowConsentDialog(true);
                            showToast({
                                message: `Persona trovata in altra struttura: ${searchResult.person.firstName} ${searchResult.person.lastName}. Richiesto consenso per importare i dati.`,
                                type: 'info',
                                duration: 5000
                            });
                        } else {
                            // Persona già nel tenant corrente - pre-popola dati
                            setFormData(prev => ({
                                ...prev,
                                nome: searchResult.person!.firstName || prev.nome,
                                cognome: searchResult.person!.lastName || prev.cognome,
                                email: searchResult.person!.email || prev.email,
                                telefono: searchResult.person!.phone || prev.telefono,
                                indirizzo: searchResult.person!.residenceAddress || prev.indirizzo,
                                comune: searchResult.person!.residenceCity || prev.comune,
                                cap: searchResult.person!.postalCode || prev.cap,
                                provincia: searchResult.person!.province || prev.provincia,
                                dataNascita: searchResult.person!.birthDate
                                    ? new Date(searchResult.person!.birthDate).toISOString().split('T')[0]
                                    : prev.dataNascita
                            }));
                            showToast({
                                message: `Paziente trovato: ${searchResult.person.firstName} ${searchResult.person.lastName}. Dati pre-compilati.`,
                                type: 'success'
                            });
                        }
                    } else {
                        // Persona non trovata - nuovo paziente
                        let message = 'Dati estratti dal codice fiscale';
                        if (birthPlace) {
                            message += `. Comune: ${birthPlace.comune} (${birthPlace.provincia})`;
                        } else {
                            const birthPlaceCode = cf.substring(11, 15);
                            message += `. Codice comune: ${birthPlaceCode} (non trovato nel database)`;
                        }
                        if (!compatibility.isCompatible && formData.nome && formData.cognome) {
                            message += '. ⚠️ Nome/cognome non compatibili con CF';
                        }
                        showToast({
                            message,
                            type: compatibility.isCompatible || !formData.nome ? 'success' : 'warning'
                        });
                    }
                } catch (error) {
                    // Continue without search result - just extract data from CF
                    let message = 'Dati estratti dal codice fiscale';
                    if (birthPlace) {
                        message += `. Comune: ${birthPlace.comune} (${birthPlace.provincia})`;
                    }
                    showToast({ message, type: 'success' });
                } finally {
                    setIsSearchingCF(false);
                }
            }
        } else {
            setCfValid(null);
            setCfCompatibility(null);
        }
    }, [formData.nome, formData.cognome, showToast]);

    const handleCardScan = useCallback(() => {
        if (!cardInput.trim()) {
            showToast({ message: 'Inserisci o scansiona i dati della tessera', type: 'warning' });
            return;
        }

        const parsed = parseHealthCard(cardInput);

        if (parsed) {
            setFormData(prev => ({
                ...prev,
                ...parsed
            }));
            setCfValid(true);
            setCardInput('');
            showToast({ message: 'Dati tessera sanitaria letti correttamente', type: 'success' });
        } else {
            showToast({ message: 'Impossibile leggere i dati dalla tessera', type: 'error' });
        }
    }, [cardInput, showToast]);

    /**
     * Handler per conferma consenso importazione dati da altro tenant
     */
    const handleConsentConfirm = useCallback(() => {
        if (cfSearchResult?.person) {
            // Pre-popola dati dal risultato della ricerca
            setFormData(prev => ({
                ...prev,
                nome: cfSearchResult.person!.firstName || prev.nome,
                cognome: cfSearchResult.person!.lastName || prev.cognome,
                email: cfSearchResult.person!.email || prev.email,
                telefono: cfSearchResult.person!.phone || prev.telefono,
                indirizzo: cfSearchResult.person!.residenceAddress || prev.indirizzo,
                comune: cfSearchResult.person!.residenceCity || prev.comune,
                cap: cfSearchResult.person!.postalCode || prev.cap,
                provincia: cfSearchResult.person!.province || prev.provincia,
                dataNascita: cfSearchResult.person!.birthDate
                    ? new Date(cfSearchResult.person!.birthDate).toISOString().split('T')[0]
                    : prev.dataNascita
            }));
            setConsentGiven(true);
            setShowConsentDialog(false);
            showToast({
                message: `Dati importati da ${cfSearchResult.person.firstName} ${cfSearchResult.person.lastName}`,
                type: 'success'
            });
        }
    }, [cfSearchResult, showToast]);

    /**
     * Handler per rifiuto consenso - usa comunque i dati del CF senza importare
     */
    const handleConsentReject = useCallback(() => {
        setShowConsentDialog(false);
        setConsentGiven(false);
        showToast({
            message: 'Dati non importati. Compila manualmente i campi richiesti.',
            type: 'info'
        });
    }, [showToast]);

    /**
     * P52 Session #10: Handler per conferma accettazione con dati incompleti
     */
    const handleIncompleteDataConfirm = useCallback(() => {
        setIncompleteDataConfirmed(true);
        setShowIncompleteDataWarning(false);
    }, []);

    /**
     * P52 Session #10: Handler per annullare e tornare a compilare i dati
     */
    const handleIncompleteDataCancel = useCallback(() => {
        setShowIncompleteDataWarning(false);
        // Naviga al tab residenza per facilitare la compilazione
        setActiveTab('residenza');
    }, []);

    /**
     * Invia consensi al tablet: genera il token backend (il tablet permanente lo rileva via polling).
     * NON mostra una URL al singolo appuntamento — usa il link tablet permanente.
     */
    const handleInviaAlTablet = useCallback(async () => {
        // Filtra documentiSelezionati escludendo consensi già validi (a meno che forzati)
        const docsEffettivi = consensoLink.documentiSelezionati.filter(codice => {
            const isValid = !!validConsensiPerPaziente[codice];
            const isForced = forzaNuovaFirmaSet.has(codice);
            return !isValid || isForced;
        });
        if (docsEffettivi.length === 0) {
            showToast({ message: 'Tutti i consensi sono già validi. Non serve inviare al tablet.', type: 'info' });
            return;
        }

        setConsensoLink(prev => ({ ...prev, isGenerating: true }));
        try {
            const res = await apiPost<{ token: string; expiresAt: string }>(
                `/api/v1/clinica/appuntamenti/${appuntamento.id}/consenso-token`,
                { documentiDaMostrare: docsEffettivi },
                { headers: getOperateHeaders() }
            );
            setConsensoLink(prev => ({
                ...prev,
                token: res.token,
                url: null,  // Non mostriamo URL singolo — il tablet permanente rileva il token
                expiresAt: res.expiresAt,
                isGenerating: false,
            }));
            showToast({ message: 'Consensi inviati al tablet. In attesa della firma del paziente.', type: 'success' });
        } catch {
            showToast({ message: 'Impossibile inviare al tablet. Riprova.', type: 'error' });
            setConsensoLink(prev => ({ ...prev, isGenerating: false }));
        }
    }, [appuntamento.id, consensoLink.documentiSelezionati, validConsensiPerPaziente, forzaNuovaFirmaSet, showToast, getOperateHeaders]);

    // Polling stato firma (ogni 5s mentre token attivo e non firmato)
    useEffect(() => {
        if (!consensoLink.token || consensoLink.firmato) return;
        const interval = setInterval(async () => {
            try {
                const status = await apiGet<{
                    firmato: boolean;
                    firmatoAt?: string;
                    firmatoConsensi?: string[];
                    firmatoPazienteNome?: string;
                }>(`/api/v1/clinica/appuntamenti/${appuntamento.id}/consenso-status`, {}, { headers: getOperateHeaders() });
                if (status.firmato) {
                    setConsensoLink(prev => ({
                        ...prev,
                        firmato: true,
                        firmatoAt: status.firmatoAt ?? null,
                        firmatoConsensi: status.firmatoConsensi ?? [],
                        firmatoPazienteNome: status.firmatoPazienteNome ?? null,
                    }));
                    const consensi = status.firmatoConsensi ?? [];
                    if (consensi.includes('gdpr')) handleInputChange('consensoGdpr', true as unknown as string);
                    if (consensi.includes('sanitari')) handleInputChange('consensoDatiSanitari', true as unknown as string);
                    if (consensi.includes('prestazione')) handleInputChange('consensoPrestazione', true as unknown as string);
                    showToast({ message: `Consensi firmati da ${status.firmatoPazienteNome ?? 'paziente'}.`, type: 'success' });
                    clearInterval(interval);
                }
            } catch { /* silenzioso */ }
        }, 5000);
        return () => clearInterval(interval);
    }, [appuntamento.id, consensoLink.token, consensoLink.firmato, handleInputChange, showToast, getOperateHeaders]);

    const handleSubmit = useCallback(async () => {
        // Validate required fields
        if (!formData.cognome || !formData.nome) {
            showToast({ message: 'Nome e cognome sono obbligatori', type: 'error' });
            return;
        }

        if (!formData.codiceFiscale || !cfValid) {
            showToast({ message: 'Codice fiscale non valido', type: 'error' });
            return;
        }

        // Se persona da altro tenant e consenso non dato, chiedi conferma
        if (cfSearchResult?.person?.isFromOtherTenant && !consentGiven) {
            setShowConsentDialog(true);
            return;
        }

        // Avvisa se i consensi non sono stati acquisiti (non blocca, ma reindirizza al tab)
        if (!formData.consensoGdpr) {
            showToast({
                message: 'Attenzione: il consenso GDPR non è stato ancora acquisito. Raccoglierlo prima di procedere.',
                type: 'warning',
                duration: 6000
            });
            setActiveTab('anagrafica');
            return;
        }

        // P52 Session #10: Controllo dati residenza/contatti incompleti
        const isResidenceIncomplete = !formData.indirizzo || !formData.cap || !formData.comune || !formData.provincia;
        const isContactsIncomplete = !formData.telefono && !formData.email;

        if ((isResidenceIncomplete || isContactsIncomplete) && !incompleteDataConfirmed) {
            setShowIncompleteDataWarning(true);
            return;
        }

        try {
            // Usa l'ID paziente esistente se presente (per update invece di create)
            const existingPazienteId = existingPersonId || appuntamento.pazienteId;

            // Crea o aggiorna paziente nel backend
            const result = await pazientiApi.findOrCreate({
                // Passa ID esistente per update
                existingPersonId: existingPazienteId || undefined,
                firstName: formData.nome,
                lastName: formData.cognome,
                taxCode: formData.codiceFiscale,
                birthDate: formData.dataNascita || undefined,
                gender: formData.sesso as 'MALE' | 'FEMALE' | undefined,
                birthPlace: formData.comuneNascita || undefined,
                birthProvince: formData.provinciaNascita || undefined,
                email: formData.email || undefined,
                phone: formData.telefono || undefined,
                residenceAddress: formData.indirizzo || undefined,
                residenceCity: formData.comune || undefined,
                postalCode: formData.cap || undefined,
                province: formData.provincia || undefined
            });

            if (result.success) {
                // Toast gestito dal componente parent (CalendarioPage/AccettazionePage)
                // per evitare notifiche duplicate
                onConfirm({
                    ...formData,
                    pazienteId: result.data?.id
                });
            } else {
                showToast({
                    message: 'Errore nella registrazione paziente',
                    type: 'error'
                });
            }
        } catch (error) {
            showToast({
                message: 'Errore nella registrazione paziente. Riprova.',
                type: 'error'
            });
        }
    }, [formData, cfValid, cfSearchResult, consentGiven, incompleteDataConfirmed, existingPersonId, appuntamento.pazienteId, onConfirm, showToast]);

    /**
     * P52 Session #10: Effetto per richiamare handleSubmit dopo conferma dati incompleti
     */
    useEffect(() => {
        if (incompleteDataConfirmed) {
            handleSubmit();
        }
    }, [incompleteDataConfirmed, handleSubmit]);

    /**
     * Handler per registrare il pagamento dell'appuntamento
     * Cambia stato da COMPLETATO a FATTURATO o imposta flag pagamentoAnticipato
     */
    const handleRegistraPagamento = useCallback(async () => {
        if (!appuntamento?.id) return;

        setIsRegisteringPayment(true);
        try {
            await appuntamentiApi.registraPagamento(appuntamento.id);
            showToast({
                message: 'Pagamento registrato con successo',
                type: 'success'
            });
            // P52 Session #11: Invalida entrambe le cache per aggiornare calendario
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti-calendario'], refetchType: 'all' });
            onClose();
        } catch (error) {
            showToast({
                message: 'Errore nella registrazione del pagamento',
                type: 'error'
            });
        } finally {
            setIsRegisteringPayment(false);
        }
    }, [appuntamento?.id, queryClient, onClose, showToast]);

    // ============================================
    // RENDER
    // ============================================

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal — altezza fissa h-[90vh] con flex-col così i tab non spostano il layout */}
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-teal-900/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                            <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Accettazione Paziente</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {appuntamento.prestazione?.nome} - {new Date(appuntamento.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Health Card Reader */}
                <div className="shrink-0 px-6 py-3 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <input
                            type="text"
                            value={cardInput}
                            onChange={(e) => setCardInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCardScan()}
                            placeholder="Striscia o scansiona tessera sanitaria..."
                            className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCardScan}
                            className="border-blue-300 text-blue-600 hover:bg-blue-100"
                        >
                            <Scan className="h-4 w-4 mr-1" />
                            Leggi
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="shrink-0 flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('anagrafica')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'anagrafica'
                            ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/30'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        <User className="h-4 w-4 inline-block mr-2" />
                        Anagrafica
                        {(!formData.consensoGdpr || !formData.consensoDatiSanitari || !formData.consensoPrestazione) && (
                            <span
                                className="ml-2 inline-flex items-center justify-center w-2 h-2 rounded-full bg-amber-400"
                                title="Uno o più consensi non ancora acquisiti"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('residenza')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'residenza'
                            ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/30'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        <MapPin className="h-4 w-4 inline-block mr-2" />
                        Residenza e Contatti
                    </button>
                    <button
                        onClick={() => setActiveTab('appuntamento')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'appuntamento'
                            ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/30'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                    >
                        <Stethoscope className="h-4 w-4 inline-block mr-2" />
                        Appuntamento
                    </button>
                    {hasBillingFeature && (
                        <button
                            onClick={() => setActiveTab('fatturazione')}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'fatturazione'
                                ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/30'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <Euro className="h-4 w-4 inline-block mr-2" />
                            Fatturazione
                        </button>
                    )}
                </div>

                {/* Form Content — flex-1 garantisce altezza costante tra i tab */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'anagrafica' && (
                        <div className="space-y-4">
                            {/* Codice Fiscale */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Codice Fiscale *
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.codiceFiscale}
                                        onChange={(e) => handleCodiceFiscaleChange(e.target.value)}
                                        maxLength={16}
                                        placeholder="RSSMRA85M01H501Z"
                                        className={`w-full px-3 py-2 border rounded-lg uppercase font-mono dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${cfValid === true ? 'border-green-500 bg-green-50 dark:bg-green-900/30' :
                                            cfValid === false ? 'border-red-500 bg-red-50 dark:bg-red-900/30' :
                                                'border-gray-300 dark:border-gray-600'
                                            } focus:outline-none focus:ring-2 focus:ring-teal-500`}
                                    />
                                    {cfValid === true && (
                                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                                    )}
                                    {cfValid === false && (
                                        <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                                    )}
                                    {isSearchingCF && (
                                        <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin" />
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Inserisci il CF per estrarre automaticamente sesso e data di nascita
                                </p>

                                {/* Search result info */}
                                {cfSearchResult?.found && cfSearchResult.person && (
                                    <div className={`mt-2 p-3 rounded-lg border ${cfSearchResult.person.isFromOtherTenant
                                        ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700'
                                        : 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700'
                                        }`}>
                                        <div className="flex items-center gap-2">
                                            {cfSearchResult.person.isFromOtherTenant ? (
                                                <UserPlus className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            ) : (
                                                <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            )}
                                            <span className={`text-sm font-medium ${cfSearchResult.person.isFromOtherTenant ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'
                                                }`}>
                                                {cfSearchResult.person.isFromOtherTenant
                                                    ? 'Persona trovata in altra struttura'
                                                    : 'Paziente già registrato'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                            {cfSearchResult.person.firstName} {cfSearchResult.person.lastName}
                                        </p>
                                        {cfSearchResult.person.isFromOtherTenant && !consentGiven && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowConsentDialog(true)}
                                                className="mt-2 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                            >
                                                <Download className="h-3 w-3 mr-1" />
                                                Importa dati
                                            </Button>
                                        )}
                                        {consentGiven && (
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Dati importati
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Compatibility warning */}
                                {cfCompatibility && !cfCompatibility.isCompatible && formData.nome && formData.cognome && (
                                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-amber-700">
                                                <p className="font-medium">Nome/Cognome non corrispondono al CF</p>
                                                <p className="mt-1">
                                                    {!cfCompatibility.surnameMatch && (
                                                        <span className="block">
                                                            Cognome: atteso "{cfCompatibility.actualSurnameCode}",
                                                            calcolato "{cfCompatibility.expectedSurnameCode}"
                                                        </span>
                                                    )}
                                                    {!cfCompatibility.nameMatch && (
                                                        <span className="block">
                                                            Nome: atteso "{cfCompatibility.actualNameCode}",
                                                            calcolato "{cfCompatibility.expectedNameCode}"
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Nome e Cognome */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Cognome *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.cognome}
                                        onChange={(e) => handleInputChange('cognome', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-gray-100 ${cfCompatibility && !cfCompatibility.surnameMatch && formData.cognome
                                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
                                            : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nome *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nome}
                                        onChange={(e) => handleInputChange('nome', e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-gray-100 ${cfCompatibility && !cfCompatibility.nameMatch && formData.nome
                                            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30'
                                            : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                    />
                                </div>
                            </div>

                            {/* Sesso e Data Nascita */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Sesso
                                    </label>
                                    <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="sesso"
                                                value="MALE"
                                                checked={formData.sesso === 'MALE'}
                                                onChange={(e) => handleInputChange('sesso', e.target.value)}
                                                className="w-4 h-4 text-teal-600 border-gray-300 dark:border-gray-600 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Maschio</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="sesso"
                                                value="FEMALE"
                                                checked={formData.sesso === 'FEMALE'}
                                                onChange={(e) => handleInputChange('sesso', e.target.value)}
                                                className="w-4 h-4 text-teal-600 border-gray-300 dark:border-gray-600 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Femmina</span>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Data di Nascita
                                    </label>
                                    <DatePickerElegante
                                        value={formData.dataNascita}
                                        onChange={(date) => handleInputChange('dataNascita', date ? date.toISOString().split('T')[0] : '')}
                                        theme="teal"
                                    />
                                </div>
                            </div>

                            {/* Comune e Provincia Nascita */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <ComuneAutocomplete
                                        label="Comune di Nascita"
                                        value={formData.comuneNascita}
                                        onChange={(value) => handleInputChange('comuneNascita', value)}
                                        onSelect={handleComuneNascitaSelect}
                                        onProvinciaChange={(prov) => handleInputChange('provinciaNascita', prov)}
                                        provinciaValue={formData.provinciaNascita}
                                        showProvincia={true}
                                        placeholder="Cerca comune..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Provincia
                                    </label>
                                    <select
                                        value={formData.provinciaNascita}
                                        onChange={(e) => handleInputChange('provinciaNascita', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="">--</option>
                                        {PROVINCE_ITALIANE.map(prov => (
                                            <option key={prov} value={prov}>{prov}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Genera CF automatico */}
                            {canGenerateCF && (
                                <div className={`p-3 border rounded-lg ${cfCompatibility && !cfCompatibility.isCompatible
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-blue-50 border-blue-200'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wand2 className={`h-4 w-4 ${cfCompatibility && !cfCompatibility.isCompatible
                                                ? 'text-amber-600'
                                                : 'text-blue-600'
                                                }`} />
                                            <span className={`text-sm ${cfCompatibility && !cfCompatibility.isCompatible
                                                ? 'text-amber-700'
                                                : 'text-blue-700'
                                                }`}>
                                                {cfCompatibility && !cfCompatibility.isCompatible
                                                    ? 'Nome/cognome non corrispondono al CF - Vuoi rigenerarlo?'
                                                    : 'Tutti i dati per generare il CF sono compilati'
                                                }
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateCF}
                                            className={
                                                cfCompatibility && !cfCompatibility.isCompatible
                                                    ? 'border-amber-300 text-amber-600 hover:bg-amber-100'
                                                    : 'border-blue-300 text-blue-600 hover:bg-blue-100'
                                            }
                                        >
                                            <Calculator className="h-4 w-4 mr-1" />
                                            {cfCompatibility && !cfCompatibility.isCompatible ? 'Rigenera CF' : 'Genera CF'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ===== DOCUMENTO D'IDENTITÀ ===== */}
                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-teal-600" />
                                    Documento d'Identità
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Tipo Documento
                                        </label>
                                        <select
                                            value={formData.tipoCi || 'CI'}
                                            onChange={(e) => handleInputChange('tipoCi', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                        >
                                            <option value="CI">Carta d'Identità</option>
                                            <option value="PASSAPORTO">Passaporto</option>
                                            <option value="PATENTE">Patente</option>
                                            <option value="PERMESSO_SOGGIORNO">Permesso di Soggiorno</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Numero Documento
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.numeroCi || ''}
                                            onChange={(e) => handleInputChange('numeroCi', e.target.value.toUpperCase())}
                                            placeholder="Es: CA00000AA"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ===== SOGGETTO VULNERABILE (MINORE / NON AUTONOMO) ===== */}
                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-teal-600" />
                                    Soggetto Vulnerabile
                                </h4>
                                <div className="flex items-center gap-6 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.isMinore}
                                            onChange={(e) => handleInputChange('isMinore', e.target.checked as unknown as string)}
                                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-gray-700">Minore di età</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!!formData.isNonAutonomo}
                                            onChange={(e) => handleInputChange('isNonAutonomo', e.target.checked as unknown as string)}
                                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-gray-700">Non autosufficiente / Non autonomo</span>
                                    </label>
                                </div>
                                {(formData.isMinore || formData.isNonAutonomo) && (
                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                                        <p className="text-xs text-amber-700 font-medium">
                                            È richiesta la presenza del tutelante legale
                                        </p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Relazione</label>
                                                <select
                                                    value={formData.tutelareTipo || 'GENITORE'}
                                                    onChange={(e) => handleInputChange('tutelareTipo', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                >
                                                    <option value="GENITORE">Genitore</option>
                                                    <option value="TUTORE_LEGALE">Tutore Legale</option>
                                                    <option value="CURATORE">Curatore</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Cognome</label>
                                                <input
                                                    type="text"
                                                    value={formData.tutelareCognome || ''}
                                                    onChange={(e) => handleInputChange('tutelareCognome', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                                                <input
                                                    type="text"
                                                    value={formData.tutelareNome || ''}
                                                    onChange={(e) => handleInputChange('tutelareNome', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Codice Fiscale Tutelante</label>
                                            <input
                                                type="text"
                                                value={formData.tutelareCF || ''}
                                                onChange={(e) => handleInputChange('tutelareCF', e.target.value.toUpperCase())}
                                                placeholder="RSSMRA85M01H501Z"
                                                maxLength={16}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono uppercase"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ===== CONSENSI INFORMATIVI ===== */}
                            <div className="pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-teal-600" />
                                            Consensi Informativi
                                        </h4>
                                        {/* Badge stato consensi (da firma tablet o manuale) */}
                                        {consensoLink.firmato ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
                                                <CheckCircle className="h-3 w-3" />
                                                Firmato digitalmente
                                            </span>
                                        ) : (formData.consensoGdpr && formData.consensoDatiSanitari && formData.consensoPrestazione) ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
                                                <CheckCircle className="h-3 w-3" />
                                                Firmati
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                                <AlertCircle className="h-3 w-3" />
                                                {[formData.consensoGdpr, formData.consensoDatiSanitari, formData.consensoPrestazione].filter(Boolean).length}/3 acquisiti
                                            </span>
                                        )}
                                    </div>
                                    {/* Configura e invia al tablet */}
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setConsensoLink(prev => ({ ...prev, showDocConfig: !prev.showDocConfig }))}
                                            className="flex items-center gap-1 text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
                                            title="Configura documenti da mostrare"
                                        >
                                            <Settings className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleInviaAlTablet}
                                            disabled={consensoLink.isGenerating || consensoLink.firmato}
                                            className="flex items-center gap-1.5 text-xs border-teal-300 text-teal-700 hover:bg-teal-50"
                                            title={consensoLink.firmato ? 'Consensi già firmati per questo appuntamento' : 'Invia documenti al tablet per la firma'}
                                        >
                                            {consensoLink.isGenerating
                                                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Invio…</>
                                                : <><Tablet className="h-3.5 w-3.5" /> Invia al tablet</>}
                                        </Button>
                                    </div>
                                </div>

                                {/* Link tablet permanente — sempre visibile */}
                                <div className="mb-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tablet className="h-3.5 w-3.5 text-violet-600" />
                                        <p className="text-xs font-semibold text-violet-800">Link tablet permanente</p>
                                    </div>
                                    {tabletKeyLoading ? (
                                        <div className="flex items-center gap-1 text-xs text-violet-600 py-1">
                                            <RefreshCw className="h-3 w-3 animate-spin" /> Caricamento…
                                        </div>
                                    ) : tabletKey ? (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <p className="flex-1 text-xs font-mono text-violet-700 bg-white border border-violet-200 rounded px-2 py-1 truncate">
                                                    {tabletKey}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(tabletKey);
                                                        setTabletKeyCopied(true);
                                                        setTimeout(() => setTabletKeyCopied(false), 2500);
                                                    }}
                                                    className={`shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${tabletKeyCopied ? 'bg-green-50 border-green-300 text-green-700' : 'border-violet-300 text-violet-700 hover:bg-violet-100'}`}
                                                >
                                                    {tabletKeyCopied ? <><CheckCircle className="h-3 w-3" /> Copiato</> : <><Copy className="h-3 w-3" /> Copia</>}
                                                </button>
                                            </div>
                                            <p className="text-xs text-violet-500">
                                                Apri questo link sul tablet — si aggiorna automaticamente ad ogni paziente.
                                            </p>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Stato invio tablet — in attesa firma */}
                                {consensoLink.token && !consensoLink.firmato && (
                                    <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                                        <p className="text-xs text-teal-700 flex items-center gap-1.5">
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            Consensi inviati al tablet — in attesa della firma del paziente…
                                        </p>
                                    </div>
                                )}

                                {/* Config documenti da mostrare */}
                                {consensoLink.showDocConfig && (
                                    <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <p className="text-xs font-medium text-gray-600 mb-1">Documenti da mostrare sul tablet:</p>
                                        {appuntamento.prestazione?.nome && (
                                            <p className="text-xs text-teal-600 mb-2 flex items-center gap-1">
                                                <Stethoscope className="h-3 w-3 flex-shrink-0" />
                                                Pre-selezionati per: <span className="font-medium ml-0.5">{appuntamento.prestazione.nome}</span>
                                            </p>
                                        )}
                                        <div className="space-y-1">
                                            {[
                                                { id: 'gdpr', label: 'Consenso GDPR', obbligatorio: true },
                                                { id: 'sanitari', label: 'Consenso dati sanitari', obbligatorio: true },
                                                { id: 'prestazione', label: 'Consenso prestazione', obbligatorio: false },
                                                { id: 'chirurgico', label: 'Consenso intervento chirurgico', obbligatorio: false },
                                            ].map((doc) => (
                                                <label key={doc.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={consensoLink.documentiSelezionati.includes(doc.id)}
                                                        disabled={doc.obbligatorio}
                                                        onChange={(e) => {
                                                            setConsensoLink(prev => ({
                                                                ...prev,
                                                                documentiSelezionati: e.target.checked
                                                                    ? [...prev.documentiSelezionati, doc.id]
                                                                    : prev.documentiSelezionati.filter(d => d !== doc.id),
                                                            }));
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-gray-300 text-teal-600"
                                                    />
                                                    <span className={doc.obbligatorio ? 'text-gray-500' : 'text-gray-700'}>{doc.label}</span>
                                                    {doc.obbligatorio && <span className="text-red-400 text-xs">*</span>}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Firma ricevuta */}
                                {consensoLink.firmato && (
                                    <ConsensoFirmatoBox
                                        appuntamentoId={appuntamento.id}
                                        firmatoPazienteNome={consensoLink.firmatoPazienteNome}
                                        firmatoAt={consensoLink.firmatoAt}
                                    />
                                )}

                                {/* Consensi validi (questo appuntamento + visite precedenti) */}
                                {Object.keys(validConsensiPerPaziente).length > 0 && (
                                    <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                        <p className="text-xs font-medium text-emerald-700 mb-1.5 flex items-center gap-1.5">
                                            <CheckCircle className="h-3.5 w-3.5" /> Consensi già validi
                                        </p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(validConsensiPerPaziente).map(([codice, firmatoAt]) => {
                                                const nomi: Record<string, string> = {
                                                    gdpr: 'GDPR', sanitari: 'Dati sanitari',
                                                    prestazione: 'Prestazione', chirurgico: 'Chirurgico',
                                                };
                                                return (
                                                    <span key={codice} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800" title={`Firmato il ${new Date(firmatoAt).toLocaleDateString('it-IT')}`}>
                                                        <CheckCircle className="h-3 w-3" />
                                                        {nomi[codice] ?? codice}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-emerald-600 mt-1.5">
                                            Questi consensi non verranno ripresentati al paziente sul tablet.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {([
                                        { codice: 'gdpr', field: 'consensoGdpr' as const, label: 'Consenso trattamento dati personali', desc: 'Informativa privacy ai sensi del GDPR (Reg. UE 2016/679)' },
                                        { codice: 'sanitari', field: 'consensoDatiSanitari' as const, label: 'Consenso trattamento dati sanitari', desc: 'Dati relativi alla salute (ex art. 9 GDPR)' },
                                        { codice: 'prestazione', field: 'consensoPrestazione' as const, label: 'Consenso alla prestazione sanitaria', desc: 'Consenso informato al trattamento medico' },
                                    ] as const).map(({ codice, field, label, desc }) => {
                                        const isValid = !!validConsensiPerPaziente[codice] && !forzaNuovaFirmaSet.has(codice);
                                        return (
                                            <div key={codice} className={`flex items-start gap-3 p-2 rounded-lg ${isValid ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!formData[field]}
                                                    disabled={isValid}
                                                    onChange={(e) => handleInputChange(field, e.target.checked as unknown as string)}
                                                    className={`mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 ${isValid ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium ${isValid ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</p>
                                                    <p className="text-xs text-gray-500">{desc}</p>
                                                    {isValid && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                                                                <CheckCircle className="h-3 w-3" />
                                                                Già valido (firmato il {new Date(validConsensiPerPaziente[codice]).toLocaleDateString('it-IT')})
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setForzaNuovaFirmaSet(prev => new Set(prev).add(codice));
                                                                    // Re-include document in documentiSelezionati
                                                                    setConsensoLink(prev => ({
                                                                        ...prev,
                                                                        documentiSelezionati: prev.documentiSelezionati.includes(codice)
                                                                            ? prev.documentiSelezionati
                                                                            : [...prev.documentiSelezionati, codice],
                                                                    }));
                                                                }}
                                                                className="text-xs text-amber-600 hover:text-amber-800 font-medium underline underline-offset-2"
                                                            >
                                                                Forza nuova firma
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'residenza' && (
                        <div className="space-y-4">
                            {/* Indirizzo di Residenza - Campo testo libero */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Indirizzo di Residenza
                                </label>
                                <input
                                    type="text"
                                    value={formData.indirizzo}
                                    onChange={(e) => handleInputChange('indirizzo', e.target.value)}
                                    placeholder="Es: Via Roma 1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* Comune, CAP, Provincia */}
                            <div className="grid grid-cols-6 gap-4">
                                <div className="col-span-3">
                                    <ComuneAutocomplete
                                        label="Comune di Residenza"
                                        value={formData.comune}
                                        onChange={(value) => handleInputChange('comune', value)}
                                        onSelect={handleComuneResidenzaSelect}
                                        onProvinciaChange={(prov) => handleInputChange('provincia', prov)}
                                        provinciaValue={formData.provincia}
                                        showProvincia={false}
                                        placeholder="Cerca comune..."
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        CAP
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.cap}
                                        onChange={(e) => handleInputChange('cap', e.target.value.slice(0, 5))}
                                        maxLength={5}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Prov.
                                    </label>
                                    <select
                                        value={formData.provincia}
                                        onChange={(e) => handleInputChange('provincia', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="">--</option>
                                        {PROVINCE_ITALIANE.map(prov => (
                                            <option key={prov} value={prov}>{prov}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Contatti */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Phone className="h-4 w-4 inline-block mr-1" />
                                        Telefono / Cellulare
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.telefono}
                                        onChange={(e) => handleInputChange('telefono', e.target.value)}
                                        placeholder="+39 ..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Mail className="h-4 w-4 inline-block mr-1" />
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        placeholder="email@esempio.it"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'appuntamento' && (
                        <div className="space-y-4">
                            {/* Appointment Info — Prestazione e Data/Ora con inline edit */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                {/* Prestazione — inline edit */}
                                <div className="flex items-start gap-3">
                                    <Stethoscope className="h-5 w-5 text-teal-600 mt-1.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500 mb-1">Prestazione</p>
                                        {editingAppField === 'prestazione' ? (
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={formData.prestazioneModificataId ?? formData.prestazioneId}
                                                    onChange={(e) => handleInputChange('prestazioneModificataId', e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-teal-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm"
                                                    autoFocus
                                                >
                                                    <option value={appuntamento.prestazioneId || ''}>
                                                        {appuntamento.prestazione?.nome || 'Prestazione attuale'}
                                                    </option>
                                                    {prestazioniList
                                                        .filter(p => p.id !== appuntamento.prestazioneId)
                                                        .map(p => (
                                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                                        ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingAppField(null)}
                                                    className="px-2 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                                                >
                                                    ✓
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                <p className="font-medium text-sm text-gray-900">
                                                    {formData.prestazioneModificataId
                                                        ? prestazioniList.find(p => p.id === formData.prestazioneModificataId)?.nome
                                                        : appuntamento.prestazione?.nome || '—'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingAppField('prestazione')}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
                                                    title="Modifica prestazione"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-teal-600" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">Medico</p>
                                        <p className="font-medium">
                                            {appuntamento.medico
                                                ? `${getDoctorTitle(appuntamento.medico.taxCode || appuntamento.medico.codiceFiscale || null, appuntamento.medico.gender || null)} ${appuntamento.medico.cognome || appuntamento.medico.lastName || ''} ${appuntamento.medico.nome || appuntamento.medico.firstName || ''}`.trim()
                                                : 'Non assegnato'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Building2 className="h-5 w-5 text-teal-600" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500">Ambulatorio</p>
                                        <p className="font-medium">{appuntamento.ambulatorio?.nome || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Data e Ora — inline edit */}
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-teal-600 mt-1.5" />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500 mb-1">Data e Ora</p>
                                        {editingAppField === 'dataora' ? (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <DatePickerElegante
                                                        value={formData.dataOraModificata
                                                            ? formData.dataOraModificata.split('T')[0]
                                                            : appuntamento.dataOra?.split('T')[0] || ''}
                                                        onChange={(date) => {
                                                            const existing = formData.dataOraModificata || appuntamento.dataOra || '';
                                                            const timePart = existing.includes('T') ? existing.split('T')[1] : '09:00:00.000Z';
                                                            handleInputChange('dataOraModificata', date
                                                                ? `${date.toISOString().split('T')[0]}T${timePart}`
                                                                : '');
                                                        }}
                                                        theme="teal"
                                                    />
                                                    <input
                                                        type="time"
                                                        value={(() => {
                                                            const dt = formData.dataOraModificata || appuntamento.dataOra || '';
                                                            if (!dt) return '09:00';
                                                            try {
                                                                const d = new Date(dt);
                                                                return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                                            } catch { return '09:00'; }
                                                        })()}
                                                        onChange={(e) => {
                                                            const [hours, minutes] = e.target.value.split(':');
                                                            const baseDt = formData.dataOraModificata || appuntamento.dataOra || new Date().toISOString();
                                                            const d = new Date(baseDt);
                                                            d.setHours(Number(hours), Number(minutes), 0, 0);
                                                            handleInputChange('dataOraModificata', d.toISOString());
                                                        }}
                                                        className="px-3 py-2 border border-teal-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingAppField(null)}
                                                    className="px-3 py-1 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                                                >
                                                    ✓ Conferma
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group">
                                                <p className="font-medium text-sm text-gray-900">
                                                    {(() => {
                                                        const dt = formData.dataOraModificata || appuntamento.dataOra || '';
                                                        if (!dt) return '—';
                                                        try {
                                                            return new Date(dt).toLocaleString('it-IT', {
                                                                weekday: 'short', day: '2-digit', month: 'long',
                                                                year: 'numeric', hour: '2-digit', minute: '2-digit',
                                                            });
                                                        } catch { return dt; }
                                                    })()}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingAppField('dataora')}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
                                                    title="Modifica data e ora"
                                                >
                                                    <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Convenzione - editabile */}
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-teal-600" />
                                    <div className="flex-1">
                                        <label className="text-sm text-gray-500 block mb-1">Convenzione</label>
                                        <select
                                            value={formData.convenzioneId}
                                            onChange={(e) => handleInputChange('convenzioneId', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm"
                                        >
                                            <option value="">Nessuna convenzione (tariffa privata)</option>
                                            {convenzioni.map(conv => (
                                                <option key={conv.id} value={conv.id}>
                                                    {conv.nome} ({conv.tipo})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Prezzo - editabile */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Euro className="h-4 w-4 inline-block mr-1" />
                                        Prezzo Prestazione (€)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.prezzo}
                                        onChange={(e) => handleInputChange('prezzo', parseFloat(e.target.value) || 0)}
                                        min={0}
                                        step={0.01}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                    {appuntamento.convenzioneId && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Prezzo convenzionato applicabile
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Stato Appuntamento
                                    </label>
                                    {/* Elegant Status Selector with colored badges */}
                                    <div className="relative">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button
                                                    type="button"
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md
                                                        ${STATO_CONFIG[formData.stato]?.bgColor || 'bg-gray-50'}
                                                        ${STATO_CONFIG[formData.stato]?.borderColor || 'border-gray-200'}
                                                        hover:border-teal-400
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {(() => {
                                                            const config = STATO_CONFIG[formData.stato] || STATO_CONFIG.PRENOTATO;
                                                            const IconComponent = config.icon;
                                                            return (
                                                                <>
                                                                    <span className={`p-1.5 rounded-full ${config.bgColor} ring-2 ring-white shadow-sm`}>
                                                                        <IconComponent className={`h-4 w-4 ${config.textColor}`} />
                                                                    </span>
                                                                    <span className={`font-medium ${config.textColor}`}>
                                                                        {config.label}
                                                                    </span>
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[320px] p-2" align="start">
                                                <div className="grid gap-1">
                                                    {Object.entries(STATO_CONFIG).map(([value, config]) => {
                                                        const IconComponent = config.icon;
                                                        const isSelected = formData.stato === value;
                                                        return (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                onClick={() => handleInputChange('stato', value)}
                                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left
                                                                    ${isSelected
                                                                        ? `${config.bgColor} ${config.borderColor} border-2 shadow-sm`
                                                                        : 'hover:bg-gray-50 border-2 border-transparent'
                                                                    }
                                                                `}
                                                            >
                                                                <span className={`p-1.5 rounded-full ${config.bgColor} shadow-sm`}>
                                                                    <IconComponent className={`h-4 w-4 ${config.textColor}`} />
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`font-medium text-sm ${isSelected ? config.textColor : 'text-gray-700'}`}>
                                                                        {config.label}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 truncate">
                                                                        {config.description}
                                                                    </p>
                                                                </div>
                                                                {isSelected && (
                                                                    <CheckCircle className={`h-5 w-5 ${config.textColor} flex-shrink-0`} />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    {/* Stato description - more elegant */}
                                    <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-md ${STATO_CONFIG[formData.stato]?.bgColor || 'bg-gray-50'}`}>
                                        <Info className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                        <p className="text-xs text-gray-600">
                                            {STATO_CONFIG[formData.stato]?.description || ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* P61: Note e Note Interne */}
                            <div className="space-y-4 pt-4 border-t border-gray-200">
                                {/* Note Pubbliche */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <FileText className="h-4 w-4 inline-block mr-1" />
                                        Note Appuntamento
                                    </label>
                                    <textarea
                                        value={formData.note || ''}
                                        onChange={(e) => handleInputChange('note', e.target.value)}
                                        rows={2}
                                        placeholder="Note generali sull'appuntamento..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Visibili nel calendario e nel tooltip dell'appuntamento
                                    </p>
                                </div>

                                {/* Note Interne */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <MessageSquare className="h-4 w-4 inline-block mr-1 text-amber-600" />
                                        Note Interne (comunicazione medico-segreteria)
                                    </label>
                                    <textarea
                                        value={formData.noteInterne || ''}
                                        onChange={(e) => handleInputChange('noteInterne', e.target.value)}
                                        rows={2}
                                        placeholder="Note riservate per comunicazione interna..."
                                        className="w-full px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                                    />
                                    <p className="text-xs text-amber-600 mt-1">
                                        ⚠️ Visibili solo al personale interno (non al paziente)
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {hasBillingFeature && activeTab === 'fatturazione' && (
                        <QuickFatturazioneTab
                            context={fatturaContext}
                            compact={false}
                            autoCreateBozza
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        {/* Navigation buttons */}
                        <Button
                            variant="outline"
                            onClick={handlePreviousTab}
                            disabled={isFirstTab}
                            className="flex items-center gap-1"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Indietro
                        </Button>
                        <span className="text-sm text-gray-500 px-2">
                            {currentTabIndex + 1} / {TABS_ORDER.length}
                        </span>
                        <Button
                            variant="outline"
                            onClick={handleNextTab}
                            disabled={isLastTab}
                            className="flex items-center gap-1"
                        >
                            Avanti
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* P61: Rimosso pulsante Chiudi ridondante - c'è già la X in alto a dx */}

                        {/* Pulsante principale - cambia in base allo stato */}
                        {appuntamento.stato === 'IN_ATTESA' || appuntamento.stato === 'IN_CORSO' || appuntamento.stato === 'COMPLETATO' || appuntamento.stato === 'FATTURATO' ? (
                            <>
                                {/* Se già accettato, mostra "Modifica Accettazione" */}
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isLoading || !cfValid}
                                    variant="outline"
                                    className="border-teal-600 text-teal-600 hover:bg-teal-50"
                                >
                                    {isLoading ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Modifica Accettazione
                                </Button>
                                {/* Pulsante Registra Pagamento - solo per COMPLETATO (Refertato) */}
                                {appuntamento.stato === 'COMPLETATO' && (
                                    <Button
                                        onClick={handleRegistraPagamento}
                                        disabled={isRegistraingPayment}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isRegistraingPayment ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Banknote className="h-4 w-4 mr-2" />
                                        )}
                                        Registra Pagamento
                                    </Button>
                                )}
                            </>
                        ) : (
                            /* Stato PRENOTATO o CONFERMATO - mostra "Accetta Paziente" */
                            <Button
                                onClick={handleSubmit}
                                disabled={isLoading || !cfValid}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                                {isLoading ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Accetta Paziente
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* GDPR Consent Dialog for cross-tenant data import */}
            {showConsentDialog && cfSearchResult?.person && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
                            <div className="flex items-center gap-3">
                                <Shield className="h-6 w-6 text-amber-600" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Consenso Importazione Dati
                                </h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600">
                                È stata trovata una persona con questo codice fiscale registrata
                                in un'altra struttura:
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="font-medium text-gray-900">
                                    {cfSearchResult.person.firstName} {cfSearchResult.person.lastName}
                                </p>
                                <p className="text-sm text-gray-500">
                                    CF: {cfSearchResult.person.taxCode}
                                </p>
                                {cfSearchResult.person.roles.length > 0 && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Ruoli: {cfSearchResult.person.roles.join(', ')}
                                    </p>
                                )}
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                                <p className="font-medium mb-1">Informativa GDPR</p>
                                <p>
                                    I dati personali verranno importati e trattati in conformità
                                    al Regolamento UE 2016/679 (GDPR). Il consenso può essere
                                    revocato in qualsiasi momento.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
                            <Button
                                variant="outline"
                                onClick={handleConsentReject}
                            >
                                Non importare
                            </Button>
                            <Button
                                onClick={handleConsentConfirm}
                                className="bg-teal-600 hover:bg-teal-700 text-white"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Importa dati
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* P52 Session #10: Warning Dialog per dati residenza/contatti incompleti */}
            {showIncompleteDataWarning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-6 w-6 text-amber-600" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Dati Incompleti
                                </h3>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-gray-600">
                                Attenzione: alcuni dati del paziente non sono stati compilati:
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                {(!formData.indirizzo || !formData.cap || !formData.comune || !formData.provincia) && (
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <MapPin className="h-4 w-4" />
                                        <span className="text-sm font-medium">Indirizzo di residenza incompleto</span>
                                    </div>
                                )}
                                {!formData.telefono && !formData.email && (
                                    <div className="flex items-center gap-2 text-amber-700">
                                        <Phone className="h-4 w-4" />
                                        <span className="text-sm font-medium">Nessun contatto inserito (telefono o email)</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                                <p>
                                    Questi dati sono importanti per comunicazioni future e per
                                    la corretta fatturazione. Si consiglia di completarli.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t">
                            <Button
                                variant="outline"
                                onClick={handleIncompleteDataCancel}
                            >
                                Torna a compilare
                            </Button>
                            <Button
                                onClick={handleIncompleteDataConfirm}
                                className="bg-amber-600 hover:bg-amber-700 text-white"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Procedi comunque
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default AccettazionePazienteModal;
