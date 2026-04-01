/**
 * AccettazioneListView - Vista lista per accettazione
 * 
 * Vista tabellare con:
 * - Colonne riordinabili (click su header per sort)
 * - Testo prestazioni/medico su più righe
 * - Colonna Convenzione
 * - ActionButton standard con dropdown azioni
 * 
 * @module pages/clinica/agenda/components/accettazione
 */

import React, { useState, useMemo } from 'react';
import {
    Clock,
    Timer,
    Stethoscope,
    CheckCircle,
    XCircle,
    LogIn,
    Bell,
    User,
    Building2,
    Calendar,
    Hash,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Eye,
    FileText
} from 'lucide-react';
import { Appuntamento } from '../../../../../services/clinicaApi';
import { formatTime } from '@/utils/dateUtils';
import { getDoctorTitle } from '../../../../../utils/codiceFiscale';
import { getPersonDisplayName } from '../../../../../utils/personDisplayUtils';
import { ActionButton } from '../../../../../components/ui';

// ============================================
// TYPES
// ============================================

export interface AccettazioneListViewProps {
    appuntamenti: Appuntamento[];
    onCheckIn: (id: string) => void;
    onChiama: (id: string) => void;
    onCompleta: (id: string) => void;
    onNoShow: (id: string) => void;
    onViewDetails?: (id: string) => void;
    loadingId: string | null;
}

interface StatoConfig {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ElementType;
}

type SortField = 'numeroCoda' | 'paziente' | 'ora' | 'prestazione' | 'medico' | 'ambulatorio' | 'convenzione' | 'stato';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    field: SortField;
    direction: SortDirection;
}

// ============================================
// CONSTANTS
// ============================================

