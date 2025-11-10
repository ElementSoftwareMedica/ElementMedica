import { useMemo, useCallback } from 'react';
import type { Training, Trainer } from '../types';
import type { FormData } from './useFormData';

interface UseAdvancedMemoizationProps {
  trainings: Training[];
  trainers: Trainer[];
  companies: any[];
  persons: any[];
  formData: FormData;
  selectedCourse?: Training;
  courseSearch: string;
  companySearch: string;
  personSearch: string;
  selectedCompanies: (string | number)[];
  selectedPersons: (string | number)[];
  dynamicRiskOptions: Array<{ value: string; label: string }>;
  dynamicCourseTypeOptions: Array<{ value: string; label: string }>;
  // NEW: optionally accept dates at top-level for testing/util flexibility
  dates?: Array<{ date: string; start: string; end: string; trainerId?: string | number; coTrainerId?: string | number }>;
}

interface UseAdvancedMemoizationReturn {
  filteredTrainings: Training[];
  filteredCompanies: any[];
  filteredPersons: any[];
  effectiveTrainers: Trainer[];
  filteredTrainers: Trainer[];
  coTrainerOptions: Trainer[];
  courseOptions: Array<{ value: string; label: string }>;
  trainerOptions: Array<{ value: string; label: string }>;
  totalSelectedHours: number;
  courseDuration: number;
  hoursLeft: number;
  isFormValid: boolean;
  validationErrors: string[];
  selectionStats: {
    companies: { total: number; selected: number; percentage: number };
    persons: { total: number; selected: number; percentage: number };
  };
}

