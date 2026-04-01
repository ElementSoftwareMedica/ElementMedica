/**
 * P65 - SignatureModal Component
 * 
 * Modal per raccolta firma digitale con opzioni:
 * - Firma grafometrica (canvas)
 * - Riutilizzo firma salvata
 * - Conferma GDPR
 * 
 * @module components/signature/SignatureModal
 */

import React, { useRef, useState, useCallback } from 'react';
import {
    X,
    PenTool,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    History,
    Shield,
    FileText
} from 'lucide-react';
import { SignaturePad, SignaturePadRef, SignatureData } from './SignaturePad';

// ============================================
// TYPES
// ============================================

export interface SignatureResult {
    signatureData: SignatureData;
    consent: {
        gdprAccepted: boolean;
        dataProcessingAccepted: boolean;
        timestamp: Date;
    };
}

export interface SignatureModalProps {
    /** Modal aperto */
    isOpen: boolean;
    /** Callback chiusura */
    onClose: () => void;
    /** Callback firma completata */
    onSign: (result: SignatureResult) => void;
    /** Titolo modale */
    title?: string;
    /** Descrizione documento */
    documentDescription?: string;
    /** URL firma salvata per riutilizzo */
    savedSignatureUrl?: string;
    /** Nome firmatario */
    signerName?: string;
    /** Ruolo firmatario (MEDICO, PAZIENTE, etc.) */
    signerRole?: 'MEDICO' | 'PAZIENTE' | 'OPERATORE';
    /** Abilita dati biometrici */
    enableBiometric?: boolean;
    /** In caricamento */
    isLoading?: boolean;
    /** Tipo firma (per logging) */
    signatureType?: 'SEMPLICE' | 'GRAFOMETRICA';
}

// ============================================
// CONSENT TEXT
// ============================================

const CONSENT_TEXT = {
    gdpr: `Dichiaro di aver letto e compreso l'informativa sulla privacy e acconsento al trattamento dei miei dati personali ai sensi del Regolamento UE 2016/679 (GDPR).`,
    dataProcessing: `Autorizzo l'utilizzo della mia firma digitale per la sottoscrizione del presente documento. La firma verrà conservata secondo le normative vigenti.`,
    biometric: `Acconsento alla raccolta dei dati biometrici della firma (pressione, velocità) ai fini della verifica di autenticità, come previsto dalla normativa eIDAS.`
};

// ============================================
// COMPONENT
// ============================================

