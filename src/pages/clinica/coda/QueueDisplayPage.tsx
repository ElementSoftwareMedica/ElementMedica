/**
 * Queue Display Page
 * Fullscreen display for waiting room monitors (P53)
 * 
 * Features:
 * - Large visible number display
 * - Current call with ambulatorio indicator
 * - Recent calls history
 * - Auto-refresh and animations
 * - TTS announcement support
 * - P61: Improved elegant design
 * 
 * @module pages/clinica/coda/QueueDisplayPage
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
    Building2
} from 'lucide-react';
import { useQueueDisplay, useQueueAudio } from '@/hooks/clinica/useQueue';
import { QueueCall, formatWaitTime } from '@/services/queueApi';

// =====================================================
// TYPES
// =====================================================

interface CurrentCallDisplayProps {
    call: QueueCall | null;
    isNew: boolean;
    sessionName: string;
}

interface RecentCallsListProps {
    calls: QueueCall[];
}

interface HeaderInfoProps {
    sessionName: string;
    waitingCount: number;
    currentTime: string;
}

// =====================================================
// SUB-COMPONENTS
// =====================================================

/**
 * Large current call display with elegant animation
 */
const CurrentCallDisplay: React.FC<CurrentCallDisplayProps> = ({ call, isNew, sessionName }) => {
    if (!call) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                <div className="text-center space-y-8">
                    <div className="relative">
                        <div className="absolute inset-0 animate-ping">
                            <Clock className="w-32 h-32 mx-auto text-teal-500/20" />
                        </div>
                        <Clock className="w-32 h-32 mx-auto text-teal-500/40" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-3xl font-light text-gray-400 dark:text-gray-500">
                            In attesa della prossima chiamata
                        </p>
                        <p className="text-xl text-gray-300 dark:text-gray-600">
                            {sessionName}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 transition-all duration-700 ${isNew ? 'scale-105' : 'scale-100'}`}>
            {/* Ambulatorio badge - elegant floating design */}
            <div className={`mb-12 transition-all duration-500 ${isNew ? 'animate-bounce' : ''}`}>
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-2xl font-semibold rounded-2xl shadow-2xl shadow-teal-500/30">
                    <Building2 className="w-8 h-8" />
                    {call.ambulatorio?.nome || 'Ambulatorio'}
                </div>
            </div>

            {/* Number display - modern card design */}
            <div className={`relative ${isNew ? 'animate-pulse' : ''}`}>
                {/* Glow effect */}
                <div className="absolute -inset-8 bg-gradient-to-r from-teal-400 via-teal-500 to-teal-600 opacity-20 blur-3xl rounded-full animate-pulse" />

                {/* Main number card */}
                <div className="relative bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl dark:shadow-black/50 p-16 border-4 border-teal-500/20 dark:border-teal-400/20">
                    <div className="text-center">
                        <span className="text-[14rem] font-black bg-gradient-to-b from-teal-600 to-teal-800 dark:from-teal-400 dark:to-teal-600 bg-clip-text text-transparent leading-none tracking-tighter drop-shadow-lg">
                            {call.displayedNumber}
                        </span>
                    </div>
                </div>
            </div>

            {/* Custom message */}
            {call.displayedMessage && (
                <div className="mt-12 px-8 py-4 bg-amber-50 dark:bg-amber-900/30 rounded-2xl border border-amber-200 dark:border-amber-700">
                    <p className="text-2xl text-amber-800 dark:text-amber-300 font-medium">
                        {call.displayedMessage}
                    </p>
                </div>
            )}

            {/* Instruction */}
            <div className="mt-12 text-center space-y-2">
                <p className="text-3xl font-light text-gray-600 dark:text-gray-400">
                    Prego recarsi presso
                </p>
                <p className="text-4xl font-semibold text-teal-700 dark:text-teal-400">
                    {call.ambulatorio?.nome || 'Ambulatorio'}
                </p>
            </div>
        </div>
    );
};

/**
 * Recent calls list sidebar - elegant design
 */
const RecentCallsList: React.FC<RecentCallsListProps> = ({ calls }) => {
    return (
        <div className="w-96 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col shadow-2xl">
            <div className="p-6 bg-gray-900/80 backdrop-blur border-b border-gray-700">
                <h3 className="text-xl font-semibold flex items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-teal-400" />
                    Chiamate Recenti
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {calls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <Clock className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg">Nessuna chiamata recente</p>
                    </div>
                ) : (
                    calls.map((call, index) => (
                        <div
                            key={call.id}
                            className={`p-5 rounded-2xl transition-all duration-300 ${index === 0
                                ? 'bg-gradient-to-r from-teal-600 to-teal-500 shadow-lg shadow-teal-500/30 scale-100'
                                : `bg-gray-700/50 hover:bg-gray-700 ${index > 2 ? 'opacity-50' : 'opacity-80'}`
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`text-4xl font-bold ${index === 0 ? 'text-white' : 'text-gray-200'}`}>
                                    {call.displayedNumber}
                                </span>
                                <span className={`text-sm ${index === 0 ? 'text-teal-100' : 'text-gray-400'}`}>
                                    {new Date(call.calledAt).toLocaleTimeString('it-IT', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className={`text-sm mt-2 flex items-center gap-2 ${index === 0 ? 'text-teal-100' : 'text-gray-400'}`}>
                                <Building2 className="w-4 h-4" />
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
 * Header with session info, time, and waiting count - elegant design
 */
const HeaderInfo: React.FC<HeaderInfoProps> = ({ sessionName, waitingCount, currentTime }) => {
    return (
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white px-8 py-5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-4 h-4 bg-green-500 rounded-full animate-ping opacity-75" />
                </div>
                <div>
                    <h1 className="text-2xl font-semibold">{sessionName}</h1>
                    <p className="text-sm text-gray-400">Sistema Chiamata Pazienti</p>
                </div>
            </div>

            <div className="flex items-center gap-12">
                {/* Waiting count */}
                <div className="flex items-center gap-3 px-6 py-3 bg-gray-800/80 rounded-2xl">
                    <Users className="w-6 h-6 text-amber-500" />
                    <div>
                        <span className="text-3xl font-bold text-amber-500">{waitingCount}</span>
                        <span className="text-sm text-gray-400 ml-2">in attesa</span>
                    </div>
                </div>

                {/* Current time */}
                <div className="text-5xl font-bold tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                    {currentTime}
                </div>
            </div>
        </div>
    );
};

// =====================================================
// MAIN COMPONENT
// =====================================================

/**
 * QueueDisplayPage Component
 * Fullscreen display for waiting room monitors
 */
const QueueDisplayPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();

    // State
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState('');
    const [isNewCall, setIsNewCall] = useState(false);
    const [lastCallId, setLastCallId] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch display state
    const {
        displayState,
        currentCall,
        recentCalls,
        waitingCount,
        isLoading,
        error
    } = useQueueDisplay({
        sessionId: sessionId || '',
        enabled: !!sessionId,
        pollingInterval: 3000
    });

    // Audio for announcements
    const audio = useQueueAudio({ enabled: audioEnabled, volume: 1 });

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

    // Get session name
    const sessionName = displayState?.session?.ambulatorio?.nome || 'Sistema Chiamata';

    // =====================================================
    // RENDER
    // =====================================================

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Errore di connessione</h2>
                    <p className="text-gray-400">Impossibile caricare la coda. Verifica la connessione e riprova.</p>
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
                    <p className="text-xl">Caricamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 flex flex-col"
        >
            {/* Header */}
            <HeaderInfo
                sessionName={sessionName}
                waitingCount={waitingCount}
                currentTime={currentTime}
            />

            {/* Main content */}
            <div className="flex-1 flex">
                {/* Current call display */}
                <CurrentCallDisplay call={currentCall} isNew={isNewCall} sessionName={sessionName} />

                {/* Recent calls sidebar */}
                <RecentCallsList calls={recentCalls} />
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
            <div className="bg-gray-800 text-white py-2 overflow-hidden">
                <div className="animate-marquee whitespace-nowrap">
                    <span className="mx-8">
                        🏥 Benvenuti presso il nostro ambulatorio •
                        <span className="text-yellow-400"> {waitingCount} pazienti in attesa</span> •
                        Vi invitiamo ad attendere il vostro numero •
                        Grazie per la vostra pazienza
                    </span>
                </div>
            </div>

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

export default QueueDisplayPage;
