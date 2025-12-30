/**
 * useTemplateEditor Hook
 * Manages editor state, auto-save, and template operations
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Template,
  CreateTemplateData,
  UpdateTemplateData,
} from '../types/template.types';
import type { EditorState } from '../types/editor.types';
import templateService from '../services/templateService';
import { AUTOSAVE_INTERVAL } from '../utils/constants';

interface UseTemplateEditorOptions {
  templateId?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

interface UseTemplateEditorReturn {
  template: Template | null;
  state: EditorState;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateContent: (content: string) => void;
  updateHeader: (header: string) => void;
  updateFooter: (footer: string) => void;
  save: () => Promise<void>;
  create: (data: CreateTemplateData) => Promise<Template | null>;
  update: (data: UpdateTemplateData) => Promise<void>;
  reset: () => void;
  setError: (error: string | null) => void;
}

export function useTemplateEditor(
  options: UseTemplateEditorOptions = {}
): UseTemplateEditorReturn {
  const {
    templateId,
    autoSave = true,
    autoSaveInterval = AUTOSAVE_INTERVAL,
  } = options;

  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [state, setState] = useState<EditorState>({
    content: '',
    header: '',
    footer: '',
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    error: null,
  });

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Load template if templateId provided
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }

    return () => {
      isMountedRef.current = false;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [templateId]);

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !state.isDirty || !templateId) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [state.content, state.header, state.footer, state.isDirty, autoSave, autoSaveInterval, templateId]);

  const loadTemplate = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await templateService.getTemplate(id);
      
      if (isMountedRef.current) {
        setTemplate(data);
        setState((prev) => ({
          ...prev,
          content: data.content || '',
          header: data.header || '',
          footer: data.footer || '',
          isDirty: false,
        }));
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Errore nel caricamento del template';
      setError(errorMessage);
      // Toast handled by calling component
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const updateContent = useCallback((content: string) => {
    setState((prev) => ({
      ...prev,
      content,
      isDirty: true,
    }));
  }, []);

  const updateHeader = useCallback((header: string) => {
    setState((prev) => ({
      ...prev,
      header,
      isDirty: true,
    }));
  }, []);

  const updateFooter = useCallback((footer: string) => {
    setState((prev) => ({
      ...prev,
      footer,
      isDirty: true,
    }));
  }, []);

  const save = useCallback(async () => {
    if (!templateId || !state.isDirty) {
      return;
    }

    setIsSaving(true);
    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      const updateData: UpdateTemplateData = {
        content: state.content,
        header: state.header,
        footer: state.footer,
      };

      const updatedTemplate = await templateService.updateTemplate(templateId, updateData);
      
      if (isMountedRef.current) {
        setTemplate(updatedTemplate);
        setState((prev) => ({
          ...prev,
          isDirty: false,
          isSaving: false,
          lastSaved: new Date(),
        }));
        // Toast handled by calling component
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Errore nel salvataggio';
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: errorMessage,
      }));
      // Toast handled by calling component
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [templateId, state.content, state.header, state.footer, state.isDirty]);

  const create = useCallback(async (data: CreateTemplateData): Promise<Template | null> => {
    setIsSaving(true);
    setError(null);

    try {
      const newTemplate = await templateService.createTemplate(data);
      
      if (isMountedRef.current) {
        setTemplate(newTemplate);
        setState((prev) => ({
          ...prev,
          content: newTemplate.content || '',
          header: newTemplate.header || '',
          footer: newTemplate.footer || '',
          isDirty: false,
          lastSaved: new Date(),
        }));
        // Toast handled by calling component
        
        // Navigate to editor
        navigate(`/settings/templates/${newTemplate.id}`);
        return newTemplate;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Errore nella creazione del template';
      setError(errorMessage);
      // Toast handled by calling component
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [navigate]);

  const update = useCallback(async (data: UpdateTemplateData) => {
    if (!templateId) {
      throw new Error('Template ID mancante');
    }

    setIsSaving(true);
    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      const updatedTemplate = await templateService.updateTemplate(templateId, data);
      
      if (isMountedRef.current) {
        setTemplate(updatedTemplate);
        // Toast handled by calling component
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Errore nell\'aggiornamento';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
      // Toast handled by calling component
      throw err;
    } finally {
      setIsSaving(false);
      setState((prev) => ({ ...prev, isSaving: false }));
    }
  }, [templateId]);

  const reset = useCallback(() => {
    if (template) {
      setState({
        content: template.content || '',
        header: template.header || '',
        footer: template.footer || '',
        isDirty: false,
        isSaving: false,
        lastSaved: null,
        error: null,
      });
    }
  }, [template]);

  return {
    template,
    state,
    isLoading,
    isSaving,
    error,
    updateContent,
    updateHeader,
    updateFooter,
    save,
    create,
    update,
    reset,
    setError,
  };
}
