/**
 * useVisitaForm - Hook for form state management
 * 
 * Manages form values, validation, autosave, and computed fields
 * Supports computed fields like BMI = peso / (altezza/100)^2
 * 
 * @module pages/clinica/clinica/hooks/useVisitaForm
 * @project P52 - Clinical Visit Template System
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { visiteApi, type VisitTemplate, type VisitField, type Visita, type VisitAccessControl, type VisitConfidentiality } from '../../../../services/clinicaApi';
import { useToast } from '../../../../hooks/useToast';
import type { FormValues, FormValidation, AutosaveState, UseVisitaFormReturn, CompletionPhase } from '../types';

const AUTOSAVE_DELAY = 3000; // 3 seconds

/**
 * Calculate BMI from weight (kg) and height (cm)
 */
const calculateBMI = (peso: number, altezza: number): number | null => {
    if (!peso || !altezza || altezza <= 0) return null;
    const altezzaMetri = altezza / 100;
    return Math.round((peso / (altezzaMetri * altezzaMetri)) * 10) / 10;
};

/**
 * Evaluate computed fields based on their formulas
 * Supported formulas:
 * - BMI: peso / (altezza/100)^2
 */
const evaluateComputedFields = (
    values: FormValues,
    fields: VisitField[]
): FormValues => {
    const computedUpdates: FormValues = {};

    fields.forEach(field => {
        if (!field.computed || !field.computeFormula) return;

        // Handle BMI formula
        if (field.computeFormula.toLowerCase().includes('bmi') ||
            field.name.toLowerCase().includes('bmi') ||
            field.computeFormula.includes('peso') && field.computeFormula.includes('altezza')) {
            const peso = values['peso'] as number;
            const altezza = values['altezza'] as number;
            const bmi = calculateBMI(peso, altezza);
            if (bmi !== null) {
                computedUpdates[field.name] = bmi;
            }
        }

        // Add more formula handlers here as needed
    });

    return computedUpdates;
};

const hasStructuredSelection = (value: unknown): boolean => {
    if (Array.isArray(value)) return value.some(v => String(v ?? '').trim().length > 0);
    return String(value ?? '').trim().length > 0;
};

const deriveMdlGiudizio = (values: FormValues): string | null => {
    const hasPrescrizioni = hasStructuredSelection(values.prescrizioniNormativaMdl);
    const hasLimitazioni = hasStructuredSelection(values.limitazioniMansioneMdl);
    if (hasPrescrizioni && hasLimitazioni) return 'idoneo_limitazioni_prescrizioni';
    if (hasPrescrizioni) return 'idoneo_prescrizioni';
    if (hasLimitazioni) return 'idoneo_limitazioni';
    return null;
};

const partialGiudizi = new Set([
    'idoneo_prescrizioni',
    'idoneo_limitazioni',
    'idoneo_limitazioni_prescrizioni',
]);

