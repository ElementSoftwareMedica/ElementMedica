/**
 * StrumentarioAmbulatorioManager
 * 
 * Componente per assegnare/rimuovere strumenti a un ambulatorio.
 * Mostra strumenti disponibili e già assegnati.
 * 
 * @module pages/poliambulatorio/struttura/StrumentarioAmbulatorioManager
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Wrench,
    Plus,
    X,
    Search,
    Loader2,
    Check,
    AlertCircle,
    Package,
    Calendar
} from 'lucide-react';
import { strumentiApi } from '../../../services/clinicaApi';
import type { Strumento, StrumentoAmbulatorio } from '../../../services/clinicaApi';
import { apiPost, apiDelete } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

interface StrumentarioAmbulatorioManagerProps {
    ambulatorioId: string;
    ambulatorioNome?: string;
    onClose?: () => void;
}

const STATO_COLORS: Record<string, string> = {
    'ATTIVO': 'bg-emerald-100 text-emerald-700',
    'IN_MANUTENZIONE': 'bg-amber-100 text-amber-700',
    'FUORI_SERVIZIO': 'bg-red-100 text-red-700',
    'DISMESSO': 'bg-gray-100 text-gray-600',
    'IN_TARATURA': 'bg-blue-100 text-blue-700'
};

const StrumentarioAmbulatorioManager: React.FC<StrumentarioAmbulatorioManagerProps> = ({
    ambulatorioId,
    ambulatorioNome,
    onClose
}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [showAvailable, setShowAvailable] = useState(false);

    // Load tutti gli strumenti
    const { data: strumentiData, isLoading: strumentiLoading } = useQuery({
        queryKey: ['strumenti-all'],
        queryFn: () => strumentiApi.getAll({ limit: 500 })
    });

    const strumenti = strumentiData?.data || [];

    // Filtra strumenti assegnati e disponibili
    const { strumentiAssegnati, strumentiDisponibili } = useMemo(() => {
        const assegnati = strumenti.filter(s =>
            s.ambulatorioId === ambulatorioId ||
            s.ambulatoriAssegnati?.some(a => a.ambulatorioId === ambulatorioId && a.isActive)
        );

        const disponibili = strumenti.filter(s =>
            !s.ambulatorioId &&
            !s.ambulatoriAssegnati?.some(a => a.isActive) &&
            s.stato === 'ATTIVO'
        );

        return { strumentiAssegnati: assegnati, strumentiDisponibili: disponibili };
    }, [strumenti, ambulatorioId]);

    // Filtra per ricerca
    const filteredDisponibili = useMemo(() => {
        if (!searchTerm) return strumentiDisponibili;
        const search = searchTerm.toLowerCase();
        return strumentiDisponibili.filter(s =>
            s.nome.toLowerCase().includes(search) ||
            s.codice.toLowerCase().includes(search) ||
            s.marca?.toLowerCase().includes(search) ||
            s.modello?.toLowerCase().includes(search)
        );
    }, [strumentiDisponibili, searchTerm]);

    // Mutation per assegnare strumento
    const assignMutation = useMutation({
        mutationFn: async (strumentoId: string) => {
            return apiPost(`/api/v1/poliambulatorio/strumenti/${strumentoId}/assign`, {
                ambulatorioId
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strumenti'] });
            showToast({ type: 'success', message: 'Strumento assegnato con successo' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore nell\'assegnazione' });
        }
    });

    // Mutation per rimuovere strumento
    const removeMutation = useMutation({
        mutationFn: async (strumentoId: string) => {
            return apiDelete(`/api/v1/poliambulatorio/strumenti/${strumentoId}/assign?ambulatorioId=${ambulatorioId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strumenti'] });
            showToast({ type: 'success', message: 'Strumento rimosso dall\'ambulatorio' });
        },
        onError: () => {
            showToast({ type: 'error', message: 'Errore nella rimozione' });
        }
    });

    const handleAssign = (strumentoId: string) => {
        assignMutation.mutate(strumentoId);
    };

    const handleRemove = (strumentoId: string) => {
        if (confirm('Rimuovere lo strumento da questo ambulatorio?')) {
            removeMutation.mutate(strumentoId);
        }
    };

    if (strumentiLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 rounded-lg">
                        <Wrench className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Strumentario
                        </h2>
                        {ambulatorioNome && (
                            <p className="text-sm text-gray-500">{ambulatorioNome}</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setShowAvailable(!showAvailable)}
                    className="btn-clinica-secondary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    {showAvailable ? 'Nascondi disponibili' : 'Aggiungi strumento'}
                </button>
            </div>

            {/* Strumenti Assegnati */}
            <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Strumenti assegnati ({strumentiAssegnati.length})
                </h3>

                {strumentiAssegnati.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Nessuno strumento assegnato</p>
                        <p className="text-sm text-gray-400">Clicca "Aggiungi strumento" per assegnarne uno</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {strumentiAssegnati.map((strumento) => (
                            <div
                                key={strumento.id}
                                className="p-4 border border-gray-100 rounded-lg hover:border-teal-200 transition-colors group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-gray-900 truncate">
                                                {strumento.nome}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATO_COLORS[strumento.stato] || 'bg-gray-100'}`}>
                                                {strumento.stato}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {strumento.codice}
                                            {strumento.marca && ` • ${strumento.marca}`}
                                            {strumento.modello && ` ${strumento.modello}`}
                                        </p>
                                        {strumento.prossimaManutenzione && (
                                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Prossima manutenzione: {new Date(strumento.prossimaManutenzione).toLocaleDateString('it-IT')}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemove(strumento.id)}
                                        disabled={removeMutation.isPending}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                        title="Rimuovi dall'ambulatorio"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Strumenti Disponibili */}
            {showAvailable && (
                <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Strumenti disponibili ({filteredDisponibili.length})
                        </h3>

                        {/* Search */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Cerca strumento..."
                                className="input-clinica w-full pl-10 py-1.5 text-sm"
                            />
                        </div>
                    </div>

                    {filteredDisponibili.length === 0 ? (
                        <div className="p-6 text-center bg-gray-50 rounded-lg">
                            <AlertCircle className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">
                                {searchTerm
                                    ? 'Nessuno strumento trovato con questi criteri'
                                    : 'Tutti gli strumenti sono già assegnati'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                            {filteredDisponibili.map((strumento) => (
                                <div
                                    key={strumento.id}
                                    className="p-3 border border-gray-100 rounded-lg hover:border-teal-200 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm truncate">
                                                {strumento.nome}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {strumento.codice}
                                                {strumento.marca && ` • ${strumento.marca}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleAssign(strumento.id)}
                                            disabled={assignMutation.isPending}
                                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                            title="Assegna a questo ambulatorio"
                                        >
                                            {assignMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            {onClose && (
                <div className="flex justify-end mt-6 pt-4 border-t">
                    <button onClick={onClose} className="btn-clinica-secondary">
                        Chiudi
                    </button>
                </div>
            )}
        </div>
    );
};

export default StrumentarioAmbulatorioManager;
