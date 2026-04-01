/**
 * QuickActionsIntegrated - Pannello Quick Actions con Modal integrati
 * 
 * Versione migliorata del QuickActionsPanel che apre modal pre-compilati
 * invece di navigare a pagine esterne.
 * 
 * @module components/companies/quick-actions/QuickActionsIntegrated
 * @project P58 - Company Details Enhancement
 */

import React, { useState, useMemo } from 'react';
import {
    Plus,
    UserCheck,
    ClipboardCheck,
    DollarSign,
    Stethoscope,
    Users,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    GraduationCap,
    Building2,
    Briefcase,
    ChevronRight,
    FileText,
    Shield,
    FileCode
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../../design-system/utils';
import { QuickActionNominaModal, type NominaTipo } from './QuickActionNominaModal';
import { QuickActionSopralluogoModal } from './QuickActionSopralluogoModal';
import { QuickActionMansioneModal } from './QuickActionMansioneModal';
import { QuickActionTariffarioModal } from './QuickActionTariffarioModal';
import { QuickActionDVRModal } from './QuickActionDVRModal';
import { QuickActionOT23Modal } from './QuickActionOT23Modal';
import { QuickActionAllegato3BModal } from './QuickActionAllegato3BModal';
import { QuickActionSiteModal } from './QuickActionSiteModal';

interface NominaInfo {
    id: string;
    tipoRuolo: 'MEDICO_COMPETENTE' | 'RSPP' | 'ASPP' | 'RLS' | 'PREPOSTO' | 'ADDETTO_PS' | 'ADDETTO_AI' | 'DIRIGENTE_SICUREZZA';
    stato: string;
    dataScadenza?: string;
}

interface CompanySite {
    id: string;
    rsppId?: string;
    medicoCompetenteId?: string;
    ultimoSopralluogo?: string;
    prossimoSopralluogo?: string;
    dvr?: string;
}

interface QuickActionsIntegratedProps {
    companyId: string;
    companyName: string;
    nomine?: NominaInfo[];
    sites?: CompanySite[];
    hasTariffari?: boolean;
    hasMDLServices?: boolean;
    employeeCount?: number;
    courseCount?: number;
    siteCount?: number;
    /** Callback quando un'azione viene completata per refresh dati */
    onActionComplete?: () => void;
}

type ModalType = 'nomina-mc' | 'nomina-rspp' | 'sopralluogo' | 'mansione' | 'tariffario' | 'dvr' | 'ot23' | 'allegato3b' | 'site' | null;

interface QuickAction {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    modalType?: ModalType;
    href?: string;
    priority: 'high' | 'medium' | 'low';
    color: string;
}

const QuickActionsIntegrated: React.FC<QuickActionsIntegratedProps> = ({
    companyId,
    companyName,
    nomine = [],
    sites = [],
    hasTariffari = false,
    hasMDLServices = false,
    employeeCount = 0,
    courseCount = 0,
    siteCount = 0,
    onActionComplete
}) => {
    const [activeModal, setActiveModal] = useState<ModalType>(null);

    // Calcola quali azioni mostrare
    const { missingActions, completedActions } = useMemo(() => {
        const missing: QuickAction[] = [];
        const completed: QuickAction[] = [];

        // 1. Medico Competente
        const hasMC = nomine.some(n => n.tipoRuolo === 'MEDICO_COMPETENTE' && n.stato === 'ATTIVA');
        const mcNomina = nomine.find(n => n.tipoRuolo === 'MEDICO_COMPETENTE');

        if (!hasMC) {
            missing.push({
                id: 'add-mc',
                title: 'Nomina Medico Competente',
                description: 'Aggiungi la nomina del MC',
                icon: <Stethoscope className="h-5 w-5" />,
                modalType: 'nomina-mc',
                priority: 'high',
                color: 'blue'
            });
        } else {
            completed.push({
                id: 'mc-ok',
                title: 'Medico Competente',
                description: mcNomina?.dataScadenza
                    ? `Scadenza: ${new Date(mcNomina.dataScadenza).toLocaleDateString('it-IT')}`
                    : 'Nomina attiva',
                icon: <CheckCircle2 className="h-5 w-5" />,
                href: `/poliambulatorio/mdl/nomine-ruolo?companyId=${companyId}`,
                priority: 'low',
                color: 'green'
            });
        }

        // 2. RSPP
        const hasRSPP = nomine.some(n => n.tipoRuolo === 'RSPP' && n.stato === 'ATTIVA');
        const rsppNomina = nomine.find(n => n.tipoRuolo === 'RSPP');

        if (!hasRSPP) {
            missing.push({
                id: 'add-rspp',
                title: 'Nomina RSPP',
                description: 'Aggiungi la nomina del RSPP',
                icon: <UserCheck className="h-5 w-5" />,
                modalType: 'nomina-rspp',
                priority: 'high',
                color: 'indigo'
            });
        } else {
            completed.push({
                id: 'rspp-ok',
                title: 'RSPP',
                description: rsppNomina?.dataScadenza
                    ? `Scadenza: ${new Date(rsppNomina.dataScadenza).toLocaleDateString('it-IT')}`
                    : 'Nomina attiva',
                icon: <CheckCircle2 className="h-5 w-5" />,
                href: `/poliambulatorio/mdl/nomine-ruolo?companyId=${companyId}`,
                priority: 'low',
                color: 'green'
            });
        }

        // 3. Sopralluoghi
        const hasSopralluogo = sites.some(s => s.prossimoSopralluogo);

        if (hasMDLServices && !hasSopralluogo && sites.length > 0) {
            missing.push({
                id: 'add-sopralluogo',
                title: 'Programma Sopralluogo',
                description: 'Nessun sopralluogo programmato',
                icon: <ClipboardCheck className="h-5 w-5" />,
                modalType: 'sopralluogo',
                priority: 'medium',
                color: 'violet'
            });
        } else if (hasSopralluogo) {
            const nextSopralluogo = sites
                .filter(s => s.prossimoSopralluogo)
                .sort((a, b) => new Date(a.prossimoSopralluogo!).getTime() - new Date(b.prossimoSopralluogo!).getTime())[0];

            completed.push({
                id: 'sopralluogo-ok',
                title: 'Sopralluogo',
                description: nextSopralluogo?.prossimoSopralluogo
                    ? `Prossimo: ${new Date(nextSopralluogo.prossimoSopralluogo).toLocaleDateString('it-IT')}`
                    : 'Programmato',
                icon: <CheckCircle2 className="h-5 w-5" />,
                href: `/poliambulatorio/mdl/scadenze?companyId=${companyId}&tab=sopralluoghi`,
                priority: 'low',
                color: 'green'
            });
        }

        // 4. Tariffario - visibile solo se non già associato
        if (!hasTariffari) {
            missing.push({
                id: 'add-tariffario',
                title: 'Associa Tariffario',
                description: hasMDLServices ? 'Nessun tariffario associato' : 'Associa un tariffario MDL',
                icon: <DollarSign className="h-5 w-5" />,
                modalType: 'tariffario',
                priority: hasMDLServices ? 'medium' : 'low',
                color: 'emerald'
            });
        } else {
            // Se tariffario già associato, mostra nelle completed con link alla card MDL
            completed.push({
                id: 'tariffario-ok',
                title: 'Tariffario MDL',
                description: 'Tariffario associato',
                icon: <CheckCircle2 className="h-5 w-5" />,
                modalType: 'tariffario',
                priority: 'low',
                color: 'green'
            });
        }

        // 5. Mansioni (sempre visibile per aziende MDL)
        if (hasMDLServices) {
            missing.push({
                id: 'add-mansione',
                title: 'Assegna Mansioni',
                description: 'Gestisci mansioni e rischi',
                icon: <Briefcase className="h-5 w-5" />,
                modalType: 'mansione',
                priority: 'medium',
                color: 'amber'
            });
        }

        // 6. DVR - Documento Valutazione Rischi
        const hasDVR = sites.some(s => s.dvr);
        if (sites.length > 0) {
            if (!hasDVR) {
                missing.push({
                    id: 'add-dvr',
                    title: 'Carica DVR',
                    description: 'Documento Valutazione Rischi mancante',
                    icon: <FileText className="h-5 w-5" />,
                    modalType: 'dvr',
                    priority: hasMDLServices ? 'high' : 'medium',
                    color: 'blue'
                });
            } else {
                completed.push({
                    id: 'dvr-ok',
                    title: 'DVR',
                    description: 'Documento presente',
                    icon: <CheckCircle2 className="h-5 w-5" />,
                    modalType: 'dvr',
                    priority: 'low',
                    color: 'green'
                });
            }
        }

        // 7. OT23 - Riduzione Tasso INAIL - sempre visibile
        missing.push({
            id: 'add-ot23',
            title: 'Nuova Domanda OT23',
            description: 'Richiesta riduzione tasso INAIL',
            icon: <Shield className="h-5 w-5" />,
            modalType: 'ot23',
            priority: 'low',
            color: 'teal'
        });

        // 8. Allegato 3B - Relazione Annuale INAIL - sempre visibile
        missing.push({
            id: 'add-allegato3b',
            title: 'Nuovo Allegato 3B',
            description: 'Relazione annuale INAIL',
            icon: <FileCode className="h-5 w-5" />,
            modalType: 'allegato3b',
            priority: 'low',
            color: 'purple'
        });

        // 9. Dipendenti
        if (employeeCount === 0) {
            missing.push({
                id: 'add-employees',
                title: 'Aggiungi Dipendenti',
                description: 'Nessun dipendente registrato',
                icon: <Users className="h-5 w-5" />,
                href: `/persons?companyId=${companyId}`,
                priority: 'medium',
                color: 'violet'
            });
        }

        // 10. Sedi
        if (siteCount === 0) {
            missing.push({
                id: 'add-sites',
                title: 'Aggiungi Sede',
                description: 'Nessuna sede registrata',
                icon: <Building2 className="h-5 w-5" />,
                modalType: 'site',
                priority: 'high',
                color: 'gray'
            });
        }

        // Ordina per priorità
        const sortedMissing = missing.sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.priority] - order[b.priority];
        });

        return { missingActions: sortedMissing, completedActions: completed };
    }, [nomine, sites, hasTariffari, hasMDLServices, employeeCount, siteCount, companyId]);

    const allCompleted = missingActions.length === 0;

    const handleActionClick = (action: QuickAction) => {
        if (action.modalType) {
            setActiveModal(action.modalType);
        }
    };

    const handleModalClose = () => {
        setActiveModal(null);
    };

    const handleModalSuccess = () => {
        setActiveModal(null);
        onActionComplete?.();
    };

    const colorClasses: Record<string, { bg: string; border: string; text: string; hover: string }> = {
        blue: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', hover: 'hover:bg-blue-100 hover:border-blue-300 dark:hover:bg-blue-800/40 dark:hover:border-blue-600' },
        indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-300', hover: 'hover:bg-indigo-100 hover:border-indigo-300 dark:hover:bg-indigo-800/40 dark:hover:border-indigo-600' },
        emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-300', hover: 'hover:bg-emerald-100 hover:border-emerald-300 dark:hover:bg-emerald-800/40 dark:hover:border-emerald-600' },
        violet: { bg: 'bg-violet-50 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-700', text: 'text-violet-700 dark:text-violet-300', hover: 'hover:bg-violet-100 hover:border-violet-300 dark:hover:bg-violet-800/40 dark:hover:border-violet-600' },
        gray: { bg: 'bg-gray-50 dark:bg-gray-700/50', border: 'border-gray-200 dark:border-gray-600', text: 'text-gray-700 dark:text-gray-300', hover: 'hover:bg-gray-100 hover:border-gray-300 dark:hover:bg-gray-600/50 dark:hover:border-gray-500' },
        green: { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-700', text: 'text-green-600 dark:text-green-400', hover: 'hover:bg-green-100 dark:hover:bg-green-800/40' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300', hover: 'hover:bg-amber-100 hover:border-amber-300 dark:hover:bg-amber-800/40 dark:hover:border-amber-600' },
        teal: { bg: 'bg-teal-50 dark:bg-teal-900/30', border: 'border-teal-200 dark:border-teal-700', text: 'text-teal-700 dark:text-teal-300', hover: 'hover:bg-teal-100 hover:border-teal-300 dark:hover:bg-teal-800/40 dark:hover:border-teal-600' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300', hover: 'hover:bg-purple-100 hover:border-purple-300 dark:hover:bg-purple-800/40 dark:hover:border-purple-600' }
    };

    const renderActionItem = (action: QuickAction, isCompleted: boolean = false) => {
        const colors = colorClasses[action.color];

        // Se ha modalType, usa un button, altrimenti usa Link
        if (action.modalType) {
            return (
                <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className={cn(
                        "w-full flex items-start p-3 rounded-lg border transition-all duration-200 group text-left",
                        colors.bg,
                        colors.border,
                        colors.hover
                    )}
                >
                    <div className={cn("p-2 rounded-lg flex-shrink-0", colors.bg, colors.text)}>
                        {action.icon}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                        <p className={cn("text-sm font-medium", colors.text)}>{action.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{action.description}</p>
                    </div>
                    <Plus className={cn("h-4 w-4 flex-shrink-0 ml-2 mt-1 opacity-50 group-hover:opacity-100", colors.text)} />
                </button>
            );
        }

        return (
            <Link
                key={action.id}
                to={action.href!}
                className={cn(
                    "flex items-start p-3 rounded-lg border transition-all duration-200 group",
                    colors.bg,
                    colors.border,
                    colors.hover
                )}
            >
                <div className={cn("p-2 rounded-lg flex-shrink-0", colors.text)}>
                    {action.icon}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                    <p className={cn("text-sm font-medium", colors.text)}>{action.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{action.description}</p>
                </div>
                {isCompleted ? (
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2 mt-1" />
                ) : (
                    <Plus className={cn("h-4 w-4 flex-shrink-0 ml-2 mt-1 opacity-50 group-hover:opacity-100", colors.text)} />
                )}
            </Link>
        );
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-black/30 border border-gray-100 dark:border-gray-700 overflow-hidden sticky top-4">
                {/* Header */}
                <div className={cn(
                    "px-4 py-3 border-b",
                    allCompleted
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-100 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-green-800"
                        : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 dark:from-blue-900/30 dark:to-indigo-900/30 dark:border-blue-800"
                )}>
                    <div className="flex items-center">
                        {allCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-blue-600 mr-2" />
                        )}
                        <h3 className={cn(
                            "font-semibold text-sm",
                            allCompleted ? "text-green-800 dark:text-green-300" : "text-blue-800 dark:text-blue-300"
                        )}>
                            {allCompleted ? 'Configurazione Completa' : 'Azioni Rapide'}
                        </h3>
                    </div>
                    {!allCompleted && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {missingActions.length} {missingActions.length === 1 ? 'azione disponibile' : 'azioni disponibili'}
                        </p>
                    )}
                </div>

                {/* Missing Actions */}
                {missingActions.length > 0 && (
                    <div className="p-3 space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                            Da Completare
                        </h4>
                        {missingActions.map((action) => renderActionItem(action))}
                    </div>
                )}

                {/* Completed Actions */}
                {completedActions.length > 0 && (
                    <div className="p-3 space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                            Configurati
                        </h4>
                        {completedActions.map((action) => renderActionItem(action, true))}
                    </div>
                )}

                {/* Quick Links */}
                <div className="border-t border-gray-100 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mb-2">
                        Navigazione Rapida
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <Link
                            to={`/poliambulatorio/visite?companyId=${companyId}`}
                            className="flex flex-col items-center p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-200 dark:hover:border-blue-700 transition-colors text-center"
                        >
                            <Stethoscope className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
                            <span className="text-xs text-gray-600 dark:text-gray-300">Visite</span>
                        </Link>
                        <Link
                            to={`/formazione/schedules?companyId=${companyId}`}
                            className="flex flex-col items-center p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors text-center"
                        >
                            <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mb-1" />
                            <span className="text-xs text-gray-600 dark:text-gray-300">Formazione</span>
                        </Link>
                        <Link
                            to={`/persons?companyId=${companyId}`}
                            className="flex flex-col items-center p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-200 dark:hover:border-violet-700 transition-colors text-center"
                        >
                            <Users className="h-5 w-5 text-violet-600 dark:text-violet-400 mb-1" />
                            <span className="text-xs text-gray-600 dark:text-gray-300">Dipendenti</span>
                        </Link>
                        <Link
                            to={`/poliambulatorio/mdl/scadenze?companyId=${companyId}`}
                            className="flex flex-col items-center p-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-200 dark:hover:border-amber-700 transition-colors text-center"
                        >
                            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400 mb-1" />
                            <span className="text-xs text-gray-600 dark:text-gray-300">Scadenze</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <QuickActionNominaModal
                isOpen={activeModal === 'nomina-mc'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
                tipo="MC"
            />

            <QuickActionNominaModal
                isOpen={activeModal === 'nomina-rspp'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
                tipo="RSPP"
            />

            <QuickActionSopralluogoModal
                isOpen={activeModal === 'sopralluogo'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
            />

            <QuickActionMansioneModal
                isOpen={activeModal === 'mansione'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
            />

            <QuickActionTariffarioModal
                isOpen={activeModal === 'tariffario'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
            />

            <QuickActionDVRModal
                isOpen={activeModal === 'dvr'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
            />

            <QuickActionOT23Modal
                isOpen={activeModal === 'ot23'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
            />

            <QuickActionAllegato3BModal
                isOpen={activeModal === 'allegato3b'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
            />

            <QuickActionSiteModal
                isOpen={activeModal === 'site'}
                onClose={handleModalClose}
                onSuccess={handleModalSuccess}
                companyId={companyId}
                companyName={companyName}
            />
        </>
    );
};

export default QuickActionsIntegrated;
