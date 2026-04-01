import { useMemo, useState } from 'react';
import type { Training, ScheduleFormData } from '../types';

interface DateEntry { date: string; start: string; end: string; trainerId: string | number; coTrainerId: string | number }

interface UseScheduleStepsParams {
  formData: ScheduleFormData & { dates: DateEntry[] };
  selectedCompanies?: (string | number)[];
  selectedPersons?: (string | number)[];
  selectedCourse?: Training;
  dynamicRiskOptions?: Array<{ value: string; label: string }>;
  dynamicCourseTypeOptions?: Array<{ value: string; label: string }>;
  isEditing?: boolean; // Nuovo parametro per distinguere create/edit
}

export function useScheduleSteps({
  formData,
  selectedCompanies = [],
  selectedPersons = [],
  selectedCourse,
  dynamicRiskOptions = [],
  dynamicCourseTypeOptions = [],
  isEditing = false
}: UseScheduleStepsParams) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0])); // Track visited steps

  // Validazione rilassata per Step 0 - permette navigazione anche se incompleto
  const isStep0Valid = useMemo(() => {
    const hasCourse = !!(formData.training_id || selectedCourse);
    return hasCourse; // Solo corso selezionato richiesto per navigare
  }, [formData.training_id, selectedCourse]);

  // Validazione rilassata per Step 1 - permette navigazione anche se incompleto
  const isStep1Valid = useMemo(() => {
    return true; // Sempre valido per permettere navigazione libera
  }, []);

  // Validazione rigorosa per la creazione finale
  const isCompletelyValid = useMemo(() => {
    const hasCourse = !!(formData.training_id || selectedCourse);
    const hasDates = Array.isArray(formData.dates) && formData.dates.length > 0;

    const riskLen = dynamicRiskOptions.length;
    const typeLen = dynamicCourseTypeOptions.length;

    const riskOk = riskLen === 0 || !!formData.risk_level;
    const typeOk = typeLen === 0 || !!formData.course_type;

    // Validazione per data: orari coerenti e trainer selezionato
    const perDateOk = hasDates && formData.dates.every(d => {
      if (!d.date || !d.start || !d.end) return false;
      const [sh, sm] = String(d.start).split(':').map(Number);
      const [eh, em] = String(d.end).split(':').map(Number);
      const startM = (sh || 0) * 60 + (sm || 0);
      const endM = (eh || 0) * 60 + (em || 0);
      if (startM >= endM) return false;
      return !!(d.trainerId && String(d.trainerId).trim() !== '');
    });

    // Calcolo ore totali selezionate e durata corso
    const durationRaw = (selectedCourse as any)?.duration;
    let durationNum = 0;
    if (typeof durationRaw === 'number') durationNum = durationRaw;
    else if (typeof durationRaw === 'string') {
      const parsed = parseFloat(durationRaw);
      if (Number.isFinite(parsed)) durationNum = parsed;
    }

    let totalMinutes = 0;
    if (hasDates) {
      for (const d of formData.dates) {
        const [sh, sm] = String(d.start).split(':').map(Number);
        const [eh, em] = String(d.end).split(':').map(Number);
        const startM = (sh || 0) * 60 + (sm || 0);
        const endM = (eh || 0) * 60 + (em || 0);
        if (endM > startM) totalMinutes += (endM - startM);
      }
    }
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    const hasDuration = Number.isFinite(durationNum) && durationNum > 0;
    const hoursOk = !hasDuration || totalHours >= durationNum - 1e-6;

    // Validazione partecipanti
    const hasParticipants = selectedCompanies.length > 0 || selectedPersons.length > 0;

    return hasCourse && riskOk && typeOk && perDateOk && hoursOk && hasParticipants;
  }, [formData, selectedCourse, dynamicRiskOptions, dynamicCourseTypeOptions, selectedCompanies, selectedPersons]);

  // Funzione per ottenere i problemi di validazione
  const getValidationIssues = useMemo(() => {
    const issues: string[] = [];

    if (!(formData.training_id || selectedCourse)) {
      issues.push('Seleziona un corso');
    }

    const riskLen = dynamicRiskOptions.length;
    const typeLen = dynamicCourseTypeOptions.length;

    if (riskLen > 0 && !formData.risk_level) {
      issues.push('Seleziona il livello di rischio');
    }

    if (typeLen > 0 && !formData.course_type) {
      issues.push('Seleziona il tipo di corso');
    }

    const hasDates = Array.isArray(formData.dates) && formData.dates.length > 0;
    if (!hasDates) {
      issues.push('Aggiungi almeno una data');
    } else {
      const invalidDates = formData.dates.filter(d => {
        if (!d.date || !d.start || !d.end) return true;
        const [sh, sm] = String(d.start).split(':').map(Number);
        const [eh, em] = String(d.end).split(':').map(Number);
        const startM = (sh || 0) * 60 + (sm || 0);
        const endM = (eh || 0) * 60 + (em || 0);
        if (startM >= endM) return true;
        return !(d.trainerId && String(d.trainerId).trim() !== '');
      });

      if (invalidDates.length > 0) {
        issues.push(`Completa ${invalidDates.length} sessione${invalidDates.length > 1 ? 'i' : ''} (data, orari, formatore)`);
      }
    }

    // Controllo ore corso
    const durationRaw = (selectedCourse as any)?.duration;
    let durationNum = 0;
    if (typeof durationRaw === 'number') durationNum = durationRaw;
    else if (typeof durationRaw === 'string') {
      const parsed = parseFloat(durationRaw);
      if (Number.isFinite(parsed)) durationNum = parsed;
    }

    if (hasDates && durationNum > 0) {
      let totalMinutes = 0;
      for (const d of formData.dates) {
        const [sh, sm] = String(d.start).split(':').map(Number);
        const [eh, em] = String(d.end).split(':').map(Number);
        const startM = (sh || 0) * 60 + (sm || 0);
        const endM = (eh || 0) * 60 + (em || 0);
        if (endM > startM) totalMinutes += (endM - startM);
      }
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

      if (Math.abs(totalHours - durationNum) >= 1e-6) {
        const diff = durationNum - totalHours;
        if (diff > 0) {
          issues.push(`Mancano ${diff}h da programmare`);
        }
        // Se le ore sono superiori, nessun blocco — solo avviso visivo nel DateTimeManager
      }
    }

    // Controllo partecipanti
    if (selectedCompanies.length === 0 && selectedPersons.length === 0) {
      issues.push('Seleziona almeno un\'azienda o partecipante');
    }

    return issues;
  }, [formData, selectedCourse, dynamicRiskOptions, dynamicCourseTypeOptions, selectedCompanies, selectedPersons]);

  const stepItems = useMemo(() => ([
    { label: 'Dettagli corso', isValid: isStep0Valid },
    { label: 'Partecipanti', isValid: isStep1Valid },
    { label: 'Presenze', isValid: true },
    { label: 'Documenti', isValid: true }
  ]), [isStep0Valid, isStep1Valid]);

  // Task 3 e 4: Navigazione libera
  // - Se in modifica (isEditing=true): tutti gli step sono sempre accessibili
  // - Se in creazione: step precedenti sempre accessibili, step successivi se già visitati
  const canNavigateToStep = (step: number) => {
    if (isEditing) return true; // Task 4: In modifica, tutti gli step sempre accessibili
    // Consenti navigazione a step precedenti o step già visitati
    return step <= currentStep || visitedSteps.has(step);
  };

  const handleNext = () => {
    const nextStep = Math.min(currentStep + 1, stepItems.length - 1);
    setVisitedSteps(prev => new Set(prev).add(nextStep)); // Mark next step as visited
    setCurrentStep(nextStep);
  };

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const handleStepClick = (step: number) => {
    if (canNavigateToStep(step)) {
      setVisitedSteps(prev => new Set(prev).add(step)); // Mark clicked step as visited
      setCurrentStep(step);
    }
  };

  return {
    currentStep,
    setCurrentStep: (step: number) => {
      setVisitedSteps(prev => new Set(prev).add(step));
      setCurrentStep(step);
    },
    isStep0Valid,
    isStep1Valid,
    isCompletelyValid,
    getValidationIssues,
    stepItems,
    handleNext,
    handleBack,
    canNavigateToStep,
    handleStepClick,
    visitedSteps
  };
}

export default useScheduleSteps;