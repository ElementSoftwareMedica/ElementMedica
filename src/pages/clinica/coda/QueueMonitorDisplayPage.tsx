/**
 * Queue Monitor Display Page
 * Public fullscreen display for waiting room monitors (P53.3)
 * 
 * Features:
 * - Large visible number display
 * - Current call with ambulatorio indicator
 * - Recent calls history filtered by monitor ambulatori
 * - Auto-refresh polling (no auth required)
 * - TTS announcement support
 * 
 * Access via: /display/monitor/:accessToken
 * 
 * @module pages/clinica/coda/QueueMonitorDisplayPage
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
    Volume2,
    VolumeX,
    Clock,
    Users,
    AlertCircle,
    Maximize,
    Minimize,
    RefreshCw,
    Monitor
} from 'lucide-react';
import queueApi, { QueueCall, DisplayMonitor } from '@/services/queueApi';

// =====================================================
// TYPES
// =====================================================

interface CurrentCallDisplayProps {
    call: QueueCall | null;
    isNew: boolean;
    waitingCount: number;
}

interface RecentCallsListProps {
    calls: QueueCall[];
    showRecentCalls: boolean;
}

interface HeaderInfoProps {
    monitorName: string;
    ambulatoriNames: string[];
    waitingCount: number;
    currentTime: string;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

/**
 * Large current call display with animation
 */
