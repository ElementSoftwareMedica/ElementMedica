/**
 * VisitTimer - Visit duration timer component
 * 
 * Displays and controls the visit timer with start, pause, and stop actions
 * 
 * @module pages/clinica/clinica/components/VisitTimer
 * @project P52 - Clinical Visit Template System
 */

import React from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';
import type { VisitTimerProps } from '../types';

export const VisitTimer: React.FC<VisitTimerProps> = ({
    timer,
    onStart,
    onPause,
    onStop,
    disabled = false
}) => {
    // Format elapsed time
    const formatElapsed = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    };

    // Get status badge
    const getStatusBadge = () => {
        if (timer.isRunning) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    In corso
                </span>
            );
        }
        if (timer.elapsedSeconds > 0) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    In pausa
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                <Clock className="w-3 h-3" />
                Non avviata
            </span>
        );
    };

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">Durata Visita</h3>
                {getStatusBadge()}
            </div>

            {/* Timer Display */}
            <div className="text-center mb-6">
                <p className="text-5xl font-mono font-bold tracking-wider">
                    {formatElapsed(timer.elapsedSeconds)}
                </p>
                {timer.startTime && (
                    <p className="text-xs text-gray-500 mt-2">
                        Iniziata: {timer.startTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-3">
                {!timer.isRunning ? (
                    <button
                        onClick={onStart}
                        disabled={disabled}
                        className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg 
                                 hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                 shadow-lg shadow-green-500/20"
                    >
                        <Play className="h-5 w-5" />
                        {timer.elapsedSeconds > 0 ? 'Riprendi' : 'Inizia Visita'}
                    </button>
                ) : (
                    <button
                        onClick={onPause}
                        disabled={disabled}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg 
                                 hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                 shadow-lg shadow-amber-500/20"
                    >
                        <Pause className="h-5 w-5" />
                        Pausa
                    </button>
                )}

                {timer.elapsedSeconds > 0 && (
                    <button
                        onClick={onStop}
                        disabled={disabled}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg 
                                 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                 shadow-lg shadow-red-500/20"
                    >
                        <Square className="h-5 w-5" />
                        Termina
                    </button>
                )}
            </div>
        </div>
    );
};

export default VisitTimer;
