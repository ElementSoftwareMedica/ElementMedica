/**
 * FirmaVisitaCard - Card combinata firma medico e paziente in visita
 * 
 * Due sezioni:
 * 1. Firma Medico — mostra tipo preferito, consente cambio, preview firma salvata
 * 2. Firma Paziente — acquisizione firma paziente tramite SignatureModal
 * 
 * Posizionata sotto la card "Azioni Rapide" nella sidebar della visita.
 * 
 * @module pages/clinica/clinica/components/FirmaVisitaCard
 * @project P65 - Firma Digitale Integration
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    PenTool,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Stethoscope,
    User
} from 'lucide-react';
import { useToast } from '../../../../hooks/useToast';
import { apiGet, apiPost, apiPut } from '../../../../services/api';
import { SignatureModal, SignatureResult } from '../../../../components/signature';

// ============================================
// TYPES
// ============================================

interface FirmaVisitaCardProps {
    pazienteId: string;
    pazienteNome: string;
    visitaId?: string;
    /** Current logged-in medico Person ID */
    medicoId?: string;
    medicoNome?: string;
    /** When true, disables all signature interactions (completed/cancelled visits) */
    isReadonly?: boolean;
}

interface SavedSignatureInfo {
    firmaId: string;
    imageUrl: string;
    tipo: string;
    lastUsed: string;
}

type TipoFirma = 'SEMPLICE' | 'GRAFOMETRICA';

const FIRMA_LABELS: Record<TipoFirma, string> = {
    SEMPLICE: 'Semplice',
    GRAFOMETRICA: 'Grafometrica'
};

const FIRMA_DESCRIPTIONS: Record<TipoFirma, string> = {
    SEMPLICE: 'Username/password — solo documenti interni',
    GRAFOMETRICA: 'Firma su tablet/pad con acquisizione immagine'
};

// ============================================
// API
// ============================================

const firmaApi = {
    // Paziente
    getSavedPaziente: (pazienteId: string) =>
        apiGet<SavedSignatureInfo>(`/api/v1/signatures/saved/${pazienteId}`),
    savePatient: (data: { pazienteId: string; firmaImageBase64: string; visitaId?: string; biometricData?: unknown }) =>
        apiPost<{ success: boolean }>('/api/v1/signatures/save-patient-signature', data),
    // Medico
    getSavedMedico: (medicoId: string) =>
        apiGet<SavedSignatureInfo>(`/api/v1/signatures/saved/${medicoId}`),
    getPreference: () =>
        apiGet<{ preferredType: TipoFirma }>('/api/v1/signatures/preferences/me'),
    setPreference: (tipoFirma: TipoFirma) =>
        apiPut<{ success: boolean; data: { preferredType: TipoFirma } }>('/api/v1/signatures/preferences/me', { tipoFirma }),
    saveStandalone: (data: { firmaImageBase64: string; biometricData?: unknown }) =>
        apiPost<{ success: boolean }>('/api/v1/signatures/save-standalone', data),
};

// ============================================
// COMPONENT
// ============================================

