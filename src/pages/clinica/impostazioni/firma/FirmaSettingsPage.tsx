/**
 * Firma Settings Page
 * 
 * Pagina impostazioni firma digitale per il modulo Poliambulatorio.
 * - MEDICO: vede solo la propria firma (acquisisce/salva/elimina)
 * - ADMIN: vede tutti i medici del tenant con stato firma
 * 
 * Utilizza componenti esistenti: SignaturePad, SignaturePreferencesConfig
 * 
 * @module pages/poliambulatorio/impostazioni/firma/FirmaSettingsPage
 */

import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    PenTool,
    Trash2,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
    User,
    Shield,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useAuth } from '../../../../hooks/auth/useAuth';
import { useToast } from '../../../../hooks/useToast';
import { apiGet, apiPost, apiDelete } from '../../../../services/api';
import { SignaturePad, SignaturePadRef, SignatureData } from '../../../../components/signature';
import { SignaturePreferencesConfig } from '../../../../components/signature';
import { formatMedicoName } from '../../../../utils/textFormatters';

// ============================================
// TYPES
// ============================================

interface SavedSignatureInfo {
    firmaId: string;
    imageUrl: string;
    tipo: string;
    lastUsed: string;
}

interface MedicoSignatureInfo {
    medicoId: string;
    firstName: string;
    lastName: string;
    gender: string;
    hasSavedSignature: boolean;
    savedSignature: SavedSignatureInfo | null;
    preferredType: string;
}

// ============================================
// API
// ============================================

const firmaSettingsApi = {
    getSavedSignature: (firmatarioId: string) =>
        apiGet<SavedSignatureInfo>(`/api/v1/signatures/saved/${firmatarioId}`),
    saveStandalone: (firmaImageBase64: string, biometricData?: unknown) =>
        apiPost<{ success: boolean; data: unknown }>('/api/v1/signatures/save-standalone', {
            firmaImageBase64,
            biometricData
        }),
    saveForPerson: (targetPersonId: string, firmaImageBase64: string, biometricData?: unknown) =>
        apiPost<{ success: boolean; data: unknown }>(`/api/v1/signatures/admin/save-for/${targetPersonId}`, {
            firmaImageBase64,
            biometricData
        }),
    deleteSaved: () =>
        apiDelete<{ success: boolean; deletedCount: number }>('/api/v1/signatures/saved/me'),
    getSavedMedici: () =>
        apiGet<{ success: boolean; data: MedicoSignatureInfo[] }>('/api/v1/signatures/saved-medici'),
};

// ============================================
// MEDICO VIEW COMPONENT
// ============================================

interface MedicoFirmaViewProps {
    personId: string;
}

