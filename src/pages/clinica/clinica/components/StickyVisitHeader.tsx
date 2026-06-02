/**
 * StickyVisitHeader - Unified sticky header for visit page
 * 
 * Displays patient data, appointment info, and action buttons
 * in a single always-visible header. Timer is now in QuickActions.
 * 
 * @module pages/clinica/clinica/components/StickyVisitHeader
 * @project P52 - Clinical Visit Template System
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    ArrowLeft,
    Save,
    FileText,
    Check,
    Clock,
    Loader2,
    Phone,
    PhoneCall,
    Mail,
    Calendar,
    CreditCard,
    Settings,
    AlertTriangle,
    RefreshCcw,
    CheckCircle,
    Users,
    X,
    Heart,
    ChevronDown,
    ChevronUp,
    Edit2,
    ClipboardCheck,
} from 'lucide-react';
import type { Visita, VisitTemplate } from '../../../../services/clinicaApi';
import type { CompletionPhase } from '../types';
import { ProfiloSaluteCard } from '../../../../components/clinica/ProfiloSaluteCard';
import SalvaCompletaMenu from './SalvaCompletaMenu';

interface PatientData {
    id: string;
    nome?: string;
    firstName?: string;
    cognome?: string;
    lastName?: string;
    codiceFiscale?: string;
    taxCode?: string;
    telefono?: string;
    phone?: string;
    email?: string;
    dataNascita?: string | Date;
    birthDate?: string | Date;
    gender?: string;
    sesso?: string;
}

interface AppointmentData {
    id: string;
    dataOra?: string | Date;
    data?: string | Date;
    ora?: string;
    note?: string;
    // P61: Queue info
    queueEntryId?: string;
    queueEntryStato?: string;
    queueSessionId?: string;
    numeroCoda?: number;
    displayNumberCoda?: string;
}

interface PrestazioneData {
    id: string;
    nome?: string;
    name?: string;
}

interface AutosaveState {
    isDirty: boolean;
    isSaving: boolean;
    lastSaved: Date | null;
}

interface StickyVisitHeaderProps {
    paziente: PatientData;
    appuntamento?: AppointmentData;
    prestazione?: PrestazioneData | null;
    template?: VisitTemplate | null;
    visita?: Visita | null;
    visitaId?: string | null;
    autosave: AutosaveState;
    isReadonly: boolean;
    completionPhase?: CompletionPhase;
    versioneCorrente?: number; // Current version number (1 = original, 2+ = revised)
    onBack: () => void;
    onSave: () => void;
    onComplete: () => void;
    onNuovaVersione: () => void;
    onAnnullaModifiche?: () => void;
    onCreateReferto: () => Promise<string | undefined>;
    /** Callback per aprire il PDF del giudizio di idoneità (solo MDL) */
    onOpenGiudizioPdf?: () => void;
    // P61: Queue actions
    onChiamaPaziente?: () => void;
    onRichiamaPaziente?: () => void;
    onViewQueue?: () => void;
    isQueueLoading?: boolean;
    queueInAttesaCount?: number;
    /** ID del paziente per ProfiloSalute espandibile */
    personId?: string;
    /** Callback per aprire il modal di modifica ProfiloSalute */
    onEditProfiloSalute?: () => void;
    /** Callback per modifica rapida anagrafica paziente */
    onEditPatient?: () => void;
    // P74: invio referto via email nel menu Salva e Completa
    invioRefertoMail?: boolean;
    onInvioRefertoMailChange?: (value: boolean) => void;
    isMDLVisit?: boolean;
    saveInvioMailPending?: boolean;
    marketingDocs?: { id: string; nome: string; fileName?: string | null }[];
	    occupationalSummary?: {
	        mansione?: string | null;
	        mansioni?: string[];
	        azienda?: string | null;
	        sede?: string | null;
	        protocollo?: string | null;
	        reparto?: string | null;
	        periodo?: string | null;
	        title?: string | null;
	        hiredDate?: string | Date | null;
	        endDate?: string | Date | null;
	        tipoContratto?: string | null;
	        tipoCollaboratore?: string | null;
	        rischi?: string[];
	        historyCount?: number;
	        rischiCount?: number;
	    } | null;
        onEditOccupationalSummary?: () => void;
	}