export function useAdvancedMemoization({
  trainings,
  trainers,
  companies,
  persons,
  formData,
  selectedCourse,
  courseSearch,
  companySearch,
  personSearch,
  selectedCompanies,
  selectedPersons,
  dynamicRiskOptions,
  dynamicCourseTypeOptions,
  dates,
}: UseAdvancedMemoizationProps): UseAdvancedMemoizationReturn {
  // Filter trainings by search
  const filteredTrainings = useMemo(() => {
    const search = (courseSearch || '').toLowerCase().trim();
    const safeTrainings = Array.isArray(trainings) ? trainings : [];
    if (!search) return safeTrainings;
    return safeTrainings.filter(t => ((t.name || t.title || '') as string).toLowerCase().includes(search));
  }, [trainings, courseSearch]);

  // Filter companies/persons by search
  const filteredCompanies = useMemo(() => {
    const search = (companySearch || '').toLowerCase().trim();
    const safeCompanies = Array.isArray(companies) ? companies : [];
    if (!search) return safeCompanies;
    return safeCompanies.filter(c => (c.name || '').toLowerCase().includes(search));
  }, [companies, companySearch]);

  const filteredPersons = useMemo(() => {
    const search = (personSearch || '').toLowerCase().trim();
    const safePersons = Array.isArray(persons) ? persons : [];
    if (!search) return safePersons;
    return safePersons.filter(p => {
      const fullName = [
        (p as any).full_name,
        (p as any).firstName,
        (p as any).lastName,
      ].filter(Boolean).join(' ');
      const email = ((p as any).email || '') as string;
      const companyName = (((p as any).company || {}) as any).name || '';
      const haystack = `${fullName} ${email} ${companyName}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [persons, personSearch]);

  // Trainers computations: filter by required certs if any
  const trainerComputations = useMemo(() => {
    const safeTrainers = Array.isArray(trainers) ? trainers : [];

    const normalizeCertList = (list: unknown): string[] => {
      if (!list) return [];
      if (Array.isArray(list)) return list.map(x => String(x).trim().toLowerCase()).filter(Boolean);
      if (typeof list === 'string') return list.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      return [];
    };

    // Derive required certifications from selected course
    const requiredCertsRaw = (selectedCourse as any)?.requiredCertifications ?? (selectedCourse as any)?.certifications;
    const requiredCerts = normalizeCertList(requiredCertsRaw);

    const effective = requiredCerts.length > 0
      ? safeTrainers.filter(trainer => {
          const trainerCerts = normalizeCertList((trainer as any).certifications);
          // Trainer must have all required certs
          return requiredCerts.every(rc => trainerCerts.includes(rc));
        })
      : safeTrainers;

    const filtered = effective;

    // Co-trainers: escludiamo eventuale trainer scelto a livello form
    const coTrainers = safeTrainers.filter(trainer => String(trainer.id) !== String((formData as any).trainer_id || ''));

    return {
      effective,
      filtered,
      coTrainers
    };
  }, [trainers, selectedCourse, formData]);

  // Memoize course options for select components
  const courseOptions = useMemo(() =>
    filteredTrainings.map(training => ({
      value: String(training.id),
      label: (training.name || training.title || 'Corso senza nome') as string
    })),
    [filteredTrainings]
  );

  // Memoize trainer options for select components
  const trainerOptions = useMemo(() =>
    trainerComputations.effective.map(trainer => ({
      value: String(trainer.id),
      label: ((trainer as any).name || `${(trainer as any).firstName ?? ''} ${(trainer as any).lastName ?? ''}`.trim() || 'Formatore senza nome') as string
    })),
    [trainerComputations.effective]
  );

  // Memoize computed time values
  const timeComputations = useMemo(() => {
    const providedDates = Array.isArray((formData as any)?.dates) ? (formData as any).dates : [];
    const safeDates = (providedDates.length > 0)
      ? providedDates
      : (Array.isArray(dates) ? dates : []);

    const totalMinutes = safeDates.reduce((total: number, dateEntry: { start?: string; end?: string }) => {
      if (!dateEntry.start || !dateEntry.end) return total;
      const [sh, sm] = String(dateEntry.start).split(':').map(Number);
      const [eh, em] = String(dateEntry.end).split(':').map(Number);
      const startMinutes = (sh || 0) * 60 + (sm || 0);
      const endMinutes = (eh || 0) * 60 + (em || 0);
      return total + Math.max(0, endMinutes - startMinutes);
    }, 0);

    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const courseDuration = Number((selectedCourse as any)?.duration) || 0;
    const hoursLeft = Math.max(0, courseDuration - totalHours);

    return {
      totalSelectedHours: totalHours,
      courseDuration,
      hoursLeft
    };
  }, [formData?.dates, dates, selectedCourse?.duration]);

  // Memoize form validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const safeFormData: any = formData || {};
    const safeDates = Array.isArray(safeFormData.dates) ? safeFormData.dates : [];

    // Required fields validation
    if (!safeFormData.training_id && !selectedCourse) {
      errors.push('Seleziona un corso');
    }
    if (safeDates.length === 0) {
      errors.push('Aggiungi almeno una data');
    }

    // Risk/type obbligatori solo se opzioni disponibili (>1)
    const riskOptionsLen = Array.isArray(dynamicRiskOptions) ? dynamicRiskOptions.length : 0;
    const typeOptionsLen = Array.isArray(dynamicCourseTypeOptions) ? dynamicCourseTypeOptions.length : 0;
    if (riskOptionsLen > 1 && !safeFormData.risk_level) {
      errors.push('Seleziona il livello di rischio');
    }
    if (typeOptionsLen > 1 && !safeFormData.course_type) {
      errors.push('Seleziona il tipo di corso');
    }

    // Date validation + trainer per data
    safeDates.forEach((date: any, index: number) => {
      if (!date.date) errors.push(`Data ${index + 1}: inserisci la data`);
      if (!date.start) errors.push(`Data ${index + 1}: inserisci l'ora di inizio`);
      if (!date.end) errors.push(`Data ${index + 1}: inserisci l'ora di fine`);

      // Orari coerenti
      if (date.start && date.end) {
        const [sh, sm] = String(date.start).split(':').map(Number);
        const [eh, em] = String(date.end).split(':').map(Number);
        const startMinutes = (sh || 0) * 60 + (sm || 0);
        const endMinutes = (eh || 0) * 60 + (em || 0);
        if (startMinutes >= endMinutes) {
          errors.push(`Data ${index + 1}: l'orario di fine deve essere successivo all'inizio`);
        }
      }

      // Validazione trainer per-data
      const trainerId = (date as any).trainerId;
      const coTrainerId = (date as any).coTrainerId;
      if (!trainerId || String(trainerId).trim() === '') {
        errors.push(`Data ${index + 1}: seleziona un formatore`);
      }
      if (trainerId && coTrainerId && String(trainerId) === String(coTrainerId)) {
        errors.push(`Data ${index + 1}: il co-formatore non può coincidere con il formatore`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [formData, selectedCourse, dynamicRiskOptions, dynamicCourseTypeOptions]);

  // Selection stats
  const selectionStats = useMemo(() => {
    const totalCompanies = Array.isArray(companies) ? companies.length : 0;
    const totalPersons = Array.isArray(persons) ? persons.length : 0;
    const selectedCompaniesCount = Array.isArray(selectedCompanies) ? selectedCompanies.length : 0;
    const selectedPersonsCount = Array.isArray(selectedPersons) ? selectedPersons.length : 0;

    const pct = (sel: number, tot: number) => (tot === 0 ? 0 : Math.round((sel / tot) * 100));

    return {
      companies: { total: totalCompanies, selected: selectedCompaniesCount, percentage: pct(selectedCompaniesCount, totalCompanies) },
      persons: { total: totalPersons, selected: selectedPersonsCount, percentage: pct(selectedPersonsCount, totalPersons) }
    };
  }, [companies, persons, selectedCompanies, selectedPersons]);

  return {
    filteredTrainings,
    filteredCompanies,
    filteredPersons,
    effectiveTrainers: trainerComputations.effective,
    filteredTrainers: trainerComputations.filtered,
    coTrainerOptions: trainerComputations.coTrainers,
    courseOptions,
    trainerOptions,
    totalSelectedHours: timeComputations.totalSelectedHours,
    courseDuration: timeComputations.courseDuration,
    hoursLeft: timeComputations.hoursLeft,
    isFormValid: validation.isValid,
    validationErrors: validation.errors,
    selectionStats
  };
}

export default useAdvancedMemoization;