function MedicoFirmaView({ personId }: MedicoFirmaViewProps) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const signaturePadRef = useRef<SignaturePadRef>(null);
    const [isCapturing, setIsCapturing] = useState(false);

    // Fetch firma salvata
    const { data: savedSignature, isLoading, error } = useQuery({
        queryKey: ['savedSignature', personId],
        queryFn: async () => {
            try {
                return await firmaSettingsApi.getSavedSignature(personId);
            } catch {
                return null;
            }
        },
        enabled: !!personId
    });

    // Salva firma
    const saveMutation = useMutation({
        mutationFn: async (signatureData: SignatureData) => {
            return firmaSettingsApi.saveStandalone(
                signatureData.imageBase64,
                signatureData.biometricData
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedSignature'] });
            showToast({ message: 'Firma salvata con successo', type: 'success' });
            setIsCapturing(false);
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore nel salvataggio', type: 'error' });
        }
    });

    // Elimina firma
    const deleteMutation = useMutation({
        mutationFn: () => firmaSettingsApi.deleteSaved(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedSignature'] });
            showToast({ message: 'Firma eliminata', type: 'success' });
        },
        onError: (err: Error) => {
            showToast({ message: "Errore nell'eliminazione", type: 'error' });
        }
    });

    const handleSaveSignature = useCallback(() => {
        if (!signaturePadRef.current) return;
        const data = signaturePadRef.current.getSignatureData('png');
        if (data.isEmpty) {
            showToast({ message: 'Disegna la tua firma prima di salvare', type: 'warning' });
            return;
        }
        saveMutation.mutate(data);
    }, [saveMutation, showToast]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="ml-2 text-gray-600">Caricamento firma...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Firma Corrente */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PenTool className="h-5 w-5 text-teal-600" />
                    La tua firma
                </h3>

                {savedSignature && !isCapturing ? (
                    <div className="space-y-4">
                        {/* Preview firma salvata */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">
                                        Firma salvata
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    Tipo: {savedSignature.tipo} &middot; Ultimo uso: {new Date(savedSignature.lastUsed).toLocaleDateString('it-IT')}
                                </span>
                            </div>
                            {savedSignature.imageUrl && (
                                <div className="bg-white border border-gray-100 rounded p-3 flex justify-center">
                                    <img
                                        src={savedSignature.imageUrl}
                                        alt="Firma salvata"
                                        className="max-h-32 object-contain"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Azioni */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCapturing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                            >
                                <PenTool className="h-4 w-4" />
                                Acquisici nuova firma
                            </button>
                            <button
                                type="button"
                                onClick={() => deleteMutation.mutate()}
                                disabled={deleteMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                {deleteMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                Elimina firma
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Nessuna firma o modalità acquisizione */}
                        {!savedSignature && !error && !isCapturing && (
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-amber-800">Nessuna firma salvata</p>
                                    <p className="text-sm text-amber-700 mt-1">
                                        Acquisisci la tua firma per poterla applicare automaticamente ai referti.
                                    </p>
                                </div>
                            </div>
                        )}

                        {!isCapturing ? (
                            <button
                                type="button"
                                onClick={() => setIsCapturing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
                            >
                                <PenTool className="h-4 w-4" />
                                Acquisisci firma
                            </button>
                        ) : (
                            <>
                                <p className="text-sm text-gray-600 mb-2">
                                    Disegna la tua firma nel riquadro qui sotto, poi clicca "Salva firma".
                                </p>
                                <SignaturePad
                                    ref={signaturePadRef}
                                    height={200}
                                    penColor="#1a1a2e"
                                    penWidth={2.5}
                                    enableBiometric
                                    placeholder="Firma qui"
                                    showControls
                                />
                                <div className="flex items-center gap-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={handleSaveSignature}
                                        disabled={saveMutation.isPending}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                        {saveMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        Salva firma
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsCapturing(false);
                                            signaturePadRef.current?.clear();
                                        }}
                                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                    >
                                        Annulla
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Preferenze Tipo Firma */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <SignaturePreferencesConfig showTitle compact />
            </div>
        </div>
    );
}

// ============================================
// ADMIN VIEW COMPONENT
// ============================================

function AdminFirmaView() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const signaturePadRef = useRef<SignaturePadRef>(null);
    const [expandedMedico, setExpandedMedico] = useState<string | null>(null);
    const [capturingFor, setCapturingFor] = useState<string | null>(null);

    // Fetch tutti i medici con stato firma
    const { data: response, isLoading } = useQuery({
        queryKey: ['savedMediciSignatures'],
        queryFn: () => firmaSettingsApi.getSavedMedici(),
    });

    const medici = (response as unknown as { data: MedicoSignatureInfo[] })?.data ?? [];

    // Salva firma per medico specifico (admin)
    const saveMutation = useMutation({
        mutationFn: async ({ targetPersonId, imageBase64, biometricData }: { targetPersonId: string; imageBase64: string; biometricData?: unknown }) =>
            firmaSettingsApi.saveForPerson(targetPersonId, imageBase64, biometricData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedMediciSignatures'] });
            showToast({ message: 'Firma salvata con successo', type: 'success' });
            setCapturingFor(null);
        },
        onError: (err: Error) => {
            showToast({ message: 'Errore nel salvataggio', type: 'error' });
        }
    });

    const handleSaveSignatureFor = useCallback((medicoId: string) => {
        if (!signaturePadRef.current) return;
        const data = signaturePadRef.current.getSignatureData('png');
        if (data.isEmpty) {
            showToast({ message: 'Disegna la firma prima di salvare', type: 'warning' });
            return;
        }
        saveMutation.mutate({ targetPersonId: medicoId, imageBase64: data.imageBase64, biometricData: data.biometricData });
    }, [saveMutation, showToast]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                <span className="ml-2 text-gray-600">Caricamento firme medici...</span>
            </div>
        );
    }

    if (medici.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Nessun medico trovato nel tenant.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-teal-600" />
                    Firme dei medici
                </h3>
                <span className="text-sm text-gray-500">
                    {medici.filter((m: MedicoSignatureInfo) => m.hasSavedSignature).length}/{medici.length} firme acquisite
                </span>
            </div>

            {medici.map((medico: MedicoSignatureInfo) => {
                const isExpanded = expandedMedico === medico.medicoId;
                const isCapturingThisMedico = capturingFor === medico.medicoId;
                const displayName = formatMedicoName({
                    firstName: medico.firstName,
                    lastName: medico.lastName,
                    gender: medico.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_SPECIFIED' | null
                });

                return (
                    <div
                        key={medico.medicoId}
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => setExpandedMedico(isExpanded ? null : medico.medicoId)}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${medico.hasSavedSignature
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {medico.hasSavedSignature ? (
                                        <CheckCircle2 className="h-5 w-5" />
                                    ) : (
                                        <PenTool className="h-5 w-5" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{displayName}</p>
                                    <p className="text-xs text-gray-500">
                                        Tipo preferito: {medico.preferredType}
                                        {medico.hasSavedSignature && medico.savedSignature
                                            ? ` · Ultimo uso: ${new Date(medico.savedSignature.lastUsed).toLocaleDateString('it-IT')}`
                                            : ' · Firma non acquisita'
                                        }
                                    </p>
                                </div>
                            </div>
                            {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                        </button>

                        {isExpanded && (
                            <div className="px-4 pb-4 border-t border-gray-100">
                                <div className="pt-4">
                                    {isCapturingThisMedico ? (
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-600">
                                                Chiedi al medico di firmare nel riquadro qui sotto, poi clicca "Salva firma".
                                            </p>
                                            <SignaturePad
                                                ref={signaturePadRef}
                                                height={180}
                                                penColor="#1a1a2e"
                                                penWidth={2.5}
                                                enableBiometric
                                                placeholder="Firma qui"
                                                showControls
                                            />
                                            <div className="flex items-center gap-3 mt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveSignatureFor(medico.medicoId)}
                                                    disabled={saveMutation.isPending}
                                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50"
                                                >
                                                    {saveMutation.isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Save className="h-4 w-4" />
                                                    )}
                                                    Salva firma
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setCapturingFor(null); signaturePadRef.current?.clear(); }}
                                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                                                >
                                                    Annulla
                                                </button>
                                            </div>
                                        </div>
                                    ) : medico.hasSavedSignature && medico.savedSignature?.imageUrl ? (
                                        <div className="space-y-3">
                                            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 flex justify-center">
                                                <img
                                                    src={medico.savedSignature.imageUrl}
                                                    alt={`Firma di ${displayName}`}
                                                    className="max-h-24 object-contain"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCapturingFor(medico.medicoId)}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors"
                                            >
                                                <PenTool className="h-4 w-4" />
                                                Acquisisci nuova firma
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <PenTool className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                            <p className="text-sm text-gray-400 mb-3">
                                                Questo medico non ha ancora acquisito una firma.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setCapturingFor(medico.medicoId)}
                                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium mx-auto"
                                            >
                                                <PenTool className="h-4 w-4" />
                                                Acquisisci firma per {medico.firstName}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

const FirmaSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, userRoleType, hasPermission } = useAuth();

    // Admin: role type ADMIN/SUPER_ADMIN oppure permesso users:manage
    const isAdmin = userRoleType === 'ADMIN' || userRoleType === 'SUPER_ADMIN' || hasPermission('users', 'manage');

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header con breadcrumb */}
            <div className="mb-8">
                <button
                    type="button"
                    onClick={() => navigate('/poliambulatorio/impostazioni')}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600 transition-colors mb-3"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Torna a Impostazioni
                </button>
                <div className="flex items-center gap-3">
                    <PenTool className="h-8 w-8 text-teal-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Firma Digitale
                        </h1>
                        <p className="text-gray-600">
                            {isAdmin
                                ? 'Gestisci le firme digitali dei medici del poliambulatorio'
                                : 'Acquisisci e gestisci la tua firma digitale per i referti'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Vista per medico (propria firma) */}
            {user?.id && (
                <div className="mb-8">
                    {isAdmin && (
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">La tua firma</h2>
                    )}
                    <MedicoFirmaView personId={user.id} />
                </div>
            )}

            {/* Vista admin: tutti i medici */}
            {isAdmin && (
                <div className="mt-8">
                    <AdminFirmaView />
                </div>
            )}
        </div>
    );
};

export default FirmaSettingsPage;
