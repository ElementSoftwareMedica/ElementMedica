/**
 * Monitor Sala Attesa - F6.6.1
 * 
 * Display pubblico per la sala d'attesa che mostra:
 * - Numero attualmente chiamato
 * - Ambulatorio di destinazione
 * - Prossimi numeri in coda
 * - Orario e data corrente
 * - Notifiche audio per nuove chiamate
 * 
 * @module MonitorSalaAttesa
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Bell,
    Volume2,
    VolumeX,
    Clock,
    MapPin,
    Users,
    RefreshCw,
    Wifi,
    WifiOff,
    ChevronRight
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ChiamataCorrente {
    id: string;
    numero: number;
    pazienteIniziali: string;
    ambulatorio: string;
    piano?: string;
    orario: string;
    stato: 'chiamata' | 'richiamata' | 'in_visita';
}

interface NumeroInCoda {
    id: string;
    numero: number;
    pazienteIniziali: string;
    orarioPrevisto?: string;
    statoAccettazione: 'in_attesa' | 'accettato';
}

interface MonitorSalaAttesaProps {
    /** ID del poliambulatorio per filtrare le chiamate */
    poliambulatorioId?: string;
    /** Mostra la coda completa o solo i prossimi N */
    maxCodaVisibile?: number;
    /** Abilita fullscreen mode */
    fullscreen?: boolean;
    /** Tema colore (per branding) */
    accentColor?: string;
    /** Callback quando viene rilevata una nuova chiamata */
    onNuovaChiamata?: (chiamata: ChiamataCorrente) => void;
}

// =============================================================================
// AUDIO NOTIFICATION HOOK
// =============================================================================

const useAudioNotification = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [audioInitialized, setAudioInitialized] = useState(false);

    // Inizializza AudioContext al primo click utente (richiesto dai browser)
    const initializeAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            setAudioInitialized(true);
        }
    }, []);

    // Suona notifica chiamata
    const playCallNotification = useCallback(() => {
        if (!audioEnabled || !audioContextRef.current) return;

        const ctx = audioContextRef.current;

        // Crea sequenza di beep per attirare attenzione
        const frequencies = [523.25, 659.25, 783.99, 1046.50]; // Do-Mi-Sol-Do ottava
        const duration = 0.15;
        const gap = 0.05;

        frequencies.forEach((freq, index) => {
            const startTime = ctx.currentTime + (duration + gap) * index;

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, startTime);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
            gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }, [audioEnabled]);

    // Suona notifica richiamata (più insistente)
    const playRecallNotification = useCallback(() => {
        if (!audioEnabled || !audioContextRef.current) return;

        const ctx = audioContextRef.current;

        // Due sequenze di beep
        for (let repeat = 0; repeat < 2; repeat++) {
            const baseTime = ctx.currentTime + repeat * 0.6;
            const frequencies = [880, 1100, 880]; // La-Do#-La

            frequencies.forEach((freq, index) => {
                const startTime = baseTime + index * 0.1;

                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(freq, startTime);

                gainNode.gain.setValueAtTime(0.3, startTime);
                gainNode.gain.linearRampToValueAtTime(0, startTime + 0.1);

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.start(startTime);
                oscillator.stop(startTime + 0.1);
            });
        }
    }, [audioEnabled]);

    return {
        audioEnabled,
        audioInitialized,
        setAudioEnabled,
        initializeAudio,
        playCallNotification,
        playRecallNotification
    };
};

// =============================================================================
// WEBSOCKET CONNECTION HOOK
// =============================================================================

