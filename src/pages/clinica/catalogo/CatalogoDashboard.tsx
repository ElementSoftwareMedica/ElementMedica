/**
 * CatalogoDashboard Component
 * Main dashboard for the catalog module
 * 
 * Features:
 * - Overview statistics
 * - Quick access to prestazioni, listini, convenzioni
 * - Recent items
 * - Quick actions
 * 
 * @module pages/poliambulatorio/catalogo/CatalogoDashboard
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    FileText,
    Euro,
    Handshake,
    Plus,
    ChevronRight,
    Activity,
    Clock,
    Stethoscope,
    ArrowRight,
    AlertCircle,
    RefreshCw,
    TrendingUp,
    Users
} from 'lucide-react';
import {
    prestazioniApi,
    listiniApi,
    convenzioniApi,
    Prestazione,
    TipoPrestazione
} from '../../../services/clinicaApi';
import { formatDate } from '../../../utils/dateUtils';
import '../../../styles/clinica-theme.css';

// =====================================================
// TYPES
// =====================================================

interface QuickActionProps {
    icon: React.ReactNode;
    label: string;
    to: string;
    color: string;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    subtext?: string;
    color: string;
    to?: string;
}

// =====================================================
// CONSTANTS
// =====================================================

const TIPO_LABELS: Record<TipoPrestazione, string> = {
    VISITA_SPECIALISTICA: 'Visite Specialistiche',
    VISITA_MEDICINA_LAVORO: 'Medicina del Lavoro',
    ESAME_STRUMENTALE: 'Esami Strumentali',
    ESAME_LABORATORIO: 'Esami Laboratorio',
    INTERVENTO_AMBULATORIALE: 'Interventi',
    VACCINAZIONE: 'Vaccinazioni',
    CERTIFICAZIONE: 'Certificazioni',
    CONSULENZA: 'Consulenze',
};

// =====================================================
// HELPER COMPONENTS
// =====================================================

const QuickAction: React.FC<QuickActionProps> = ({ icon, label, to, color }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all bg-white dark:bg-gray-800`}
    >
        <div className={`p-3 rounded-lg ${color}`}>
            {icon}
        </div>
        <div className="flex-1">
            <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
    </Link>
);

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtext, color, to }) => {
    const content = (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 ${to ? 'hover:shadow-md transition-shadow' : ''}`}>
            <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
                {to && <ChevronRight className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="mt-4">
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                {subtext && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>
                )}
            </div>
        </div>
    );

    return to ? <Link to={to}>{content}</Link> : content;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export const CatalogoDashboard: React.FC = () => {
    // Queries
    const { data: prestazioniStats, isLoading: loadingPrestazioni } = useQuery({
        queryKey: ['prestazioni', 'stats'],
        queryFn: () => prestazioniApi.getStats(),
    });

    const { data: prestazioniResponse } = useQuery({
        queryKey: ['prestazioni', { limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }],
        queryFn: () => prestazioniApi.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
    });

    const { data: listiniResponse } = useQuery({
        queryKey: ['listini', { limit: 5 }],
        queryFn: () => listiniApi.getAll({ limit: 5 }),
    });

    const { data: convenzioniResponse } = useQuery({
        queryKey: ['convenzioni', { limit: 5 }],
        queryFn: () => convenzioniApi.getAll({ limit: 5 }),
    });

    const recentPrestazioni = prestazioniResponse?.data || [];
    const listini = listiniResponse?.data || [];
    const convenzioni = convenzioniResponse?.data || [];

    return (
        <div className="p-6 space-y-6" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                        Catalogo Servizi
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gestione prestazioni, listini e convenzioni
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<FileText className="w-6 h-6 text-teal-600 dark:text-teal-400" />}
                    label="Prestazioni totali"
                    value={prestazioniStats?.total || 0}
                    subtext={`${prestazioniStats?.active || 0} attive`}
                    color="bg-teal-100 dark:bg-teal-900/30"
                    to="/poliambulatorio/catalogo/prestazioni"
                />
                <StatCard
                    icon={<Stethoscope className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                    label="Visite"
                    value={prestazioniStats?.byTipo?.VISITA_SPECIALISTICA || 0}
                    color="bg-blue-100 dark:bg-blue-900/30"
                    to="/poliambulatorio/catalogo/prestazioni?tipo=VISITA_SPECIALISTICA"
                />
                <StatCard
                    icon={<Euro className="w-6 h-6 text-green-600 dark:text-green-400" />}
                    label="Listini prezzi"
                    value={listini.length}
                    color="bg-green-100 dark:bg-green-900/30"
                    to="/poliambulatorio/catalogo/listini"
                />
                <StatCard
                    icon={<Handshake className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                    label="Convenzioni"
                    value={convenzioni.length}
                    subtext={`${convenzioni.filter(c => c.attiva).length} attive`}
                    color="bg-purple-100 dark:bg-purple-900/30"
                    to="/poliambulatorio/catalogo/convenzioni"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <QuickAction
                    icon={<FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
                    label="Catalogo Prestazioni"
                    to="/poliambulatorio/catalogo/prestazioni"
                    color="bg-teal-100 dark:bg-teal-900/30"
                />
                <QuickAction
                    icon={<Plus className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
                    label="Nuova Prestazione"
                    to="/poliambulatorio/catalogo/prestazioni/nuovo"
                    color="bg-teal-100 dark:bg-teal-900/30"
                />
                <QuickAction
                    icon={<Plus className="w-5 h-5 text-green-600 dark:text-green-400" />}
                    label="Nuovo Listino"
                    to="/poliambulatorio/catalogo/listini/nuovo"
                    color="bg-green-100 dark:bg-green-900/30"
                />
                <QuickAction
                    icon={<Plus className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    label="Nuova Convenzione"
                    to="/poliambulatorio/catalogo/convenzioni/nuovo"
                    color="bg-purple-100 dark:bg-purple-900/30"
                />
                <QuickAction
                    icon={<Plus className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                    label="Nuovo Bundle"
                    to="/poliambulatorio/catalogo/bundles/nuovo"
                    color="bg-orange-100 dark:bg-orange-900/30"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Prestazioni */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                                <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                            </div>
                            <h2 className="font-medium text-gray-900 dark:text-white">Prestazioni Recenti</h2>
                        </div>
                        <Link
                            to="/poliambulatorio/catalogo/prestazioni"
                            className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 flex items-center gap-1"
                        >
                            Vedi tutte
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loadingPrestazioni ? (
                            <div className="p-8 text-center">
                                <RefreshCw className="w-6 h-6 animate-spin text-teal-500 mx-auto" />
                            </div>
                        ) : recentPrestazioni.length === 0 ? (
                            <div className="p-8 text-center">
                                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">Nessuna prestazione</p>
                                <Link
                                    to="/poliambulatorio/catalogo/prestazioni/nuovo"
                                    className="inline-flex items-center gap-2 mt-3 text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700"
                                >
                                    <Plus className="w-4 h-4" />
                                    Crea la prima prestazione
                                </Link>
                            </div>
                        ) : (
                            recentPrestazioni.map((prestazione) => (
                                <Link
                                    key={prestazione.id}
                                    to={`/poliambulatorio/catalogo/prestazioni/${prestazione.id}`}
                                    className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                                        <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {prestazione.nome}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {prestazione.codice} • {TIPO_LABELS[prestazione.tipo]}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                            <Clock className="w-4 h-4" />
                                            {prestazione.durataPrevista}'
                                        </span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Listini */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Euro className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <h3 className="font-medium text-gray-900 dark:text-white">Listini Prezzi</h3>
                            </div>
                            <Link
                                to="/poliambulatorio/catalogo/listini"
                                className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700"
                            >
                                Vedi
                            </Link>
                        </div>
                        <div className="p-4">
                            {listini.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                    Nessun listino configurato
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {listini.slice(0, 3).map((listino) => (
                                        <div key={listino.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {listino.nome || `Listino #${listino.id.slice(-4)}`}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    €{listino.prezzo?.toFixed(2) || '0.00'}
                                                </p>
                                            </div>
                                            {listino.attivo && (
                                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                                                    Attivo
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Convenzioni */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Handshake className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                <h3 className="font-medium text-gray-900 dark:text-white">Convenzioni</h3>
                            </div>
                            <Link
                                to="/poliambulatorio/catalogo/convenzioni"
                                className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700"
                            >
                                Vedi
                            </Link>
                        </div>
                        <div className="p-4">
                            {convenzioni.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                    Nessuna convenzione attiva
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {convenzioni.slice(0, 3).map((convenzione) => (
                                        <div key={convenzione.id} className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {convenzione.nome}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {convenzione.enteTerzo || convenzione.codice}
                                                </p>
                                            </div>
                                            <span className={`w-2 h-2 rounded-full ${convenzione.attiva ? 'bg-green-500' : 'bg-gray-400'
                                                }`} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tipo Distribution */}
                    {prestazioniStats?.byTipo && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    <h3 className="font-medium text-gray-900 dark:text-white">Per Tipologia</h3>
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                {Object.entries(prestazioniStats.byTipo).map(([tipo, count]) => (
                                    <div key={tipo} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                            {TIPO_LABELS[tipo as TipoPrestazione]}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CatalogoDashboard;
