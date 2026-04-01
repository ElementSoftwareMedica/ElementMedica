/**
 * Hook per auto-save delle bozze di schedule in localStorage
 * Previene perdita dati in caso di chiusura accidentale del modal
 */

import { useEffect, useCallback } from 'react';
import type { ScheduleFormData } from '../types';

interface DraftData {
  formData: ScheduleFormData;
  selectedCompanies: (string | number)[];
  selectedPersons: (string | number)[];
  attendance: Record<number, (string | number)[]>;
  timestamp: number;
}

const DRAFT_STORAGE_KEY = 'scheduleModal_draft';
const AUTO_SAVE_DELAY = 2000; // 2 secondi di debounce
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 ore

export function useScheduleDraftAutoSave(
  formData: ScheduleFormData,
  selectedCompanies: Set<string | number>,
  selectedPersons: Set<string | number>,
  attendance: Record<number, (string | number)[]>,
  isEditing: boolean
) {
  // Salva bozza in localStorage con debounce
  const saveDraft = useCallback(() => {
    // Non salvare bozze durante editing di schedule esistenti
    if (isEditing) return;

    // Non salvare se form è completamente vuoto
    const isEmpty = 
      !formData.training_id &&
      !formData.location &&
      selectedCompanies.size === 0 &&
      selectedPersons.size === 0 &&
      (!formData.dates || formData.dates.length === 0);

    if (isEmpty) return;

    try {
      const draft: DraftData = {
        formData,
        selectedCompanies: Array.from(selectedCompanies),
        selectedPersons: Array.from(selectedPersons),
        attendance,
        timestamp: Date.now()
      };

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
    }
  }, [formData, selectedCompanies, selectedPersons, attendance, isEditing]);

  // Auto-save con debounce
  useEffect(() => {
    if (isEditing) return;

    const timer = setTimeout(saveDraft, AUTO_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [formData, selectedCompanies, selectedPersons, attendance, isEditing, saveDraft]);

  // Carica bozza salvata
  const loadDraft = useCallback((): DraftData | null => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return null;

      const draft: DraftData = JSON.parse(stored);

      // Verifica età della bozza
      const age = Date.now() - draft.timestamp;
      if (age > DRAFT_EXPIRY_MS) {
        clearDraft();
        return null;
      }


      return draft;
    } catch (error) {
      clearDraft();
      return null;
    }
  }, []);

  // Cancella bozza
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (error) {
    }
  }, []);

  // Verifica se esiste una bozza
  const hasDraft = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!stored) return false;

      const draft: DraftData = JSON.parse(stored);
      const age = Date.now() - draft.timestamp;
      return age <= DRAFT_EXPIRY_MS;
    } catch {
      return false;
    }
  }, []);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft
  };
}
