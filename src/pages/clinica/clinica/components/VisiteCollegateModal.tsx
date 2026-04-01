/**
 * VisiteCollegateModal — P73
 * Mostra le visite collegate (secondarie o principale) per una visita.
 *
 * Da una visita principale: lista delle visite specialistiche delegate.
 * Da una visita secondaria: card della visita principale.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Link2, Stethoscope, ChevronRight, AlertCircle } from 'lucide-react';
import { visiteApi, type VisitaCollegata } from '../../../../services/clinicaApi';
import { formatMedicoName } from '../../../../utils/textFormatters';

interface VisiteCollegateModalProps {
    visitaId: string;
    isVisitaSecundaria: boolean;
    onClose: () => void;
}

const STATO_LABELS: Record<string, { label: string; className: string }> = {
    PROGRAMMATA: { label: 'Programmata', className: 'bg-blue-100 text-blue-700' },
    IN_CORSO: { label: 'In corso', className: 'bg-amber-100 text-amber-700' },
    COMPLETATA: { label: 'Completata', className: 'bg-teal-100 text-teal-700' },
    ANNULLATA: { label: 'Annullata', className: 'bg-red-100 text-red-700' },
};

export const VisiteCollegateModal: React.FC<VisiteCollegateModalProps> = ({
    visitaId,
    isVisitaSecundaria,
    onClose,
}) => {
    const navigate = useNavigate();

    const { data: visiteCollegate, isLoading: loadingCollegate, isError: errorCollegate } =
        useQuery({
            queryKey: ['visite-collegate', visitaId],
            queryFn: () => visiteApi.getVisiteCollegate(visitaId),
            enabled: !isVisitaSecundaria,
        });

    const { data: visitaPrincipale, isLoading: loadingPrincipale, isError: errorPrincipale } =
        useQuery({
            queryKey: ['visita-principale', visitaId],
            queryFn: () => visiteApi.getVisitaPrincipale(visitaId),
            enabled: isVisitaSecundaria,
        });

    const isLoading = isVisitaSecundaria ? loadingPrincipale : loadingCollegate;
    const isError = isVisitaSecundaria ? errorPrincipale : errorCollegate;

    const handleNavigate = (id: string) => {
        onClose();
        navigate(`/poliambulatorio/visite/${id}`);
    };

    const renderStatoBadge = (stato: string) => {
        const cfg = STATO_LABELS[stato] ?? { label: stato, className: 'bg-gray-100 text-gray-600' };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>
                {cfg.label}
            </span>
        );
    };

    const renderVisitaCard = (v: VisitaCollegata) => {
        const medicoNome = v.medico
            ? formatMedicoName({ firstName: v.medico.firstName, lastName: v.medico.lastName })
            : '—';
        const prestNome = v.prestazione?.nome ?? 'Prestazione sconosciuta';

        return (
            <div
                key={v.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50/30 transition-colors cursor-pointer group"
                onClick={() => handleNavigate(v.id)}
            >
                <div className="flex items-start gap-3 min-w-0">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center mt-0.5">
                        <Stethoscope className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{prestNome}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{medicoNome}</p>
                        <div className="mt-1.5">{renderStatoBadge(v.stato)}</div>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-600 flex-shrink-0 transition-colors" />
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                            <Link2 className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">
                                {isVisitaSecundaria ? 'Visita principale' : 'Visite specialistiche collegate'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {isVisitaSecundaria
                                    ? 'Questa visita delegata è collegata alla visita originale'
                                    : 'Prestazioni delegate ad altri medici specialisti'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {isError && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-700 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Impossibile caricare le visite collegate.</span>
                        </div>
                    )}

                    {!isLoading && !isError && (
                        <>
                            {isVisitaSecundaria && visitaPrincipale && renderVisitaCard(visitaPrincipale)}
                            {!isVisitaSecundaria && visiteCollegate && (
                                visiteCollegate.length === 0
                                    ? (
                                        <div className="text-center py-8">
                                            <p className="text-sm text-gray-500">Nessuna visita specialistica collegata.</p>
                                        </div>
                                    )
                                    : (
                                        <div className="flex flex-col gap-3">
                                            {visiteCollegate.map(v => renderVisitaCard(v))}
                                        </div>
                                    )
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Chiudi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VisiteCollegateModal;
