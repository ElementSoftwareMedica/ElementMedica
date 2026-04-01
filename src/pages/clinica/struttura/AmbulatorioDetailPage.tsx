/**
 * AmbulatorioDetailPage
 * 
 * Pagina di visualizzazione dettaglio ambulatorio (read-only).
 * Mostra tutte le informazioni in modo elegante senza possibilità di modifica.
 * 
 * @module pages/poliambulatorio/struttura/AmbulatorioDetailPage
 */

import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Stethoscope,
    Building2,
    DoorOpen,
    Users,
    ArrowLeft,
    Edit,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Hash,
    Calendar,
    Clock,
    Wrench
} from 'lucide-react';
import { ambulatoriApi } from '../../../services/clinicaApi';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const AmbulatorioDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Load ambulatorio data
    const { data: ambulatorio, isLoading, error } = useQuery({
        queryKey: ['ambulatorio', id],
        queryFn: () => ambulatoriApi.getById(id!),
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

    if (error || !ambulatorio) {
        return (
            <div className="p-6 clinica-theme">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-700 mb-2">
                        Errore nel caricamento
                    </h3>
                    <p className="text-red-600 text-sm mb-4">
                        {'Ambulatorio non trovato'}
                    </p>
                    <button
                        onClick={() => navigate('/poliambulatorio/ambulatori')}
                        className="btn-clinica-secondary"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    const isActive = ambulatorio.stato === 'ATTIVO';
    const isMaintenance = ambulatorio.stato === 'MANUTENZIONE';

    // Get specializzazione badge color
    const getSpecBadgeClass = (spec?: string): string => {
        const specMap: Record<string, string> = {
            'CARDIOLOGIA': 'bg-red-100 text-red-700',
            'ORTOPEDIA': 'bg-blue-100 text-blue-700',
            'DERMATOLOGIA': 'bg-yellow-100 text-yellow-700',
            'PEDIATRIA': 'bg-pink-100 text-pink-700',
            'GINECOLOGIA': 'bg-purple-100 text-purple-700',
            'OCULISTICA': 'bg-emerald-100 text-emerald-700',
            'NEUROLOGIA': 'bg-indigo-100 text-indigo-700'
        };
        return specMap[spec || ''] || 'bg-gray-100 text-gray-700';
    };

    // Info Card Component
    const InfoCard: React.FC<{
        icon: React.ElementType;
        label: string;
        value?: string | number | null;
        className?: string;
    }> = ({ icon: Icon, label, value, className = '' }) => {
        if (value === undefined || value === null) return null;
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
                        onClick={() => navigate('/poliambulatorio/ambulatori')}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-teal-100">
                            <Stethoscope className="h-8 w-8 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {ambulatorio.nome}
                            </h1>
                            {ambulatorio.codice && (
                                <p className="text-gray-500">{ambulatorio.codice}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' :
                            isMaintenance ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                        }`}>
                        {isActive ? <CheckCircle className="h-4 w-4" /> :
                            isMaintenance ? <Wrench className="h-4 w-4" /> :
                                <XCircle className="h-4 w-4" />}
                        {isActive ? 'Attivo' : isMaintenance ? 'In Manutenzione' : 'Inattivo'}
                    </span>
                    <button
                        onClick={() => navigate(`/poliambulatorio/ambulatori/${id}/modifica`)}
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
                        <Stethoscope className="h-5 w-5 text-teal-600" />
                        Informazioni Generali
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard icon={Hash} label="Codice" value={ambulatorio.codice} />
                        <InfoCard icon={DoorOpen} label="Piano" value={ambulatorio.piano} />
                        <InfoCard icon={Users} label="Capacità" value={ambulatorio.capacita} />
                        {ambulatorio.specializzazione && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-gray-50">
                                    <Stethoscope className="h-4 w-4 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Specializzazione</p>
                                    <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${getSpecBadgeClass(ambulatorio.specializzazione)}`}>
                                        {ambulatorio.specializzazione}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {ambulatorio.descrizione && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h3 className="text-sm text-gray-500 uppercase tracking-wide mb-2">Descrizione</h3>
                            <p className="text-gray-700 leading-relaxed">{ambulatorio.descrizione}</p>
                        </div>
                    )}
                </div>

                {/* Related Entity Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-teal-600" />
                        Poliambulatorio
                    </h2>

                    {ambulatorio.poliambulatorio ? (
                        <Link
                            to={`/poliambulatorio/poliambulatori/${ambulatorio.poliambulatorioId}`}
                            className="block p-4 rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-teal-50 group-hover:bg-teal-100 transition-colors">
                                    <Building2 className="h-5 w-5 text-teal-600" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                                        {ambulatorio.poliambulatorio.nome}
                                    </p>
                                    {ambulatorio.poliambulatorio.citta && (
                                        <p className="text-sm text-gray-500">
                                            {ambulatorio.poliambulatorio.citta}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ) : (
                        <p className="text-gray-500 text-sm">Nessun poliambulatorio associato</p>
                    )}
                </div>

                {/* Metadata Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        Metadati
                    </h2>

                    <div className="space-y-4 text-sm">
                        {ambulatorio.createdAt && (
                            <div>
                                <p className="text-gray-500">Creato il</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(ambulatorio.createdAt).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}
                        {ambulatorio.updatedAt && (
                            <div>
                                <p className="text-gray-500">Ultima modifica</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(ambulatorio.updatedAt).toLocaleDateString('it-IT', {
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

                {/* Equipment Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-teal-600" />
                        Attrezzature
                    </h2>

                    <Link
                        to={`/poliambulatorio/strumenti?ambulatorio=${id}`}
                        className="block p-4 rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all group text-center"
                    >
                        <Wrench className="h-8 w-8 text-gray-300 mx-auto mb-2 group-hover:text-teal-500 transition-colors" />
                        <p className="text-gray-600 group-hover:text-teal-700 transition-colors">
                            Visualizza strumenti dell'ambulatorio
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AmbulatorioDetailPage;
