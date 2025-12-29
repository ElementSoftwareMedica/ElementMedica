/**
 * AccettazionePage - Dashboard per accettazione e check-in pazienti
 * 
 * Mostra gli appuntamenti di oggi e permette gestione rapida check-in.
 * Include gestione consensi privacy e sistema chiamata numeri.
 * 
 * @module pages/poliambulatorio/agenda/AccettazionePage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Clock,
    User,
    CheckCircle,
    XCircle,
    Phone,
    MessageSquare,
    AlertCircle,
    Search,
    Filter,
    RefreshCw,
    UserCheck,
    Timer,
    Stethoscope,
    Building2,
    Play,
    Bell,
    ChevronRight,
    LogIn,
    Shield
} from 'lucide-react';
import {
    appuntamentiApi,
    StatoAppuntamento,
    Appuntamento
} from '../../../services/clinicaApi';
import { formatTime } from '@/utils/dateUtils';
import { useTenantFilter } from '../../../context/TenantFilterContext';
import { getDoctorTitle } from '../../../utils/codiceFiscale';
import { ConsensoPrivacyModal, NumeroChiamataPanel } from './components';

// ============================================
// TYPES
// ============================================

interface AccettazioneFilters {
    search: string;
    stato: 'tutti' | 'da_accettare' | 'in_attesa' | 'in_corso';
}

// ============================================
// CONSTANTS
// ============================================

const STATI_VISIBILI: StatoAppuntamento[] = [
    'CONFERMATO', 'IN_ATTESA', 'IN_CORSO'
];

const STATO_WORKFLOW: Record<string, {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ElementType;
    action?: { label: string; nextStato: StatoAppuntamento };
}> = {
    CONFERMATO: {
        label: 'Da Accettare',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: Clock,
        action: { label: 'Check-in', nextStato: 'IN_ATTESA' }
    },
    IN_ATTESA: {
        label: 'In Sala d\'Attesa',
        color: 'text-amber-700',
        bgColor: 'bg-amber-100',
        icon: Timer,
        action: { label: 'Chiama', nextStato: 'IN_CORSO' }
    },
    IN_CORSO: {
        label: 'In Visita',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        icon: Stethoscope,
        action: { label: 'Completa', nextStato: 'COMPLETATO' }
    },
    COMPLETATO: {
        label: 'Completato',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: CheckCircle
    },
    NO_SHOW: {
        label: 'Non Presentato',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: XCircle
    }
};

// ============================================
// COMPONENTS
// ============================================

/**
 * Quick Stats Component
 */
const QuickStats: React.FC<{
    appuntamenti: Appuntamento[];
}> = ({ appuntamenti }) => {
    const stats = useMemo(() => ({
        totale: appuntamenti.length,
        daAccettare: appuntamenti.filter(a => a.stato === 'CONFERMATO').length,
        inAttesa: appuntamenti.filter(a => a.stato === 'IN_ATTESA').length,
        inCorso: appuntamenti.filter(a => a.stato === 'IN_CORSO').length,
        completati: appuntamenti.filter(a => a.stato === 'COMPLETATO').length
    }), [appuntamenti]);

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Totale Oggi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totale}</p>
            </div>
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <p className="text-sm text-blue-600">Da Accettare</p>
                <p className="text-2xl font-bold text-blue-700">{stats.daAccettare}</p>
            </div>
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                <p className="text-sm text-amber-600">In Attesa</p>
                <p className="text-2xl font-bold text-amber-700">{stats.inAttesa}</p>
            </div>
            <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                <p className="text-sm text-purple-600">In Visita</p>
                <p className="text-2xl font-bold text-purple-700">{stats.inCorso}</p>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                <p className="text-sm text-green-600">Completati</p>
                <p className="text-2xl font-bold text-green-700">{stats.completati}</p>
            </div>
        </div>
    );
};

/**
 * Patient Card Component
 */
