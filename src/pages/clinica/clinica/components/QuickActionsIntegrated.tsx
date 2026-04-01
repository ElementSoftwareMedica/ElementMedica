/**
 * QuickActionsIntegrated - Quick actions panel with integrated expandable menus
 * 
 * All actions are integrated within this single card with expandable inline menus.
 * Each menu item shows a badge with count when there's data available.
 * 
 * Features:
 * - Timer section with start/pause/stop controls
 * - Note Interne section with save functionality and badge indicator
 * - Expandable menus for: Storico, Allergie, Allegati, Versioni, Modulistica, Questionari
 * - Badge indicators on menu items when data is present
 * - "Open full view" option for navigation to dedicated pages
 * 
 * @module pages/clinica/clinica/components/QuickActionsIntegrated
 * @project P52 - Clinical Visit Template System
 * @session #12b - Refactoring with integrated menus
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    History,
    FileText,
    Paperclip,
    TrendingUp,
    AlertTriangle,
    Play,
    Pause,
    Square,
    Timer,
    GitBranch,
    FileStack,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    Save,
    Eye,
    ExternalLink,
    Calendar,
    Clock,
    Image,
    File,
    Plus,
    Upload,
    Loader2,
    ClipboardList, // P61: Questionari Medici
    CheckCircle2, // S68: Firma status
    User, // S68: Firma paziente icon
    Stethoscope, // S68: Firma medico icon
    FileCheck, // S68: PDF quicklook
    FlaskConical, // R20: Laboratorio analisi
    Pencil // R21: Edit allegato
} from 'lucide-react';
import type { TimerState } from '../types';
import { isQuestionarioTipo } from '@/services/questionariService';
import { TIPOLOGIE_CLINICHE_LABELS, documentiCliniciApi, type TipologiaClinicaAllegato } from '../../../../services/clinicaApi';
import { CartellaSanitariaModal } from './CartellaSanitariaModal';
import { AllegatoQuickLookModal, type AllegatoQuickLookItem } from '../../../../components/clinica/AllegatoQuickLookModal';
import { AllegatoEditorModal } from '../../../../components/clinica/AllegatoEditorModal';
import { AllegatiUploadModal } from './AllegatiUploadModal';
import { getMedicoTitle } from '../../../../utils/textFormatters';

// Types for panel data
export interface VisitaRiepilogo {
    id: string;
    dataOra: string;
    prestazione?: { nome: string };
    medico?: { firstName: string; lastName: string };
    stato: string;
}

export interface AllegatoRiepilogo {
    id: string;
    nome: string;
    tipo: 'immagine' | 'documento';
    dataCaricamento: string;
    dimensione?: string;
    url?: string;
    tipologiaClinica?: TipologiaClinicaAllegato | string;
    dataEsecuzione?: string;
    /** P73: true se l'allegato appartiene a una visita collegata (principale o secondaria) */
    fromLinkedVisit?: boolean;
}

export interface RevisioneRiepilogo {
    id: string;
    numeroRevisione: number;
    dataCreazione: string;
    motivo?: string;
    createdBy?: { firstName: string; lastName: string };
}

export interface QuestionarioRiepilogo {
    id: string;
    templateNome: string;
    tipo?: string;
    stato: string;
    dataCompilazione?: string;
    esitoCritico?: boolean;
    punteggioPercentuale?: number;
    richiedeFirma?: boolean;
    richiedeFirmaMedico?: boolean;
    /** S68: Firma status fields */
    firmaPaziente?: string;
    firmaMedico?: string;
    pdfUrl?: string;
}

