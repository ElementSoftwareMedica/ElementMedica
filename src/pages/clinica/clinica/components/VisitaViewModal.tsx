/**
 * VisitaViewModal - Modal for viewing a previous visit in read-only mode
 * 
 * Displays visit details including:
 * - Patient and doctor info
 * - Visit date and status
 * - Structured data from template fields
 * - Prestazioni and diagnosis
 * 
 * Access control is handled by the backend - this modal receives
 * only the visits the user is authorized to see.
 * 
 * @module pages/clinica/clinica/components/VisitaViewModal
 * @project P52 - Clinical Visit Template System
 * @session #16 - Visite Precedenti Modal
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    X,
    Calendar,
    Clock,
    User,
    Stethoscope,
    FileText,
    Activity,
    Pill,
    AlertCircle,
    Loader2,
    Eye
} from 'lucide-react';
import { apiGet } from '../../../../services/api';
import { formatMedicoName } from '../../../../utils/textFormatters';

interface VisitaViewModalProps {
    visitaId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Extended Visita type with relations for view modal
interface VisitaWithRelations {
    id: string;
    stato: string;
    dataOra?: string;
    createdAt: string;
    updatedAt: string;
    paziente?: {
        firstName?: string;
        lastName?: string;
        taxCode?: string;
    };
    medico?: {
        firstName?: string;
        lastName?: string;
        gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null;
    };
    prestazione?: {
        id?: string;
        nome: string;
        codice?: string;
    };
    anamnesi?: string;
    esamiObiettivo?: string;
    diagnosiPrincipale?: string;
    terapia?: string;
    noteClinico?: string;
    datiStrutturati?: Record<string, unknown>;
}

interface VisitaViewModalProps {
    visitaId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const VisitaViewModal: React.FC<VisitaViewModalProps> = ({
    visitaId,
    isOpen,
    onClose
}) => {
    // Fetch visita details with relations (paziente, medico, prestazione)
    const { data: visita, isLoading, error } = useQuery<VisitaWithRelations>({
        queryKey: ['visita-view', visitaId],
        queryFn: async () => {
            const response = await apiGet<VisitaWithRelations>(`/api/v1/clinica/visite/${visitaId}`);
            return response;
        },
        enabled: isOpen && !!visitaId,
        staleTime: 60000
    });

    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatoColor = (stato: string) => {
        switch (stato) {
            case 'COMPLETATA': return 'bg-green-100 text-green-700';
            case 'IN_CORSO': return 'bg-blue-100 text-blue-700';
            case 'PROGRAMMATA': return 'bg-amber-100 text-amber-700';
            case 'ANNULLATA': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Eye className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Visita Precedente
                                </h2>
                                {visita && (
                                    <p className="text-sm text-gray-500">
                                        {formatDate(visita.dataOra || visita.createdAt)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                            </div>
                        )}

                        {error && (
                            <div className="flex flex-col items-center justify-center py-12 text-red-500">
                                <AlertCircle className="h-10 w-10 mb-3" />
                                <p>Errore nel caricamento della visita</p>
                            </div>
                        )}

                        {visita && (
                            <div className="space-y-6">
                                {/* Status Badge */}
                                <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatoColor(visita.stato || '')}`}>
                                        {(visita.stato || '').replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Patient & Doctor Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span className="text-xs font-medium text-gray-500 uppercase">Paziente</span>
                                        </div>
                                        <p className="font-medium text-gray-900">
                                            {visita.paziente?.lastName} {visita.paziente?.firstName}
                                        </p>
                                        {visita.paziente?.taxCode && (
                                            <p className="text-sm text-gray-500">{visita.paziente.taxCode}</p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Stethoscope className="h-4 w-4 text-gray-400" />
                                            <span className="text-xs font-medium text-gray-500 uppercase">Medico</span>
                                        </div>
                                        <p className="font-medium text-gray-900">
                                            {visita.medico && formatMedicoName(visita.medico)}
                                        </p>
                                    </div>
                                </div>

                                {/* Prestazione */}
                                {visita.prestazione && (
                                    <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Activity className="h-4 w-4 text-indigo-500" />
                                            <span className="text-xs font-medium text-indigo-600 uppercase">Prestazione</span>
                                        </div>
                                        <p className="font-medium text-gray-900">{visita.prestazione.nome}</p>
                                        {visita.prestazione.codice && (
                                            <p className="text-sm text-gray-500">Codice: {visita.prestazione.codice}</p>
                                        )}
                                    </div>
                                )}

                                {/* Anamnesi */}
                                {visita.anamnesi && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Anamnesi
                                        </h3>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.anamnesi}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Esame Obiettivo */}
                                {visita.esamiObiettivo && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Esame Obiettivo</h3>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.esamiObiettivo}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Diagnosi */}
                                {visita.diagnosiPrincipale && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Diagnosi Principale</h3>
                                        <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                                            <p className="text-gray-700">{visita.diagnosiPrincipale}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Terapia */}
                                {visita.terapia && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            <Pill className="h-4 w-4" />
                                            Terapia
                                        </h3>
                                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.terapia}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Note */}
                                {visita.noteClinico && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Note Cliniche</h3>
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-gray-700 whitespace-pre-wrap">{visita.noteClinico}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Dati Strutturati */}
                                {visita.datiStrutturati && Object.keys(visita.datiStrutturati).length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Dati Strutturati</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(visita.datiStrutturati as Record<string, unknown>)
                                                .filter(([key]) => !key.startsWith('_'))
                                                .map(([key, value]) => (
                                                    <div key={key} className="p-2 bg-gray-50 rounded">
                                                        <span className="text-xs text-gray-500">{key}</span>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {typeof value === 'object' ? JSON.stringify(value) : String(value || '-')}
                                                        </p>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Timestamps */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Creata: {formatDate(visita.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>Aggiornata: {formatDate(visita.updatedAt)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitaViewModal;
