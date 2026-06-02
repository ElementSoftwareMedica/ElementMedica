/**
 * ExitVisitDialog - Modal for handling visit exit with save options
 * 
 * Shows when user tries to leave a visit page, offering 3 options:
 * - Save as draft (BOZZA)
 * - Save as completed (COMPLETATA) 
 * - Discard and reset appointment to pending (IN_ATTESA)
 * 
 * GDPR Compliance: When discarding, user must provide a reason (min 10 chars)
 * which is logged in GdprAuditLog for compliance.
 * 
 * @module pages/clinica/clinica/components/ExitVisitDialog
 * @project P52 - Clinical Visit Template System
 * @session #13, P58 GDPR deletion reason
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Save,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    Loader2
} from 'lucide-react';

export type ExitVisitAction = 'save-draft' | 'save-complete' | 'discard' | 'cancel';

/** Extended action type with optional deletion reason for GDPR compliance */
export interface ExitVisitActionData {
    action: ExitVisitAction;
    deletionReason?: string;
}

interface ExitVisitDialogProps {
    /** Whether the dialog is open */
    isOpen: boolean;
    /** Callback when dialog should close */
    onClose: () => void;
    /** Callback when an action is selected - receives action and optional deletion reason */
    onAction: (action: ExitVisitAction, deletionReason?: string) => Promise<void>;
    /** Whether there are unsaved changes */
    hasUnsavedChanges?: boolean;
    /** Whether the visit has required fields filled */
    canComplete?: boolean;
    /** Loading state for save operations */
    isLoading?: boolean;
    /** Whether this is a new version revert (skip GDPR deletion reason) */
    isNuovaVersione?: boolean;
}

