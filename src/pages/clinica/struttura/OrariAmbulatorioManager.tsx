/**
 * OrariAmbulatorioManager
 * 
 * Componente per gestione orari di apertura di un ambulatorio.
 * Supporta orari settimanali con pause pranzo.
 * 
 * @module pages/poliambulatorio/struttura/OrariAmbulatorioManager
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Clock,
    Save,
    Loader2,
    Plus,
    Trash2,
    Copy,
    AlertTriangle,
    Check
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../../services/api';
import { useToast } from '../../../hooks/useToast';

// Import Element Medica theme
import '../../../styles/clinica-theme.css';

// Types
interface OrarioAmbulatorio {
    id: string;
    ambulatorioId: string;
    giorno: number; // 0-6 (DOM-SAB)
    oraInizio: string;
    oraFine: string;
    pausaInizio?: string;
    pausaFine?: string;
    isAttivo: boolean;
    note?: string;
}

interface OrariAmbulatorioManagerProps {
    ambulatorioId: string;
    ambulatorioNome?: string;
    onClose?: () => void;
}

const GIORNI_SETTIMANA = [
    { value: 1, label: 'Lunedì', short: 'LUN' },
    { value: 2, label: 'Martedì', short: 'MAR' },
    { value: 3, label: 'Mercoledì', short: 'MER' },
    { value: 4, label: 'Giovedì', short: 'GIO' },
    { value: 5, label: 'Venerdì', short: 'VEN' },
    { value: 6, label: 'Sabato', short: 'SAB' },
    { value: 0, label: 'Domenica', short: 'DOM' }
];

const ORARI_DEFAULT = {
    oraInizio: '08:00',
    oraFine: '18:00',
    pausaInizio: '13:00',
    pausaFine: '14:00'
};

const OrariAmbulatorioManager: React.FC<OrariAmbulatorioManagerProps> = ({
    ambulatorioId,
    ambulatorioNome,
    onClose
}) => {
    const queryClient = useQueryClient();
    const { showToast } = useToast();

    // State per orari modificati
    const [orariLocali, setOrariLocali] = useState<Record<number, Partial<OrarioAmbulatorio>>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load orari esistenti
    const { data: orariData, isLoading } = useQuery({
        queryKey: ['orari-ambulatorio', ambulatorioId],
        queryFn: async () => {
            const response = await apiGet<{ success: boolean; data: OrarioAmbulatorio[] }>(
                `/api/v1/poliambulatorio/ambulatori/${ambulatorioId}/orari`
            );
            return response.data || [];
        }
    });

    // Inizializza orari locali dai dati esistenti
    useEffect(() => {
        if (orariData) {
            const orariMap: Record<number, Partial<OrarioAmbulatorio>> = {};

            // Popola con dati esistenti
            orariData.forEach((orario: OrarioAmbulatorio) => {
                orariMap[orario.giorno] = orario;
            });

            setOrariLocali(orariMap);
        }
    }, [orariData]);

    // Handle toggle giorno attivo
    const handleToggleGiorno = (giorno: number) => {
        setOrariLocali(prev => {
            const current = prev[giorno];
            if (current?.isAttivo) {
                // Disattiva
                return {
                    ...prev,
                    [giorno]: { ...current, isAttivo: false }
                };
            } else {
                // Attiva con orari default se non esistono
                return {
                    ...prev,
                    [giorno]: {
                        ...current,
                        giorno,
                        isAttivo: true,
                        oraInizio: current?.oraInizio || ORARI_DEFAULT.oraInizio,
                        oraFine: current?.oraFine || ORARI_DEFAULT.oraFine,
                        pausaInizio: current?.pausaInizio,
                        pausaFine: current?.pausaFine
                    }
                };
            }
        });
        setHasChanges(true);
    };

    // Handle modifica orario
    const handleOrarioChange = (
        giorno: number,
        field: 'oraInizio' | 'oraFine' | 'pausaInizio' | 'pausaFine',
        value: string
    ) => {
        setOrariLocali(prev => ({
            ...prev,
            [giorno]: {
                ...prev[giorno],
                giorno,
                [field]: value || undefined
            }
        }));
        setHasChanges(true);
    };

    // Copia orari a tutti i giorni lavorativi
    const handleCopiaATutti = (giornoSource: number) => {
        const sourceOrario = orariLocali[giornoSource];
        if (!sourceOrario) return;

        const nuoviOrari = { ...orariLocali };

        // Copia a LUN-VEN (1-5)
        for (let g = 1; g <= 5; g++) {
            nuoviOrari[g] = {
                ...sourceOrario,
                giorno: g,
                id: orariLocali[g]?.id // Mantieni ID se esiste
            };
        }

        setOrariLocali(nuoviOrari);
        setHasChanges(true);
        showToast({ type: 'info', message: 'Orari copiati a tutti i giorni lavorativi' });
    };

    // Salva orari
    const handleSave = async () => {
        setIsSaving(true);

        try {
            const orariDaSalvare = Object.values(orariLocali).filter(o => o.isAttivo);

            // Chiamata batch per salvare tutti gli orari
            await apiPut(`/api/v1/poliambulatorio/ambulatori/${ambulatorioId}/orari`, {
                orari: orariDaSalvare
            });

            queryClient.invalidateQueries({ queryKey: ['orari-ambulatorio', ambulatorioId] });
            showToast({ type: 'success', message: 'Orari salvati con successo' });
            setHasChanges(false);
        } catch (error) {
            showToast({ type: 'error', message: 'Errore nel salvataggio degli orari' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
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
                        <Clock className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Orari di Apertura
                        </h2>
                        {ambulatorioNome && (
                            <p className="text-sm text-gray-500">{ambulatorioNome}</p>
                        )}
                    </div>
                </div>

                {hasChanges && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        Modifiche non salvate
                    </span>
                )}
            </div>

            {/* Griglia orari */}
            <div className="space-y-3">
                {GIORNI_SETTIMANA.map((giorno) => {
                    const orario = orariLocali[giorno.value];
                    const isAttivo = orario?.isAttivo || false;

                    return (
                        <div
                            key={giorno.value}
                            className={`p-4 rounded-lg border transition-colors ${isAttivo ? 'border-teal-200 bg-teal-50/30' : 'border-gray-100 bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Toggle + Nome giorno */}
                                <div className="flex items-center gap-3 w-32">
                                    <button
                                        onClick={() => handleToggleGiorno(giorno.value)}
                                        className={`w-10 h-6 rounded-full transition-colors ${isAttivo ? 'bg-teal-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <div
                                            className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${isAttivo ? 'translate-x-4' : 'translate-x-0.5'
                                                }`}
                                        />
                                    </button>
                                    <span className={`font-medium ${isAttivo ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {giorno.label}
                                    </span>
                                </div>

                                {/* Orari */}
                                {isAttivo ? (
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Mattina */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={orario?.oraInizio || ORARI_DEFAULT.oraInizio}
                                                onChange={(e) => handleOrarioChange(giorno.value, 'oraInizio', e.target.value)}
                                                className="input-clinica py-1 px-2 text-sm w-24"
                                            />
                                            <span className="text-gray-400">-</span>
                                            <input
                                                type="time"
                                                value={orario?.pausaInizio || ''}
                                                onChange={(e) => handleOrarioChange(giorno.value, 'pausaInizio', e.target.value)}
                                                className="input-clinica py-1 px-2 text-sm w-24"
                                                placeholder="Pausa"
                                            />
                                        </div>

                                        {/* Pausa */}
                                        {(orario?.pausaInizio || orario?.pausaFine) && (
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                Pausa
                                            </span>
                                        )}

                                        {/* Pomeriggio */}
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={orario?.pausaFine || ''}
                                                onChange={(e) => handleOrarioChange(giorno.value, 'pausaFine', e.target.value)}
                                                className="input-clinica py-1 px-2 text-sm w-24"
                                                placeholder="Fine pausa"
                                            />
                                            <span className="text-gray-400">-</span>
                                            <input
                                                type="time"
                                                value={orario?.oraFine || ORARI_DEFAULT.oraFine}
                                                onChange={(e) => handleOrarioChange(giorno.value, 'oraFine', e.target.value)}
                                                className="input-clinica py-1 px-2 text-sm w-24"
                                            />
                                        </div>

                                        {/* Copia a tutti */}
                                        <button
                                            onClick={() => handleCopiaATutti(giorno.value)}
                                            className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                            title="Copia a tutti i giorni lavorativi"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400 italic">Chiuso</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-700">
                    Gli orari definiti qui determinano la disponibilità per le prenotazioni.
                    Se non specifichi la pausa pranzo, l'ambulatorio sarà considerato aperto continuativamente.
                </p>
            </div>

            {/* Azioni */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="btn-clinica-secondary"
                    >
                        Chiudi
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    className="btn-clinica flex items-center gap-2 ml-auto"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Salvataggio...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Salva Orari
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default OrariAmbulatorioManager;
