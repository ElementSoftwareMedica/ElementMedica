/**
 * SedeDetailPage
 * 
 * Pagina di visualizzazione dettaglio sede (read-only).
 * Mostra tutte le informazioni in modo elegante senza possibilità di modifica.
 * 
 * @module pages/poliambulatorio/struttura/SedeDetailPage
 */

import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Building2,
    MapPin,
    Phone,
    Mail,
    ArrowLeft,
    Edit,
    Loader2,
    CheckCircle,
    XCircle,
    AlertCircle,
    Hash,
    Calendar,
    User,
    Star,
    Stethoscope
} from 'lucide-react';
import { clinicaApi } from '../../../services/clinicaApi';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const SedeDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Load sede data
    const { data: sede, isLoading, error } = useQuery({
        queryKey: ['sede', id],
        queryFn: () => clinicaApi.sedi.getById(id!),
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

    if (error || !sede) {
        return (
            <div className="p-6 clinica-theme">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-red-700 mb-2">
                        Errore nel caricamento
                    </h3>
                    <p className="text-red-600 text-sm mb-4">
                        {error instanceof Error ? error.message : 'Sede non trovata'}
                    </p>
                    <button
                        onClick={() => navigate('/poliambulatorio/sedi')}
                        className="btn-clinica-secondary"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    const isActive = sede.isAttiva;

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
                        onClick={() => navigate('/poliambulatorio/sedi')}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-teal-100">
                            <Building2 className="h-8 w-8 text-teal-600" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {sede.nome}
                                </h1>
                                {sede.isPrincipale && (
                                    <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                )}
                            </div>
                            {sede.codice && (
                                <p className="text-gray-500">{sede.codice}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {isActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {isActive ? 'Attiva' : 'Inattiva'}
                    </span>
                    <button
                        onClick={() => navigate(`/poliambulatorio/sedi/${id}/modifica`)}
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
                        <InfoCard icon={Hash} label="Codice" value={sede.codice} />
                        {sede.isPrincipale && (
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-50">
                                    <Star className="h-4 w-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo</p>
                                    <p className="text-amber-700 font-medium">Sede Principale</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Phone className="h-5 w-5 text-teal-600" />
                        Contatti
                    </h2>

                    <div className="space-y-4">
                        <InfoCard icon={Phone} label="Telefono" value={sede.telefono} />
                        <InfoCard icon={Mail} label="Email" value={sede.email} />
                    </div>
                </div>

                {/* Address Card */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-teal-600" />
                        Indirizzo
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sede.indirizzo && (
                            <div className="md:col-span-2">
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Indirizzo</p>
                                <p className="text-gray-900 font-medium">{sede.indirizzo}</p>
                            </div>
                        )}
                        {sede.citta && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Città</p>
                                <p className="text-gray-900 font-medium">{sede.citta}</p>
                            </div>
                        )}
                        <div className="flex gap-6">
                            {sede.cap && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">CAP</p>
                                    <p className="text-gray-900 font-medium">{sede.cap}</p>
                                </div>
                            )}
                            {sede.provincia && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Provincia</p>
                                    <p className="text-gray-900 font-medium">{sede.provincia}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Direttore Sanitario Card */}
                {sede.direttoreSanitario && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                            <User className="h-5 w-5 text-teal-600" />
                            Direttore Sanitario
                        </h2>

                        <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50">
                            <div className="p-2.5 rounded-full bg-teal-100">
                                <User className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    Dott. {sede.direttoreSanitario.firstName} {sede.direttoreSanitario.lastName}
                                </p>
                                {sede.direttoreSanitario.email && (
                                    <p className="text-sm text-gray-500">{sede.direttoreSanitario.email}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Metadata Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-600" />
                        Metadati
                    </h2>

                    <div className="space-y-4 text-sm">
                        {sede.createdAt && (
                            <div>
                                <p className="text-gray-500">Creato il</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(sede.createdAt).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            </div>
                        )}
                        {sede.updatedAt && (
                            <div>
                                <p className="text-gray-500">Ultima modifica</p>
                                <p className="text-gray-900 font-medium">
                                    {new Date(sede.updatedAt).toLocaleDateString('it-IT', {
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

                {/* Related Ambulatori Card */}
                <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-teal-600" />
                        Ambulatori
                    </h2>

                    <Link
                        to={`/poliambulatorio/ambulatori?sede=${id}`}
                        className="block p-4 rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all group text-center"
                    >
                        <Stethoscope className="h-8 w-8 text-gray-300 mx-auto mb-2 group-hover:text-teal-500 transition-colors" />
                        <p className="text-gray-600 group-hover:text-teal-700 transition-colors">
                            {sede._count?.ambulatori !== undefined
                                ? `${sede._count.ambulatori} ambulatori in questa sede`
                                : 'Visualizza ambulatori della sede'}
                        </p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SedeDetailPage;
