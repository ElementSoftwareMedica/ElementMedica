/**
 * MergeModal Component
 * 
 * Modal for merging multiple preventivi into a single unified quote.
 * Extracted from PreventiviPage.tsx as part of Project 46 modularization.
 */

import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    X,
    Merge,
    Building2,
    AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Preventivo } from '../types';

interface MergeModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPreventivi: Preventivo[];
    onMerge: (aziendaId: string, ids: string[]) => void;
}

const MergeModal: React.FC<MergeModalProps> = ({
    isOpen,
    onClose,
    selectedPreventivi,
    onMerge
}) => {
    const groupedByAzienda = useMemo(() => {
        const groups: Record<string, {
            azienda?: { id: string; ragioneSociale: string };
            preventivi: Preventivo[]
        }> = {};

        selectedPreventivi.forEach(p => {
            const key = p.aziendaId || 'no-azienda';
            if (!groups[key]) {
                groups[key] = { azienda: p.azienda, preventivi: [] };
            }
            groups[key].preventivi.push(p);
        });

        return groups;
    }, [selectedPreventivi]);

    const mergeableGroups = Object.entries(groupedByAzienda).filter(
        ([_, group]) => group.azienda && group.preventivi.length >= 2
    );

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Merge className="h-5 w-5 text-orange-600" />
                        Unisci Preventivi
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {mergeableGroups.length === 0 ? (
                        <div className="text-center py-8">
                            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Impossibile unire i preventivi
                            </h3>
                            <p className="text-gray-600">
                                Seleziona almeno 2 preventivi della stessa azienda per procedere.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {mergeableGroups.map(([aziendaId, group]) => (
                                <div
                                    key={aziendaId}
                                    className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-gray-500" />
                                            <span className="font-medium text-gray-900">
                                                {group.azienda?.ragioneSociale}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {group.preventivi.length} preventivi
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {group.preventivi.map(p => (
                                            <div
                                                key={p.id}
                                                className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded"
                                            >
                                                <span className="font-mono">{p.numero}</span>
                                                <span>{p.tipoServizio}</span>
                                                <span className="font-medium">
                                                    € {Number(p.importoFinale || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                        <div className="text-sm">
                                            <span className="text-gray-500">Totale: </span>
                                            <span className="font-bold text-gray-900">
                                                € {group.preventivi.reduce(
                                                    (sum, p) => sum + Number(p.importoFinale || 0),
                                                    0
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                        <Button
                                            variant="primary"
                                            onClick={() => {
                                                onMerge(aziendaId, group.preventivi.map(p => p.id));
                                                onClose();
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Merge className="h-4 w-4" />
                                            Unisci
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                    <Button variant="outline" onClick={onClose}>Chiudi</Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MergeModal;
