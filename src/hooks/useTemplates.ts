import React, { useState, useEffect } from 'react';
import { apiGet, apiDelete, apiPost, apiPut } from '../services/api';
import { Template } from '../types/templates';
import { useConfirmDialog } from '@/contexts/ConfirmDialogContext';

interface UseTemplatesReturn {
  templates: Template[];
  loading: boolean;
  error: string | null;
  success: string | null;
  fetchTemplates: () => Promise<void>;
  setAsDefault: (id: string, type: string) => Promise<void>;
  removeTemplate: (id: string) => Promise<void>;
  createTemplate: (templateData: Partial<Template>) => Promise<void>;
  updateTemplate: (id: string, templateData: Partial<Template>) => Promise<void>;
}

export const useTemplates = (): UseTemplatesReturn => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { confirmDelete } = useConfirmDialog();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<Template[]>('/api/v1/templates');
      setTemplates(data || []);
    } catch (err) {
      setError('Errore nel recupero dei template');
    } finally {
      setLoading(false);
    }
  };

  const setAsDefault = async (id: string, type: string) => {
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/api/v1/templates/${id}`, { isDefault: true, type });
      setSuccess('Template impostato come predefinito');

      // Resetta il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccess(null), 3000);

      // Aggiorna la lista dei template
      await fetchTemplates();
    } catch (err) {
      setError('Errore nell\'impostare il template come predefinito');
    } finally {
      setLoading(false);
    }
  };

  const removeTemplate = async (id: string) => {
    const confirmed = await confirmDelete('template');
    if (confirmed) {
      try {
        setLoading(true);
        setError(null);
        await apiDelete(`/api/v1/templates/${id}`);
        setSuccess('Template eliminato con successo');

        // Resetta il messaggio di successo dopo 3 secondi
        setTimeout(() => setSuccess(null), 3000);

        // Aggiorna la lista dei template
        await fetchTemplates();
      } catch (err) {
        setError('Errore nell\'eliminazione del template');
      } finally {
        setLoading(false);
      }
    }
  };

  const createTemplate = async (templateData: Partial<Template>) => {
    try {
      setLoading(true);
      setError(null);
      await apiPost('/api/v1/templates', templateData);
      setSuccess('Nuovo template creato con successo');

      // Resetta il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccess(null), 3000);

      // Aggiorna la lista dei template
      await fetchTemplates();
    } catch (err) {
      setError('Errore nel salvataggio del template');
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (id: string, templateData: Partial<Template>) => {
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/api/v1/templates/${id}`, templateData);
      setSuccess('Template aggiornato con successo');

      // Resetta il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccess(null), 3000);

      // Aggiorna la lista dei template
      await fetchTemplates();
    } catch (err) {
      setError('Errore nell\'aggiornamento del template');
    } finally {
      setLoading(false);
    }
  };

  // Carica i template al primo rendering
  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    error,
    success,
    fetchTemplates,
    setAsDefault,
    removeTemplate,
    createTemplate,
    updateTemplate
  };
};