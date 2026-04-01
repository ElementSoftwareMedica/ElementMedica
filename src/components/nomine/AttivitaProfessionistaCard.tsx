/**
 * AttivitaProfessionistaCard
 * 
 * Card per visualizzare le attività eseguite da un professionista:
 * - Sopralluoghi effettuati
 * - DVR redatti/aggiornati
 * 
 * P59: Creato per mostrare attività in trainers/:id e medici/:id
 * 
 * @module components/nomine/AttivitaProfessionistaCard
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    ClipboardList,
    Building2,
    MapPin,
    Calendar,
    AlertCircle,
    Loader2,
    ExternalLink,
    CheckCircle2,
    FileSearch,
    FileText,
    Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../services/api';

interface Sopralluogo {
    id: string;
    dataEsecuzione: string;
    dataProssimoSopralluogo?: string;
    valutazione?: string;
    esito?: string;
    note?: string;
    site?: {
        id: string;
        siteName: string;
        citta?: string;
        companyTenantProfile?: {
            id: string;
            company?: {
                ragioneSociale: string;
            };
        };
    };
}

interface DVR {
    id: string;
    dataEsecuzione: string;
    dataScadenza: string;
    rischiRilevati?: string;
    note?: string;
    site?: {
        id: string;
        siteName: string;
        citta?: string;
        companyTenantProfile?: {
            id: string;
            company?: {
                ragioneSociale: string;
            };
        };
    };
}

interface AttivitaProfessionistaCardProps {
    personId: string;
    /** Tema colore della card */
    theme?: 'teal' | 'blue' | 'purple';
    /** Titolo personalizzato */
    title?: string;
    /** Mostra solo sopralluoghi */
    showSopralluoghiOnly?: boolean;
    /** Mostra solo DVR */
    showDvrOnly?: boolean;
}

