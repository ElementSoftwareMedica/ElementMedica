/**
 * RevisionDiffModal - Modal for viewing differences between visit revisions
 * 
 * Displays a side-by-side or inline comparison between:
 * - The selected revision (historical state)
 * - The current visit state
 * 
 * Highlights:
 * - Additions (green)
 * - Removals (red)
 * - Unchanged (gray)
 * 
 * @module pages/clinica/clinica/components/RevisionDiffModal
 * @project P52 - Clinical Visit Template System
 * @session #16 - Storico Visita with Diff View
 */

import React, { useMemo } from 'react';
import {
    X,
    Calendar,
    Clock,
    GitCompare,
    Plus,
    Minus,
    ChevronRight,
    User
} from 'lucide-react';

// Revision type matching the backend VisitRevision model
interface Revision {
    id: string;
    numeroRevisione: number;
    dataCreazione: string;
    motivo?: string;
    // DB structure has previousData/newData
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    // Legacy structure (if using datiStrutturati)
    datiStrutturati?: Record<string, unknown>;
    changeType?: string;
    changedFields?: string[];
    createdBy?: {
        firstName?: string;
        lastName?: string;
    };
}

interface RevisionDiffModalProps {
    revisionId: string;
    revisioni: Revision[];
    isOpen: boolean;
    onClose: () => void;
    currentVisita?: {
        datiStrutturati?: Record<string, unknown>;
        updatedAt?: string;
    };
    /** Active template field keys — if provided, only show diffs for these fields */
    activeFieldKeys?: string[];
}

interface DiffResult {
    field: string;
    oldValue: string;
    newValue: string;
    type: 'added' | 'removed' | 'changed' | 'unchanged';
}

// Helper functions — must be defined before use in useMemo (avoid TDZ)
const formatFieldName = (field: string): string => {
    const names: Record<string, string> = {
        anamnesi: 'Anamnesi',
        esamiObiettivo: 'Esame Obiettivo',
        esameObiettivo: 'Esame Obiettivo',
        diagnosiPrincipale: 'Diagnosi Principale',
        diagnosiSecondarie: 'Diagnosi Secondarie',
        terapia: 'Terapia',
        prescrizioni: 'Prescrizioni',
        noteClinico: 'Note Cliniche',
        noteFollowup: 'Note Follow-up',
        prossimoControllo: 'Prossimo Controllo',
        peso: 'Peso',
        altezza: 'Altezza',
        pressioneSistolica: 'Pressione Sistolica',
        pressioneDiastolica: 'Pressione Diastolica',
        frequenzaCardiaca: 'Frequenza Cardiaca',
        temperatura: 'Temperatura',
        saturazione: 'Saturazione O₂',
        glicemia: 'Glicemia'
    };
    return names[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
};

const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
};

