/**
 * Hook per gestione template di configurazioni schedules frequenti
 * Permette salvataggio/caricamento di configurazioni pre-impostate
 */

import { useState, useCallback, useEffect } from 'react';
import type { ScheduleFormData } from '../types';

export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  formData: Partial<ScheduleFormData>;
  selectedCompanyIds?: (string | number)[];
  createdAt: number;
  usageCount: number;
}

const TEMPLATES_STORAGE_KEY = 'scheduleModal_templates';
const MAX_TEMPLATES = 20; // Limite massimo template salvati

export function useScheduleTemplates() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);

  // Carica template da localStorage
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = useCallback(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (!stored) {
        setTemplates([]);
        return;
      }

      const parsed: ScheduleTemplate[] = JSON.parse(stored);
      // Ordina per uso più recente e numero di utilizzi
      const sorted = parsed.sort((a, b) => {
        const scoreA = a.usageCount * 1000 + a.createdAt;
        const scoreB = b.usageCount * 1000 + b.createdAt;
        return scoreB - scoreA;
      });
      
      setTemplates(sorted);
      console.log('[Templates] 📂 Caricati', sorted.length, 'template');
    } catch (error) {
      console.error('[Templates] ❌ Errore caricamento:', error);
      setTemplates([]);
    }
  }, []);

  const saveTemplates = useCallback((newTemplates: ScheduleTemplate[]) => {
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(newTemplates));
      setTemplates(newTemplates);
      console.log('[Templates] 💾 Salvati', newTemplates.length, 'template');
    } catch (error) {
      console.error('[Templates] ❌ Errore salvataggio:', error);
    }
  }, []);

  // Salva nuovo template
  const saveTemplate = useCallback((
    name: string,
    description: string | undefined,
    formData: Partial<ScheduleFormData>,
    selectedCompanyIds?: (string | number)[]
  ): boolean => {
    if (!name.trim()) {
      console.error('[Templates] ❌ Nome template vuoto');
      return false;
    }

    try {
      const newTemplate: ScheduleTemplate = {
        id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description?.trim(),
        formData,
        selectedCompanyIds,
        createdAt: Date.now(),
        usageCount: 0
      };

      let updatedTemplates = [...templates, newTemplate];

      // Limita numero massimo template (elimina i meno usati)
      if (updatedTemplates.length > MAX_TEMPLATES) {
        updatedTemplates = updatedTemplates
          .sort((a, b) => {
            const scoreA = a.usageCount * 1000 + a.createdAt;
            const scoreB = b.usageCount * 1000 + b.createdAt;
            return scoreB - scoreA;
          })
          .slice(0, MAX_TEMPLATES);
      }

      saveTemplates(updatedTemplates);
      console.log('[Templates] ✅ Template salvato:', name);
      return true;
    } catch (error) {
      console.error('[Templates] ❌ Errore salvataggio template:', error);
      return false;
    }
  }, [templates, saveTemplates]);

  // Carica un template
  const loadTemplate = useCallback((templateId: string): ScheduleTemplate | null => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      console.error('[Templates] ❌ Template non trovato:', templateId);
      return null;
    }

    try {
      // Incrementa contatore utilizzo
      const updatedTemplates = templates.map(t =>
        t.id === templateId
          ? { ...t, usageCount: t.usageCount + 1 }
          : t
      );
      saveTemplates(updatedTemplates);

      console.log('[Templates] 📂 Template caricato:', template.name);
      return template;
    } catch (error) {
      console.error('[Templates] ❌ Errore caricamento template:', error);
      return null;
    }
  }, [templates, saveTemplates]);

  // Elimina un template
  const deleteTemplate = useCallback((templateId: string): boolean => {
    try {
      const updatedTemplates = templates.filter(t => t.id !== templateId);
      saveTemplates(updatedTemplates);
      console.log('[Templates] 🗑️ Template eliminato:', templateId);
      return true;
    } catch (error) {
      console.error('[Templates] ❌ Errore eliminazione template:', error);
      return false;
    }
  }, [templates, saveTemplates]);

  // Aggiorna un template esistente
  const updateTemplate = useCallback((
    templateId: string,
    updates: Partial<Omit<ScheduleTemplate, 'id' | 'createdAt' | 'usageCount'>>
  ): boolean => {
    try {
      const updatedTemplates = templates.map(t =>
        t.id === templateId
          ? { ...t, ...updates }
          : t
      );
      saveTemplates(updatedTemplates);
      console.log('[Templates] ✏️ Template aggiornato:', templateId);
      return true;
    } catch (error) {
      console.error('[Templates] ❌ Errore aggiornamento template:', error);
      return false;
    }
  }, [templates, saveTemplates]);

  // Ottieni template per corso specifico
  const getTemplatesForCourse = useCallback((trainingId: string | number) => {
    return templates.filter(t => t.formData.training_id === trainingId);
  }, [templates]);

  // Esporta template come JSON
  const exportTemplate = useCallback((templateId: string): string | null => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return null;

    try {
      return JSON.stringify(template, null, 2);
    } catch (error) {
      console.error('[Templates] ❌ Errore export:', error);
      return null;
    }
  }, [templates]);

  // Importa template da JSON
  const importTemplate = useCallback((jsonString: string): boolean => {
    try {
      const template: ScheduleTemplate = JSON.parse(jsonString);
      
      // Validazione base
      if (!template.name || !template.formData) {
        console.error('[Templates] ❌ Template non valido');
        return false;
      }

      // Genera nuovo ID per evitare conflitti
      const newTemplate: ScheduleTemplate = {
        ...template,
        id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        usageCount: 0
      };

      const updatedTemplates = [...templates, newTemplate].slice(0, MAX_TEMPLATES);
      saveTemplates(updatedTemplates);
      
      console.log('[Templates] ✅ Template importato:', newTemplate.name);
      return true;
    } catch (error) {
      console.error('[Templates] ❌ Errore import:', error);
      return false;
    }
  }, [templates, saveTemplates]);

  return {
    templates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    updateTemplate,
    getTemplatesForCourse,
    exportTemplate,
    importTemplate,
    reloadTemplates: loadTemplates
  };
}
