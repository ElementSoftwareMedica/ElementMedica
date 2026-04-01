/**
 * QueueViewModal - Modal per visualizzare la coda pazienti
 * 
 * Mostra i pazienti in coda per la sessione corrente:
 * - Paziente in visita in alto con evidenza
 * - Pazienti successivi sotto in ordine di accettazione
 * - Pulsanti "Visita" e "Chiama e Visita" per ogni paziente in attesa
 * 
 * @module pages/clinica/clinica/components/QueueViewModal
 * @project P61 - Queue System Integration
 */

import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    X,
    Users,
    Phone,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    User,
    Stethoscope,
    PhoneCall
} from 'lucide-react';
import * as queueApi from '../../../../services/queueApi';
import type { QueueEntry, StatoChiamata } from '../../../../services/queueApi';
import { useToast } from '../../../../hooks/useToast';

interface QueueViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    medicoId?: string;
    currentEntryId?: string; // To highlight current patient
    onNavigateToVisita?: (appuntamentoId: string) => void; // Navigate to visit page
}

// Map queue states to display info
const STATO_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
    'IN_ATTESA': { label: 'In Attesa', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Clock },
    'CHIAMATO': { label: 'Chiamato', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Phone },
    'IN_VISITA': { label: 'In Visita', color: 'text-green-700', bgColor: 'bg-green-100', icon: User },
    'COMPLETATO': { label: 'Completato', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: CheckCircle },
    'NON_PRESENTATO': { label: 'Non Presentato', color: 'text-red-700', bgColor: 'bg-red-100', icon: AlertCircle },
    'ANNULLATO': { label: 'Annullato', color: 'text-gray-400', bgColor: 'bg-gray-100', icon: X }
};

// Format time from ISO string
const formatTime = (isoString?: string | null): string => {
    if (!isoString) return '--:--';
    try {
        return new Date(isoString).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '--:--';
    }
};

// Get patient name from entry
const getPatientName = (entry: QueueEntry): string => {
    if (entry.patientName) return entry.patientName;
    if ((entry as any).personTenantProfile?.person) {
        const p = (entry as any).personTenantProfile.person;
        return `${p.lastName || ''} ${p.firstName || ''}`.trim();
    }
    if (entry.walkInData) {
        const w = entry.walkInData;
        return `${w.lastName || ''} ${w.firstName || ''}`.trim();
    }
    return 'Paziente';
};

