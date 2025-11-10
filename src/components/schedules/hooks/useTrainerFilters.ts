import { useMemo } from 'react';
import type { Training, Trainer, CertificateFilter } from '../types';
import { computeTrainerCertFilter, filterTrainersByCerts } from '../utils';

export interface UseTrainerFiltersParams {
  selectedCourse: Training | undefined;
  selectedCourseVariants: Training[] | undefined;
  trainings: Training[];
  formData: { risk_level?: string; course_type?: string; training_id?: string | number };
  trainers: Trainer[];
  normalizeText: (s?: unknown) => string;
  expandTerms: (term: string) => string[];
}

export interface UseTrainerFiltersResult {
  filteredTrainers: Trainer[];           // with fallback to all trainers when filter is empty
  strictFiltered: Trainer[];             // only qualified trainers (may be empty)
  coTrainerOptions: Trainer[];           // currently all trainers
  trainerCertFilter: CertificateFilter;  // exposed for debugging/insights
}

export function useTrainerFilters(params: UseTrainerFiltersParams): UseTrainerFiltersResult {
  const { selectedCourse, selectedCourseVariants, trainings, formData, trainers, normalizeText, expandTerms } = params;

  const trainerCertFilter = useMemo(() => {
    return computeTrainerCertFilter(
      selectedCourse,
      selectedCourseVariants,
      trainings,
      formData,
      normalizeText,
      expandTerms
    );
  }, [selectedCourse, selectedCourseVariants, trainings, formData?.risk_level, formData?.course_type, formData?.training_id, normalizeText, expandTerms]);

  const strictFiltered = useMemo(() => {
    return filterTrainersByCerts(trainers || [], trainerCertFilter, normalizeText);
  }, [trainers, trainerCertFilter, normalizeText]);

  const filteredTrainers = useMemo(() => {
    return (strictFiltered && strictFiltered.length > 0) ? strictFiltered : (trainers || []);
  }, [strictFiltered, trainers]);

  const coTrainerOptions = useMemo(() => trainers || [], [trainers]);

  return { filteredTrainers, strictFiltered, coTrainerOptions, trainerCertFilter };
}