/**
 * useDocumentGeneration hook
 * 
 * Manages document generation operations for lettere, registri, and attestati.
 * Handles loading states, API calls, and cache invalidation.
 */

import { useState } from 'react';
import lettereIncaricoService from '../../../../../services/lettereIncaricoService';
import registriPresenzeService from '../../../../../services/registriPresenzeService';
import attestatiService from '../../../../../services/attestatiService';
import { invalidateCache } from '../../../../../services/api';
import type { LoadingState, DateEntry, Attestato } from '../types';

export interface UseDocumentGenerationProps {
  scheduleId: string | number | null | undefined;
  trainers: Array<{ id: string | number; firstName: string; lastName: string }>;
  dates: DateEntry[];
  attendance: Record<number, (string | number)[]>;
  selectedPersons: (string | number)[];
  attestatiList: Attestato[];
  onRefresh: () => void;
}

export interface UseDocumentGenerationReturn {
  loading: LoadingState;
  generateLettere: () => Promise<void>;
  generateRegistri: () => Promise<void>;
  openAttestatiModal: () => void;
  generateAttestati: (personIds: string[], regenerateExisting: boolean) => Promise<void>;
}

/**
 * Custom hook for document generation operations
 */
export const useDocumentGeneration = ({
  scheduleId,
  trainers,
  dates,
  attendance,
  selectedPersons,
  attestatiList,
  onRefresh
}: UseDocumentGenerationProps): UseDocumentGenerationReturn => {
  const [loading, setLoading] = useState<LoadingState>({
    lettere: false,
    registri: false,
    attestati: false
  });

  /**
   * Generate lettere di incarico for all trainers
   */
  const generateLettere = async () => {
    if (!scheduleId || trainers.length === 0) return;

    setLoading(prev => ({ ...prev, lettere: true }));
    try {
      const result = await lettereIncaricoService.generateBatch({
        scheduleId: String(scheduleId),
        trainerIds: trainers.map(t => String(t.id)),
        sendEmail: false
      });

      alert(`✅ ${result.message || `Avviate ${trainers.length} lettere di incarico!`}`);

      // Invalidate cache before refresh
      invalidateCache('/api/v1/lettere-incarico');
      onRefresh();
    } catch (error: any) {
      console.error('Errore generazione lettere:', error);
      alert(`❌ Errore: ${error.response?.data?.message || error.message || 'Generazione fallita'}`);
    } finally {
      setLoading(prev => ({ ...prev, lettere: false }));
    }
  };

  /**
   * Generate registri presenze for all sessions
   * Loops through all dates and generates a registro for each
   * Uses real sessionId from CourseSession if available
   */
  const generateRegistri = async () => {
    if (!scheduleId || dates.length === 0) return;

    setLoading(prev => ({ ...prev, registri: true }));
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const [index, date] of dates.entries()) {
        try {
          const attendanceData = attendance[index] || [];

          // Usa il sessionId reale se disponibile, altrimenti genera un ID temporaneo
          // Il sessionId reale è presente solo per schedule già salvati
          const sessionId = (date as any).sessionId || `${scheduleId}-session-${date.date}-${index}`;

          await registriPresenzeService.generate({
            sessionId,
            formatoreId: String(date.trainerId),
            attendanceData: attendanceData.map(personId => ({
              personId: String(personId),
              present: true,
              hours: 8
            }))
          });
          successCount++;
        } catch (err) {
          console.error(`Errore sessione ${index + 1}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        alert(
          `✅ Generati ${successCount} registri presenze!${errorCount > 0 ? ` (${errorCount} errori)` : ''
          }`
        );

        // Invalidate cache before refresh
        invalidateCache('/api/v1/registri-presenze');
        onRefresh();
      } else {
        alert('❌ Nessun registro generato con successo');
      }
    } catch (error: any) {
      console.error('Errore generazione registri:', error);
      alert(`❌ Errore: ${error.response?.data?.message || error.message || 'Generazione fallita'}`);
    } finally {
      setLoading(prev => ({ ...prev, registri: false }));
    }
  };

  /**
   * Open attestati generation modal (actual generation happens via generateAttestati)
   */
  const openAttestatiModal = () => {
    if (!scheduleId || selectedPersons.length === 0) return;
    // This will be handled by the parent component setting showRegenerateModal
    // The actual modal trigger is returned by useDocumentUI hook
  };

  /**
   * Generate attestati for selected persons
   * 
   * @param personIds - Array of person IDs to generate attestati for
   * @param regenerateExisting - If true, delete existing attestati before generating
   */
  const generateAttestati = async (personIds: string[], regenerateExisting: boolean) => {
    if (!scheduleId || personIds.length === 0) return;

    setLoading(prev => ({ ...prev, attestati: true }));
    try {
      let finalPersonIds = personIds;

      // If regenerate=true, delete existing attestati first
      if (regenerateExisting) {
        const existingToDelete = attestatiList
          .filter(a => personIds.includes(a.personId))
          .map(a => a.id);

        if (existingToDelete.length > 0) {
          await attestatiService.deleteMultipleAttestati(existingToDelete);
        }
      } else {
        // Filter only persons without existing attestati
        const personsWithAttestati = new Set(attestatiList.map(a => a.personId));
        finalPersonIds = personIds.filter(id => !personsWithAttestati.has(id));
      }

      if (finalPersonIds.length === 0) {
        alert(
          '⚠️ Nessun attestato da generare (tutti i partecipanti selezionati hanno già un attestato)'
        );
        return;
      }

      const result = await attestatiService.generateBatch({
        scheduleId: String(scheduleId),
        personIds: finalPersonIds,
        sendEmail: false
      });

      if (result.success > 0) {
        alert(
          `✅ Generati ${result.success} attestati!${result.failed > 0 ? ` (${result.failed} errori)` : ''
          }`
        );

        // Invalidate cache before refresh
        invalidateCache('/api/v1/attestati');
        onRefresh();
      } else {
        // Show detailed error message from backend
        const errorDetails = result.errors?.length > 0
          ? result.errors.map((e: { error?: string; personName?: string }) =>
            e.error || 'Errore sconosciuto'
          ).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join(', ')
          : 'Errore sconosciuto';

        // Check for common errors and provide helpful messages
        if (errorDetails.includes('not connected to Google')) {
          alert('❌ Errore: Devi collegare il tuo account Google per generare attestati.\n\nVai in Impostazioni → Google Drive per collegare il tuo account.');
        } else {
          alert(`❌ Nessun attestato generato: ${errorDetails}`);
        }
      }
    } catch (error: any) {
      console.error('Errore generazione attestati:', error);

      // Handle 409 Conflict error (existing attestati)
      if (error.response?.status === 409) {
        alert(
          "⚠️ Alcuni partecipanti hanno già un attestato. Usa il modal per rigenerarli o seleziona solo chi non ce l'ha."
        );
      } else {
        alert(`❌ Errore: ${error.response?.data?.message || error.message || 'Generazione fallita'}`);
      }
    } finally {
      setLoading(prev => ({ ...prev, attestati: false }));
    }
  };

  return {
    loading,
    generateLettere,
    generateRegistri,
    openAttestatiModal,
    generateAttestati
  };
};
