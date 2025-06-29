import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Template } from '../types/template';

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

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get<Template[]>('/template-links');
      setTemplates(res.data || []);
    } catch (err) {
      setError('Errore nel recupero dei template');
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const setAsDefault = async (id: string, type: string) => {
    try {
      setLoading(true);
      setError(null);
      await axios.put(`/template-links/${id}`, { isDefault: true, type });
      setSuccess('Template impostato come predefinito');
      
      // Resetta il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccess(null), 3000);
      
      // Aggiorna la lista dei template
      await fetchTemplates();
    } catch (err) {
      setError('Errore nell\'impostare il template come predefinito');
      console.error('Error setting template as default:', err);
    } finally {
      setLoading(false);
    }
  };

  const removeTemplate = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo template?')) {
      try {
        setLoading(true);
        setError(null);
        await axios.delete(`/template-links/${id}`);
        setSuccess('Template eliminato con successo');
        
        // Resetta il messaggio di successo dopo 3 secondi
        setTimeout(() => setSuccess(null), 3000);
        
        // Aggiorna la lista dei template
        await fetchTemplates();
      } catch (err) {
        setError('Errore nell\'eliminazione del template');
        console.error('Error deleting template:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const createTemplate = async (templateData: Partial<Template>) => {
    try {
      setLoading(true);
      setError(null);
      await axios.post('/template-links', templateData);
      setSuccess('Nuovo template creato con successo');
      
      // Resetta il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccess(null), 3000);
      
      // Aggiorna la lista dei template
      await fetchTemplates();
    } catch (err) {
      setError('Errore nel salvataggio del template');
      console.error('Errore nel salvataggio del template:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (id: string, templateData: Partial<Template>) => {
    try {
      setLoading(true);
      setError(null);
      await axios.put(`/template-links/${id}`, templateData);
      setSuccess('Template aggiornato con successo');
      
      // Resetta il messaggio di successo dopo 3 secondi
      setTimeout(() => setSuccess(null), 3000);
      
      // Aggiorna la lista dei template
      await fetchTemplates();
    } catch (err) {
      setError('Errore nell\'aggiornamento del template');
      console.error('Errore nell\'aggiornamento del template:', err);
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