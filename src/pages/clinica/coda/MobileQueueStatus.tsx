/**
 * MobileQueueStatus - Pagina stato attesa paziente
 * Progetto 53.1: Sistema gestione code pazienti - Mobile Status
 * 
 * Mostra al paziente:
 * - Il suo numero in coda
 * - Posizione corrente
 * - Tempo stimato di attesa
 * - Aggiornamenti in tempo reale
 * 
 * @module pages/clinica/coda/MobileQueueStatus
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Clock,
    Users,
    Bell,
    BellOff,
    CheckCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
    ArrowLeft,
    Volume2,
    MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';

// API helper (senza autenticazione per endpoint pubblici)
const publicApiGet = async (url: string) => {
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Errore nella richiesta');
    }
    return response.json();
};

// Tipi
interface WaitingStatus {
    entryId: string;
    displayNumber: string;
    numero: number;
    stato: string;
    positionInQueue: number;
    entriesBefore: number;
    estimatedMinutes: number;
    checkInAt: string;
    checkInOrder: number;
    ambulatorio?: {
        nome: string;
        codice?: string;
        descrizione?: string | null;
        piano?: string | null;
    } | null;
}

type StatusType = 'loading' | 'waiting' | 'called' | 'completed' | 'error';

const MobileQueueStatus: React.FC = () => {
    const { token, entryId } = useParams<{ token: string; entryId: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // State
    const [statusType, setStatusType] = useState<StatusType>('loading');
    const [waitingStatus, setWaitingStatus] = useState<WaitingStatus | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Carica stato attesa
    const loadStatus = useCallback(async (showSpinner = true) => {
        if (!token || !entryId) {
            setErrorMessage('Link non valido');
            setStatusType('error');
            return;
        }

        if (showSpinner) setIsRefreshing(true);

        try {
            const response = await publicApiGet(`/api/v1/public/queue/${token}/status/${entryId}`);
            setWaitingStatus(response.data);
            setLastUpdate(new Date());

            // Determina stato in base a risposta
            switch (response.data.stato) {
                case 'CHIAMATO':
                case 'RICHIAMATO':
                    setStatusType('called');
                    // Vibra e suona se chiamato
                    playNotification();
                    break;
                case 'IN_VISITA':
                case 'COMPLETATO':
                    setStatusType('completed');
                    break;
                default:
                    setStatusType('waiting');
            }
        } catch (error) {
            const err = error as Error;
            setErrorMessage('Impossibile caricare lo stato');
            setStatusType('error');
        } finally {
            setIsRefreshing(false);
        }
    }, [token, entryId]);

    // Riproduci notifica quando chiamato
    const playNotification = () => {
        try {
            // Vibra (se supportato)
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
            // Suona (se abilitato e supportato)
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { }); // Ignora errori se audio non supportato
        } catch {
            // Ignora errori
        }
    };

    // Richiedi permesso notifiche push
    const requestNotifications = async () => {
        if (!('Notification' in window)) {
            showToast({ message: 'Il tuo browser non supporta le notifiche', type: 'warning' });
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationsEnabled(true);
                showToast({ message: 'Notifiche attivate!', type: 'success' });
            } else {
                showToast({ message: 'Permesso notifiche negato', type: 'warning' });
            }
        } catch {
            showToast({ message: 'Errore nell\'attivazione delle notifiche', type: 'error' });
        }
    };

    // Carica stato iniziale
    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    // Auto-refresh ogni 30 secondi
    useEffect(() => {
        const interval = setInterval(() => {
            loadStatus(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [loadStatus]);

    // Torna alla landing
    const goBack = () => {
        navigate(`/queue/${token}`);
    };

    // Formatta tempo
    const formatTime = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}min`;
    };

    // Formatta orario ultimo aggiornamento
    const formatLastUpdate = () => {
        return lastUpdate.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Render loading
    if (statusType === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-teal-600 dark:text-teal-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Caricamento stato attesa...</p>
                </div>
            </div>
        );
    }

    // Render error
    if (statusType === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <Card className="max-w-md w-full dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-50 mb-2">Errore</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{errorMessage}</p>
                        <Button onClick={goBack} variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Torna indietro
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render chiamato!
    if (statusType === 'called' && waitingStatus) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-4 border-amber-400 dark:border-amber-500 animate-pulse dark:bg-gray-800">
                    <CardContent className="pt-8 text-center">
                        <div className="w-24 h-24 bg-amber-400 dark:bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <Volume2 className="w-12 h-12 text-white" />
                        </div>

                        <h2 className="text-3xl font-bold text-amber-800 dark:text-amber-400 mb-4">
                            È IL TUO TURNO!
                        </h2>

                        <div className="bg-white dark:bg-gray-700 rounded-xl p-6 shadow-lg dark:shadow-black/30 my-6">
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Il tuo numero</p>
                            <p className="text-6xl font-bold text-amber-600 dark:text-amber-400">
                                {waitingStatus.displayNumber}
                            </p>
                        </div>

                        <p className="text-amber-700 dark:text-amber-300 text-lg">
                            {waitingStatus.ambulatorio ? (
                                <span className="flex flex-col items-center gap-2">
                                    <span className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5" />
                                        Recati a: <strong>{waitingStatus.ambulatorio.nome}</strong>
                                    </span>
                                    {waitingStatus.ambulatorio.piano && (
                                        <span className="text-base text-amber-600 dark:text-amber-400">
                                            Piano: {waitingStatus.ambulatorio.piano}
                                        </span>
                                    )}
                                    {waitingStatus.ambulatorio.descrizione && (
                                        <span className="text-sm text-amber-600/80 dark:text-amber-400/80">
                                            {waitingStatus.ambulatorio.descrizione}
                                        </span>
                                    )}
                                </span>
                            ) : (
                                'Recati all\'ambulatorio indicato'
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render completato
    if (statusType === 'completed' && waitingStatus) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <Card className="max-w-md w-full dark:bg-gray-800 dark:border-gray-700">
                    <CardContent className="pt-8 text-center">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-50 mb-2">
                            Visita completata
                        </h2>

                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Grazie per esserti affidato a noi
                        </p>

                        <Button onClick={goBack} variant="outline">
                            Chiudi
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render waiting (default)
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <Card className="max-w-md w-full dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="pt-6">
                    {/* Numero grande */}
                    <div className="text-center mb-6">
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Il tuo numero</p>
                        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 dark:from-teal-600 dark:to-cyan-600 rounded-2xl p-6 text-white shadow-lg dark:shadow-black/30">
                            <p className="text-5xl font-bold">
                                {waitingStatus?.displayNumber}
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-700/50 rounded-xl p-4 shadow dark:shadow-black/30 text-center">
                            <Users className="w-6 h-6 text-teal-600 dark:text-teal-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-50">
                                {waitingStatus?.positionInQueue}°
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">in coda</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700/50 rounded-xl p-4 shadow dark:shadow-black/30 text-center">
                            <Clock className="w-6 h-6 text-teal-600 dark:text-teal-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-50">
                                ~{formatTime(waitingStatus?.estimatedMinutes || 0)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">attesa stimata</p>
                        </div>
                    </div>

                    {/* Info */}
                    {waitingStatus?.entriesBefore === 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-center mb-6">
                            <p className="text-amber-800 dark:text-amber-300 font-medium">
                                🔔 Sei il prossimo! Preparati
                            </p>
                        </div>
                    )}

                    {waitingStatus && waitingStatus.entriesBefore > 0 && (
                        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                            {waitingStatus.entriesBefore === 1
                                ? 'C\'è 1 paziente prima di te'
                                : `Ci sono ${waitingStatus.entriesBefore} pazienti prima di te`
                            }
                        </p>
                    )}

                    {/* Ambulatorio assegnato */}
                    {waitingStatus?.ambulatorio && (
                        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-teal-800 dark:text-teal-300">
                                        {waitingStatus.ambulatorio.nome}
                                    </p>
                                    {waitingStatus.ambulatorio.piano && (
                                        <p className="text-sm text-teal-600 dark:text-teal-400">
                                            Piano: {waitingStatus.ambulatorio.piano}
                                        </p>
                                    )}
                                    {waitingStatus.ambulatorio.descrizione && (
                                        <p className="text-sm text-teal-600/80 dark:text-teal-400/80 mt-1">
                                            {waitingStatus.ambulatorio.descrizione}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifiche */}
                    <Button
                        onClick={requestNotifications}
                        variant="outline"
                        className="w-full mb-4"
                        disabled={notificationsEnabled}
                    >
                        {notificationsEnabled ? (
                            <>
                                <Bell className="w-4 h-4 mr-2 text-green-600" />
                                Notifiche attive
                            </>
                        ) : (
                            <>
                                <BellOff className="w-4 h-4 mr-2" />
                                Attiva notifiche
                            </>
                        )}
                    </Button>

                    {/* Refresh */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>Aggiornato alle {formatLastUpdate()}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadStatus(true)}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Aggiorna
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MobileQueueStatus;