const AttivitaProfessionistaCard: React.FC<AttivitaProfessionistaCardProps> = ({
    personId,
    theme = 'teal',
    title = 'Attività Eseguite',
    showSopralluoghiOnly = false,
    showDvrOnly = false
}) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'sopralluoghi' | 'dvr'>('sopralluoghi');

    const themeColors = {
        teal: { accent: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', ring: 'ring-teal-500' },
        blue: { accent: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-500' },
        purple: { accent: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', ring: 'ring-purple-500' }
    };
    const colors = themeColors[theme];

    // Fetch sopralluoghi del professionista
    const { data: sopralluoghi, isLoading: loadingSopralluoghi } = useQuery({
        queryKey: ['sopralluoghi-persona', personId],
        queryFn: async () => {
            const response = await apiGet<{ data: Sopralluogo[] }>('/api/v1/sopralluogo/by-esecutore', { esecutoreId: personId });
            return response.data || [];
        },
        enabled: !!personId && !showDvrOnly
    });

    // Fetch DVR del professionista
    const { data: dvrs, isLoading: loadingDvr } = useQuery({
        queryKey: ['dvr-persona', personId],
        queryFn: async () => {
            const response = await apiGet<{ data: DVR[] }>('/api/v1/dvr/by-esecutore', { esecutoreId: personId });
            return response.data || [];
        },
        enabled: !!personId && !showSopralluoghiOnly
    });

    const isLoading = loadingSopralluoghi || loadingDvr;
    const sopralluoghiCount = sopralluoghi?.length || 0;
    const dvrCount = dvrs?.length || 0;
    const totalCount = sopralluoghiCount + dvrCount;

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderSopralluogo = (sopralluogo: Sopralluogo) => {
        const companyName = sopralluogo.site?.companyTenantProfile?.company?.ragioneSociale || '-';
        const siteName = sopralluogo.site?.siteName;
        const siteCity = sopralluogo.site?.citta;

        return (
            <div
                key={sopralluogo.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {/* Azienda */}
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            <span
                                className="font-medium text-gray-900 dark:text-gray-50 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                onClick={() => sopralluogo.site?.companyTenantProfile?.id && navigate(`/companies/${sopralluogo.site.companyTenantProfile.id}`)}
                            >
                                {companyName}
                            </span>
                            <ExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        </div>

                        {/* Sede */}
                        {siteName && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <MapPin className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                <span>{siteName}{siteCity ? ` - ${siteCity}` : ''}</span>
                            </div>
                        )}

                        {/* Date */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(sopralluogo.dataEsecuzione)}
                            </span>
                            {sopralluogo.dataProssimoSopralluogo && (
                                <span className="flex items-center gap-1 text-amber-600">
                                    <Clock className="h-3 w-3" />
                                    Prossimo: {formatDate(sopralluogo.dataProssimoSopralluogo)}
                                </span>
                            )}
                        </div>

                        {/* Esito */}
                        {sopralluogo.esito && (
                            <div className="mt-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sopralluogo.esito === 'POSITIVO' ? 'bg-green-100 text-green-700' :
                                    sopralluogo.esito === 'NEGATIVO' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {sopralluogo.esito}
                                </span>
                            </div>
                        )}
                    </div>

                    <FileSearch className={`h-5 w-5 ${colors.accent}`} />
                </div>
            </div>
        );
    };

    const renderDvr = (dvr: DVR) => {
        const companyName = dvr.site?.companyTenantProfile?.company?.ragioneSociale || '-';
        const siteName = dvr.site?.siteName;
        const siteCity = dvr.site?.citta;
        const isExpired = new Date(dvr.dataScadenza) < new Date();

        return (
            <div
                key={dvr.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {/* Azienda */}
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            <span
                                className="font-medium text-gray-900 dark:text-gray-50 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                onClick={() => dvr.site?.companyTenantProfile?.id && navigate(`/companies/${dvr.site.companyTenantProfile.id}`)}
                            >
                                {companyName}
                            </span>
                            <ExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        </div>

                        {/* Sede */}
                        {siteName && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <MapPin className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                <span>{siteName}{siteCity ? ` - ${siteCity}` : ''}</span>
                            </div>
                        )}

                        {/* Date */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Redatto: {formatDate(dvr.dataEsecuzione)}
                            </span>
                            <span className={`flex items-center gap-1 ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                                <AlertCircle className="h-3 w-3" />
                                Scadenza: {formatDate(dvr.dataScadenza)}
                            </span>
                        </div>
                    </div>

                    <FileText className={`h-5 w-5 ${colors.accent}`} />
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className={`h-5 w-5 ${colors.accent}`} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
                </div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className={`h-6 w-6 ${colors.accent} animate-spin`} />
                    <span className="ml-2 text-gray-500 dark:text-gray-400">Caricamento attività...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <ClipboardList className={`h-5 w-5 ${colors.accent}`} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
                </div>
                {totalCount > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.accent}`}>
                        {totalCount} {totalCount === 1 ? 'attività' : 'attività'}
                    </span>
                )}
            </div>

            {/* Tabs */}
            {!showSopralluoghiOnly && !showDvrOnly && (
                <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('sopralluoghi')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sopralluoghi'
                            ? `border-current ${colors.accent}`
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <FileSearch className="h-4 w-4" />
                            Sopralluoghi ({sopralluoghiCount})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('dvr')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dvr'
                            ? `border-current ${colors.accent}`
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            DVR ({dvrCount})
                        </div>
                    </button>
                </div>
            )}

            {totalCount === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <ClipboardList className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p>Nessuna attività registrata</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Sopralluoghi Tab */}
                    {(activeTab === 'sopralluoghi' || showSopralluoghiOnly) && sopralluoghi && sopralluoghi.length > 0 && (
                        <>
                            {sopralluoghi.slice(0, 5).map(renderSopralluogo)}
                            {sopralluoghi.length > 5 && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                                    + altri {sopralluoghi.length - 5} sopralluoghi
                                </p>
                            )}
                        </>
                    )}

                    {/* DVR Tab */}
                    {(activeTab === 'dvr' || showDvrOnly) && dvrs && dvrs.length > 0 && (
                        <>
                            {dvrs.slice(0, 5).map(renderDvr)}
                            {dvrs.length > 5 && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                                    + altri {dvrs.length - 5} DVR
                                </p>
                            )}
                        </>
                    )}

                    {/* Empty state per tab */}
                    {activeTab === 'sopralluoghi' && (!sopralluoghi || sopralluoghi.length === 0) && !showDvrOnly && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <FileSearch className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm">Nessun sopralluogo registrato</p>
                        </div>
                    )}

                    {activeTab === 'dvr' && (!dvrs || dvrs.length === 0) && !showSopralluoghiOnly && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                            <FileText className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm">Nessun DVR registrato</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AttivitaProfessionistaCard;
