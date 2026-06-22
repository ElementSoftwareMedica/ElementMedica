/**
 * MDLServicesCard - Card Unificata Medicina del Lavoro
 * 
 * Card che mostra in modo unificato:
 * - Nomine MC/RSPP con date inizio e scadenza
 * - DVR con data firma e scadenza
 * - Associazione con prestazioni e tariffario per fatturazione
 * 
 * Art. 38-40, 32, 28-29 D.Lgs 81/08
 * 
 * @module components/companies/MDLServicesCard
 * @project P58 - Company Details Enhancement
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Stethoscope,
    Shield,
    FileText,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ExternalLink,
    Plus,
    DollarSign,
    Building2,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    User,
    ClipboardCheck,
    MapPin,
    Edit,
    Trash2,
    Eye,
    X,
    Download,
    XCircle,
    UserPlus,
    History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../design-system/utils';
import { getMedicoTitle } from '../../utils/textFormatters';
import { QuickActionNominaModal, type NominaTipo } from './quick-actions/QuickActionNominaModal';
import { QuickActionDVRModal } from './quick-actions/QuickActionDVRModal';
import { QuickActionSopralluogoModal } from './quick-actions/QuickActionSopralluogoModal';
import TariffarioCompanyCard from './TariffarioCompanyCard';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '../../contexts/ConfirmDialogContext';
import { apiDelete, apiPost, apiUpload } from '../../services/api';
import { getToken } from '../../services/auth';
import { DatePickerElegante } from '../../components/ui/DatePickerElegante';
import { TimePickerElegante } from '../../components/ui/TimePickerElegante';
import ElegantSelect from '../ui/ElegantSelect';
import SigningWorkflowModal from '../schedules/components/DocumentManager/components/SigningWorkflowModal';
import type { SignaturePlacement } from '../schedules/components/DocumentManager/components/SigningWorkflowModal';
import {
    consulenzeMDLApi,
    usciteMCApi,
    tariffariAziendaliApi,
    ConsulenzaMDL,
    UscitaMC,
    MedicoDisponibileUscita,
    VoceUnaTantum,
    VoceTariffario,
    StatoConsulenzaMDL,
    STATO_CONSULENZA_LABELS,
    STATO_CONSULENZA_COLORS,
    CreateConsulenzaPayload
} from '../../services/tariffarioAziendaleApi';
import { nomineRuoloApi } from '../../services/clinicaApi';

// === Interfaces ===

interface PersonInfo {
    id: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    email?: string;
}

interface NominaInfo {
    id: string;
    tipoRuolo: 'MEDICO_COMPETENTE' | 'MEDICO_COMPETENTE_COORDINATO' | 'RSPP' | 'ASPP' | 'RLS' | 'PREPOSTO' | 'ADDETTO_PS' | 'ADDETTO_AI' | 'DIRIGENTE_SICUREZZA';
    stato: string;
    dataInizio?: string;
    dataFine?: string;
    dataScadenza?: string;
    persona?: PersonInfo;
    site?: { id: string; siteName?: string };
    // Tracking prestazioni/fatturazione
    prestazioneId?: string;
    prestazione?: {
        id: string;
        nome: string;
        prezzoBase: number;
    };
    tariffaApplicata?: number;
    dataUltimaFattura?: string;
}

interface DVRInfo {
    id: string;
    siteId: string;
    siteName?: string;
    dataEsecuzione: string;
    dataScadenza: string;
    effettuatoDa: string;
    rischiRilevati?: string;
    note?: string;
    // P59: Documento PDF
    documentoUrl?: string;
    documentoNome?: string;
    // Tracking prestazioni/fatturazione
    prestazioneId?: string;
    prestazione?: {
        id: string;
        nome: string;
        prezzoBase: number;
    };
    tariffaApplicata?: number;
    dataUltimaFattura?: string;
}

// P59: Interfaccia per Sopralluogo
interface SopralluogoInfo {
    id: string;
    siteId: string;
    dataEsecuzione: string;
    dataProssimoSopralluogo?: string;
    valutazione?: string;
    esito?: string;
    note?: string;
    // P59: Documento PDF
    documentoUrl?: string;
    documentoNome?: string;
    site?: {
        id: string;
        siteName: string;
        citta?: string;
        indirizzo?: string;
    };
    esecutore?: {
        id: string;
        firstName: string;
        lastName: string;
        gender?: string;
    };
    // Tracking prestazioni/fatturazione
    prestazioneId?: string;
    prestazione?: {
        id: string;
        nome: string;
        prezzoBase: number;
    };
    tariffaApplicata?: number;
    dataUltimaFattura?: string;
}

interface CompanySite {
    id: string;
    siteName: string;
    dvr?: string;
    medicoCompetenteId?: string;
    rsppId?: string;
}

// P59 Sprint 11.2: Interfaccia per Tariffario associato (via M2M)
interface TariffarioInfo {
    id: string;
    codice?: string;
    nome: string;
    descrizione?: string;
    validoDa?: string;
    validoA?: string | null;
    attivo: boolean;
    vociCount?: number;
    _count?: {
        voci?: number;
        companyAssociations?: number;
    };
    association?: {
        id: string;
        validoDa: string;
        validoA?: string | null;
        attivo: boolean;
        note?: string | null;
    };
}

interface MDLServicesCardProps {
    companyId: string;
    companyTenantProfileId?: string;
    companyName: string;
    tenantId?: string; // P59: TenantId per cross-tenant operations
    nomine?: NominaInfo[];
    sites?: CompanySite[];
    dvrs?: DVRInfo[];
    sopralluoghi?: SopralluogoInfo[]; // P59: Aggiunto sopralluoghi
    tariffario?: TariffarioInfo | null;
    successoreTariffario?: TariffarioInfo | null;
    storicoTariffari?: TariffarioInfo[];
    onActionComplete?: () => void;
}

// === Helper Functions ===

const isExpiringSoon = (dateStr?: string, days: number = 30): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return date <= futureDate && date > now;
};

const isExpired = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
};

const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
};

const getStatusBadge = (dateStr?: string) => {
    if (isExpired(dateStr)) {
        return {
            className: 'bg-red-100 text-red-700 border-red-200',
            label: 'Scaduto',
            icon: <AlertTriangle className="h-3 w-3" />
        };
    }
    if (isExpiringSoon(dateStr)) {
        return {
            className: 'bg-amber-100 text-amber-700 border-amber-200',
            label: 'In scadenza',
            icon: <Clock className="h-3 w-3" />
        };
    }
    return {
        className: 'bg-green-100 text-green-700 border-green-200',
        label: 'Attivo',
        icon: <CheckCircle2 className="h-3 w-3" />
    };
};

// P59: Helper per determinare il tipo di sopralluogo (MC o RSPP) dalla valutazione
const getSopralluogoTipo = (valutazione?: string): { tipo: 'MC' | 'RSPP' | 'ALTRO'; label: string; className: string; icon: 'stethoscope' | 'shield' | 'clipboard' } => {
    const val = (valutazione || '').toUpperCase();

    if (val.includes('MC') || val.includes('MEDICO')) {
        return {
            tipo: 'MC',
            label: 'Medico Competente',
            className: 'bg-teal-100 text-teal-700 border-teal-200',
            icon: 'stethoscope'
        };
    }
    if (val.includes('RSPP') || val.includes('SICUREZZA')) {
        return {
            tipo: 'RSPP',
            label: 'RSPP',
            className: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: 'shield'
        };
    }
    return {
        tipo: 'ALTRO',
        label: 'Sopralluogo',
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: 'clipboard'
    };
};

// P59: Helper per estrarre il tipo di sopralluogo (ORDINARIO, STRAORDINARIO, VERIFICA)
const getSopralluogoTipoVisita = (valutazione?: string): string | null => {
    const val = (valutazione || '').toUpperCase();
    if (val.includes('ORDINARIO')) return 'Ordinario';
    if (val.includes('STRAORDINARIO')) return 'Straordinario';
    if (val.includes('VERIFICA')) return 'Verifica';
    return null;
};

// P59 Sprint 11.3: Helper per determinare lo stato del sopralluogo
// Il campo esito può contenere stati nel formato: "STATO" o "STATO|prescrizioni note"
// Stati supportati: PROGRAMMATO, ESEGUITO, CONFORME, CON_PRESCRIZIONI, NON_CONFORME
const getSopralluogoStato = (dataEsecuzione: string, esito?: string): {
    stato: 'PROGRAMMATO' | 'ESEGUITO' | 'CONFORME' | 'CON_PRESCRIZIONI' | 'NON_CONFORME';
    label: string;
    className: string;
    icon: 'clock' | 'check' | 'check-circle' | 'alert-triangle' | 'x-circle';
    bgColor: string;
    prescrizioniNote?: string;
} => {
    const now = new Date();
    const execDate = new Date(dataEsecuzione);

    // Se c'è un esito salvato, usa quello
    if (esito && esito.trim() !== '') {
        const [statoValue, prescrizioniNote] = esito.split('|');
        const validStati = ['PROGRAMMATO', 'ESEGUITO', 'CONFORME', 'CON_PRESCRIZIONI', 'NON_CONFORME'];

        if (validStati.includes(statoValue)) {
            switch (statoValue) {
                case 'PROGRAMMATO':
                    return {
                        stato: 'PROGRAMMATO',
                        label: 'Da eseguire',
                        className: 'text-amber-700',
                        icon: 'clock',
                        bgColor: 'bg-amber-50 border-amber-200'
                    };
                case 'ESEGUITO':
                    return {
                        stato: 'ESEGUITO',
                        label: 'Eseguito',
                        className: 'text-blue-700',
                        icon: 'check',
                        bgColor: 'bg-blue-50 border-blue-200'
                    };
                case 'CONFORME':
                    return {
                        stato: 'CONFORME',
                        label: 'A posto',
                        className: 'text-green-700',
                        icon: 'check-circle',
                        bgColor: 'bg-green-50 border-green-200'
                    };
                case 'CON_PRESCRIZIONI':
                    return {
                        stato: 'CON_PRESCRIZIONI',
                        label: 'Con prescrizioni',
                        className: 'text-amber-700',
                        icon: 'alert-triangle',
                        bgColor: 'bg-amber-50 border-amber-200',
                        prescrizioniNote: prescrizioniNote || undefined
                    };
                case 'NON_CONFORME':
                    return {
                        stato: 'NON_CONFORME',
                        label: 'Non conforme',
                        className: 'text-red-700',
                        icon: 'x-circle',
                        bgColor: 'bg-red-50 border-red-200'
                    };
            }
        }
    }

    // Fallback: determina automaticamente dallo stato data
    // Se la data è nel futuro, è programmato
    if (execDate > now) {
        return {
            stato: 'PROGRAMMATO',
            label: 'Da eseguire',
            className: 'text-amber-700',
            icon: 'clock',
            bgColor: 'bg-amber-50 border-amber-200'
        };
    }

    // Data passata = eseguito (default se non c'è esito specifico)
    return {
        stato: 'ESEGUITO',
        label: 'Eseguito',
        className: 'text-blue-700',
        icon: 'check',
        bgColor: 'bg-blue-50 border-blue-200'
    };
};

// P59: Componente card per sopralluogo singolo (usato nel layout 2 colonne)
interface SopralluogoCardProps {
    sopralluogo: SopralluogoInfo;
    tipoInfo: ReturnType<typeof getSopralluogoTipo>;
    tipoVisita: string | null;
    statoInfo: ReturnType<typeof getSopralluogoStato>;
    onEdit: () => void;
    onDelete: () => void;
    onViewPdf?: () => void; // P59: Quick look PDF
    deletingId: string | null;
}

const SopralluogoCard: React.FC<SopralluogoCardProps> = ({
    sopralluogo,
    tipoInfo,
    tipoVisita,
    statoInfo,
    onEdit,
    onDelete,
    onViewPdf,
    deletingId
}) => (
    <div
        className={cn(
            "p-3 rounded-lg border transition-all dark:border-gray-700",
            statoInfo.bgColor,
            tipoInfo.tipo === 'MC' ? "border-l-4 border-l-teal-500 dark:border-l-teal-400" :
                tipoInfo.tipo === 'RSPP' ? "border-l-4 border-l-blue-500 dark:border-l-blue-400" : ""
        )}
    >
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
                {/* Header con stato */}
                <div className="flex items-center flex-wrap gap-1.5 mb-2">
                    <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold",
                        statoInfo.stato === 'PROGRAMMATO' ? "bg-amber-100 text-amber-800" :
                            statoInfo.stato === 'ESEGUITO' ? "bg-blue-100 text-blue-800" :
                                statoInfo.stato === 'CONFORME' ? "bg-green-100 text-green-800" :
                                    statoInfo.stato === 'CON_PRESCRIZIONI' ? "bg-amber-100 text-amber-800" :
                                        statoInfo.stato === 'NON_CONFORME' ? "bg-red-100 text-red-800" :
                                            "bg-green-100 text-green-800"
                    )}>
                        {statoInfo.icon === 'clock' && <Clock className="h-3 w-3 mr-1" />}
                        {statoInfo.icon === 'check' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {statoInfo.icon === 'check-circle' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {statoInfo.icon === 'alert-triangle' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {statoInfo.icon === 'x-circle' && <XCircle className="h-3 w-3 mr-1" />}
                        {statoInfo.label}
                    </span>
                    {tipoVisita && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                            {tipoVisita}
                        </span>
                    )}
                    {/* P59: Mostra note prescrizioni se presenti */}
                    {statoInfo.prescrizioniNote && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 max-w-[150px] truncate" title={statoInfo.prescrizioniNote}>
                            {statoInfo.prescrizioniNote}
                        </span>
                    )}
                </div>

                {/* P59: Layout 2 colonne per le informazioni */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {/* Colonna sinistra */}
                    <div className="space-y-1">
                        {/* Sede */}
                        <div className="flex items-center text-gray-700 dark:text-gray-300">
                            <MapPin className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
                            <span className="font-medium truncate">
                                {sopralluogo.site?.siteName || 'Sede'}
                            </span>
                        </div>

                        {/* Data Esecuzione */}
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500 dark:text-gray-400">Esec:</span>
                            <span className="font-medium text-gray-900 dark:text-gray-50">{formatDate(sopralluogo.dataEsecuzione)}</span>
                        </div>

                        {/* Esecutore */}
                        {sopralluogo.esecutore && (
                            <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-600 dark:text-gray-400 truncate">
                                    {sopralluogo.esecutore.lastName} {sopralluogo.esecutore.firstName}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Colonna destra */}
                    <div className="space-y-1">
                        {/* Prossimo Sopralluogo */}
                        {sopralluogo.dataProssimoSopralluogo && (
                            <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="text-gray-500 dark:text-gray-400">Prox:</span>
                                <span className={cn(
                                    "font-medium",
                                    isExpired(sopralluogo.dataProssimoSopralluogo) ? "text-red-600 dark:text-red-400" :
                                        isExpiringSoon(sopralluogo.dataProssimoSopralluogo) ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-50"
                                )}>
                                    {formatDate(sopralluogo.dataProssimoSopralluogo)}
                                </span>
                            </div>
                        )}

                        {/* Note (se presenti) */}
                        {sopralluogo.note && (
                            <div className="flex items-start gap-1">
                                <FileText className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-500 dark:text-gray-400 truncate" title={sopralluogo.note}>
                                    {sopralluogo.note.length > 30 ? `${sopralluogo.note.substring(0, 30)}...` : sopralluogo.note}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Pulsanti azione */}
            <div className="flex flex-col gap-0.5">
                {/* P59: Quick look PDF */}
                {sopralluogo.documentoUrl && onViewPdf && (
                    <button
                        onClick={onViewPdf}
                        className="p-1.5 rounded text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
                        title="Visualizza PDF"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </button>
                )}
                <button
                    onClick={onEdit}
                    className="p-1.5 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="Modifica"
                >
                    <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={onDelete}
                    disabled={deletingId === sopralluogo.id}
                    className="p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    title="Elimina"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    </div>
);

// === Main Component ===

const MDLServicesCard: React.FC<MDLServicesCardProps> = ({
    companyId,
    companyTenantProfileId,
    companyName,
    tenantId, // P59: TenantId per cross-tenant operations
    nomine = [],
    sites = [],
    dvrs = [],
    sopralluoghi = [], // P59: Aggiunto
    tariffario,
    successoreTariffario,
    storicoTariffari = [],
    onActionComplete
}) => {
    const { showToast } = useToast();
    const { confirm } = useConfirmDialog();

    // === P59: Persist expanded section across page refresh ===
    // sessionStorage key tied to companyId so each company has its own saved state
    const STORAGE_KEY = `mdl-expanded-section-${companyId}`;

    // Initialize from sessionStorage if available, otherwise default to 'nomine'
    const getInitialExpandedSection = (): 'nomine' | 'dvr' | 'sopralluoghi' | 'uscite_mc' | 'consulenze' | 'tariffario' | null => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved && ['nomine', 'dvr', 'sopralluoghi', 'uscite_mc', 'consulenze', 'tariffario', 'null'].includes(saved)) {
                return saved === 'null' ? null : saved as 'nomine' | 'dvr' | 'sopralluoghi' | 'uscite_mc' | 'consulenze' | 'tariffario';
            }
        } catch (e) {
            // sessionStorage not available
        }
        return 'nomine';
    };

    // P59: Use ref to persist expanded section across refetches but reset on remount
    // This way: auto-refresh keeps state, but leaving page and coming back resets to 'nomine'
    const expandedSectionRef = useRef<'nomine' | 'dvr' | 'sopralluoghi' | 'uscite_mc' | 'consulenze' | 'tariffario' | null>(getInitialExpandedSection());
    const [expandedSection, setExpandedSectionState] = useState<'nomine' | 'dvr' | 'sopralluoghi' | 'uscite_mc' | 'consulenze' | 'tariffario' | null>(getInitialExpandedSection);

    // Custom setter that also updates the ref AND sessionStorage
    const setExpandedSection = (value: 'nomine' | 'dvr' | 'sopralluoghi' | 'uscite_mc' | 'consulenze' | 'tariffario' | null) => {
        expandedSectionRef.current = value;
        setExpandedSectionState(value);
        // P59: Persist to sessionStorage for page refresh
        try {
            sessionStorage.setItem(STORAGE_KEY, value === null ? 'null' : value);
        } catch (e) {
            // sessionStorage not available
        }
    };

    // P59: Track last companyId to reset when navigating between companies
    const lastCompanyIdRef = useRef(companyId);

    useEffect(() => {
        // If companyId changed, reset to default and clear old sessionStorage
        if (lastCompanyIdRef.current !== companyId) {
            // Clear old company's storage
            try {
                sessionStorage.removeItem(`mdl-expanded-section-${lastCompanyIdRef.current}`);
            } catch (e) {
                // sessionStorage not available
            }
            setExpandedSection('nomine');
            lastCompanyIdRef.current = companyId;
        }
    }, [companyId]);

    const [showNominaModal, setShowNominaModal] = useState<NominaTipo | null>(null);
    const [editingNominaId, setEditingNominaId] = useState<string | null>(null); // P59: Per modificare nomine esistenti
    const [successorOfNomina, setSuccessorOfNomina] = useState<NominaInfo | null>(null); // Per nomina successore
    const [showStoricoMC, setShowStoricoMC] = useState(false);
    const [showStoricoRSPP, setShowStoricoRSPP] = useState(false);
    const [showDVRModal, setShowDVRModal] = useState(false);
    const [showSopralluogoModal, setShowSopralluogoModal] = useState(false);
    const [editingDVRId, setEditingDVRId] = useState<string | null>(null);
    const [editingSopralluogoId, setEditingSopralluogoId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    // P59: State per PDF preview quick look
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfPreviewName, setPdfPreviewName] = useState<string | null>(null);
    const [pdfPreviewApiUrl, setPdfPreviewApiUrl] = useState<string | null>(null);
    const [mdlDocumentModal, setMdlDocumentModal] = useState<'nomine' | 'tariffario' | null>(null);
    const [mdlDocumentSigning, setMdlDocumentSigning] = useState<'nomine' | 'tariffario' | null>(null);
    const [mdlDocumentFile, setMdlDocumentFile] = useState<File | null>(null);
    const [mdlDocumentSaving, setMdlDocumentSaving] = useState(false);

    // Carica un PDF protetto via API e apre il preview con blob URL
    const openPdfPreview = async (apiUrl: string, name: string) => {
        try {
            const token = getToken();
            const headers: Record<string, string> = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            if (tenantId) headers['X-Operate-Tenant-Id'] = tenantId;
            const response = await fetch(apiUrl, { headers });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                // Se 404, il DVR potrebbe essere stato eliminato o il file non esiste più — refresh dati
                if (response.status === 404) {
                    onActionComplete?.();
                    showToast({ type: 'error', message: errorData?.error || 'Documento non trovato. I dati sono stati aggiornati.' });
                } else {
                    showToast({ type: 'error', message: errorData?.error || 'Impossibile caricare il documento' });
                }
                return;
            }
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            setPdfPreviewUrl(blobUrl);
            setPdfPreviewName(name);
            setPdfPreviewApiUrl(apiUrl);
        } catch {
            showToast({ type: 'error', message: 'Errore durante il caricamento del documento' });
        }
    };

    // Open PDF in a new tab by fetching via API and creating a fresh blob
    const openPdfInNewTab = async () => {
        if (!pdfPreviewApiUrl) return;
        try {
            const token = getToken();
            const headers: Record<string, string> = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            if (tenantId) headers['X-Operate-Tenant-Id'] = tenantId;
            const response = await fetch(pdfPreviewApiUrl, { headers });
            if (!response.ok) {
                showToast({ type: 'error', message: 'Impossibile aprire il documento' });
                return;
            }
            const blob = await response.blob();
            const newBlobUrl = URL.createObjectURL(blob);
            const newWindow = window.open(newBlobUrl, '_blank');
            // Revoke after a short delay to allow the new tab to load
            if (newWindow) {
                setTimeout(() => URL.revokeObjectURL(newBlobUrl), 60000);
            }
        } catch {
            showToast({ type: 'error', message: 'Errore durante l\'apertura del documento' });
        }
    };

    const downloadProtectedPdf = async (apiUrl: string, name: string) => {
        try {
            const token = getToken();
            const headers: Record<string, string> = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            if (tenantId) headers['X-Operate-Tenant-Id'] = tenantId;
            const response = await fetch(apiUrl, { headers });
            if (!response.ok) {
                showToast({ type: 'error', message: 'Impossibile scaricare il documento' });
                return;
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            showToast({ type: 'error', message: 'Errore durante il download del documento' });
        }
    };

    const openMdlDocumentModal = (type: 'nomine' | 'tariffario') => {
        setMdlDocumentModal(type);
        setMdlDocumentSigning(null);
        setMdlDocumentFile(null);
    };

    const getMdlDocumentPreviewUrl = (type: 'nomine' | 'tariffario') => (
        type === 'nomine'
            ? `/api/v1/companies/${companyId}/mdl-documents/nomine.pdf`
            : `/api/v1/tariffari-aziendali/${tariffario?.id}/pdf`
    );

    const handleMdlDocumentUpload = async () => {
        if (!mdlDocumentModal || !mdlDocumentFile) {
            showToast({ type: 'error', message: 'Seleziona un PDF o una foto del documento firmato' });
            return;
        }
        try {
            setMdlDocumentSaving(true);
            const formData = new FormData();
            formData.append('documento', mdlDocumentFile);
            await apiUpload(`/api/v1/companies/${companyId}/mdl-documents/${mdlDocumentModal}/upload`, formData);
            showToast({ type: 'success', message: 'Documento firmato caricato correttamente' });
            setMdlDocumentModal(null);
            onActionComplete?.();
        } catch {
            showToast({ type: 'error', message: 'Errore durante il caricamento del documento firmato' });
        } finally {
            setMdlDocumentSaving(false);
        }
    };

    const handleMdlDocumentOnlineSign = async ({
        type,
        signatureDataUrl,
        placement
    }: {
        type: 'nomine' | 'tariffario';
        signatureDataUrl: string;
        placement: SignaturePlacement;
    }) => {
        if (!type) {
            return;
        }
        try {
            setMdlDocumentSaving(true);
            await apiPost(`/api/v1/companies/${companyId}/mdl-documents/${type}/sign`, {
                signatureImage: signatureDataUrl,
                placement,
            });
            showToast({ type: 'success', message: 'Firma acquisita e documento archiviato' });
            setMdlDocumentModal(null);
            setMdlDocumentSigning(null);
            onActionComplete?.();
        } catch {
            showToast({ type: 'error', message: 'Errore durante la firma del documento' });
        } finally {
            setMdlDocumentSaving(false);
        }
    };

    // Uscite MC state
    const [usciteMC, setUsciteMC] = useState<UscitaMC[]>([]);
    const [loadingUsciteMC, setLoadingUsciteMC] = useState(false);
    const [showUscitaMCModal, setShowUscitaMCModal] = useState(false);
    const [savingUscitaMC, setSavingUscitaMC] = useState(false);
    const [mediciDisponibili, setMediciDisponibili] = useState<MedicoDisponibileUscita[]>([]);
    const [vociUnaTantum, setVociUnaTantum] = useState<VoceUnaTantum[]>([]);
    const [newUscitaMC, setNewUscitaMC] = useState({ data: new Date().toISOString().split('T')[0], medicoId: '', voceTariffarioId: '', note: '' });

    // Consulenze MDL state
    const [consulenze, setConsulenze] = useState<ConsulenzaMDL[]>([]);
    const [loadingConsulenze, setLoadingConsulenze] = useState(false);
    const [showConsulenzaModal, setShowConsulenzaModal] = useState(false);
    const [savingConsulenza, setSavingConsulenza] = useState(false);
    const [newConsulenza, setNewConsulenza] = useState<Omit<CreateConsulenzaPayload, 'companyTenantProfileId'>>({
        data: new Date().toISOString().split('T')[0],
        durataMinuti: 60,
        oggetto: '',
        note: '',
        importo: undefined
    });
    // P65: Auto-calc importo da voce CONSULENZA del tariffario associato
    const [consulenzaVoce, setConsulenzaVoce] = useState<VoceTariffario | null>(null);
    const [importoIsAutocalc, setImportoIsAutocalc] = useState(false);
    // Ora inizio/fine per calcolo durata consulenza
    const [oraInizio, setOraInizio] = useState('');
    const [oraFine, setOraFine] = useState('');

    // Associa tariffario modal state
    const [showAssociaTariffarioModal, setShowAssociaTariffarioModal] = useState(false);
    const [availableTariffari, setAvailableTariffari] = useState<Array<{ id: string; codice: string; nome: string; descrizione?: string; attivo: boolean }>>([]);
    const [loadingTariffari, setLoadingTariffari] = useState(false);
    const [selectedTariffarioId, setSelectedTariffarioId] = useState('');
    const [associaValidoDa, setAssociaValidoDa] = useState(new Date().toISOString().split('T')[0]);
    const [associaValidoA, setAssociaValidoA] = useState('');
    const [associaNote, setAssociaNote] = useState('');
    const [savingAssociazione, setSavingAssociazione] = useState(false);

    // Modifica Associazione modal state
    const [showModificaAssociazioneModal, setShowModificaAssociazioneModal] = useState(false);
    const [modAssocValidoDa, setModAssocValidoDa] = useState('');
    const [modAssocValidoA, setModAssocValidoA] = useState('');
    const [modAssocNote, setModAssocNote] = useState('');
    const [savingModAssociazione, setSavingModAssociazione] = useState(false);
    // Successor tariffario selection
    const [modAssocSuccessoreTariffarioId, setModAssocSuccessoreTariffarioId] = useState('');
    const [modAssocAvailableTariffari, setModAssocAvailableTariffari] = useState<Array<{ id: string; codice: string; nome: string }>>([]);
    const [loadingModAssocTariffari, setLoadingModAssocTariffari] = useState(false);

    // P59: Prepara headers per cross-tenant operations
    const operateTenantHeaders = tenantId ? { 'X-Operate-Tenant-Id': tenantId } : undefined;

    // Carica uscite MC quando si espande la sezione
    useEffect(() => {
        if (expandedSection === 'uscite_mc' && companyTenantProfileId) {
            setLoadingUsciteMC(true);
            Promise.all([
                usciteMCApi.getAll({ companyTenantProfileId }),
                usciteMCApi.getMediciDisponibili(companyTenantProfileId),
                usciteMCApi.getVociUnaTantum(companyTenantProfileId)
            ])
                .then(([usciteRes, mediciRes, vociRes]) => {
                    setUsciteMC(usciteRes.data || []);
                    const medici = mediciRes.data || [];
                    setMediciDisponibili(medici);
                    setVociUnaTantum(vociRes.data || []);
                    // Auto-seleziona il medico nominato solo se l'utente non ha già scelto
                    const primario = medici.find(m => m.isPrimario);
                    if (primario) setNewUscitaMC(prev => ({ ...prev, medicoId: prev.medicoId || primario.id }));
                })
                .catch(() => showToast({ type: 'error', message: 'Errore nel caricamento delle uscite MC' }))
                .finally(() => setLoadingUsciteMC(false));
        }
    }, [expandedSection, companyTenantProfileId]);

    // Carica consulenze MDL quando si espande la sezione
    useEffect(() => {
        if (expandedSection === 'consulenze' && companyTenantProfileId) {
            setLoadingConsulenze(true);
            consulenzeMDLApi.getAll({ companyTenantProfileId })
                .then(res => setConsulenze(res.data || []))
                .catch(() => showToast({ type: 'error', message: 'Errore nel caricamento delle consulenze' }))
                .finally(() => setLoadingConsulenze(false));
        }
    }, [expandedSection, companyTenantProfileId]);

    // P65: Carica la voce CONSULENZA dal tariffario associato quando si apre il modal
    useEffect(() => {
        if (showConsulenzaModal && tariffario?.id) {
            const tenantParams = tenantId ? { tenantIds: [tenantId] } : undefined;
            tariffariAziendaliApi.getById(tariffario.id, tenantParams)
                .then(res => {
                    const voce = res.data?.voci?.find((v: VoceTariffario) => v.tipo === 'CONSULENZA') ?? null;
                    setConsulenzaVoce(voce);
                    if (voce) {
                        // Auto-precompila importo con durata default (60 min)
                        const calcolato = Math.round(Number(voce.prezzoBase) / 60 * 60 * 100) / 100;
                        setNewConsulenza(p => ({ ...p, importo: calcolato }));
                        setImportoIsAutocalc(true);
                    }
                })
                .catch(() => { /* non bloccante */ });
        } else if (!showConsulenzaModal) {
            setConsulenzaVoce(null);
            setImportoIsAutocalc(false);
        }
    }, [showConsulenzaModal, tariffario?.id]);

    // Carica tariffari disponibili quando si apre il modal "Associa tariffario"
    useEffect(() => {
        if (showAssociaTariffarioModal) {
            setLoadingTariffari(true);
            const tenantParams = tenantId ? { tenantIds: tenantId } : undefined;
            tariffariAziendaliApi.getAll({ attivo: true, ...tenantParams, limit: 100 })
                .then(res => {
                    setAvailableTariffari((res.data || []).map((t) => ({
                        id: t.id, codice: t.codice, nome: t.nome, descrizione: t.descrizione ?? undefined, attivo: t.attivo
                    })));
                })
                .catch(() => showToast({ type: 'error', message: 'Errore nel caricamento dei tariffari' }))
                .finally(() => setLoadingTariffari(false));
        }
    }, [showAssociaTariffarioModal]);

    // Prepopola il modal "Modifica Associazione" con i dati dell'associazione corrente
    useEffect(() => {
        if (showModificaAssociazioneModal && tariffario?.association) {
            setModAssocValidoDa(tariffario.association.validoDa?.split('T')[0] || '');
            setModAssocValidoA(tariffario.association.validoA?.split('T')[0] || '');
            setModAssocNote(tariffario.association.note || '');
            setModAssocSuccessoreTariffarioId(successoreTariffario?.id || '');
            // Load available tariffari for successor selection (exclude current)
            setLoadingModAssocTariffari(true);
            const tenantParams = tenantId ? { tenantIds: tenantId } : undefined;
            tariffariAziendaliApi.getAll({ attivo: true, ...tenantParams, limit: 100 })
                .then(res => {
                    setModAssocAvailableTariffari(
                        (res.data || [])
                            .filter((t) => t.id !== tariffario.id)
                            .map((t) => ({
                                id: t.id, codice: t.codice, nome: t.nome
                            }))
                    );
                })
                .catch(() => { /* non bloccante */ })
                .finally(() => setLoadingModAssocTariffari(false));
        }
    }, [showModificaAssociazioneModal, tariffario?.association]);

    // Handler: Salva nuova associazione tariffario
    const handleSaveAssociazione = async () => {
        if (!selectedTariffarioId || !companyTenantProfileId) return;
        setSavingAssociazione(true);
        try {
            await tariffariAziendaliApi.associate(selectedTariffarioId, {
                companyTenantProfileId,
                validoDa: associaValidoDa || undefined,
                validoA: associaValidoA || undefined,
                note: associaNote || undefined
            });
            showToast({ type: 'success', message: 'Tariffario associato con successo' });
            setShowAssociaTariffarioModal(false);
            setSelectedTariffarioId('');
            setAssociaValidoDa(new Date().toISOString().split('T')[0]);
            setAssociaValidoA('');
            setAssociaNote('');
            onActionComplete?.();
        } catch {
            showToast({ type: 'error', message: 'Errore nell\'associazione del tariffario' });
        } finally {
            setSavingAssociazione(false);
        }
    };

    // Handler: Salva modifica associazione
    const handleSaveModAssociazione = async () => {
        if (!tariffario?.association?.id) return;
        setSavingModAssociazione(true);
        try {
            let successoreAssociationId: string | undefined;

            // If successor tariffario selected, create its association first
            if (modAssocSuccessoreTariffarioId && modAssocValidoA && companyTenantProfileId) {
                const nextDay = new Date(modAssocValidoA);
                nextDay.setDate(nextDay.getDate() + 1);
                const successorValidoDa = nextDay.toISOString().split('T')[0];

                const successorRes = await tariffariAziendaliApi.associate(modAssocSuccessoreTariffarioId, {
                    companyTenantProfileId,
                    validoDa: successorValidoDa,
                });
                successoreAssociationId = successorRes.data?.id;
            }

            await tariffariAziendaliApi.updateAssociation(tariffario.association.id, {
                validoDa: modAssocValidoDa || undefined,
                validoA: modAssocValidoA || undefined,
                note: modAssocNote || undefined,
                ...(successoreAssociationId ? { successoreAssociationId } : {})
            });
            showToast({ type: 'success', message: 'Associazione aggiornata con successo' });
            setShowModificaAssociazioneModal(false);
            onActionComplete?.();
        } catch {
            showToast({ type: 'error', message: 'Errore nell\'aggiornamento dell\'associazione' });
        } finally {
            setSavingModAssociazione(false);
        }
    };

    // Handler: Rimuovi successore designato
    const handleDeleteSuccessore = async () => {
        if (!tariffario?.association?.id || !successoreTariffario) return;
        const conferma = await confirm({
            title: 'Rimuovi successore',
            message: `Vuoi rimuovere "${successoreTariffario.nome}" come successore designato?`,
            confirmLabel: 'Rimuovi',
            cancelLabel: 'Annulla',
            variant: 'danger'
        });
        if (!conferma) return;
        try {
            // Rimuovi il link successore dall'associazione corrente
            await tariffariAziendaliApi.updateAssociation(tariffario.association.id, {
                successoreAssociationId: null
            });
            // Dissocia l'associazione del successore se possibile
            if (successoreTariffario.association?.id && companyTenantProfileId) {
                try {
                    await tariffariAziendaliApi.dissociate(successoreTariffario.id, companyTenantProfileId);
                } catch {
                    // Non bloccante: il link è già stato rimosso
                }
            }
            showToast({ type: 'success', message: 'Successore rimosso con successo' });
            onActionComplete?.();
        } catch {
            showToast({ type: 'error', message: 'Errore nella rimozione del successore' });
        }
    };

    // Estrai nomine MC e RSPP - attiva, successore, storico
    // FIX: Distinguish current (dataInizio <= now) from successor (dataInizio > now)
    // Both can have stato === 'ATTIVA', so date check is essential
    const now = new Date();

    const nominaMC = nomine.find(n =>
        n.tipoRuolo === 'MEDICO_COMPETENTE' && n.stato === 'ATTIVA' &&
        (!n.dataInizio || new Date(n.dataInizio) <= now)
    ) || nomine.find(n => n.tipoRuolo === 'MEDICO_COMPETENTE' && n.stato === 'ATTIVA');
    const nominaRSPP = nomine.find(n =>
        n.tipoRuolo === 'RSPP' && n.stato === 'ATTIVA' &&
        (!n.dataInizio || new Date(n.dataInizio) <= now)
    ) || nomine.find(n => n.tipoRuolo === 'RSPP' && n.stato === 'ATTIVA');
    const nomineMCCoordinate = nomine
        .filter(n =>
            n.tipoRuolo === 'MEDICO_COMPETENTE_COORDINATO' &&
            n.stato === 'ATTIVA' &&
            (!n.dataInizio || new Date(n.dataInizio) <= now)
        )
        .sort((a, b) => new Date(b.dataInizio || 0).getTime() - new Date(a.dataInizio || 0).getTime());

    // Successore = nomina futura (dataInizio > oggi) per lo stesso tipo, che non è la corrente
    const successorMC = nomine.find(n =>
        n.tipoRuolo === 'MEDICO_COMPETENTE' && n.id !== nominaMC?.id &&
        n.stato !== 'REVOCATA' && n.stato !== 'SCADUTA' &&
        n.dataInizio && new Date(n.dataInizio) > now
    );
    const successorRSPP = nomine.find(n =>
        n.tipoRuolo === 'RSPP' && n.id !== nominaRSPP?.id &&
        n.stato !== 'REVOCATA' && n.stato !== 'SCADUTA' &&
        n.dataInizio && new Date(n.dataInizio) > now
    );

    // Storico = nomine passate (non attive, non futuri successori)
    const storicoMC = nomine.filter(n =>
        n.tipoRuolo === 'MEDICO_COMPETENTE' && n.id !== nominaMC?.id && n.id !== successorMC?.id &&
        ['REVOCATA', 'SCADUTA', 'SOSPESA'].includes(n.stato)
    ).sort((a, b) => new Date(b.dataInizio || 0).getTime() - new Date(a.dataInizio || 0).getTime());
    const storicoRSPP = nomine.filter(n =>
        n.tipoRuolo === 'RSPP' && n.id !== nominaRSPP?.id && n.id !== successorRSPP?.id &&
        ['REVOCATA', 'SCADUTA', 'SOSPESA'].includes(n.stato)
    ).sort((a, b) => new Date(b.dataInizio || 0).getTime() - new Date(a.dataInizio || 0).getTime());

    // Calcola statistiche
    const hasMC = !!nominaMC;
    const hasRSPP = !!nominaRSPP;
    const siteIdsWithDVR = new Set(dvrs.map(d => d.siteId));
    const sitesWithDVR = sites.filter(s => siteIdsWithDVR.has(s.id)).length;
    const sitesWithoutDVR = sites.length - sitesWithDVR;
    const hasTariffario = !!tariffario?.attivo;
    const hasSopralluoghi = sopralluoghi.length > 0; // P59

    // P59: Ordina DVR per data più recente prima
    const sortedDvrs = [...dvrs].sort((a, b) => {
        const dateA = new Date(a.dataEsecuzione || 0);
        const dateB = new Date(b.dataEsecuzione || 0);
        return dateB.getTime() - dateA.getTime();
    });

    // P59: Ordina e separa sopralluoghi per tipo (MC a sinistra, RSPP a destra)
    const sortedSopralluoghi = [...sopralluoghi].sort((a, b) => {
        const dateA = new Date(a.dataEsecuzione || 0);
        const dateB = new Date(b.dataEsecuzione || 0);
        return dateB.getTime() - dateA.getTime();
    });

    // P59: Separa sopralluoghi MC e RSPP
    const sopralluoghiMC = sortedSopralluoghi.filter(s => {
        const tipo = s.valutazione?.split(' - ')[0];
        return tipo === 'MC';
    });
    const sopralluoghiRSPP = sortedSopralluoghi.filter(s => {
        const tipo = s.valutazione?.split(' - ')[0];
        return tipo === 'RSPP';
    });

    // Determina lo stato generale
    const allConfigured = hasMC && hasRSPP && sitesWithoutDVR === 0 && hasTariffario;
    const hasExpiring = [nominaMC?.dataScadenza, nominaRSPP?.dataScadenza, ...dvrs.map(d => d.dataScadenza)]
        .some(d => isExpiringSoon(d));
    const hasExpired = [nominaMC?.dataScadenza, nominaRSPP?.dataScadenza, ...dvrs.map(d => d.dataScadenza)]
        .some(d => isExpired(d));

    // === Handlers per DELETE ===
    const handleDeleteDVR = async (dvrId: string) => {
        const confirmed = await confirm({
            title: 'Elimina DVR',
            message: 'Sei sicuro di voler eliminare questo DVR? Questa azione non può essere annullata.',
            confirmLabel: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) {
            return;
        }
        setDeletingId(dvrId);
        try {
            // P59: Passa header X-Operate-Tenant-Id per cross-tenant operations
            await apiDelete(`/api/v1/dvr/${dvrId}`, operateTenantHeaders ? { headers: operateTenantHeaders } : undefined);
            showToast({ type: 'success', message: 'DVR eliminato con successo' });
            onActionComplete?.();
        } catch (error) {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione del DVR' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleDeleteSopralluogo = async (sopralluogoId: string) => {
        const confirmed = await confirm({
            title: 'Elimina Sopralluogo',
            message: 'Sei sicuro di voler eliminare questo sopralluogo? Questa azione non può essere annullata.',
            confirmLabel: 'Elimina',
            variant: 'danger'
        });
        if (!confirmed) {
            return;
        }
        setDeletingId(sopralluogoId);
        try {
            // P59: Passa header X-Operate-Tenant-Id per cross-tenant operations
            await apiDelete(`/api/v1/sopralluogo/${sopralluogoId}`, operateTenantHeaders ? { headers: operateTenantHeaders } : undefined);
            showToast({ type: 'success', message: 'Sopralluogo eliminato con successo' });
            onActionComplete?.();
        } catch (error) {
            showToast({ type: 'error', message: 'Errore durante l\'eliminazione del sopralluogo' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleModalSuccess = () => {
        setShowNominaModal(null);
        setEditingNominaId(null);
        setSuccessorOfNomina(null);
        setShowDVRModal(false);
        setShowSopralluogoModal(false);
        setEditingDVRId(null);
        setEditingSopralluogoId(null);
        onActionComplete?.();
    };

    // P59: Aggiornato per includere sopralluoghi e consulenze
    const toggleSection = (section: 'nomine' | 'dvr' | 'sopralluoghi' | 'uscite_mc' | 'consulenze' | 'tariffario') => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const openNominaModal = (tipo: NominaTipo, options?: { editingId?: string | null; successorOf?: NominaInfo | null }) => {
        if (!hasTariffario && !options?.editingId) {
            showToast({
                type: 'warning',
                message: 'Prima della nomina associa un tariffario aziendale: servirà per recuperare automaticamente tariffe e movimenti. Puoi comunque procedere.'
            });
        }
        setEditingNominaId(options?.editingId || null);
        setSuccessorOfNomina(options?.successorOf || null);
        setShowNominaModal(tipo);
    };

    // Render singola nomina con successore e storico
    const renderNomina = (
        tipo: NominaTipo,
        nomina: NominaInfo | undefined,
        icon: React.ReactNode,
        title: string,
        color: string,
        successor?: NominaInfo,
        storico?: NominaInfo[],
        showStorico?: boolean,
        setShowStorico?: (v: boolean) => void,
        extraContent?: React.ReactNode
    ) => {
        const status = nomina ? getStatusBadge(nomina.dataScadenza) : null;

        return (
            <div className={cn(
                "p-4 rounded-lg border transition-all",
                nomina ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" : "bg-gray-50 dark:bg-gray-700/50 border-dashed border-gray-300 dark:border-gray-600"
            )}>
                <div className="flex items-start justify-between">
                    <div className="flex items-center">
                        <div className={cn(
                            "p-2 rounded-lg",
                            nomina ? `bg-${color}-100 dark:bg-${color}-900/30` : "bg-gray-100 dark:bg-gray-700"
                        )}>
                            {icon}
                        </div>
                        <div className="ml-3">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</h4>
                            {nomina ? (
                                <div className="flex items-center mt-1">
                                    <User className="h-3 w-3 text-gray-400 mr-1" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {nomina.persona?.fullName || `${nomina.persona?.firstName} ${nomina.persona?.lastName}` || 'Non assegnato'}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Non nominato</p>
                            )}
                        </div>
                    </div>
                    {nomina && status && (
                        <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                            status.className
                        )}>
                            {status.icon}
                            {status.label}
                        </span>
                    )}
                </div>

                {nomina ? (
                    <>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Dal:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-gray-50">{formatDate(nomina.dataInizio)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Scadenza:</span>
                                <span className={cn(
                                    "ml-1 font-medium",
                                    isExpired(nomina.dataScadenza) ? "text-red-600 dark:text-red-400" :
                                        isExpiringSoon(nomina.dataScadenza) ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-50"
                                )}>
                                    {formatDate(nomina.dataScadenza)}
                                </span>
                            </div>
                            {/* Tracking fatturazione */}
                            {nomina.tariffaApplicata && (
                                <>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Tariffa:</span>
                                        <span className="ml-1 font-medium text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(nomina.tariffaApplicata)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400">Ultima fattura:</span>
                                        <span className="ml-1 font-medium text-gray-900 dark:text-gray-50">
                                            {formatDate(nomina.dataUltimaFattura)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* P59: Pulsante modifica compatto e integrato */}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => {
                                    openNominaModal(tipo, { editingId: nomina.id });
                                }}
                                className={cn(
                                    "inline-flex items-center px-2.5 py-1 text-xs rounded-md border transition-colors",
                                    `border-${color}-200 dark:border-${color}-700 text-${color}-600 dark:text-${color}-400 hover:bg-${color}-50 dark:hover:bg-${color}-900/30 hover:text-${color}-700 dark:hover:text-${color}-300`
                                )}
                            >
                                <Edit className="h-3 w-3 mr-1" />
                                Modifica
                            </button>
                            <button
                                onClick={async () => {
                                    const ok = await confirm({
                                        title: 'Rinnova Nomina',
                                        message: `Vuoi rinnovare la nomina ${tipo === 'MC' ? 'del Medico Competente' : 'dell\'RSPP'}? La nomina corrente verrà cessata e ne verrà creata una nuova con lo stesso professionista.`,
                                        confirmLabel: 'Rinnova',
                                        cancelLabel: 'Annulla'
                                    });
                                    if (!ok) return;
                                    try {
                                        await nomineRuoloApi.renew(nomina.id);
                                        showToast({ type: 'success', message: 'Nomina rinnovata con successo' });
                                        onActionComplete?.();
                                    } catch {
                                        showToast({ type: 'error', message: 'Errore durante il rinnovo della nomina' });
                                    }
                                }}
                                className={cn(
                                    "inline-flex items-center px-2.5 py-1 text-xs rounded-md border transition-colors",
                                    `border-${color}-200 dark:border-${color}-700 text-${color}-600 dark:text-${color}-400 hover:bg-${color}-50 dark:hover:bg-${color}-900/30 hover:text-${color}-700 dark:hover:text-${color}-300`
                                )}
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Rinnova
                            </button>
                            <button
                                onClick={() => {
                                    openNominaModal(tipo, { successorOf: nomina });
                                }}
                                className={cn(
                                    "inline-flex items-center px-2.5 py-1 text-xs rounded-md border transition-colors",
                                    `border-${color}-200 dark:border-${color}-700 text-${color}-600 dark:text-${color}-400 hover:bg-${color}-50 dark:hover:bg-${color}-900/30 hover:text-${color}-700 dark:hover:text-${color}-300`
                                )}
                            >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Nomina Successore
                            </button>
                        </div>

                        {/* Successore designato */}
                        {successor && (
                            <div className="mt-3 p-3 rounded-lg border border-dashed border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/20">
                                <div className="flex items-center gap-2">
                                    <UserPlus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Successore designato</span>
                                </div>
                                <div className="mt-1.5 flex items-center justify-between">
                                    <div>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {successor.persona?.fullName || `${successor.persona?.firstName} ${successor.persona?.lastName}` || 'N/D'}
                                        </span>
                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                            dal {formatDate(successor.dataInizio)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                openNominaModal(tipo, { editingId: successor.id });
                                            }}
                                            className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                                            title="Modifica successore"
                                        >
                                            <Edit className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const ok = await confirm({
                                                    title: 'Rimuovi Successore',
                                                    message: `Vuoi rimuovere il successore designato ${successor.persona?.fullName || ''}?`,
                                                    confirmLabel: 'Rimuovi',
                                                    cancelLabel: 'Annulla'
                                                });
                                                if (!ok) return;
                                                try {
                                                    await apiDelete(`/api/v1/nomine-ruolo/${successor.id}`);
                                                    showToast({ type: 'success', message: 'Successore rimosso' });
                                                    onActionComplete?.();
                                                } catch {
                                                    showToast({ type: 'error', message: 'Errore nella rimozione del successore' });
                                                }
                                            }}
                                            className="p-1 text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                                            title="Rimuovi successore"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Storico nomine */}
                        {storico && storico.length > 0 && (
                            <div className="mt-3">
                                <button
                                    onClick={() => setShowStorico?.(!showStorico)}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    <History className="h-3 w-3" />
                                    <span>Storico ({storico.length})</span>
                                    {showStorico ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                                {showStorico && (
                                    <div className="mt-2 space-y-1.5">
                                        {storico.map(past => (
                                            <div key={past.id} className="flex items-center justify-between px-3 py-1.5 rounded-md bg-gray-50 dark:bg-gray-700/40 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "inline-block w-1.5 h-1.5 rounded-full",
                                                        past.stato === 'SCADUTA' ? 'bg-red-400' : past.stato === 'REVOCATA' ? 'bg-orange-400' : 'bg-gray-400'
                                                    )} />
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                        {past.persona?.fullName || `${past.persona?.firstName} ${past.persona?.lastName}` || 'N/D'}
                                                    </span>
                                                </div>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    {formatDate(past.dataInizio)} → {formatDate(past.dataFine || past.dataScadenza)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {extraContent}
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => openNominaModal(tipo)}
                            className={cn(
                                "mt-3 w-full flex items-center justify-center px-3 py-2 rounded-lg border-2 border-dashed transition-colors",
                                `border-${color}-300 dark:border-${color}-600 text-${color}-600 dark:text-${color}-400 hover:bg-${color}-50 dark:hover:bg-${color}-900/30 hover:border-${color}-400 dark:hover:border-${color}-500`
                            )}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Aggiungi Nomina
                        </button>
                        {extraContent}
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Header */}
                <div className={cn(
                    "px-6 py-4 border-b",
                    hasExpired ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-100 dark:from-red-900/30 dark:to-orange-900/30 dark:border-red-800" :
                        hasExpiring ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100 dark:from-amber-900/30 dark:to-yellow-900/30 dark:border-amber-800" :
                            allConfigured ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-100 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-green-800" :
                                "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-800"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {hasExpired ? (
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                            ) : hasExpiring ? (
                                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
                            ) : allConfigured ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                            ) : (
                                <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                            )}
                            <div>
                                <h2 className={cn(
                                    "text-lg font-semibold",
                                    hasExpired ? "text-red-800 dark:text-red-300" :
                                        hasExpiring ? "text-amber-800 dark:text-amber-300" :
                                            allConfigured ? "text-green-800 dark:text-green-300" : "text-blue-800 dark:text-blue-300"
                                )}>
                                    Servizi Medicina del Lavoro
                                </h2>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    D.Lgs 81/08 - Sorveglianza Sanitaria
                                </p>
                            </div>
                        </div>
                        <Link
                            to={`/poliambulatorio/mdl/scadenze?companyId=${companyId}`}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center"
                        >
                            Scadenziario
                            <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                    </div>

                    {/* Summary badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            hasMC ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                        )}>
                            <Stethoscope className="h-3 w-3 mr-1" />
                            MC {hasMC ? '✓' : '✗'}
                        </span>
                        <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            hasRSPP ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                        )}>
                            <Shield className="h-3 w-3 mr-1" />
                            RSPP {hasRSPP ? '✓' : '✗'}
                        </span>
                        <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            sitesWithoutDVR === 0 && sites.length > 0 ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" :
                                sitesWithoutDVR > 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        )}>
                            <FileText className="h-3 w-3 mr-1" />
                            DVR {sitesWithDVR}/{sites.length}
                        </span>
                        {/* P59: Badge Sopralluoghi */}
                        <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            hasSopralluoghi ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        )}>
                            <ClipboardCheck className="h-3 w-3 mr-1" />
                            Sopralluoghi {sopralluoghi.length}
                        </span>
                        {tariffario && (
                            <span className={cn(
                                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                                hasTariffario ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            )}>
                                <DollarSign className="h-3 w-3 mr-1" />
                                Tariffario
                            </span>
                        )}
                    </div>
                </div>

                {/* Sezione Nomine */}
                <div className="border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => toggleSection('nomine')}
                        className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center">
                            <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-gray-50">Nomine Figure Sicurezza</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({[hasMC, hasRSPP].filter(Boolean).length}/2 configurate)
                            </span>
                        </div>
                        {expandedSection === 'nomine' ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {expandedSection === 'nomine' && (
                        <div className="p-4 space-y-4">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => openPdfPreview(`/api/v1/companies/${companyId}/mdl-documents/nomine.pdf`, `Nomine figure sicurezza - ${companyName}.pdf`)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-300"
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    PDF nomine
                                </button>
                                <button
                                    type="button"
                                    onClick={() => downloadProtectedPdf(`/api/v1/companies/${companyId}/mdl-documents/nomine.pdf`, `Nomine figure sicurezza - ${companyName}.pdf`)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-300"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openMdlDocumentModal('nomine')}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                >
                                    <FileText className="h-3.5 w-3.5" />
                                    Firma / upload
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderNomina(
                                    'MC',
                                    nominaMC,
                                    <Stethoscope className={cn("h-5 w-5", nominaMC ? "text-blue-600" : "text-gray-400")} />,
                                    'Medico Competente',
                                    'blue',
                                    successorMC,
                                    storicoMC,
                                    showStoricoMC,
                                    setShowStoricoMC,
                                    <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/40 p-3 dark:border-teal-800 dark:bg-teal-900/10">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50">Coordinati</h4>
                                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Medici competenti coordinati per azienda o sede.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => openNominaModal('MC_COORDINATO')}
                                                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 dark:border-teal-700 dark:bg-gray-800 dark:text-teal-300"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Aggiungi
                                            </button>
                                        </div>
                                        {nomineMCCoordinate.length > 0 ? (
                                            <div className="mt-3 space-y-2">
                                                {nomineMCCoordinate.map(nomina => (
                                                    <div key={nomina.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm dark:bg-gray-800">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-gray-800 dark:text-gray-100">
                                                                {nomina.persona?.fullName || `${nomina.persona?.firstName || ''} ${nomina.persona?.lastName || ''}`.trim() || 'Medico coordinato'}
                                                            </p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                {nomina.site?.siteName ? `Sede: ${nomina.site.siteName}` : 'Tutta azienda'} · dal {formatDate(nomina.dataInizio)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                openNominaModal('MC_COORDINATO', { editingId: nomina.id });
                                                            }}
                                                            className="rounded-md p-1.5 text-teal-600 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-900/30"
                                                            title="Modifica coordinato"
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                                Nessun coordinato nominato.
                                            </p>
                                        )}
                                        <div className="mt-3 flex items-center gap-2 flex-wrap border-t border-teal-100 dark:border-teal-800 pt-3">
                                            <button
                                                type="button"
                                                onClick={() => openPdfPreview(`/api/v1/companies/${companyId}/mdl-documents/nomine.pdf?tipo=MC`, `Nomina MC - ${companyName}.pdf`)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-300"
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                PDF MC
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => downloadProtectedPdf(`/api/v1/companies/${companyId}/mdl-documents/nomine.pdf?tipo=MC`, `Nomina MC - ${companyName}.pdf`)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-300"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {renderNomina(
                                    'RSPP',
                                    nominaRSPP,
                                    <Shield className={cn("h-5 w-5", nominaRSPP ? "text-indigo-600" : "text-gray-400")} />,
                                    'RSPP',
                                    'indigo',
                                    successorRSPP,
                                    storicoRSPP,
                                    showStoricoRSPP,
                                    setShowStoricoRSPP,
                                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => openPdfPreview(`/api/v1/companies/${companyId}/mdl-documents/nomine.pdf?tipo=RSPP`, `Nomina RSPP - ${companyName}.pdf`)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            PDF RSPP
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => downloadProtectedPdf(`/api/v1/companies/${companyId}/mdl-documents/nomine.pdf?tipo=RSPP`, `Nomina RSPP - ${companyName}.pdf`)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-gray-800 dark:text-indigo-300"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Download
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sezione DVR */}
                <div className="border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => toggleSection('dvr')}
                        className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center">
                            <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-gray-50">DVR - Documento Valutazione Rischi</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({sitesWithDVR}/{sites.length} sedi)
                            </span>
                        </div>
                        {expandedSection === 'dvr' ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {expandedSection === 'dvr' && (
                        <div className="p-4">
                            {sites.length === 0 ? (
                                <div className="text-center py-6">
                                    <Building2 className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Nessuna sede registrata</p>
                                    <Link
                                        to={`/companies/${companyId}/edit`}
                                        className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Aggiungi Sede
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sites.map((site) => {
                                        const siteDVR = dvrs.find(d => d.siteId === site.id);
                                        const status = siteDVR ? getStatusBadge(siteDVR.dataScadenza) : null;

                                        return (
                                            <div
                                                key={site.id}
                                                className={cn(
                                                    "p-4 rounded-lg border",
                                                    siteDVR ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" : "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700"
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center">
                                                            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                                                            <h4 className="font-medium text-gray-900 dark:text-gray-50">{site.siteName}</h4>
                                                        </div>
                                                        {siteDVR ? (
                                                            <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Data firma:</span>
                                                                    <span className="ml-1 font-medium text-gray-900 dark:text-gray-50">
                                                                        {formatDate(siteDVR.dataEsecuzione)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Scadenza:</span>
                                                                    <span className={cn(
                                                                        "ml-1 font-medium",
                                                                        isExpired(siteDVR.dataScadenza) ? "text-red-600 dark:text-red-400" :
                                                                            isExpiringSoon(siteDVR.dataScadenza) ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-50"
                                                                    )}>
                                                                        {formatDate(siteDVR.dataScadenza)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 dark:text-gray-400">Eseguito da:</span>
                                                                    <span className="ml-1 font-medium text-gray-900 dark:text-gray-50">
                                                                        {siteDVR.effettuatoDa}
                                                                    </span>
                                                                </div>
                                                                {siteDVR.tariffaApplicata && (
                                                                    <div>
                                                                        <span className="text-gray-500 dark:text-gray-400">Tariffa:</span>
                                                                        <span className="ml-1 font-medium text-emerald-600">
                                                                            {formatCurrency(siteDVR.tariffaApplicata)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                                                <AlertTriangle className="h-3 w-3 inline mr-1" />
                                                                DVR non caricato - obbligatorio Art. 28-29 D.Lgs 81/08
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {status && (
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                                                                status.className
                                                            )}>
                                                                {status.icon}
                                                                {status.label}
                                                            </span>
                                                        )}
                                                        {/* Pulsanti CRUD DVR */}
                                                        <div className="flex items-center gap-1">
                                                            {siteDVR && (
                                                                <>
                                                                    {/* P59: Quick look PDF DVR */}
                                                                    {siteDVR.documentoUrl && (
                                                                        <button
                                                                            onClick={() => {
                                                                                openPdfPreview(`/api/v1/dvr/${siteDVR.id}/documento`, siteDVR.documentoNome || 'Documento DVR');
                                                                            }}
                                                                            className="p-2 rounded-lg text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
                                                                            title="Visualizza PDF"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => setEditingDVRId(siteDVR.id)}
                                                                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                                                        title="Modifica DVR"
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteDVR(siteDVR.id)}
                                                                        disabled={deletingId === siteDVR.id}
                                                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                                                                        title="Elimina DVR"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={() => setShowDVRModal(true)}
                                                                className={cn(
                                                                    "p-2 rounded-lg transition-colors",
                                                                    siteDVR
                                                                        ? "text-gray-400 hover:text-green-600 hover:bg-green-50"
                                                                        : "text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                                                                )}
                                                                title={siteDVR ? "Aggiungi nuovo DVR" : "Carica DVR"}
                                                            >
                                                                {siteDVR ? <Plus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* P59: Sezione Sopralluoghi */}
                <div className="border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => toggleSection('sopralluoghi')}
                        className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center">
                            <ClipboardCheck className="h-4 w-4 text-violet-600 dark:text-violet-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-gray-50">Sopralluoghi</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({sopralluoghi.length} registrati)
                            </span>
                        </div>
                        {expandedSection === 'sopralluoghi' ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {expandedSection === 'sopralluoghi' && (
                        <div className="p-4">
                            {/* Pulsante per nuovo sopralluogo */}
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => setShowSopralluogoModal(true)}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 rounded-lg transition-colors"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Nuovo Sopralluogo
                                </button>
                            </div>

                            {sopralluoghi.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm">Nessun sopralluogo registrato</p>
                                    <button
                                        onClick={() => setShowSopralluogoModal(true)}
                                        className="mt-2 inline-flex items-center text-sm text-violet-600 hover:text-violet-800"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Programma Sopralluogo
                                    </button>
                                </div>
                            ) : (
                                /* P59: Layout a 2 colonne - MC (sinistra) e RSPP (destra) - ordinati dal più recente */
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Colonna MC (Medico Competente) */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 pb-2 border-b border-teal-200 dark:border-teal-700">
                                            <Stethoscope className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                                            <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400">Medico Competente</h4>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">({sopralluoghiMC.length})</span>
                                        </div>
                                        {sopralluoghiMC.length === 0 ? (
                                            <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                                                Nessun sopralluogo MC
                                            </div>
                                        ) : (
                                            sopralluoghiMC.slice(0, 5).map((sopralluogo) => {
                                                const tipoInfo = getSopralluogoTipo(sopralluogo.valutazione);
                                                const tipoVisita = getSopralluogoTipoVisita(sopralluogo.valutazione);
                                                const statoInfo = getSopralluogoStato(sopralluogo.dataEsecuzione, sopralluogo.esito);

                                                return (
                                                    <SopralluogoCard
                                                        key={sopralluogo.id}
                                                        sopralluogo={sopralluogo}
                                                        tipoInfo={tipoInfo}
                                                        tipoVisita={tipoVisita}
                                                        statoInfo={statoInfo}
                                                        onEdit={() => setEditingSopralluogoId(sopralluogo.id)}
                                                        onDelete={() => handleDeleteSopralluogo(sopralluogo.id)}
                                                        onViewPdf={sopralluogo.documentoUrl ? () => {
                                                            openPdfPreview(`/api/v1/sopralluogo/${sopralluogo.id}/documento`, sopralluogo.documentoNome || 'Verbale Sopralluogo MC');
                                                        } : undefined}
                                                        deletingId={deletingId}
                                                    />
                                                );
                                            })
                                        )}
                                        {sopralluoghiMC.length > 5 && (
                                            <Link
                                                to={`/poliambulatorio/mdl/scadenze?companyId=${companyId}&tab=sopralluoghi&tipo=MC`}
                                                className="block text-center py-2 text-sm text-teal-600 hover:text-teal-800"
                                            >
                                                Vedi tutti MC ({sopralluoghiMC.length})
                                            </Link>
                                        )}
                                    </div>

                                    {/* Colonna RSPP */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 pb-2 border-b border-blue-200 dark:border-blue-700">
                                            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">RSPP</h4>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">({sopralluoghiRSPP.length})</span>
                                        </div>
                                        {sopralluoghiRSPP.length === 0 ? (
                                            <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                                                Nessun sopralluogo RSPP
                                            </div>
                                        ) : (
                                            sopralluoghiRSPP.slice(0, 5).map((sopralluogo) => {
                                                const tipoInfo = getSopralluogoTipo(sopralluogo.valutazione);
                                                const tipoVisita = getSopralluogoTipoVisita(sopralluogo.valutazione);
                                                const statoInfo = getSopralluogoStato(sopralluogo.dataEsecuzione, sopralluogo.esito);

                                                return (
                                                    <SopralluogoCard
                                                        key={sopralluogo.id}
                                                        sopralluogo={sopralluogo}
                                                        tipoInfo={tipoInfo}
                                                        tipoVisita={tipoVisita}
                                                        statoInfo={statoInfo}
                                                        onEdit={() => setEditingSopralluogoId(sopralluogo.id)}
                                                        onDelete={() => handleDeleteSopralluogo(sopralluogo.id)}
                                                        onViewPdf={sopralluogo.documentoUrl ? () => {
                                                            openPdfPreview(`/api/v1/sopralluogo/${sopralluogo.id}/documento`, sopralluogo.documentoNome || 'Verbale Sopralluogo RSPP');
                                                        } : undefined}
                                                        deletingId={deletingId}
                                                    />
                                                );
                                            })
                                        )}
                                        {sopralluoghiRSPP.length > 5 && (
                                            <Link
                                                to={`/poliambulatorio/mdl/scadenze?companyId=${companyId}&tab=sopralluoghi&tipo=RSPP`}
                                                className="block text-center py-2 text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                Vedi tutti RSPP ({sopralluoghiRSPP.length})
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sezione Uscite MC */}
                <div className="border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => toggleSection('uscite_mc')}
                        className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center">
                            <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-gray-50">Uscite MC e altre spese</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({usciteMC.filter(u => u.stato !== 'ANNULLATA').length} registrate)
                            </span>
                        </div>
                        {expandedSection === 'uscite_mc' ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {expandedSection === 'uscite_mc' && (
                        <div className="p-4">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => setShowUscitaMCModal(true)}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg transition-colors"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Registra Uscita MC
                                </button>
                            </div>

                            {loadingUsciteMC ? (
                                <div className="flex justify-center py-6">
                                    <RefreshCw className="h-5 w-5 animate-spin text-teal-500" />
                                </div>
                            ) : usciteMC.filter(u => u.stato !== 'ANNULLATA').length === 0 ? (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm">Nessuna uscita MC registrata</p>
                                    <button
                                        onClick={() => setShowUscitaMCModal(true)}
                                        className="mt-2 inline-flex items-center text-sm text-teal-600 hover:text-teal-800"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Registra prima uscita
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {usciteMC.filter(u => u.stato !== 'ANNULLATA').map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors group">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={cn(
                                                    "flex-shrink-0 w-2 h-2 rounded-full",
                                                    u.stato === 'DA_FATTURARE' ? 'bg-amber-500' : 'bg-green-500'
                                                )} />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                            {new Date(u.data).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                        </span>
                                                        <span className={cn(
                                                            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                                                            u.stato === 'DA_FATTURARE'
                                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                                : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                        )}>
                                                            {u.stato === 'DA_FATTURARE' ? 'Da Fatturare' : 'Fatturata'}
                                                        </span>
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                                                            {u.voceTariffario?.nome || (u.voceTariffarioId ? 'Spesa' : 'Uscita MC')}
                                                        </span>
                                                    </div>
                                                    {u.medico && (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            {getMedicoTitle(u.medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | null)} {u.medico.lastName} {u.medico.firstName}
                                                        </p>
                                                    )}
                                                    {u.site && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500">{u.site.siteName}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await usciteMCApi.annulla(u.id);
                                                        setUsciteMC(prev => prev.map(x => x.id === u.id ? { ...x, stato: 'ANNULLATA' as const } : x));
                                                        showToast({ type: 'success', message: 'Uscita MC annullata' });
                                                    } catch {
                                                        showToast({ type: 'error', message: 'Errore nell\'annullamento' });
                                                    }
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                                title="Annulla uscita"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sezione Consulenze MDL */}
                <div className="border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => toggleSection('consulenze')}
                        className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center">
                            <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-gray-50">Consulenze MDL</span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                ({consulenze.length > 0 ? `${consulenze.length} registrate` : 'nessuna'})
                            </span>
                        </div>
                        {expandedSection === 'consulenze' ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {expandedSection === 'consulenze' && (
                        <div className="p-4 space-y-3">
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setShowConsulenzaModal(true)}
                                    disabled={!companyTenantProfileId}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Nuova Consulenza
                                </button>
                            </div>

                            {!companyTenantProfileId ? (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <p className="text-sm">ID profilo azienda non disponibile. Ricarica la pagina.</p>
                                </div>
                            ) : loadingConsulenze ? (
                                <div className="text-center py-6 text-gray-400">
                                    <RefreshCw className="h-5 w-5 mx-auto mb-2 animate-spin" />
                                    <p className="text-sm">Caricamento...</p>
                                </div>
                            ) : consulenze.length === 0 ? (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm">Nessuna consulenza registrata</p>
                                    <button
                                        onClick={() => setShowConsulenzaModal(true)}
                                        className="mt-2 inline-flex items-center text-sm text-orange-600 hover:text-orange-800"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Registra prima consulenza
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {consulenze.map((c) => (
                                        <div key={c.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{c.oggetto}</span>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${STATO_CONSULENZA_COLORS[c.stato]}`}>
                                                        {STATO_CONSULENZA_LABELS[c.stato]}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                                    <span>{formatDate(c.data)}</span>
                                                    <span>{c.durataMinuti} min</span>
                                                    {c.importo != null && <span className="font-medium text-gray-700">{formatCurrency(Number(c.importo))}</span>}
                                                </div>
                                            </div>
                                            {c.stato === 'DA_RENDICONTARE' && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await consulenzeMDLApi.rendiconta(c.id);
                                                            setConsulenze(prev => prev.map(x => x.id === c.id ? { ...x, stato: 'RENDICONTATA' as StatoConsulenzaMDL } : x));
                                                            showToast({ type: 'success', message: 'Consulenza rendicontata' });
                                                        } catch {
                                                            showToast({ type: 'error', message: 'Errore nella rendicontazione' });
                                                        }
                                                    }}
                                                    className="flex-shrink-0 text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                                                >
                                                    Rendiconta
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sezione Tariffario MDL */}
                <div className="border-b border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => toggleSection('tariffario')}
                        className="w-full px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-2" />
                            <span className="font-medium text-gray-900 dark:text-gray-50">Tariffario MDL</span>
                            <span className={cn(
                                'ml-2 text-xs px-2 py-0.5 rounded-full',
                                hasTariffario
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                            )}>
                                {hasTariffario ? 'Attivo' : 'Non configurato'}
                            </span>
                        </div>
                        {expandedSection === 'tariffario' ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {expandedSection === 'tariffario' && (
                        <div className="p-4">
                            {tariffario ? (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openPdfPreview(`/api/v1/tariffari-aziendali/${tariffario.id}/pdf`, `Tariffario MDL - ${companyName}.pdf`)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-gray-800 dark:text-emerald-300"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            PDF tariffario
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => downloadProtectedPdf(`/api/v1/tariffari-aziendali/${tariffario.id}/pdf`, `Tariffario MDL - ${companyName}.pdf`)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-gray-800 dark:text-emerald-300"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Download
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openMdlDocumentModal('tariffario')}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            Firma / upload
                                        </button>
                                    </div>
                                    <TariffarioCompanyCard
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        tariffario={tariffario as any}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        successoreTariffario={successoreTariffario as any}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        storicoTariffari={storicoTariffari as any}
                                        companyId={companyId}
                                        companyName={companyName}
                                        onEditAssociation={() => setShowModificaAssociazioneModal(true)}
                                        onEditSuccessore={() => setShowModificaAssociazioneModal(true)}
                                        onDeleteSuccessore={handleDeleteSuccessore}
                                        className="shadow-none border-0"
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm">Nessun tariffario associato</p>
                                    <button
                                        onClick={() => setShowAssociaTariffarioModal(true)}
                                        className="mt-2 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-800 transition-colors"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Associa tariffario
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showNominaModal && (
                <QuickActionNominaModal
                    isOpen={true}
                    onClose={() => {
                        setShowNominaModal(null);
                        setEditingNominaId(null);
                        setSuccessorOfNomina(null);
                    }}
                    onSuccess={handleModalSuccess}
                    companyId={companyId}
                    companyName={companyName}
                    tipo={showNominaModal}
                    editingNominaId={editingNominaId} // P59: Edit mode
                    tenantId={tenantId} // P59: Cross-tenant operations
                    successorOf={successorOfNomina} // Nomina successore
                />
            )}

            <QuickActionDVRModal
                isOpen={showDVRModal || !!editingDVRId}
                onClose={() => {
                    setShowDVRModal(false);
                    setEditingDVRId(null);
                }}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
                tenantId={tenantId} // P59: Cross-tenant operations
                editingDVRId={editingDVRId} // P59: Edit mode
            />

            <QuickActionSopralluogoModal
                isOpen={showSopralluogoModal || !!editingSopralluogoId}
                onClose={() => {
                    setShowSopralluogoModal(false);
                    setEditingSopralluogoId(null);
                }}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyTenantProfileId={companyTenantProfileId}
                companyName={companyName}
                tenantId={tenantId} // P59: Cross-tenant operations
                editingSopralluogoId={editingSopralluogoId} // P59: Edit mode
            />

            {/* Modal: Nuova Uscita MC */}
            {showUscitaMCModal && companyTenantProfileId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-teal-600" />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-50">Registra Uscita MC</h3>
                            </div>
                            <button onClick={() => setShowUscitaMCModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo di spesa</label>
                                <ElegantSelect
                                    value={newUscitaMC.voceTariffarioId}
                                    onChange={(v) => setNewUscitaMC(p => ({ ...p, voceTariffarioId: v }))}
                                    options={[
                                        { value: '', label: 'Uscita Medico Competente (standard)', group: 'Uscita medico competente' },
                                        ...vociUnaTantum.map(v => ({
                                            value: v.id,
                                            label: `${v.nome || v.tipo}${v.prezzoBase != null ? ` — € ${Number(v.prezzoBase).toFixed(2)}` : ''}`,
                                            group: 'Spesa una tantum'
                                        }))
                                    ]}
                                />
                                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                                    Scegli "Uscita Medico Competente" oppure una "Spesa una tantum" del tariffario in vigore da rendicontare.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
                                <DatePickerElegante
                                    value={newUscitaMC.data || null}
                                    onChange={(d) => setNewUscitaMC(p => ({ ...p, data: d ? d.toISOString().split('T')[0] : '' }))}
                                    theme="teal"
                                    size="sm"
                                    placeholder="Seleziona data"
                                    clearable
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Medico Competente
                                </label>
                                {mediciDisponibili.length > 0 ? (
                                    <ElegantSelect
                                        value={newUscitaMC.medicoId}
                                        onChange={(v) => setNewUscitaMC(p => ({ ...p, medicoId: v }))}
                                        options={[
                                            { value: '', label: '— Nessuno specificato —' },
                                            ...mediciDisponibili.map(m => ({
                                                value: m.id,
                                                label: `${getMedicoTitle(m.gender as 'MALE' | 'FEMALE' | 'OTHER' | null)} ${m.lastName} ${m.firstName}${m.isPrimario ? ' (MC nominato)' : ' (coordinato)'}`
                                            }))
                                        ]}
                                    />
                                ) : (
                                    <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                                        Nessun Medico Competente nominato per questa azienda
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                                    placeholder="Note sull'uscita (opzionale)"
                                    value={newUscitaMC.note}
                                    onChange={e => setNewUscitaMC(p => ({ ...p, note: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                            <button
                                onClick={() => setShowUscitaMCModal(false)}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                            >
                                Annulla
                            </button>
                            <button
                                disabled={savingUscitaMC || !newUscitaMC.data}
                                onClick={async () => {
                                    if (!newUscitaMC.data) return;
                                    setSavingUscitaMC(true);
                                    try {
                                        const res = await usciteMCApi.create({
                                            companyTenantProfileId,
                                            data: newUscitaMC.data,
                                            ...(newUscitaMC.medicoId && { medicoId: newUscitaMC.medicoId }),
                                            ...(newUscitaMC.voceTariffarioId && { voceTariffarioId: newUscitaMC.voceTariffarioId }),
                                            ...(newUscitaMC.note?.trim() && { note: newUscitaMC.note.trim() })
                                        });
                                        setUsciteMC(prev => [res.data, ...prev]);
                                        setShowUscitaMCModal(false);
                                        setNewUscitaMC({ data: new Date().toISOString().split('T')[0], medicoId: '', voceTariffarioId: '', note: '' });
                                        showToast({ type: 'success', message: 'Spesa registrata — movimento contabile generato automaticamente' });
                                    } catch {
                                        showToast({ type: 'error', message: 'Errore nella registrazione dell\'uscita MC' });
                                    } finally {
                                        setSavingUscitaMC(false);
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {savingUscitaMC ? 'Salvataggio…' : 'Registra Uscita'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Nuova Consulenza MDL */}
            {showConsulenzaModal && companyTenantProfileId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-orange-600" />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-50">Nuova Consulenza MDL</h3>
                            </div>
                            <button
                                onClick={() => setShowConsulenzaModal(false)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Data *</label>
                                <DatePickerElegante
                                    value={newConsulenza.data}
                                    onChange={(date) => setNewConsulenza(p => ({ ...p, data: date ? date.toISOString().split('T')[0] : '' }))}
                                    label=""
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Oggetto *</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-50"
                                    placeholder="Descrizione sintetica della consulenza"
                                    value={newConsulenza.oggetto}
                                    onChange={e => setNewConsulenza(p => ({ ...p, oggetto: e.target.value }))}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <TimePickerElegante
                                        label="Ora Inizio"
                                        value={oraInizio}
                                        onChange={val => {
                                            setOraInizio(val);
                                            if (val && oraFine) {
                                                const [sh, sm] = val.split(':').map(Number);
                                                const [eh, em] = oraFine.split(':').map(Number);
                                                const actual = (eh * 60 + em) - (sh * 60 + sm);
                                                if (actual > 0) {
                                                    const fraz = consulenzaVoce?.durataMinimaMinuti || 60;
                                                    const billable = Math.ceil(actual / fraz) * fraz;
                                                    setNewConsulenza(p => ({
                                                        ...p,
                                                        durataMinuti: billable,
                                                        importo: (importoIsAutocalc && consulenzaVoce)
                                                            ? Math.round(Number(consulenzaVoce.prezzoBase) / 60 * billable * 100) / 100
                                                            : p.importo
                                                    }));
                                                }
                                            }
                                        }}
                                        minuteStep={15}
                                        placeholder="Inizio"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <TimePickerElegante
                                        label="Ora Fine"
                                        value={oraFine}
                                        onChange={val => {
                                            setOraFine(val);
                                            if (oraInizio && val) {
                                                const [sh, sm] = oraInizio.split(':').map(Number);
                                                const [eh, em] = val.split(':').map(Number);
                                                const actual = (eh * 60 + em) - (sh * 60 + sm);
                                                if (actual > 0) {
                                                    const fraz = consulenzaVoce?.durataMinimaMinuti || 60;
                                                    const billable = Math.ceil(actual / fraz) * fraz;
                                                    setNewConsulenza(p => ({
                                                        ...p,
                                                        durataMinuti: billable,
                                                        importo: (importoIsAutocalc && consulenzaVoce)
                                                            ? Math.round(Number(consulenzaVoce.prezzoBase) / 60 * billable * 100) / 100
                                                            : p.importo
                                                    }));
                                                }
                                            }
                                        }}
                                        minuteStep={15}
                                        minTime={oraInizio || undefined}
                                        placeholder="Fine"
                                    />
                                </div>
                            </div>
                            {/* Riepilogo durata calcolata */}
                            {oraInizio && oraFine && (() => {
                                const [sh, sm] = oraInizio.split(':').map(Number);
                                const [eh, em] = oraFine.split(':').map(Number);
                                const actual = (eh * 60 + em) - (sh * 60 + sm);
                                if (actual <= 0) return null;
                                const fraz = consulenzaVoce?.durataMinimaMinuti || 60;
                                const billable = Math.ceil(actual / fraz) * fraz;
                                const billableH = Math.floor(billable / 60);
                                const billableM = billable % 60;
                                const actualH = Math.floor(actual / 60);
                                const actualM = actual % 60;
                                return (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-md px-3 py-2">
                                        <span className="font-medium">
                                            {actualH > 0 ? `${actualH}h ` : ''}{actualM > 0 ? `${actualM}min` : ''} effettivi
                                        </span>
                                        {' → '}
                                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                                            {billableH > 0 ? `${billableH}h ` : ''}{billableM > 0 ? `${billableM}min` : ''} fatturabili
                                        </span>
                                        {billable !== actual && (
                                            <span className="ml-1 text-gray-400">(frazioni da {fraz} min)</span>
                                        )}
                                    </div>
                                );
                            })()}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Durata fatturabile (min)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300 text-gray-500"
                                        readOnly
                                        value={newConsulenza.durataMinuti}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Importo (€)
                                        {importoIsAutocalc && consulenzaVoce && (
                                            <span className="ml-1 text-xs font-normal text-teal-600 dark:text-teal-400">
                                                (da tariffario: €{Number(consulenzaVoce.prezzoBase).toFixed(2)}/h)
                                            </span>
                                        )}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-50 ${importoIsAutocalc ? 'border-teal-400 dark:border-teal-500' : 'border-gray-300'}`}
                                        placeholder="0.00"
                                        value={newConsulenza.importo ?? ''}
                                        onChange={e => {
                                            setImportoIsAutocalc(false);
                                            setNewConsulenza(p => ({ ...p, importo: e.target.value ? parseFloat(e.target.value) : undefined }));
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Note</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-50 resize-none"
                                    placeholder="Note aggiuntive..."
                                    value={newConsulenza.note || ''}
                                    onChange={e => setNewConsulenza(p => ({ ...p, note: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                            <button
                                onClick={() => { setShowConsulenzaModal(false); setOraInizio(''); setOraFine(''); }}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                disabled={savingConsulenza || !newConsulenza.oggetto || !newConsulenza.data}
                                onClick={async () => {
                                    if (!newConsulenza.oggetto?.trim() || !newConsulenza.data) return;
                                    setSavingConsulenza(true);
                                    try {
                                        const res = await consulenzeMDLApi.create({
                                            ...newConsulenza,
                                            companyTenantProfileId: companyTenantProfileId!
                                        });
                                        if (res.success) {
                                            setConsulenze(prev => [res.data, ...prev]);
                                            setShowConsulenzaModal(false);
                                            setNewConsulenza({ data: new Date().toISOString().split('T')[0], durataMinuti: 60, oggetto: '', note: '', importo: undefined });
                                            setConsulenzaVoce(null);
                                            setImportoIsAutocalc(false);
                                            setOraInizio('');
                                            setOraFine('');
                                            showToast({ type: 'success', message: 'Consulenza registrata con successo' });
                                        }
                                    } catch (err) {
                                        showToast({ type: 'error', message: 'Errore nel salvataggio della consulenza' });
                                    } finally {
                                        setSavingConsulenza(false);
                                    }
                                }}
                                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                            >
                                {savingConsulenza && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                Salva Consulenza
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* P59: Modal PDF Preview Quick Look */}
            {pdfPreviewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 max-w-4xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                <h3 className="font-medium text-gray-900 dark:text-gray-50">
                                    {pdfPreviewName || 'Documento'}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={openPdfInNewTab}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition-colors"
                                    title="Apri in nuova scheda"
                                >
                                    <ExternalLink className="h-5 w-5" />
                                </button>
                                <a
                                    href={pdfPreviewUrl}
                                    download={pdfPreviewName}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition-colors"
                                    title="Scarica"
                                >
                                    <Download className="h-5 w-5" />
                                </a>
                                <button
                                    onClick={() => {
                                        if (pdfPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(pdfPreviewUrl);
                                        setPdfPreviewUrl(null);
                                        setPdfPreviewName(null);
                                        setPdfPreviewApiUrl(null);
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 transition-colors"
                                    title="Chiudi"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <iframe
                                src={pdfPreviewUrl}
                                className="w-full h-full min-h-[60vh]"
                                title={pdfPreviewName || 'Documento PDF'}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Associa tariffario */}
            {showAssociaTariffarioModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 max-w-lg w-full">
                        <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-50">Associa Tariffario</h3>
                            </div>
                            <button onClick={() => setShowAssociaTariffarioModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tariffario *</label>
                                {loadingTariffari ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500"><RefreshCw className="h-4 w-4 animate-spin" /> Caricamento...</div>
                                ) : (
                                    <ElegantSelect
                                        value={selectedTariffarioId}
                                        onChange={setSelectedTariffarioId}
                                        placeholder="Seleziona un tariffario..."
                                        options={[
                                            { value: '', label: 'Seleziona un tariffario...' },
                                            ...availableTariffari.map(t => ({
                                                value: t.id,
                                                label: `${t.codice ? `${t.codice} - ` : ''}${t.nome}`,
                                            })),
                                        ]}
                                    />
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valido da</label>
                                    <DatePickerElegante
                                        value={associaValidoDa}
                                        onChange={(d) => setAssociaValidoDa(d ? d.toISOString().split('T')[0] : '')}
                                        placeholder="Data inizio"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valido a</label>
                                    <DatePickerElegante
                                        value={associaValidoA}
                                        onChange={(d) => setAssociaValidoA(d ? d.toISOString().split('T')[0] : '')}
                                        placeholder="Data fine (opzionale)"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                                <textarea
                                    value={associaNote}
                                    onChange={e => setAssociaNote(e.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                                    placeholder="Note opzionali..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                            <button
                                onClick={() => setShowAssociaTariffarioModal(false)}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSaveAssociazione}
                                disabled={!selectedTariffarioId || savingAssociazione}
                                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                            >
                                {savingAssociazione && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                Associa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Modifica Associazione */}
            {showModificaAssociazioneModal && tariffario?.association && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 max-w-lg w-full">
                        <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-50">Modifica Associazione</h3>
                            </div>
                            <button onClick={() => setShowModificaAssociazioneModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                                    {tariffario.codice && <span className="text-emerald-600 dark:text-emerald-400">{tariffario.codice} — </span>}
                                    {tariffario.nome}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valido da</label>
                                    <DatePickerElegante
                                        value={modAssocValidoDa}
                                        onChange={(d) => setModAssocValidoDa(d ? d.toISOString().split('T')[0] : '')}
                                        placeholder="Data inizio"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valido a</label>
                                    <DatePickerElegante
                                        value={modAssocValidoA}
                                        onChange={(d) => setModAssocValidoA(d ? d.toISOString().split('T')[0] : '')}
                                        placeholder="Data fine (opzionale)"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
                                <textarea
                                    value={modAssocNote}
                                    onChange={e => setModAssocNote(e.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                                    placeholder="Note opzionali..."
                                />
                            </div>
                            {/* Successor tariffario selection - shown when end date is set */}
                            {modAssocValidoA && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tariffario Successore
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                        Seleziona il tariffario che diventerà attivo dal giorno successivo alla scadenza
                                    </p>
                                    {loadingModAssocTariffari ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            Caricamento tariffari...
                                        </div>
                                    ) : (
                                        <ElegantSelect
                                            value={modAssocSuccessoreTariffarioId}
                                            onChange={setModAssocSuccessoreTariffarioId}
                                            placeholder="Nessun successore"
                                            options={[
                                                { value: '', label: 'Nessun successore' },
                                                ...modAssocAvailableTariffari.map(t => ({
                                                    value: t.id,
                                                    label: `${t.codice ? `${t.codice} - ` : ''}${t.nome}`,
                                                })),
                                            ]}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
                            <button
                                onClick={() => setShowModificaAssociazioneModal(false)}
                                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                onClick={handleSaveModAssociazione}
                                disabled={savingModAssociazione}
                                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
                            >
                                {savingModAssociazione && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                Salva Modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {mdlDocumentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 max-w-xl w-full">
                        <div className="p-5 border-b dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-teal-600" />
                                <h3 className="font-semibold text-gray-900 dark:text-gray-50">
                                    Firma / upload {mdlDocumentModal === 'nomine' ? 'nomine' : 'tariffario'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setMdlDocumentModal(null)}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3 text-sm text-teal-800 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-200">
                                Il documento generato resta disponibile per quick-look e download. Puoi firmarlo sul PDF scegliendo liberamente la posizione della firma, oppure caricare il PDF/foto firmato in cartaceo.
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Firma online
                                </label>
                                <button
                                    type="button"
                                    onClick={() => mdlDocumentModal && setMdlDocumentSigning(mdlDocumentModal)}
                                    disabled={mdlDocumentSaving}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                                >
                                    {mdlDocumentSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    Apri PDF e firma
                                </button>
                            </div>
                            <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Upload documento firmato
                                </label>
                                <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png"
                                    onChange={(e) => setMdlDocumentFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-700 dark:file:text-gray-200"
                                />
                                <button
                                    type="button"
                                    onClick={handleMdlDocumentUpload}
                                    disabled={mdlDocumentSaving || !mdlDocumentFile}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                                >
                                    {mdlDocumentSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                                    Carica firmato
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {mdlDocumentSigning && (
                <SigningWorkflowModal
                    isOpen={Boolean(mdlDocumentSigning)}
                    documentId={`company-mdl-${companyId}-${mdlDocumentSigning}`}
                    documentLabel={mdlDocumentSigning === 'nomine' ? 'Nomine figure sicurezza' : 'Tariffario MDL'}
                    previewUrl={getMdlDocumentPreviewUrl(mdlDocumentSigning)}
                    previewHttpHeaders={tenantId ? { 'X-Operate-Tenant-Id': tenantId } : undefined}
                    onClose={() => setMdlDocumentSigning(null)}
                    onConfirm={({ signatureDataUrl, placement }) => handleMdlDocumentOnlineSign({
                        type: mdlDocumentSigning,
                        signatureDataUrl,
                        placement
                    })}
                />
            )}
        </>
    );
};

export default MDLServicesCard;
