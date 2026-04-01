/**
 * CompactTimer - Elegant inline timer for visit duration
 * 
 * Compact design that fits in the header with auto-start/stop capability.
 * Timer recording is always active even when display is hidden.
 * 
 * @module pages/clinica/clinica/components/CompactTimer
 * @project P52 - Clinical Visit Template System
 */

import React from 'react';
import { Play, Pause, Square, Clock, Eye, EyeOff } from 'lucide-react';
import type { TimerState } from '../types';

interface CompactTimerProps {
    timer: TimerState;
    formattedTime: string;
    onStart: () => void;
    onPause: () => void;
    onStop: () => void;
    isVisible?: boolean;
    onToggleVisibility?: () => void;
    className?: string;
}

export const CompactTimer: React.FC<CompactTimerProps> = ({
    timer,
    formattedTime,
    onStart,
    onPause,
    onStop,
    isVisible = true,
    onToggleVisibility,
    className = ''
}) => {
    // Don't render if not visible (but timer continues in background)
    if (!isVisible && !onToggleVisibility) {
        return null;
    }

    // Compute isPaused from pausedAt
    const isPaused = !timer.isRunning && timer.pausedAt !== null;
    const isActive = timer.isRunning || isPaused;

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            {/* Timer Display */}
            {isVisible && (
                <div className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                    ${timer.isRunning
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : isPaused
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }
                `}>
                    <Clock className={`h-4 w-4 ${timer.isRunning ? 'animate-pulse' : ''}`} />
                    <span className="font-mono tabular-nums min-w-[60px]">
                        {formattedTime}
                    </span>
                </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center gap-1">
                {!isActive ? (
                    <button
                        onClick={onStart}
                        className="p-1.5 bg-teal-600 text-white rounded-full hover:bg-teal-700 
                                 transition-colors shadow-sm"
                        title="Avvia timer"
                    >
                        <Play className="h-3.5 w-3.5" />
                    </button>
                ) : (
                    <>
                        {timer.isRunning ? (
                            <button
                                onClick={onPause}
                                className="p-1.5 bg-amber-500 text-white rounded-full hover:bg-amber-600 
                                         transition-colors shadow-sm"
                                title="Pausa"
                            >
                                <Pause className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <button
                                onClick={onStart}
                                className="p-1.5 bg-teal-600 text-white rounded-full hover:bg-teal-700 
                                         transition-colors shadow-sm"
                                title="Riprendi"
                            >
                                <Play className="h-3.5 w-3.5" />
                            </button>
                        )}
                        <button
                            onClick={onStop}
                            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 
                                     transition-colors shadow-sm"
                            title="Termina"
                        >
                            <Square className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}

                {/* Visibility Toggle */}
                {onToggleVisibility && (
                    <button
                        onClick={onToggleVisibility}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                                 rounded-full transition-colors"
                        title={isVisible ? 'Nascondi timer' : 'Mostra timer'}
                    >
                        {isVisible ? (
                            <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                            <Eye className="h-3.5 w-3.5" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CompactTimer;
