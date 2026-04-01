/**
 * NomineRuoloCard
 * 
 * Card per visualizzare le nomine di un professionista (Medico/RSPP/etc)
 * Mostra tutte le aziende presso cui il professionista ha nomine attive
 * 
 * P59: Creato per mostrare nomine in trainers/:id e medici/:id
 * 
 * @module components/nomine/NomineRuoloCard
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Shield,
    Building2,
    MapPin,
    Calendar,
    AlertCircle,
    Loader2,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../services/api';

interface NominaRuolo {
    id: string;
    tipoRuolo: 'MEDICO_COMPETENTE' | 'RSPP' | 'ASPP' | 'RLS' | 'PREPOSTO' | 'DIRIGENTE';
    stato: 'ATTIVA' | 'SOSPESA' | 'CESSATA' | 'SCADUTA';
    dataInizio: string;
    dataFine?: string;
    dataScadenza?: string;
    site?: {
        id: string;
        siteName: string;
        citta?: string;
    };
    companyTenantProfile?: {
        id: string;
        company: {
            ragioneSociale: string;
        };
    };
}

interface NomineRuoloCardProps {
    personId: string;
    /** Tipo di ruolo da filtrare (opzionale) */
    filterTipoRuolo?: 'MEDICO_COMPETENTE' | 'RSPP' | 'ASPP' | 'RLS' | 'PREPOSTO' | 'DIRIGENTE';
    /** Tema colore della card */
    theme?: 'teal' | 'blue' | 'purple';
    /** Titolo personalizzato */
    title?: string;
}

const TIPO_RUOLO_LABELS: Record<string, string> = {
    MEDICO_COMPETENTE: 'Medico Competente',
    RSPP: 'RSPP',
    ASPP: 'ASPP',
    RLS: 'RLS',
    PREPOSTO: 'Preposto',
    DIRIGENTE: 'Dirigente Sicurezza'
};

const STATO_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    ATTIVA: { icon: CheckCircle2, color: 'text-green-700', bgColor: 'bg-green-50' },
    SOSPESA: { icon: Clock, color: 'text-amber-700', bgColor: 'bg-amber-50' },
    CESSATA: { icon: XCircle, color: 'text-gray-500', bgColor: 'bg-gray-50' },
    SCADUTA: { icon: AlertCircle, color: 'text-red-700', bgColor: 'bg-red-50' }
};

const NomineRuoloCard: React.FC<NomineRuoloCardProps> = ({
    personId,
    filterTipoRuolo,
    theme = 'blue',
    title
}) => {
    const navigate = useNavigate();

    const themeColors = {
        teal: { accent: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
        blue: { accent: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
        purple: { accent: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
    };
    const colors = themeColors[theme];

    // Fetch nomine del professionista
    const { data: nomine, isLoading, error } = useQuery({
        queryKey: ['nomine-persona', personId, filterTipoRuolo],
        queryFn: async () => {
            const params: Record<string, string> = { personId };
            if (filterTipoRuolo) {
                params.tipoRuolo = filterTipoRuolo;
            }
            const response = await apiGet<{ data: NominaRuolo[] }>('/api/v1/clinica/nomine-ruolo', params);
            return response.data || [];
        },
        enabled: !!personId
    });

    // Calcola titolo dinamico
    const cardTitle = title || (filterTipoRuolo
        ? `Nomine ${TIPO_RUOLO_LABELS[filterTipoRuolo]}`
        : 'Nomine Figure Sicurezza'
    );

    // Separa nomine attive da storico
    const nomineAttive = nomine?.filter(n => n.stato === 'ATTIVA') || [];
    const nomineStorico = nomine?.filter(n => n.stato !== 'ATTIVA') || [];

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className={`h-5 w-5 ${colors.accent}`} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{cardTitle}</h2>
                </div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className={`h-6 w-6 ${colors.accent} animate-spin`} />
                    <span className="ml-2 text-gray-500 dark:text-gray-400">Caricamento nomine...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className={`h-5 w-5 ${colors.accent}`} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{cardTitle}</h2>
                </div>
                <div className="flex items-center justify-center py-8 text-red-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>Errore nel caricamento delle nomine</span>
                </div>
            </div>
        );
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderNomina = (nomina: NominaRuolo) => {
        const statoConfig = STATO_CONFIG[nomina.stato];
        const StatusIcon = statoConfig.icon;
        const companyName = nomina.companyTenantProfile?.company?.ragioneSociale || '-';
        const siteName = nomina.site?.siteName;
        const siteCity = nomina.site?.citta;

        return (
            <div
                key={nomina.id}
                className={`p-4 rounded-lg border ${nomina.stato === 'ATTIVA' ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50'}`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        {/* Azienda */}
                        <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                            <span
                                className="font-medium text-gray-900 dark:text-gray-50 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                onClick={() => nomina.companyTenantProfile?.id && navigate(`/companies/${nomina.companyTenantProfile.id}`)}
                            >
                                {companyName}
                            </span>
                            <ExternalLink className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        </div>

                        {/* Sede (se presente) */}
                        {siteName && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <MapPin className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                                <span>{siteName}{siteCity ? ` - ${siteCity}` : ''}</span>
                            </div>
                        )}

                        {/* Tipo ruolo (se non filtrato) */}
                        {!filterTipoRuolo && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.accent}`}>
                                {TIPO_RUOLO_LABELS[nomina.tipoRuolo]}
                            </span>
                        )}

                        {/* Date */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Dal {formatDate(nomina.dataInizio)}
                            </span>
                            {nomina.dataFine && (
                                <span>
                                    al {formatDate(nomina.dataFine)}
                                </span>
                            )}
                            {nomina.dataScadenza && nomina.stato === 'ATTIVA' && (
                                <span className="text-amber-600 dark:text-amber-500">
                                    Scadenza: {formatDate(nomina.dataScadenza)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stato */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statoConfig.bgColor} ${statoConfig.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{nomina.stato}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Shield className={`h-5 w-5 ${colors.accent}`} />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{cardTitle}</h2>
                </div>
                {nomineAttive.length > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.accent}`}>
                        {nomineAttive.length} attiv{nomineAttive.length === 1 ? 'a' : 'e'}
                    </span>
                )}
            </div>

            {nomine?.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Shield className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p>Nessuna nomina registrata</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Nomine Attive */}
                    {nomineAttive.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                Nomine Attive ({nomineAttive.length})
                            </h3>
                            <div className="space-y-3">
                                {nomineAttive.map(renderNomina)}
                            </div>
                        </div>
                    )}

                    {/* Storico */}
                    {nomineStorico.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                                Storico ({nomineStorico.length})
                            </h3>
                            <div className="space-y-2">
                                {nomineStorico.slice(0, 5).map(renderNomina)}
                                {nomineStorico.length > 5 && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                                        + altre {nomineStorico.length - 5} nomine nello storico
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NomineRuoloCard;
