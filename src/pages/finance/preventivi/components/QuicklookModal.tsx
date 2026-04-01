/**
 * QuicklookModal Component
 * 
 * Quick preview modal for viewing preventivo details.
 * Extracted from PreventiviPage.tsx as part of Project 46 modularization.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
    X,
    Eye,
    FileText,
    Building2,
    User,
    Calendar,
    Tag,
    Download
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Preventivo, STATUS_CONFIG, TIPO_SERVIZIO_CONFIG } from '../types';

interface QuicklookModalProps {
    isOpen: boolean;
    onClose: () => void;
    preventivo: Preventivo | null;
    onEdit: () => void;
    onDownloadPdf: () => void;
}

const QuicklookModal: React.FC<QuicklookModalProps> = ({
    isOpen,
    onClose,
    preventivo,
    onEdit,
    onDownloadPdf
}) => {
    if (!isOpen || !preventivo) return null;

    const statusConfig = STATUS_CONFIG[preventivo.stato] || STATUS_CONFIG.BOZZA;
    const StatusIcon = statusConfig.icon;
    const tipoConfig = TIPO_SERVIZIO_CONFIG[preventivo.tipoServizio] || TIPO_SERVIZIO_CONFIG.ALTRO;
    const TipoIcon = tipoConfig.icon;

    const voci = preventivo.dettagliServizio?.voci || [];

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-black/50 w-full max-w-lg max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Anteprima Preventivo
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[55vh]">
                    {/* Header info */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-gray-400" />
                            <span className="font-mono font-bold text-xl text-gray-900 dark:text-gray-50">
                                {preventivo.numero}
                            </span>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.className}`}>
                            <StatusIcon className="h-4 w-4" />
                            {statusConfig.label}
                        </span>
                    </div>

                    {/* Cliente */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            {preventivo.azienda ? (
                                <>
                                    <Building2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-50">
                                        {preventivo.azienda.ragioneSociale}
                                    </span>
                                </>
                            ) : preventivo.persona ? (
                                <>
                                    <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    <span className="font-medium text-gray-900 dark:text-gray-50">
                                        {preventivo.persona.firstName} {preventivo.persona.lastName}
                                    </span>
                                </>
                            ) : (
                                <span className="text-gray-400">Cliente non specificato</span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                                <TipoIcon className={`h-4 w-4 ${tipoConfig.color}`} />
                                <span>{tipoConfig.label}</span>
                            </div>
                            {preventivo.dataEmissione && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        {format(new Date(preventivo.dataEmissione), 'dd/MM/yyyy', { locale: it })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Servizio */}
                    <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Servizio</h3>
                        <p className="font-medium text-gray-900 dark:text-gray-50">
                            {preventivo.titoloServizio || '-'}
                        </p>
                        {/* Mostra descrizione senza la sezione "Dettaglio voci:" */}
                        {preventivo.descrizioneServizio &&
                            !preventivo.descrizioneServizio.includes('Dettaglio voci:') && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                                    {preventivo.descrizioneServizio}
                                </p>
                            )}
                        {preventivo.descrizioneServizio &&
                            preventivo.descrizioneServizio.includes('Dettaglio voci:') && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                                    {preventivo.descrizioneServizio.split('Dettaglio voci:')[0].trim()}
                                </p>
                            )}
                    </div>

                    {/* Voci se presenti */}
                    {voci.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Dettaglio voci</h3>
                            <div className="space-y-2">
                                {voci.slice(0, 5).map((voce: any, index: number) => (
                                    <div
                                        key={index}
                                        className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded"
                                    >
                                        <div className="flex-1">
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {voce.descrizione || voce.titoloServizio || '-'}
                                            </span>
                                            {voce.quantita && voce.quantita > 1 && (
                                                <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">x{voce.quantita}</span>
                                            )}
                                        </div>
                                        <span className="font-medium text-gray-900 dark:text-gray-50">
                                            € {Number(voce.subtotale || voce.importo || voce.prezzoTotale || 0).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                                {voci.length > 5 && (
                                    <p className="text-xs text-gray-400 text-center">
                                        +{voci.length - 5} altre voci
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sconti */}
                    {preventivo.sconti && preventivo.sconti.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Sconti applicati</h3>
                            <div className="space-y-1">
                                {preventivo.sconti.map((sconto: any, index: number) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between text-sm bg-green-50 px-3 py-2 rounded"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-green-600" />
                                            <span className="text-green-700">
                                                {sconto.codiceTesto || sconto.codice?.codice || 'Sconto'}
                                            </span>
                                            {sconto.tipoSconto === 'PERCENTUALE' && sconto.valoreSconto && (
                                                <span className="text-green-500 text-xs">
                                                    ({Number(sconto.valoreSconto)}%)
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-medium text-green-600">
                                            -€ {Number(sconto.importoScontato || 0).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Totali con breakdown chiaro */}
                    <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                        <div className="space-y-2 text-sm">
                            {(() => {
                                const totaleVoci = voci.length > 0
                                    ? voci.reduce(
                                        (sum: number, v: any) =>
                                            sum + Number(v.subtotale || v.importo || v.prezzoTotale || 0),
                                        0
                                    )
                                    : Number(preventivo.prezzoTotale || preventivo.imponibile || 0);
                                const hasSconti = preventivo.sconti && preventivo.sconti.length > 0;
                                const totaleSconto = hasSconti && preventivo.sconti
                                    ? preventivo.sconti.reduce(
                                        (sum: number, s: any) => sum + Number(s.importoScontato || 0),
                                        0
                                    )
                                    : 0;

                                return (
                                    <>
                                        {/* Mostra subtotale solo se c'è sconto applicato */}
                                        {hasSconti && totaleSconto > 0 && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600 dark:text-gray-400">Subtotale voci:</span>
                                                    <span className="font-medium">€ {totaleVoci.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-green-600 bg-green-50 dark:bg-green-900/30 -mx-2 px-2 py-1 rounded">
                                                    <span className="flex items-center gap-1">
                                                        <Tag className="h-3.5 w-3.5" />
                                                        Sconto applicato
                                                    </span>
                                                    <span className="font-medium">-€ {totaleSconto.toFixed(2)}</span>
                                                </div>
                                            </>
                                        )}
                                    </>
                                );
                            })()}

                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Imponibile:</span>
                                <span className="font-medium">
                                    € {Number(preventivo.imponibile || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                    IVA ({preventivo.aliquotaIva || 22}%):
                                </span>
                                <span className="font-medium">
                                    € {Number(preventivo.importoIva || 0).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-orange-300 dark:border-orange-600">
                                <span className="text-gray-900 dark:text-gray-50 font-semibold">Totale:</span>
                                <span className="text-xl font-bold text-orange-600">
                                    € {Number(preventivo.importoFinale || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    {preventivo.note && (
                        <div className="mt-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Note</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{preventivo.note}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between gap-3 bg-gray-50 dark:bg-gray-700/50">
                    <Button variant="outline" onClick={onClose}>
                        Chiudi
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onDownloadPdf}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            PDF
                        </Button>
                        <Button
                            variant="primary"
                            onClick={onEdit}
                            className="flex items-center gap-2"
                        >
                            <FileText className="h-4 w-4" />
                            Modifica
                        </Button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QuicklookModal;