export const SignatureModal: React.FC<SignatureModalProps> = ({
    isOpen,
    onClose,
    onSign,
    title = 'Firma Digitale',
    documentDescription,
    savedSignatureUrl,
    signerName,
    signerRole = 'OPERATORE',
    enableBiometric = false,
    isLoading = false,
    signatureType = 'GRAFOMETRICA'
}) => {
    // Refs
    const signaturePadRef = useRef<SignaturePadRef>(null);

    // State
    const [gdprAccepted, setGdprAccepted] = useState(false);
    const [dataProcessingAccepted, setDataProcessingAccepted] = useState(false);
    const [biometricAccepted, setBiometricAccepted] = useState(!enableBiometric);
    const [signatureEmpty, setSignatureEmpty] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ============================================
    // HANDLERS
    // ============================================

    /**
     * Verifica se form è valido
     */
    const isFormValid = useCallback(() => {
        return (
            !signatureEmpty &&
            gdprAccepted &&
            dataProcessingAccepted &&
            (enableBiometric ? biometricAccepted : true)
        );
    }, [signatureEmpty, gdprAccepted, dataProcessingAccepted, enableBiometric, biometricAccepted]);

    /**
     * Handle signature change
     */
    const handleSignatureChange = useCallback((isEmpty: boolean) => {
        setSignatureEmpty(isEmpty);
        setError(null);
    }, []);

    /**
     * Handle sign button click
     */
    const handleSign = useCallback(() => {
        if (!signaturePadRef.current) return;

        const signatureData = signaturePadRef.current.getSignatureData('png');

        if (signatureData.isEmpty) {
            setError('Inserisci la tua firma prima di procedere');
            return;
        }

        if (!gdprAccepted || !dataProcessingAccepted) {
            setError('Devi accettare i consensi obbligatori');
            return;
        }

        onSign({
            signatureData,
            consent: {
                gdprAccepted,
                dataProcessingAccepted,
                timestamp: new Date()
            }
        });
    }, [gdprAccepted, dataProcessingAccepted, onSign]);

    /**
     * Handle modal close
     */
    const handleClose = useCallback(() => {
        if (isLoading) return;

        // Reset state
        setGdprAccepted(false);
        setDataProcessingAccepted(false);
        setBiometricAccepted(!enableBiometric);
        setSignatureEmpty(true);
        setError(null);

        onClose();
    }, [isLoading, enableBiometric, onClose]);

    /**
     * Get signer role label
     */
    const getSignerRoleLabel = () => {
        switch (signerRole) {
            case 'MEDICO': return 'Medico';
            case 'PAZIENTE': return 'Paziente';
            case 'OPERATORE': return 'Operatore';
            default: return signerRole;
        }
    };

    // ============================================
    // RENDER
    // ============================================

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
                className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <PenTool className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">{title}</h2>
                                {signerName && (
                                    <p className="text-teal-100 text-sm">
                                        {getSignerRoleLabel()}: {signerName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                        >
                            <X className="h-5 w-5 text-white" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Document description */}
                    {documentDescription && (
                        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <FileText className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-700">Documento</p>
                                <p className="text-sm text-gray-600">{documentDescription}</p>
                            </div>
                        </div>
                    )}

                    {/* Signature Pad */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Firma
                        </label>
                        <SignaturePad
                            ref={signaturePadRef}
                            height={180}
                            penColor="#1a1a2e"
                            penWidth={2.5}
                            enableBiometric={enableBiometric}
                            savedSignatureUrl={savedSignatureUrl}
                            onChange={handleSignatureChange}
                            placeholder="Traccia la tua firma qui"
                            disabled={isLoading}
                        />

                        {savedSignatureUrl && (
                            <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                <History className="h-3 w-3" />
                                Puoi usare la firma salvata cliccando l'icona in basso a destra
                            </p>
                        )}
                    </div>

                    {/* Consents */}
                    <div className="space-y-3">
                        <div className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-teal-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-700">Consensi obbligatori</span>
                        </div>

                        {/* GDPR Consent */}
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={gdprAccepted}
                                onChange={(e) => setGdprAccepted(e.target.checked)}
                                disabled={isLoading}
                                className="mt-0.5 h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-600">{CONSENT_TEXT.gdpr}</span>
                        </label>

                        {/* Data Processing Consent */}
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={dataProcessingAccepted}
                                onChange={(e) => setDataProcessingAccepted(e.target.checked)}
                                disabled={isLoading}
                                className="mt-0.5 h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                            />
                            <span className="text-sm text-gray-600">{CONSENT_TEXT.dataProcessing}</span>
                        </label>

                        {/* Biometric Consent (optional) */}
                        {enableBiometric && (
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={biometricAccepted}
                                    onChange={(e) => setBiometricAccepted(e.target.checked)}
                                    disabled={isLoading}
                                    className="mt-0.5 h-4 w-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                                />
                                <span className="text-sm text-gray-600">{CONSENT_TEXT.biometric}</span>
                            </label>
                        )}
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-700">
                            <p className="font-medium">Attenzione</p>
                            <p>Una volta firmato, il documento non potrà essere modificato.</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleSign}
                        disabled={!isFormValid() || isLoading}
                        className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="h-5 w-5 animate-spin" />
                                Firma in corso...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-5 w-5" />
                                Conferma Firma
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
