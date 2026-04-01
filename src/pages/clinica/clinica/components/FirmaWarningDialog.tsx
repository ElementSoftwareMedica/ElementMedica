/**
 * FirmaWarningDialog
 * 
 * S68: Dialog displayed when "Salva e Completa" is clicked and there are
 * unsigned documents (questionari/modulistica). Gives the user multiple
 * options: cancel, continue without signatures, apply patient/medico/all
 * signatures before completing.
 * 
 * @module pages/clinica/clinica/components
 */

import React from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle,
    X,
    PenTool,
    CheckCircle,
    XCircle,
    User,
    Stethoscope,
    Loader2
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type FirmaWarningAction =
    | 'cancel'
    | 'continue-without'
    | 'firma-paziente'
    | 'firma-medico'
    | 'firma-tutte';

export interface UnsignedDocSummary {
    /** Total count of docs missing patient signature */
    missingPaziente: number;
    /** Total count of docs missing medico signature */
    missingMedico: number;
    /** IDs of docs that need patient signature */
    idsMissingPaziente: string[];
    /** IDs of docs that need medico signature */
    idsMissingMedico: string[];
    /** Whether there is a saved patient signature available */
    hasSavedFirmaPaziente: boolean;
    /** Whether there is a saved medico signature available */
    hasSavedFirmaMedico: boolean;
}

interface FirmaWarningDialogProps {
    isOpen: boolean;
    onAction: (action: FirmaWarningAction) => void;
    summary: UnsignedDocSummary;
    isLoading?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const FirmaWarningDialog: React.FC<FirmaWarningDialogProps> = ({
    isOpen,
    onAction,
    summary,
    isLoading = false
}) => {
    if (!isOpen) return null;

    const { missingPaziente, missingMedico, hasSavedFirmaPaziente, hasSavedFirmaMedico } = summary;
    const totalMissing = missingPaziente + missingMedico;
    const bothMissing = missingPaziente > 0 && missingMedico > 0;

    const content = (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => !isLoading && onAction('cancel')} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-orange-100 bg-orange-50">
                    <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Documenti non firmati
                        </h3>
                        <p className="text-sm text-gray-600">
                            {totalMissing} {totalMissing === 1 ? 'firma mancante' : 'firme mancanti'} nei documenti compilati
                        </p>
                    </div>
                    {!isLoading && (
                        <button
                            onClick={() => onAction('cancel')}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Summary */}
                <div className="px-6 py-4 space-y-3">
                    {missingPaziente > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900">
                                    Firma Paziente mancante
                                </p>
                                <p className="text-xs text-blue-700">
                                    {missingPaziente} {missingPaziente === 1 ? 'documento' : 'documenti'}
                                    {!hasSavedFirmaPaziente && ' — Firma non ancora acquisita'}
                                </p>
                            </div>
                        </div>
                    )}

                    {missingMedico > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                            <Stethoscope className="w-5 h-5 text-teal-600 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-teal-900">
                                    Firma Medico mancante
                                </p>
                                <p className="text-xs text-teal-700">
                                    {missingMedico} {missingMedico === 1 ? 'documento' : 'documenti'}
                                    {!hasSavedFirmaMedico && ' — Firma non ancora acquisita'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-2">
                    {/* Apply all signatures */}
                    {bothMissing && (hasSavedFirmaPaziente || hasSavedFirmaMedico) && (
                        <button
                            onClick={() => onAction('firma-tutte')}
                            disabled={isLoading || (!hasSavedFirmaPaziente && !hasSavedFirmaMedico)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <PenTool className="w-4 h-4" />
                            )}
                            Applica tutte le firme disponibili
                        </button>
                    )}

                    {/* Apply patient signature only */}
                    {missingPaziente > 0 && hasSavedFirmaPaziente && (
                        <button
                            onClick={() => onAction('firma-paziente')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                            Applica solo firma paziente ({missingPaziente})
                        </button>
                    )}

                    {/* Apply medico signature only */}
                    {missingMedico > 0 && hasSavedFirmaMedico && (
                        <button
                            onClick={() => onAction('firma-medico')}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Stethoscope className="w-4 h-4" />
                            )}
                            Applica solo firma medico ({missingMedico})
                        </button>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                        {/* Continue without signatures */}
                        <button
                            onClick={() => onAction('continue-without')}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Continua senza firme
                        </button>

                        {/* Cancel */}
                        <button
                            onClick={() => onAction('cancel')}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            <XCircle className="w-4 h-4" />
                            Annulla
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default FirmaWarningDialog;
