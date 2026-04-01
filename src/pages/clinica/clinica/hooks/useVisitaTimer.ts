/**
 * useVisitaTimer - Hook for visit timer management
 * 
 * Manages timer state for tracking visit duration with:
 * - Auto-start when visit is opened
 * - Persistence across page reloads (localStorage + DB durataEffettiva)
 * - Auto-stop when visit is completed, preserving final elapsed time
 * - DB-backed initial duration for reopened visits
 * 
 * @module pages/clinica/clinica/hooks/useVisitaTimer
 * @project P52 - Clinical Visit Template System
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimerState, UseVisitaTimerReturn } from '../types';

const STORAGE_KEY = 'visita-timer';

interface StoredTimer {
    visitaId: string;
    startTime?: string;
    /** Timestamp of the last localStorage write (ISO string). Used to calculate gap time on restore. */
    lastUpdated: string;
    elapsedSeconds: number;
}

interface UseVisitaTimerOptions {
    autoStart?: boolean;
    visitaStato?: string;
    /** Duration already saved in DB (seconds). Used to restore timer for reopened visits. */
    initialDuration?: number;
}

export function useVisitaTimer(
    visitaId: string | null,
    options: UseVisitaTimerOptions = {}
): UseVisitaTimerReturn {
    const { autoStart = true, visitaStato, initialDuration } = options;
    const initializedRef = useRef(false);

    const [timer, setTimer] = useState<TimerState>({
        isRunning: false,
        elapsedSeconds: 0,
        startTime: null,
        pausedAt: null
    });

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize timer from localStorage or DB on mount
    // IMPORTANT: We must wait for visita to load (visitaStato !== undefined)
    // before initializing from DB, to avoid starting from 0 when durataEffettiva
    // hasn't arrived yet. localStorage restoration can proceed immediately.
    useEffect(() => {
        if (!visitaId || initializedRef.current) return;

        // Check if visit is readonly (completed/cancelled) — show saved duration as static
        const readonlyStates = ['COMPLETATA', 'ANNULLATA'];
        if (visitaStato && readonlyStates.includes(visitaStato)) {
            initializedRef.current = true;
            const savedDuration = initialDuration || 0;
            setTimer({
                isRunning: false,
                elapsedSeconds: savedDuration,
                startTime: null,
                pausedAt: new Date()
            });
            return;
        }

        // Try restoring from localStorage (active session timer) — no need to wait for visita
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data: StoredTimer = JSON.parse(stored);
                if (data.visitaId === visitaId) {
                    initializedRef.current = true;
                    // Calculate gap time (time between last write and now)
                    const lastUpdated = data.lastUpdated
                        ? new Date(data.lastUpdated)
                        : data.startTime ? new Date(data.startTime) : new Date();
                    const now = new Date();
                    const gapSeconds = Math.max(0, Math.floor((now.getTime() - lastUpdated.getTime()) / 1000));

                    setTimer({
                        isRunning: true,
                        elapsedSeconds: data.elapsedSeconds + gapSeconds,
                        startTime: new Date(),
                        pausedAt: null
                    });
                    return; // localStorage took priority — timer already running
                }
            }
        } catch (error) {
        }

        // No localStorage match — wait for visita to load before initializing
        // visitaStato === undefined means the visita query hasn't completed yet
        if (visitaStato === undefined) {
            return; // Don't initialize yet — don't set initializedRef
        }

        initializedRef.current = true;

        // Fall back to DB saved duration (visit was reopened after save without complete)
        const baseSeconds = initialDuration || 0;

        // Auto-start if enabled and visit is in progress
        if (autoStart && visitaStato === 'IN_CORSO') {
            setTimer({
                isRunning: true,
                elapsedSeconds: baseSeconds,
                startTime: new Date(),
                pausedAt: null
            });
        } else if (baseSeconds > 0) {
            // Show saved duration but don't start
            setTimer({
                isRunning: false,
                elapsedSeconds: baseSeconds,
                startTime: null,
                pausedAt: new Date()
            });
        }
    }, [visitaId, autoStart, visitaStato, initialDuration]);

    // Auto-stop when visit transitions to completed or cancelled — KEEP elapsed time
    useEffect(() => {
        if (!initializedRef.current) return;
        if (visitaStato && ['COMPLETATA', 'ANNULLATA'].includes(visitaStato)) {
            setTimer(prev => ({
                ...prev,
                isRunning: false,
                pausedAt: prev.pausedAt || new Date()
            }));
            if (visitaId) {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    }, [visitaStato, visitaId]);

    // Timer tick effect
    useEffect(() => {
        if (timer.isRunning) {
            intervalRef.current = setInterval(() => {
                setTimer(prev => ({
                    ...prev,
                    elapsedSeconds: prev.elapsedSeconds + 1
                }));
            }, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timer.isRunning]);

    // Save timer state to localStorage while running
    useEffect(() => {
        if (!visitaId) return;

        if (timer.isRunning && timer.startTime) {
            const data: StoredTimer = {
                visitaId,
                lastUpdated: new Date().toISOString(),
                elapsedSeconds: timer.elapsedSeconds
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
    }, [visitaId, timer.isRunning, timer.startTime, timer.elapsedSeconds]);

    const startTimer = useCallback(() => {
        setTimer(prev => ({
            ...prev,
            isRunning: true,
            startTime: prev.startTime || new Date(),
            pausedAt: null
        }));
    }, []);

    const pauseTimer = useCallback(() => {
        setTimer(prev => ({
            ...prev,
            isRunning: false,
            pausedAt: new Date()
        }));
    }, []);

    const stopTimer = useCallback(() => {
        if (visitaId) {
            localStorage.removeItem(STORAGE_KEY);
        }
        // Keep elapsedSeconds — do NOT reset to 0
        setTimer(prev => ({
            ...prev,
            isRunning: false,
            pausedAt: new Date()
        }));
    }, [visitaId]);

    const formatElapsed = useCallback((seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }, []);

    return {
        timer,
        startTimer,
        pauseTimer,
        stopTimer,
        formatElapsed
    };
}