export const RevisionDiffModal: React.FC<RevisionDiffModalProps> = ({
    revisionId,
    revisioni,
    isOpen,
    onClose,
    currentVisita,
    activeFieldKeys
}) => {
    const selectedRevision = useMemo(() => {
        if (!revisioni?.length) return null;
        return revisioni.find(r => r.id === revisionId);
    }, [revisioni, revisionId]);

    // Calculate differences using previousData/newData or datiStrutturati
    const differences = useMemo((): DiffResult[] => {
        if (!selectedRevision) return [];

        const diffs: DiffResult[] = [];

        // Helper: check if key is in active template fields (or show all if not provided)
        const isFieldActive = (key: string) => {
            if (!activeFieldKeys || activeFieldKeys.length === 0) return true;
            return activeFieldKeys.includes(key);
        };

        /**
         * Deep-compare two datiStrutturati objects, extracting individual field diffs.
         * Both prev and next should be COMPLETE states (not sparse).
         */
        const compareDatiStrutturati = (
            prevDS: Record<string, unknown> | undefined,
            newDS: Record<string, unknown> | undefined
        ) => {
            if (!prevDS && !newDS) return;
            const prev = prevDS && typeof prevDS === 'object' ? prevDS : {};
            const next = newDS && typeof newDS === 'object' ? newDS : {};

            const allFieldKeys = new Set([
                ...Object.keys(prev),
                ...Object.keys(next)
            ].filter(k => !k.startsWith('_') && isFieldActive(k)));

            allFieldKeys.forEach(key => {
                const oldVal = formatValue(prev[key]);
                const newVal = formatValue(next[key]);

                if (oldVal !== newVal) {
                    diffs.push({
                        field: formatFieldName(key),
                        oldValue: oldVal,
                        newValue: newVal,
                        type: !oldVal ? 'added' : !newVal ? 'removed' : 'changed'
                    });
                }
            });
        };

        // Use previousData vs newData if available (from VisitRevision model)
        if (selectedRevision.previousData) {
            const prevData = selectedRevision.previousData;
            const newData = selectedRevision.newData || {};

            // Detect NEW_VERSION or empty newData — compare revision snapshot vs CURRENT visita state
            const isNewVersion = selectedRevision.changeType === 'NEW_VERSION' ||
                Object.keys(newData).length === 0;

            if (isNewVersion && currentVisita?.datiStrutturati) {
                // NEW_VERSION: previousData = snapshot of completed state
                // Compare against current visita (which has the user's new edits)
                const prevDS = prevData.datiStrutturati as Record<string, unknown> | undefined;
                const currentDS = currentVisita.datiStrutturati as Record<string, unknown> | undefined;

                if (prevDS || currentDS) {
                    compareDatiStrutturati(
                        prevDS && typeof prevDS === 'object' ? prevDS : undefined,
                        currentDS && typeof currentDS === 'object' ? currentDS : undefined
                    );
                }

                // Also compare top-level clinical fields
                const topKeys = new Set([
                    ...Object.keys(prevData)
                ].filter(k => k !== 'datiStrutturati' && !k.startsWith('_')));

                topKeys.forEach(key => {
                    if (diffs.some(d => d.field === formatFieldName(key))) return;
                    if (!isFieldActive(key)) return;

                    const oldVal = formatValue(prevData[key]);
                    // For top-level fields we only have the snapshot — no current comparison
                    // unless currentVisita has them
                    const newVal = '';

                    if (oldVal !== newVal && oldVal) {
                        // We can only show the old value; the new value is whatever the user is editing
                        // Skip top-level fields for NEW_VERSION since datiStrutturati is the primary comparison
                    }
                });
            } else if (Object.keys(newData).length > 0) {
                // NORMAL UPDATE: previousData = full snapshot, newData = sparse changed fields
                // Build complete "after" state by merging previousData with newData overrides
                const completeAfterData: Record<string, unknown> = { ...prevData, ...newData };

                // Step 1: Deep-compare datiStrutturati
                const prevDS = prevData.datiStrutturati as Record<string, unknown> | undefined;
                const afterDS = (newData.datiStrutturati !== undefined
                    ? newData.datiStrutturati
                    : prevData.datiStrutturati) as Record<string, unknown> | undefined;

                if (prevDS || afterDS) {
                    compareDatiStrutturati(
                        prevDS && typeof prevDS === 'object' ? prevDS : undefined,
                        afterDS && typeof afterDS === 'object' ? afterDS : undefined
                    );
                }

                // Step 2: Compare top-level clinical fields
                const changedFieldSet = new Set(selectedRevision.changedFields || []);
                const topKeys = new Set([
                    ...Object.keys(prevData),
                    ...Object.keys(completeAfterData)
                ].filter(k => k !== 'datiStrutturati' && !k.startsWith('_')));

                topKeys.forEach(key => {
                    if (diffs.some(d => d.field === formatFieldName(key))) return;
                    if (!isFieldActive(key)) return;
                    if (!(key in newData) && !changedFieldSet.has(key)) return;

                    const oldVal = formatValue(prevData[key]);
                    const newVal = formatValue(completeAfterData[key]);

                    if (oldVal !== newVal) {
                        diffs.push({
                            field: formatFieldName(key),
                            oldValue: oldVal,
                            newValue: newVal,
                            type: !oldVal ? 'added' : !newVal ? 'removed' : 'changed'
                        });
                    }
                });
            } else {
                // Empty newData and no currentVisita — compare against currentVisita datiStrutturati if available
                if (currentVisita?.datiStrutturati) {
                    const prevDS = prevData.datiStrutturati as Record<string, unknown> | undefined;
                    compareDatiStrutturati(
                        prevDS && typeof prevDS === 'object' ? prevDS : undefined,
                        currentVisita.datiStrutturati as Record<string, unknown>
                    );
                }
            }
        }
        // Fallback: compare datiStrutturati snapshots directly (e.g. comparing a revision vs current visita)
        else if (selectedRevision.datiStrutturati && currentVisita?.datiStrutturati) {
            compareDatiStrutturati(
                selectedRevision.datiStrutturati as Record<string, unknown>,
                currentVisita.datiStrutturati as Record<string, unknown>
            );
        }
        // If we have changedFields, show those
        else if (selectedRevision.changedFields?.length) {
            selectedRevision.changedFields.forEach(field => {
                diffs.push({
                    field: formatFieldName(field),
                    oldValue: '(valore precedente)',
                    newValue: '(valore corrente)',
                    type: 'changed'
                });
            });
        }

        // Sort diffs by template field order (activeFieldKeys) if provided
        if (activeFieldKeys && activeFieldKeys.length > 0) {
            // Build reverse lookup: formatted field name → position in template
            const fieldOrderMap = new Map<string, number>();
            activeFieldKeys.forEach((key, index) => {
                fieldOrderMap.set(formatFieldName(key), index);
            });
            diffs.sort((a, b) => {
                const posA = fieldOrderMap.get(a.field) ?? 9999;
                const posB = fieldOrderMap.get(b.field) ?? 9999;
                return posA - posB;
            });
        }

        return diffs;
    }, [selectedRevision, currentVisita, activeFieldKeys]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <GitCompare className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Confronto Revisione
                                </h2>
                                {selectedRevision && (
                                    <p className="text-sm text-gray-500">
                                        Revisione #{selectedRevision.numeroRevisione} del {formatDate(selectedRevision.dataCreazione)}
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
                        {!selectedRevision && (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <p>Revisione non trovata</p>
                            </div>
                        )}

                        {selectedRevision && (
                            <div className="space-y-6">
                                {/* Revision Info */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <span className="text-xs text-gray-500">Revisione</span>
                                            <p className="font-medium text-gray-900">
                                                #{selectedRevision.numeroRevisione}
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                        <div>
                                            <span className="text-xs text-gray-500">Attuale</span>
                                            <p className="font-medium text-gray-900">
                                                Versione Corrente
                                            </p>
                                        </div>
                                    </div>
                                    {selectedRevision.createdBy && (
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <User className="h-4 w-4" />
                                            <span>
                                                {selectedRevision.createdBy.firstName || selectedRevision.createdBy.lastName
                                                    ? `${selectedRevision.createdBy.lastName || ''} ${selectedRevision.createdBy.firstName || ''}`.trim()
                                                    : 'Utente'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Legend */}
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                                        <span className="text-gray-600">Aggiunto</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                                        <span className="text-gray-600">Rimosso</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
                                        <span className="text-gray-600">Modificato</span>
                                    </div>
                                </div>

                                {/* Differences */}
                                {differences.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>Nessuna differenza trovata</p>
                                        <p className="text-sm">
                                            {selectedRevision.changeType === 'NEW_VERSION'
                                                ? 'Nessuna modifica rispetto alla versione precedente'
                                                : 'Questa revisione è identica alla versione corrente'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {differences.map((diff, index) => (
                                            <div
                                                key={index}
                                                className={`rounded-lg border overflow-hidden ${diff.type === 'added' ? 'border-green-200' :
                                                    diff.type === 'removed' ? 'border-red-200' :
                                                        'border-amber-200'
                                                    }`}
                                            >
                                                {/* Field Header */}
                                                <div className={`px-4 py-2 text-sm font-medium ${diff.type === 'added' ? 'bg-green-50 text-green-700' :
                                                    diff.type === 'removed' ? 'bg-red-50 text-red-700' :
                                                        'bg-amber-50 text-amber-700'
                                                    }`}>
                                                    {diff.type === 'added' && <Plus className="h-3 w-3 inline mr-1" />}
                                                    {diff.type === 'removed' && <Minus className="h-3 w-3 inline mr-1" />}
                                                    {diff.field}
                                                </div>

                                                {/* Values Comparison */}
                                                <div className="grid grid-cols-2 divide-x divide-gray-200">
                                                    {/* Old Value */}
                                                    <div className="p-3">
                                                        <span className="text-xs text-gray-400 block mb-1">Prima</span>
                                                        {diff.oldValue ? (
                                                            <div className={`text-sm ${diff.type !== 'added' ? 'bg-red-50 p-2 rounded' : ''}`}>
                                                                <pre className="whitespace-pre-wrap font-sans text-gray-700">
                                                                    {diff.oldValue}
                                                                </pre>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-gray-400 italic">Nessun valore</span>
                                                        )}
                                                    </div>

                                                    {/* New Value */}
                                                    <div className="p-3">
                                                        <span className="text-xs text-gray-400 block mb-1">Dopo</span>
                                                        {diff.newValue ? (
                                                            <div className={`text-sm ${diff.type !== 'removed' ? 'bg-green-50 p-2 rounded' : ''}`}>
                                                                <pre className="whitespace-pre-wrap font-sans text-gray-700">
                                                                    {diff.newValue}
                                                                </pre>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-gray-400 italic">Nessun valore</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Timestamps */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>Revisione: {formatDate(selectedRevision.dataCreazione)}</span>
                                    </div>
                                    {currentVisita?.updatedAt && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>Attuale: {formatDate(currentVisita.updatedAt)}</span>
                                        </div>
                                    )}
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

export default RevisionDiffModal;