interface QuickActionsIntegratedProps {
    pazienteId?: string;
    visitaId?: string;
    /** Nome del paziente (per CartellaSanitariaModal) */
    patientName?: string;
    // Navigation handlers for full views
    onViewHistory?: () => void;
    onViewEsamiMicrobio?: () => void;
    onViewRevisions?: () => void;
    onViewModulistica?: () => void;
    // P61: Questionari Medici
    onViewQuestionari?: () => void;
    questionariCount?: number;
    questionariCompilati?: QuestionarioRiepilogo[];
    /** Callback per applicare firme ai questionari selezionati (compilatoIds, tipo firma) */
    onApplicaFirme?: (compilatoIds: string[], tipoFirma: 'paziente' | 'medico') => void;
    isApplicandoFirme?: boolean;
    /** S68: Callback per PDF quicklook di un compilato */
    onViewPdf?: (compilatoId: string, pdfUrl?: string) => void;
    // Handlers for viewing specific items (Session #16)
    onViewVisita?: (visitaId: string) => void;
    onViewRevision?: (revisionId: string) => void;
    // Timer props
    timer?: TimerState;
    formattedTime?: string;
    showTimer?: boolean;
    isTimerReadonly?: boolean;
    /** Disabilita tutte le azioni editoriali (note, allergie, allegati) */
    isReadonly?: boolean;
    onTimerStart?: () => void;
    onTimerPause?: () => void;
    onTimerStop?: () => void;
    // Note Interne props (medico-segreteria communication)
    noteInterne?: string;
    onNoteInterneChange?: (value: string) => void;
    onNoteInterneSave?: () => void;
    isNoteInterneSaving?: boolean;
    // Allergie editable text
    allergieText?: string;
    onAllergieChange?: (value: string) => void;
    onAllergieSave?: () => void;
    isAllergieSaving?: boolean;
    isAllergieSaved?: boolean;
    // Data for inline panels (integrated menus)
    storicoVisite?: VisitaRiepilogo[];
    allegati?: AllegatoRiepilogo[];
    revisioni?: RevisioneRiepilogo[];
    // Loading states
    isLoadingAllergie?: boolean;
    isLoadingStorico?: boolean;
    isLoadingAllegati?: boolean;
    isLoadingRevisioni?: boolean;
    // Auto-expand a section after questionnaire/modulistica compilation
    autoExpandSection?: string | null;
    onAutoExpandHandled?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// MenuItem — defined at module scope to preserve stable component identity
// across parent renders. Defining it inside the parent function body causes
// React to unmount/remount children (e.g. textarea) on every state change.
// ─────────────────────────────────────────────────────────────────────────────
interface MenuItemProps {
    id: string;
    icon: React.ElementType;
    label: string;
    color: string;
    badge?: number;
    isLoading?: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    onOpenFull?: () => void;
    children: React.ReactNode;
}

const MenuItem = React.memo(({
    icon: Icon,
    label,
    color,
    badge,
    isLoading,
    isExpanded,
    onToggle,
    onOpenFull,
    children,
}: MenuItemProps) => {
    return (
        <div className="border-b border-gray-100 last:border-b-0">
            {/* Use div with role="button" to avoid nested button warning */}
            <div
                role="button"
                tabIndex={0}
                onClick={onToggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle();
                    }
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 
                         hover:bg-gray-50 transition-colors group cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <Icon className={`h-4.5 w-4.5 ${color} group-hover:scale-110 transition-transform`} />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    {badge !== undefined && badge > 0 && (
                        <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full 
                                       ${color.replace('text-', 'bg-').replace('-500', '-100')} ${color}`}>
                            {badge}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {onOpenFull && isExpanded && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenFull();
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Apri vista completa"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                        </div>
                    ) : (
                        children
                    )}
                </div>
            )}
        </div>
    );
});
MenuItem.displayName = 'MenuItem';

export const QuickActionsIntegrated: React.FC<QuickActionsIntegratedProps> = ({
    pazienteId,
    visitaId,
    patientName,
    onViewHistory,
    onViewEsamiMicrobio,
    onViewRevisions,
    onViewModulistica,
    onViewQuestionari,
    questionariCount = 0,
    questionariCompilati = [],
    onApplicaFirme,
    isApplicandoFirme = false,
    onViewPdf,
    onViewVisita,
    onViewRevision,
    timer,
    formattedTime,
    showTimer = false,
    isTimerReadonly = false,
    isReadonly = false,
    onTimerStart,
    onTimerPause,
    onTimerStop,
    noteInterne = '',
    onNoteInterneChange,
    onNoteInterneSave,
    isNoteInterneSaving = false,
    allergieText = '',
    onAllergieChange,
    onAllergieSave,
    isAllergieSaving = false,
    isAllergieSaved = false,
    storicoVisite = [],
    allegati = [],
    revisioni = [],
    isLoadingAllergie = false,
    isLoadingStorico = false,
    isLoadingAllegati = false,
    isLoadingRevisioni = false,
    autoExpandSection = null,
    onAutoExpandHandled
}) => {
    // State for which menus are expanded
    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

    // State for notes section
    const [isNotesExpanded, setIsNotesExpanded] = useState(false);
    const [localNoteInterne, setLocalNoteInterne] = useState(noteInterne);

    // Cartella Sanitaria modal
    const [showCartellaSanitaria, setShowCartellaSanitaria] = useState(false);

    // R20: Allegato QuickLook
    const [quickLookAllegato, setQuickLookAllegato] = useState<AllegatoQuickLookItem | null>(null);

    // R21: Allegato Editor
    const [editAllegato, setEditAllegato] = useState<AllegatoQuickLookItem | null>(null);

    // R21: Inline upload modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    // Drag & drop for inline allegati upload box
    const [isInlineDragging, setIsInlineDragging] = useState(false);
    const [inlineDroppedFiles, setInlineDroppedFiles] = useState<File[]>([]);
    // Laboratorio / Microbiologici upload modals
    const [showLabUploadModal, setShowLabUploadModal] = useState(false);
    const inlineFileInputRef = useRef<HTMLInputElement>(null);

    const queryClient = useQueryClient();

    const handleInlineUploadComplete = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['allegati-visita', visitaId] });
    }, [queryClient, visitaId]);

    // Drag & drop handlers for inline allegati upload box
    const handleInlineDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsInlineDragging(true);
    }, []);

    const handleInlineDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsInlineDragging(false);
    }, []);

    const handleInlineDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsInlineDragging(false);
        const dropped = Array.from(e.dataTransfer.files);
        if (dropped.length > 0) {
            setInlineDroppedFiles(dropped);
            setShowUploadModal(true);
        }
    }, []);

    // R20: Laboratorio Analisi — fetch all esami from allegati paziente
    const { data: allegatiLaboratorio = [], isLoading: isLoadingLaboratorio } = useQuery({
        queryKey: ['allegati-laboratorio', pazienteId],
        queryFn: () => documentiCliniciApi.getAllegatiPaziente(
            pazienteId!,
            ['ESAMI_SANGUE', 'ECG', 'AUDIOMETRIA', 'SPIROMETRIA', 'RADIOGRAFIA', 'ESAMI_URINE']
        ),
        enabled: !!pazienteId,
        staleTime: 120_000,
        select: (data) => (data as unknown as AllegatoRiepilogo[]) ?? [],
    });

    // State for bulk-sign questionnaire selection — pre-select all firmable docs
    const [selectedQuestionariIds, setSelectedQuestionariIds] = useState<Set<string>>(new Set());

    // S68: Pre-select all firmable (compiled) questionari/modulistica checkboxes
    useEffect(() => {
        if (questionariCompilati.length > 0) {
            const firmabiliIds = questionariCompilati
                .filter(q => q.stato === 'DA_FIRMARE' || q.stato === 'FIRMATO_PAZIENTE' || q.stato === 'FIRMATO_MEDICO')
                .map(q => q.id);
            if (firmabiliIds.length > 0) {
                setSelectedQuestionariIds(new Set(firmabiliIds));
            }
        }
    }, [questionariCompilati]);

    // Auto-expand section after compilation
    useEffect(() => {
        if (autoExpandSection) {
            setExpandedMenus(prev => {
                const newSet = new Set(prev);
                newSet.add(autoExpandSection);
                return newSet;
            });
            onAutoExpandHandled?.();
        }
    }, [autoExpandSection, onAutoExpandHandled]);

    const toggleQuestionarioSelection = useCallback((id: string) => {
        setSelectedQuestionariIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    // Toggle menu expansion
    const toggleMenu = useCallback((menuId: string) => {
        setExpandedMenus(prev => {
            const newSet = new Set(prev);
            if (newSet.has(menuId)) {
                newSet.delete(menuId);
            } else {
                newSet.add(menuId);
            }
            return newSet;
        });
    }, []);

    // Handle local changes and sync with parent
    const handleNoteChange = useCallback((value: string) => {
        setLocalNoteInterne(value);
        onNoteInterneChange?.(value);
    }, [onNoteInterneChange]);

    // Helper to format date
    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // Helper to get stato color for visite
    const getVisitaStatoColor = (stato: string) => {
        switch (stato) {
            case 'COMPLETATA':
                return 'bg-green-100 text-green-700';
            case 'IN_CORSO':
                return 'bg-blue-100 text-blue-700';
            case 'ANNULLATA':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    // Menu item component — extracted to module scope to prevent React unmount/remount on each render
    // (see MenuItemComponent defined below the main component)
    return (
        <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-sm font-semibold text-gray-700">Azioni Rapide</h3>
                </div>

                {/* Timer Section */}
                {showTimer && timer && (
                    <div className={`px-4 py-3 border-b border-gray-100 ${isTimerReadonly ? 'bg-gray-50' : 'bg-gradient-to-r from-teal-50 to-blue-50'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Timer className={`h-5 w-5 ${timer.isRunning ? 'text-teal-600 animate-pulse' : isTimerReadonly ? 'text-gray-500' : 'text-gray-400'}`} />
                                <span className="text-lg font-mono font-bold text-gray-900">
                                    {formattedTime || '00:00:00'}
                                </span>
                            </div>
                            {!isTimerReadonly && (
                                <div className="flex items-center gap-1">
                                    {!timer.isRunning ? (
                                        <button
                                            onClick={onTimerStart}
                                            className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                                            title="Avvia timer"
                                        >
                                            <Play className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={onTimerPause}
                                            className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                                            title="Pausa timer"
                                        >
                                            <Pause className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={onTimerStop}
                                        disabled={timer.elapsedSeconds === 0}
                                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors 
                                             disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Ferma e registra durata"
                                    >
                                        <Square className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                            {isTimerReadonly
                                ? 'Durata registrata della visita'
                                : timer.isRunning ? 'Visita in corso...' : timer.elapsedSeconds > 0 ? 'Timer in pausa' : 'Timer fermo'}
                        </div>
                    </div>
                )}

                {/* Note Interne Section with Badge */}
                <div className="border-b border-gray-100">
                    <button
                        type="button"
                        onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-medium text-gray-700">Note Interne</span>
                            {/* Badge when notes are present */}
                            {localNoteInterne && localNoteInterne.trim() && (
                                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-600">
                                    1
                                </span>
                            )}
                        </div>
                        {isNotesExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </button>

                    {isNotesExpanded && (
                        <div className="px-4 pb-3 bg-amber-50/30">
                            <textarea
                                value={localNoteInterne}
                                onChange={(e) => handleNoteChange(e.target.value)}
                                placeholder="Note per la segreteria (non visibili al paziente)..."
                                rows={3}
                                readOnly={isReadonly}
                                disabled={isReadonly}
                                className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg 
                                     focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400
                                     resize-none placeholder:text-gray-400 ${isReadonly ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                            />
                            {onNoteInterneSave && !isReadonly && (
                                <button
                                    onClick={onNoteInterneSave}
                                    disabled={isNoteInterneSaving}
                                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 
                                         bg-amber-500 text-white text-sm font-medium rounded-lg
                                         hover:bg-amber-600 transition-colors
                                         disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    {isNoteInterneSaving ? 'Salvataggio...' : 'Salva Nota'}
                                </button>
                            )}
                            <p className="mt-1.5 text-xs text-gray-400 italic">
                                Comunicazione interna medico-segreteria
                            </p>
                        </div>
                    )}
                </div>

                {/* Integrated Menus */}
                <div className="divide-y divide-gray-100">

                    {/* Storico Visita Menu - Shows revisions of current visit with last modification */}
                    <MenuItem
                        id="storico"
                        isExpanded={expandedMenus.has('storico')}
                        onToggle={() => toggleMenu('storico')}
                        icon={History}
                        label="Storico Visita"
                        color="text-blue-500"
                        badge={revisioni.length}
                        isLoading={isLoadingRevisioni}
                        onOpenFull={onViewRevisions}
                    >
                        {revisioni.length === 0 ? (
                            <div className="px-3 py-3 text-center text-sm text-gray-500">
                                Nessuna revisione precedente
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto">
                                {/* Show last modification date at the top */}
                                {revisioni.length > 0 && (
                                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100">
                                        <div className="flex items-center gap-1.5 text-xs text-blue-600">
                                            <Clock className="h-3 w-3" />
                                            <span>Ultima modifica: {formatDate(revisioni[0].dataCreazione)}</span>
                                        </div>
                                    </div>
                                )}
                                {revisioni.slice(0, 5).map((rev, index) => (
                                    <div
                                        key={rev.id}
                                        className={`px-3 py-2 hover:bg-gray-100/50 cursor-pointer ${index > 0 ? 'border-t border-gray-100' : ''}`}
                                        onClick={() => onViewRevision?.(rev.id)}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs font-medium text-gray-900">
                                                Versione {rev.numeroRevisione}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                {formatDate(rev.dataCreazione)}
                                            </span>
                                        </div>
                                        {rev.motivo && (
                                            <div className="text-[10px] text-gray-600 truncate">
                                                {rev.motivo}
                                            </div>
                                        )}
                                        {rev.createdBy && (
                                            <div className="text-[10px] text-gray-500">
                                                {getMedicoTitle((rev.createdBy as { gender?: string }).gender as 'MALE' | 'FEMALE' | undefined)} {rev.createdBy.lastName}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {revisioni.length > 5 && (
                                    <div className="px-3 py-2 text-center text-xs text-blue-600 border-t border-gray-100 cursor-pointer hover:bg-blue-50"
                                        onClick={onViewRevisions}>
                                        + altre {revisioni.length - 5} revisioni →
                                    </div>
                                )}
                            </div>
                        )}
                    </MenuItem>

                    {/* Visite Precedenti Menu - Shows patient's past visits (access controlled) */}
                    <MenuItem
                        id="referti"
                        isExpanded={expandedMenus.has('referti')}
                        onToggle={() => toggleMenu('referti')}
                        icon={FileText}
                        label="Visite Precedenti"
                        color="text-purple-500"
                        badge={storicoVisite.length}
                        isLoading={isLoadingStorico}
                        onOpenFull={pazienteId ? () => setShowCartellaSanitaria(true) : onViewHistory}
                    >
                        {storicoVisite.length === 0 ? (
                            <div className="px-3 py-3 text-center text-sm text-gray-500">
                                Nessuna visita precedente
                            </div>
                        ) : (
                            <div className="max-h-40 overflow-y-auto">
                                {storicoVisite.slice(0, 5).map((v, index) => (
                                    <div
                                        key={v.id}
                                        className={`px-3 py-2 hover:bg-gray-100/50 cursor-pointer ${index > 0 ? 'border-t border-gray-100' : ''}`}
                                        onClick={() => onViewVisita?.(v.id)}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3 text-gray-400" />
                                                <span className="text-xs font-medium text-gray-900">
                                                    {formatDate(v.dataOra)}
                                                </span>
                                            </div>
                                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${getVisitaStatoColor(v.stato)}`}>
                                                {v.stato.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600 truncate">
                                            {v.prestazione?.nome || 'Visita'}
                                        </div>
                                        {v.medico && (
                                            <div className="text-[10px] text-gray-500">
                                                {getMedicoTitle((v.medico as { gender?: string }).gender as 'MALE' | 'FEMALE' | undefined)} {v.medico.lastName} {v.medico.firstName}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {storicoVisite.length > 5 && (
                                    <div className="px-3 py-2 text-center text-xs text-purple-600 border-t border-gray-100 cursor-pointer hover:bg-purple-50"
                                        onClick={() => pazienteId ? setShowCartellaSanitaria(true) : onViewHistory?.()}>
                                        + altre {storicoVisite.length - 5} visite →
                                    </div>
                                )}
                            </div>
                        )}
                    </MenuItem>

                    {/* R20: Laboratorio Analisi — esami di laboratorio / strumentali del paziente */}
                    <MenuItem
                        id="laboratorio"
                        isExpanded={expandedMenus.has('laboratorio')}
                        onToggle={() => toggleMenu('laboratorio')}
                        icon={FlaskConical}
                        label="Laboratorio"
                        color="text-emerald-500"
                        badge={allegatiLaboratorio.length}
                        isLoading={isLoadingLaboratorio}
                    >
                        {/* Carica esami button */}
                        {!isReadonly && visitaId && (
                            <div className="px-3 pt-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowLabUploadModal(true)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Carica esami
                                </button>
                            </div>
                        )}
                        {allegatiLaboratorio.length === 0 ? (
                            <div className="px-3 py-3 text-center text-sm text-gray-500">
                                Nessun esame di laboratorio registrato
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto">
                                {allegatiLaboratorio.slice(0, 6).map((a, idx) => (
                                    <div
                                        key={a.id}
                                        className={`px-3 py-2 hover:bg-gray-100/50 cursor-pointer flex items-start justify-between gap-2 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                                        onClick={() => setQuickLookAllegato({ id: a.id, nome: a.nome, tipo: a.tipo, url: a.url, dataCaricamento: a.dataCaricamento, tipologiaClinica: a.tipologiaClinica as string | undefined, dataEsecuzione: a.dataEsecuzione, dimensione: a.dimensione })}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-gray-800 truncate">{a.nome}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                {a.tipologiaClinica && (
                                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded-full border border-emerald-200">
                                                        {TIPOLOGIE_CLINICHE_LABELS[a.tipologiaClinica as TipologiaClinicaAllegato] ?? a.tipologiaClinica}
                                                    </span>
                                                )}
                                                {a.dataEsecuzione && (
                                                    <span className="text-[10px] text-gray-500">
                                                        {new Date(a.dataEsecuzione).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {a.url && (
                                            <a
                                                href={a.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="flex-shrink-0 p-1 hover:bg-emerald-50 rounded text-gray-400 hover:text-emerald-600"
                                                title="Visualizza"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                ))}
                                {allegatiLaboratorio.length > 6 && (
                                    <div className="px-3 py-2 text-center text-xs text-emerald-600 border-t border-gray-100">
                                        +{allegatiLaboratorio.length - 6} altri esami
                                    </div>
                                )}
                            </div>
                        )}
                    </MenuItem>

                    {/* Esami Microbiologici Menu */}
                    <MenuItem
                        id="esami-microbio"
                        isExpanded={expandedMenus.has('esami-microbio')}
                        onToggle={() => toggleMenu('esami-microbio')}
                        icon={TrendingUp}
                        label="Esami Microbiologici"
                        color="text-green-500"
                    >
                        <div className="px-3 py-3 space-y-2">
                            {!isReadonly && visitaId && (
                                <button
                                    type="button"
                                    onClick={() => setShowLabUploadModal(true)}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Carica esame microbiologico
                                </button>
                            )}
                            <p className="text-xs text-gray-500 text-center">
                                Usa il pulsante per caricare referti microbiologici alla visita corrente
                            </p>
                        </div>
                    </MenuItem>

                    {/* Allergie Menu - Editable */}
                    <MenuItem
                        id="allergie"
                        isExpanded={expandedMenus.has('allergie')}
                        onToggle={() => toggleMenu('allergie')}
                        icon={AlertTriangle}
                        label="Allergie"
                        color="text-red-500"
                        badge={allergieText?.trim() ? 1 : 0}
                        isLoading={isLoadingAllergie}
                    >
                        <div className="px-3 py-2 bg-red-50/30">
                            <textarea
                                value={allergieText}
                                onChange={(e) => onAllergieChange?.(e.target.value)}
                                placeholder="Segnala allergie del paziente (es. penicillina, lattice, FANS...)"
                                rows={3}
                                readOnly={isReadonly}
                                disabled={isReadonly}
                                className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                                     focus:ring-2 focus:ring-red-500/20 focus:border-red-400
                                     resize-none placeholder:text-gray-400 ${isReadonly ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
                            />
                            {onAllergieSave && !isReadonly && (
                                <button
                                    onClick={onAllergieSave}
                                    disabled={isAllergieSaving || isAllergieSaved}
                                    className={`mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5
                                         text-white text-sm font-medium rounded-lg
                                         transition-colors
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         ${isAllergieSaved ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    {isAllergieSaving ? 'Salvataggio...' : isAllergieSaved ? '✓ Salvato' : 'Salva Allergie'}
                                </button>
                            )}
                            <p className="mt-1.5 text-xs text-gray-400 italic">
                                Informazioni visibili in tutte le visite del paziente
                            </p>
                        </div>
                    </MenuItem>

                    {/* Allegati Menu (Unified: Images + Documents) */}
                    <MenuItem
                        id="allegati"
                        isExpanded={expandedMenus.has('allegati')}
                        onToggle={() => toggleMenu('allegati')}
                        icon={Paperclip}
                        label="Allegati"
                        color="text-pink-500"
                        badge={allegati.length}
                        isLoading={isLoadingAllegati}
                    >
                        <div className="p-2 space-y-2">
                            {/* Inline upload area — always visible, no extra button needed */}
                            {!isReadonly && visitaId && (
                                <div
                                    onClick={() => setShowUploadModal(true)}
                                    onDragOver={handleInlineDragOver}
                                    onDragLeave={handleInlineDragLeave}
                                    onDrop={handleInlineDrop}
                                    className={`flex flex-col items-center justify-center gap-1.5 px-3 py-4 min-h-[72px] border-2 border-dashed rounded-xl cursor-pointer transition-all group ${isInlineDragging
                                        ? 'border-pink-500 bg-pink-50 scale-[0.99]'
                                        : 'border-pink-200 hover:border-pink-400 hover:bg-pink-50/50'
                                        }`}
                                >
                                    <Upload className={`h-5 w-5 flex-shrink-0 transition-colors ${isInlineDragging ? 'text-pink-600 scale-110' : 'text-pink-400 group-hover:text-pink-600'}`} />
                                    {isInlineDragging ? (
                                        <span className="text-xs font-semibold text-pink-600 animate-pulse">Rilascia il file qui</span>
                                    ) : (
                                        <>
                                            <span className="text-xs font-medium text-pink-500 group-hover:text-pink-700 transition-colors text-center leading-tight">
                                                Clicca o trascina un file
                                            </span>
                                            <span className="text-[10px] text-pink-400 group-hover:text-pink-500 transition-colors">
                                                Immagini, PDF, documenti
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Allegati list */}
                            {allegati.length === 0 ? (
                                <div className="py-2 text-center text-xs text-gray-500">
                                    Nessun allegato presente
                                </div>
                            ) : (
                                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                    {allegati.map((a) => (
                                        <div
                                            key={a.id}
                                            className="px-2 py-1.5 flex items-center gap-2 hover:bg-gray-50 group/allegato"
                                        >
                                            {/* Icon */}
                                            <div
                                                className="cursor-pointer flex-shrink-0"
                                                onClick={() => setQuickLookAllegato({ id: a.id, nome: a.nome, tipo: a.tipo, url: a.url, dataCaricamento: a.dataCaricamento, tipologiaClinica: a.tipologiaClinica as string | undefined, dataEsecuzione: a.dataEsecuzione, dimensione: a.dimensione })}
                                            >
                                                {a.tipo === 'immagine' ? (
                                                    <Image className="h-3.5 w-3.5 text-pink-500" />
                                                ) : (
                                                    <File className="h-3.5 w-3.5 text-blue-500" />
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => setQuickLookAllegato({ id: a.id, nome: a.nome, tipo: a.tipo, url: a.url, dataCaricamento: a.dataCaricamento, tipologiaClinica: a.tipologiaClinica as string | undefined, dataEsecuzione: a.dataEsecuzione, dimensione: a.dimensione })}
                                            >
                                                <div className="text-xs font-medium text-gray-900 truncate flex items-center gap-1">
                                                    <span className="truncate">{a.nome}</span>
                                                    {/* P73: badge per allegati dalla visita collegata */}
                                                    {a.fromLinkedVisit && (
                                                        <span className="flex-shrink-0 text-[9px] font-semibold bg-violet-100 text-violet-700 rounded px-1 py-0.5 leading-none">
                                                            Collegata
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-gray-500 flex items-center gap-1 flex-wrap">
                                                    <span>{formatDate(a.dataCaricamento)}</span>
                                                    {a.dimensione && <><span>•</span><span>{a.dimensione}</span></>}
                                                    {a.tipologiaClinica && (
                                                        <><span>•</span><span className="text-teal-600 font-medium">{TIPOLOGIE_CLINICHE_LABELS[a.tipologiaClinica as TipologiaClinicaAllegato] ?? a.tipologiaClinica}</span></>
                                                    )}
                                                    {a.dataEsecuzione && (
                                                        <><span>•</span><span className="text-gray-600">{formatDate(a.dataEsecuzione)}</span></>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Actions: quicklook + edit */}
                                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover/allegato:opacity-100 transition-opacity">
                                                <button
                                                    title="Anteprima"
                                                    onClick={() => setQuickLookAllegato({ id: a.id, nome: a.nome, tipo: a.tipo, url: a.url, dataCaricamento: a.dataCaricamento, tipologiaClinica: a.tipologiaClinica as string | undefined, dataEsecuzione: a.dataEsecuzione, dimensione: a.dimensione })}
                                                    className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                </button>
                                                {!isReadonly && (a.tipo === 'immagine' || (a.url && /\.pdf$/i.test(a.url))) && (
                                                    <button
                                                        title="Modifica"
                                                        onClick={() => setEditAllegato({ id: a.id, nome: a.nome, tipo: a.tipo, url: a.url, dataCaricamento: a.dataCaricamento, tipologiaClinica: a.tipologiaClinica as string | undefined, dataEsecuzione: a.dataEsecuzione, dimensione: a.dimensione })}
                                                        className="p-1 rounded hover:bg-teal-50 text-gray-400 hover:text-teal-600"
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </MenuItem>

                    {/* Questionari Medici - Sezione dedicata */}
                    <MenuItem
                        id="questionari"
                        isExpanded={expandedMenus.has('questionari')}
                        onToggle={() => toggleMenu('questionari')}
                        icon={ClipboardList}
                        label="Questionari"
                        color="text-teal-500"
                        badge={questionariCompilati.filter(q => isQuestionarioTipo(q.tipo)).length || 0}
                        onOpenFull={onViewQuestionari}
                    >
                        {(() => {
                            const questionariItems = questionariCompilati.filter(q => isQuestionarioTipo(q.tipo));
                            // S68: Only show firma buttons for docs whose template actually requires that signature type
                            const needsFirmaPaziente = questionariItems.filter(q =>
                                q.richiedeFirma && !q.firmaPaziente &&
                                ['DA_FIRMARE', 'FIRMATO_MEDICO'].includes(q.stato)
                            );
                            const needsFirmaMedico = questionariItems.filter(q =>
                                q.richiedeFirmaMedico && !q.firmaMedico &&
                                ['DA_FIRMARE', 'FIRMATO_PAZIENTE'].includes(q.stato)
                            );
                            const firmabili = questionariItems.filter(q => q.stato === 'DA_FIRMARE' || q.stato === 'FIRMATO_PAZIENTE' || q.stato === 'FIRMATO_MEDICO');
                            const selectedFirmabili = firmabili.filter(q => selectedQuestionariIds.has(q.id));
                            const selectedNeedsPaz = needsFirmaPaziente.filter(q => selectedQuestionariIds.has(q.id));
                            const selectedNeedsMed = needsFirmaMedico.filter(q => selectedQuestionariIds.has(q.id));

                            return questionariItems.length > 0 ? (
                                <div>
                                    {/* S70: Clickable unsigned docs warning — one-click firma application */}
                                    {onApplicaFirme && (needsFirmaPaziente.length > 0 || needsFirmaMedico.length > 0) && (
                                        <div className="px-3 py-2 bg-orange-50 border-b border-orange-200">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                                                <span className="text-xs font-medium text-orange-800">
                                                    {needsFirmaPaziente.length + needsFirmaMedico.length} {(needsFirmaPaziente.length + needsFirmaMedico.length) === 1 ? 'firma mancante' : 'firme mancanti'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {needsFirmaMedico.length > 0 && (
                                                    <button
                                                        onClick={() => onApplicaFirme(needsFirmaMedico.map(q => q.id), 'medico')}
                                                        disabled={isApplicandoFirme}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-teal-600 hover:bg-teal-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isApplicandoFirme ? <Loader2 className="w-3 h-3 animate-spin" /> : <Stethoscope className="w-3 h-3" />}
                                                        Firma Medico ({needsFirmaMedico.length})
                                                    </button>
                                                )}
                                                {needsFirmaPaziente.length > 0 && (
                                                    <button
                                                        onClick={() => onApplicaFirme(needsFirmaPaziente.map(q => q.id), 'paziente')}
                                                        disabled={isApplicandoFirme}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isApplicandoFirme ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}
                                                        Firma Paziente ({needsFirmaPaziente.length})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                                        {questionariItems.map((q) => {
                                            return (
                                                <div key={q.id} className="px-3 py-2.5 hover:bg-gray-50">
                                                    {/* Title — full width */}
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <ClipboardList className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
                                                        <span className="font-medium text-gray-900 text-xs leading-snug">{q.templateNome}</span>
                                                    </div>
                                                    {/* Actions line: date, firma status, pdf, badge */}
                                                    <div className="flex items-center gap-1.5 ml-5 flex-wrap">
                                                        {q.dataCompilazione && (
                                                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {new Date(q.dataCompilazione).toLocaleDateString('it-IT')}
                                                            </span>
                                                        )}
                                                        {q.richiedeFirma && (
                                                            <span className={`flex items-center gap-0.5 text-[10px] ${q.firmaPaziente ? 'text-green-600' : 'text-orange-500'}`}
                                                                title={q.firmaPaziente ? 'Firma paziente acquisita' : 'Firma paziente mancante'}>
                                                                <User className="w-2.5 h-2.5" />
                                                                {q.firmaPaziente ? <CheckCircle2 className="w-2.5 h-2.5" /> : '!'}
                                                            </span>
                                                        )}
                                                        {q.richiedeFirmaMedico && (
                                                            <span className={`flex items-center gap-0.5 text-[10px] ${q.firmaMedico ? 'text-green-600' : 'text-orange-500'}`}
                                                                title={q.firmaMedico ? 'Firma medico acquisita' : 'Firma medico mancante'}>
                                                                <Stethoscope className="w-2.5 h-2.5" />
                                                                {q.firmaMedico ? <CheckCircle2 className="w-2.5 h-2.5" /> : '!'}
                                                            </span>
                                                        )}
                                                        {q.esitoCritico && (
                                                            <span title="Esito critico"><AlertTriangle className="w-3 h-3 text-red-500" /></span>
                                                        )}
                                                        <div className="ml-auto flex items-center gap-1">
                                                            {onViewPdf && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onViewPdf(q.id, q.pdfUrl); }}
                                                                    className={`p-0.5 rounded ${q.pdfUrl ? 'text-teal-500 hover:text-teal-700' : 'text-gray-300 hover:text-gray-400'}`}
                                                                    title={q.pdfUrl ? 'Anteprima PDF' : 'PDF non ancora generato'}
                                                                >
                                                                    <FileCheck className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${q.stato === 'COMPLETATO' ? 'bg-green-100 text-green-700' :
                                                                q.stato === 'BOZZA' ? 'bg-yellow-100 text-yellow-700' :
                                                                    q.stato === 'DA_FIRMARE' ? 'bg-orange-100 text-orange-700' :
                                                                        q.stato === 'FIRMATO_PAZIENTE' ? 'bg-blue-100 text-blue-700' :
                                                                            q.stato === 'FIRMATO_MEDICO' ? 'bg-teal-100 text-teal-700' :
                                                                                'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                {q.stato === 'COMPLETATO' ? 'Completato' :
                                                                    q.stato === 'BOZZA' ? 'Bozza' :
                                                                        q.stato === 'DA_FIRMARE' ? 'Da firmare' :
                                                                            q.stato === 'FIRMATO_PAZIENTE' ? 'Firmato Paz.' :
                                                                                q.stato === 'FIRMATO_MEDICO' ? 'Firmato Med.' :
                                                                                    q.stato}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-center border-t border-gray-100">
                                        <button onClick={onViewQuestionari} className="text-teal-600 hover:text-teal-700 text-xs font-medium">
                                            Tutti i questionari →
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-3 py-3 text-center">
                                    <p className="mb-2 text-xs text-gray-500">Nessun questionario compilato</p>
                                    <button onClick={onViewQuestionari} className="text-teal-600 hover:text-teal-700 font-medium text-xs">
                                        Compila questionario →
                                    </button>
                                </div>
                            );
                        })()}
                    </MenuItem>

                    {/* Modulistica - Sezione dedicata */}
                    <MenuItem
                        id="modulistica"
                        isExpanded={expandedMenus.has('modulistica')}
                        onToggle={() => toggleMenu('modulistica')}
                        icon={FileStack}
                        label="Modulistica"
                        color="text-indigo-500"
                        badge={questionariCompilati.filter(q => !isQuestionarioTipo(q.tipo)).length || 0}
                        onOpenFull={onViewModulistica}
                    >
                        {(() => {
                            const modulisticaItems = questionariCompilati.filter(q => !isQuestionarioTipo(q.tipo));
                            // S68: Conditional firma buttons based on template requirements
                            const modNeedsFirmaPaz = modulisticaItems.filter(q =>
                                q.richiedeFirma && !q.firmaPaziente &&
                                ['DA_FIRMARE', 'FIRMATO_MEDICO'].includes(q.stato)
                            );
                            const modNeedsFirmaMed = modulisticaItems.filter(q =>
                                q.richiedeFirmaMedico && !q.firmaMedico &&
                                ['DA_FIRMARE', 'FIRMATO_PAZIENTE'].includes(q.stato)
                            );
                            const modulisticaFirmabili = modulisticaItems.filter(q => ['DA_FIRMARE', 'FIRMATO_PAZIENTE', 'FIRMATO_MEDICO'].includes(q.stato));
                            const selectedModFirmabili = modulisticaFirmabili.filter(q => selectedQuestionariIds.has(q.id));
                            const selectedModNeedsPaz = modNeedsFirmaPaz.filter(q => selectedQuestionariIds.has(q.id));
                            const selectedModNeedsMed = modNeedsFirmaMed.filter(q => selectedQuestionariIds.has(q.id));

                            return modulisticaItems.length > 0 ? (
                                <div>
                                    {/* S70: Clickable unsigned docs warning — one-click firma application */}
                                    {onApplicaFirme && (modNeedsFirmaPaz.length > 0 || modNeedsFirmaMed.length > 0) && (
                                        <div className="px-3 py-2 bg-orange-50 border-b border-orange-200">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                                                <span className="text-xs font-medium text-orange-800">
                                                    {modNeedsFirmaPaz.length + modNeedsFirmaMed.length} {(modNeedsFirmaPaz.length + modNeedsFirmaMed.length) === 1 ? 'firma mancante' : 'firme mancanti'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {modNeedsFirmaMed.length > 0 && (
                                                    <button
                                                        onClick={() => onApplicaFirme(modNeedsFirmaMed.map(q => q.id), 'medico')}
                                                        disabled={isApplicandoFirme}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-teal-600 hover:bg-teal-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isApplicandoFirme ? <Loader2 className="w-3 h-3 animate-spin" /> : <Stethoscope className="w-3 h-3" />}
                                                        Firma Medico ({modNeedsFirmaMed.length})
                                                    </button>
                                                )}
                                                {modNeedsFirmaPaz.length > 0 && (
                                                    <button
                                                        onClick={() => onApplicaFirme(modNeedsFirmaPaz.map(q => q.id), 'paziente')}
                                                        disabled={isApplicandoFirme}
                                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {isApplicandoFirme ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}
                                                        Firma Paziente ({modNeedsFirmaPaz.length})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                                        {modulisticaItems.map((q) => {
                                            return (
                                                <div key={q.id} className="px-3 py-2.5 hover:bg-gray-50">
                                                    {/* Title — full width */}
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <FileStack className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                                        <span className="font-medium text-gray-900 text-xs leading-snug">{q.templateNome}</span>
                                                    </div>
                                                    {/* Actions line: date, firma status, pdf, badge */}
                                                    <div className="flex items-center gap-1.5 ml-5 flex-wrap">
                                                        {q.dataCompilazione && (
                                                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                                                <Clock className="w-2.5 h-2.5" />
                                                                {new Date(q.dataCompilazione).toLocaleDateString('it-IT')}
                                                            </span>
                                                        )}
                                                        {q.richiedeFirma && (
                                                            <span className={`flex items-center gap-0.5 text-[10px] ${q.firmaPaziente ? 'text-green-600' : 'text-orange-500'}`}
                                                                title={q.firmaPaziente ? 'Firma paziente acquisita' : 'Firma paziente mancante'}>
                                                                <User className="w-2.5 h-2.5" />
                                                                {q.firmaPaziente ? <CheckCircle2 className="w-2.5 h-2.5" /> : '!'}
                                                            </span>
                                                        )}
                                                        {q.richiedeFirmaMedico && (
                                                            <span className={`flex items-center gap-0.5 text-[10px] ${q.firmaMedico ? 'text-green-600' : 'text-orange-500'}`}
                                                                title={q.firmaMedico ? 'Firma medico acquisita' : 'Firma medico mancante'}>
                                                                <Stethoscope className="w-2.5 h-2.5" />
                                                                {q.firmaMedico ? <CheckCircle2 className="w-2.5 h-2.5" /> : '!'}
                                                            </span>
                                                        )}
                                                        <div className="ml-auto flex items-center gap-1">
                                                            {onViewPdf && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onViewPdf(q.id, q.pdfUrl); }}
                                                                    className={`p-0.5 rounded ${q.pdfUrl ? 'text-indigo-500 hover:text-indigo-700' : 'text-gray-300 hover:text-gray-400'}`}
                                                                    title={q.pdfUrl ? 'Anteprima PDF' : 'PDF non ancora generato'}
                                                                >
                                                                    <FileCheck className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${q.stato === 'COMPLETATO' ? 'bg-green-100 text-green-700' :
                                                                q.stato === 'BOZZA' ? 'bg-yellow-100 text-yellow-700' :
                                                                    q.stato === 'DA_FIRMARE' ? 'bg-orange-100 text-orange-700' :
                                                                        q.stato === 'FIRMATO_PAZIENTE' ? 'bg-blue-100 text-blue-700' :
                                                                            q.stato === 'FIRMATO_MEDICO' ? 'bg-teal-100 text-teal-700' :
                                                                                'bg-gray-100 text-gray-600'
                                                                }`}>
                                                                {q.stato === 'COMPLETATO' ? 'Completato' :
                                                                    q.stato === 'BOZZA' ? 'Bozza' :
                                                                        q.stato === 'DA_FIRMARE' ? 'Da firmare' :
                                                                            q.stato === 'FIRMATO_PAZIENTE' ? 'Firmato Paz.' :
                                                                                q.stato === 'FIRMATO_MEDICO' ? 'Firmato Med.' :
                                                                                    q.stato}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="px-3 py-2 flex items-center justify-center border-t border-gray-100">
                                        <button onClick={onViewModulistica} className="text-indigo-600 hover:text-indigo-700 text-xs font-medium">
                                            Tutta la modulistica →
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="px-3 py-3 text-center">
                                    <p className="mb-2 text-xs text-gray-500">Nessun documento</p>
                                    <button onClick={onViewModulistica} className="text-indigo-600 hover:text-indigo-700 font-medium text-xs">
                                        Nuova modulistica →
                                    </button>
                                </div>
                            );
                        })()}
                    </MenuItem>
                </div>
            </div>

            {/* Cartella Sanitaria Modal */}
            {pazienteId && (
                <CartellaSanitariaModal
                    isOpen={showCartellaSanitaria}
                    onClose={() => setShowCartellaSanitaria(false)}
                    personId={pazienteId}
                    patientName={patientName}
                    onOpenVisita={onViewVisita}
                />
            )}

            {/* Allegato QuickLook Modal */}
            <AllegatoQuickLookModal
                isOpen={!!quickLookAllegato}
                onClose={() => setQuickLookAllegato(null)}
                allegato={quickLookAllegato}
                onEdit={(a) => {
                    setQuickLookAllegato(null);
                    setEditAllegato(a);
                }}
            />

            {/* Allegato Editor Modal — canvas overlay per immagini/PDF */}
            <AllegatoEditorModal
                isOpen={!!editAllegato}
                onClose={() => setEditAllegato(null)}
                allegato={editAllegato}
            />

            {/* Upload Modal — gestione interna allegati visita */}
            {visitaId && showUploadModal && (
                <AllegatiUploadModal
                    isOpen={showUploadModal}
                    onClose={() => { setShowUploadModal(false); setInlineDroppedFiles([]); }}
                    visitaId={visitaId}
                    initialFiles={inlineDroppedFiles.length > 0 ? inlineDroppedFiles : undefined}
                    onUploadComplete={handleInlineUploadComplete}
                />
            )}

            {/* Laboratorio Upload Modal — pre-impostato su ESAMI_SANGUE */}
            {visitaId && showLabUploadModal && (
                <AllegatiUploadModal
                    isOpen={showLabUploadModal}
                    onClose={() => setShowLabUploadModal(false)}
                    visitaId={visitaId}
                    defaultTipologiaClinica="ESAMI_SANGUE"
                    onUploadComplete={() => {
                        setShowLabUploadModal(false);
                        queryClient.invalidateQueries({ queryKey: ['allegati-laboratorio', pazienteId] });
                        queryClient.invalidateQueries({ queryKey: ['allegati-visita', visitaId] });
                    }}
                />
            )}
        </>
    );
};

export default QuickActionsIntegrated;
