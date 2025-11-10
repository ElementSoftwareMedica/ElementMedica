import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "../../design-system/atoms/Button";
// Removed unused imports: create, update, toast
import 'react-toastify/dist/ReactToastify.css';
import type { ScheduleEventModalProps } from './ScheduleEventModal.lazy';
// import { Label } from "../../design-system/atoms/Label";
import Modal from "../../design-system/molecules/Modal/Modal";
import { ScheduleModalProvider, useScheduleModalContext } from './context/ScheduleModalContext';
import ScheduleModalErrorBoundary from './components/ScheduleModalErrorBoundary';
// import { ScheduleModalLoadingState } from './components/ScheduleModalLoadingStates';

// Rimuovo import dei componenti grezzi non usati direttamente qui
// import { CourseDetailsForm, CompanyEmployeeSelector, AttendanceManager, DocumentManager, DateTimeManager } from './components';

import {
  StepCourseDetails,
  StepCompanySelection,
  StepAttendance,
  StepDocuments
} from './components/steps';

import {
  normalizeText as normalizeTextUtil,
  expandTerms as expandTermsUtil,
  timeStringToMinutes as timeStringToMinutesUtil,
  formatDate as formatDateUtil,
  // validateScheduleForm,  // non usato qui, gestito in useScheduleSave
  toIdString,
  getPersonIdsForCompanyUniversal
} from './utils';

// import { useFormData } from './hooks/useFormData';
// import { useSelections } from './hooks/useSelections'; // non più usato
// import { useScheduleModalStateOptimized } from './hooks/useScheduleModalStateOptimized'; // non usato qui
// RIMOSSO: import { useAttendance } from './hooks/useAttendance';
import { useDynamicRiskAndTypeOptions } from './hooks/useDynamicRiskAndTypeOptions';
import { useAutoSelectVariant } from './hooks/useAutoSelectVariant';
import { useRequiredCerts } from './hooks/useRequiredCerts';
import { useScheduleSteps } from './hooks/useScheduleSteps';
import { useCourseVariants } from './hooks/useCourseVariants';
import { useScheduleSave } from './hooks/useScheduleSave';
import { useFormValidation } from './hooks/useFormValidation';
import { useNavigationHandlers } from './hooks/useNavigationHandlers';
import { useDateTimeHandlers } from './hooks/useDateTimeHandlers';
// import { useAdvancedMemoization } from './hooks/useAdvancedMemoization'; // non usato qui
import { DELIVERY_MODES, RISK_LEVEL_OPTIONS, COURSE_TYPE_OPTIONS } from '../../constants/scheduleModal';
import { useTrainerFilters } from './hooks/useTrainerFilters';
import { getTrainers } from '../../services/trainers';
import type { Training, Trainer, Option } from './types';

// Costanti importate da constants/scheduleModal.ts

const normalizeText = normalizeTextUtil;
const expandTerms = expandTermsUtil;