const PatientCard: React.FC<{
    appuntamento: Appuntamento;
    onAction: (stato: StatoAppuntamento) => void;
    onNoShow: () => void;
    isLoading: boolean;
}> = ({ appuntamento, onAction, onNoShow, isLoading }) => {
    const config = STATO_WORKFLOW[appuntamento.stato];
    if (!config) return null;

    const Icon = config.icon;
    const dataOra = new Date(appuntamento.dataOra);
    const now = new Date();
    const isLate = dataOra < now && appuntamento.stato === 'CONFERMATO';
    const waitTime = appuntamento.stato === 'IN_ATTESA' && appuntamento.oraArrivo
        ? Math.floor((now.getTime() - new Date(appuntamento.oraArrivo).getTime()) / 60000)
        : 0;

    return (
        <div className={`
      bg-white rounded-lg border-2 p-4 transition-all
      ${isLate ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-teal-300'}
    `}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {appuntamento.paziente
                                ? `${appuntamento.paziente.cognome} ${appuntamento.paziente.nome}`
                                : 'Paziente'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgColor} ${config.color}`}>
                                <Icon className="h-3 w-3" />
                                {config.label}
                            </span>
                            {waitTime > 0 && (
                                <span className="text-amber-600 text-xs">
                                    In attesa da {waitTime} min
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Queue number */}
                {appuntamento.numeroCoda && (
                    <div className="text-center">
                        <p className="text-xs text-gray-500">N°</p>
                        <p className="text-2xl font-bold text-teal-600">{appuntamento.numeroCoda}</p>
                    </div>
                )}
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className={isLate ? 'text-red-600 font-medium' : ''}>
                        {formatTime(dataOra)}
                        {isLate && ' (in ritardo)'}
                    </span>
                </div>
                {appuntamento.prestazione && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Stethoscope className="h-4 w-4" />
                        <span className="truncate">{appuntamento.prestazione.nome}</span>
                    </div>
                )}
                {appuntamento.medico && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{getDoctorTitle(appuntamento.medico.taxCode, appuntamento.medico.gender)} {appuntamento.medico.cognome}</span>
                    </div>
                )}
                {appuntamento.ambulatorio && (
                    <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="h-4 w-4" />
                        <span>{appuntamento.ambulatorio.nome}</span>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {config.action && (
                    <button
                        onClick={() => onAction(config.action!.nextStato)}
                        disabled={isLoading}
                        className={`
              flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium
              ${appuntamento.stato === 'CONFERMATO'
                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                : appuntamento.stato === 'IN_ATTESA'
                                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                                    : 'bg-purple-600 text-white hover:bg-purple-700'
                            }
              disabled:opacity-50
            `}
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : appuntamento.stato === 'CONFERMATO' ? (
                            <LogIn className="h-4 w-4" />
                        ) : appuntamento.stato === 'IN_ATTESA' ? (
                            <Bell className="h-4 w-4" />
                        ) : (
                            <CheckCircle className="h-4 w-4" />
                        )}
                        {config.action.label}
                    </button>
                )}

                {appuntamento.stato === 'CONFERMATO' && (
                    <button
                        onClick={onNoShow}
                        disabled={isLoading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Segna come No Show"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Queue Column Component
 */
const QueueColumn: React.FC<{
    title: string;
    icon: React.ElementType;
    color: string;
    appuntamenti: Appuntamento[];
    onAction: (id: string, stato: StatoAppuntamento) => void;
    onNoShow: (id: string) => void;
    loadingId: string | null;
}> = ({ title, icon: Icon, color, appuntamenti, onAction, onNoShow, loadingId }) => (
    <div className="flex-1 min-w-[320px] bg-gray-50 rounded-xl overflow-hidden">
        <div className={`${color} px-4 py-3 flex items-center gap-2`}>
            <Icon className="h-5 w-5" />
            <span className="font-medium">{title}</span>
            <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-sm">
                {appuntamenti.length}
            </span>
        </div>
        <div className="p-3 space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
            {appuntamenti.map(app => (
                <PatientCard
                    key={app.id}
                    appuntamento={app}
                    onAction={(stato) => onAction(app.id, stato)}
                    onNoShow={() => onNoShow(app.id)}
                    isLoading={loadingId === app.id}
                />
            ))}
            {appuntamenti.length === 0 && (
                <p className="text-center text-gray-400 py-8">
                    Nessun paziente
                </p>
            )}
        </div>
    </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const AccettazionePage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Tenant filter from global context
    const { tenantFilterKey } = useTenantFilter();

    // State
    const [filters, setFilters] = useState<AccettazioneFilters>({
        search: '',
        stato: 'tutti'
    });
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [showConsensoModal, setShowConsensoModal] = useState(false);
    const [selectedAppuntamento, setSelectedAppuntamento] = useState<Appuntamento | null>(null);
    const [showCallPanel, setShowCallPanel] = useState(true);

    // Query: Today's appointments (tenant is filtered server-side via JWT)
    const { data: todayData, isLoading, refetch } = useQuery({
        queryKey: ['appuntamenti-today-accettazione', tenantFilterKey],
        queryFn: () => appuntamentiApi.getToday(),
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    // Mutation: Change stato
    const changeStatoMutation = useMutation({
        mutationFn: async ({ id, stato }: { id: string; stato: StatoAppuntamento }) => {
            setLoadingId(id);
            // Se check-in, usa accetta; se chiama, usa chiama
            if (stato === 'IN_ATTESA') {
                return appuntamentiApi.accetta(id);
            } else if (stato === 'IN_CORSO') {
                return appuntamentiApi.chiama(id);
            } else {
                return appuntamentiApi.changeStato(id, stato);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appuntamenti-today-accettazione'] });
        },
        onSettled: () => {
            setLoadingId(null);
        }
    });

    // Handler: Open consent modal before check-in
    const handleCheckInRequest = useCallback((appuntamento: Appuntamento) => {
        setSelectedAppuntamento(appuntamento);
        setShowConsensoModal(true);
    }, []);

    // Handler: Confirm consent and check-in
    const handleConsensoConfirm = useCallback((consensi: Record<string, boolean>) => {
        if (selectedAppuntamento) {
            // Log consent for GDPR audit
            console.log('Consensi registrati:', consensi, 'per appuntamento:', selectedAppuntamento.id);

            // Proceed with check-in
            changeStatoMutation.mutate({ id: selectedAppuntamento.id, stato: 'IN_ATTESA' });
            setShowConsensoModal(false);
            setSelectedAppuntamento(null);
        }
    }, [selectedAppuntamento, changeStatoMutation]);

    // Handler: Call patient from waiting room
    const handleChiamaFromPanel = useCallback((appuntamentoId: string) => {
        changeStatoMutation.mutate({ id: appuntamentoId, stato: 'IN_CORSO' });
    }, [changeStatoMutation]);

    // Filtered and grouped data
    const { daAccettare, inAttesa, inCorso, completati } = useMemo(() => {
        const data = todayData || [];
        let filtered = data;

        // Apply search filter
        if (filters.search) {
            const term = filters.search.toLowerCase();
            filtered = filtered.filter(a =>
                a.paziente?.cognome?.toLowerCase().includes(term) ||
                a.paziente?.nome?.toLowerCase().includes(term) ||
                a.numero?.includes(term)
            );
        }

        // Group by stato
        return {
            daAccettare: filtered.filter(a => a.stato === 'CONFERMATO'),
            inAttesa: filtered.filter(a => a.stato === 'IN_ATTESA'),
            inCorso: filtered.filter(a => a.stato === 'IN_CORSO'),
            completati: filtered.filter(a => a.stato === 'COMPLETATO')
        };
    }, [todayData, filters]);

    // Handlers - Modified to use consent modal for check-in
    const handleAction = useCallback((id: string, stato: StatoAppuntamento) => {
        // For check-in (CONFERMATO -> IN_ATTESA), show consent modal first
        if (stato === 'IN_ATTESA') {
            const appuntamento = todayData?.find(a => a.id === id);
            if (appuntamento) {
                handleCheckInRequest(appuntamento);
                return;
            }
        }
        // For other state changes, proceed directly
        changeStatoMutation.mutate({ id, stato });
    }, [changeStatoMutation, todayData, handleCheckInRequest]);

    const handleNoShow = useCallback((id: string) => {
        if (confirm('Confermi che il paziente non si è presentato?')) {
            changeStatoMutation.mutate({ id, stato: 'NO_SHOW' });
        }
    }, [changeStatoMutation]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 text-teal-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-xl p-4 border border-gray-200">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <UserCheck className="h-7 w-7 text-teal-600" />
                            Accettazione
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Gestione check-in e flusso pazienti
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                placeholder="Cerca paziente..."
                                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-64"
                            />
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={() => refetch()}
                            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            title="Aggiorna"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>

                        {/* Toggle Call Panel */}
                        <button
                            onClick={() => setShowCallPanel(!showCallPanel)}
                            className={`p-2 border rounded-lg ${showCallPanel
                                ? 'bg-amber-100 border-amber-300 text-amber-700'
                                : 'border-gray-300 hover:bg-gray-50'}`}
                            title={showCallPanel ? 'Nascondi pannello chiamata' : 'Mostra pannello chiamata'}
                        >
                            <Bell className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <QuickStats appuntamenti={todayData || []} />

                {/* Kanban Board with Call Panel */}
                <div className="flex gap-4">
                    {/* Main Kanban */}
                    <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                        <QueueColumn
                            title="Da Accettare"
                            icon={Clock}
                            color="bg-blue-600 text-white"
                            appuntamenti={daAccettare}
                            onAction={handleAction}
                            onNoShow={handleNoShow}
                            loadingId={loadingId}
                        />
                        <QueueColumn
                            title="In Sala d'Attesa"
                            icon={Timer}
                            color="bg-amber-500 text-white"
                            appuntamenti={inAttesa}
                            onAction={handleAction}
                            onNoShow={handleNoShow}
                            loadingId={loadingId}
                        />
                        <QueueColumn
                            title="In Visita"
                            icon={Stethoscope}
                            color="bg-purple-600 text-white"
                            appuntamenti={inCorso}
                            onAction={handleAction}
                            onNoShow={handleNoShow}
                            loadingId={loadingId}
                        />
                    </div>

                    {/* Call Panel (right sidebar) */}
                    {showCallPanel && inAttesa.length > 0 && (
                        <div className="w-80 flex-shrink-0">
                            <NumeroChiamataPanel
                                appuntamentiInAttesa={inAttesa}
                                onChiama={handleChiamaFromPanel}
                                isLoading={loadingId !== null}
                            />
                        </div>
                    )}
                </div>

                {/* Completed section (collapsed) */}
                {completati.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <details>
                            <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-medium">Completati oggi</span>
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-sm ml-2">
                                    {completati.length}
                                </span>
                                <ChevronRight className="h-5 w-5 ml-auto" />
                            </summary>
                            <div className="p-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-3">
                                {completati.map(app => (
                                    <div key={app.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {app.paziente ? `${app.paziente.cognome} ${app.paziente.nome}` : 'Paziente'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatTime(new Date(app.dataOra))} - {app.prestazione?.nome || 'Visita'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>
                )}

                {/* Privacy Consent Modal */}
                {selectedAppuntamento && (
                    <ConsensoPrivacyModal
                        appuntamento={selectedAppuntamento}
                        isOpen={showConsensoModal}
                        onClose={() => {
                            setShowConsensoModal(false);
                            setSelectedAppuntamento(null);
                        }}
                        onConfirm={handleConsensoConfirm}
                        isLoading={loadingId !== null}
                    />
                )}
            </div>
        </div>
    );
};

export default AccettazionePage;
