import { useMemo } from 'react';
import type { Training } from '../types';
import { deriveRequiredCerts } from '../utils';

export interface UseRequiredCertsParams {
  selectedCourse: Training | undefined;
  selectedCourseVariants: Training[];
  trainings: Training[];
  risk_level?: string;
  course_type?: string;
  normalizeText: (s?: unknown) => string; // Changed from (s: string) to match deriveRequiredCerts
}

export function useRequiredCerts(params: UseRequiredCertsParams) {
  const { selectedCourse, selectedCourseVariants, trainings, risk_level, course_type, normalizeText } = params;

  return useMemo(() => deriveRequiredCerts(
    selectedCourse,
    selectedCourseVariants,
    trainings,
    { risk_level, course_type },
    normalizeText
  ), [selectedCourse, selectedCourseVariants, trainings, risk_level, course_type, normalizeText]);
}