const FirmaVisitaCard: React.FC<FirmaVisitaCardProps> = ({
    pazienteId,
    pazienteNome,
    visitaId,
    medicoId,
    medicoNome,
    isReadonly = false
}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [isPazienteModalOpen, setIsPazienteModalOpen] = useState(false);
    const [isMedicoModalOpen, setIsMedicoModalOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);

    // ============================================
    // MEDICO QUERIES
    // ============================================

    const { data: medicoPreference, isLoading: isLoadingPref } = useQuery({
        queryKey: ['signaturePreference', 'me'],
        queryFn: async () => {
            try {
                const res = await firmaApi.getPreference();
                return res?.preferredType || 'SEMPLICE';
            } catch {
                return 'SEMPLICE' as TipoFirma;
            }
        },
        enabled: !!medicoId,
        staleTime: 60000
    });

    const { data: medicoSavedSignature, isLoading: isLoadingMedicoSig } = useQuery({
        queryKey: ['savedSignature', medicoId],
        queryFn: async () => {
            try {
                const result = medicoId ? await firmaApi.getSavedMedico(medicoId) : null;
                // API returns { data: null } when no signature exists — normalize to null
                return result?.firmaId ? result : null;
            } catch {
                return null;
            }
        },
        enabled: !!medicoId,
        staleTime: 60000
    });

    const updatePreferenceMutation = useMutation({
        mutationFn: (tipo: TipoFirma) => firmaApi.setPreference(tipo),
        onSuccess: (_data, tipo) => {
            queryClient.invalidateQueries({ queryKey: ['signaturePreference', 'me'] });
            showToast({ message: `Tipo firma aggiornato: ${FIRMA_LABELS[tipo]}`, type: 'success' });
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const saveMedicoMutation = useMutation({
        mutationFn: (result: SignatureResult) =>
            firmaApi.saveStandalone({
                firmaImageBase64: result.signatureData.imageBase64,
                biometricData: result.signatureData.biometricData
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedSignature', medicoId] });
            showToast({ message: 'Firma medico salvata', type: 'success' });
            setIsMedicoModalOpen(false);
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    // ============================================
    // PAZIENTE QUERIES
    // ============================================

    const { data: pazienteSavedSignature, isLoading: isLoadingPazSig } = useQuery({
        queryKey: ['savedSignature', pazienteId],
        queryFn: async () => {
            try {
                const result = await firmaApi.getSavedPaziente(pazienteId);
                // API returns { data: null } when no signature exists — normalize to null
                return result?.firmaId ? result : null;
            } catch {
                return null;
            }
        },
        enabled: !!pazienteId
    });

    const savePazienteMutation = useMutation({
        mutationFn: (result: SignatureResult) =>
            firmaApi.savePatient({
                pazienteId,
                firmaImageBase64: result.signatureData.imageBase64,
                visitaId,
                biometricData: result.signatureData.biometricData
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedSignature', pazienteId] });
            showToast({ message: 'Firma paziente acquisita con successo', type: 'success' });
            setIsPazienteModalOpen(false);
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore', type: 'error' });
        }
    });

    const handlePazienteSign = useCallback((result: SignatureResult) => {
        savePazienteMutation.mutate(result);
    }, [savePazienteMutation]);

    const handleMedicoSign = useCallback((result: SignatureResult) => {
        saveMedicoMutation.mutate(result);
    }, [saveMedicoMutation]);

    const isLoading = isLoadingPref || isLoadingMedicoSig || isLoadingPazSig;
    const currentPref = (medicoPreference || 'SEMPLICE') as TipoFirma;

    // Auto-collapse when both signatures exist, auto-expand when any is missing
    const [hasSetInitialState, setHasSetInitialState] = useState(false);
    useEffect(() => {
        if (!hasSetInitialState && !isLoading) {
            const bothSigned = !!medicoSavedSignature && !!pazienteSavedSignature;
            setIsExpanded(!bothSigned);
            setHasSetInitialState(true);
        }
    }, [isLoading, medicoSavedSignature, pazienteSavedSignature, hasSetInitialState]);

    return (
        <>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Header — collapsible */}
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <PenTool className="h-4 w-4 text-teal-600" />
                        Firma Digitale
                    </h4>
                    <div className="flex items-center gap-2">
                        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                        {/* Status indicators */}
                        {medicoSavedSignature && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="hidden sm:inline">Med</span>
                            </span>
                        )}
                        {pazienteSavedSignature && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="hidden sm:inline">Paz</span>
                            </span>
                        )}
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                    </div>
                </button>

                {isExpanded && (
                    <div className="p-4 space-y-4">
                        {/* ================================================ */}
                        {/* SEZIONE FIRMA MEDICO                              */}
                        {/* ================================================ */}
                        {medicoId && (
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                        Firma Medico
                                    </span>
                                </div>

                                {/* Tipo firma selector */}
                                <div className="mb-2">
                                    <label className="text-xs text-gray-500 mb-1 block">Tipo firma preferito</label>
                                    <select
                                        value={currentPref}
                                        onChange={(e) => updatePreferenceMutation.mutate(e.target.value as TipoFirma)}
                                        disabled={updatePreferenceMutation.isPending}
                                        className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500 disabled:opacity-50"
                                    >
                                        {Object.entries(FIRMA_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {FIRMA_DESCRIPTIONS[currentPref]}
                                    </p>
                                </div>

                                {/* Saved signature preview */}
                                {medicoSavedSignature ? (
                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                <span className="text-[10px] font-medium text-green-700">
                                                    Firma salvata
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsMedicoModalOpen(true)}
                                                disabled={isReadonly}
                                                className={`text-[10px] text-teal-600 hover:text-teal-700 flex items-center gap-0.5 ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <RefreshCw className="h-2.5 w-2.5" />
                                                Aggiorna
                                            </button>
                                        </div>
                                        {medicoSavedSignature.imageUrl && (
                                            <div className="bg-white rounded p-1.5 flex justify-center">
                                                <img
                                                    src={medicoSavedSignature.imageUrl}
                                                    alt="Firma medico"
                                                    className="max-h-12 object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsMedicoModalOpen(true)}
                                        disabled={isReadonly}
                                        className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <PenTool className="h-3 w-3" />
                                        Salva la tua firma
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Divider */}
                        {medicoId && <hr className="border-gray-100" />}

                        {/* ================================================ */}
                        {/* SEZIONE FIRMA PAZIENTE                            */}
                        {/* ================================================ */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <User className="h-3.5 w-3.5 text-teal-600" />
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                    Firma Paziente
                                </span>
                            </div>

                            {pazienteSavedSignature ? (
                                <div className="space-y-2">
                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-2">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                                <span className="text-[10px] font-medium text-green-700">
                                                    Firmato
                                                </span>
                                            </div>
                                        </div>
                                        {pazienteSavedSignature.imageUrl && (
                                            <div className="bg-white rounded p-1.5 flex justify-center">
                                                <img
                                                    src={pazienteSavedSignature.imageUrl}
                                                    alt="Firma paziente"
                                                    className="max-h-12 object-contain"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPazienteModalOpen(true)}
                                        disabled={isReadonly}
                                        className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Riacquisisci firma
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-start gap-1.5 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                                        <AlertCircle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-700">
                                            Firma non ancora acquisita
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsPazienteModalOpen(true)}
                                        disabled={isReadonly}
                                        className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <PenTool className="h-3 w-3" />
                                        Acquisisci firma
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Firma Paziente */}
            <SignatureModal
                isOpen={isPazienteModalOpen}
                onClose={() => setIsPazienteModalOpen(false)}
                onSign={handlePazienteSign}
                title="Firma del Paziente"
                documentDescription={`Acquisizione firma per ${pazienteNome}`}
                signerName={pazienteNome}
                signerRole="PAZIENTE"
                enableBiometric
                signatureType="GRAFOMETRICA"
                isLoading={savePazienteMutation.isPending}
                savedSignatureUrl={pazienteSavedSignature?.imageUrl}
            />

            {/* Modal Firma Medico */}
            {medicoId && (
                <SignatureModal
                    isOpen={isMedicoModalOpen}
                    onClose={() => setIsMedicoModalOpen(false)}
                    onSign={handleMedicoSign}
                    title="La Tua Firma"
                    documentDescription={medicoNome ? `Firma di ${medicoNome}` : 'Salva la tua firma per i documenti'}
                    signerName={medicoNome || ''}
                    signerRole="MEDICO"
                    enableBiometric={currentPref === 'GRAFOMETRICA'}
                    signatureType={currentPref === 'GRAFOMETRICA' ? 'GRAFOMETRICA' : 'SEMPLICE'}
                    isLoading={saveMedicoMutation.isPending}
                    savedSignatureUrl={medicoSavedSignature?.imageUrl}
                />
            )}
        </>
    );
};

export default FirmaVisitaCard;