export function useVisitaForm(
    visitaId: string | null,
    template: VisitTemplate | null,
    existingVisita: Visita | null,
    isNew: boolean,
    accessControlRef?: React.RefObject<VisitAccessControl | null>,
    timerElapsedSecondsRef?: React.RefObject<number>
): UseVisitaFormReturn {
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Form values state
    const [values, setValues] = useState<FormValues>({});

    // Validation state
    const [validation, setValidation] = useState<FormValidation>({
        isValid: true,
        errors: {},
        touchedFields: new Set()
    });

    // Autosave state
    const [autosave, setAutosave] = useState<AutosaveState>({
        isDirty: false,
        isSaving: false,
        lastSaved: null,
        pendingChanges: {}
    });

    // Completion phase tracking for "Salva e Completa" multi-step flow
    const [completionPhase, setCompletionPhase] = useState<CompletionPhase>(null);

    // P65.7: Prossimo controllo / follow-up
    const [prossimoControllo, setProssimoControllo] = useState<string | null>(
        existingVisita?.prossimoControllo
            ? new Date(existingVisita.prossimoControllo).toISOString().split('T')[0]
            : null
    );
    const [noteFollowup, setNoteFollowup] = useState<string | null>(
        existingVisita?.noteFollowup || null
    );

    // Initialize values from existing visita or template defaults
    useEffect(() => {
        // Parse existing structured data if present
        let existingData: FormValues = {};
        if (existingVisita?.datiStrutturati) {
            existingData = typeof existingVisita.datiStrutturati === 'string'
                ? JSON.parse(existingVisita.datiStrutturati)
                : existingVisita.datiStrutturati;
        }

        // Sync follow-up fields when visita loads/changes
        if (existingVisita?.prossimoControllo) {
            setProssimoControllo(new Date(existingVisita.prossimoControllo).toISOString().split('T')[0]);
        }
        if (existingVisita?.noteFollowup) {
            setNoteFollowup(existingVisita.noteFollowup);
        }

        // Build defaults from template
        const defaults: FormValues = {};
        if (template?.fields) {
            template.fields.forEach((field: VisitField) => {
                if (field.defaultValue !== undefined && field.defaultValue !== '') {
                    defaults[field.name] = field.defaultValue;
                }
            });
        }

        // Merge: use existing value if present, otherwise use default
        // This ensures defaults are applied to empty fields even in existing visite
        const hasExistingData = existingData && Object.keys(existingData).length > 0;
        if (hasExistingData) {
            // Merge defaults with existing data (existing wins)
            const mergedValues = { ...defaults, ...existingData };
            setValues(mergedValues);
        } else if (Object.keys(defaults).length > 0) {
            // No existing data, use defaults only
            setValues(defaults);
        }
    }, [existingVisita, template]);

    // Validate a single field
    const validateField = useCallback((field: VisitField, value: unknown): string | null => {
        if (field.required && (value === undefined || value === null || value === '')) {
            return `${field.label} è obbligatorio`;
        }

        if (field.validation) {
            if (field.type === 'NUMBER' && typeof value === 'number') {
                if (field.validation.min !== undefined && value < field.validation.min) {
                    return `${field.label} deve essere almeno ${field.validation.min}`;
                }
                if (field.validation.max !== undefined && value > field.validation.max) {
                    return `${field.label} deve essere al massimo ${field.validation.max}`;
                }
            }

            if (field.validation.pattern && typeof value === 'string') {
                const regex = new RegExp(field.validation.pattern);
                if (!regex.test(value)) {
                    return `${field.label} non è valido`;
                }
            }
        }

        return null;
    }, []);

    // Validate all fields
    const validateForm = useCallback((): boolean => {
        if (!template?.fields) return true;

        const errors: Record<string, string> = {};
        let isValid = true;

        template.fields.forEach((field: VisitField) => {
            if (field.visible === false) return;

            const error = validateField(field, values[field.name]);
            if (error) {
                errors[field.name] = error;
                isValid = false;
            }
        });

        const hasGiudizioMdl = template.fields.some(field => field.name === 'giudizioIdoneitaMdl' && field.visible !== false);
        if (hasGiudizioMdl) {
            const giudizio = String(values.giudizioIdoneitaMdl ?? '');
            const hasPrescrizioni = hasStructuredSelection(values.prescrizioniNormativaMdl);
            const hasLimitazioni = hasStructuredSelection(values.limitazioniMansioneMdl);
            if (giudizio === 'idoneo_prescrizioni' && !hasPrescrizioni) {
                errors.prescrizioniNormativaMdl = 'Aggiungi almeno una prescrizione normativa';
                isValid = false;
            }
            if (giudizio === 'idoneo_limitazioni' && !hasLimitazioni) {
                errors.limitazioniMansioneMdl = 'Aggiungi almeno una limitazione alla mansione';
                isValid = false;
            }
            if (giudizio === 'idoneo_limitazioni_prescrizioni' && (!hasPrescrizioni || !hasLimitazioni)) {
                if (!hasPrescrizioni) errors.prescrizioniNormativaMdl = 'Aggiungi almeno una prescrizione normativa';
                if (!hasLimitazioni) errors.limitazioniMansioneMdl = 'Aggiungi almeno una limitazione alla mansione';
                isValid = false;
            }
            if ((partialGiudizi.has(giudizio) || giudizio === 'temporaneamente_non_idoneo') && !hasStructuredSelection(values.tempisticaGiudizioIdoneitaMdl)) {
                errors.tempisticaGiudizioIdoneitaMdl = 'Indica la tempistica del giudizio';
                isValid = false;
            }
            if (giudizio === 'temporaneamente_non_idoneo' && values.tempisticaGiudizioIdoneitaMdl === 'permanente') {
                errors.tempisticaGiudizioIdoneitaMdl = 'Per la non idoneità temporanea indica una durata definita';
                isValid = false;
            }
        }

        setValidation(prev => ({
            ...prev,
            isValid,
            errors
        }));

        return isValid;
    }, [template, values, validateField]);

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async (data: Partial<Visita>) => {
            if (!visitaId || isNew) {
                throw new Error('Cannot save: visita not created yet');
            }
            return visiteApi.update(visitaId, data);
        },
        onSuccess: () => {
            setAutosave(prev => ({
                ...prev,
                isDirty: false,
                isSaving: false,
                lastSaved: new Date(),
                pendingChanges: {}
            }));
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
        },
        onError: (error: Error) => {
            setAutosave(prev => ({ ...prev, isSaving: false }));
            showToast({
                message: 'Errore nel salvataggio',
                type: 'error'
            });
        }
    });

    // Complete mutation
    const completeMutation = useMutation({
        mutationFn: async () => {
            if (!visitaId) throw new Error('Cannot complete: visita not found');
            return visiteApi.termina(visitaId);
        },
        onSuccess: (result) => {
            // NOTE: success toast is shown by handleSaveAndComplete (more descriptive message)
            // to avoid duplicate notifications. Only show billing warnings here.
            if (result?.billingWarnings?.length) {
                const plurale = result.billingWarnings.length > 1 ? 'avvisi di configurazione tariffario' : 'avviso di configurazione tariffario';
                showToast({
                    message: `${result.billingWarnings.length} ${plurale}: ${result.billingWarnings[0].message}`,
                    type: 'warning',
                    duration: 7000
                });
            }
            queryClient.invalidateQueries({ queryKey: ['visite'] });
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
            // P72_13: invalida scadenze-persona così VisitaScadenzaCard mostra subito le date aggiornate
            // (senza questo, dopo termina + nuova versione le date sembravano "sovrascritte" da nuovaVersione
            // ma erano solo stale — il cache non veniva refreshato fin dopo 30s)
            queryClient.invalidateQueries({ queryKey: ['scadenze-persona'] });
        },
        onError: (error: Error) => {
            showToast({
                message: 'Errore nel completamento',
                type: 'error'
            });
        }
    });

    // New version mutation (reopen completed visit)
    const nuovaVersioneMutation = useMutation({
        mutationFn: async (motivo?: string) => {
            if (!visitaId) throw new Error('Cannot create new version: visita not found');
            return visiteApi.nuovaVersione(visitaId, motivo);
        },
        onSuccess: () => {
            showToast({ message: 'Nuova versione creata. Visita riaperta per modifica.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['visite'] });
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
        },
        onError: (error: Error) => {
            showToast({
                message: 'Errore nella creazione nuova versione',
                type: 'error'
            });
        }
    });

    // Annulla modifiche mutation (revert new version back to completed)
    const annullaModificheMutation = useMutation({
        mutationFn: async () => {
            if (!visitaId) throw new Error('Cannot annulla: visita not found');
            return visiteApi.annullaModifiche(visitaId);
        },
        onSuccess: () => {
            showToast({ message: 'Modifiche annullate. Visita ripristinata.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['visite'] });
            queryClient.invalidateQueries({ queryKey: ['visita', visitaId] });
            queryClient.invalidateQueries({ queryKey: ['appuntamenti'] });
        },
        onError: (error: Error) => {
            showToast({
                message: "Errore nell'annullamento",
                type: 'error'
            });
        }
    });

    // Autosave effect
    useEffect(() => {
        // Don't autosave if:
        // - No changes pending
        // - New visita (not yet created)
        // - No visitaId
        // - Visita is completed or cancelled (readonly)
        const readonlyStates = ['COMPLETATA', 'ANNULLATA'];
        const isReadonly = existingVisita?.stato && readonlyStates.includes(existingVisita.stato);

        if (!autosave.isDirty || isNew || !visitaId || isReadonly) return;

        // Clear existing timeout
        if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
        }

        // Set new timeout for autosave
        autosaveTimeoutRef.current = setTimeout(() => {
            setAutosave(prev => ({ ...prev, isSaving: true }));
            const autoPayload: Partial<Visita> = {
                datiStrutturati: values
            };
            // Include timer duration in autosave
            if (timerElapsedSecondsRef?.current != null && timerElapsedSecondsRef.current > 0) {
                autoPayload.durataEffettiva = timerElapsedSecondsRef.current;
            }
            saveMutation.mutate(autoPayload);
        }, AUTOSAVE_DELAY);

        return () => {
            if (autosaveTimeoutRef.current) {
                clearTimeout(autosaveTimeoutRef.current);
            }
        };
    }, [autosave.isDirty, values, isNew, visitaId, saveMutation, existingVisita?.stato]);

    // Field change handler with computed fields support
    const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
        // Guard: prevent changes on completed/cancelled visits
        const readonlyGuard = ['COMPLETATA', 'ANNULLATA'];
        if (existingVisita?.stato && readonlyGuard.includes(existingVisita.stato)) {
            return;
        }
        setValues(prev => {
            const newValues = {
                ...prev,
                [fieldName]: value
            };

            if (fieldName === 'prescrizioniNormativaMdl' || fieldName === 'limitazioniMansioneMdl') {
                const autoGiudizio = deriveMdlGiudizio(newValues);
                if (autoGiudizio) {
                    newValues.giudizioIdoneitaMdl = autoGiudizio;
                }
            }

            // Calculate computed fields if peso or altezza changed
            if (template?.fields && (fieldName === 'peso' || fieldName === 'altezza')) {
                const computedUpdates = evaluateComputedFields(newValues, template.fields);
                Object.assign(newValues, computedUpdates);
            }

            return newValues;
        });

        setValidation(prev => ({
            ...prev,
            touchedFields: new Set([...prev.touchedFields, fieldName])
        }));

        setAutosave(prev => ({
            ...prev,
            isDirty: true,
            pendingChanges: {
                ...prev.pendingChanges,
                [fieldName]: value,
                ...(fieldName === 'prescrizioniNormativaMdl' || fieldName === 'limitazioniMansioneMdl'
                    ? { giudizioIdoneitaMdl: deriveMdlGiudizio({ ...values, [fieldName]: value }) ?? values.giudizioIdoneitaMdl }
                    : {})
            }
        }));
    }, [template?.fields, existingVisita?.stato, values]);

    /**
     * Save Draft - saves structured data only, NO PDF generation, NO stato change
     * Use for "Salva Bozza" button
     */
    const handleSaveDraft = useCallback(async () => {
        // Guard: prevent save on completed/cancelled visits
        const readonlyGuard = ['COMPLETATA', 'ANNULLATA'];
        if (existingVisita?.stato && readonlyGuard.includes(existingVisita.stato)) {
            showToast({ message: 'Visita completata — non modificabile', type: 'warning' });
            return;
        }

        if (!validateForm()) {
            showToast({ message: 'Correggi gli errori prima di salvare', type: 'error' });
            return;
        }

        if (!visitaId || isNew) {
            showToast({ message: 'Visita non ancora creata', type: 'error' });
            return;
        }

        setAutosave(prev => ({ ...prev, isSaving: true }));

        try {
            // Build payload including accessControl if available
            const payload: Partial<Visita> = {
                datiStrutturati: values
            };

            // Include accessControl from ref if provided
            if (accessControlRef?.current) {
                payload.accessControl = accessControlRef.current;
                payload.confidentiality = accessControlRef.current.confidentiality as Visita['confidentiality'];
            }

            // Include timer duration if available
            if (timerElapsedSecondsRef?.current != null && timerElapsedSecondsRef.current > 0) {
                payload.durataEffettiva = timerElapsedSecondsRef.current;
            }

            // P65.7: Include follow-up / scadenza
            if (prossimoControllo) {
                payload.prossimoControllo = prossimoControllo;
            } else {
                payload.prossimoControllo = null;
            }
            payload.noteFollowup = noteFollowup || null;

            await saveMutation.mutateAsync(payload);
            showToast({ message: 'Bozza salvata', type: 'success' });
        } catch {
            // Error handled by mutation
        }
    }, [validateForm, visitaId, isNew, values, saveMutation, showToast, accessControlRef, timerElapsedSecondsRef, prossimoControllo, noteFollowup]);

    /**
     * Save and Complete - saves data, generates PDF referto, completes visita
     * Use for "Salva e Completa" button
     * Tracks progress through completionPhase state for UI feedback
     */
    const handleSaveAndComplete = useCallback(async () => {
        // Guard: prevent completing already completed/cancelled visits
        const readonlyGuard = ['COMPLETATA', 'ANNULLATA'];
        if (existingVisita?.stato && readonlyGuard.includes(existingVisita.stato)) {
            showToast({ message: 'Visita già completata', type: 'warning' });
            return;
        }

        if (!validateForm()) {
            showToast({ message: 'Completa tutti i campi obbligatori prima di chiudere', type: 'error' });
            return;
        }

        if (!visitaId || isNew) {
            showToast({ message: 'Visita non ancora creata', type: 'error' });
            return;
        }

        setAutosave(prev => ({ ...prev, isSaving: true }));
        setCompletionPhase('saving');

        try {
            // 1. Build payload including accessControl if available
            const payload: Partial<Visita> = {
                datiStrutturati: values
            };

            // Include accessControl from ref if provided
            if (accessControlRef?.current) {
                payload.accessControl = accessControlRef.current;
                payload.confidentiality = accessControlRef.current.confidentiality as Visita['confidentiality'];
            }

            // Include timer duration if available
            if (timerElapsedSecondsRef?.current != null && timerElapsedSecondsRef.current > 0) {
                payload.durataEffettiva = timerElapsedSecondsRef.current;
            }

            // P65.7: Include follow-up / scadenza
            if (prossimoControllo) {
                payload.prossimoControllo = prossimoControllo;
            } else {
                payload.prossimoControllo = null;
            }
            payload.noteFollowup = noteFollowup || null;

            // 2. Save visita data
            await saveMutation.mutateAsync(payload);

            // 3+4. Generate PDF and complete visita in parallel for faster response
            setCompletionPhase('completing');
            try {
                await Promise.all([
                    visiteApi.generateRefertoPdf(visitaId),
                    completeMutation.mutateAsync()
                ]);
            } catch (pdfError) {
                showToast({ message: 'Errore durante la finalizzazione della visita. Riprova.', type: 'error' });
                setAutosave(prev => ({ ...prev, isSaving: false }));
                setCompletionPhase(null);
                return;
            }
            setCompletionPhase(null);
            showToast({ message: 'Visita completata e referto PDF generato', type: 'success' });
        } catch (error) {
            setAutosave(prev => ({ ...prev, isSaving: false }));
            setCompletionPhase(null);
        }
    }, [validateForm, visitaId, isNew, values, saveMutation, completeMutation, showToast, accessControlRef, timerElapsedSecondsRef, prossimoControllo, noteFollowup]);

    // Backward compatibility: handleSave still exists for autosave, but renamed internally
    // Callers should use handleSaveDraft for manual saves
    const handleSave = handleSaveDraft;

    // handleComplete now calls handleSaveAndComplete for UI consistency
    const handleComplete = handleSaveAndComplete;

    // New version handler - reopens completed visit for editing
    const handleNuovaVersione = useCallback(async (motivo?: string) => {
        nuovaVersioneMutation.mutate(motivo);
    }, [nuovaVersioneMutation]);

    // Annulla modifiche handler - reverts new version back to completed state
    // Usa mutateAsync per consentire al chiamante di attendere il completamento
    const handleAnnullaModifiche = useCallback(async (): Promise<void> => {
        await annullaModificheMutation.mutateAsync();
    }, [annullaModificheMutation]);

    // Reset form
    const resetForm = useCallback(() => {
        setValues({});
        setValidation({
            isValid: true,
            errors: {},
            touchedFields: new Set()
        });
        setAutosave({
            isDirty: false,
            isSaving: false,
            lastSaved: null,
            pendingChanges: {}
        });
    }, []);

    // Determine if visita is readonly (completed or cancelled)
    const readonlyStates = ['COMPLETATA', 'ANNULLATA'];
    const isReadonly = Boolean(existingVisita?.stato && readonlyStates.includes(existingVisita.stato));

    return {
        values,
        validation,
        autosave,
        isReadonly,
        completionPhase,
        // P65.7: Follow-up / scadenza
        prossimoControllo,
        noteFollowup,
        setProssimoControllo,
        setNoteFollowup,
        handleFieldChange,
        handleSave,          // alias for handleSaveDraft (backward compat)
        handleSaveDraft,     // Salva Bozza: solo salva dati
        handleComplete,      // alias for handleSaveAndComplete
        handleSaveAndComplete, // Salva e Completa: salva + PDF + chiude
        handleNuovaVersione,
        handleAnnullaModifiche,
        resetForm
    };
}