// Componente interno che utilizza il context
function ScheduleEventModalContent(props: ScheduleEventModalProps): JSX.Element {
  const { onClose, onSuccess, existingEvent } = props;

  // Utilizzo del context per accedere a stato e azioni
  const {
    state,
    actions,
    trainings,
    trainers,
    companies,
    persons,
    canProceedToStep,
    totalSelectedHours,
    courseDuration,
    hoursLeft,
    selectedCourse
  } = useScheduleModalContext();
  
  const {
    loading,
    error,
    // effectiveTrainers non fa parte dello state del context; usiamo trainers dal context
    courseSearch,
    companySearch,
    personSearch,
    personTab,
    selectedDayIdx,
    showStatusMenu,
    // status non è nel context: gestito localmente sotto
    isEditing
  } = state;

  const {
    setLoading,
    setError,
    // setHasScheduled e setScheduleId non sono nel context: gestiti localmente sotto
    setCourseSearch,
    setCompanySearch,
    setPersonSearch,
    setPersonTab,
    setSelectedDayIdx,
    setShowStatusMenu,
    // setStatus non nel context: gestito localmente
    setIsEditing
  } = actions;

  // Tipizzazione forte per setFormField
  const setFormFieldTyped = actions.setFormField as <K extends keyof typeof state.formData>(field: K, value: typeof state.formData[K]) => void;

  // Stato locale per status/scheduleId/hasScheduled (non presenti nel context)
  const [status, setStatus] = useState<string>((existingEvent?.status as string | undefined) ?? 'Preventivo');
  const [hasScheduled, setHasScheduled] = useState<boolean>(!!(existingEvent?.id as string | number | undefined));
  const [scheduleId, setScheduleId] = useState<string | number | null>((existingEvent?.id as string | number | null | undefined) ?? null);
  const [pendingPreventiviIds, setPendingPreventiviIds] = useState<string[]>([]);

  // Allinea il flag isEditing del context allo stato del prop existingEvent
  useEffect(() => {
    setIsEditing(!!existingEvent?.id);
  }, [existingEvent?.id, setIsEditing]);

  // Initialize course variants hook
  const { selectedCourseVariants, selectedCourseDetails, setSelectedCourseDetails } = useCourseVariants({
    selectedCourse,
    trainings,
  });

  // Unifica: corso effettivo normalizzato per la logica
  const effectiveSelectedCourse = useMemo<Training | undefined>(() => {
    const base = selectedCourseDetails || selectedCourse;
    return base
      ? { ...base, name: base.title ?? base.name ?? '' }
      : undefined;
  }, [selectedCourseDetails, selectedCourse]);

  // Handler locale per aggiornare singoli campi del form, allineato al context
  const handleFormDataChange = useCallback(<K extends keyof typeof state.formData>(field: K, value: typeof state.formData[K]) => {
    setFormFieldTyped(field, value);
  }, [setFormFieldTyped]);

  // Attendance state
  // RIMOSSO uso di useAttendance con firma errata e non allineata al context
  // const { handleAttendanceChange, handleSelectAllForDate, handleSelectNoneForDate } = useAttendance(state.selectedPersons, state.attendance, actions.setAttendance);

  // Dynamic options for Risk/Type based on grouped variants (macro-corso)
  const [dynamicRiskOptions, setDynamicRiskOptions] = useState<Option[]>(RISK_LEVEL_OPTIONS);
  const [dynamicCourseTypeOptions, setDynamicCourseTypeOptions] = useState<Option[]>(COURSE_TYPE_OPTIONS);

  // Use computed values from context
  const formData = state.formData;
  const selectedPersons = state.selectedPersons;
  const selectedCompanies = state.selectedCompanies;
  const attendance = state.attendance;
  const setFormData = actions.setFormData;
  const handleCompanyToggle = actions.toggleCompany;
  const handlePersonToggle = actions.togglePerson;

  // Adapter locali per selezione/deselezione per azienda
  const getPersonIdsForCompany = useCallback((companyId: string) => {
    return getPersonIdsForCompanyUniversal(persons, companyId);
  }, [persons]);
  const handleSelectAllPersonsByCompany = useCallback((companyId: string | number) => {
    const ids = getPersonIdsForCompany(String(companyId));
    actions.selectAllPersons(ids);
  }, [actions, getPersonIdsForCompany]);
  const handleDeselectAllPersonsByCompany = useCallback((companyId: string | number) => {
    const idsSet = new Set(getPersonIdsForCompany(String(companyId)).map(String));
    Array.from(selectedPersons).forEach(id => {
      if (idsSet.has(String(id))) {
        actions.togglePerson(id);
      }
    });
  }, [actions, getPersonIdsForCompany, selectedPersons]);

  // Handlers Attendance allineati al context
  const handleAttendanceChange = useCallback((dateIdx: number, personId: string | number, isPresent: boolean) => {
    const id = String(personId);
    const current = (attendance[dateIdx] || []).map(String);
    const updatedForDate = isPresent
      ? Array.from(new Set([...current, id]))
      : current.filter(pid => String(pid) !== id);
    actions.setAttendance(dateIdx, updatedForDate);
  }, [attendance, actions]);

  const handleSelectAllForDate = useCallback((dateIdx: number) => {
    actions.setAttendance(dateIdx, Array.from(new Set(Array.from(selectedPersons).map(String))));
  }, [actions, selectedPersons]);

  const handleSelectNoneForDate = useCallback((dateIdx: number) => {
    actions.setAttendance(dateIdx, []);
  }, [actions]);

  // Fallback locale: se il context non fornisce trainer, recuperali dai servizi
  const [fallbackTrainers, setFallbackTrainers] = useState<Trainer[]>([]);
  useEffect(() => {
    if (Array.isArray(trainers) && trainers.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getTrainers();
        if (!cancelled) setFallbackTrainers(Array.isArray(res) ? (res as Trainer[]) : []);
      } catch {
        // silenzioso: se fallisce, i dropdown resteranno disabilitati
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trainers]);

  // ✅ LAZY LOADING PERSONS: Carica persons se non forniti dal context
  const [loadedPersons, setLoadedPersons] = useState<any[]>(persons || []);
  useEffect(() => {
    // Se persons già forniti, usali
    if (Array.isArray(persons) && persons.length > 0) {
      console.log('[ScheduleEventModal] ✅ Using persons from context:', persons.length);
      setLoadedPersons(persons);
      return;
    }
    
    // Altrimenti carica lazy
    console.log('[ScheduleEventModal] 🔄 Loading persons lazy...');
    let cancelled = false;
    (async () => {
      try {
        const { getPersons } = await import('../../services/persons');
        const result = await getPersons({ limit: 1000, page: 1 });
        const fetchedPersons = result?.persons || [];
        if (!cancelled) {
          console.log('[ScheduleEventModal] ✅ Loaded persons:', fetchedPersons.length);
          setLoadedPersons(fetchedPersons);
        }
      } catch (err) {
        console.error('[ScheduleEventModal] ❌ Failed to load persons:', err);
        setLoadedPersons([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persons]);

  // Trainers effettivi SENZA fallback - ora usiamo quelli del context
  const effectiveTrainers: Trainer[] = useMemo(() => {
    const result = Array.isArray(trainers) && trainers.length > 0 ? trainers : [];
    
    // 🔍 DEBUG: Verifica trainers ricevuti dal context
    if (result.length > 0) {
      console.debug('[ScheduleEventModal] 🔍 Trainers from context:', {
        count: result.length,
        sampleTrainer: {
          id: result[0].id,
          name: `${result[0].firstName} ${result[0].lastName}`,
          certifications: result[0].certifications,
          hasCertsField: 'certifications' in result[0]
        }
      });
    }
    
    return result;
  }, [trainers]);

  // Correzione Rules of Hooks: chiamiamo direttamente l’hook, non dentro useMemo
  const dynamicOptionsResult = useDynamicRiskAndTypeOptions({
    selectedCourse: effectiveSelectedCourse,
    selectedCourseVariants,
    trainings: trainings,
    risk_level: formData.risk_level,
    course_type: formData.course_type,
    normalizeText,
    baseRiskOptions: RISK_LEVEL_OPTIONS,
    baseTypeOptions: COURSE_TYPE_OPTIONS,
  });
  const { riskOpts, typeOpts, riskValid, typeValid, titleEmpty } = dynamicOptionsResult;

  // Aggiorna le opzioni dinamiche tramite effect
  useEffect(() => {
    setDynamicRiskOptions(riskOpts);
    setDynamicCourseTypeOptions(typeOpts);
  }, [riskOpts, typeOpts]);

  // Log di diagnostica leggero (solo in sviluppo)
  useEffect(() => {
    if (import.meta?.env?.MODE === 'development') {
      console.debug('[SCHEDULE MODAL DIAG] Stato dinamico', {
        course: effectiveSelectedCourse?.title || effectiveSelectedCourse?.name || null,
        variantsCount: Array.isArray(selectedCourseVariants) ? selectedCourseVariants.length : 0,
        riskOptsCount: Array.isArray(dynamicRiskOptions) ? dynamicRiskOptions.length : 0,
        typeOptsCount: Array.isArray(dynamicCourseTypeOptions) ? dynamicCourseTypeOptions.length : 0,
        riskValid,
        typeValid,
        titleEmpty,
        formSnapshot: {
          training_id: formData.training_id,
          risk_level: formData.risk_level,
          course_type: formData.course_type,
        },
      });
    }
  }, [effectiveSelectedCourse, selectedCourseVariants, dynamicRiskOptions, dynamicCourseTypeOptions, riskValid, typeValid, titleEmpty, formData.training_id, formData.risk_level, formData.course_type]);

  // Auto-select the specific training variant when filters (risk/type) identify a unique match
  useAutoSelectVariant({
    selectedCourse: effectiveSelectedCourse,
    selectedCourseVariants,
    trainings: trainings,
    current: { training_id: formData.training_id, risk_level: formData.risk_level, course_type: formData.course_type },
    normalizeText,
    riskOptions: dynamicRiskOptions,
    typeOptions: dynamicCourseTypeOptions,
    onResolve: (id: string | number, details?: Training) => {
        if (String(formData.training_id ?? '') !== String(id)) {
          setFormData({ training_id: id });
        }
        if (details) setSelectedCourseDetails(details);
      }
  });

  useRequiredCerts({
    selectedCourse: effectiveSelectedCourse,
    selectedCourseVariants,
    trainings: trainings,
    risk_level: formData.risk_level,
    course_type: formData.course_type,
    normalizeText,
  });

  // Trainer filters with safe fallback to all trainers
  const { filteredTrainers, coTrainerOptions: allCoTrainers } = useTrainerFilters({
    selectedCourse: effectiveSelectedCourse,
    selectedCourseVariants,
    trainings: trainings,
    formData: { risk_level: formData.risk_level, course_type: formData.course_type, training_id: formData.training_id },
    trainers: effectiveTrainers,
    normalizeText,
    expandTerms,
  });

  // Utility functions - Memoized
  const getCompanyName = useCallback((companyId: string | number) => {
    const company = companies.find(c => toIdString(c.id) === toIdString(companyId));
    return (company?.ragioneSociale || company?.name) || 'Azienda sconosciuta';
  }, [companies]);

  // Derived hours for validation - Optimized calculations
  const timeStringToMinutes = useMemo(() => timeStringToMinutesUtil, []);
  // totalSelectedMinutes/totalSelectedHours calcolati localmente sono stati rimossi;
  // utilizzare totalSelectedHours dal context per evitare redeclaration

  // Use computed values from context
  // courseDuration, totalSelectedHours, and hoursLeft are already available from context

  // CONSOLIDATED: Gestione unificata di risk_level e course_type per evitare conflitti
  // Questo useEffect gestisce: auto-fill da corso, auto-selezione quando c'è una sola opzione, validazione
  // Auto-update risk_level and course_type when options change
  // Use ref to track previous values to avoid infinite loop
  const prevRiskRef = useRef<string | undefined>(formData.risk_level);
  const prevTypeRef = useRef<string | undefined>(formData.course_type);
  
  useEffect(() => {
    const updates: Partial<typeof formData> = {};
    const currentRisk = formData.risk_level;
    const currentType = formData.course_type;
    const riskOptionsLength = dynamicRiskOptions?.length || 0;
    const typeOptionsLength = dynamicCourseTypeOptions?.length || 0;
    
    // === RISK LEVEL LOGIC ===
    if (riskOptionsLength > 0) {
      // 1. Se non c'è valore e c'è una sola opzione, auto-seleziona
      if (!currentRisk && riskOptionsLength === 1) {
        updates.risk_level = dynamicRiskOptions[0].value;
      }
      // 2. Se c'è un valore ma non è più valido, resetta
      else if (currentRisk && !dynamicRiskOptions.some(opt => opt.value === currentRisk)) {
        updates.risk_level = '';
      }
      // 3. Se non c'è valore e il corso ha un riskLevel suggerito, usalo
      else if (!currentRisk && effectiveSelectedCourse?.riskLevel) {
        const suggestedRisk = String(effectiveSelectedCourse.riskLevel);
        if (dynamicRiskOptions.some(opt => opt.value === suggestedRisk)) {
          updates.risk_level = suggestedRisk;
        }
      }
    }
    
    // === COURSE TYPE LOGIC ===
    if (typeOptionsLength > 0) {
      // 1. Se non c'è valore e c'è una sola opzione, auto-seleziona
      if (!currentType && typeOptionsLength === 1) {
        updates.course_type = dynamicCourseTypeOptions[0].value;
      }
      // 2. Se c'è un valore ma non è più valido, resetta
      else if (currentType && !dynamicCourseTypeOptions.some(opt => opt.value === currentType)) {
        updates.course_type = '';
      }
      // 3. Se non c'è valore e il corso ha un courseType suggerito, usalo
      else if (!currentType && effectiveSelectedCourse?.courseType) {
        const suggestedType = String(effectiveSelectedCourse.courseType);
        if (dynamicCourseTypeOptions.some(opt => opt.value === suggestedType)) {
          updates.course_type = suggestedType;
        }
      }
    }
    
    // Applica aggiornamenti solo se necessario e valori sono cambiati
    if (Object.keys(updates).length > 0) {
      const hasChanges = 
        (updates.risk_level !== undefined && updates.risk_level !== prevRiskRef.current) ||
        (updates.course_type !== undefined && updates.course_type !== prevTypeRef.current);
        
      if (hasChanges) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ScheduleModal] Auto-updating risk/type:', updates);
        }
        setFormData(updates);
        
        // Update refs
        if (updates.risk_level !== undefined) prevRiskRef.current = updates.risk_level;
        if (updates.course_type !== undefined) prevTypeRef.current = updates.course_type;
      }
    }
  }, [
    effectiveSelectedCourse,
    dynamicRiskOptions,
    dynamicCourseTypeOptions,
    setFormData
  ]); // Removed formData.risk_level and formData.course_type to prevent loop

  // Steps state and helpers
  const { 
    isStep0Valid, 
    isStep1Valid, 
    isCompletelyValid,
    getValidationIssues,
    stepItems, 
    handleNext: _handleNextHook, 
    handleBack: _handleBackHook,
    canNavigateToStep,
    handleStepClick
  } = useScheduleSteps({
    formData: {
      ...formData,
      dates: (formData.dates ?? []).map(d => ({
        ...d,
        trainerId: String(d.trainerId),
        coTrainerId: String(d.coTrainerId ?? '')
      }))
    },
    selectedPersons: Array.from(selectedPersons),
    selectedCompanies: Array.from(selectedCompanies),
    selectedCourse: effectiveSelectedCourse,
    dynamicRiskOptions,
    dynamicCourseTypeOptions,
    isEditing: !!existingEvent // Pass isEditing flag based on existingEvent
  });

  const currentStep = state.currentStep;

  // Form validation hook
  const { 
    isValid: formIsValid, 
    errors: formErrors, 
    fieldErrors, 
    isStep0Valid: validationStep0Valid, 
    isStep1Valid: validationStep1Valid, 
    isStep2Valid: validationStep2Valid, 
    validateCurrentStep, 
    validateField 
  } = useFormValidation({
    formData,
    dynamicRiskOptions,
    dynamicCourseTypeOptions,
    currentStep,
    selectedCourse: effectiveSelectedCourse,
    courseDuration,
    totalSelectedHours,
    timeStringToMinutes,
    selectedCompanies: Array.from(selectedCompanies),
    selectedPersons: Array.from(selectedPersons)
  });

  // Form handlers
  // Adattatore tipizzato per i date handlers (accetta coTrainerId non opzionale)
  const setFormDataForDateHandlers: (updates: Partial<{
    dates: Array<{ date: string; start: string; end: string; trainerId: string | number; coTrainerId: string | number }>
  }>) => void = (updates) => {
    actions.setFormData(updates);
  };
  const { handleDateChange, handleRemoveDate } = useDateTimeHandlers({ formData, setFormData: setFormDataForDateHandlers });

  // Unified Date/Time/Trainer updater to avoid duplication across steps
  const handleUpdateDateTime = useCallback((index: number, field: 'date' | 'start' | 'end' | 'trainerId' | 'coTrainerId', value: string) => {
    if (field === 'date' || field === 'start' || field === 'end') {
      handleDateChange(index, field, String(value));
      return;
    }
    // trainerId / coTrainerId updates
    const newDates = (formData.dates ?? []).map((date, i) =>
      i === index ? { ...date, [field]: value } : date
    );
    setFormData({ dates: newDates });
  }, [formData.dates, handleDateChange, setFormData]);

  // Navigation handlers
  const { handleNext, handleBack } = useNavigationHandlers({
    currentStep,
    setCurrentStep: actions.setCurrentStep,
    validateCurrentStep,
    setError: actions.setError,
  });

  // Save function using the new hook
  const { handleSave: saveSchedule } = useScheduleSave({
    isEditing,
    scheduleId: (existingEvent?.id as string | number) || scheduleId,
    setLoading,
    setError,
    setHasScheduled,
    setScheduleId,
    onSuccess: () => {
      onSuccess?.();
      onClose?.();
    },
    dynamicRiskOptions,
    dynamicCourseTypeOptions,
    courseDuration,
    totalSelectedHours,
    selectedCompanies: Array.from(selectedCompanies),
    status
  });

  // Save handler
  const handleSave = useCallback(async () => {
    await saveSchedule(formData, Array.from(selectedPersons), attendance);
  }, [saveSchedule, formData, selectedPersons, attendance]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepCourseDetails
            formData={formData}
            onFormDataChange={handleFormDataChange}
            setFormData={setFormData}
            selectedCourse={effectiveSelectedCourse}
            setSelectedCourseDetails={setSelectedCourseDetails}
            effectiveTrainers={effectiveTrainers}
            filteredTrainers={filteredTrainers}
            allCoTrainers={allCoTrainers}
            dynamicRiskOptions={dynamicRiskOptions}
            dynamicCourseTypeOptions={dynamicCourseTypeOptions}
            DELIVERY_MODES={DELIVERY_MODES}
            courseSearch={courseSearch}
            setCourseSearch={setCourseSearch}
            handleDateChange={handleDateChange}
            handleRemoveDate={handleRemoveDate}
            totalSelectedHours={totalSelectedHours}
            courseDuration={courseDuration}
            hoursLeft={hoursLeft}
            formatDate={formatDateUtil}
            // Nuovo: passa l'elenco corsi (trainings) e il conteggio varianti
            trainings={trainings}
            variantsCount={Array.isArray(selectedCourseVariants) ? selectedCourseVariants.length : 0}
          />
        );
      case 1:
        return (
          <StepCompanySelection
            selectedPersons={Array.from(selectedPersons)}
            selectedCompanies={Array.from(selectedCompanies)}
            onCompanyToggle={handleCompanyToggle}
            onPersonToggle={handlePersonToggle}
            onSelectAllPersons={handleSelectAllPersonsByCompany}
            onDeselectAllPersons={handleDeselectAllPersonsByCompany}
            companySearch={companySearch}
            onCompanySearchChange={setCompanySearch}
            personSearch={personSearch}
            onPersonSearchChange={setPersonSearch}
            personTab={personTab}
            onPersonTabChange={setPersonTab}
            companies={companies}
            persons={loadedPersons}
            getPersonIdsForCompany={getPersonIdsForCompany}
            getCompanyName={getCompanyName}
          />
        );
      case 2:
        return (
          <StepAttendance
            dates={formData.dates}
            selectedPersons={Array.from(selectedPersons)}
            persons={loadedPersons}
            attendance={attendance}
            onAttendanceChange={handleAttendanceChange}
            onSelectAllForDate={handleSelectAllForDate}
            onSelectNoneForDate={handleSelectNoneForDate}
            selectedDayIdx={selectedDayIdx}
            onSelectedDayChange={setSelectedDayIdx}
            effectiveTrainers={effectiveTrainers}
            filteredTrainers={filteredTrainers}
            allCoTrainers={allCoTrainers}
            onUpdateDateTime={handleUpdateDateTime}
            formatDate={formatDateUtil}
            getCompanyName={getCompanyName}
          />
        );
      case 3:
        return (
          <StepDocuments
            status={status}
            onStatusChange={setStatus}
            selectedPersons={Array.from(selectedPersons)}
            selectedCompanies={Array.from(selectedCompanies)}
            attendance={attendance}
            dates={formData.dates || []}
            showStatusMenu={showStatusMenu}
            onShowStatusMenuChange={setShowStatusMenu}
            scheduleId={scheduleId}
            trainers={effectiveTrainers.map(t => ({
              id: t.id,
              firstName: t.firstName,
              lastName: t.lastName
            }))}
            persons={persons}
            selectedCourse={effectiveSelectedCourse}
            companies={companies}
            pendingPreventiviIds={pendingPreventiviIds}
            onPendingPreventiviCreated={(ids) => {
              setPendingPreventiviIds(ids);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? "Modifica Evento" : "Programma Nuovo Evento"}
      size="xl"
      bodyClassName="max-h-[calc(90vh-200px)] overflow-y-auto"
      footer={
        <div className="flex justify-between items-center w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Annulla
          </Button>

          <div className="flex space-x-3">
            {currentStep > 0 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={loading}
              >
                Indietro
              </Button>
            )}

            {/* Pulsante Programma Corso solo nello Step 3 (indice 2) */}
            {currentStep === 2 && (
              <Button
                variant="primary"
                onClick={async () => {
                  if (isCompletelyValid) {
                    await handleSave();
                    // Il modal rimane aperto, l'utente può navigare allo Step 4
                  } else {
                    const issues = getValidationIssues;
                    setError(`Completa i seguenti campi prima di programmare il corso:\n• ${issues.join('\n• ')}`);
                  }
                }}
                disabled={loading}
                className="!bg-green-600 hover:!bg-green-700 !text-white"
              >
                {loading ? 'Programmazione...' : '📅 Programma Corso'}
              </Button>
            )}

            {currentStep < stepItems.length - 1 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={loading}
              >
                Avanti
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  if (isCompletelyValid) {
                    handleSave();
                  } else {
                    // Mostra i problemi di validazione
                    const issues = getValidationIssues;
                    setError(`Completa i seguenti campi prima di salvare:\n• ${issues.join('\n• ')}`);
                  }
                }}
                disabled={loading}
              >
                {loading ? 'Salvataggio...' : (isEditing ? 'Aggiorna' : 'Salva')}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Steps indicator - Pillola Unica */}
        <div className="flex justify-center">
          <div className="inline-flex bg-gray-100 rounded-full p-1 shadow-sm">
            {stepItems.map((step, index) => {
              const isClickable = canNavigateToStep(index);
              return (
                <button
                  key={`step-${index}`}
                  type="button"
                  onClick={() => {
                    if (isClickable) {
                      handleStepClick(index);
                      actions.setCurrentStep(index);
                    }
                  }}
                  className={`
                    relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    ${index === currentStep
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : index < currentStep
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                    }
                    ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                  `}
                  disabled={!isClickable}
                >
                  <span className="flex items-center gap-2">
                    <span className={`
                      flex items-center justify-center w-5 h-5 rounded-full text-xs
                      ${index === currentStep
                        ? 'bg-white text-blue-600'
                        : index < currentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                      }
                    `}>
                      {index < currentStep ? '✓' : index + 1}
                    </span>
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{index + 1}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Errore</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>
      </div>
    </Modal>
  );
}

// Componente principale con error boundary e context provider
export default function ScheduleEventModal(props: ScheduleEventModalProps): JSX.Element {
  return (
    <ScheduleModalErrorBoundary>
      <ScheduleModalProvider
        trainings={props.trainings}
        trainers={props.trainers}
        companies={props.companies}
        persons={props.persons}
        existingEvent={props.existingEvent}
        initialDate={props.initialDate}
        initialTime={props.initialTime}
      >
        <ScheduleEventModalContent {...props} />
      </ScheduleModalProvider>
    </ScheduleModalErrorBoundary>
  );
}