const useChiamataWebSocket = (
    poliambulatorioId: string | undefined,
    onChiamata: (chiamata: ChiamataCorrente) => void,
    playNotification: (tipo: 'chiamata' | 'richiamata') => void
) => {
    const [connected, setConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        // In produzione, connetti al WebSocket server
        // Per ora simuliamo con polling
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/chiamate`;

        try {
            // Simulazione WebSocket - in produzione usare vera connessione
            // wsRef.current = new WebSocket(wsUrl);

            // Per demo: polling ogni 5 secondi
            setConnected(true);

            const pollInterval = setInterval(() => {
                setLastUpdate(new Date());
                // In produzione: ricevi dati reali dal server
            }, 5000);

            return () => {
                clearInterval(pollInterval);
                setConnected(false);
            };
        } catch (error) {
            setConnected(false);

            // Riprova connessione dopo 5 secondi
            reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
    }, [poliambulatorioId]);

    useEffect(() => {
        const cleanup = connect();

        return () => {
            cleanup?.();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return { connected, lastUpdate };
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const MonitorSalaAttesa: React.FC<MonitorSalaAttesaProps> = ({
    poliambulatorioId,
    maxCodaVisibile = 5,
    fullscreen = false,
    accentColor = '#0d9488', // teal-600
    onNuovaChiamata
}) => {
    // State
    const [currentTime, setCurrentTime] = useState(new Date());
    const [chiamataCorrente, setChiamataCorrente] = useState<ChiamataCorrente | null>(null);
    const [coda, setCoda] = useState<NumeroInCoda[]>([]);
    const [isFlashing, setIsFlashing] = useState(false);
    const prevChiamataRef = useRef<string | null>(null);

    // Audio
    const {
        audioEnabled,
        audioInitialized,
        setAudioEnabled,
        initializeAudio,
        playCallNotification,
        playRecallNotification
    } = useAudioNotification();

    // WebSocket
    const handleNuovaChiamata = useCallback((chiamata: ChiamataCorrente) => {
        setChiamataCorrente(chiamata);

        // Effetto flash visivo
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 2000);

        // Notifica audio
        if (chiamata.stato === 'richiamata') {
            playRecallNotification();
        } else {
            playCallNotification();
        }

        onNuovaChiamata?.(chiamata);
    }, [playCallNotification, playRecallNotification, onNuovaChiamata]);

    const { connected, lastUpdate } = useChiamataWebSocket(
        poliambulatorioId,
        handleNuovaChiamata,
        (tipo) => tipo === 'richiamata' ? playRecallNotification() : playCallNotification()
    );

    // Aggiorna orologio
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Demo data - in produzione verrebbe dal WebSocket
    useEffect(() => {
        // Simula chiamata corrente
        setChiamataCorrente({
            id: '1',
            numero: 42,
            pazienteIniziali: 'M.R.',
            ambulatorio: 'Ambulatorio 3',
            piano: 'Piano 1',
            orario: '10:30',
            stato: 'chiamata'
        });

        // Simula coda
        setCoda([
            { id: '2', numero: 43, pazienteIniziali: 'A.B.', statoAccettazione: 'accettato', orarioPrevisto: '10:45' },
            { id: '3', numero: 44, pazienteIniziali: 'C.D.', statoAccettazione: 'accettato', orarioPrevisto: '11:00' },
            { id: '4', numero: 45, pazienteIniziali: 'E.F.', statoAccettazione: 'in_attesa' },
            { id: '5', numero: 46, pazienteIniziali: 'G.H.', statoAccettazione: 'in_attesa' },
        ]);
    }, []);

    // Formatta ora
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div
            className={`min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
            onClick={!audioInitialized ? initializeAudio : undefined}
        >
            {/* Header con logo e orologio */}
            <header className="p-6 flex items-center justify-between border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold"
                        style={{ backgroundColor: accentColor }}
                    >
                        EM
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">ElementMedica</h1>
                        <p className="text-gray-400 text-sm">Poliambulatorio</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Connection status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${connected ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                        {connected ? 'Connesso' : 'Riconnessione...'}
                    </div>

                    {/* Audio toggle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            initializeAudio();
                            setAudioEnabled(!audioEnabled);
                        }}
                        className={`p-3 rounded-full transition-colors ${audioEnabled ? 'bg-teal-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                        title={audioEnabled ? 'Disattiva audio' : 'Attiva audio'}
                    >
                        {audioEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                    </button>

                    {/* Clock */}
                    <div className="text-right">
                        <div className="text-4xl font-mono font-bold tracking-wider">
                            {formatTime(currentTime)}
                        </div>
                        <div className="text-gray-400 text-sm capitalize">
                            {formatDate(currentTime)}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="p-8 grid grid-cols-3 gap-8 h-[calc(100vh-120px)]">
                {/* Numero chiamato - Large display */}
                <div className="col-span-2 flex flex-col">
                    <div
                        className={`flex-1 rounded-3xl p-8 flex flex-col items-center justify-center transition-all duration-500 ${isFlashing ? 'animate-pulse ring-4 ring-yellow-400' : ''
                            }`}
                        style={{ backgroundColor: `${accentColor}20`, borderColor: accentColor, borderWidth: '2px' }}
                    >
                        {chiamataCorrente ? (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <Bell className="h-8 w-8 text-yellow-400 animate-bounce" />
                                    <span className="text-2xl font-medium text-gray-300 uppercase tracking-wider">
                                        {chiamataCorrente.stato === 'richiamata' ? 'Richiamata' : 'Prossimo Numero'}
                                    </span>
                                </div>

                                <div
                                    className="text-[180px] font-bold leading-none mb-4"
                                    style={{ color: accentColor, textShadow: `0 0 60px ${accentColor}40` }}
                                >
                                    {chiamataCorrente.numero.toString().padStart(2, '0')}
                                </div>

                                <div className="flex items-center gap-4 text-3xl">
                                    <MapPin className="h-8 w-8" style={{ color: accentColor }} />
                                    <span className="font-semibold">{chiamataCorrente.ambulatorio}</span>
                                    {chiamataCorrente.piano && (
                                        <span className="text-gray-400">• {chiamataCorrente.piano}</span>
                                    )}
                                </div>

                                <div className="mt-6 flex items-center gap-2 text-gray-400">
                                    <Clock className="h-5 w-5" />
                                    <span>Chiamato alle {chiamataCorrente.orario}</span>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                <Users className="h-24 w-24 text-gray-600 mx-auto mb-4" />
                                <p className="text-2xl text-gray-500">Nessuna chiamata attiva</p>
                                <p className="text-gray-600 mt-2">In attesa del prossimo paziente</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Coda prossimi */}
                <div className="flex flex-col">
                    <div className="bg-gray-800/50 rounded-3xl p-6 flex-1 border border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Users className="h-6 w-6" style={{ color: accentColor }} />
                                Prossimi in Coda
                            </h2>
                            <span className="px-3 py-1 bg-gray-700 rounded-full text-sm">
                                {coda.length} in attesa
                            </span>
                        </div>

                        <div className="space-y-3">
                            {coda.slice(0, maxCodaVisibile).map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`p-4 rounded-xl flex items-center justify-between transition-all ${index === 0
                                            ? 'bg-teal-900/30 border border-teal-700/50'
                                            : 'bg-gray-700/30 border border-gray-600/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span
                                            className={`text-3xl font-bold ${index === 0 ? '' : 'text-gray-400'}`}
                                            style={index === 0 ? { color: accentColor } : undefined}
                                        >
                                            {item.numero.toString().padStart(2, '0')}
                                        </span>
                                        <div>
                                            <p className="font-medium">{item.pazienteIniziali}</p>
                                            {item.orarioPrevisto && (
                                                <p className="text-sm text-gray-400">
                                                    Previsto: {item.orarioPrevisto}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`px-2 py-1 rounded text-xs ${item.statoAccettazione === 'accettato'
                                            ? 'bg-green-900/50 text-green-400'
                                            : 'bg-yellow-900/50 text-yellow-400'
                                        }`}>
                                        {item.statoAccettazione === 'accettato' ? '✓ Accettato' : 'In attesa'}
                                    </div>
                                </div>
                            ))}

                            {coda.length > maxCodaVisibile && (
                                <div className="text-center py-3 text-gray-500">
                                    + altri {coda.length - maxCodaVisibile} in coda
                                </div>
                            )}

                            {coda.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                                    <p>Nessun paziente in coda</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info footer */}
                    <div className="mt-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                            <ChevronRight className="h-4 w-4" />
                            <span>Attendere la chiamata del proprio numero</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer status */}
            <footer className="absolute bottom-0 left-0 right-0 p-4 bg-gray-900/80 border-t border-gray-800">
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <span>Ultimo aggiornamento: {lastUpdate.toLocaleTimeString('it-IT')}</span>
                    <span>•</span>
                    <span>Sistema di chiamata ElementMedica</span>
                </div>
            </footer>

            {/* Click to enable audio prompt */}
            {!audioInitialized && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="text-center p-8 bg-gray-800 rounded-2xl max-w-md">
                        <Volume2 className="h-16 w-16 mx-auto mb-4" style={{ color: accentColor }} />
                        <h3 className="text-2xl font-bold mb-2">Attiva Audio</h3>
                        <p className="text-gray-400 mb-6">
                            Clicca ovunque per attivare le notifiche audio quando viene chiamato un numero.
                        </p>
                        <div className="animate-bounce text-gray-500">
                            ↓ Clicca per continuare ↓
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MonitorSalaAttesa;
