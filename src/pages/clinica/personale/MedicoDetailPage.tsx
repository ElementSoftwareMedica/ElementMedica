/**
 * MedicoDetailPage
 * 
 * Pagina dettaglio medico con visualizzazione completa
 * 
 * @module pages/poliambulatorio/personale/MedicoDetailPage
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Stethoscope,
    ArrowLeft,
    Edit2,
    User,
    Mail,
    Phone,
    CreditCard,
    Building,
    Key,
    AlertCircle,
    Loader2,
    CheckCircle2,
    XCircle,
    Calendar,
    Clock,
    Shield,
    Activity
} from 'lucide-react';
import { mediciApi, type Medico } from '../../../services/clinicaApi';
import { formatDoctorName } from '../../../utils/codiceFiscale';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

const MedicoDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    // Fetch medico
    const { data: medico, isLoading, error } = useQuery({
        queryKey: ['medico', id],
        queryFn: () => mediciApi.getById(id!),
        enabled: !!id
    });

    // Parse notes for additional data
    const getMedicoNotes = (m: Medico | undefined) => {
        if (!m) return {};
        try {
            if (m.notes && typeof m.notes === 'string') {
                return JSON.parse(m.notes);
            }
        } catch {
            // Ignore parse errors
        }
        return {};
    };

    if (isLoading) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="ml-2 text-gray-600">Caricamento medico...</span>
                </div>
            </div>
        );
    }

    if (error || !medico) {
        return (
            <div className="p-6 clinica-theme">
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-medium">Medico non trovato</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {error instanceof Error ? error.message : 'Il medico richiesto non esiste'}
                    </p>
                    <button
                        onClick={() => navigate('/poliambulatorio/personale/medici')}
                        className="mt-4 px-4 py-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                        Torna alla lista
                    </button>
                </div>
            </div>
        );
    }

    const notes = getMedicoNotes(medico);

    return (
        <div className="p-6 clinica-theme" data-brand="element-medica">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/poliambulatorio/personale/medici')}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                            <User className="h-8 w-8 text-teal-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {formatDoctorName({ firstName: medico.firstName, lastName: medico.lastName, taxCode: medico.taxCode })}
                            </h1>
                            <p className="text-gray-500">
                                {notes.specializzazione || 'Medico'}
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/poliambulatorio/personale/medici/${id}/modifica`)}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    <Edit2 className="h-4 w-4" />
                    Modifica
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stato */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Shield className="h-5 w-5 text-teal-600" />
                            Stato Account
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            {medico.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Medico Attivo
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg">
                                    <XCircle className="h-4 w-4" />
                                    Medico Inattivo
                                </span>
                            )}
                            {medico.username ? (
                                <span className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg">
                                    <Key className="h-4 w-4" />
                                    Account Attivo: {medico.username}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg">
                                    <Key className="h-4 w-4" />
                                    Senza Account
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Dati Anagrafici */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-teal-600" />
                            Dati Anagrafici
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase">Nome</label>
                                <p className="text-gray-900">{medico.firstName}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase">Cognome</label>
                                <p className="text-gray-900">{medico.lastName}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Email
                                </label>
                                <p className="text-gray-900">{medico.email || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    Telefono
                                </label>
                                <p className="text-gray-900">{medico.phone || '-'}</p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    Codice Fiscale
                                </label>
                                <p className="text-gray-900 font-mono">{medico.taxCode || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Dati Professionali */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-teal-600" />
                            Dati Professionali
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs font-medium text-gray-500 uppercase">Specializzazioni</label>
                                <div className="flex flex-wrap gap-2">
                                    {medico.specialties && medico.specialties.length > 0 ? (
                                        medico.specialties.map((spec, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-teal-100 text-teal-800"
                                            >
                                                {spec}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-gray-500">-</span>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    Regione Albo
                                </label>
                                <p className="text-gray-900">{medico.preferences?.alboRegione || notes.alboRegione || '-'}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase">N° Iscrizione Albo</label>
                                <p className="text-gray-900">{medico.registerCode || notes.numeroIscrizione || '-'}</p>
                            </div>
                            {medico.registerCode2 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">N° Iscrizione (2°)</label>
                                    <p className="text-gray-900">{medico.registerCode2}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Prestazioni Abilitate */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-teal-600" />
                            Prestazioni Abilitate
                        </h2>
                        {medico.abilitazioni && medico.abilitazioni.length > 0 ? (
                            <div className="space-y-2">
                                {medico.abilitazioni.map((abilitazione) => (
                                    <div
                                        key={abilitazione.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {abilitazione.prestazione?.nome || 'Prestazione'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {abilitazione.prestazione?.codice}
                                                {abilitazione.prestazione?.brancaSpecialistica && (
                                                    <span className="ml-2 text-teal-600">
                                                        • {abilitazione.prestazione.brancaSpecialistica}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {abilitazione.attivo && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                Attiva
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">
                                Nessuna prestazione abilitata.
                                <button
                                    onClick={() => navigate(`/poliambulatorio/personale/medici/${id}/modifica`)}
                                    className="ml-1 text-teal-600 hover:text-teal-700 underline"
                                >
                                    Aggiungi prestazioni
                                </button>
                            </p>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-teal-600" />
                            Informazioni
                        </h2>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500 uppercase">Creato il</label>
                                <p className="text-gray-900">
                                    {medico.createdAt
                                        ? new Date(medico.createdAt).toLocaleDateString('it-IT', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })
                                        : '-'}
                                </p>
                            </div>
                            {medico.lastLogin && (
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Ultimo accesso</label>
                                    <p className="text-gray-900">
                                        {new Date(medico.lastLogin).toLocaleDateString('it-IT', {
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

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Azioni Rapide
                        </h2>
                        <div className="space-y-2">
                            <button
                                onClick={() => navigate(`/poliambulatorio/personale/medici/${id}/modifica`)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <Edit2 className="h-4 w-4" />
                                Modifica Dati
                            </button>
                            <button
                                onClick={() => navigate(`/poliambulatorio/agenda?medicoId=${id}`)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <Calendar className="h-4 w-4" />
                                Vedi Agenda
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicoDetailPage;
