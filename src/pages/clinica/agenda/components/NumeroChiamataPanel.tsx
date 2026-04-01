/**
 * NumeroChiamataPanel - Pannello per gestione numeri chiamata sala d'attesa
 * 
 * Gestisce l'assegnazione e visualizzazione dei numeri di chiamata.
 * 
 * @module pages/poliambulatorio/agenda/components/NumeroChiamataPanel
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Bell,
    Volume2,
    VolumeX,
    Monitor,
    Users,
    Hash,
    ArrowRight,
    Clock,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Play,
    Pause,
    SkipForward
} from 'lucide-react';
import { Appuntamento, appuntamentiApi } from '../../../../services/clinicaApi';

// ============================================
// TYPES
// ============================================

interface NumeroChiamata {
    numero: number;
    appuntamentoId: string;
    pazienteNome: string;
    ambulatorio: string;
    stato: 'attesa' | 'chiamato' | 'in_corso' | 'saltato';
    oraAssegnazione: Date;
    oraChiamata?: Date;
}

interface NumeroChiamataPanelProps {
    appuntamentiInAttesa: Appuntamento[];
    onChiama: (appuntamentoId: string) => void;
    isLoading?: boolean;
}

// ============================================
// HELPERS
// ============================================

// Genera un numero progressivo giornaliero
const generateNumero = (lastNumero: number): number => {
    return lastNumero + 1;
};

// Formatta il numero per display
const formatNumero = (numero: number): string => {
    return numero.toString().padStart(3, '0');
};

// ============================================
// COMPONENT
// ============================================

export const NumeroChiamataPanel: React.FC<NumeroChiamataPanelProps> = ({
    appuntamentiInAttesa,
    onChiama,
    isLoading = false
}) => {
    const queryClient = useQueryClient();

    // State
    const [numeriChiamata, setNumeriChiamata] = useState<Record<string, number>>({});
    const [ultimoChiamato, setUltimoChiamato] = useState<number | null>(null);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [showMonitor, setShowMonitor] = useState(false);
    const [lastNumero, setLastNumero] = useState(0);

    // Recupera l'ultimo numero dal localStorage all'avvio
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const stored = localStorage.getItem(`numeri_chiamata_${today}`);
        if (stored) {
            const data = JSON.parse(stored);
            setNumeriChiamata(data.numeri || {});
            setLastNumero(data.lastNumero || 0);
            setUltimoChiamato(data.ultimoChiamato || null);
        }
    }, []);

    // Salva i numeri nel localStorage
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`numeri_chiamata_${today}`, JSON.stringify({
            numeri: numeriChiamata,
            lastNumero,
            ultimoChiamato
        }));
    }, [numeriChiamata, lastNumero, ultimoChiamato]);

    // Assegna numero a un appuntamento
    const assegnaNumero = useCallback((appuntamentoId: string) => {
        if (!numeriChiamata[appuntamentoId]) {
            const nuovoNumero = generateNumero(lastNumero);
            setNumeriChiamata(prev => ({ ...prev, [appuntamentoId]: nuovoNumero }));
            setLastNumero(nuovoNumero);
            return nuovoNumero;
        }
        return numeriChiamata[appuntamentoId];
    }, [numeriChiamata, lastNumero]);

    // Chiama un numero
    const chiamaNumero = useCallback((appuntamentoId: string) => {
        const numero = numeriChiamata[appuntamentoId];
        if (numero) {
            setUltimoChiamato(numero);

            // Riproduci audio se abilitato
            if (audioEnabled) {
                // Usa Web Speech API per annunciare il numero
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(
                        `Numero ${numero}, prego`
                    );
                    utterance.lang = 'it-IT';
                    utterance.rate = 0.9;
                    speechSynthesis.speak(utterance);
                }
            }

            // Chiama l'handler esterno
            onChiama(appuntamentoId);
        }
    }, [numeriChiamata, audioEnabled, onChiama]);

    // Ottieni appuntamenti con numeri ordinati
    const appuntamentiOrdinati = React.useMemo(() => {
        return appuntamentiInAttesa
            .map(app => ({
                ...app,
                numero: numeriChiamata[app.id] || null
            }))
            .sort((a, b) => {
                if (!a.numero && !b.numero) return 0;
                if (!a.numero) return 1;
                if (!b.numero) return -1;
                return a.numero - b.numero;
            });
    }, [appuntamentiInAttesa, numeriChiamata]);

    // Prossimo da chiamare
    const prossimoNumero = React.useMemo(() => {
        const conNumero = appuntamentiOrdinati.filter(a => a.numero);
        if (conNumero.length === 0) return null;
        return conNumero[0];
    }, [appuntamentiOrdinati]);

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        <span className="font-medium">Sistema Chiamata</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            className="p-1.5 hover:bg-white/20 rounded-lg"
                            title={audioEnabled ? 'Disattiva audio' : 'Attiva audio'}
                        >
                            {audioEnabled ? (
                                <Volume2 className="h-4 w-4" />
                            ) : (
                                <VolumeX className="h-4 w-4" />
                            )}
                        </button>
                        <button
                            onClick={() => setShowMonitor(!showMonitor)}
                            className="p-1.5 hover:bg-white/20 rounded-lg"
                            title="Monitor sala d'attesa"
                        >
                            <Monitor className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Numero attualmente chiamato */}
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-700">Ultimo chiamato:</span>
                    <span className="text-3xl font-bold text-amber-700">
                        {ultimoChiamato ? formatNumero(ultimoChiamato) : '---'}
                    </span>
                </div>
            </div>

            {/* Quick call button */}
            {prossimoNumero && (
                <div className="px-4 py-3 border-b border-gray-100">
                    <button
                        onClick={() => chiamaNumero(prossimoNumero.id)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 py-3 bg-amber-500 
                                   hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <Bell className="h-5 w-5" />
                        <span>
                            Chiama N° {formatNumero(prossimoNumero.numero!)}
                        </span>
                        <ArrowRight className="h-5 w-5" />
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-2">
                        {prossimoNumero.paziente
                            ? `${prossimoNumero.paziente.lastName || ''} ${prossimoNumero.paziente.firstName || ''}`.trim()
                            : 'Paziente'}
                    </p>
                </div>
            )}

            {/* Lista pazienti in coda */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        In coda ({appuntamentiOrdinati.length})
                    </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {appuntamentiOrdinati.map((app) => (
                        <div
                            key={app.id}
                            className={`
                                flex items-center gap-3 p-2 rounded-lg border
                                ${app.numero
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-gray-50 border-gray-200'}
                            `}
                        >
                            {/* Numero */}
                            <div className={`
                                h-10 w-10 rounded-lg flex items-center justify-center font-bold
                                ${app.numero
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-gray-200 text-gray-500'}
                            `}>
                                {app.numero ? formatNumero(app.numero) : (
                                    <Hash className="h-4 w-4" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                    {app.paziente
                                        ? `${app.paziente.lastName || ''} ${app.paziente.firstName || ''}`.trim()
                                        : 'Paziente'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {app.ambulatorio?.nome || 'Ambulatorio'}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                {!app.numero && (
                                    <button
                                        onClick={() => assegnaNumero(app.id)}
                                        className="p-1.5 text-gray-500 hover:text-amber-600 
                                                   hover:bg-amber-50 rounded-lg"
                                        title="Assegna numero"
                                    >
                                        <Hash className="h-4 w-4" />
                                    </button>
                                )}
                                {app.numero && (
                                    <button
                                        onClick={() => chiamaNumero(app.id)}
                                        disabled={isLoading}
                                        className="p-1.5 text-amber-600 hover:text-amber-700 
                                                   hover:bg-amber-100 rounded-lg"
                                        title="Chiama"
                                    >
                                        <Bell className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {appuntamentiOrdinati.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nessun paziente in attesa</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Monitor Modal */}
            {showMonitor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
                    <div className="text-center">
                        <p className="text-gray-400 text-2xl mb-4">PROSSIMO NUMERO</p>
                        <p className="text-amber-400 text-[200px] font-bold leading-none">
                            {ultimoChiamato ? formatNumero(ultimoChiamato) : '---'}
                        </p>
                        <p className="text-gray-500 text-xl mt-4">
                            {prossimoNumero?.ambulatorio?.nome || 'AMBULATORIO'}
                        </p>
                        <button
                            onClick={() => setShowMonitor(false)}
                            className="mt-8 px-6 py-3 bg-gray-800 text-white rounded-lg 
                                       hover:bg-gray-700 transition-colors"
                        >
                            Chiudi Monitor
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NumeroChiamataPanel;
