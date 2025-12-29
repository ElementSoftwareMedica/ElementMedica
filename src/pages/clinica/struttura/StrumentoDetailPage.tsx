/**
 * StrumentoDetailPage
 * 
 * Pagina di visualizzazione dettaglio strumento (read-only).
 * Mostra tutte le informazioni in modo elegante senza possibilità di modifica.
 * 
 * @module pages/poliambulatorio/struttura/StrumentoDetailPage
 */

import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Wrench,
    Building2,
    Stethoscope,
    ArrowLeft,
    Edit,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Hash,
    Calendar,
    Tag,
    FileText,
    AlertTriangle,
    ClipboardList
} from 'lucide-react';
import { strumentiApi } from '../../../services/clinicaApi';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const StrumentoDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Load strumento data
    const { data: strumento, isLoading, error } = useQuery({
        queryKey: ['strumento', id],
        queryFn: () => strumentiApi.getById(id!),
        enabled: Boolean(id)
    });

    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento...</span>
                </div>
            </div>
        );
    }

    if (error || !strumento) {
        return (
            <div className="p-6 clinica-theme">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-700 mb-2">
                        Errore nel caricamento
                    </h3>
                    <p className="text-red-600 text-sm mb-4">
                        {error instanceof Error ? error.message : 'Strumento non trovato'}
                    </p>
                    <button
                        onClick={() => navigate('/poliambulatorio/strumenti')}
                        className="btn-clinica-secondary"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    const isActive = strumento.stato === 'ATTIVO';
    const isMaintenance = strumento.stato === 'IN_MANUTENZIONE';
    const isOutOfOrder = strumento.stato === 'FUORI_SERVIZIO';

    // Get stato badge class
    const getStatoBadgeClass = (): string => {
        if (isActive) return 'bg-emerald-100 text-emerald-700';
        if (isMaintenance) return 'bg-amber-100 text-amber-700';
        if (isOutOfOrder) return 'bg-red-100 text-red-700';
        return 'bg-gray-100 text-gray-600';
    };

    const getStatoIcon = () => {
        if (isActive) return <CheckCircle className="h-4 w-4" />;
        if (isMaintenance) return <Wrench className="h-4 w-4" />;
        if (isOutOfOrder) return <AlertTriangle className="h-4 w-4" />;
        return <XCircle className="h-4 w-4" />;
    };

    const getStatoLabel = (): string => {
        if (isActive) return 'Attivo';
        if (isMaintenance) return 'In Manutenzione';
        if (isOutOfOrder) return 'Fuori Servizio';
        return 'Inattivo';
    };

    // Info Card Component
    const InfoCard: React.FC<{
        icon: React.ElementType;
        label: string;
        value?: string | null;
        className?: string;
    }> = ({ icon: Icon, label, value, className = '' }) => {
        if (!value) return null;
        return (
            <div className={`flex items-start gap-3 ${className}`}>
                <div className="p-2 rounded-lg bg-gray-50">
                    <Icon className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                    <p className="text-gray-900 font-medium">{value}</p>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/poliambulatorio/strumenti')}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-purple-100">
                            <Wrench className="h-8 w-8 text-purple-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {strumento.nome}
                            </h1>
                            {strumento.codice && (
                                <p className="text-gray-500">{strumento.codice}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getStatoBadgeClass()}`}>
                        {getStatoIcon()}
                        {getStatoLabel()}
                    </span>
                    <button
                        onClick={() => navigate(`/poliambulatorio/strumenti/${id}/modifica`)}
                        className="btn-clinica-primary inline-flex items-center gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        Modifica
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-purple-600" />
                        Informazioni Generali
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard icon={Hash} label="Codice" value={strumento.codice} />
                        <InfoCard icon={FileText} label="Modello" value={strumento.modello} />
                        <InfoCard icon={Tag} label="Marca" value={strumento.marca} />
                        <InfoCard icon={Hash} label="N. Serie" value={strumento.numeroSerie} />
                    </div>

                    {strumento.descrizione && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h3 className="text-sm text-gray-500 uppercase tracking-wide mb-2">Descrizione</h3>
                            <p className="text-gray-700 leading-relaxed">{strumento.descrizione}</p>
                        </div>
                    )}
                </div>

                {/* Location Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-teal-600" />
                        Ubicazione
                    </h2>

                    <div className="space-y-4">
                        {strumento.ambulatorio && (
                            <Link
                                to={`/poliambulatorio/ambulatori/${strumento.ambulatorioId}`}
                                className="block p-4 rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-teal-50 group-hover:bg-teal-100 transition-colors">
                                        <Stethoscope className="h-5 w-5 text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wide">Ambulatorio</p>
                                        <p className="font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                                            {strumento.ambulatorio.nome}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Dates Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        Date Importanti
                    </h2>

                    <div className="space-y-4">
                        {strumento.dataAcquisto && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Data Acquisto</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(strumento.dataAcquisto).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}
                        {strumento.ultimaManutenzione && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Ultima Manutenzione</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(strumento.ultimaManutenzione).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}
                        {strumento.prossimaManutenzione && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Prossima Manutenzione</p>
                                <p className={`font-medium ${new Date(strumento.prossimaManutenzione) < new Date()
                                        ? 'text-red-600'
                                        : new Date(strumento.prossimaManutenzione) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                            ? 'text-amber-600'
                                            : 'text-gray-900'
                                    }`}>
                                    {new Date(strumento.prossimaManutenzione).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                    {new Date(strumento.prossimaManutenzione) < new Date() && (
                                        <span className="ml-2 text-xs">(Scaduta)</span>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metadata Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        Metadati
                    </h2>

                    <div className="space-y-4 text-sm">
                        {strumento.createdAt && (
                            <div>
                                <p className="text-gray-500">Creato il</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(strumento.createdAt).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}
                        {strumento.updatedAt && (
                            <div>
                                <p className="text-gray-500">Ultima modifica</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(strumento.updatedAt).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Maintenance History Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-purple-600" />
                        Manutenzioni
                    </h2>

                    <div className="flex gap-4">
                        <Link
                            to={`/poliambulatorio/strumenti/${id}/manutenzione`}
                            className="flex-1 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all group text-center"
                        >
                            <Wrench className="h-8 w-8 text-gray-300 mx-auto mb-2 group-hover:text-purple-500 transition-colors" />
                            <p className="text-gray-600 group-hover:text-purple-700 transition-colors font-medium">
                                Registra Manutenzione
                            </p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StrumentoDetailPage;
