/**
 * PoliambulatorioDetailPage
 * 
 * Pagina di visualizzazione dettaglio poliambulatorio (read-only).
 * Mostra tutte le informazioni in modo elegante senza possibilità di modifica.
 * 
 * @module pages/poliambulatorio/struttura/PoliambulatorioDetailPage
 */

import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    FileText,
    ArrowLeft,
    Edit,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Globe,
    Hash,
    Briefcase,
    Calendar
} from 'lucide-react';
import { poliambulatoriApi } from '../../../services/clinicaApi';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const PoliambulatorioDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Load poliambulatorio data
    const { data: poliambulatorio, isLoading, error } = useQuery({
        queryKey: ['poliambulatorio', id],
        queryFn: () => poliambulatoriApi.getById(id!),
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

    if (error || !poliambulatorio) {
        return (
            <div className="p-6 clinica-theme">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-700 mb-2">
                        Errore nel caricamento
                    </h3>
                    <p className="text-red-600 text-sm mb-4">
                        {error instanceof Error ? error.message : 'Poliambulatorio non trovato'}
                    </p>
                    <button
                        onClick={() => navigate('/poliambulatorio/poliambulatori')}
                        className="btn-clinica-secondary"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    const isActive = poliambulatorio.stato === 'ATTIVO';
    const isSuspended = poliambulatorio.stato === 'SOSPESO';

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
                        onClick={() => navigate('/poliambulatorio/poliambulatori')}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-teal-100">
                            <Building2 className="h-8 w-8 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {poliambulatorio.nome}
                            </h1>
                            {poliambulatorio.codice && (
                                <p className="text-gray-500">{poliambulatorio.codice}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' :
                            isSuspended ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                        }`}>
                        {isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {isActive ? 'Attivo' : isSuspended ? 'Sospeso' : 'Inattivo'}
                    </span>
                    <button
                        onClick={() => navigate(`/poliambulatorio/poliambulatori/${id}/modifica`)}
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
                        <Building2 className="h-5 w-5 text-teal-600" />
                        Informazioni Generali
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoCard icon={Hash} label="Codice" value={poliambulatorio.codice} />
                        <InfoCard icon={Briefcase} label="P.IVA" value={poliambulatorio.piva} />
                        <InfoCard icon={FileText} label="Codice Fiscale" value={poliambulatorio.codiceFiscale} />
                    </div>

                    {poliambulatorio.descrizione && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h3 className="text-sm text-gray-500 uppercase tracking-wide mb-2">Descrizione</h3>
                            <p className="text-gray-700 leading-relaxed">{poliambulatorio.descrizione}</p>
                        </div>
                    )}
                </div>

                {/* Contact Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Phone className="h-5 w-5 text-teal-600" />
                        Contatti
                    </h2>

                    <div className="space-y-4">
                        <InfoCard icon={Phone} label="Telefono" value={poliambulatorio.telefono} />
                        <InfoCard icon={Mail} label="Email" value={poliambulatorio.email} />
                        <InfoCard icon={Globe} label="PEC" value={poliambulatorio.pec} />
                    </div>
                </div>

                {/* Address Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-teal-600" />
                        Indirizzo
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {poliambulatorio.indirizzo && (
                            <div className="md:col-span-2">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Indirizzo</p>
                                <p className="text-gray-900 font-medium">{poliambulatorio.indirizzo}</p>
                            </div>
                        )}
                        {poliambulatorio.citta && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Città</p>
                                <p className="text-gray-900 font-medium">{poliambulatorio.citta}</p>
                            </div>
                        )}
                        <div className="flex gap-6">
                            {poliambulatorio.cap && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">CAP</p>
                                    <p className="text-gray-900 font-medium">{poliambulatorio.cap}</p>
                                </div>
                            )}
                            {poliambulatorio.provincia && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Provincia</p>
                                    <p className="text-gray-900 font-medium">{poliambulatorio.provincia}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Metadata Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        Metadati
                    </h2>

                    <div className="space-y-4 text-sm">
                        {poliambulatorio.createdAt && (
                            <div>
                                <p className="text-gray-500">Creato il</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(poliambulatorio.createdAt).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}
                        {poliambulatorio.updatedAt && (
                            <div>
                                <p className="text-gray-500">Ultima modifica</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(poliambulatorio.updatedAt).toLocaleDateString('it-IT', {
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
            </div>

            {/* Related Entities Section */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                    to={`/poliambulatorio/sedi?poliambulatorioId=${id}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-md transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                                <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                                    Sedi
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Gestisci le sedi del poliambulatorio
                                </p>
                            </div>
                        </div>
                        <ArrowLeft className="h-5 w-5 text-gray-300 group-hover:text-teal-500 transform rotate-180 transition-all" />
                    </div>
                </Link>

                <Link
                    to={`/poliambulatorio/ambulatori?poliambulatorio=${id}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-md transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                                <Building2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                                    Ambulatori
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Gestisci gli ambulatori
                                </p>
                            </div>
                        </div>
                        <ArrowLeft className="h-5 w-5 text-gray-300 group-hover:text-teal-500 transform rotate-180 transition-all" />
                    </div>
                </Link>

                <Link
                    to={`/poliambulatorio/strumenti?poliambulatorio=${id}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-md transition-all group"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
                                <Briefcase className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 group-hover:text-teal-700 transition-colors">
                                    Strumenti
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Gestisci le attrezzature
                                </p>
                            </div>
                        </div>
                        <ArrowLeft className="h-5 w-5 text-gray-300 group-hover:text-teal-500 transform rotate-180 transition-all" />
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default PoliambulatorioDetailPage;