/** Split button: PDF Visita + PDF Giudizio (MDL) */
const PdfSplitButton: React.FC<{
    onCreateReferto: () => Promise<string | undefined>;
    onOpenGiudizioPdf: () => void;
}> = ({ onCreateReferto, onOpenGiudizioPdf }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex items-stretch">
                {/* Main button: PDF Referto */}
                <button
                    onClick={() => { onCreateReferto(); setIsOpen(false); }}
                    title="Visualizza il referto PDF della visita"
                    className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white 
                             rounded-l-lg hover:bg-teal-700 transition-all shadow-md 
                             hover:shadow-lg font-semibold text-sm border-r border-teal-500"
                >
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">PDF</span>
                </button>
                {/* Dropdown toggle */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    title="Scegli tipo di PDF"
                    className="flex items-center px-2 py-2.5 bg-teal-600 text-white 
                             rounded-r-lg hover:bg-teal-700 transition-all shadow-md hover:shadow-lg"
                >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>
            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                    <button
                        onClick={() => { onCreateReferto(); setIsOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                    >
                        <FileText className="h-4 w-4 text-teal-600" />
                        <div className="text-left">
                            <div className="font-medium">PDF Visita</div>
                            <div className="text-xs text-gray-500">Referto della visita medica</div>
                        </div>
                    </button>
                    <div className="border-t border-gray-100 mx-2" />
                    <button
                        onClick={() => { onOpenGiudizioPdf(); setIsOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                    >
                        <ClipboardCheck className="h-4 w-4 text-amber-600" />
                        <div className="text-left">
                            <div className="font-medium">PDF Giudizio Idoneità</div>
                            <div className="text-xs text-gray-500">Art. 41 c.7 D.Lgs 81/08</div>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export const StickyVisitHeader: React.FC<StickyVisitHeaderProps> = ({
    paziente,
    appuntamento,
    prestazione,
    template,
    visita,
    visitaId,
    autosave,
    isReadonly,
    completionPhase,
    onBack,
    onSave,
    onComplete,
    onNuovaVersione,
    onAnnullaModifiche,
    onCreateReferto,
    onOpenGiudizioPdf,
    versioneCorrente,
    // P61: Queue actions
    onChiamaPaziente,
    onRichiamaPaziente,
    onViewQueue,
    isQueueLoading,
    queueInAttesaCount,
    personId,
    onEditProfiloSalute,
    onEditPatient,
    // P74
    invioRefertoMail = false,
    onInvioRefertoMailChange,
    isMDLVisit = false,
    saveInvioMailPending,
    marketingDocs,
    occupationalSummary,
    onEditOccupationalSummary,
}) => {
    // ProfiloSalute expandable state
    const [profiloExpanded, setProfiloExpanded] = useState(false);
    const [occupationalTooltipOpen, setOccupationalTooltipOpen] = useState(false);
    const occupationalTooltipTimer = useRef<number | null>(null);
    // Computed patient data (handle both naming conventions)
    const patientName = `${paziente.cognome || paziente.lastName || ''} ${paziente.nome || paziente.firstName || ''}`.trim();
    const patientCF = paziente.codiceFiscale || paziente.taxCode || '';
    const patientPhone = paziente.telefono || paziente.phone || '';
    const patientEmail = paziente.email || '';
    const birthDate = paziente.dataNascita || paziente.birthDate;
    const gender = paziente.gender || paziente.sesso || '';

    // Calculate age in years and months
    const getAgeDetails = () => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();

        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();

        if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
            years--;
            months += 12;
        }
        if (today.getDate() < birth.getDate()) {
            months--;
            if (months < 0) months = 11;
        }

        return { years, months };
    };
    const ageDetails = getAgeDetails();

    // Format birth date
    const formattedBirthDate = birthDate
        ? new Date(birthDate).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
        : null;

    // Gender badge configuration
    const getGenderBadge = () => {
        if (!gender) return null;
        const genderUpper = gender.toUpperCase();
        if (genderUpper === 'M' || genderUpper === 'MALE' || genderUpper === 'MASCHIO') {
            return { label: 'M', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        }
        if (genderUpper === 'F' || genderUpper === 'FEMALE' || genderUpper === 'FEMMINA') {
            return { label: 'F', color: 'bg-pink-100 text-pink-700 border-pink-200' };
        }
        return { label: gender.charAt(0).toUpperCase(), color: 'bg-gray-100 text-gray-700 border-gray-200' };
    };
    const genderBadge = getGenderBadge();

    // Appointment data
    const appointmentDate = appuntamento?.dataOra || appuntamento?.data;
    const formattedDate = appointmentDate
        ? new Date(appointmentDate).toLocaleDateString('it-IT', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
        : null;
    const formattedTime2 = appointmentDate
        ? new Date(appointmentDate).toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        })
        : appuntamento?.ora || null;

	    // Prestazione name
	    const prestazioneName = prestazione?.nome || prestazione?.name || 'Visita generica';
	    const occupationalTags = occupationalSummary ? [
	        occupationalSummary.azienda,
	        occupationalSummary.sede,
	        occupationalSummary.reparto,
	        occupationalSummary.protocollo ? `Protocollo: ${occupationalSummary.protocollo}` : null,
	        occupationalSummary.periodo,
	        typeof occupationalSummary.rischiCount === 'number' && occupationalSummary.rischiCount > 0
	            ? `${occupationalSummary.rischiCount} rischi`
	            : null,
	        typeof occupationalSummary.historyCount === 'number' && occupationalSummary.historyCount > 0
	            ? `${occupationalSummary.historyCount} versioni`
	            : null,
	    ].filter(Boolean) as string[] : [];
        const occupationalDetailRows = occupationalSummary ? [
            ['Azienda', occupationalSummary.azienda],
            ['Titolo', occupationalSummary.title],
            ['Assunzione', occupationalSummary.hiredDate ? new Date(occupationalSummary.hiredDate).toLocaleDateString('it-IT') : null],
            ['Fine rapporto', occupationalSummary.endDate ? new Date(occupationalSummary.endDate).toLocaleDateString('it-IT') : null],
            ['Contratto', occupationalSummary.tipoContratto],
            ['Collaboratore', occupationalSummary.tipoCollaboratore],
            ['Sede', occupationalSummary.sede],
            ['Reparto', occupationalSummary.reparto],
            ['Mansione', occupationalSummary.mansione],
            ['Protocollo', occupationalSummary.protocollo],
        ].filter(([, value]) => Boolean(value)) as [string, string][] : [];

        const showOccupationalTooltip = () => {
            if (occupationalTooltipTimer.current) window.clearTimeout(occupationalTooltipTimer.current);
            occupationalTooltipTimer.current = window.setTimeout(() => setOccupationalTooltipOpen(true), 2000);
        };
        const hideOccupationalTooltip = () => {
            if (occupationalTooltipTimer.current) window.clearTimeout(occupationalTooltipTimer.current);
            setOccupationalTooltipOpen(false);
        };
        const hideOccupationalTooltipDelayed = () => {
            if (occupationalTooltipTimer.current) window.clearTimeout(occupationalTooltipTimer.current);
            occupationalTooltipTimer.current = window.setTimeout(() => setOccupationalTooltipOpen(false), 350);
        };

    // Stato visita badge
    const getStatoBadge = () => {
        if (!visita?.stato) return null;
        const stati: Record<string, { label: string; color: string }> = {
            'IN_CORSO': { label: 'In Visita', color: 'bg-purple-100 text-purple-700' },
            'COMPLETATA': { label: 'Refertato', color: 'bg-green-100 text-green-700' },
            'FATTURATO': { label: 'Fatturato', color: 'bg-teal-100 text-teal-700' },
            'ANNULLATA': { label: 'Annullata', color: 'bg-red-100 text-red-700' },
            'SOSPESA': { label: 'Sospesa', color: 'bg-amber-100 text-amber-700' }
        };
        const statoInfo = stati[visita.stato] || { label: visita.stato, color: 'bg-gray-100 text-gray-700' };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statoInfo.color}`}>
                {statoInfo.label}
            </span>
        );
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Main Header Row */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    {/* Left: Back & Title */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Torna indietro"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>

                        <div className="flex items-center gap-3">
                            {/* Patient Avatar */}
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 
                                          flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                {patientName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'P'}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-lg font-bold text-gray-900">
                                        {patientName || 'Paziente'}
                                    </h1>
                                    {onEditPatient && (
                                        <button
                                            type="button"
                                            onClick={onEditPatient}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                                            title="Modifica anagrafica paziente"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {/* Gender Badge */}
                                    {genderBadge && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${genderBadge.color}`}>
                                            {genderBadge.label}
                                        </span>
                                    )}
                                    {/* Age in years and months */}
                                    {ageDetails && (
                                        <span className="text-sm text-gray-500">
                                            ({ageDetails.years} Anni {ageDetails.months} Mesi)
                                        </span>
                                    )}
                                    {getStatoBadge()}
                                    {/* Version Badge */}
                                    {versioneCorrente && versioneCorrente > 0 && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${versioneCorrente === 1
                                            ? 'bg-gray-100 text-gray-600'
                                            : 'bg-indigo-100 text-indigo-700'
                                            }`}
                                            title={versioneCorrente === 1 ? 'Versione originale' : `Revisione ${versioneCorrente - 1} applicata`}
                                        >
                                            v{versioneCorrente}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                    {/* Birth Date */}
                                    {formattedBirthDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {formattedBirthDate}
                                        </span>
                                    )}
                                    {patientCF && (
                                        <span className="flex items-center gap-1">
                                            <CreditCard className="h-3.5 w-3.5" />
                                            {patientCF}
                                        </span>
                                    )}
                                    {template && (
                                        <span className="flex items-center gap-1 text-teal-600">
                                            <Settings className="h-3.5 w-3.5" />
                                            {template.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Status & Actions */}
                    <div className="flex items-center gap-3">
                        {/* Readonly indicator - elegant banner for completed/cancelled visits */}
                        {isReadonly && visita?.stato === 'COMPLETATA' && (
                            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                                <CheckCircle className="h-4 w-4" />
                                <span className="font-medium">Visita completata</span>
                                <span className="text-emerald-500">•</span>
                                <span className="text-emerald-600">Sola lettura</span>
                            </div>
                        )}
                        {isReadonly && visita?.stato === 'ANNULLATA' && (
                            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-medium">Visita annullata</span>
                                <span className="text-red-400">•</span>
                                <span className="text-red-600">Sola lettura</span>
                            </div>
                        )}
                        {isReadonly && visita?.stato && !['COMPLETATA', 'ANNULLATA'].includes(visita.stato) && (
                            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Sola lettura</span>
                            </div>
                        )}

                        {/* Autosave indicator */}
                        {!isReadonly && (
                            <>
                                {autosave.isSaving && (
                                    <span className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Salvataggio...
                                    </span>
                                )}
                                {autosave.lastSaved && !autosave.isSaving && !autosave.isDirty && (
                                    <span className="flex items-center gap-1 text-sm text-green-600">
                                        <Check className="h-4 w-4" />
                                        Salvato
                                    </span>
                                )}
                                {autosave.isDirty && !autosave.isSaving && (
                                    <span className="flex items-center gap-1 text-sm text-amber-600">
                                        <Clock className="h-4 w-4" />
                                        Non salvato
                                    </span>
                                )}
                            </>
                        )}

                        {/* P61: Queue Actions - solo se visita IN_CORSO e c'è una sessione coda */}
                        {visita?.stato === 'IN_CORSO' && appuntamento?.queueEntryId && (
                            <div className="flex items-center gap-2 border-r border-gray-200 pr-3 mr-1">
                                {/* Chiama o Richiama paziente - in base allo stato entry */}
                                {appuntamento.queueEntryStato === 'IN_ATTESA' && onChiamaPaziente && (
                                    <button
                                        onClick={onChiamaPaziente}
                                        disabled={isQueueLoading}
                                        title="Chiama il paziente dalla sala d'attesa"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg 
                                                 hover:bg-amber-600 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {isQueueLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Phone className="h-4 w-4" />
                                        )}
                                        <span className="hidden sm:inline">Chiama</span>
                                    </button>
                                )}
                                {(appuntamento.queueEntryStato === 'CHIAMATO' || appuntamento.queueEntryStato === 'IN_VISITA') && onRichiamaPaziente && (
                                    <button
                                        onClick={onRichiamaPaziente}
                                        disabled={isQueueLoading}
                                        title="Richiama il paziente dalla sala d'attesa"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg 
                                                 hover:bg-orange-600 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {isQueueLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <PhoneCall className="h-4 w-4" />
                                        )}
                                        <span className="hidden sm:inline">Richiama</span>
                                    </button>
                                )}
                                {/* Vedi Coda */}
                                {onViewQueue && appuntamento.queueSessionId && (
                                    <button
                                        onClick={onViewQueue}
                                        title="Visualizza la coda pazienti"
                                        className="relative flex items-center gap-1.5 px-3 py-1.5 border border-purple-500 text-purple-600 rounded-lg 
                                                 hover:bg-purple-50 transition-colors text-sm"
                                    >
                                        <Users className="h-4 w-4" />
                                        <span className="hidden sm:inline">Coda</span>
                                        {typeof queueInAttesaCount === 'number' && queueInAttesaCount > 0 && (
                                            <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                                                {queueInAttesaCount}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Pulsanti azione in base allo stato visita */}
                        {visita?.stato === 'COMPLETATA' ? (
                            /* Visita Completata - azioni eleganti con separatore */
                            <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-1">
                                <button
                                    onClick={onNuovaVersione}
                                    title="Crea una nuova versione della visita per modificarla"
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-300 text-indigo-600 
                                             rounded-lg hover:bg-indigo-50 transition-all text-xs font-medium"
                                >
                                    <RefreshCcw className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Nuova Versione</span>
                                </button>

                                {/* PDF split button: Referto + Giudizio (MDL only) */}
                                {isMDLVisit && onOpenGiudizioPdf ? (
                                    <PdfSplitButton
                                        onCreateReferto={onCreateReferto}
                                        onOpenGiudizioPdf={onOpenGiudizioPdf}
                                    />
                                ) : (
                                    <button
                                        onClick={onCreateReferto}
                                        title="Visualizza il referto PDF generato"
                                        className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white 
                                                 rounded-lg hover:bg-teal-700 transition-all shadow-md 
                                                 hover:shadow-lg font-semibold text-sm"
                                    >
                                        <FileText className="h-4.5 w-4.5" />
                                        <span className="hidden sm:inline">Referto PDF</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Visita IN_CORSO - mostra Salva Bozza (o Annulla Modifiche se nuova versione) e Salva e Completa */
                            <>
                                {(visita?.stato === 'IN_CORSO' && versioneCorrente && versioneCorrente > 1 && onAnnullaModifiche) ? (
                                    /* Nuova Versione attiva — Annulla Modifiche per ripristinare lo stato COMPLETATA */
                                    <button
                                        onClick={onAnnullaModifiche}
                                        title="Annulla le modifiche e ripristina la versione completata precedente"
                                        className="flex items-center gap-2 px-4 py-2 border border-amber-500 text-amber-600 rounded-lg 
                                                 hover:bg-amber-50 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="hidden sm:inline">Annulla Modifiche</span>
                                    </button>
                                ) : (
                                    /* Salva Bozza - salva senza generare PDF e senza chiudere */
                                    <button
                                        onClick={onSave}
                                        disabled={isReadonly || !autosave.isDirty || autosave.isSaving}
                                        title={isReadonly ? 'Visita non modificabile' :
                                            !autosave.isDirty ? 'Nessuna modifica da salvare' :
                                                'Salva bozza senza generare il referto'}
                                        className="flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-600 rounded-lg 
                                                 hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save className="h-4 w-4" />
                                        <span className="hidden sm:inline">Salva Bozza</span>
                                    </button>
                                )}

                                {/* Salva e Completa - split button con dropdown opzioni (P74) */}
                                <SalvaCompletaMenu
                                    isReadonly={isReadonly}
                                    completionPhase={completionPhase}
                                    invioRefertoMail={invioRefertoMail}
                                    onInvioRefertoMailChange={onInvioRefertoMailChange || (() => { })}
                                    isMDLVisit={isMDLVisit}
                                    saveInvioMailPending={saveInvioMailPending}
                                    marketingDocs={marketingDocs}
                                    onComplete={onComplete}
                                    onCreateReferto={onCreateReferto}
                                    medicoId={visita?.medicoId ?? undefined}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Secondary Row: Contact & Appointment Info + ProfiloSalute toggle */}
	                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 py-2 text-sm">
	                    {/* Patient Contact */}
	                    <div className="flex flex-wrap items-center gap-3 text-gray-600 min-w-0">
	                        {patientPhone && (
	                            <a
	                                href={`tel:${patientPhone}`}
                                className="flex items-center gap-1.5 hover:text-teal-600 transition-colors"
                            >
                                <Phone className="h-4 w-4" />
                                {patientPhone}
                            </a>
                        )}
                        {patientEmail && (
                            <a
                                href={`mailto:${patientEmail}`}
                                className="flex items-center gap-1.5 hover:text-teal-600 transition-colors"
                            >
                                <Mail className="h-4 w-4" />
	                                {patientEmail}
	                            </a>
	                        )}
	                        {isMDLVisit && occupationalSummary && (
	                            <div
	                                className="relative flex flex-wrap items-center gap-2 min-w-0 rounded-lg border border-teal-100 bg-teal-50/70 px-2.5 py-1 text-xs text-slate-700"
                                    onMouseEnter={showOccupationalTooltip}
                                    onMouseLeave={hideOccupationalTooltipDelayed}
                                    onFocus={showOccupationalTooltip}
                                    onBlur={hideOccupationalTooltipDelayed}
	                            >
	                                <ClipboardCheck className="h-3.5 w-3.5 text-teal-600 flex-shrink-0" />
	                                <span className="font-semibold text-slate-800">
	                                    {occupationalSummary.mansione || 'Stato occupazionale'}
	                                </span>
	                                {occupationalTags.slice(0, 6).map(tag => (
	                                    <span key={tag} className="max-w-[220px] truncate text-slate-600">
	                                        {tag}
	                                    </span>
	                                ))}
                                    {occupationalTooltipOpen && (
                                        <div
                                            className="absolute left-0 top-full z-[1600] mt-2 w-[min(92vw,460px)] rounded-xl border border-teal-100 bg-white p-3 text-xs text-slate-700 shadow-xl"
                                            onMouseEnter={() => {
                                                if (occupationalTooltipTimer.current) window.clearTimeout(occupationalTooltipTimer.current);
                                            }}
                                            onMouseLeave={hideOccupationalTooltipDelayed}
                                        >
                                            <div className="mb-2 flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-slate-900">Stato occupazionale</p>
                                                    <p className="text-[11px] text-slate-500">Dettaglio azienda, sede, mansione e rischi</p>
                                                </div>
                                                {onEditOccupationalSummary && (
                                                    <button
                                                        type="button"
                                                        onClick={onEditOccupationalSummary}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-teal-100 px-2 py-1 font-semibold text-teal-700 hover:bg-teal-50"
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                        Modifica
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                                {occupationalDetailRows.map(([label, value]) => (
                                                    <div key={label} className="rounded-lg bg-slate-50 px-2 py-1.5">
                                                        <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
                                                        <p className="font-medium text-slate-800">{value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {!!occupationalSummary.mansioni?.length && (
                                                <div className="mt-2">
                                                    <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Mansioni</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {occupationalSummary.mansioni.map(mansione => (
                                                            <span key={mansione} className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                                                                {mansione}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {!!occupationalSummary.rischi?.length && (
                                                <div className="mt-2">
                                                    <p className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Rischi</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {occupationalSummary.rischi.map(rischio => (
                                                            <span key={rischio} className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                                                                {rischio}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
	                            </div>
	                        )}
	                    </div>

	                    {/* Right: Appointment Info + ProfiloSalute button */}
	                    <div className="flex flex-wrap items-center gap-4 text-gray-600">
                        {(formattedDate || formattedTime2) && (
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {formattedDate}
                                {formattedTime2 && <span className="font-medium">{formattedTime2}</span>}
                            </span>
                        )}
                        <span className="text-teal-600 font-medium">
                            {prestazioneName}
                        </span>
	                        {/* ProfiloSalute toggle button */}
                        {personId && (
                            <button
                                onClick={() => setProfiloExpanded(v => !v)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${profiloExpanded
                                    ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                                    : 'bg-red-50/60 border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200'
                                    }`}
                                title={profiloExpanded ? 'Chiudi Profilo di Salute' : 'Apri Profilo di Salute'}
                            >
                                <Heart className="h-3.5 w-3.5" fill={profiloExpanded ? 'currentColor' : 'none'} />
                                <span>Profilo Salute</span>
                                {profiloExpanded
                                    ? <ChevronUp className="h-3 w-3" />
                                    : <ChevronDown className="h-3 w-3" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* ProfiloSalute expandable panel */}
                {personId && profiloExpanded && (
                    <div className="border-t border-gray-100 pt-2 pb-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                                <Heart className="h-3.5 w-3.5 text-red-400" />
                                Profilo di Salute
                            </span>
                            {onEditProfiloSalute && (
                                <button
                                    onClick={onEditProfiloSalute}
                                    className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 px-2 py-0.5 rounded border border-teal-200 hover:bg-teal-50"
                                >
                                    <Edit2 className="h-3 w-3" />
                                    Modifica
                                </button>
                            )}
                        </div>
                        <ProfiloSaluteCard personId={personId} compact isReadonly hideHeader />
                    </div>
                )}
            </div>
        </header>
    );
};

export default StickyVisitHeader;