export const ExitVisitDialog: React.FC<ExitVisitDialogProps> = ({
    isOpen,
    onClose,
    onAction,
    hasUnsavedChanges = true,
    canComplete = true,
    isLoading = false,
    isNuovaVersione = false
}) => {
    const [selectedAction, setSelectedAction] = useState<ExitVisitAction | null>(null);
    const [showDeletionReason, setShowDeletionReason] = useState(false);
    const [deletionReason, setDeletionReason] = useState('');
    const [deletionReasonError, setDeletionReasonError] = useState('');

    // Reset state when dialog closes
    const handleClose = () => {
        setSelectedAction(null);
        setShowDeletionReason(false);
        setDeletionReason('');
        setDeletionReasonError('');
        onClose();
    };

    if (!isOpen) return null;

    const handleAction = async (action: ExitVisitAction) => {
        if (action === 'cancel') {
            handleClose();
            return;
        }

        // For discard action, show deletion reason form first (only for first-visit deletions, not version reverts)
        if (action === 'discard' && !showDeletionReason && !isNuovaVersione) {
            setShowDeletionReason(true);
            return;
        }

        // Validate deletion reason for discard action (skip for nuova versione - no GDPR reason needed)
        if (action === 'discard' && !isNuovaVersione) {
            if (!deletionReason || deletionReason.trim().length < 10) {
                setDeletionReasonError('La motivazione deve essere di almeno 10 caratteri');
                return;
            }
            setDeletionReasonError('');
        }

        setSelectedAction(action);
        try {
            await onAction(action, action === 'discard' ? deletionReason.trim() : undefined);
            handleClose();
        } catch {
            // Error handling is done in parent
            setSelectedAction(null);
        }
    };

    // Handle back from deletion reason form
    const handleBackFromDeletionReason = () => {
        setShowDeletionReason(false);
        setDeletionReason('');
        setDeletionReasonError('');
    };

    const content = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-visit-title"
        >
            {/* Overlay - z-[1] ensures it stays behind dialog even with backdrop-filter stacking context */}
            <div
                className="absolute inset-0 z-[1] bg-black/50 backdrop-blur-sm"
                onClick={() => !isLoading && onClose()}
            />

            {/* Dialog - z-[2] ensures it stays above overlay */}
            <div className="relative z-[2] bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <h2 id="exit-visit-title" className="text-lg font-semibold text-gray-900">
                            Uscita dalla visita
                        </h2>
                    </div>
                    <button
                        onClick={() => !isLoading && onClose()}
                        disabled={isLoading}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Deletion Reason Form - shown when discard is selected */}
                    {showDeletionReason ? (
                        <>
                            <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-800">
                                        Perché stai annullando questa visita?
                                    </p>
                                    <p className="text-xs text-red-600 mt-0.5">
                                        Questa informazione verrà registrata per conformità GDPR
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="deletion-reason" className="block text-sm font-medium text-gray-700 mb-1">
                                    Motivazione <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    id="deletion-reason"
                                    value={deletionReason}
                                    onChange={(e) => {
                                        setDeletionReason(e.target.value);
                                        if (e.target.value.trim().length >= 10) {
                                            setDeletionReasonError('');
                                        }
                                    }}
                                    placeholder="Es: Paziente non si è presentato / Visita duplicata / Errore di registrazione..."
                                    rows={3}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none
                                              ${deletionReasonError ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                />
                                {deletionReasonError && (
                                    <p className="text-xs text-red-600 mt-1">{deletionReasonError}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                    {deletionReason.length}/10 caratteri minimi
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleBackFromDeletionReason}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-200 
                                             rounded-lg hover:bg-gray-50 transition-colors font-medium
                                             disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ← Indietro
                                </button>
                                <button
                                    onClick={() => handleAction('discard')}
                                    disabled={isLoading || deletionReason.trim().length < 10}
                                    className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium
                                              disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
                                              ${deletionReason.trim().length >= 10
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-gray-400'}`}
                                >
                                    {selectedAction === 'discard' && isLoading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <XCircle className="h-4 w-4" />
                                    )}
                                    Conferma annullamento
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {hasUnsavedChanges && (
                                <p className="text-gray-600 text-sm">
                                    Hai modifiche non salvate. Come vuoi procedere?
                                </p>
                            )}

                            {/* Options */}
                            <div className="space-y-3">
                                {/* Save as Draft */}
                                <button
                                    onClick={() => handleAction('save-draft')}
                                    disabled={isLoading}
                                    className={`w-full flex items-center gap-4 p-4 border rounded-xl transition-all
                                              hover:border-teal-300 hover:bg-teal-50/50 text-left group
                                              ${selectedAction === 'save-draft' ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}
                                              disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className={`p-3 rounded-lg transition-colors
                                                  ${selectedAction === 'save-draft' ? 'bg-teal-100' : 'bg-gray-100 group-hover:bg-teal-100'}`}>
                                        {selectedAction === 'save-draft' && isLoading ? (
                                            <Loader2 className="h-5 w-5 text-teal-600 animate-spin" />
                                        ) : (
                                            <FileText className={`h-5 w-5 ${selectedAction === 'save-draft' ? 'text-teal-600' : 'text-gray-500 group-hover:text-teal-600'}`} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">Salva come bozza</h3>
                                        <p className="text-sm text-gray-500">
                                            Potrai completare la visita in un secondo momento
                                        </p>
                                    </div>
                                </button>

                                {/* Save as Complete */}
                                <button
                                    onClick={() => handleAction('save-complete')}
                                    disabled={isLoading || !canComplete}
                                    className={`w-full flex items-center gap-4 p-4 border rounded-xl transition-all
                                              hover:border-green-300 hover:bg-green-50/50 text-left group
                                              ${selectedAction === 'save-complete' ? 'border-green-500 bg-green-50' : 'border-gray-200'}
                                              disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className={`p-3 rounded-lg transition-colors
                                                  ${selectedAction === 'save-complete' ? 'bg-green-100' : 'bg-gray-100 group-hover:bg-green-100'}`}>
                                        {selectedAction === 'save-complete' && isLoading ? (
                                            <Loader2 className="h-5 w-5 text-green-600 animate-spin" />
                                        ) : (
                                            <CheckCircle className={`h-5 w-5 ${selectedAction === 'save-complete' ? 'text-green-600' : 'text-gray-500 group-hover:text-green-600'}`} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">Completa visita</h3>
                                        <p className="text-sm text-gray-500">
                                            Salva e marca la visita come completata
                                        </p>
                                        {!canComplete && (
                                            <p className="text-xs text-amber-600 mt-1">
                                                ⚠ Compila i campi obbligatori per completare
                                            </p>
                                        )}
                                    </div>
                                </button>

                                {/* Discard Changes */}
                                <button
                                    onClick={() => handleAction('discard')}
                                    disabled={isLoading}
                                    className={`w-full flex items-center gap-4 p-4 border rounded-xl transition-all
                                              hover:border-red-300 hover:bg-red-50/50 text-left group
                                              ${selectedAction === 'discard' ? 'border-red-500 bg-red-50' : 'border-gray-200'}
                                              disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <div className={`p-3 rounded-lg transition-colors
                                                  ${selectedAction === 'discard' ? 'bg-red-100' : 'bg-gray-100 group-hover:bg-red-100'}`}>
                                        {selectedAction === 'discard' && isLoading ? (
                                            <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                                        ) : (
                                            <XCircle className={`h-5 w-5 ${selectedAction === 'discard' ? 'text-red-600' : 'text-gray-500 group-hover:text-red-600'}`} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">
                                            {isNuovaVersione ? 'Ripristina versione precedente' : 'Annulla modifiche'}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {isNuovaVersione
                                                ? 'Annulla le modifiche e ripristina la visita completata precedente'
                                                : 'Scarta le modifiche e ripristina l\'appuntamento'}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer - only show when not in deletion reason form */}
                {!showDeletionReason && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <button
                            onClick={() => handleAction('cancel')}
                            disabled={isLoading}
                            className="w-full px-4 py-2.5 text-gray-700 bg-white border border-gray-200 
                                     rounded-lg hover:bg-gray-50 transition-colors font-medium
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continua a modificare
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    // Use portal to render at document root
    return createPortal(content, document.body);
};

export default ExitVisitDialog;
