/**
 * AccettazioneKanbanView - Vista Kanban per accettazione
 * 
 * Board Kanban con colonne per stato workflow.
 * Drag-and-drop opzionale per cambio stato.
 * 
 * @module pages/clinica/agenda/components/accettazione
 */

import React from 'react';
import {
    Clock,
    Timer,
    Stethoscope,
    CheckCircle,
    ChevronRight
} from 'lucide-react';
import { Appuntamento, StatoAppuntamento } from '../../../../../services/clinicaApi';
import { formatTime } from '@/utils/dateUtils';
import { getPersonDisplayName } from '../../../../../utils/personDisplayUtils';
import { AccettazionePatientCard } from './AccettazionePatientCard';

// ============================================
// TYPES
// ============================================

export interface AccettazioneKanbanViewProps {
    daAccettare: Appuntamento[];
    inAttesa: Appuntamento[];
    inCorso: Appuntamento[];
    completati: Appuntamento[];
    onCheckIn: (id: string) => void;
    onChiama: (id: string) => void;
    onCompleta: (id: string) => void;
    onNoShow: (id: string) => void;
    loadingId: string | null;
    showCallPanel?: boolean;
    onChiamaFromPanel?: (id: string) => void;
}

interface ColumnConfig {
    key: string;
    title: string;
    icon: React.ElementType;
    headerColor: string;
}

// ============================================
// CONSTANTS
// ============================================

const COLUMNS: ColumnConfig[] = [
    { key: 'daAccettare', title: 'Da Accettare', icon: Clock, headerColor: 'bg-blue-600 text-white' },
    { key: 'inAttesa', title: 'In Sala Attesa', icon: Timer, headerColor: 'bg-amber-500 text-white' },
    { key: 'inCorso', title: 'In Visita', icon: Stethoscope, headerColor: 'bg-purple-600 text-white' }
];

// ============================================
// SUB-COMPONENTS
// ============================================

const KanbanColumn: React.FC<{
    config: ColumnConfig;
    appuntamenti: Appuntamento[];
    onCheckIn?: (id: string) => void;
    onChiama?: (id: string) => void;
    onCompleta?: (id: string) => void;
    onNoShow?: (id: string) => void;
    loadingId: string | null;
}> = ({ config, appuntamenti, onCheckIn, onChiama, onCompleta, onNoShow, loadingId }) => {
    const Icon = config.icon;

    return (
        <div className="flex-1 min-w-[320px] bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
            {/* Column Header */}
            <div className={`${config.headerColor} px-4 py-3 flex items-center gap-2`}>
                <Icon className="h-5 w-5" />
                <span className="font-medium">{config.title}</span>
                <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {appuntamenti.length}
                </span>
            </div>

            {/* Column Content */}
            <div className="p-3 space-y-3 max-h-[calc(100vh-380px)] overflow-y-auto">
                {appuntamenti.map((app) => (
                    <AccettazionePatientCard
                        key={app.id}
                        appuntamento={app}
                        onCheckIn={onCheckIn ? () => onCheckIn(app.id) : undefined}
                        onChiama={onChiama ? () => onChiama(app.id) : undefined}
                        onCompleta={onCompleta ? () => onCompleta(app.id) : undefined}
                        onNoShow={onNoShow ? () => onNoShow(app.id) : undefined}
                        isLoading={loadingId === app.id}
                        showDetails={true}
                    />
                ))}

                {appuntamenti.length === 0 && (
                    <p className="text-center text-gray-400 dark:text-gray-500 py-8">
                        Nessun paziente
                    </p>
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AccettazioneKanbanView: React.FC<AccettazioneKanbanViewProps> = ({
    daAccettare,
    inAttesa,
    inCorso,
    completati,
    onCheckIn,
    onChiama,
    onCompleta,
    onNoShow,
    loadingId
}) => {
    const columnData = {
        daAccettare,
        inAttesa,
        inCorso
    };

    return (
        <div className="space-y-4">
            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((col) => (
                    <KanbanColumn
                        key={col.key}
                        config={col}
                        appuntamenti={columnData[col.key as keyof typeof columnData]}
                        onCheckIn={col.key === 'daAccettare' ? onCheckIn : undefined}
                        onChiama={col.key === 'inAttesa' ? onChiama : undefined}
                        onCompleta={col.key === 'inCorso' ? onCompleta : undefined}
                        onNoShow={col.key === 'daAccettare' ? onNoShow : undefined}
                        loadingId={loadingId}
                    />
                ))}
            </div>

            {/* Completed Section (Collapsible) */}
            {completati.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <details>
                        <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <span className="font-medium">Completati oggi</span>
                            <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-sm ml-2">
                                {completati.length}
                            </span>
                            <ChevronRight className="h-5 w-5 ml-auto transition-transform details-open:rotate-90 text-gray-500 dark:text-gray-400" />
                        </summary>
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {completati.map((app) => (
                                <div key={app.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {getPersonDisplayName(app.paziente, 'Paziente')}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatTime(new Date(app.dataOra))} - {app.prestazione?.nome || 'Visita'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
};

export default AccettazioneKanbanView;