const STATO_CONFIG: Record<string, StatoConfig> = {
    PRENOTATO: { label: 'Prenotato', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-900/40', icon: Calendar },
    CONFERMATO: { label: 'Confermato', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40', icon: Clock },
    IN_ATTESA: { label: 'In Attesa', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40', icon: Timer },
    IN_CORSO: { label: 'In Visita', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40', icon: Stethoscope },
    COMPLETATO: { label: 'Completato', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/40', icon: CheckCircle },
    NO_SHOW: { label: 'Non Presentato', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/40', icon: XCircle }
};

const STATO_ORDER: Record<string, number> = {
    PRENOTATO: 1,
    CONFERMATO: 2,
    IN_ATTESA: 3,
    IN_CORSO: 4,
    COMPLETATO: 5,
    NO_SHOW: 6
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateWaitTime = (appuntamento: Appuntamento): number => {
    if (appuntamento.stato !== 'IN_ATTESA' || !appuntamento.oraArrivo) return 0;
    return Math.floor((Date.now() - new Date(appuntamento.oraArrivo).getTime()) / 60000);
};

const isLate = (appuntamento: Appuntamento): boolean => {
    const dataOra = new Date(appuntamento.dataOra);
    return dataOra < new Date() && ['PRENOTATO', 'CONFERMATO'].includes(appuntamento.stato);
};

const getPatientName = (app: Appuntamento): string => {
    return getPersonDisplayName(app.paziente, 'Paziente');
};

const getMedicoName = (app: Appuntamento): string => {
    if (!app.medico) return '';
    return `${getDoctorTitle(app.medico.taxCode, app.medico.gender)} ${getPersonDisplayName(app.medico)}`;
};

// ============================================
// SORTABLE HEADER COMPONENT
// ============================================

interface SortableHeaderProps {
    field: SortField;
    label: string;
    sortConfig: SortConfig | null;
    onSort: (field: SortField) => void;
    icon?: React.ReactNode;
    className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ field, label, sortConfig, onSort, icon, className = '' }) => {
    const isActive = sortConfig?.field === field;
    const direction = sortConfig?.direction;

    return (
        <th
            className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors select-none ${className}`}
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-1.5">
                {icon}
                <span>{label}</span>
                <span className="ml-auto">
                    {isActive ? (
                        direction === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        )
                    ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                    )}
                </span>
            </div>
        </th>
    );
};

// ============================================
// COMPONENT
// ============================================

export const AccettazioneListView: React.FC<AccettazioneListViewProps> = ({
    appuntamenti,
    onCheckIn,
    onChiama,
    onCompleta,
    onNoShow,
    onViewDetails,
    loadingId
}) => {
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ field: 'ora', direction: 'asc' });

    // Handle sort
    const handleSort = (field: SortField) => {
        setSortConfig(prev => {
            if (prev?.field === field) {
                return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { field, direction: 'asc' };
        });
    };

    // Sorted appuntamenti
    const sortedAppuntamenti = useMemo(() => {
        if (!sortConfig) return appuntamenti;

        return [...appuntamenti].sort((a, b) => {
            let comparison = 0;

            switch (sortConfig.field) {
                case 'numeroCoda':
                    comparison = (a.numeroCoda || 999) - (b.numeroCoda || 999);
                    break;
                case 'paziente':
                    comparison = getPatientName(a).localeCompare(getPatientName(b));
                    break;
                case 'ora':
                    comparison = new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime();
                    break;
                case 'prestazione':
                    comparison = (a.prestazione?.nome || '').localeCompare(b.prestazione?.nome || '');
                    break;
                case 'medico':
                    comparison = getMedicoName(a).localeCompare(getMedicoName(b));
                    break;
                case 'ambulatorio':
                    comparison = (a.ambulatorio?.nome || '').localeCompare(b.ambulatorio?.nome || '');
                    break;
                case 'convenzione':
                    comparison = (a.convenzione?.nome || '').localeCompare(b.convenzione?.nome || '');
                    break;
                case 'stato':
                    comparison = (STATO_ORDER[a.stato] || 99) - (STATO_ORDER[b.stato] || 99);
                    break;
            }

            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
    }, [appuntamenti, sortConfig]);

    // Get actions for each appuntamento based on stato
    const getActions = (app: Appuntamento) => {
        const isLoadingThis = loadingId === app.id;
        const actions: { label: string; icon: React.ReactNode; onClick: () => void; variant?: 'default' | 'danger' }[] = [];

        // Visualizza dettagli (sempre disponibile)
        if (onViewDetails) {
            actions.push({
                label: 'Visualizza',
                icon: <Eye className="w-4 h-4" />,
                onClick: () => onViewDetails(app.id)
            });
        }

        // Azioni basate sullo stato
        if (['PRENOTATO', 'CONFERMATO'].includes(app.stato)) {
            actions.push({
                label: 'Accetta',
                icon: <LogIn className="w-4 h-4" />,
                onClick: () => !isLoadingThis && onCheckIn(app.id)
            });
            actions.push({
                label: 'Non presentato',
                icon: <XCircle className="w-4 h-4" />,
                onClick: () => !isLoadingThis && onNoShow(app.id),
                variant: 'danger'
            });
        }

        if (app.stato === 'IN_ATTESA') {
            actions.push({
                label: 'Chiama',
                icon: <Bell className="w-4 h-4" />,
                onClick: () => !isLoadingThis && onChiama(app.id)
            });
            actions.push({
                label: 'Visita',
                icon: <Stethoscope className="w-4 h-4" />,
                onClick: () => !isLoadingThis && onCompleta(app.id)
            });
            actions.push({
                label: 'Chiama e Visita',
                icon: <FileText className="w-4 h-4" />,
                onClick: () => {
                    if (!isLoadingThis) {
                        onChiama(app.id);
                        setTimeout(() => onCompleta(app.id), 500);
                    }
                }
            });
        }

        if (app.stato === 'IN_CORSO') {
            actions.push({
                label: 'Completa visita',
                icon: <CheckCircle className="w-4 h-4" />,
                onClick: () => !isLoadingThis && onCompleta(app.id)
            });
        }

        return actions;
    };

    if (appuntamenti.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Nessun appuntamento trovato</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <SortableHeader
                                field="numeroCoda"
                                label="N° Coda"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                icon={<Hash className="h-3 w-3" />}
                            />
                            <SortableHeader
                                field="paziente"
                                label="Paziente"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                icon={<User className="h-3 w-3" />}
                            />
                            <SortableHeader
                                field="ora"
                                label="Ora"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                icon={<Clock className="h-3 w-3" />}
                            />
                            <SortableHeader
                                field="prestazione"
                                label="Prestazione"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                field="medico"
                                label="Medico"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                field="ambulatorio"
                                label="Ambulatorio"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                                icon={<Building2 className="h-3 w-3" />}
                            />
                            <SortableHeader
                                field="convenzione"
                                label="Convenzione"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <SortableHeader
                                field="stato"
                                label="Stato"
                                sortConfig={sortConfig}
                                onSort={handleSort}
                            />
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-20">
                                Azioni
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {sortedAppuntamenti.map((app) => {
                            const config = STATO_CONFIG[app.stato] || STATO_CONFIG.PRENOTATO;
                            const Icon = config.icon;
                            const waitTime = calculateWaitTime(app);
                            const late = isLate(app);
                            const actions = getActions(app);

                            return (
                                <tr
                                    key={app.id}
                                    className={`
                                        hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                                        ${late ? 'bg-red-50 dark:bg-red-900/20' : ''}
                                    `}
                                >
                                    {/* N° Coda */}
                                    <td className="px-4 py-3">
                                        {app.numeroCoda ? (
                                            <div className="flex items-center gap-1.5">
                                                <Hash className="h-3.5 w-3.5 text-teal-500 dark:text-teal-400" />
                                                <span className="font-bold text-teal-700 dark:text-teal-300">{app.numeroCoda}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500">-</span>
                                        )}
                                    </td>

                                    {/* Paziente */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-gray-100">
                                                {getPatientName(app)}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Ora */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className={`h-4 w-4 ${late ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                            <span className={late ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                                {formatTime(new Date(app.dataOra))}
                                            </span>
                                            {waitTime > 0 && (
                                                <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">
                                                    (+{waitTime}m)
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Prestazione - testo su più righe */}
                                    <td className="px-4 py-3 max-w-[200px]">
                                        <span className="text-gray-700 dark:text-gray-300 text-sm whitespace-normal break-words line-clamp-2">
                                            {app.prestazione?.nome || '-'}
                                        </span>
                                    </td>

                                    {/* Medico - testo su più righe */}
                                    <td className="px-4 py-3 max-w-[180px]">
                                        {app.medico ? (
                                            <span className="text-gray-700 dark:text-gray-300 text-sm whitespace-normal break-words line-clamp-2">
                                                {getMedicoName(app)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500">-</span>
                                        )}
                                    </td>

                                    {/* Ambulatorio */}
                                    <td className="px-4 py-3">
                                        {app.ambulatorio ? (
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                                <span className="text-gray-700 dark:text-gray-300 text-sm">{app.ambulatorio.nome}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500">-</span>
                                        )}
                                    </td>

                                    {/* Convenzione */}
                                    <td className="px-4 py-3">
                                        {app.convenzione ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                                {app.convenzione.nome}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500 text-sm">Privato</span>
                                        )}
                                    </td>

                                    {/* Stato */}
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                                            <Icon className="h-3 w-3" />
                                            {config.label}
                                        </span>
                                    </td>

                                    {/* Azioni con ActionButton */}
                                    <td className="px-4 py-3 relative">
                                        {actions.length > 0 ? (
                                            <div className="flex justify-center">
                                                <ActionButton
                                                    theme="teal"
                                                    actions={actions}
                                                />
                                            </div>
                                        ) : (
                                            // Stato finale - no actions
                                            <div className="flex justify-center">
                                                {app.stato === 'COMPLETATO' && (
                                                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                                        <CheckCircle className="h-3 w-3" />
                                                        Fatto
                                                    </span>
                                                )}
                                                {app.stato === 'NO_SHOW' && (
                                                    <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                                        <XCircle className="h-3 w-3" />
                                                        No Show
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AccettazioneListView;