const CurrentCallDisplay: React.FC<CurrentCallDisplayProps> = ({ call, isNew, waitingCount }) => {
    if (!call) {
        return (
            <div className="flex-1 flex items-center justify-center px-10">
                <div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-12 text-center shadow-2xl">
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-teal-500 via-cyan-400 to-sky-500" />
                    <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-teal-50 ring-8 ring-teal-500/10">
                        <Monitor className="h-14 w-14 text-teal-600" />
                    </div>
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">
                        Monitor attivo
                    </p>
                    <h2 className="mt-3 text-5xl font-black tracking-tight text-slate-900">
                        Nessuna chiamata in corso
                    </h2>
                    <p className="mx-auto mt-5 max-w-2xl text-2xl leading-relaxed text-slate-500">
                        Restate in attesa: il prossimo numero comparira qui appena chiamato.
                    </p>
                    <div className="mt-10 grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-5">
                            <p className="text-sm font-semibold uppercase text-slate-400">Pazienti in attesa</p>
                            <p className="mt-2 text-5xl font-black text-teal-600">{waitingCount}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-6 py-5">
                            <p className="text-sm font-semibold uppercase text-slate-400">Stato display</p>
                            <p className="mt-3 text-2xl font-bold text-slate-700">Pronto</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-500 ${isNew ? 'animate-pulse' : ''
            }`}>
            {/* Ambulatorio badge */}
            <div className="mb-8">
                <span className="px-6 py-3 bg-teal-600 text-white text-2xl font-bold rounded-full shadow-lg">
                    {call.ambulatorio?.nome || 'Ambulatorio'}
                </span>
            </div>

            {/* Number display */}
            <div className={`relative ${isNew ? 'animate-bounce' : ''}`}>
                <div className="absolute inset-0 bg-teal-500 opacity-20 blur-3xl rounded-full" />
                <div className="relative bg-white rounded-3xl shadow-2xl p-12 border-4 border-teal-500">
                    <span className="text-[12rem] font-black text-teal-600 leading-none tracking-tighter">
                        {call.displayedNumber}
                    </span>
                </div>
            </div>

            {/* Instruction */}
            <div className="mt-8 text-2xl text-gray-500">
                Prego recarsi presso <strong className="text-gray-700">{call.ambulatorio?.nome || 'Ambulatorio'}</strong>
            </div>
        </div>
    );
};

/**
 * Recent calls list sidebar
 */
const RecentCallsList: React.FC<RecentCallsListProps> = ({ calls, showRecentCalls }) => {
    if (!showRecentCalls) return null;

    return (
        <div className="w-80 bg-gray-800 text-white flex flex-col">
            <div className="p-4 bg-gray-900">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <RefreshCw className="w-5 h-5" />
                    Chiamate Recenti
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {calls.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Nessuna chiamata recente</p>
                ) : (
                    calls.map((call, index) => (
                        <div
                            key={call.id}
                            className={`p-4 rounded-lg transition-opacity ${index === 0
                                ? 'bg-teal-600 opacity-100'
                                : 'bg-gray-700 opacity-70'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold">
                                    {call.displayedNumber}
                                </span>
                                <span className="text-sm opacity-75">
                                    {new Date(call.calledAt).toLocaleTimeString('it-IT', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className="text-sm opacity-75 mt-1">
                                {call.ambulatorio?.nome}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

/**
 * Header with monitor info, time, and waiting count
 */
const HeaderInfo: React.FC<HeaderInfoProps> = ({ monitorName, ambulatoriNames, waitingCount, currentTime }) => {
    return (
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <img
                    src="/assets/logos/element-medica-logo-white.png"
                    alt="Element Medica"
                    className="h-10 w-auto max-w-[190px] object-contain"
                />
                <div className="h-10 w-px bg-white/15" />
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <div>
                    <h1 className="text-xl font-semibold">{monitorName}</h1>
                    {ambulatoriNames.length > 0 && (
                        <p className="text-sm text-gray-400">
                            {ambulatoriNames.slice(0, 3).join(', ')}
                            {ambulatoriNames.length > 3 && ` +${ambulatoriNames.length - 3}`}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-8">
                {/* Waiting count */}
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-yellow-500" />
                    <span className="text-lg">
                        <strong className="text-yellow-500">{waitingCount}</strong> in attesa
                    </span>
                </div>

                {/* Current time */}
                <div className="text-3xl font-bold tabular-nums">
                    {currentTime}
                </div>
            </div>
        </div>
    );
};

// =====================================================
// AUDIO HOOK
// =====================================================

const useMonitorAudio = ({ enabled, volume = 1 }: { enabled: boolean; volume?: number }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('/sounds/queue-chime.wav');
        audioRef.current.volume = volume;
    }, [volume]);

    const playChime = () => {
        if (enabled && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => { /* autoplay blocked by browser policy */ });
        }
    };

    const speak = (text: string) => {
        if (enabled && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'it-IT';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    };

    return { playChime, speak };
};

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * QueueMonitorDisplayPage Component
 * Public fullscreen display for waiting room monitors
 */
const QueueMonitorDisplayPage: React.FC = () => {
    const { accessToken } = useParams<{ accessToken: string }>();

    // State
    const [monitor, setMonitor] = useState<DisplayMonitor | null>(null);
    const [currentCall, setCurrentCall] = useState<QueueCall | null>(null);
    const [recentCalls, setRecentCalls] = useState<QueueCall[]>([]);
    const [waitingCount, setWaitingCount] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState('');
    const [isNewCall, setIsNewCall] = useState(false);
    const [lastCallId, setLastCallId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);

    // Audio
    const audio = useMonitorAudio({ enabled: audioEnabled, volume: 1 });

    // Initial load
    useEffect(() => {
        const loadMonitor = async () => {
            if (!accessToken) {
                setError('Token mancante');
                setIsLoading(false);
                return;
            }

            try {
                const data = await queueApi.getPublicMonitorDisplay(accessToken);
                setMonitor(data.monitor);
                setCurrentCall(data.currentCall);
                setRecentCalls(data.recentCalls);
                setWaitingCount(data.waitingCount);
                setIsLoading(false);
            } catch (err) {
                setError('Monitor non trovato o link scaduto');
                setIsLoading(false);
            }
        };

        loadMonitor();
    }, [accessToken]);

    // Polling for updates
    useEffect(() => {
        if (!accessToken || error) return;

        const pollState = async () => {
            try {
                const data = await queueApi.getPublicMonitorState(accessToken);
                setCurrentCall(data.currentCall);
                setRecentCalls(data.recentCalls);
                setWaitingCount(data.waitingCount);
            } catch (err) {
            }
        };

        const interval = setInterval(pollState, 3000);
        return () => clearInterval(interval);
    }, [accessToken, error]);

    // Update current time
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Handle new calls - animation and audio
    useEffect(() => {
        if (currentCall && currentCall.id !== lastCallId) {
            setLastCallId(currentCall.id);
            setIsNewCall(true);

            // Play announcement
            if (audioEnabled) {
                audio.playChime();
                setTimeout(() => {
                    const ambulatorioName = currentCall.ambulatorio?.nome || 'ambulatorio';
                    audio.speak(`Numero ${currentCall.displayedNumber}, prego recarsi presso ${ambulatorioName}`);
                }, 500);
            }

            // Reset animation after 5 seconds
            setTimeout(() => setIsNewCall(false), 5000);
        }
    }, [currentCall, lastCallId, audioEnabled, audio]);

    // Fullscreen toggle
    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Config from monitor
    const showRecentCalls = monitor?.config?.showRecentCalls ?? true;
    const showMarquee = monitor?.config?.showMarquee ?? true;
    const marqueeText = monitor?.config?.marqueeText || '';
    const ambulatoriNames = monitor?.ambulatori?.map(a => a.nome) || [];

    // =====================================================
    // RENDER
    // =====================================================

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Errore</h2>
                    <p className="text-gray-400">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-teal-600 rounded-lg hover:bg-teal-700"
                    >
                        Riprova
                    </button>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <div className="animate-spin w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-xl">Caricamento monitor...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col"
        >
            {/* Header */}
            <HeaderInfo
                monitorName={monitor?.nome || 'Monitor Display'}
                ambulatoriNames={ambulatoriNames}
                waitingCount={waitingCount}
                currentTime={currentTime}
            />

            {/* Main content */}
            <div className="flex-1 flex">
                {/* Current call display */}
                <CurrentCallDisplay call={currentCall} isNew={isNewCall} waitingCount={waitingCount} />

                {/* Recent calls sidebar */}
                <RecentCallsList calls={recentCalls} showRecentCalls={showRecentCalls} />
            </div>

            {/* Controls (bottom-right, semi-transparent) */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
                {/* Audio toggle */}
                <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className={`p-3 rounded-lg ${audioEnabled
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                        }`}
                    title={audioEnabled ? 'Audio attivo' : 'Audio disattivato'}
                >
                    {audioEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                </button>

                {/* Fullscreen toggle */}
                <button
                    onClick={toggleFullscreen}
                    className="p-3 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                    title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
                >
                    {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                </button>
            </div>

            {/* Footer ticker (optional - showing waiting info) */}
            {showMarquee && (
                <div className="bg-gray-800 text-white py-2 overflow-hidden">
                    <div className="animate-marquee whitespace-nowrap">
                        <span className="mx-8">
                            {marqueeText || `Benvenuti • ${waitingCount} pazienti in attesa • Vi invitiamo ad attendere il vostro numero • Grazie per la vostra pazienza`}
                        </span>
                    </div>
                </div>
            )}

            {/* CSS for marquee animation */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default QueueMonitorDisplayPage;
