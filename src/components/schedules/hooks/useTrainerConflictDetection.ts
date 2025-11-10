/**
 * Hook per rilevare conflitti di scheduling per i trainers
 * Alert quando un trainer è già assegnato a un'altra sessione nella stessa data/ora
 */

import { useMemo, useCallback } from 'react';
import type { ScheduleDateEntry } from '../types';

export interface Schedule {
  id: string | number;
  course: { id: string; name?: string; title?: string };
  sessions?: Array<{
    id: string;
    date: string;
    start: string;
    end: string;
    trainer?: { id: string; firstName: string; lastName: string };
    coTrainer?: { id: string; firstName: string; lastName: string };
  }>;
}

export interface TrainerConflict {
  trainerId: string;
  trainerName: string;
  sessionIndex: number;
  conflictingSchedule: {
    id: string | number;
    courseName: string;
    date: string;
    start: string;
    end: string;
  };
  message: string;
}

// Converte stringa time HH:MM in minuti
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Controlla se due sessioni si sovrappongono
function sessionsOverlap(
  date1: string,
  start1: string,
  end1: string,
  date2: string,
  start2: string,
  end2: string
): boolean {
  // Date diverse = nessun conflitto
  if (date1 !== date2) return false;

  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);

  // Controlla sovrapposizione
  return start1Min < end2Min && end1Min > start2Min;
}

export function useTrainerConflictDetection(
  currentDates: ScheduleDateEntry[] | undefined,
  existingSchedules: Schedule[],
  currentScheduleId?: string | number,
  trainers?: Array<{ id: string; firstName: string; lastName: string }>
) {
  // Trova tutti i conflitti per le date correnti
  const conflicts = useMemo((): TrainerConflict[] => {
    if (!currentDates || currentDates.length === 0) return [];
    if (!existingSchedules || existingSchedules.length === 0) return [];

    const detectedConflicts: TrainerConflict[] = [];

    currentDates.forEach((session, sessionIndex) => {
      if (!session.date || !session.start || !session.end) return;

      const trainerId = session.trainerId as string;
      const coTrainerId = session.coTrainerId as string;

      [trainerId, coTrainerId].forEach(tid => {
        if (!tid) return;

        // Cerca conflitti negli altri schedules
        existingSchedules.forEach(schedule => {
          // Skip stesso schedule durante edit
          if (currentScheduleId && schedule.id === currentScheduleId) return;

          if (!schedule.sessions) return;

          schedule.sessions.forEach(existingSession => {
            // Controlla se trainer è assegnato
            const isMainTrainer = existingSession.trainer?.id === tid;
            const isCoTrainer = existingSession.coTrainer?.id === tid;

            if (!isMainTrainer && !isCoTrainer) return;

            // Controlla sovrapposizione
            if (sessionsOverlap(
              session.date,
              session.start,
              session.end,
              existingSession.date.split('T')[0],
              existingSession.start,
              existingSession.end
            )) {
              // Trova nome trainer
              const trainer = trainers?.find(t => t.id === tid) ||
                existingSession.trainer ||
                existingSession.coTrainer;

              if (!trainer) return;

              const courseName = schedule.course.title || schedule.course.name || 'Corso sconosciuto';
              const trainerName = `${trainer.firstName} ${trainer.lastName}`;

              detectedConflicts.push({
                trainerId: tid,
                trainerName,
                sessionIndex,
                conflictingSchedule: {
                  id: schedule.id,
                  courseName,
                  date: existingSession.date.split('T')[0],
                  start: existingSession.start,
                  end: existingSession.end
                },
                message: `${trainerName} è già assegnato a "${courseName}" il ${existingSession.date.split('T')[0]} dalle ${existingSession.start} alle ${existingSession.end}`
              });
            }
          });
        });
      });
    });

    return detectedConflicts;
  }, [currentDates, existingSchedules, currentScheduleId, trainers]);

  // Controlla se una sessione specifica ha conflitti
  const hasConflictForSession = useCallback((sessionIndex: number): boolean => {
    return conflicts.some(c => c.sessionIndex === sessionIndex);
  }, [conflicts]);

  // Ottieni conflitti per una sessione specifica
  const getConflictsForSession = useCallback((sessionIndex: number): TrainerConflict[] => {
    return conflicts.filter(c => c.sessionIndex === sessionIndex);
  }, [conflicts]);

  // Controlla se un trainer specifico ha conflitti
  const hasConflictForTrainer = useCallback((trainerId: string): boolean => {
    return conflicts.some(c => c.trainerId === trainerId);
  }, [conflicts]);

  // Ottieni conflitti per un trainer specifico
  const getConflictsForTrainer = useCallback((trainerId: string): TrainerConflict[] => {
    return conflicts.filter(c => c.trainerId === trainerId);
  }, [conflicts]);

  // Formatta messaggio di warning per UI
  const getConflictWarningMessage = useCallback((): string | null => {
    if (conflicts.length === 0) return null;

    if (conflicts.length === 1) {
      return `⚠️ Conflitto rilevato: ${conflicts[0].message}`;
    }

    return `⚠️ ${conflicts.length} conflitti rilevati. Controlla gli orari dei formatori.`;
  }, [conflicts]);

  // Ottieni lista dettagliata conflitti per display
  const getDetailedConflictsList = useCallback((): string[] => {
    return conflicts.map(c => c.message);
  }, [conflicts]);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
    hasConflictForSession,
    getConflictsForSession,
    hasConflictForTrainer,
    getConflictsForTrainer,
    getConflictWarningMessage,
    getDetailedConflictsList
  };
}