export const QueueViewModal: React.FC<QueueViewModalProps> = ({
    isOpen,
    onClose,
    sessionId,
    medicoId,
    currentEntryId,
    onNavigateToVisita
}) => {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Fetch queue entries for this session
    const { data: entries, isLoading, error, refetch } = useQuery({
        queryKey: ['queue-entries', sessionId, medicoId],
        queryFn: async () => {
            const result = await queueApi.getEntries({ sessionId });
            return result;
        },
        enabled: isOpen && !!sessionId,
        refetchInterval: 10000
    });

    // Fetch session for ambulatorioId
    const { data: session } = useQuery({
        queryKey: ['queue-session', sessionId],
        queryFn: () => queueApi.getSession(sessionId),
        enabled: isOpen && !!sessionId,
        staleTime: 60000
    });

    // Handle "Visita" - go directly to IN_VISITA (skip calling)
    const handleVisita = useCallback(async (entry: QueueEntry) => {
        setActionLoading(entry.id);
        try {
            await queueApi.updateEntryStatus(entry.id, { stato: 'IN_VISITA' as StatoChiamata });
            showToast({ message: `${getPatientName(entry)} spostato in visita`, type: 'success' });
            await refetch();
        } catch (err) {
            showToast({ message: 'Errore nell\'aggiornamento dello stato', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    }, [refetch, showToast]);

    // Handle "Chiama e Visita" - call patient then move to IN_VISITA
    const handleChiamaEVisita = useCallback(async (entry: QueueEntry) => {
        // Resolve ambulatorioId from multiple sources (direct, relation, or multi-ambulatorio)
        const ambulatorioId = session?.ambulatorioId
            || session?.ambulatorio?.id
            || (session?.ambulatori?.[0] as any)?.ambulatorio?.id
            || (session?.ambulatori?.[0] as any)?.ambulatorioId;
        if (!ambulatorioId) {
            showToast({ message: 'Ambulatorio non trovato nella sessione', type: 'warning' });
            return;
        }
        setActionLoading(entry.id);
        try {
            await queueApi.callSpecific({
                entryId: entry.id,
                ambulatorioId,
                appuntamentoId: entry.appuntamentoId
            });
            await queueApi.updateEntryStatus(entry.id, { stato: 'IN_VISITA' as StatoChiamata });
            showToast({ message: `${getPatientName(entry)} chiamato e spostato in visita`, type: 'success' });
            await refetch();
        } catch (err) {
            showToast({ message: 'Errore nella chiamata del paziente', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    }, [session?.ambulatorioId, session?.ambulatorio, session?.ambulatori, refetch, showToast]);

    // Handle "Ri-chiama e Visita" - recall already-called patient then move to IN_VISITA
    const handleRichiamaEVisita = useCallback(async (entry: QueueEntry) => {
        setActionLoading(entry.id);
        try {
            await queueApi.recallEntry(entry.id, `Richiamata paziente ${getPatientName(entry)}`);
            await queueApi.updateEntryStatus(entry.id, { stato: 'IN_VISITA' as StatoChiamata });
            showToast({ message: `${getPatientName(entry)} richiamato e spostato in visita`, type: 'success' });
            await refetch();
        } catch (err) {
            showToast({ message: 'Errore nella richiamata del paziente', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    }, [refetch, showToast]);

    if (!isOpen) return null;

    // Separate and sort entries
    const inVisita = entries?.filter((e: QueueEntry) => e.stato === 'IN_VISITA') || [];
    const currentPatient = inVisita.find(e => e.id === currentEntryId) || inVisita[0];
    const otherInVisita = inVisita.filter(e => e !== currentPatient);

    const waitingAndCalled = entries?.filter((e: QueueEntry) =>
        e.stato === 'IN_ATTESA' || e.stato === 'CHIAMATO'
    ).sort((a, b) => {
        // Sort by oraPrevista (appointment time), then by createdAt (acceptance time)
        const timeA = a.oraPrevista || a.createdAt;
        const timeB = b.oraPrevista || b.createdAt;
        return new Date(timeA).getTime() - new Date(timeB).getTime();
    }) || [];

    const completed = entries?.filter((e: QueueEntry) =>
        e.stato === 'COMPLETATO' || e.stato === 'NON_PRESENTATO'
    ) || [];

    // Count by state
    const stats = entries?.reduce((acc: Record<string, number>, entry: QueueEntry) => {
        acc[entry.stato] = (acc[entry.stato] || 0) + 1;
        return acc;
    }, {} as Record<string, number>) || {};

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <Users className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">Coda Pazienti</h2>
                                <p className="text-sm text-gray-500">
                                    {entries?.length || 0} pazienti &middot; {stats['IN_ATTESA'] || 0} in attesa
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Stats bar */}
                    {entries && entries.length > 0 && (
                        <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                            {stats['IN_VISITA'] ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                                    <Stethoscope className="h-3.5 w-3.5" />
                                    {stats['IN_VISITA']} in visita
                                </span>
                            ) : null}
                            {stats['IN_ATTESA'] ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                                    <Clock className="h-3.5 w-3.5" />
                                    {stats['IN_ATTESA']} in attesa
                                </span>
                            ) : null}
                            {stats['CHIAMATO'] ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                                    <Phone className="h-3.5 w-3.5" />
                                    {stats['CHIAMATO']} chiamati
                                </span>
                            ) : null}
                            {stats['COMPLETATO'] ? (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    {stats['COMPLETATO']} completati
                                </span>
                            ) : null}
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-12 text-red-500">
                                <AlertCircle className="h-8 w-8 mb-2" />
                                <p className="text-sm">Errore nel caricamento della coda</p>
                            </div>
                        ) : !entries || entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Users className="h-12 w-12 mb-3" />
                                <p className="text-sm font-medium">Nessun paziente in coda</p>
                            </div>
                        ) : (
                            <div>
                                {/* CURRENT PATIENT - In Visita (top section) */}
                                {currentPatient && (
                                    <div className="px-4 pt-4 pb-2">
                                        <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Stethoscope className="h-3.5 w-3.5" />
                                            Paziente in visita
                                        </p>
                                        <div className="p-3 rounded-lg bg-green-50 border-2 border-green-300">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white font-bold text-sm">
                                                    {currentPatient.displayNumber || currentPatient.numero}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-green-900 truncate">
                                                        {getPatientName(currentPatient)}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-green-700">
                                                        {currentPatient.prestazioneNome && (
                                                            <span className="truncate">{currentPatient.prestazioneNome}</span>
                                                        )}
                                                        {currentPatient.oraPrevista && (
                                                            <span className="flex items-center gap-0.5" title="Orario appuntamento">
                                                                <Clock className="h-3 w-3" />
                                                                {formatTime(currentPatient.oraPrevista)}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-0.5" title="Orario accettazione">
                                                            <CheckCircle className="h-3 w-3" />
                                                            {formatTime(currentPatient.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <User className="h-3 w-3" />
                                                    In Visita
                                                </div>
                                            </div>
                                        </div>

                                        {/* Other patients also in visita */}
                                        {otherInVisita.length > 0 && otherInVisita.map(entry => (
                                            <div key={entry.id} className="mt-2 p-3 rounded-lg bg-green-50/50 border border-green-200">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold text-xs">
                                                        {entry.displayNumber || entry.numero}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-green-800 truncate text-sm">{getPatientName(entry)}</p>
                                                    </div>
                                                    <span className="text-xs text-green-600 font-medium">In Visita</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* WAITING LIST (sorted by appointment time) */}
                                {waitingAndCalled.length > 0 && (
                                    <div className="px-4 pt-3 pb-2">
                                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" />
                                            In attesa ({waitingAndCalled.length})
                                        </p>
                                        <div className="space-y-2">
                                            {waitingAndCalled.map((entry: QueueEntry) => {
                                                const config = STATO_CONFIG[entry.stato] || STATO_CONFIG['IN_ATTESA'];
                                                const isLoading = actionLoading === entry.id;

                                                return (
                                                    <div
                                                        key={entry.id}
                                                        className={`p-3 rounded-lg border transition-colors ${entry.stato === 'CHIAMATO'
                                                            ? 'bg-amber-50 border-amber-200'
                                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {/* Number badge */}
                                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                                                                {entry.displayNumber || entry.numero}
                                                            </div>

                                                            {/* Patient info */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-900 truncate">
                                                                    {getPatientName(entry)}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    {entry.prestazioneNome && (
                                                                        <span className="truncate">{entry.prestazioneNome}</span>
                                                                    )}
                                                                    {entry.oraPrevista && (
                                                                        <span className="flex items-center gap-0.5" title="Orario appuntamento">
                                                                            <Clock className="h-3 w-3" />
                                                                            {formatTime(entry.oraPrevista)}
                                                                        </span>
                                                                    )}
                                                                    <span className="flex items-center gap-0.5" title="Orario accettazione">
                                                                        <CheckCircle className="h-3 w-3" />
                                                                        {formatTime(entry.createdAt)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Status badge */}
                                                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                                                                <config.icon className="h-3 w-3" />
                                                                {config.label}
                                                            </div>
                                                        </div>

                                                        {/* Action buttons */}
                                                        <div className="flex items-center gap-2 mt-2.5 pl-13">
                                                            <button
                                                                onClick={() => handleVisita(entry)}
                                                                disabled={isLoading}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 transition-colors"
                                                            >
                                                                {isLoading ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <Stethoscope className="h-3 w-3" />
                                                                )}
                                                                Visita
                                                            </button>
                                                            {entry.stato === 'CHIAMATO' ? (
                                                                <button
                                                                    onClick={() => handleRichiamaEVisita(entry)}
                                                                    disabled={isLoading}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {isLoading ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <PhoneCall className="h-3 w-3" />
                                                                    )}
                                                                    Ri-chiama e Visita
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleChiamaEVisita(entry)}
                                                                    disabled={isLoading}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                                                >
                                                                    {isLoading ? (
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                    ) : (
                                                                        <PhoneCall className="h-3 w-3" />
                                                                    )}
                                                                    Chiama e Visita
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* COMPLETED (collapsed section) */}
                                {completed.length > 0 && (
                                    <div className="px-4 pt-3 pb-4">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            Completati ({completed.length})
                                        </p>
                                        <div className="space-y-1">
                                            {completed.map((entry: QueueEntry) => (
                                                <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400">
                                                    <span className="text-xs font-mono">{entry.displayNumber || entry.numero}</span>
                                                    <span className="text-xs truncate flex-1">{getPatientName(entry)}</span>
                                                    <span className="text-xs">
                                                        {entry.stato === 'NON_PRESENTATO' ? 'Non presentato' : 'Completato'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 rounded-b-xl">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Chiudi
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QueueViewModal;
